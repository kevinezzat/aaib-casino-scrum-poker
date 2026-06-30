# Jira OAuth 2.0 (3LO) Setup Guide

This document describes the manual steps required to create a Jira OAuth 2.0 integration on the Atlassian developer console and connect it to this application. The code scaffolding is already in place — you just need to register the app and fill in the credentials.

---

## Prerequisites

- An Atlassian account with access to the Jira Cloud site you want to integrate with.
- The backend server running and reachable at a public URL (required for the redirect URI in production — for local dev, `localhost` works).

---

## Step 1 — Create the OAuth 2.0 App on Atlassian

1. Go to [https://developer.atlassian.com/console/myapps/](https://developer.atlassian.com/console/myapps/) and log in.
2. Click **Create** → **OAuth 2.0 integration**.
3. Give the app a name (e.g. `AAIB Scrum Poker`) and accept the Developer Terms.
4. Click **Create**.

---

## Step 2 — Configure the Redirect URI

1. In your new app's dashboard, go to **Authorization** in the left sidebar.
2. Find the **OAuth 2.0 (3LO)** section and click **Add**.
3. Set the **Callback URL** to your redirect URI:
   - **Local development:** `http://localhost:3001/api/auth/jira/callback`
   - **Production (Railway):** `https://aaib-casino-scrum-poker-production.up.railway.app/api/auth/jira/callback`

> [!IMPORTANT]
> This URI must **exactly** match the value you set in `JIRA_OAUTH_REDIRECT_URI`. Even a trailing slash difference will cause authentication to fail.

---

## Step 3 — Enable the Required Scopes

1. Go to **Permissions** in the left sidebar.
2. Find the **Jira API** section and click **Add** (or **Edit** if already added).
3. Under **Classic scopes**, enable the following four scopes:

| Scope | Purpose |
|---|---|
| `read:jira-work` | Read issues, sprints, and boards |
| `write:jira-work` | Update story points / issue fields |
| `offline_access` | Receive a refresh token (so users don't re-auth constantly) |
| `read:jira-user` | Read user profile (avatar, display name) |

4. Click **Save** after enabling all four.

---

## Step 4 — Copy the Client Credentials

1. Go to **Settings** in the left sidebar.
2. Copy the **Client ID** and **Client secret**.
3. Paste them into your environment:

**For local development (`server/.env`):**
```env
JIRA_OAUTH_CLIENT_ID=your-client-id-here
JIRA_OAUTH_CLIENT_SECRET=your-client-secret-here
JIRA_OAUTH_REDIRECT_URI=http://localhost:3001/api/auth/jira/callback
JIRA_OAUTH_SCOPES=read:jira-work write:jira-work offline_access read:jira-user
```

**For production (Railway dashboard -> Variables):**
```
JIRA_OAUTH_CLIENT_ID        = your-client-id-here
JIRA_OAUTH_CLIENT_SECRET    = your-client-secret-here
JIRA_OAUTH_REDIRECT_URI     = https://aaib-casino-scrum-poker-production.up.railway.app/api/auth/jira/callback
JIRA_OAUTH_SCOPES           = read:jira-work write:jira-work offline_access read:jira-user
```

---

## Step 5 — Generate the Encryption Key

Jira tokens are encrypted at rest in MongoDB. You need to generate a 32-byte (64-char hex) secret key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output as `ENCRYPTION_KEY` in both your `.env` and Railway variables.

> [!CAUTION]
> Keep this key secret and never commit it to git. If you rotate this key, all existing stored tokens will become undecryptable and users will need to re-authenticate.

---

## What's Already Done (Code Scaffolding)

| File | Purpose |
|---|---|
| `server/src/config/jiraOAuth.js` | Static OAuth config object + startup validator |
| `server/src/utils/encryption.js` | AES-256-GCM encrypt/decrypt helpers |
| `server/src/models/JiraToken.js` | Mongoose model with tokens encrypted via getters/setters |

## What's Next (Not Yet Done)

- `GET /api/auth/jira` — Route that redirects the user to Atlassian's authorization URL
- `GET /api/auth/jira/callback` — Route that exchanges the code for tokens and stores them
- Token refresh logic — middleware that checks `isExpired()` and refreshes before Jira API calls
- Jira API client — wrapper around the Jira REST API using stored tokens
