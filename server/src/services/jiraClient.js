'use strict';

/**
 * jiraClient.js — Authenticated request helper for the Jira Cloud REST API.
 *
 * Main export: jiraRequest(sessionId, method, path, body?)
 *
 * Handles:
 *   - Token lookup + decryption (transparent via Mongoose getters)
 *   - Expiry check with 60-second buffer
 *   - Automatic refresh (Atlassian rotates refresh tokens — both tokens are updated)
 *   - Refresh failure → deletes stale JiraToken record → throws JiraReauthRequiredError
 *   - Actual API call to https://api.atlassian.com/ex/jira/<cloudId>/rest/api/3<path>
 *
 * Usage:
 *   const { jiraRequest } = require('../services/jiraClient');
 *   const issue = await jiraRequest(sessionId, 'GET', '/issue/PROJ-123');
 */

const JiraToken = require('../models/JiraToken');
const JiraReauthRequiredError = require('../errors/JiraReauthRequiredError');
const { jiraOAuthConfig } = require('../config/jiraOauth');

const JIRA_API_BASE = 'https://api.atlassian.com/ex/jira';
const TOKEN_EXPIRY_BUFFER_MS = 60_000; // 60 seconds

// ── Token refresh ─────────────────────────────────────────────────────────────

/**
 * Exchange a refresh token for a new access + refresh token pair.
 * Atlassian rotates refresh tokens on every use — if this call succeeds,
 * the old refresh token is immediately invalidated.
 *
 * @param {string} refreshToken — plaintext refresh token (already decrypted by Mongoose getter)
 * @returns {{ access_token, refresh_token, expires_in }}
 * @throws if the refresh request fails (network error or Atlassian error response)
 */
async function exchangeRefreshToken(refreshToken) {
  const res = await fetch(jiraOAuthConfig.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: jiraOAuthConfig.clientId,
      client_secret: jiraOAuthConfig.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    const reason = data.error_description || data.error || `HTTP ${res.status}`;
    throw new Error(`Atlassian token refresh failed: ${reason}`);
  }

  return data;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Make an authenticated request to the Jira Cloud REST API.
 *
 * @param {string} sessionId — MongoDB Session._id (string or ObjectId)
 * @param {string} method    — HTTP verb (GET, POST, PUT, DELETE, …)
 * @param {string} path      — Jira API path, e.g. '/issue/PROJ-1' (must start with '/')
 * @param {object} [options] — Options including body, and apiPrefix
 * @returns {Promise<any>}   — Parsed JSON response from Jira
 */
async function jiraRequest(sessionId, method, path, options = {}) {
  const { body, apiPrefix = '/rest/api/3' } = options;

  // ── 1. Load token record ─────────────────────────────────────────
  // findOne returns the most-recently-created record for this session.
  // Mongoose getters automatically decrypt accessToken / refreshToken.
  const tokenRecord = await JiraToken.findOne({ sessionId }).sort({ createdAt: -1 });

  if (!tokenRecord) {
    throw new JiraReauthRequiredError(
      sessionId,
      'No Jira token found for this session — user must connect Jira first'
    );
  }

  // ── 2. Refresh if expiring ───────────────────────────────────────
  const isExpiringSoon =
    tokenRecord.expiresAt.getTime() < Date.now() + TOKEN_EXPIRY_BUFFER_MS;

  if (isExpiringSoon) {
    if (!tokenRecord.refreshToken) {
      // No refresh token available — must reauth
      await JiraToken.findByIdAndDelete(tokenRecord._id);
      throw new JiraReauthRequiredError(
        sessionId,
        'Jira access token expired and no refresh token is stored'
      );
    }

    try {
      const refreshed = await exchangeRefreshToken(tokenRecord.refreshToken);

      // Atlassian rotates refresh tokens — save BOTH new values.
      // Mongoose setters will encrypt before writing to MongoDB.
      tokenRecord.accessToken = refreshed.access_token;
      if (refreshed.refresh_token) {
        tokenRecord.refreshToken = refreshed.refresh_token;
      }
      tokenRecord.expiresAt = new Date(
        Date.now() + (refreshed.expires_in ?? 3600) * 1000
      );
      await tokenRecord.save();

      console.log(`[jiraClient] Refreshed token for session ${sessionId}`);
    } catch (refreshErr) {
      console.error('[jiraClient] Refresh failed:', refreshErr.message);

      // Stale record is now useless — remove it so status endpoint shows disconnected
      await JiraToken.findByIdAndDelete(tokenRecord._id);

      throw new JiraReauthRequiredError(
        sessionId,
        `Jira refresh token is no longer valid: ${refreshErr.message}`
      );
    }
  }

  // ── 3. Make the Jira API call ────────────────────────────────────
  // accessToken is the decrypted plaintext value (via Mongoose getter)
  const url = `${JIRA_API_BASE}/${tokenRecord.cloudId}${apiPrefix}${path}`;

  const headers = {
    Authorization: `Bearer ${tokenRecord.accessToken}`,
    Accept: 'application/json',
    ...(body ? { 'Content-Type': 'application/json' } : {}),
  };

  const apiRes = await fetch(url, {
    method: method.toUpperCase(),
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  // Parse body regardless of status — Jira always returns JSON
  const responseData = await apiRes.json().catch(() => ({}));

  if (!apiRes.ok) {
    const message =
      responseData.errorMessages?.[0] ||
      responseData.message ||
      `Jira API error ${apiRes.status}`;
    
    console.error('[JIRA API ERROR]', url, apiRes.status, JSON.stringify(responseData));
    
    const err = new Error(message);
    err.statusCode = apiRes.status;
    err.jiraResponse = responseData;
    throw err;
  }

  return responseData;
}

module.exports = { jiraRequest };
