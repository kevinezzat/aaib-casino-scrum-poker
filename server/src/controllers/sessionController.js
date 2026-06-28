'use strict';

const { customAlphabet } = require('nanoid');
const Session = require('../models/Session');

// 6-char uppercase alphanumeric room code, e.g. "AB12CD"
const generateRoomCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

/**
 * Attempt to generate a unique room code with collision retry.
 * In practice, the 36^6 ≈ 2.2 billion space means collisions are
 * astronomically rare, but we handle it defensively.
 */
async function uniqueRoomCode(maxAttempts = 5) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateRoomCode();
    const exists = await Session.exists({ roomCode: code });
    if (!exists) return code;
  }
  throw new Error('Could not generate unique room code after retries');
}

// ── POST /api/sessions ─────────────────────────────────────────────
/**
 * Create a new session.
 *
 * Body:  { name: string, deckType?: 'fibonacci'|'tshirt'|'powers-of-2' }
 * Returns: { sessionId, roomCode }
 */
async function createSession(req, res) {
  try {
    const { name, deckType } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'name is required' });
    }

    const roomCode = await uniqueRoomCode();

    const session = await Session.create({
      name: name.trim(),
      roomCode,
      deckType: deckType || 'fibonacci',
    });

    return res.status(201).json({
      sessionId: session._id,
      roomCode: session.roomCode,
    });
  } catch (err) {
    console.error('[POST /api/sessions]', err);
    return res.status(500).json({ error: 'Failed to create session' });
  }
}

// ── GET /api/sessions/:code ────────────────────────────────────────
/**
 * Look up a session by room code (case-insensitive).
 * Used in the join flow to validate a code before the participant
 * enters their name.
 *
 * Returns: full session document (minus __v)
 */
async function getSessionByCode(req, res) {
  try {
    const code = req.params.code.toUpperCase().trim();

    if (code.length !== 6) {
      return res.status(400).json({ error: 'Room code must be 6 characters' });
    }

    const session = await Session.findOne({ roomCode: code }).select('-__v');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.json(session);
  } catch (err) {
    console.error('[GET /api/sessions/:code]', err);
    return res.status(500).json({ error: 'Failed to look up session' });
  }
}

// ── PATCH /api/sessions/:id/status ────────────────────────────────
/**
 * Update session status — host only.
 *
 * Body:   { hostId: string, status: 'voting'|'revealed'|'complete' }
 * Guards: hostId must match session.hostId (Phase 1 simple check).
 *         Phase 2 will replace this with JWT / socket identity.
 *
 * Returns: updated session document
 */
async function updateSessionStatus(req, res) {
  try {
    const { id } = req.params;
    const { hostId, status } = req.body;

    const VALID_STATUSES = ['waiting', 'voting', 'revealed', 'complete'];

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const session = await Session.findById(id).select('-__v');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Phase 1 host guard
    if (!hostId || session.hostId !== String(hostId)) {
      return res.status(403).json({ error: 'Only the host can change session status' });
    }

    session.status = status;
    await session.save();

    // Broadcast status change to all clients in the room (Phase 2 will expand this)
    if (req.io) {
      req.io.to(session.roomCode).emit('session:statusChanged', {
        sessionId: session._id,
        status: session.status,
      });
    }

    return res.json(session);
  } catch (err) {
    console.error('[PATCH /api/sessions/:id/status]', err);
    return res.status(500).json({ error: 'Failed to update session status' });
  }
}

module.exports = {
  createSession,
  getSessionByCode,
  updateSessionStatus,
};
