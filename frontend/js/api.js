/**
 * API client wrapper for CodeAlpha Collaborative Project Management
 */
const API_BASE_URL = 'http://localhost:5000/api/v1';

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('pm_token');

    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // If unauthorized, clear auth and redirect to login if not already on login/register
        if (response.status === 401) {
          const isAuthPage = window.location.pathname.includes('login.html') ||
                             window.location.pathname.includes('register.html');
          if (!isAuthPage) {
            localStorage.removeItem('pm_token');
            localStorage.removeItem('pm_user');
            window.location.href = 'login.html';
          }
        }
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, error.message);
      throw error;
    }
  },

  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  },

  post(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });
  },

  put(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers,
    });
  },

  patch(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers,
    });
  },

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  },
};
