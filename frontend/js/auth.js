/**
 * Shared authentication helpers and navigation management
 */
const auth = {
  getToken() {
    return localStorage.getItem('pm_token');
  },

  getUser() {
    const userStr = localStorage.getItem('pm_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setAuth(user, token) {
    localStorage.setItem('pm_token', token);
    localStorage.setItem('pm_user', JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem('pm_token');
    localStorage.removeItem('pm_user');
    window.location.href = 'login.html';
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
    }
  },

  redirectIfAuth() {
    if (this.isAuthenticated()) {
      window.location.href = 'index.html';
    }
  },

  renderNavbar() {
    const container = document.getElementById('nav-user-container');
    if (!container) return;

    const user = this.getUser();

    if (user) {
      container.innerHTML = `
        <div class="live-indicator">
          <div class="live-dot"></div>
          <span>Live Sync</span>
        </div>
        <div class="user-profile-pill">
          <img src="${user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(user.name)}" class="user-avatar-sm" alt="${user.name}">
          <span>${escapeHTML(user.name)}</span>
        </div>
        <button id="logout-btn" class="btn btn-secondary btn-sm" onclick="auth.logout()">Sign Out</button>
      `;
    } else {
      container.innerHTML = `
        <a href="login.html" class="btn btn-outline btn-sm">Sign In</a>
        <a href="register.html" class="btn btn-sm">Get Started</a>
      `;
    }
  },
};

function escapeHTML(str) {
  if (!str) return '';
  const p = document.createElement('p');
  p.textContent = str;
  return p.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  auth.renderNavbar();
});
