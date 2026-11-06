// views-appointments.js — FEATURE A screens: find a time, review, confirm, details,
// change, cancel, calendar, and the advisor/tutor availability screen.
// Screen state (chosen advisor, day, time...) lives in ui.params.

// ---------- Small building blocks ----------

function chip(html, action, data, selected, ariaLabel) {
  const attrs = Object.entries(data).map(([key, value]) => ` data-${key}="${esc(value)}"`).join('');
  return `<button type="button" class="chip${selected ? ' on' : ''}" aria-pressed="${selected}" aria-label="${esc(ariaLabel)}" data-action="${action}"${attrs}>${html}</button>`;
}

function dayChip(date, selected) {
  const parsed = parseDate(date);
  const weekday = parsed.toLocaleDateString('en-US', { weekday: 'short' });
  const month = parsed.toLocaleDateString('en-US', { month: 'short' });
  const html = `<span>${weekday}</span><strong>${parsed.getDate()}</strong><span>${month}</span>`;
  return chip(html, 'pick-date', { date }, selected, formatDateLong(date));
}

function whoRows(appt, viewer) {
  const staff = findUser(appt.staffId);
  if (isStaff(viewer)) return [['Student', esc(fullName(findUser(appt.studentId)))]];
  return [['With', esc(fullName(staff))], ['Role', esc(staff.title)]];
}

function appointmentRows(appt, viewer) {
  const rows = whoRows(appt, viewer).concat([
    ['Date', formatDateLong(appt.date)],
    ['Time', timeRange(appt.time)],
    ['Where', esc(findUser(appt.staffId).location)],
  ]);
  if (appt.note) rows.push(['Note', esc(appt.note)]);
  return rows;
}

function statusBadge(appt) {
  return appt.status === 'booked' ? '<span class="badge">Confirmed</span>' : '<span class="badge badge-off">Canceled</span>';
}

// ---------- Find a time (book or change) ----------

function roleToggle(p) {
  const options = [['advisor', 'Advisor'], ['tutor', 'Peer tutor']];
  const buttons = options.map(([role, label]) => {
    const on = p.role === role;
    return `<button type="button" class="seg${on ? ' on' : ''}" aria-pressed="${on}" data-action="pick-role" data-role="${role}">${label}</button>`;
  });
  return `<div class="segmented" role="group" aria-label="Who do you want to meet?">${buttons.join('')}</div>`;
}

function staffPicker(p) {
  return listStaff(p.role).map(staff => {
    const on = p.staffId === staff.id;
    return `<button type="button" class="card card-button${on ? ' selected' : ''}" aria-pressed="${on}" data-action="pick-staff" data-id="${staff.id}">
      <span class="card-title">${esc(fullName(staff))}</span>
      <span class="muted">${esc(staff.title)} · ${esc(staff.location)}</span></button>`;
  }).join('');
}

function dateChips(p) {
  const dates = freeDates(p.staffId);
  if (!dates.length) return emptyState('No open times right now', 'Check back later or choose someone else.');
  const chips = dates.map(date => dayChip(date, date === p.date)).join('');
  return `<h2>Pick a day</h2><div class="chips" role="group" aria-label="Pick a day">${chips}</div>`;
}

function timeChips(p) {
  if (!p.date) return '';
  const times = freeSlots(p.staffId, p.date);
  if (!times.length) return emptyState('No open times that day', 'Pick another day.');
  const chips = times.map(time => chip(formatTime(time), 'pick-time', { time }, time === p.time, formatTime(time))).join('');
  return `<h2>Open times · ${formatDate(p.date)}</h2><p class="muted small">${SESSION_MINUTES}-minute sessions</p>
    <div class="chips" role="group" aria-label="Open times">${chips}</div>`;
}

function currentSessionCard(p) {
  const appt = findAppointment(p.appointmentId);
  return `<div class="card"><span class="muted">Current session</span>
    <span class="card-title">${formatDate(appt.date)} · ${timeRange(appt.time)}</span>
    <span class="muted">with ${esc(fullName(findUser(appt.staffId)))}</span></div>`;
}

VIEWS.find = p => {
  const isChange = p.mode === 'change';
  const picker = isChange ? currentSessionCard(p) : roleToggle(p) + staffPicker(p);
  const times = p.staffId ? dateChips(p) + timeChips(p) : '';
  return {
    title: isChange ? 'Change session' : 'Find support',
    tab: 'sessions',
    back: true,
    body: `<h1>${isChange ? 'Choose a new time' : 'Make room for progress.'}</h1>
      ${picker}${times}
      ${p.error ? noticeBox(p.error, 'error') : ''}
      ${button('Continue', 'find-continue', {}, 'btn btn-primary')}`,
  };
};

ACTIONS['start-booking'] = () => go('find', { mode: 'book', role: 'advisor' });

ACTIONS['pick-role'] = el => update({ role: el.dataset.role, staffId: null, date: null, time: null, error: '' });

ACTIONS['pick-staff'] = el => {
  const staffId = el.dataset.id;
  update({ staffId, date: freeDates(staffId)[0] || null, time: null, error: '' });
};

ACTIONS['pick-date'] = el => update({ date: el.dataset.date, time: null, error: '' });

ACTIONS['pick-time'] = el => update({ time: el.dataset.time, error: '' });

ACTIONS['find-continue'] = () => {
  const p = ui.params;
  if (!p.staffId) return update({ error: 'Please choose an advisor or tutor first.' });
  if (!p.date || !p.time) return update({ error: 'Please choose a date and a time.' });
  return go('review', { mode: p.mode, staffId: p.staffId, date: p.date, time: p.time, appointmentId: p.appointmentId });
};

// ---------- Review and confirm ----------

function reviewRows(p) {
  const staff = findUser(p.staffId);
  const rows = [
    ['With', esc(fullName(staff))],
    ['Date', formatDateLong(p.date)],
    ['Time', timeRange(p.time)],
    ['Where', esc(staff.location)],
  ];
  if (p.mode === 'change') {
    const old = findAppointment(p.appointmentId);
    rows.push(['Current time', formatDate(old.date) + ' · ' + timeRange(old.time)]);
  }
  return rows;
}

function noteField(p) {
  if (p.mode === 'change') return '';
  return `<label for="note">Anything to share? (optional)</label>
    <textarea id="note" rows="3" maxlength="200" placeholder="Add a note for ${esc(findUser(p.staffId).firstName)}"></textarea>`;
}

VIEWS.review = p => {
  const isChange = p.mode === 'change';
  return {
    title: isChange ? 'Review change' : 'Review booking',
    tab: 'sessions',
    back: true,
    body: `<h1>${isChange ? 'Review your change' : 'Review your booking'}</h1>
      <div class="card">${detailRows(reviewRows(p))}</div>
      ${noteField(p)}
      ${noticeBox("We'll check this time is still available before saving.", 'info')}
      ${p.error ? noticeBox(p.error, 'error') : ''}
      ${button(isChange ? 'Confirm change' : 'Confirm booking', 'confirm-booking', {}, 'btn btn-primary')}
      ${button('Back to times', 'back', {}, 'btn btn-secondary')}`,
  };
};

function handleBookingResult(result) {
  if (result.ok) return go('confirmed', { id: result.appointment.id, mode: ui.params.mode }, 'reset');
  if (result.reason === 'taken') return go('taken', { ...ui.params });
  return update({ error: result.message });
}

ACTIONS['confirm-booking'] = () => {
  const p = ui.params;
  const noteBox = document.getElementById('note');
  const note = noteBox ? noteBox.value : '';
  const result = p.mode === 'change'
    ? rescheduleAppointment(p.appointmentId, p.date, p.time)
    : bookAppointment(ui.user.id, p.staffId, p.date, p.time, note);
  handleBookingResult(result);
};

VIEWS.confirmed = p => {
  const appt = findAppointment(p.id);
  const isChange = p.mode === 'change';
  const staffName = fullName(findUser(appt.staffId));
  return {
    title: isChange ? 'Session changed' : 'Session booked',
    tab: 'sessions',
    body: `<div class="hero-icon ok">${icon('check')}</div>
      <h1>${isChange ? 'Session changed.' : 'Session booked.'}</h1>
      ${noticeBox(`Session ${isChange ? 'moved' : 'booked'} for ${describeWhen(appt)}. ${staffName} has been notified.`, 'success')}
      <div class="card">${detailRows(appointmentRows(appt, ui.user))}</div>
      ${button('View my sessions', 'tab', { screen: 'sessions' }, 'btn btn-primary')}
      ${button('Back to home', 'tab', { screen: 'home' }, 'btn btn-secondary')}`,
  };
};

// Shown when someone else took the time while the student was reviewing.
VIEWS.taken = p => {
  const staff = findUser(p.staffId);
  const others = freeSlots(p.staffId, p.date);
  const chips = others.map(time => chip(formatTime(time), 'pick-other-time', { time }, false, formatTime(time))).join('');
  const otherBlock = others.length
    ? `<h2>Other times with ${esc(staff.firstName)} on ${formatDate(p.date)}</h2><div class="chips">${chips}</div>`
    : '';
  return {
    title: 'Choose another time',
    tab: 'sessions',
    body: `<div class="hero-icon bad">${icon('alert')}</div>
      <h1>That time just filled up.</h1>
      <p class="muted">Someone else booked ${formatDate(p.date)} at ${formatTime(p.time)} while you were reviewing.</p>
      ${noticeBox(p.mode === 'change' ? 'Your session was not changed.' : "No appointment was created. Your calendar hasn't changed.", 'error')}
      ${otherBlock}
      ${button('See other days', 'see-other-days', {}, 'btn btn-primary')}`,
  };
};

ACTIONS['pick-other-time'] = el => go('review', { ...ui.params, time: el.dataset.time, error: '' }, 'reset');

ACTIONS['see-other-days'] = () => go('find', { ...ui.params, time: null, error: '' }, 'reset');

// ---------- Session details, change, cancel ----------

VIEWS.details = p => {
  const appt = findAppointment(p.id);
  if (!appt || appt.status !== 'booked') {
    return { title: 'Session', tab: 'sessions', back: true, body: '<h1>Session</h1>' + emptyState('This session is no longer booked', 'It may have been canceled.') };
  }
  const changeButton = isStaff(ui.user) ? '' : button('Change time', 'change-session', { id: appt.id }, 'btn btn-secondary');
  return {
    title: 'Session details',
    tab: 'sessions',
    back: true,
    body: `<h1>Session details</h1>
      <div class="card">${detailRows(appointmentRows(appt, ui.user))}${statusBadge(appt)}</div>
      ${changeButton}
      ${button('Cancel session', 'ask-cancel', { id: appt.id }, 'btn btn-danger')}
      ${button('Back to sessions', 'tab', { screen: 'sessions' }, 'btn btn-secondary')}`,
  };
};

ACTIONS['open-session'] = el => go('details', { id: el.dataset.id });

ACTIONS['change-session'] = el => {
  const appt = findAppointment(el.dataset.id);
  const staff = findUser(appt.staffId);
  go('find', { mode: 'change', appointmentId: appt.id, role: staff.role, staffId: staff.id, date: freeDates(staff.id)[0] || null, time: null });
};

VIEWS.cancelConfirm = p => {
  const appt = findAppointment(p.id);
  const other = isStaff(ui.user) ? fullName(findUser(appt.studentId)) : fullName(findUser(appt.staffId));
  return {
    title: 'Cancel session?',
    tab: 'sessions',
    back: true,
    body: `<h1>Before you cancel…</h1>
      <p class="muted">This is the session you're about to cancel.</p>
      <div class="card">${detailRows(appointmentRows(appt, ui.user))}</div>
      ${noticeBox(`Canceling removes this session from your calendar and notifies ${other}.`, 'info')}
      ${p.error ? noticeBox(p.error, 'error') : ''}
      ${button('Keep session', 'back', {}, 'btn btn-primary')}
      ${button('Yes, cancel session', 'confirm-cancel', { id: appt.id }, 'btn btn-danger')}`,
  };
};

ACTIONS['ask-cancel'] = el => go('cancelConfirm', { id: el.dataset.id });

ACTIONS['confirm-cancel'] = el => {
  const result = cancelAppointment(el.dataset.id, ui.user);
  if (result.ok) return go('canceled', { id: el.dataset.id }, 'reset');
  return update({ error: result.message });
};

VIEWS.canceled = p => {
  const appt = findAppointment(p.id);
  const other = isStaff(ui.user) ? fullName(findUser(appt.studentId)) : fullName(findUser(appt.staffId));
  return {
    title: 'Session canceled',
    tab: 'sessions',
    body: `<div class="hero-icon ok">${icon('check')}</div>
      <h1>Session canceled.</h1>
      <p class="muted">The session was removed from your calendar.</p>
      <div class="card">${detailRows(appointmentRows(appt, ui.user))}${statusBadge(appt)}</div>
      <p>${esc(other)} has been notified.</p>
      ${button('Back to sessions', 'tab', { screen: 'sessions' }, 'btn btn-primary')}`,
  };
};

// ---------- My sessions list ----------

VIEWS.sessions = () => {
  const list = upcomingAppointments(ui.user);
  const cards = list.length
    ? list.map(appt => sessionCard(appt, ui.user)).join('')
    : emptyState('No upcoming sessions', isStaff(ui.user) ? 'Students will appear here when they book you.' : 'Tap "Book a session" to schedule one.');
  const bookButton = isStaff(ui.user) ? '' : button('Book a session', 'start-booking', {}, 'btn btn-primary');
  return {
    title: 'Sessions',
    tab: 'sessions',
    body: `<h1>My sessions</h1>${cards}${bookButton}${button('Open calendar', 'open-calendar', {}, 'btn btn-secondary')}`,
  };
};

// ---------- Calendar (day / week / month) ----------

function weekDates(date) {
  const mondayOffset = (parseDate(date).getDay() + 6) % 7;
  const monday = addDays(date, -mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function monthDates(date) {
  const first = addMonths(date, 0);
  const dates = [];
  for (let day = first; day.slice(0, 7) === first.slice(0, 7); day = addDays(day, 1)) dates.push(day);
  return dates;
}

function rangeLabel(view, date) {
  if (view === 'day') return formatDateLong(date);
  if (view === 'week') {
    const days = weekDates(date);
    return formatDate(days[0]) + ' – ' + formatDate(days[6]);
  }
  return parseDate(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function miniSession(appt) {
  const other = isStaff(ui.user) ? findUser(appt.studentId) : findUser(appt.staffId);
  return `<button type="button" class="card card-button compact" data-action="open-session" data-id="${appt.id}">
    <span><span class="badge">Confirmed</span> <strong>${timeRange(appt.time)}</strong></span>
    <span class="muted">with ${esc(fullName(other))}</span></button>`;
}

function openTimesLine(entry) {
  const times = entry.times.map(formatTime).join(', ');
  return `<p class="open-line"><span class="badge badge-open">Available</span> ${esc(fullName(entry.staff))}: ${times}</p>`;
}

function dayBlock(date) {
  const sessions = appointmentsOn(ui.user, date).map(miniSession).join('');
  const openTimes = openTimesOn(ui.user, date).map(openTimesLine).join('');
  const empty = sessions || openTimes ? '' : '<p class="muted">Nothing scheduled and no open times.</p>';
  return `<section class="day"><h2>${formatDate(date)}</h2>${sessions}${openTimes}${empty}</section>`;
}

function monthRow(date) {
  const sessionCount = appointmentsOn(ui.user, date).length;
  const openCount = openTimesOn(ui.user, date).reduce((total, entry) => total + entry.times.length, 0);
  if (!sessionCount && !openCount) return '';
  const summary = `${sessionCount} session${sessionCount === 1 ? '' : 's'} · ${openCount} open time${openCount === 1 ? '' : 's'}`;
  return `<button type="button" class="card card-button compact" data-action="calendar-day" data-date="${date}">
    <strong>${formatDate(date)}</strong><span class="muted">${summary}</span></button>`;
}

function calendarBody(view, date) {
  if (view === 'day') return dayBlock(date);
  if (view === 'week') return weekDates(date).map(dayBlock).join('');
  const rows = monthDates(date).map(monthRow).join('');
  return rows || emptyState('Nothing this month', 'No sessions or open times.');
}

function viewSwitcher(view) {
  const buttons = ['day', 'week', 'month'].map(name => {
    const on = name === view;
    return `<button type="button" class="seg${on ? ' on' : ''}" aria-pressed="${on}" data-action="cal-view" data-view="${name}">${name[0].toUpperCase() + name.slice(1)}</button>`;
  });
  return `<div class="segmented" role="group" aria-label="Calendar view">${buttons.join('')}</div>`;
}

function calendarNav(view, date) {
  return `<div class="cal-nav">
    <button type="button" class="icon-btn" data-action="cal-step" data-dir="-1" aria-label="Previous ${view}">${icon('back')}</button>
    <strong>${rangeLabel(view, date)}</strong>
    <button type="button" class="icon-btn" data-action="cal-step" data-dir="1" aria-label="Next ${view}">${icon('next')}</button></div>`;
}

VIEWS.calendar = p => {
  const view = p.view || 'day';
  const date = p.date || todayStr();
  return {
    title: 'Calendar',
    tab: 'sessions',
    back: true,
    body: `<h1>Calendar</h1>${viewSwitcher(view)}${calendarNav(view, date)}${calendarBody(view, date)}
      <p class="muted small">Times are shown in campus local time.</p>`,
  };
};

ACTIONS['open-calendar'] = () => go('calendar', { view: 'day', date: todayStr() });

ACTIONS['cal-view'] = el => update({ view: el.dataset.view });

ACTIONS['cal-step'] = el => {
  const direction = Number(el.dataset.dir);
  const view = ui.params.view || 'day';
  const date = ui.params.date || todayStr();
  const steps = { day: addDays(date, direction), week: addDays(date, 7 * direction), month: addMonths(date, direction) };
  update({ date: steps[view] });
};

ACTIONS['calendar-day'] = el => update({ view: 'day', date: el.dataset.date });

// ---------- Advisor / tutor availability ----------

function timeOptions(selected) {
  return HOURS.map(time => `<option value="${time}"${time === selected ? ' selected' : ''}>${formatTime(time)}</option>`).join('');
}

function slotRow(slot) {
  const label = `${formatDate(slot.date)} · ${formatTime(slot.time)}`;
  if (slot.booking) {
    const student = fullName(findUser(slot.booking.studentId));
    return `<div class="row"><div><strong>${label}</strong><br><span class="badge">Booked by ${esc(student)}</span></div></div>`;
  }
  const remove = button('Remove', 'remove-slot', { id: slot.id }, 'btn btn-small btn-secondary', 'Remove ' + label);
  return `<div class="row"><div><strong>${label}</strong><br><span class="badge badge-open">Open</span></div>${remove}</div>`;
}

VIEWS.availability = p => {
  if (!isStaff(ui.user)) return notAllowed();
  const slots = staffSlots(ui.user.id);
  const rows = slots.length ? slots.map(slotRow).join('') : emptyState('No open times', 'Add a day and time so students can book you.');
  return {
    title: 'Availability',
    tab: 'availability',
    body: `<h1>My availability</h1>
      <p class="muted">Students can book the times you add. Each time is a ${SESSION_MINUTES}-minute session.</p>
      <form data-submit="add-availability" novalidate>
        <label for="av-date">Date</label>
        <input id="av-date" name="date" type="date" min="${todayStr()}" value="${esc(p.date || '')}">
        <label for="av-time">Start time</label>
        <select id="av-time" name="time">${timeOptions(p.time)}</select>
        ${p.error ? noticeBox(p.error, 'error') : ''}${p.message ? noticeBox(p.message, 'success') : ''}
        <button type="submit" class="btn btn-primary">Add availability</button>
      </form>
      <h2>Your upcoming times</h2>${rows}`,
  };
};

ACTIONS['add-availability'] = form => {
  const date = form.elements.date.value;
  const time = form.elements.time.value;
  const result = addAvailability(ui.user.id, date, time);
  if (!result.ok) return update({ date, time, error: result.message, message: '' });
  return update({ date, time, error: '', message: `Added ${formatDate(date)} at ${formatTime(time)}.` });
};

ACTIONS['remove-slot'] = el => {
  const result = removeAvailability(el.dataset.id);
  update({ error: result.ok ? '' : result.message, message: result.ok ? 'Time removed.' : '' });
};
