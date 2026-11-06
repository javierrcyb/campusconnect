// main.js — app state, navigation, drawing the screen and handling clicks.

const ui = {
  user: null,        // the signed-in user (or null)
  screen: 'login',   // name of the current screen (a key of VIEWS)
  params: {},        // data for the current screen (chosen day, time, ...)
  stack: [],         // earlier screens, so the Back button works
  login: freshLogin(),
};

// Open a screen. mode 'push' keeps a Back path; 'reset' starts a fresh path (tabs, results).
function go(screen, params = {}, mode = 'push') {
  if (mode === 'push') ui.stack.push({ screen: ui.screen, params: ui.params });
  else ui.stack = [];
  ui.screen = screen;
  ui.params = params;
  render(true);
}

function back() {
  const previous = ui.stack.pop();
  if (!previous) return go('home', {}, 'reset');
  ui.screen = previous.screen;
  ui.params = previous.params;
  return render(true);
}

// Change the current screen's data and redraw, keeping keyboard focus where it was.
function update(changes) {
  const signature = focusSignature(document.activeElement);
  ui.params = { ...ui.params, ...changes };
  render(false);
  restoreFocus(signature);
}

function focusSignature(element) {
  return element && element.dataset && element.dataset.action ? JSON.stringify(element.dataset) : null;
}

function restoreFocus(signature) {
  if (!signature) return;
  const match = [...document.querySelectorAll('[data-action]')].find(el => JSON.stringify(el.dataset) === signature);
  if (match) match.focus();
}

function render(moveFocus) {
  loadDb();
  const makeView = ui.user ? (VIEWS[ui.screen] || VIEWS.home) : VIEWS.login;
  document.getElementById('app').innerHTML = renderPage(makeView(ui.params));
  if (!moveFocus) return;
  window.scrollTo(0, 0);
  const heading = document.querySelector('h1');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

function runAction(name, element) {
  const handler = ACTIONS[name];
  if (!handler) return;
  loadDb();
  handler(element);
}

document.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (target) runAction(target.dataset.action, target);
});

document.addEventListener('submit', event => {
  event.preventDefault();
  runAction(event.target.dataset.submit, event.target);
});

document.addEventListener('DOMContentLoaded', () => {
  loadDb();
  ui.user = loadSessionUser();
  ui.screen = ui.user ? 'home' : 'login';
  render(true);
});
