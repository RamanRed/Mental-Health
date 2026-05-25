// ============================================
// MANAS Auth Helper Functions
// ============================================

const TOKEN_KEY = 'manas_token';
const USER_KEY = 'manas_user';

// Token Management
export function saveToken(token) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// User Management
export function saveUser(user) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getUser() {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(USER_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function removeUser() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_KEY);
  }
}

// Auth State
export function isAuthenticated() {
  return !!getToken();
}

export function getUserRole() {
  const user = getUser();
  return user?.role || null;
}

// Logout
export function logout() {
  removeToken();
  removeUser();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
