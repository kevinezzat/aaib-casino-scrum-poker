'use strict';

const mongoose = require('mongoose');

/**
 * Vote — a single chip placement by a Participant on a story item.
 *
 * value: Mixed to support:
 *   - Fibonacci numbers: 1, 2, 3, 5, 8, 13, 20
 *   - Special chips:     '?'  (unknown)  |  'coffee' (need a break)
 *
 * itemId: the Jira issue key or any string identifying the story
 *   being estimated (e.g. "AUTH-204").
 *
 * One Participant can only have one Vote per (sessionId + itemId) —
 * enforced by the compound unique index below.
 */
const voteSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    itemId: {
      type: String,
      required: true,
      trim: true,
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      required: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed, // number | '?' | 'coffee'
      required: true,
    },
    placedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // placedAt is sufficient
  }
);

// Prevent duplicate votes: one chip per participant per story item per session
voteSchema.index({ sessionId: 1, itemId: 1, participantId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
