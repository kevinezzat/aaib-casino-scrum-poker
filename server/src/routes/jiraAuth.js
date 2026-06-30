'use strict';

const express = require('express');
const { connect, callback, status } = require('../controllers/jiraAuthController');

const router = express.Router();

// ── GET /api/jira/auth/connect?sessionId=<id> ─────────────────────────────────
// Initiates the OAuth 2.0 flow — redirects to Atlassian's authorization page.
router.get('/connect', connect);

// ── GET /api/jira/auth/callback ────────────────────────────────────────────────
// Atlassian's redirect target after the user authorises (or denies) the app.
router.get('/callback', callback);

// ── GET /api/jira/auth/status?sessionId=<id> ──────────────────────────────────
// Returns { connected: bool, cloudId, expiresAt } for the given session.
router.get('/status', status);

module.exports = router;
