require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { initSocketHandler } = require('./sockets/socketHandler');

const PORT = process.env.PORT || 5000;

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.io Server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

// Attach io instance to express app for controller access
app.set('io', io);

// Initialize WebSocket event listeners
initSocketHandler(io);

// Start Server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Project Management Server running on port ${PORT}`);
  console.log(`⚡ WebSocket Server initialized and ready for real-time sync`);
  console.log(`📡 Health Check: http://localhost:${PORT}/health`);
  console.log(`=======================================================`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server gracefully...');
  server.close(() => {
    console.log('HTTP and WebSocket server closed.');
    process.exit(0);
  });
});
