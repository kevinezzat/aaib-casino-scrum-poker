'use strict';

/**
 * JiraReauthRequiredError
 *
 * Thrown by jiraClient.jiraRequest() when the stored refresh token has been
 * revoked or has expired and the user must re-authorise via OAuth.
 *
 * Caught by the global Express error handler which returns:
 *   HTTP 401 { error: 'jira_reauth_required', connectUrl: '/api/jira/auth/connect' }
 */
class JiraReauthRequiredError extends Error {
  constructor(sessionId, reason = 'Jira refresh token is no longer valid') {
    super(reason);
    this.name = 'JiraReauthRequiredError';
    this.sessionId = sessionId;
    // Ensures instanceof checks work across module boundaries
    Object.setPrototypeOf(this, JiraReauthRequiredError.prototype);
  }
}

module.exports = JiraReauthRequiredError;
