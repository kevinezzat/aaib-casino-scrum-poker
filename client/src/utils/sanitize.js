import DOMPurify from 'dompurify';

/**
 * sanitize — Strip all HTML tags from a string using DOMPurify.
 *
 * Use this before rendering any externally-sourced text that could
 * contain HTML (e.g. Jira issue summaries, descriptions, player names
 * received over the socket).
 *
 * DOMPurify runs in the browser DOM environment — no SSR workaround needed.
 *
 * @param {string} input — raw string from an external source
 * @returns {string}     — plaintext, HTML-free string
 *
 * @example
 *   import { sanitize } from '../utils/sanitize';
 *   <span>{sanitize(issue.summary)}</span>
 */
export function sanitize(input) {
  if (typeof input !== 'string') return '';
  // ALLOWED_TAGS: [] strips ALL HTML — returns plaintext only.
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * sanitizeHtml — Allow a safe subset of HTML tags (bold, italic, links, lists).
 *
 * Use this only when you intentionally want to render rich text (e.g. Jira
 * descriptions converted from ADF). Never use with dangerouslySetInnerHTML
 * unless you have reviewed the allowed tag list carefully.
 *
 * @param {string} input
 * @returns {string}
 */
export function sanitizeHtml(input) {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'p', 'br', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    FORCE_BODY: true,
  });
}
