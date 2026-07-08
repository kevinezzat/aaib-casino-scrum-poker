'use strict';

// ── Environment variables ─────────────────────────────────────────
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const morgan = require('morgan');
const https = require('https');
const fs = require('fs');
const path = require('path');

const connectDB = require('./config/db');
const createServer = require('./config/server');
const sessionRouter = require('./routes/sessions');
const jiraAuthRouter = require('./routes/jiraAuth');
const jiraRouter = require('./routes/jira');
const JiraReauthRequiredError = require('./errors/JiraReauthRequiredError');

// ── Express app ───────────────────────────────────────────────────
const app = express();

// ── Environment ───────────────────────────────────────────────────
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// ── Security middleware (Helmet) ──────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: NODE_ENV === 'production'
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://fonts.googleapis.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: [
              "'self'",
              CLIENT_ORIGIN,
              'https://api.atlassian.com',
              'https://auth.atlassian.com',
            ],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  })
);

// ── CORS ──────────────────────────────────────────────────────────
const CLIENT_ORIGIN_ENV = CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:3001';
const allowedOrigins = CLIENT_ORIGIN_ENV.split(',').map(o => o.trim().replace(/\/$/, ''));

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        console.log('[cors] allowedOrigins:', allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
// ── Rate limiting ─────────────────────────────────────────────────
// General API limiter: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// Jira write-back limiter: 10 requests per 15 minutes per IP
// Applied to mutation endpoints that call out to the Atlassian API on behalf of the user.
const jiraWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many Jira write requests, please try again later.' },
  skipFailedRequests: true, // don't penalise requests that failed validation
});
app.use('/api/jira/issues/:issueKey/story-points', jiraWriteLimiter);
app.use('/api/jira/issues/:issueKey/comment', jiraWriteLimiter);

// ── Cookie parser ─────────────────────────────────────────────────
app.use(cookieParser());

// ── Compression ───────────────────────────────────────────────────
app.use(compression());

// ── Logging (Morgan) ──────────────────────────────────────────────
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body parsers ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/sessions', sessionRouter);
app.use('/api/jira/auth', jiraAuthRouter);
app.use('/api/jira', jiraRouter);

// Health check
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', environment: NODE_ENV })
);

// ── 404 handler ───────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // ── Jira reauth required (refresh token expired/revoked) ─────────
  if (err instanceof JiraReauthRequiredError) {
    console.warn('[error] Jira reauth required for session:', err.sessionId, '-', err.message);
    return res.status(401).json({
      error: 'jira_reauth_required',
      message: 'Your Jira connection has expired. Please reconnect.',
      connectUrl: '/api/jira/auth/connect',
    });
  }

  console.error('[error]', err.stack || err.message);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({ error: message });
});

// ── Server (HTTP / HTTPS) ─────────────────────────────────────────
const { httpServer } = createServer(app);

// ── MongoDB connection ────────────────────────────────────────────
connectDB();

// ── HTTPS support (production) ────────────────────────────────────
if (
  NODE_ENV === 'production' &&
  process.env.SSL_KEY_PATH &&
  process.env.SSL_CERT_PATH
) {
  const sslOptions = {
    key: fs.readFileSync(path.resolve(process.env.SSL_KEY_PATH)),
    cert: fs.readFileSync(path.resolve(process.env.SSL_CERT_PATH)),
  };

  const httpsPort = process.env.HTTPS_PORT || 3443;
  const httpsServer = https.createServer(sslOptions, app);

  httpsServer.listen(httpsPort, () => {
    console.log(`[server] HTTPS listening on https://localhost:${httpsPort}`);
  });
}

// ── Start HTTP server ─────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT} [${NODE_ENV}]`);
});
