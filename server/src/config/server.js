'use strict';

const http = require('http');
const { Server } = require('socket.io');

/**
 * Create an HTTP server and Socket.io instance from an Express app.
 */
function createServer(app) {
  const httpServer = http.createServer(app);

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

  // ── Socket.io events (Phase 2 will expand this) ───────────────────
  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`);
    });
  });

  return { httpServer, io };
}

module.exports = createServer;
