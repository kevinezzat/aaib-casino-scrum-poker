'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const {
  createSession,
  getSessionByCode,
  updateSessionStatus,
  addStories,
  getStories,
} = require('../controllers/sessionController');
const validate = require('../middleware/validate');

const router = express.Router();

// ── Allowed values ─────────────────────────────────────────────────
const VALID_DECK_TYPES = ['fibonacci', 'tshirt', 'powers-of-2'];
const VALID_STATUSES   = ['waiting', 'voting', 'revealed', 'complete'];

// ── POST /api/sessions ─────────────────────────────────────────────
router.post(
  '/',
  [
    body('name')
      .isString().withMessage('name must be a string')
      .trim()
      .notEmpty().withMessage('name is required')
      .isLength({ max: 120 }).withMessage('name must be 120 characters or fewer'),
    body('deckType')
      .optional()
      .isIn(VALID_DECK_TYPES).withMessage(`deckType must be one of: ${VALID_DECK_TYPES.join(', ')}`),
  ],
  validate,
  createSession
);

// ── GET /api/sessions/:code ────────────────────────────────────────
router.get(
  '/:code',
  [
    param('code')
      .isString()
      .isLength({ min: 6, max: 6 }).withMessage('Room code must be exactly 6 characters')
      .matches(/^[A-Z0-9]+$/i).withMessage('Room code must be alphanumeric'),
  ],
  validate,
  getSessionByCode
);

// ── PATCH /api/sessions/:id/status ────────────────────────────────
router.patch(
  '/:id/status',
  [
    param('id')
      .isMongoId().withMessage('id must be a valid session ID'),
    body('status')
      .isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
    body('hostId')
      .isString().withMessage('hostId is required')
      .notEmpty().withMessage('hostId is required'),
  ],
  validate,
  updateSessionStatus
);

// ── POST /api/sessions/:id/stories ────────────────────────────────
router.post(
  '/:id/stories',
  [
    param('id')
      .isMongoId().withMessage('id must be a valid session ID'),
    body('stories')
      .isArray({ min: 1 }).withMessage('stories must be a non-empty array'),
    body('stories.*.summary')
      .isString().withMessage('Each story must have a summary string')
      .notEmpty().withMessage('story summary cannot be empty')
      .isLength({ max: 500 }).withMessage('story summary must be 500 characters or fewer'),
    body('stories.*.externalId')
      .optional()
      .isString().isLength({ max: 100 }),
    body('stories.*.storyPoints')
      .optional({ nullable: true })
      .isNumeric().withMessage('storyPoints must be a number'),
  ],
  validate,
  addStories
);

// ── GET /api/sessions/:id/stories ─────────────────────────────────
router.get(
  '/:id/stories',
  [
    param('id')
      .isMongoId().withMessage('id must be a valid session ID'),
  ],
  validate,
  getStories
);

module.exports = router;
