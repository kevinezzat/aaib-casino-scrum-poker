'use strict';

/**
 * jiraController.js — Jira API feature controllers.
 *
 * All four controllers follow the same pattern:
 *   1. Resolve roomCode → Session._id (the sessionId stored in JiraToken)
 *   2. Call jiraRequest(sessionId, ...) — handles token lookup, refresh, encryption
 *   3. Catch JiraReauthRequiredError → 401 { error: 'jira_reauth_required' }
 *   4. Return the shaped response to the client
 *
 * Write-back identity decision (flagged for host confirmation):
 *   Story-point write-backs and audit comments are performed on behalf of the
 *   session HOST — specifically whoever ran the OAuth connect flow for this room
 *   (their access token is stored in JiraToken for this sessionId).
 *   This means Jira will attribute the change to the host's user account, NOT a
 *   service account. If you want a neutral service account instead, you would need
 *   a separate non-3LO credential. Confirm this is acceptable before shipping.
 *
 * Endpoints (all mounted under /api/jira):
 *   GET  /issues                        — Sprint / JQL backlog import
 *   GET  /issues/:issueKey              — Issue detail (sidebar population)
 *   PUT  /issues/:issueKey/story-points — Story-point write-back
 *   POST /issues/:issueKey/comment      — Audit comment post
 */

const Session = require('../models/Session');
const { jiraRequest } = require('../services/jiraClient');
const JiraReauthRequiredError = require('../errors/JiraReauthRequiredError');

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Resolve a roomCode query/param to the internal MongoDB Session._id.
 * Returns null if the session doesn't exist (caller decides how to respond).
 */
async function resolveSessionId(roomCode) {
  if (!roomCode) return null;
  const session = await Session.findOne({ roomCode: roomCode.toUpperCase() })
    .select('_id')
    .lean();
  return session ? session._id.toString() : null;
}

/**
 * Wrap a controller body so that JiraReauthRequiredError is always caught and
 * converted to a consistent 401, rather than falling through to the 500 handler.
 * Other errors are re-thrown so the global handler can catch them.
 */
function withJiraErrorHandling(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      if (err instanceof JiraReauthRequiredError) {
        return res.status(401).json({
          error: 'jira_reauth_required',
          message: 'Your Jira connection has expired. Please reconnect.',
          connectUrl: '/api/jira/auth/connect',
        });
      }
      next(err); // pass non-Jira errors to global Express error handler
    }
  };
}

// ── 1. Sprint / JQL Backlog Import ───────────────────────────────────────────

/**
 * GET /api/jira/issues?roomCode=XXXXXX&jql=...&maxResults=50&startAt=0
 *
 * Runs a JQL search and returns a shaped list of issues for backlog import.
 * If no `jql` is provided, defaults to unresolved issues in the board order.
 *
 * Response: { issues: [{ key, summary, description, storyPoints, status, type }], total, startAt }
 *
 * @decision Write-back identity: N/A for reads — uses host's read:jira-work token.
 */
const getBacklog = withJiraErrorHandling(async (req, res) => {
  const { roomCode, jql, maxResults = 50, nextPageToken } = req.query;

  if (!roomCode) {
    return res.status(400).json({ error: 'roomCode query parameter is required' });
  }

  const sessionId = await resolveSessionId(roomCode);
  if (!sessionId) {
    return res.status(404).json({ error: `No session found for room code: ${roomCode}` });
  }

  // Default JQL: all unresolved issues, ordered as they appear in the board
  const effectiveJql = jql || 'resolution = Unresolved ORDER BY created DESC';

  const reqBody = {
    jql: effectiveJql,
    maxResults: Number(maxResults),
    fields: ['summary', 'description', 'status', 'issuetype', 'customfield_10016', 'customfield_10028', 'priority', 'assignee', 'key']
  };

  if (nextPageToken) {
    reqBody.nextPageToken = nextPageToken;
  }

  const data = await jiraRequest(sessionId, 'POST', '/search/jql', {
    body: reqBody
  });

  // Fetch approximate count
  const countData = await jiraRequest(sessionId, 'POST', '/search/approximate-count', {
    body: {
      jql: effectiveJql
    }
  }).catch(() => ({ count: 0 }));

  // Shape the response — normalise the two common story-point custom fields
  const issues = (data.issues || []).map(shapeIssue);

  return res.json({
    issues,
    nextPageToken: data.nextPageToken ?? null,
    approximateTotal: countData.count ?? 0,
    maxResults: data.maxResults ?? issues.length,
  });
});

// ── 2. Issue Detail Fetch ─────────────────────────────────────────────────────

/**
 * GET /api/jira/issues/:issueKey?roomCode=XXXXXX
 *
 * Fetches a single issue's details for populating the estimation sidebar.
 * Returns title, description, acceptance criteria, story points, and status.
 *
 * Response: { key, summary, description, acceptanceCriteria, storyPoints, status, type, url }
 */
const getIssueDetail = withJiraErrorHandling(async (req, res) => {
  const { issueKey } = req.params;
  const { roomCode } = req.query;

  if (!roomCode) {
    return res.status(400).json({ error: 'roomCode query parameter is required' });
  }
  if (!issueKey) {
    return res.status(400).json({ error: 'issueKey is required' });
  }

  const sessionId = await resolveSessionId(roomCode);
  if (!sessionId) {
    return res.status(404).json({ error: `No session found for room code: ${roomCode}` });
  }

  const data = await jiraRequest(sessionId, 'GET',
    `/issue/${issueKey}?fields=summary,description,comment,status,issuetype,customfield_10016,customfield_10028`
  );

  return res.json(shapeIssueDetail(data));
});

// ── 3. Story-Point Write-Back ─────────────────────────────────────────────────

/**
 * PUT /api/jira/issues/:issueKey/story-points
 *
 * Body: { roomCode: string, storyPoints: number|null, customFieldId?: string }
 *
 * Writes the team's agreed estimate back to the Jira issue's story-points field.
 *
 * @decision Write-back identity:
 *   This PUT is performed as the session host (whoever ran /api/jira/auth/connect
 *   for this room). The change will appear in Jira's history attributed to the
 *   host's Jira user account. If a neutral service account is preferred, a
 *   non-3LO credential would be needed. Awaiting host confirmation.
 *
 * customFieldId defaults to 'customfield_10016' (the standard story-points field
 * on most Jira Cloud instances). Override with the customFieldId body param if
 * your board uses a different field.
 *
 * Response: 204 No Content on success
 */
const writeStoryPoints = withJiraErrorHandling(async (req, res) => {
  const { issueKey } = req.params;
  const { roomCode, storyPoints, customFieldId = 'customfield_10016' } = req.body;

  if (!roomCode) {
    return res.status(400).json({ error: 'roomCode is required in the request body' });
  }
  if (storyPoints === undefined || storyPoints === null) {
    return res.status(400).json({ error: 'storyPoints is required in the request body' });
  }
  if (!issueKey) {
    return res.status(400).json({ error: 'issueKey URL parameter is required' });
  }

  const sessionId = await resolveSessionId(roomCode);
  if (!sessionId) {
    return res.status(404).json({ error: `No session found for room code: ${roomCode}` });
  }

  // Jira expects null to clear, or a number for the field value
  const fieldValue = storyPoints === '?' || storyPoints === 'coffee'
    ? null
    : Number(storyPoints);

  await jiraRequest(sessionId, 'PUT', `/issue/${issueKey}`, {
    body: {
      fields: {
        [customFieldId]: fieldValue,
      },
    }
  });

  // Jira's PUT /issue returns 204 with no body on success
  return res.status(204).send();
});

// ── 4. Audit Comment Post ─────────────────────────────────────────────────────

/**
 * POST /api/jira/issues/:issueKey/comment
 *
 * Body: { roomCode: string, comment: string }
 *
 * Posts an audit/summary comment to the Jira issue. Useful for leaving a
 * record of the team's vote result (e.g. "Team estimated: 5 points").
 *
 * @decision Write-back identity: same as story-point write-back — posted as the host.
 *
 * Response: { id, body, created, author }
 */
const postComment = withJiraErrorHandling(async (req, res) => {
  const { issueKey } = req.params;
  const { roomCode, comment } = req.body;

  if (!roomCode) {
    return res.status(400).json({ error: 'roomCode is required in the request body' });
  }
  if (!comment || typeof comment !== 'string' || !comment.trim()) {
    return res.status(400).json({ error: 'comment is required and must be a non-empty string' });
  }
  if (!issueKey) {
    return res.status(400).json({ error: 'issueKey URL parameter is required' });
  }

  const sessionId = await resolveSessionId(roomCode);
  if (!sessionId) {
    return res.status(404).json({ error: `No session found for room code: ${roomCode}` });
  }

  // Jira Cloud REST API v3 uses the Atlassian Document Format (ADF) for comment bodies
  const adfComment = buildAdfComment(comment.trim());

  const data = await jiraRequest(sessionId, 'POST', `/issue/${issueKey}/comment`, {
    body: {
      body: adfComment,
    }
  });

  return res.status(201).json({
    id: data.id,
    created: data.created,
    author: data.author?.displayName ?? 'Unknown',
    body: comment.trim(),
  });
});

// ── Shape helpers ─────────────────────────────────────────────────────────────

/**
 * Normalise a raw Jira issue object from the search endpoint.
 * Handles the two most common story-point custom field IDs.
 */
function shapeIssue(raw) {
  const f = raw.fields || {};
  return {
    key: raw.key,
    summary: f.summary ?? '',
    status: f.status?.name ?? 'Unknown',
    type: f.issuetype?.name ?? 'Story',
    // customfield_10016 = story points (next-gen), customfield_10028 = story points (classic)
    storyPoints: f.customfield_10016 ?? f.customfield_10028 ?? null,
  };
}

/**
 * Normalise a raw Jira issue object from the single-issue endpoint.
 * Includes description and acceptance criteria extraction.
 */
function shapeIssueDetail(raw) {
  const f = raw.fields || {};
  return {
    key: raw.key,
    summary: f.summary ?? '',
    description: extractAdfText(f.description),
    // Acceptance criteria are often stored in a custom field or as the first
    // comment labelled "Acceptance Criteria" — we extract the raw ADF for now
    // and let the frontend render it. A custom field approach can be added later.
    acceptanceCriteria: null, // TODO: map to your team's custom field if applicable
    storyPoints: f.customfield_10016 ?? f.customfield_10028 ?? null,
    status: f.status?.name ?? 'Unknown',
    type: f.issuetype?.name ?? 'Story',
    url: `https://your-domain.atlassian.net/browse/${raw.key}`, // updated by jiraRequest cloudId in Phase 2
  };
}

/**
 * Flatten Atlassian Document Format (ADF) to a plain text string for display.
 * Only handles the common paragraph + text node structure.
 */
function extractAdfText(adf) {
  if (!adf || !adf.content) return '';
  return adf.content
    .flatMap((block) => block.content || [])
    .filter((node) => node.type === 'text')
    .map((node) => node.text)
    .join(' ')
    .trim();
}

/**
 * Wrap a plain-text string in the minimal ADF structure required by Jira's
 * comment API (Jira Cloud REST v3 does not accept raw strings).
 */
function buildAdfComment(text) {
  return {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  };
}

// (End of original file)
// ── 5. Project, Board, and Sprint Fetching ────────────────────────────────────

/**
 * GET /api/jira/projects?roomCode=XXXXXX
 * Fetches all projects the user has access to.
 */
const getProjects = withJiraErrorHandling(async (req, res) => {
  const { roomCode } = req.query;
  const sessionId = await resolveSessionId(roomCode);
  if (!sessionId) {
    return res.status(404).json({ error: `No session found for room code: ${roomCode}` });
  }

  const data = await jiraRequest(sessionId, 'GET', '/project');
  
  const projects = data.map(p => ({
    id: p.id,
    key: p.key,
    name: p.name,
    avatarUrls: p.avatarUrls,
  }));

  return res.json(projects);
});

/**
 * GET /api/jira/boards?roomCode=XXXXXX&projectKeyOrId=...
 * Fetches agile boards, optionally filtered by project.
 */
const getBoards = withJiraErrorHandling(async (req, res) => {
  const { roomCode, projectKeyOrId } = req.query;
  const sessionId = await resolveSessionId(roomCode);
  if (!sessionId) {
    return res.status(404).json({ error: `No session found for room code: ${roomCode}` });
  }

  let path = '/board?type=scrum'; // Default to scrum boards
  if (projectKeyOrId) {
    path += `&projectKeyOrId=${encodeURIComponent(projectKeyOrId)}`;
  }

  const data = await jiraRequest(sessionId, 'GET', path, { apiPrefix: '/rest/agile/1.0' });
  
  const boards = (data.values || []).map(b => ({
    id: b.id,
    name: b.name,
    type: b.type,
  }));

  return res.json(boards);
});

/**
 * GET /api/jira/boards/:boardId/sprints?roomCode=XXXXXX
 * Fetches active and future sprints for a given board.
 */
const getSprints = withJiraErrorHandling(async (req, res) => {
  const { boardId } = req.params;
  const { roomCode } = req.query;
  const sessionId = await resolveSessionId(roomCode);
  if (!sessionId) {
    return res.status(404).json({ error: `No session found for room code: ${roomCode}` });
  }

  const data = await jiraRequest(sessionId, 'GET', `/board/${boardId}/sprint?state=active,future`, { apiPrefix: '/rest/agile/1.0' });
  
  const sprints = (data.values || []).map(s => ({
    id: s.id,
    name: s.name,
    state: s.state,
    startDate: s.startDate,
    endDate: s.endDate,
  }));

  return res.json(sprints);
});

module.exports = { getBacklog, getIssueDetail, writeStoryPoints, postComment, getProjects, getBoards, getSprints };
