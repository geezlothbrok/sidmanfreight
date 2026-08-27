// Client-side session state.
//
// The JWT itself now lives in an HttpOnly cookie set by the backend at login
// (see backend/manager_api.php `login`), so JavaScript CANNOT read it —
// that's the point: an XSS payload can't steal the token. The browser attaches
// the cookie to every same-origin request automatically (authFetch just sets
// credentials: 'include').
//
// What we keep here is only the NON-secret identity (email/role/exp), so the UI
// can route and render the right dashboard without the token. Tampering with it
// gains nothing — every privileged action is still verified server-side against
// the signed cookie. `exp` mirrors the token's expiry so the client can bounce a
// stale session to /login on its own; the server is the real gate.

const USER_KEY = 'sidman_user';

// Persist the identity returned by the login endpoint: { email, role, exp }.
export function setSession(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Returns { email, role, exp } for the current session, or null if there is
// none or it has expired (expired identity is cleared so stale state can't
// linger and keep the UI looking logged-in).
export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    const user = JSON.parse(raw);
    if (user.exp && Date.now() / 1000 >= user.exp) {
      localStorage.removeItem(USER_KEY);
      return null;
    }
    return user;
  } catch (e) {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function isAuthenticated() {
  return getCurrentUser() !== null;
}

// Clears the local identity. The HttpOnly cookie is cleared separately by the
// backend `logout` action (JS can't touch it) — see serverLogout below.
export function clearSession() {
  localStorage.removeItem(USER_KEY);
}

// Full logout: ask the backend to expire the session cookie, then drop the
// local identity. Best-effort on the network call — we always clear locally.
export async function serverLogout(apiUrl) {
  try {
    await fetch(`${apiUrl}?action=logout`, { method: 'POST', credentials: 'include' });
  } catch (e) {
    // Ignore — clearing locally still logs the user out of the UI.
  }
  clearSession();
}

/**
 * A human display name for the profile menu. The portal only stores emails for
 * the fixed accounts, and showing the address twice (as both name and email)
 * reads as a bug — so derive a name from the local part.
 *   manager@sidmanfreightconsult.com -> "Manager"
 *   ama.mensah@example.com           -> "Ama Mensah"
 */
const FIXED_ACCOUNT_NAMES = {
  manager: 'Operations Manager',
  finance: 'Finance Officer',
};

export function displayNameFromEmail(email) {
  const local = String(email || '').split('@')[0];
  if (!local) return 'Signed in';
  // The two fixed accounts are named after their role, so deriving a name from
  // the address would print "Manager / Manager" in the profile trigger.
  if (FIXED_ACCOUNT_NAMES[local.toLowerCase()]) return FIXED_ACCOUNT_NAMES[local.toLowerCase()];
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Initials for the avatar, from the derived display name. */
export function initialsFromEmail(email) {
  const parts = displayNameFromEmail(email).split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
