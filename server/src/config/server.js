'use strict';

const http = require('http');
const { Server } = require('socket.io');
const registerSocketEvents = require('../sockets/socketHandler');

/**
 * Create an HTTP server and Socket.io instance from an Express app.
 * Registers all socket event handlers via socketHandler.
 */
function createServer(app) {
  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  // Attach io to req so REST routes can emit events if needed
  app.use((req, _res, next) => {
    req.io = io;
    next();
  });

  // Register all socket event handlers
  registerSocketEvents(io);

  return { httpServer, io };
}

module.exports = createServer;
