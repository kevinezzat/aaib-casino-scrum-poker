'use strict';

require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const sessionRouter = require('./routes/sessions');

// ── App & HTTP server ──────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Attach io to req so routes can emit events if needed
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// ── Middleware ─────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/sessions', sessionRouter);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Socket.io events (Phase 2 will expand this) ───────────────────
io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

// ── MongoDB connection ────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('[warn] MONGODB_URI not set — server will start but DB calls will fail.');
  console.warn('[warn] Copy server/.env.example → server/.env and fill in your Atlas URI.');
}

mongoose
  .connect(MONGODB_URI || '')
  .then(() => console.log('[mongo] connected to Atlas'))
  .catch((err) => console.error('[mongo] connection error:', err.message));

// ── Start ─────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
