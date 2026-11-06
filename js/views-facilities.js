// views-facilities.js — FEATURE B screens: facility list, ready to swipe, checking,
// access granted / denied, and entry history.
// Real NFC cannot be read from a web page, so the card swipe is a button ("Simulate card swipe").

function facilityRow(facility) {
  return `<button type="button" class="card card-button" data-action="pick-facility" data-id="${facility.id}">
    <span class="card-title">${esc(facility.name)}</span>
    <span class="muted">Floor ${facility.floor} · Room ${facility.room}</span></button>`;
}

VIEWS.facilities = () => {
  if (isStaff(ui.user)) return notAllowed();
  return {
    title: 'Facilities',
    tab: 'facilities',
    body: `<h1>Campus facilities</h1>
      <p class="muted">Choose where you are, then swipe your physical campus card at the reader.</p>
      ${FACILITIES.map(facilityRow).join('')}
      ${button('View entry history', 'open-entries', {}, 'btn btn-secondary')}`,
  };
};

ACTIONS['pick-facility'] = el => go('checkinReady', { facilityId: el.dataset.id });

ACTIONS['open-entries'] = () => go('entries', {});

// ---------- Ready to swipe ----------

VIEWS.checkinReady = p => {
  const facility = findFacility(p.facilityId);
  return {
    title: 'Ready to check in',
    tab: 'facilities',
    back: true,
    body: `<div class="hero-icon">${icon('card')}</div>
      <h1>Your card. The reader.</h1>
      <p>At ${esc(facility.name)}, swipe your physical campus card at the facility's NFC reader.</p>
      ${noticeBox('Waiting for the facility reader signal…', 'info')}
      <p class="muted">Use the reader at the entrance — not your phone. This demo cannot read a real card, so press the button below to simulate the swipe.</p>
      <label class="check"><input type="checkbox" id="sim-offline"> Simulate a server problem (testing only)</label>
      ${button('Simulate card swipe', 'swipe-card', { id: facility.id }, 'btn btn-primary')}
      ${button('Back to facilities', 'back', {}, 'btn btn-secondary')}`,
  };
};

ACTIONS['swipe-card'] = el => {
  const serverUp = !document.getElementById('sim-offline').checked;
  const facilityId = el.dataset.id;
  go('checkinChecking', { facilityId });
  setTimeout(() => finishCheckIn(facilityId, serverUp), CHECK_DELAY_MS);
};

// Runs after the short "checking" pause. Skipped if the student already left the screen.
function finishCheckIn(facilityId, serverUp) {
  if (ui.screen !== 'checkinChecking') return;
  loadDb();
  const result = checkIn(ui.user, facilityId, serverUp);
  if (result.ok) return go('checkinGranted', { facilityId, entryId: result.entry.id }, 'reset');
  return go('checkinDenied', { facilityId, reason: result.reason }, 'reset');
}

// ---------- Checking ----------

VIEWS.checkinChecking = p => {
  const facility = findFacility(p.facilityId);
  return {
    title: 'Checking enrollment',
    tab: 'facilities',
    body: `<div class="spinner" aria-hidden="true"></div>
      <h1>One moment, ${esc(ui.user.firstName)}.</h1>
      <div role="status">${noticeBox('The reader received your card. CampusConnect is checking your enrollment. Access is not granted yet.', 'info')}</div>
      <div class="card">${detailRows([['Student', esc(fullName(ui.user))], ['Facility', esc(facility.name)], ['Reader', 'Card signal received']])}</div>
      <p class="muted small">No successful entry has been recorded.</p>`,
  };
};

// ---------- Result: granted ----------

VIEWS.checkinGranted = p => {
  const facility = findFacility(p.facilityId);
  const entry = entriesFor(ui.user.id).find(item => item.id === p.entryId);
  return {
    title: 'Access granted',
    tab: 'facilities',
    body: `<div class="hero-icon ok">${icon('building')}</div>
      <h1>Welcome in, ${esc(ui.user.firstName)}.</h1>
      <p class="muted">Your enrollment is verified. Facility access has been granted.</p>
      <div class="card"><strong>Entry recorded</strong>${detailRows([
        ['Student', esc(fullName(ui.user))],
        ['Date', formatDateLong(isoToDate(entry.time))],
        ['Entry time', formatTime(isoToTime(entry.time))],
        ['Location', `${esc(facility.name)} · room ${facility.room}`],
      ])}</div>
      ${button('Back to facilities', 'tab', { screen: 'facilities' }, 'btn btn-primary')}
      ${button('View entry history', 'open-entries', {}, 'btn btn-secondary')}`,
  };
};

// ---------- Result: denied (two different causes, two different messages) ----------

const DENIED_TEXT = {
  not_enrolled: {
    title: "We couldn't verify enrollment.",
    text: "Access wasn't granted. If you are enrolled, try your card at the reader again or contact campus support at support@campus.edu or (555) 010-0100.",
    retry: 'Retry at reader',
  },
  server: {
    title: "We couldn't reach the server.",
    text: 'This is not a problem with your enrollment. Check your connection and try again.',
    retry: 'Try again',
  },
  unknown: {
    title: "We couldn't check in.",
    text: 'Something unexpected happened. Please try again.',
    retry: 'Try again',
  },
};

VIEWS.checkinDenied = p => {
  const facility = findFacility(p.facilityId);
  const text = DENIED_TEXT[p.reason] || DENIED_TEXT.unknown;
  return {
    title: 'Access denied',
    tab: 'facilities',
    body: `<div class="hero-icon bad">${icon('alert')}</div>
      <h1>${text.title}</h1>
      <p>${esc(text.text)}</p>
      <div class="card"><span class="card-title">${esc(facility.name)}</span><span class="muted">${esc(fullName(ui.user))}</span></div>
      ${noticeBox('No access granted. No entry was recorded.', 'error')}
      ${button(text.retry, 'retry-checkin', { id: facility.id }, 'btn btn-primary')}
      ${button('Back to facilities', 'tab', { screen: 'facilities' }, 'btn btn-secondary')}`,
  };
};

ACTIONS['retry-checkin'] = el => go('checkinReady', { facilityId: el.dataset.id }, 'reset');

// ---------- Entry history ----------

function entryRow(entry) {
  const facility = findFacility(entry.facilityId);
  return `<div class="card"><span class="card-title">${esc(facility.name)}</span>
    <span>${formatDate(isoToDate(entry.time))} · ${formatTime(isoToTime(entry.time))}</span>
    <span class="muted">Floor ${facility.floor} · Room ${facility.room}</span></div>`;
}

VIEWS.entries = () => {
  const list = entriesFor(ui.user.id);
  const rows = list.length ? list.map(entryRow).join('') : emptyState('No entries yet', 'Successful check-ins will be listed here.');
  return { title: 'Entry history', tab: 'facilities', back: true, body: `<h1>Entry history</h1>${rows}` };
};
