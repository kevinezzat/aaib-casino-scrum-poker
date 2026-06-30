'use strict';

/**
 * jiraAuthController.js — Handlers for the Jira OAuth 2.0 (3LO) flow.
 *
 * Routes (mounted at /api/jira/auth):
 *   GET /connect   — Builds & redirects to Atlassian authorization URL
 *   GET /callback  — Receives code+state, exchanges tokens, stores in DB
 *   GET /status    — Returns { connected, cloudId } for the current session
 */

const crypto = require('crypto');
const { jiraOAuthConfig } = require('../config/jiraOauth');
const JiraToken = require('../models/JiraToken');
const Session = require('../models/Session');

// ── State param helpers (HMAC-SHA256) ────────────────────────────────────────

const STATE_SEPARATOR = '.';
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Returns the HMAC signing key from the env.
 * Reuses ENCRYPTION_KEY so we don't need yet another env var.
 */
function getStateSecret() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('[jiraAuth] ENCRYPTION_KEY is not set — required for state signing');
  return key;
}

/**
 * Build a signed state string: base64(payload) + "." + HMAC signature.
 * Payload contains { sessionId, iat } so we can verify freshness and identity.
 *
 * @param {string} sessionId — MongoDB Session._id (string)
 * @returns {string}
 */
function createState(sessionId) {
  const payload = Buffer.from(
    JSON.stringify({ sessionId, iat: Date.now() })
  ).toString('base64url');

  const sig = crypto
    .createHmac('sha256', getStateSecret())
    .update(payload)
    .digest('base64url');

  return `${payload}${STATE_SEPARATOR}${sig}`;
}

/**
 * Verify the state string and return the decoded payload.
 * Throws if tampered or expired.
 *
 * @param {string} state
 * @returns {{ sessionId: string, iat: number }}
 */
function verifyState(state) {
  if (!state || typeof state !== 'string') {
    throw new Error('Missing or invalid state parameter');
  }

  const parts = state.split(STATE_SEPARATOR);
  if (parts.length !== 2) {
    throw new Error('Malformed state parameter');
  }

  const [payload, receivedSig] = parts;

  const expectedSig = crypto
    .createHmac('sha256', getStateSecret())
    .update(payload)
    .digest('base64url');

  // Constant-time comparison to prevent timing attacks
  if (
    receivedSig.length !== expectedSig.length ||
    !crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig))
  ) {
    throw new Error('State signature is invalid — possible CSRF attempt');
  }

  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    throw new Error('State payload could not be decoded');
  }

  if (Date.now() - decoded.iat > STATE_TTL_MS) {
    throw new Error('State parameter has expired — please try connecting again');
  }

  return decoded;
}

// ── Frontend redirect helper ──────────────────────────────────────────────────

function getFrontendRedirectUrl() {
  return (process.env.JIRA_CONNECTED_REDIRECT_URL || 'http://localhost:5173').replace(/\/$/, '');
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/jira/auth/connect?sessionId=<id>
 *
 * Validates that the sessionId exists, builds the Atlassian authorization URL
 * with a signed state param, and redirects the browser.
 *
 * The sessionId comes from the query string — in a future phase this could be
 * derived from a session cookie or JWT instead.
 */
async function connect(req, res) {
  try {
    const { roomCode } = req.query;

    if (!roomCode) {
      return res.status(400).json({ error: 'roomCode query parameter is required' });
    }

    // Resolve the human-readable room code to the internal MongoDB _id
    const session = await Session.findOne({ roomCode: roomCode.toUpperCase() }).lean();
    if (!session) {
      return res.status(404).json({ error: `Session not found for room code: ${roomCode}` });
    }

    const state = createState(session._id.toString());

    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: jiraOAuthConfig.clientId,
      scope: jiraOAuthConfig.scopes,
      redirect_uri: jiraOAuthConfig.redirectUri,
      state,
      response_type: 'code',
      prompt: 'consent',
    });

    const authUrl = `${jiraOAuthConfig.authorizationUrl}?${params.toString()}`;
    return res.redirect(authUrl);
  } catch (err) {
    console.error('[jiraAuth/connect]', err.message);
    return res.status(500).json({ error: 'Failed to initiate Jira OAuth flow' });
  }
}

/**
 * GET /api/jira/auth/callback?code=...&state=...
 *
 * Atlassian redirects here after the user authorises (or denies) the app.
 * Exchanges the authorization code for tokens, fetches the cloud ID,
 * stores the encrypted tokens, then redirects back to the frontend.
 */
async function callback(req, res) {
  const frontendBase = getFrontendRedirectUrl();

  // ── 1. Handle user-denial or Atlassian errors ──────────────────
  if (req.query.error) {
    const reason = req.query.error_description || req.query.error;
    console.warn('[jiraAuth/callback] Atlassian returned error:', reason);
    return res.redirect(
      `${frontendBase}?jiraConnected=false&reason=${encodeURIComponent(reason)}`
    );
  }

  const { code, state } = req.query;

  if (!code || !state) {
    return res.redirect(
      `${frontendBase}?jiraConnected=false&reason=${encodeURIComponent('Missing code or state')}`
    );
  }

  // ── 2. Verify state ────────────────────────────────────────────
  let sessionId;
  try {
    ({ sessionId } = verifyState(state));
  } catch (err) {
    console.warn('[jiraAuth/callback] State verification failed:', err.message);
    return res.redirect(
      `${frontendBase}?jiraConnected=false&reason=${encodeURIComponent(err.message)}`
    );
  }

  // ── 3. Exchange code for tokens ────────────────────────────────
  let tokenData;
  try {
    const tokenRes = await fetch(jiraOAuthConfig.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: jiraOAuthConfig.clientId,
        client_secret: jiraOAuthConfig.clientSecret,
        code,
        redirect_uri: jiraOAuthConfig.redirectUri,
      }),
    });

    tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      const reason = tokenData.error_description || tokenData.error || 'Token exchange failed';
      console.error('[jiraAuth/callback] Token exchange error:', reason);
      return res.redirect(
        `${frontendBase}?jiraConnected=false&reason=${encodeURIComponent(reason)}`
      );
    }
  } catch (err) {
    console.error('[jiraAuth/callback] Token exchange fetch failed:', err.message);
    return res.redirect(
      `${frontendBase}?jiraConnected=false&reason=${encodeURIComponent('Network error during token exchange')}`
    );
  }

  const { access_token, refresh_token, expires_in, scope } = tokenData;

  // ── 4. Fetch accessible Jira cloud resources ───────────────────
  let cloudId;
  try {
    const resourcesRes = await fetch(jiraOAuthConfig.accessibleResourcesUrl, {
      headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/json' },
    });

    const resources = await resourcesRes.json();

    if (!resourcesRes.ok || !Array.isArray(resources) || resources.length === 0) {
      console.error('[jiraAuth/callback] No accessible Jira resources found');
      return res.redirect(
        `${frontendBase}?jiraConnected=false&reason=${encodeURIComponent('No Jira sites accessible with this account')}`
      );
    }

    if (resources.length > 1) {
      console.warn(
        `[jiraAuth/callback] User has access to ${resources.length} Jira sites — using first: "${resources[0].name}" (${resources[0].id}). ` +
          'Multi-site selection will be handled in a future phase.'
      );
    }

    cloudId = resources[0].id;
  } catch (err) {
    console.error('[jiraAuth/callback] Accessible resources fetch failed:', err.message);
    return res.redirect(
      `${frontendBase}?jiraConnected=false&reason=${encodeURIComponent('Failed to retrieve Jira site information')}`
    );
  }

  // ── 5. Persist tokens (upsert) ─────────────────────────────────
  try {
    const expiresAt = new Date(Date.now() + (expires_in ?? 3600) * 1000);
    const scopes = scope ? scope.split(' ') : [];

    // findOneAndUpdate with upsert: one record per session per cloud site.
    // The setter on the schema field handles encryption automatically.
    await JiraToken.findOneAndUpdate(
      { sessionId, cloudId },
      {
        $set: {
          accessToken: access_token,
          refreshToken: refresh_token ?? null,
          expiresAt,
          scopes,
        },
      },
      { upsert: true, new: true }
    );

    console.log(`[jiraAuth/callback] Tokens stored for session ${sessionId}, cloud ${cloudId}`);
  } catch (err) {
    console.error('[jiraAuth/callback] Failed to persist tokens:', err.message);
    return res.redirect(
      `${frontendBase}?jiraConnected=false&reason=${encodeURIComponent('Failed to save tokens — please try again')}`
    );
  }

  // ── 6. Success — redirect to frontend ─────────────────────────
  return res.redirect(`${frontendBase}?jiraConnected=true`);
}

/**
 * GET /api/jira/auth/status?sessionId=<id>
 *
 * Returns whether the session has a valid, non-expired Jira token.
 * Response: { connected: boolean, cloudId: string|null, expiresAt: string|null }
 */
async function status(req, res) {
  try {
    const { roomCode } = req.query;

    if (!roomCode) {
      return res.status(400).json({ error: 'roomCode query parameter is required' });
    }

    // Resolve room code -> session _id
    const session = await Session.findOne({ roomCode: roomCode.toUpperCase() }).lean();
    if (!session) {
      // No session = definitely not connected
      return res.json({ connected: false, cloudId: null, expiresAt: null });
    }

    const token = await JiraToken.findOne({ sessionId: session._id }).sort({ expiresAt: -1 }).lean();

    if (!token) {
      return res.json({ connected: false, cloudId: null, expiresAt: null });
    }

    const expired = new Date(token.expiresAt).getTime() < Date.now() + 60_000;

    return res.json({
      connected: !expired,
      cloudId: token.cloudId,
      expiresAt: token.expiresAt,
    });
  } catch (err) {
    console.error('[jiraAuth/status]', err.message);
    return res.status(500).json({ error: 'Failed to check Jira connection status' });
  }
}

module.exports = { connect, callback, status };
