'use strict';

const Session = require('../models/Session');
const Participant = require('../models/Participant');
const Vote = require('../models/Vote');

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
        const { roomCode, playerName, role = 'voter' } = payload || {};

        if (!roomCode || !playerName) {
          return callback?.({ error: 'roomCode and playerName are required' });
        }

        const session = await Session.findOne({
          roomCode: roomCode.toUpperCase().trim(),
        });

        if (!session) {
          return callback?.({ error: 'Session not found' });
        }

        // ── Clean up orphaned participants ─────────────────────────
        // Remove any previous participant record for the same name in
        // this session (handles page refresh / reconnect).
        await Participant.deleteMany({
          sessionId: session._id,
          name: playerName.trim(),
        });

        // Also purge participants whose sockets are no longer connected
        // (stale records from server restarts or ungraceful disconnects).
        const allParticipants = await Participant.find({ sessionId: session._id })
          .select('_id socketId color')
          .lean();
        const connectedSocketIds = new Set(
          Array.from(await io.in(roomCode.toUpperCase()).fetchSockets()).map(
            (s) => s.id
          )
        );
        const orphanIds = allParticipants
          .filter((p) => p.socketId && !connectedSocketIds.has(p.socketId))
          .map((p) => p._id);
        if (orphanIds.length > 0) {
          await Participant.deleteMany({ _id: { $in: orphanIds } });
          await Vote.deleteMany({ participantId: { $in: orphanIds } });
        }

        // Get existing colors (after cleanup) for color-picking
        const remaining = await Participant.find({ sessionId: session._id })
          .select('color')
          .lean();
        const existingColors = remaining.map((p) => p.color);

        // Create participant in DB
        const participant = await Participant.create({
          sessionId: session._id,
          name: playerName.trim(),
          role,
          socketId: socket.id,
          color: pickColor(existingColors),
        });

        // If this is the first participant and no host is set, make them host
        if (!session.hostId) {
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
          deckType: session.deckType,
          status: session.status,
        });

        console.log(
          `[socket] ${playerName} joined room ${roomCode} (${socket.id})`
        );
      } catch (err) {
        console.error('[socket] join-session error:', err.message);
        callback?.({ error: 'Failed to join session' });
      }
    });

    // ── place-chip ────────────────────────────────────────────────
    socket.on('place-chip', async (payload, callback) => {
      try {
        const { sessionId, itemId = 'current', value } = payload || {};

        if (!sessionId || value === undefined || value === null) {
          return callback?.({ error: 'sessionId and value are required' });
        }

        const participantId = socket.data?.participantId;
        if (!participantId) {
          return callback?.({ error: 'You must join a session first' });
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
        const { sessionId } = payload || {};

        if (!sessionId) {
          return callback?.({ error: 'sessionId is required' });
        }

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

    // ── new-round ─────────────────────────────────────────────────
    socket.on('new-round', async (payload, callback) => {
      try {
        const { sessionId, itemId = 'current' } = payload || {};

        if (!sessionId) {
          return callback?.({ error: 'sessionId is required' });
        }

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

    // ── disconnect ────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      try {
        const { sessionId, participantId, roomCode } = socket.data || {};

        if (!participantId) {
          console.log(`[socket] disconnected (no session): ${socket.id}`);
          return;
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
