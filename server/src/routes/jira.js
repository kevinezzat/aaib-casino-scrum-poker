'use strict';

const express = require('express');
const {
  getBacklog,
  getIssueDetail,
  writeStoryPoints,
  postComment,
} = require('../controllers/jiraController');

const router = express.Router();

// ── GET /api/jira/issues?roomCode=XXXXXX&jql=...  ─────────────────────────────
// Sprint / JQL backlog import. Returns shaped list of issues.
router.get('/issues', getBacklog);

// ── GET /api/jira/issues/:issueKey?roomCode=XXXXXX ────────────────────────────
// Issue detail fetch for sidebar population (title, description, story points).
router.get('/issues/:issueKey', getIssueDetail);

// ── PUT /api/jira/issues/:issueKey/story-points ───────────────────────────────
// Write the team's agreed estimate back to the Jira issue's story points field.
// Acts as the session host's Jira identity (see jiraController.js for decision note).
router.put('/issues/:issueKey/story-points', writeStoryPoints);

// ── POST /api/jira/issues/:issueKey/comment ───────────────────────────────────
// Post an audit/summary comment to the issue. Acts as the session host.
router.post('/issues/:issueKey/comment', postComment);

module.exports = router;
