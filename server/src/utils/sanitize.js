'use strict';

// isomorphic-dompurify exports a pre-configured DOMPurify instance that
// handles the jsdom window internally — it is NOT a factory function.
const DOMPurify = require('isomorphic-dompurify');

/**
 * Strip all HTML tags and sanitise a string using DOMPurify.
 * Returns a clean, plaintext string safe for storage and display.
 *
 * @param {string} input — raw user-supplied string
 * @param {object} [opts] — optional DOMPurify config overrides
 * @returns {string}
 */
function sanitizeHtml(input, opts = {}) {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], ...opts });
}

/**
 * Sanitise a player name — strips HTML, trims whitespace, and enforces:
 *   - Max 40 characters
 *   - Only printable Unicode characters (no control chars, no null bytes)
 *
 * @param {string} input
 * @returns {string}
 */
function sanitizeName(input) {
  if (typeof input !== 'string') return '';
  // 1. Strip any HTML tags
  const stripped = sanitizeHtml(input.trim());
  // 2. Remove control characters and null bytes (keep printable Unicode)
  const printable = stripped.replace(/[\x00-\x1F\x7F]/g, '');
  // 3. Enforce max length
  return printable.slice(0, 40);
}

/**
 * Sanitise free-form text (session names, comments, etc.)
 * Strips HTML, removes control characters, enforces a configurable max length.
 *
 * @param {string} input
 * @param {number} [maxLength=5000]
 * @returns {string}
 */
function sanitizeText(input, maxLength = 5000) {
  if (typeof input !== 'string') return '';
  const stripped = sanitizeHtml(input.trim());
  const printable = stripped.replace(/[\x00-\x1F\x7F]/g, '');
  return printable.slice(0, maxLength);
}

module.exports = { sanitizeHtml, sanitizeName, sanitizeText };
