/**
 * WebSocket event handler for real-time collaboration
 */
const initSocketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Join specific user room for direct notifications
    socket.on('register_user', ({ userId }) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`[WebSocket] User ${userId} joined personal room user_${userId}`);
      }
    });

    // Join project room for board real-time synchronization
    socket.on('join_project', ({ projectId, user }) => {
      if (projectId) {
        socket.join(`project_${projectId}`);
        console.log(`[WebSocket] Client ${socket.id} joined room project_${projectId}`);

        // Notify other room members that someone joined
        socket.to(`project_${projectId}`).emit('user_joined_project', {
          user,
          projectId,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Leave project room
    socket.on('leave_project', ({ projectId }) => {
      if (projectId) {
        socket.leave(`project_${projectId}`);
        console.log(`[WebSocket] Client ${socket.id} left room project_${projectId}`);
      }
    });

    // Disconnect event
    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });
};

/**
 * Emit event to all clients in a project room
 */
const emitProjectEvent = (io, projectId, event, data) => {
  if (io && projectId) {
    io.to(`project_${projectId}`).emit(event, data);
  }
};

/**
 * Emit event directly to a specific user
 */
const emitUserEvent = (io, userId, event, data) => {
  if (io && userId) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

module.exports = {
  initSocketHandler,
  emitProjectEvent,
  emitUserEvent,
};
