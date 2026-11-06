// auth.js — Login logic: email -> password -> 6-digit code (2-step verification).
// DEMO ONLY: passwords are stored in plain text in data.js and the code is shown on screen.

const SESSION_KEY = 'campusconnect_session_v1';

function freshLogin() {
  return { step: 'email', email: '', issued: null, pendingUserId: null, error: '', info: '' };
}

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email.trim());
}

function findUserByEmail(email) {
  const wanted = email.trim().toLowerCase();
  return USERS.find(user => user.email === wanted) || null;
}

// Returns the user when email + password match, otherwise null.
function checkCredentials(email, password) {
  const user = findUserByEmail(email);
  return user && user.password === password ? user : null;
}

function issueCode() {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  return { code, expiresAt: Date.now() + CODE_MINUTES * 60 * 1000 };
}

// Returns 'ok', 'invalid' (not 6 digits), 'expired' or 'wrong'.
function checkVerificationCode(entered, issued) {
  if (!/^\d{6}$/.test(entered)) return 'invalid';
  if (!issued || Date.now() > issued.expiresAt) return 'expired';
  return entered === issued.code ? 'ok' : 'wrong';
}

// "Signed in" is remembered per browser tab (sessionStorage) until the tab closes.
function saveSession(userId) {
  try {
    sessionStorage.setItem(SESSION_KEY, userId);
  } catch (error) {
    // Ignore: the user simply has to sign in again after a reload.
  }
}

function loadSessionUser() {
  try {
    return findUser(sessionStorage.getItem(SESSION_KEY));
  } catch (error) {
    return null;
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (error) {
    // Nothing to clear.
  }
}
