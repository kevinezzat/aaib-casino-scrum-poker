# Security Checklist — AAIB Infosec Review

> **Product**: AAIB Casino Scrum Poker  
> **Review target**: Jira Production Access  
> **Date**: 2026-07-08  
> **Status**: Ready for review

---

## 1. HTTP Security Headers (Helmet.js)

| Header | Status | Detail |
|---|---|---|
| `Content-Security-Policy` | ✅ | Production: explicit `defaultSrc 'self'`, `scriptSrc 'self'`, `frameSrc 'none'`, `objectSrc 'none'`. Dev: disabled for DX. |
| `X-Content-Type-Options` | ✅ | `nosniff` — Helmet default |
| `X-Frame-Options` | ✅ | `SAMEORIGIN` — Helmet default |
| `Strict-Transport-Security` | ✅ | `max-age=15552000` — Helmet default |
| `X-XSS-Protection` | ✅ | `0` (modern recommendation) — Helmet default |
| `Referrer-Policy` | ✅ | `no-referrer` — Helmet default |
| `Permissions-Policy` | ✅ | Helmet default |

**Evidence**: `server/src/app.js` lines 32–56

---

## 2. Rate Limiting

| Limiter | Applies to | Limit | Status |
|---|---|---|---|
| General API limiter | All `/api/*` routes | 100 req / 15 min / IP | ✅ |
| Jira write limiter | `PUT /api/jira/issues/*/story-points` and `POST /api/jira/issues/*/comment` | 10 req / 15 min / IP | ✅ |
| Socket place-chip limiter | `place-chip` socket event per socket connection | 15 events / min / socket | ✅ |

**Evidence**: `server/src/app.js` lines 57–80; `server/src/sockets/socketHandler.js` lines 60–89

---

## 3. Input Validation — Server (express-validator)

All REST API routes have `express-validator` chains. A `validate` middleware returns `400 { errors: [...] }` before any controller logic runs.

| Route | Validated fields |
|---|---|
| `POST /api/sessions` | `name` (string, 1–120 chars), `deckType` (enum) |
| `GET /api/sessions/:code` | `code` (6-char alphanumeric) |
| `PATCH /api/sessions/:id/status` | `id` (MongoId), `status` (enum), `hostId` (string) |
| `POST /api/sessions/:id/stories` | `id` (MongoId), `stories[]` (summary max 500, storyPoints numeric) |
| `GET /api/jira/issues` | `roomCode` (6-char alphanumeric), `jql` (max 2000 chars), `maxResults` (1–100) |
| `GET /api/jira/issues/:issueKey` | `issueKey` (`PROJECT-NNN` regex) |
| `PUT /api/jira/issues/:issueKey/story-points` | `issueKey` (regex), `storyPoints` (null/number/?/coffee), `customFieldId` (format regex) |
| `POST /api/jira/issues/:issueKey/comment` | `issueKey` (regex), `comment` (max 5000 chars) |
| `GET /api/jira/projects` | `roomCode` (6-char alphanumeric) |
| `GET /api/jira/boards` | `roomCode` (6-char), `projectKeyOrId` (max 50 chars) |
| `GET /api/jira/boards/:boardId/sprints` | `boardId` (positive integer), `roomCode` (6-char) |

**Evidence**: `server/src/routes/sessions.js`, `server/src/routes/jira.js`, `server/src/middleware/validate.js`

---

## 4. Input Sanitisation — Server (isomorphic-dompurify)

All user-supplied text stored in MongoDB is sanitised using DOMPurify (via `isomorphic-dompurify` + `jsdom`) before persistence.

| Field | Sanitiser | Location |
|---|---|---|
| Session `name` | `sanitizeText(name, 120)` | `sessionController.createSession` |
| Story `summary` | `sanitizeText(summary, 500)` | `sessionController.addStories` |
| Story `externalId` | `sanitizeText(externalId, 100)` | `sessionController.addStories` |
| Jira comment body | `sanitizeText(comment, 5000)` | `jiraController.postComment` |
| Socket `playerName` | `sanitizeName(playerName)` | `socketHandler join-session` |

`sanitizeName()` applies three layers:
1. DOMPurify strip (no allowed HTML tags)
2. Control character regex removal (`/[\x00-\x1F\x7F]/g`)
3. Max 40 character enforcement

**Evidence**: `server/src/utils/sanitize.js`, `server/src/controllers/sessionController.js`, `server/src/controllers/jiraController.js`, `server/src/sockets/socketHandler.js`

---

## 5. Input Sanitisation — Client (DOMPurify)

All text from external sources (Jira API responses, socket broadcasts) is sanitised using DOMPurify in the browser before rendering.

| Component | Fields sanitised |
|---|---|
| `JiraIssueList` | `issue.key`, `issue.summary`, `issue.type`, `issue.description`, `issue.acceptanceCriteria` |
| `IssueSidebar` | `issue.summary`, `issue.description`, `issue.acceptanceCriteria`, `issue.externalId/key`, `story.summary`, `story.externalId/key` |

> **Note**: React's default JSX rendering does not use `dangerouslySetInnerHTML`, so XSS via stored data is low risk. DOMPurify is applied as defence-in-depth and to future-proof against richer text rendering.

**Evidence**: `client/src/utils/sanitize.js`, `client/src/components/JiraIssueList.jsx`, `client/src/components/sidebar/IssueSidebar.jsx`

---

## 6. Jira Token Protection

| Control | Status | Detail |
|---|---|---|
| Tokens encrypted at rest | ✅ | AES-256-GCM via Mongoose getters/setters. Raw tokens never written to MongoDB in plaintext. |
| Access token never sent to frontend | ✅ | `accessToken` and `refreshToken` are server-side only. No controller serialises them to API responses. |
| Token TTL enforced | ✅ | MongoDB TTL index on `expiresAt`. 60-second pre-expiry buffer triggers auto-refresh. |
| Refresh token rotation | ✅ | Atlassian rotates refresh tokens on each use. New token pair saved on every refresh. |
| Stale token cleanup | ✅ | On refresh failure, the stale `JiraToken` record is deleted. Client receives `401 jira_reauth_required`. |
| `hostToken` excluded from public API | ✅ | `GET /api/sessions/:code` uses `.select('-hostToken -hostTokenExpiresAt')` |
| `hostToken` TTL | ✅ | 1-hour expiry enforced in the socket `join-session` handler |
| `hostToken` entropy | ✅ | 32 random bytes = 256 bits of entropy |

**Evidence**: `server/src/models/JiraToken.js`, `server/src/services/jiraClient.js`, `server/src/controllers/sessionController.js`, `server/src/sockets/socketHandler.js`

---

## 7. Socket Event Validation

All 7 socket events are validated before any database operation is performed.

| Event | Validation |
|---|---|
| `join-session` | `roomCode` (string, max 6), `playerName` (string, max 40 + DOMPurify), `hostToken` (max 128), `role` (enum) |
| `place-chip` | `sessionId` (MongoId), `value` (enum: all deck values + `?` + `coffee`) — rate limited 15/min |
| `reveal-chips` | `sessionId` (MongoId) |
| `lock-estimation` | `sessionId` (MongoId), `storyId` (MongoId), `finalValue` (enum), `nextStoryId` (MongoId, optional) |
| `new-round` | `sessionId` (MongoId) |
| `select-issue` | `sessionId` (MongoId), `storyId` (MongoId) |
| `end-session` | `sessionId` (MongoId) |

Host-only events additionally verify `socket.data.participantId === session.hostId` before executing.

**Evidence**: `server/src/sockets/socketHandler.js` — `validateSocketPayload()` helper

---

## 8. CORS Configuration

| Control | Status |
|---|---|
| Explicit origin allowlist | ✅ — no wildcards in production |
| Credentials mode | ✅ — `credentials: true` with explicit origins only |
| Socket.IO CORS | ✅ — same allowlist applied to the Socket.IO server |

**Evidence**: `server/src/app.js`, `server/src/config/server.js`

---

## 9. Transport Security

| Control | Status |
|---|---|
| HTTPS support | ✅ — conditional HTTPS server reads `SSL_KEY_PATH` / `SSL_CERT_PATH` from env |
| HSTS header | ✅ — Helmet sets `Strict-Transport-Security: max-age=15552000` |
| HTTP → HTTPS upgrade | Managed by reverse proxy (Nginx/Caddy) — outside application scope |

---

## 10. Pre-Review Checklist (Environment)

- [ ] `ENCRYPTION_KEY` is set in secrets manager — NOT committed to git
- [ ] `CLIENT_ORIGIN` env var is set to the production frontend URL only (no wildcards)
- [ ] SSL certificates are valid and auto-renewing before expiry
- [ ] MongoDB connection string uses TLS (`tls=true`)
- [ ] `NODE_ENV=production` is set in the deployment environment
- [ ] `.env` is in `.gitignore` ✅ (confirmed present)
- [ ] `xlsx` dependency vulnerability is tracked (no upstream fix available — consider migrating CSV import to `exceljs`)
- [ ] Morgan `combined` log format reviewed to confirm no sensitive query params are captured in production
- [ ] Jira OAuth app in Atlassian dev console has minimum required scopes only

---

## Open Items / Deferred

| Item | Decision |
|---|---|
| Multi-site Jira tenant selection | Deferred — auto-selects first site; log warning present |
| `hostToken` via `httpOnly` cookie (Option A) | Deferred — Option B (TTL-in-body) selected for this iteration. Revisit before multi-host support. |

---

*Maintained by the development team. Last updated: 2026-07-08.*
