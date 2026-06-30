'use strict';

/**
 * jiraClient.test.js — Unit tests for the Jira API client.
 *
 * All Atlassian HTTP calls and MongoDB operations are mocked.
 * No real network requests are made.
 *
 * Scenarios:
 *   1. Valid (non-expired) token → passes through directly, no refresh
 *   2. Expiring token → refresh succeeds → both tokens updated in MongoDB → API call made
 *   3. Refresh fails (revoked) → JiraToken deleted → JiraReauthRequiredError thrown
 *   4. No token record at all → JiraReauthRequiredError thrown immediately
 */

// ── Mock dependencies BEFORE requiring the module under test ─────────────────

// Mock the JiraToken Mongoose model
jest.mock('../models/JiraToken');

// Mock jiraOAuth config so tests don't need env vars
jest.mock('../config/jiraOauth', () => ({
  jiraOAuthConfig: {
    clientId: 'TEST_CLIENT_ID',
    clientSecret: 'TEST_CLIENT_SECRET',
    tokenUrl: 'https://auth.atlassian.com/oauth/token',
  },
}));

// Mock the global fetch (Node 18+ has it built-in; Jest runs in Node)
global.fetch = jest.fn();

// ── Import after mocks are set up ─────────────────────────────────────────────

const JiraToken = require('../models/JiraToken');
const JiraReauthRequiredError = require('../errors/JiraReauthRequiredError');
const { jiraRequest } = require('../services/jiraClient');

// ── Helpers ───────────────────────────────────────────────────────────────────

const SESSION_ID = 'session-abc-123';
const CLOUD_ID = 'cloud-xyz-456';
const FRESH_ACCESS_TOKEN = 'fresh-access-token';
const FRESH_REFRESH_TOKEN = 'fresh-refresh-token';
const NEW_ACCESS_TOKEN = 'new-access-token-after-refresh';
const NEW_REFRESH_TOKEN = 'new-refresh-token-after-refresh';

/** Build a fake token record that mimics a live Mongoose document */
function makeFakeToken({
  expired = false,
  hasRefreshToken = true,
  accessToken = FRESH_ACCESS_TOKEN,
  refreshToken = FRESH_REFRESH_TOKEN,
} = {}) {
  const expiresAt = expired
    ? new Date(Date.now() - 1000)         // already expired
    : new Date(Date.now() + 3_600_000);   // 1 hour from now

  const saveStub = jest.fn().mockResolvedValue(undefined);

  const record = {
    _id: 'token-doc-id-001',
    sessionId: SESSION_ID,
    cloudId: CLOUD_ID,
    accessToken,                           // Mongoose getter returns plaintext
    refreshToken: hasRefreshToken ? refreshToken : null,
    expiresAt,
    save: saveStub,
  };

  return record;
}

/** Make global.fetch return a successful JSON response */
function mockFetchOk(body) {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValueOnce(body),
  });
}

/** Make global.fetch return a failing JSON response */
function mockFetchError(status, body) {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: jest.fn().mockResolvedValueOnce(body),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Test 1: Valid non-expiring token passes through without refresh ────────────

describe('jiraRequest — valid token (not expiring)', () => {
  it('makes the Jira API call directly with the stored access token', async () => {
    const fakeToken = makeFakeToken({ expired: false });

    // Mongoose findOne returns the live token record
    JiraToken.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(fakeToken),
    });

    const apiResponseBody = { id: 'PROJ-1', summary: 'Test issue' };
    mockFetchOk(apiResponseBody);

    const result = await jiraRequest(SESSION_ID, 'GET', '/issue/PROJ-1');

    expect(result).toEqual(apiResponseBody);

    // Should have made exactly ONE fetch call (the API call — no refresh)
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [calledUrl, calledOptions] = global.fetch.mock.calls[0];
    expect(calledUrl).toBe(
      `https://api.atlassian.com/ex/jira/${CLOUD_ID}/rest/api/3/issue/PROJ-1`
    );
    expect(calledOptions.headers.Authorization).toBe(`Bearer ${FRESH_ACCESS_TOKEN}`);
    expect(calledOptions.method).toBe('GET');

    // token.save() should NOT have been called (no refresh happened)
    expect(fakeToken.save).not.toHaveBeenCalled();
  });
});

// ── Test 2: Expired token → refresh succeeds → API call made with new token ───

describe('jiraRequest — expired token, refresh succeeds', () => {
  it('refreshes the token, saves new values to MongoDB, then calls the Jira API', async () => {
    const fakeToken = makeFakeToken({ expired: true });

    JiraToken.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(fakeToken),
    });

    // First fetch: the token refresh POST to Atlassian
    mockFetchOk({
      access_token: NEW_ACCESS_TOKEN,
      refresh_token: NEW_REFRESH_TOKEN,
      expires_in: 3600,
    });

    // Second fetch: the actual Jira API call
    const apiResponseBody = { id: 'PROJ-2', summary: 'Another issue' };
    mockFetchOk(apiResponseBody);

    const result = await jiraRequest(SESSION_ID, 'GET', '/issue/PROJ-2');

    expect(result).toEqual(apiResponseBody);

    // Two fetches: 1 refresh + 1 API call
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // First call must be to the token endpoint
    const [refreshUrl, refreshOptions] = global.fetch.mock.calls[0];
    expect(refreshUrl).toBe('https://auth.atlassian.com/oauth/token');
    expect(JSON.parse(refreshOptions.body)).toMatchObject({
      grant_type: 'refresh_token',
      refresh_token: FRESH_REFRESH_TOKEN,
    });

    // Second call must be to the Jira API using the NEW access token
    const [apiUrl, apiOptions] = global.fetch.mock.calls[1];
    expect(apiUrl).toContain('/issue/PROJ-2');
    expect(apiOptions.headers.Authorization).toBe(`Bearer ${NEW_ACCESS_TOKEN}`);
  });

  it('persists both new access token and rotated refresh token to MongoDB', async () => {
    const fakeToken = makeFakeToken({ expired: true });

    JiraToken.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(fakeToken),
    });

    mockFetchOk({
      access_token: NEW_ACCESS_TOKEN,
      refresh_token: NEW_REFRESH_TOKEN,
      expires_in: 7200,
    });
    mockFetchOk({ id: 'PROJ-3' }); // API call response

    await jiraRequest(SESSION_ID, 'GET', '/issue/PROJ-3');

    // Mongoose setters (encrypt) are called transparently — we just verify the
    // plaintext values were assigned and save() was called once
    expect(fakeToken.accessToken).toBe(NEW_ACCESS_TOKEN);
    expect(fakeToken.refreshToken).toBe(NEW_REFRESH_TOKEN);
    expect(fakeToken.save).toHaveBeenCalledTimes(1);

    // expiresAt should be approximately 2 hours from now
    const expectedExpiry = Date.now() + 7200 * 1000;
    expect(fakeToken.expiresAt.getTime()).toBeGreaterThan(expectedExpiry - 5000);
    expect(fakeToken.expiresAt.getTime()).toBeLessThan(expectedExpiry + 5000);
  });
});

// ── Test 3: Refresh fails → JiraReauthRequiredError ───────────────────────────

describe('jiraRequest — refresh fails', () => {
  it('throws JiraReauthRequiredError when Atlassian rejects the refresh token', async () => {
    const fakeToken = makeFakeToken({ expired: true });

    JiraToken.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(fakeToken),
    });

    // Atlassian responds with invalid_grant
    mockFetchError(400, {
      error: 'invalid_grant',
      error_description: 'The provided authorization grant is invalid',
    });

    // The stale token record should be deleted
    JiraToken.findByIdAndDelete = jest.fn().mockResolvedValue(null);

    await expect(jiraRequest(SESSION_ID, 'GET', '/issue/PROJ-4')).rejects.toThrow(
      JiraReauthRequiredError
    );

    // Verify stale record was cleaned up
    expect(JiraToken.findByIdAndDelete).toHaveBeenCalledWith(fakeToken._id);

    // No Jira API call should have been attempted
    expect(global.fetch).toHaveBeenCalledTimes(1); // only the failed refresh
  });

  it('sets the correct name and sessionId on the thrown error', async () => {
    const fakeToken = makeFakeToken({ expired: true });

    JiraToken.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(fakeToken),
    });

    mockFetchError(400, { error: 'invalid_grant' });
    JiraToken.findByIdAndDelete = jest.fn().mockResolvedValue(null);

    let thrownError;
    try {
      await jiraRequest(SESSION_ID, 'GET', '/issue/PROJ-5');
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(JiraReauthRequiredError);
    expect(thrownError.name).toBe('JiraReauthRequiredError');
    expect(thrownError.sessionId).toBe(SESSION_ID);
  });
});

// ── Test 4: No token record at all ────────────────────────────────────────────

describe('jiraRequest — no token record', () => {
  it('throws JiraReauthRequiredError immediately when no JiraToken exists', async () => {
    JiraToken.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(null), // no record in DB
    });

    await expect(jiraRequest(SESSION_ID, 'GET', '/issue/PROJ-6')).rejects.toThrow(
      JiraReauthRequiredError
    );

    // No HTTP calls should be made at all
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
