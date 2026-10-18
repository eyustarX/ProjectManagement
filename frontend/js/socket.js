/**
 * Real-time WebSocket Client using Socket.io
 */
let socket = null;

const socketClient = {
  init(user) {
    if (typeof io === 'undefined') {
      console.warn('[Socket] Socket.io client script not loaded.');
      return;
    }

    if (!socket) {
      socket = io('http://localhost:5000');

      socket.on('connect', () => {
        console.log('[Socket] Connected to real-time server with ID:', socket.id);
        if (user && user.id) {
          socket.emit('register_user', { userId: user.id });
        }
      });

      // Handle direct notifications
      socket.on('notification:received', (notification) => {
        showToast(`🔔 ${notification.message}`);
      });

      socket.on('disconnect', () => {
        console.log('[Socket] Disconnected from real-time server.');
      });
    }

    return socket;
  },

  joinProject(projectId, user, handlers = {}) {
    if (!socket) this.init(user);
    if (!socket || !projectId) return;

    socket.emit('join_project', { projectId, user });

    // Attach project-specific handlers
    if (handlers.onTaskCreated) socket.on('task:created', handlers.onTaskCreated);
    if (handlers.onTaskUpdated) socket.on('task:updated', handlers.onTaskUpdated);
    if (handlers.onTaskMoved) socket.on('task:moved', handlers.onTaskMoved);
    if (handlers.onTaskDeleted) socket.on('task:deleted', handlers.onTaskDeleted);
    if (handlers.onCommentCreated) socket.on('comment:created', handlers.onCommentCreated);
    if (handlers.onCommentDeleted) socket.on('comment:deleted', handlers.onCommentDeleted);
    if (handlers.onMemberAdded) socket.on('member:added', handlers.onMemberAdded);
    if (handlers.onMemberRemoved) socket.on('member:removed', handlers.onMemberRemoved);
    if (handlers.onListCreated) socket.on('list:created', handlers.onListCreated);
    if (handlers.onListUpdated) socket.on('list:updated', handlers.onListUpdated);

    socket.on('user_joined_project', ({ user }) => {
      if (user && user.name) {
        showToast(`👋 ${user.name} joined the board`);
      }
    });
  },

  leaveProject(projectId) {
    if (socket && projectId) {
      socket.emit('leave_project', { projectId });
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:moved');
      socket.off('task:deleted');
      socket.off('comment:created');
      socket.off('comment:deleted');
      socket.off('member:added');
      socket.off('member:removed');
      socket.off('list:created');
      socket.off('list:updated');
      socket.off('user_joined_project');
    }
  },
};

/**
 * Global toast notification system
 */
function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
