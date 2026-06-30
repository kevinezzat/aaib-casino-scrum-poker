'use strict';

const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

/**
 * JiraToken — stores per-session-host Jira OAuth 2.0 tokens.
 *
 * Tokens are encrypted at rest using AES-256-GCM (via utils/encryption.js).
 * The raw accessToken and refreshToken values are NEVER written to MongoDB
 * in plaintext — encryption/decryption is handled transparently via Mongoose
 * getters and setters on those fields.
 *
 * Relationship to the existing data model:
 *   - sessionId → references the Session that this token is scoped to.
 *     The session host is the Jira-authenticated user.
 *   - cloudId  → the Atlassian Cloud ID for the workspace (returned by the
 *     accessible-resources endpoint after token exchange).
 */
const jiraTokenSchema = new mongoose.Schema(
  {
    // ── Identity ───────────────────────────────────────────────────
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },

    // ── Atlassian workspace ───────────────────────────────────────
    cloudId: {
      type: String,
      required: true,
    },

    // ── Tokens (encrypted at rest) ────────────────────────────────
    accessToken: {
      type: String,
      required: true,
      set: (val) => (val ? encrypt(val) : val),
      get: (val) => (val ? decrypt(val) : val),
    },

    refreshToken: {
      type: String,
      // refreshToken may be absent if offline_access scope was not granted
      default: null,
      set: (val) => (val ? encrypt(val) : val),
      get: (val) => (val ? decrypt(val) : val),
    },

    // ── Token lifecycle ───────────────────────────────────────────
    expiresAt: {
      type: Date,
      required: true,
    },

    // ── Granted scopes ────────────────────────────────────────────
    scopes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
    // Required to make Mongoose run getters when converting to JSON/Object
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────

// Compound index: one token record per session per cloud workspace
jiraTokenSchema.index({ sessionId: 1, cloudId: 1 }, { unique: true });

// TTL index: automatically remove expired token records from MongoDB.
// MongoDB will remove the document once expiresAt has passed.
// Note: the refresh flow should update expiresAt before this fires.
jiraTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Check whether the stored access token has expired (with a 60-second buffer).
 * @returns {boolean}
 */
jiraTokenSchema.methods.isExpired = function () {
  return this.expiresAt.getTime() < Date.now() + 60_000;
};

module.exports = mongoose.model('JiraToken', jiraTokenSchema);
