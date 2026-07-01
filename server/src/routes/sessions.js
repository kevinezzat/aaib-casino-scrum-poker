'use strict';

const express = require('express');
const {
  createSession,
  getSessionByCode,
  updateSessionStatus,
  addStories,
  getStories,
} = require('../controllers/sessionController');

const router = express.Router();

// ── POST /api/sessions ─────────────────────────────────────────────
router.post('/', createSession);

// ── GET /api/sessions/:code ────────────────────────────────────────
router.get('/:code', getSessionByCode);

// ── PATCH /api/sessions/:id/status ────────────────────────────────
router.patch('/:id/status', updateSessionStatus);

// ── POST /api/sessions/:id/stories ────────────────────────────────
router.post('/:id/stories', addStories);

// ── GET /api/sessions/:id/stories ─────────────────────────────────
router.get('/:id/stories', getStories);

module.exports = router;
