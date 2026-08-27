// Wraps fetch() so every call to the staff API carries the session. The JWT
// lives in an HttpOnly cookie the browser sends automatically — we just need
// credentials: 'include' so it's attached (and so any Set-Cookie is stored).
// The PHP backend reads that cookie (see backend/auth_guard.php).
export async function authFetch(url, options = {}) {
  return fetch(url, { ...options, credentials: 'include' });
}
