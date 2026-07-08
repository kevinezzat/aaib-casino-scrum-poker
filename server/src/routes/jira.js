'use strict';

const express = require('express');
const { param, query, body } = require('express-validator');
const {
  getBacklog,
  getIssueDetail,
  writeStoryPoints,
  postComment,
  getProjects,
  getBoards,
  getSprints,
} = require('../controllers/jiraController');
const validate = require('../middleware/validate');

const router = express.Router();

// ── Shared validators ──────────────────────────────────────────────
// Room codes are always 6 uppercase alphanumeric characters
const roomCodeQuery = query('roomCode')
  .isString()
  .matches(/^[A-Z0-9]{6}$/i).withMessage('roomCode must be a 6-character alphanumeric code');

// Jira issue keys follow the format PROJECT-123
const issueKeyParam = param('issueKey')
  .isString()
  .matches(/^[A-Z][A-Z0-9_]+-\d+$/i).withMessage('issueKey must match format PROJECT-123');

// ── GET /api/jira/issues?roomCode=XXXXXX&jql=...  ─────────────────
router.get(
  '/issues',
  [
    roomCodeQuery,
    query('jql')
      .optional()
      .isString().withMessage('jql must be a string')
      .isLength({ max: 2000 }).withMessage('jql must be 2000 characters or fewer'),
    query('maxResults')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('maxResults must be between 1 and 100'),
  ],
  validate,
  getBacklog
);

// ── GET /api/jira/issues/:issueKey?roomCode=XXXXXX ────────────────
router.get(
  '/issues/:issueKey',
  [roomCodeQuery, issueKeyParam],
  validate,
  getIssueDetail
);

// ── PUT /api/jira/issues/:issueKey/story-points ───────────────────
router.put(
  '/issues/:issueKey/story-points',
  [
    issueKeyParam,
    body('roomCode')
      .isString()
      .matches(/^[A-Z0-9]{6}$/i).withMessage('roomCode must be a 6-character alphanumeric code'),
    body('storyPoints')
      .exists({ checkNull: false }).withMessage('storyPoints is required')
      .custom((val) => {
        // Allow null (clear), a finite number, '?' or 'coffee' (special values)
        if (val === null || val === '?' || val === 'coffee') return true;
        if (typeof val === 'number' && Number.isFinite(val) && val >= 0) return true;
        throw new Error('storyPoints must be null, a non-negative number, "?", or "coffee"');
      }),
    body('customFieldId')
      .optional()
      .isString()
      .matches(/^customfield_\d+$/).withMessage('customFieldId must match format customfield_NNNNN'),
  ],
  validate,
  writeStoryPoints
);

// ── POST /api/jira/issues/:issueKey/comment ───────────────────────
router.post(
  '/issues/:issueKey/comment',
  [
    issueKeyParam,
    body('roomCode')
      .isString()
      .matches(/^[A-Z0-9]{6}$/i).withMessage('roomCode must be a 6-character alphanumeric code'),
    body('comment')
      .isString().withMessage('comment must be a string')
      .trim()
      .notEmpty().withMessage('comment cannot be empty')
      .isLength({ max: 5000 }).withMessage('comment must be 5000 characters or fewer'),
  ],
  validate,
  postComment
);

// ── GET /api/jira/projects ────────────────────────────────────────
router.get(
  '/projects',
  [roomCodeQuery],
  validate,
  getProjects
);

// ── GET /api/jira/boards ──────────────────────────────────────────
router.get(
  '/boards',
  [
    roomCodeQuery,
    query('projectKeyOrId')
      .optional()
      .isString()
      .isLength({ max: 50 }).withMessage('projectKeyOrId must be 50 characters or fewer'),
  ],
  validate,
  getBoards
);

// ── GET /api/jira/boards/:boardId/sprints ─────────────────────────
router.get(
  '/boards/:boardId/sprints',
  [
    roomCodeQuery,
    param('boardId')
      .isInt({ min: 1 }).withMessage('boardId must be a positive integer'),
  ],
  validate,
  getSprints
);

module.exports = router;
