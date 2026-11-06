// views-common.js — shared screen pieces: icons, buttons, tab bar, Home, Alerts, Profile.
// A "view" is a function that returns { title, body, tab, back, tabs }.
// An "action" is a function that runs when a button with data-action="..." is pressed.

const VIEWS = {};
const ACTIONS = {};

const ICONS = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  back: '<polyline points="15 18 9 12 15 6"/>',
  next: '<polyline points="9 18 15 12 9 6"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
};

const NOTICE_ICONS = { error: 'alert', info: 'info', success: 'check' };

const TABS_STUDENT = [
  ['home', 'Home', 'home'], ['sessions', 'Sessions', 'calendar'], ['facilities', 'Facilities', 'building'],
  ['alerts', 'Alerts', 'bell'], ['profile', 'Profile', 'user'],
];
const TABS_STAFF = [
  ['home', 'Home', 'home'], ['sessions', 'Sessions', 'calendar'], ['availability', 'Availability', 'clock'],
  ['alerts', 'Alerts', 'bell'], ['profile', 'Profile', 'user'],
];

function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
}

// `label` must already be safe HTML (escape any user text with esc()).
function button(label, action, data = {}, cls = 'btn', ariaLabel = '') {
  const attrs = Object.entries(data).map(([key, value]) => ` data-${key}="${esc(value)}"`).join('');
  const aria = ariaLabel ? ` aria-label="${esc(ariaLabel)}"` : '';
  return `<button type="button" class="${cls}" data-action="${action}"${attrs}${aria}>${label}</button>`;
}

function emptyState(title, text) {
  return `<div class="empty"><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`;
}

// kind: 'error' (announced immediately), 'info' or 'success' (announced politely)
function noticeBox(message, kind = 'info') {
  const role = kind === 'error' ? 'alert' : 'status';
  return `<div class="notice ${kind}" role="${role}">${icon(NOTICE_ICONS[kind])}<span>${esc(message)}</span></div>`;
}

// rows = [[label, safeHtml], ...]
function detailRows(rows) {
  const items = rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
  return `<dl class="rows">${items}</dl>`;
}

function notAllowed() {
  return { title: 'Not available', tab: 'home', body: '<h1>Not available</h1>' + emptyState('Not available for your role', 'Use the tabs below to go back.') };
}

// ---------- Page frame (top bar + content + tab bar) ----------

function tabBar(active) {
  const tabs = isStaff(ui.user) ? TABS_STAFF : TABS_STUDENT;
  const unread = unreadCount(ui.user.id);
  const items = tabs.map(([screen, label, iconName]) => {
    const badge = screen === 'alerts' && unread ? `<span class="badge-dot" aria-label="${unread} unread">${unread}</span>` : '';
    const isActive = screen === active;
    return `<button type="button" class="tab${isActive ? ' active' : ''}"${isActive ? ' aria-current="page"' : ''} data-action="tab" data-screen="${screen}">${icon(iconName)}${badge}<span>${label}</span></button>`;
  });
  return `<nav class="tabbar" aria-label="Main">${items.join('')}</nav>`;
}

function renderPage(view) {
  const showTabs = ui.user && view.tabs !== false;
  const backAction = view.backAction || 'back';
  const backButton = view.back
    ? `<button type="button" class="icon-btn" data-action="${backAction}" aria-label="Go back">${icon('back')}</button>`
    : '<span class="icon-btn"></span>';
  return `<header class="topbar">${backButton}<span class="topbar-title">${esc(view.title)}</span><span class="icon-btn"></span></header>
    <main id="main" class="screen">${view.body}</main>${showTabs ? tabBar(view.tab) : ''}`;
}

// ---------- Home ----------

function sessionCard(appt, viewer) {
  const staffView = isStaff(viewer);
  const other = findUser(staffView ? appt.studentId : appt.staffId);
  const subtitle = staffView ? 'Student' : other.title;
  const place = findUser(appt.staffId).location;
  return `<button type="button" class="card card-button" data-action="open-session" data-id="${appt.id}">
    <span class="card-title">${esc(fullName(other))}</span>
    <span class="muted">${esc(subtitle)}</span>
    <span class="card-line">${formatDate(appt.date)} · ${timeRange(appt.time)}</span>
    <span class="muted">${esc(place)}</span>
    <span class="badge">Confirmed</span>
  </button>`;
}

function nextSessionBlock() {
  const next = upcomingAppointments(ui.user)[0];
  if (next) return sessionCard(next, ui.user);
  return emptyState('No upcoming sessions', isStaff(ui.user) ? 'Students will appear here when they book you.' : 'Book a session with an advisor or peer tutor.');
}

function homeTiles() {
  if (isStaff(ui.user)) {
    return button(icon('clock') + '<span>Set availability</span>', 'tab', { screen: 'availability' }, 'tile')
      + button(icon('calendar') + '<span>Calendar</span>', 'open-calendar', {}, 'tile');
  }
  return button(icon('calendar') + '<span>Book session</span>', 'start-booking', {}, 'tile')
    + button(icon('building') + '<span>Facilities</span>', 'tab', { screen: 'facilities' }, 'tile');
}

VIEWS.home = () => ({
  title: 'CampusConnect',
  tab: 'home',
  body: `<p class="eyebrow">${formatDateLong(todayStr())}</p>
    <h1>${greeting()}, ${esc(ui.user.firstName)}.</h1>
    <div class="grid-2">${homeTiles()}</div>
    <h2>Your next session</h2>${nextSessionBlock()}
    <p class="muted small">Signed in as ${esc(fullName(ui.user))} · ${isStaff(ui.user) ? esc(ui.user.title) : 'Student'}</p>`,
});

// ---------- Alerts ----------

function alertItem(item, isNew) {
  return `<div class="card"><span>${esc(item.text)}</span>
    <span class="muted small">${formatStamp(item.createdAt)}${isNew ? ' · <strong>New</strong>' : ''}</span></div>`;
}

VIEWS.alerts = () => {
  const list = notificationsFor(ui.user.id);
  const newIds = list.filter(item => !item.read).map(item => item.id);
  markNotificationsRead(ui.user.id);
  const items = list.length
    ? list.map(item => alertItem(item, newIds.includes(item.id))).join('')
    : emptyState('No alerts yet', 'Booking, change and cancel alerts show up here.');
  return { title: 'Alerts', tab: 'alerts', body: `<h1>Alerts</h1>${items}` };
};

// ---------- Profile ----------

function profileRows() {
  const user = ui.user;
  const rows = [['Name', esc(fullName(user))], ['Email', esc(user.email)]];
  if (isStaff(user)) return rows.concat([['Role', esc(user.title)], ['Office', esc(user.location)]]);
  return rows.concat([['Role', 'Student'], ['Student ID', String(user.studentId)], ['Enrolled', user.enrolled ? 'Yes' : 'No']]);
}

VIEWS.profile = () => ({
  title: 'Profile',
  tab: 'profile',
  body: `<h1>Profile</h1><div class="card">${detailRows(profileRows())}</div>
    ${button('Sign out', 'logout', {}, 'btn btn-primary')}
    <h2>Testing tools</h2>
    <p class="muted small">Puts the demo bookings, availability and history back to the starting state.</p>
    ${button('Reset demo data', 'reset-demo', {}, 'btn btn-secondary')}`,
});

// ---------- Common actions ----------

ACTIONS.back = () => back();
ACTIONS.tab = el => go(el.dataset.screen, {}, 'reset');
ACTIONS.logout = () => logout();
ACTIONS['reset-demo'] = () => {
  if (!window.confirm('Reset all demo data? Bookings, alerts and entry history will be erased.')) return;
  resetDemoData();
  go('home', {}, 'reset');
};
