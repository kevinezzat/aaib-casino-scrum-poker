'use strict';

const mongoose = require('mongoose');

/**
 * Story — represents an issue/story imported into a Session for estimation.
 */
const storySchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    externalId: {
      type: String, // e.g. "PROJ-123"
      required: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    acceptanceCriteria: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      default: 'Unknown',
    },
    type: {
      type: String,
      default: 'Story',
    },
    storyPoints: {
      type: Number,
      default: null,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    lockedBy: {
      type: String, // Participant._id as string
      default: null,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Story', storySchema);
