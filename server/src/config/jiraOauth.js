'use strict';

/**
 * jiraOAuth.js — Static configuration for the Jira OAuth 2.0 (3LO) integration.
 *
 * All values are pulled from environment variables — nothing is hardcoded here.
 * Set these in your .env file (development) or in the Railway dashboard (production).
 *
 * Required env vars:
 *   JIRA_OAUTH_CLIENT_ID       — From the Atlassian developer console
 *   JIRA_OAUTH_CLIENT_SECRET   — From the Atlassian developer console
 *   JIRA_OAUTH_REDIRECT_URI    — Must exactly match the URI registered in Atlassian
 *   JIRA_OAUTH_SCOPES          — Space-separated list of scopes (or use the default below)
 */

// Default scopes needed for reading/writing Jira issues and reading user profiles.
const DEFAULT_SCOPES = [
  'read:jira-work',
  'write:jira-work',
  'offline_access',
  'read:jira-user',
  'read:board-scope:jira-software',
  'read:sprint:jira-software',
].join(' ');

const jiraOAuthConfig = {
  clientId: process.env.JIRA_OAUTH_CLIENT_ID,
  clientSecret: process.env.JIRA_OAUTH_CLIENT_SECRET,
  redirectUri: process.env.JIRA_OAUTH_REDIRECT_URI,
  scopes: process.env.JIRA_OAUTH_SCOPES || DEFAULT_SCOPES,

  // Atlassian OAuth 2.0 endpoints (stable, no need to configure these)
  authorizationUrl: 'https://auth.atlassian.com/authorize',
  tokenUrl: 'https://auth.atlassian.com/oauth/token',
  accessibleResourcesUrl: 'https://api.atlassian.com/oauth/token/accessible-resources',
};

/**
 * Validate that required config values are present at startup.
 * Call this during your OAuth route registration if you want to fail-fast
 * instead of getting cryptic errors at runtime.
 *
 * @throws {Error} if any required config value is missing
 */
function validateJiraOAuthConfig() {
  const keyToEnvVar = {
    clientId: 'JIRA_OAUTH_CLIENT_ID',
    clientSecret: 'JIRA_OAUTH_CLIENT_SECRET',
    redirectUri: 'JIRA_OAUTH_REDIRECT_URI',
  };
  const required = Object.keys(keyToEnvVar);
  const missing = required.filter((key) => !jiraOAuthConfig[key]);

  if (missing.length > 0) {
    throw new Error(
      `[jiraOAuth] Missing required environment variables: ${missing
        .map((k) => keyToEnvVar[k])
        .join(', ')}`
    );
  }
}

module.exports = { jiraOAuthConfig, validateJiraOAuthConfig };
