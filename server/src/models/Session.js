'use strict';

const mongoose = require('mongoose');

/**
 * Session — represents one Scrum Poker room.
 *
 * roomCode: 6-char uppercase alphanumeric (e.g. "AB12CD")
 *   generated on create, used as the human-shareable join key.
 *
 * hostId: the Participant._id of whoever created the session.
 *   Phase 1 uses a simple field match for host-only actions.
 *   Phase 2 will replace this with JWT / socket identity.
 *
 * status flow: waiting → voting → revealed → complete
 */
const sessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    hostId: {
      type: String, // Participant._id as string (set after first participant created)
      default: null,
    },
    hostToken: {
      type: String, // Secret token given to the creator to prove they are the host
      required: true,
    },
    roomCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      minlength: 6,
      maxlength: 6,
      index: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'voting', 'revealed', 'complete'],
      default: 'waiting',
    },
    deckType: {
      type: String,
      enum: ['fibonacci', 'tshirt', 'powers-of-2'],
      default: 'fibonacci',
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  }
);

module.exports = mongoose.model('Session', sessionSchema);
