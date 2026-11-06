// views-auth.js — login screens: email -> password -> 6-digit code.

const CODE_MESSAGES = {
  invalid: 'Enter the 6-digit code.',
  wrong: 'That code is not correct. Try again.',
  expired: 'That code has expired. Request a new one.',
};

function showLogin(step, error = '', info = '') {
  ui.login.step = step;
  ui.login.error = error;
  ui.login.info = info;
  render(true);
}

function errorBlock(message) {
  return message ? noticeBox(message, 'error') : '';
}

function demoAccounts() {
  const buttons = USERS.map(user => {
    const role = isStaff(user) ? user.title : 'Student' + (user.enrolled ? '' : ' (not enrolled)');
    return button(`${esc(fullName(user))} — ${esc(role)}`, 'fill-demo', { email: user.email }, 'btn btn-small btn-secondary');
  }).join('');
  return `<details class="demo" open><summary>Demo accounts (class project)</summary>
    <p class="muted small">Password for every demo account: <strong>${DEMO_PASSWORD}</strong></p>${buttons}</details>`;
}

function emailStep() {
  return `<h1>Sign in</h1><p class="muted">Use your campus email.</p>
    <form data-submit="login-email" novalidate>
      <label for="email">Campus email</label>
      <input id="email" name="email" type="email" autocomplete="username" placeholder="name@campus.edu" value="${esc(ui.login.email)}">
      ${errorBlock(ui.login.error)}
      <button type="submit" class="btn btn-primary">Continue</button>
    </form>${demoAccounts()}`;
}

function passwordStep() {
  return `<h1>Enter your password</h1>
    <p class="muted">Signing in as <strong>${esc(ui.login.email)}</strong></p>
    <form data-submit="login-password" novalidate>
      <label for="password">Password</label>
      <div class="input-row">
        <input id="password" name="password" type="password" autocomplete="current-password">
        <button type="button" class="btn btn-small btn-secondary" data-action="toggle-password" aria-controls="password">Show</button>
      </div>
      ${errorBlock(ui.login.error)}
      <button type="submit" class="btn btn-primary">Continue</button>
    </form>`;
}

function codeStep() {
  return `<h1>Verify it's you</h1>
    <p class="muted">Enter the 6-digit code we sent you. It works for ${CODE_MINUTES} minutes.</p>
    ${noticeBox('Demo mode: no real email is sent. Your code is ' + ui.login.issued.code + '.', 'info')}
    <form data-submit="login-code" novalidate>
      <label for="code">6-digit code</label>
      <input id="code" name="code" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code">
      ${errorBlock(ui.login.error)}
      ${ui.login.info ? noticeBox(ui.login.info, 'success') : ''}
      <button type="submit" class="btn btn-primary">Verify</button>
    </form>
    ${button('Resend code', 'resend-code', {}, 'btn btn-secondary')}`;
}

VIEWS.login = () => {
  const steps = { email: emailStep, password: passwordStep, code: codeStep };
  return {
    title: 'CampusConnect',
    body: steps[ui.login.step](),
    tabs: false,
    back: ui.login.step !== 'email',
    backAction: 'login-back',
  };
};

// ---------- Actions ----------

ACTIONS['fill-demo'] = el => {
  ui.login.email = el.dataset.email;
  showLogin('email');
};

ACTIONS['login-email'] = form => {
  ui.login.email = form.elements.email.value.trim();
  if (!isValidEmail(ui.login.email)) return showLogin('email', 'Enter a valid email, like name@campus.edu.');
  return showLogin('password');
};

ACTIONS['login-password'] = form => {
  const password = form.elements.password.value;
  if (!password) return showLogin('password', 'Enter your password.');
  const user = checkCredentials(ui.login.email, password);
  // Same message for a wrong email or a wrong password, so nobody can guess which emails exist.
  if (!user) return showLogin('password', 'Email or password is incorrect. Try again.');
  ui.login.pendingUserId = user.id;
  ui.login.issued = issueCode();
  return showLogin('code');
};

ACTIONS['login-code'] = form => {
  const result = checkVerificationCode(form.elements.code.value.trim(), ui.login.issued);
  if (result !== 'ok') return showLogin('code', CODE_MESSAGES[result]);
  return finishLogin();
};

ACTIONS['resend-code'] = () => {
  ui.login.issued = issueCode();
  showLogin('code', '', 'We sent a new code.');
};

ACTIONS['login-back'] = () => {
  ui.login = { ...freshLogin(), email: ui.login.email };
  showLogin('email');
};

ACTIONS['toggle-password'] = el => {
  const input = document.getElementById('password');
  const wasHidden = input.type === 'password';
  input.type = wasHidden ? 'text' : 'password';
  el.textContent = wasHidden ? 'Hide' : 'Show';
};

function finishLogin() {
  ui.user = findUser(ui.login.pendingUserId);
  saveSession(ui.user.id);
  ui.login = freshLogin();
  go('home', {}, 'reset');
}

function logout() {
  clearSession();
  ui.user = null;
  ui.login = freshLogin();
  ui.stack = [];
  ui.screen = 'login';
  render(true);
}
