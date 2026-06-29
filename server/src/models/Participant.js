'use strict';

const mongoose = require('mongoose');

/**
 * Participant — someone in a Session room.
 *
 * role:
 *   voter    — can cast a vote chip
 *   spectator — watches but does not vote (e.g. Scrum Master)
 *
 * socketId: updated on each reconnect so the server can target
 *   individual sockets for events (Phase 2).
 *
 * color: hex string assigned on join, used for the avatar badge
 *   on the poker table. Drawn from a predefined palette in Phase 2.
 */
const participantSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    role: {
      type: String,
      enum: ['voter', 'spectator', 'dealer'],
      default: 'voter',
    },
    socketId: {
      type: String,
      default: null, // null until the participant connects via WebSocket
    },
    color: {
      type: String,
      default: '#6c748b', // tertiary-container from design tokens
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Participant', participantSchema);
