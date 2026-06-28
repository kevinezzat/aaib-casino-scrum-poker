'use strict';

const express = require('express');
const {
  createSession,
  getSessionByCode,
  updateSessionStatus,
} = require('../controllers/sessionController');

const router = express.Router();

// ── POST /api/sessions ─────────────────────────────────────────────
router.post('/', createSession);

// ── GET /api/sessions/:code ────────────────────────────────────────
router.get('/:code', getSessionByCode);

// ── PATCH /api/sessions/:id/status ────────────────────────────────
router.patch('/:id/status', updateSessionStatus);

module.exports = router;
