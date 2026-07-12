'use strict';

const mongoose = require('mongoose');
const Session = require('../models/Session');
const Participant = require('../models/Participant');
const Vote = require('../models/Vote');
const { sanitizeName } = require('../utils/sanitize');

// ── Allowed vote values across all deck types ─────────────────────────────
const VALID_VOTE_VALUES = new Set([
  // Fibonacci (client deck: 1, 2, 3, 5, 8, 13, 20, 40)
  '0', '0.5', '1', '2', '3', '5', '8', '13', '20', '21', '34', '40', '55', '89',
  0, 0.5, 1, 2, 3, 5, 8, 13, 20, 21, 34, 40, 55, 89,
  // T-shirt
  'XS', 'S', 'M', 'L', 'XL', 'XXL',
  // Powers of 2
  '1', '2', '4', '8', '16', '32', '64',
  1, 2, 4, 8, 16, 32, 64,
  // Special
  '?', 'coffee',
]);

// ── Validation helper ───────────────────────────────────────────────────

/**
 * Validate that a value is a non-empty MongoDB ObjectId string.
 */
function isValidObjectId(val) {
  return typeof val === 'string' && mongoose.isValidObjectId(val);
}

/**
 * Simple schema-based socket payload validator.
 * Returns { valid: true } or { valid: false, error: string }.
 *
 * @param {object} schema  — keys with { required?, type?, maxLength?, isObjectId?, isIn? }
 * @param {object} payload — the raw socket event payload
 */
function validateSocketPayload(schema, payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload must be an object' };
  }
  for (const [field, rules] of Object.entries(schema)) {
    const val = payload[field];
    const missing = val === undefined || val === null || val === '';

    if (rules.required && missing) {
      return { valid: false, error: `${field} is required` };
    }
    if (missing) continue; // optional field, skip further checks

    if (rules.type && typeof val !== rules.type) {
      return { valid: false, error: `${field} must be a ${rules.type}` };
    }
    if (rules.maxLength && typeof val === 'string' && val.length > rules.maxLength) {
      return { valid: false, error: `${field} must be ${rules.maxLength} characters or fewer` };
    }
    if (rules.isObjectId && !isValidObjectId(String(val))) {
      return { valid: false, error: `${field} must be a valid ID` };
    }
    if (rules.isIn && !rules.isIn.has(val)) {
      return { valid: false, error: `${field} has an invalid value` };
    }
  }
  return { valid: true };
}

// ── Per-socket place-chip rate limiter ────────────────────────────────
// Tracks { count, windowStart } per socket ID. Allows 15 place-chip events per minute.
const PLACE_CHIP_LIMIT = 15;
const PLACE_CHIP_WINDOW_MS = 60 * 1000; // 1 minute
const placeChipCounters = new Map(); // socketId → { count, windowStart }

function checkPlaceChipRateLimit(socketId) {
  const now = Date.now();
  const entry = placeChipCounters.get(socketId);

  if (!entry || now - entry.windowStart > PLACE_CHIP_WINDOW_MS) {
    // New window
    placeChipCounters.set(socketId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= PLACE_CHIP_LIMIT) {
    return false; // Rate limit exceeded
  }

  entry.count += 1;
  return true;
}

// ── In-memory store for round summaries (per-session) ─────────────
// Accumulates round-by-round vote snapshots so the session-ended event
// can include per-member vote details even though votes are deleted
// from the DB after each lock-estimation.
const sessionRoundSummaries = new Map();

// ── Color palette for participant avatars ─────────────────────────
const AVATAR_COLORS = [
  '#6c748b', // tertiary-container
  '#ffdad7', // primary-fixed
  '#6cf8bb', // secondary-fixed
  '#bec6e0', // tertiary-fixed-dim
  '#8f6f6d', // outline
  '#d4a574', // warm accent
  '#7eb8d4', // cool accent
  '#c49bdb', // purple accent
];

/**
 * Pick a color that isn't already taken in the session.
 * Falls back to a random pick if all colors are used.
 */
function pickColor(existingColors) {
  const available = AVATAR_COLORS.filter((c) => !existingColors.includes(c));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

/**
 * Build a sanitised participant list to broadcast.
 * Includes a `hasVoted` flag (computed from Vote collection)
 * so clients can show who has placed a chip without revealing values.
 */
async function buildParticipantList(sessionId, itemId = 'current') {
  const participants = await Participant.find({ sessionId })
    .select('_id name role color')
    .lean();

  // Get participant IDs that have voted
  const votes = await Vote.find({ sessionId, itemId })
    .select('participantId')
    .lean();
  const votedIds = new Set(votes.map((v) => v.participantId.toString()));

  return participants.map((p) => ({
    _id: p._id,
    name: p.name,
    role: p.role,
    color: p.color,
    hasVoted: votedIds.has(p._id.toString()),
  }));
}

/**
 * Register all Socket.IO event handlers on the given `io` instance.
 *
 * Events handled:
 *   join-session   — participant joins a room
 *   place-chip     — participant votes
 *   reveal-chips   — host reveals all votes
 *   new-round      — host clears votes for a new round
 *   disconnect     — cleanup on disconnect
 */
function registerSocketEvents(io) {
  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    // ── join-session ──────────────────────────────────────────────
    socket.on('join-session', async (payload, callback) => {
      try {
        // ── Payload validation ──────────────────────────────────────
        const v = validateSocketPayload({
          roomCode:   { required: true, type: 'string', maxLength: 6 },
          playerName: { required: true, type: 'string', maxLength: 40 },
          hostToken:  { type: 'string', maxLength: 128 },
          role:       { isIn: new Set(['voter', 'spectator', undefined]) },
        }, payload);
        if (!v.valid) return callback?.({ error: v.error });

        const { roomCode, playerName, hostToken, role: requestedRole } = payload;
        const safeName = sanitizeName(playerName);
        if (!safeName) {
          return callback?.({ error: 'playerName contained only invalid characters' });
        }

        const session = await Session.findOne({
          roomCode: roomCode.toUpperCase().trim(),
        });

        if (!session) {
          return callback?.({ error: 'Session not found' });
        }

        // Verify if this user is the host using the secure token
        const hostTokenValid =
          Boolean(hostToken) &&
          session.hostToken === hostToken &&
          session.hostTokenExpiresAt instanceof Date &&
          session.hostTokenExpiresAt.getTime() > Date.now();

        const isHost = hostTokenValid;
        // Hosts are always dealers; others may join as voter or spectator
        const role = isHost ? 'dealer' : (requestedRole === 'spectator' ? 'spectator' : 'voter');

        // Instead of blindly deleting, we update the existing participant if they match by name.
        // This keeps their `_id` and any placed votes intact across refreshes.
        let participant = await Participant.findOne({
          sessionId: session._id,
          name: safeName,
        });

        if (participant) {
          participant.socketId = socket.id;
          participant.role = role;
          await participant.save();
        } else {
          // Get existing colors for color-picking
          const remaining = await Participant.find({ sessionId: session._id })
            .select('color')
            .lean();
          const existingColors = remaining.map((p) => p.color);

          participant = await Participant.create({
            sessionId: session._id,
            name: safeName,
            role,
            socketId: socket.id,
            color: pickColor(existingColors),
          });
        }

        // ── Clean up orphaned participants (except the one joining) ─────────
        const allParticipants = await Participant.find({ sessionId: session._id })
          .select('_id socketId')
          .lean();

        const connectedSocketIds = new Set(
          Array.from(await io.in(roomCode.toUpperCase()).fetchSockets()).map(
            (s) => s.id
          )
        );

        const orphanIds = allParticipants
          .filter(
            (p) =>
              p.socketId &&
              !connectedSocketIds.has(p.socketId) &&
              p._id.toString() !== participant._id.toString()
          )
          .map((p) => p._id);

        if (orphanIds.length > 0) {
          await Participant.deleteMany({ _id: { $in: orphanIds } });
          await Vote.deleteMany({ participantId: { $in: orphanIds } });
        }

        // Update session hostId if this is the confirmed host
        if (isHost && session.hostId !== participant._id.toString()) {
          session.hostId = participant._id.toString();
          await session.save();
        } else if (!session.hostId && isHost) {
          session.hostId = participant._id.toString();
          await session.save();
        }

        // Join the Socket.IO room (keyed by roomCode)
        socket.join(roomCode.toUpperCase());

        // Store session info on socket for disconnect handling
        socket.data = {
          sessionId: session._id,
          participantId: participant._id,
          roomCode: roomCode.toUpperCase(),
        };

        // Broadcast updated participant list to everyone in the room
        const participants = await buildParticipantList(session._id);
        io.to(roomCode.toUpperCase()).emit('participants-updated', {
          participants,
        });

        // Acknowledge to the sender
        callback?.({
          success: true,
          participantId: participant._id,
          sessionId: session._id,
          hostId: session.hostId,
          isHost,
          deckType: session.deckType,
          status: session.status,
        });

        console.log(
          `[socket] ${safeName} joined room ${roomCode} (${socket.id})`
        );
      } catch (err) {
        console.error('[socket] join-session error:', err.message);
        callback?.({ error: 'Failed to join session' });
      }
    });

    // ── place-chip ────────────────────────────────────────────────
    socket.on('place-chip', async (payload, callback) => {
      try {
        // ── Rate limiting (15 per minute per socket) ───────────────────
        if (!checkPlaceChipRateLimit(socket.id)) {
          return callback?.({ error: 'Too many votes, please wait before placing another chip' });
        }

        // ── Payload validation ──────────────────────────────────────
        const v = validateSocketPayload({
          sessionId: { required: true, isObjectId: true },
          value:     { required: true, isIn: VALID_VOTE_VALUES },
        }, payload);
        if (!v.valid) return callback?.({ error: v.error });

        const { sessionId, itemId = 'current', value } = payload;

        const participantId = socket.data?.participantId;
        if (!participantId) {
          return callback?.({ error: 'You must join a session first' });
        }

        // Spectators cannot vote
        const participant = await Participant.findById(participantId).select('role').lean();
        if (participant?.role === 'spectator') {
          return callback?.({ error: 'Spectators cannot place chips' });
        }

        // Upsert: one vote per participant per item per session
        await Vote.findOneAndUpdate(
          { sessionId, itemId, participantId },
          { value, placedAt: Date.now() },
          { upsert: true, new: true }
        );

        // Count votes vs total voters (not spectators)
        const [voteCount, totalParticipants] = await Promise.all([
          Vote.countDocuments({ sessionId, itemId }),
          Participant.countDocuments({ sessionId, role: 'voter' }),
        ]);

        // Broadcast vote count (NOT the value) to the room
        const roomCode = socket.data?.roomCode;
        if (roomCode) {
          io.to(roomCode).emit('vote-update', {
            voteCount,
            totalParticipants,
          });

          // Also refresh participant list so `hasVoted` updates
          const participants = await buildParticipantList(sessionId, itemId);
          io.to(roomCode).emit('participants-updated', { participants });
        }

        callback?.({ success: true });

        console.log(
          `[socket] chip placed by ${participantId} in session ${sessionId}`
        );
      } catch (err) {
        console.error('[socket] place-chip error:', err.message);
        callback?.({ error: 'Failed to place chip' });
      }
    });

    // ── reveal-chips ──────────────────────────────────────────────
    socket.on('reveal-chips', async (payload, callback) => {
      try {
        const v = validateSocketPayload({
          sessionId: { required: true, isObjectId: true },
        }, payload);
        if (!v.valid) return callback?.({ error: v.error });

        const { sessionId } = payload;

        const session = await Session.findById(sessionId);
        if (!session) {
          return callback?.({ error: 'Session not found' });
        }

        // Host-only guard
        const participantId = socket.data?.participantId;
        if (!participantId || session.hostId !== participantId.toString()) {
          return callback?.({ error: 'Only the host can reveal chips' });
        }

        // Update session status
        session.status = 'revealed';
        await session.save();

        // Fetch all votes with participant names
        const votes = await Vote.find({
          sessionId,
          itemId: 'current',
        }).lean();

        const participants = await Participant.find({ sessionId })
          .select('_id name')
          .lean();
        const nameMap = {};
        participants.forEach((p) => {
          nameMap[p._id.toString()] = p.name;
        });

        const revealedVotes = votes.map((v) => ({
          participantId: v.participantId,
          participantName: nameMap[v.participantId.toString()] || 'Unknown',
          value: v.value,
        }));

        // Broadcast all vote values to the room
        const roomCode = socket.data?.roomCode;
        if (roomCode) {
          io.to(roomCode).emit('chips-revealed', {
            votes: revealedVotes,
            status: 'revealed',
          });
        }

        callback?.({ success: true });

        console.log(`[socket] chips revealed in session ${sessionId}`);
      } catch (err) {
        console.error('[socket] reveal-chips error:', err.message);
        callback?.({ error: 'Failed to reveal chips' });
      }
    });

    // ── lock-estimation ───────────────────────────────────────────
    socket.on('lock-estimation', async (payload, callback) => {
      try {
        const v = validateSocketPayload({
          sessionId:  { required: true, isObjectId: true },
          storyId:    { required: true, isObjectId: true },
          finalValue: { required: true, isIn: VALID_VOTE_VALUES },
          nextStoryId: { isObjectId: true },
        }, payload);
        if (!v.valid) return callback?.({ error: v.error });

        const { sessionId, storyId, finalValue, nextStoryId } = payload;

        const session = await Session.findById(sessionId);
        if (!session) {
          return callback?.({ error: 'Session not found' });
        }

        // Host-only guard
        const participantId = socket.data?.participantId;
        if (!participantId || session.hostId !== participantId.toString()) {
          return callback?.({ error: 'Only the host can lock an estimation' });
        }

        const Story = require('../models/Story');

        // Persist the locked estimation on the story
        const updatedStory = await Story.findByIdAndUpdate(
          storyId,
          {
            storyPoints: finalValue,
            lockedAt: new Date(),
            lockedBy: participantId.toString(),
          },
          { new: true }
        );

        if (!updatedStory) {
          return callback?.({ error: 'Story not found' });
        }

        // ── Capture round votes BEFORE deleting them ──────────────
        const roundVotes = await Vote.find({ sessionId, itemId: 'current' }).lean();
        const allParticipants = await Participant.find({ sessionId })
          .select('_id name')
          .lean();
        const nameMap = {};
        allParticipants.forEach((p) => {
          nameMap[p._id.toString()] = p.name;
        });

        const roundSummary = {
          storyId: updatedStory._id,
          externalId: updatedStory.externalId,
          summary: updatedStory.summary,
          finalValue,
          votes: roundVotes.map((v) => ({
            participantName: nameMap[v.participantId.toString()] || 'Unknown',
            value: v.value,
          })),
        };

        // Store the round summary in-memory for the session-end broadcast
        const sid = sessionId.toString();
        if (!sessionRoundSummaries.has(sid)) {
          sessionRoundSummaries.set(sid, []);
        }
        // Deduplicate by storyId (in case of retries)
        const existing = sessionRoundSummaries.get(sid);
        const existIdx = existing.findIndex(
          (r) => r.storyId.toString() === roundSummary.storyId.toString()
        );
        if (existIdx !== -1) {
          existing[existIdx] = roundSummary;
        } else {
          existing.push(roundSummary);
        }

        // Clear votes for this story so next round starts clean
        await Vote.deleteMany({ sessionId, itemId: 'current' });

        // Resolve next story (auto-advance)
        let nextStory = null;
        if (nextStoryId) {
          nextStory = await Story.findById(nextStoryId).lean();
        }

        // Reset session to voting for the next round
        session.status = 'voting';
        await session.save();

        // Broadcast to all room clients
        const roomCode = socket.data?.roomCode;
        if (roomCode) {
          io.to(roomCode).emit('estimation-locked', {
            storyId,
            finalValue,
            story: updatedStory,
            nextStory,
            roundSummary,
            status: 'voting',
          });

          // Refresh participant hasVoted flags
          const participants = await buildParticipantList(sessionId, 'current');
          io.to(roomCode).emit('participants-updated', { participants });
        }

        callback?.({ success: true, story: updatedStory });

        console.log(
          `[socket] estimation locked: story ${storyId} = ${finalValue} in session ${sessionId}`
        );
      } catch (err) {
        console.error('[socket] lock-estimation error:', err.message);
        callback?.({ error: 'Failed to lock estimation' });
      }
    });

    // ── new-round ─────────────────────────────────────────────────
    socket.on('new-round', async (payload, callback) => {
      try {
        const v = validateSocketPayload({
          sessionId: { required: true, isObjectId: true },
        }, payload);
        if (!v.valid) return callback?.({ error: v.error });

        const { sessionId, itemId = 'current' } = payload;

        const session = await Session.findById(sessionId);
        if (!session) {
          return callback?.({ error: 'Session not found' });
        }

        // Host-only guard
        const participantId = socket.data?.participantId;
        if (!participantId || session.hostId !== participantId.toString()) {
          return callback?.({ error: 'Only the host can start a new round' });
        }

        // Delete all votes for this item
        await Vote.deleteMany({ sessionId, itemId });

        // Reset session status
        session.status = 'voting';
        await session.save();

        // Broadcast reset to the room
        const roomCode = socket.data?.roomCode;
        if (roomCode) {
          io.to(roomCode).emit('round-reset', { status: 'voting' });

          // Refresh participant list (hasVoted should now be false for all)
          const participants = await buildParticipantList(sessionId, itemId);
          io.to(roomCode).emit('participants-updated', { participants });
        }

        callback?.({ success: true });

        console.log(`[socket] new round started in session ${sessionId}`);
      } catch (err) {
        console.error('[socket] new-round error:', err.message);
        callback?.({ error: 'Failed to start new round' });
      }
    });

    // ── select-issue ──────────────────────────────────────────────
    socket.on('select-issue', async (payload, callback) => {
      try {
        const v = validateSocketPayload({
          sessionId: { required: true, isObjectId: true },
          storyId:   { required: true, isObjectId: true },
        }, payload);
        if (!v.valid) return callback?.({ error: v.error });

        const { sessionId, storyId } = payload;
        
        const session = await Session.findById(sessionId);
        if (!session) return callback?.({ error: 'Session not found' });
        
        const participantId = socket.data?.participantId;
        if (!participantId || session.hostId !== participantId.toString()) {
          return callback?.({ error: 'Only the host can select an issue' });
        }
        
        const Story = require('../models/Story');
        const story = await Story.findById(storyId);
        
        const roomCode = socket.data?.roomCode;
        if (roomCode && story) {
          io.to(roomCode).emit('issue-selected', { story });
        }
        
        callback?.({ success: true });
      } catch (err) {
        console.error('[socket] select-issue error:', err.message);
        callback?.({ error: 'Failed to select issue' });
      }
    });

    // ── end-session ───────────────────────────────────────────────
    socket.on('end-session', async (payload, callback) => {
      try {
        const v = validateSocketPayload({
          sessionId: { required: true, isObjectId: true },
        }, payload);
        if (!v.valid) return callback?.({ error: v.error });

        const { sessionId } = payload;

        const session = await Session.findById(sessionId);
        if (!session) {
          return callback?.({ error: 'Session not found' });
        }

        // Host-only guard
        const participantId = socket.data?.participantId;
        if (!participantId || session.hostId !== participantId.toString()) {
          return callback?.({ error: 'Only the host can end the session' });
        }

        // ── Build session summary BEFORE deleting data ────────────
        const Story = require('../models/Story');
        const lockedStories = await Story.find({
          sessionId,
          storyPoints: { $ne: null },
        }).sort({ order: 1 }).lean();

        const allParticipants = await Participant.find({ sessionId })
          .select('_id name role')
          .lean();

        // Include server-side accumulated round summaries (with per-member votes)
        const roundSummaries = sessionRoundSummaries.get(sessionId.toString()) || [];

        const sessionSummary = {
          sessionName: session.name,
          stories: lockedStories.map((s) => ({
            storyId: s._id,
            externalId: s.externalId,
            summary: s.summary,
            finalValue: s.storyPoints,
          })),
          roundSummaries,
          participants: allParticipants.map((p) => ({
            name: p.name,
            role: p.role,
          })),
        };

        // Broadcast to room that session has ended, with summary data
        const roomCode = socket.data?.roomCode;
        if (roomCode) {
          io.to(roomCode).emit('session-ended', {
            message: 'The host has ended the session.',
            sessionSummary,
          });
        }

        // Delete session and related data
        await Session.findByIdAndDelete(sessionId);
        await Participant.deleteMany({ sessionId });
        await Vote.deleteMany({ sessionId });
        // Also delete stories for this session
        await Story.deleteMany({ sessionId });

        // Clean up in-memory round summaries
        sessionRoundSummaries.delete(sessionId.toString());

        callback?.({ success: true });

        console.log(`[socket] session ${sessionId} ended by host`);
      } catch (err) {
        console.error('[socket] end-session error:', err.message);
        callback?.({ error: 'Failed to end session' });
      }
    });

    // ── disconnect ────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      // Clean up the per-socket rate limit counter
      placeChipCounters.delete(socket.id);

      try {
        const { sessionId, participantId, roomCode } = socket.data || {};

        if (!participantId) {
          console.log(`[socket] disconnected (no session): ${socket.id}`);
          return;
        }

        // Emit participant-left event to notify others
        if (roomCode) {
          const participant = await Participant.findById(participantId).select('name').lean();
          if (participant) {
            io.to(roomCode).emit('participant-left', { name: participant.name });
          }
        }

        // Remove participant from DB
        await Participant.findByIdAndDelete(participantId);

        // Also remove their votes
        await Vote.deleteMany({ participantId });

        // Broadcast updated participant list
        if (roomCode && sessionId) {
          const participants = await buildParticipantList(sessionId);
          io.to(roomCode).emit('participants-updated', { participants });
        }

        console.log(
          `[socket] disconnected: ${socket.id} (participant ${participantId} removed)`
        );
      } catch (err) {
        console.error('[socket] disconnect cleanup error:', err.message);
      }
    });
  });
}

module.exports = registerSocketEvents;
