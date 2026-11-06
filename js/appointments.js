// appointments.js — FEATURE A logic: availability, booking, changing, cancelling, calendar.
// Every function that can fail returns { ok:false, reason, message } instead of crashing.
// A "slot" is an open time an advisor/tutor offers. An "appointment" is a booked slot.

// ---------- Reading ----------

function findAppointment(id) {
  return db.appointments.find(appt => appt.id === id) || null;
}

function bookedAppointments() {
  return db.appointments.filter(appt => appt.status === 'booked');
}

function bookingAt(staffId, date, time) {
  return bookedAppointments().find(appt => appt.staffId === staffId && appt.date === date && appt.time === time);
}

function isSlotBooked(staffId, date, time) {
  return Boolean(bookingAt(staffId, date, time));
}

// Times still open (not booked, not in the past) for one advisor/tutor on one day.
function freeSlots(staffId, date) {
  return db.availability
    .filter(slot => slot.staffId === staffId && slot.date === date)
    .filter(slot => isFuture(slot.date, slot.time) && !isSlotBooked(staffId, slot.date, slot.time))
    .map(slot => slot.time)
    .sort();
}

// The next few days that still have at least one open time.
function freeDates(staffId, limit = 7) {
  const days = db.availability.filter(slot => slot.staffId === staffId).map(slot => slot.date);
  const unique = [...new Set(days)].sort();
  return unique.filter(date => freeSlots(staffId, date).length > 0).slice(0, limit);
}

function studentBusyAt(studentId, date, time) {
  return bookedAppointments().some(appt => appt.studentId === studentId && appt.date === date && appt.time === time);
}

function sortByStart(list) {
  return list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

function myAppointments(user) {
  const idField = isStaff(user) ? 'staffId' : 'studentId';
  return sortByStart(bookedAppointments().filter(appt => appt[idField] === user.id));
}

function upcomingAppointments(user) {
  return myAppointments(user).filter(appt => isFuture(appt.date, appt.time));
}

// ---------- Notifications text ----------

const MESSAGES = {
  booked: (student, staff, when) => [
    `Session booked with ${staff} for ${when}.`,
    `${student} booked a session with you for ${when}.`,
  ],
  changed: (student, staff, when, oldWhen) => [
    `Your session with ${staff} moved from ${oldWhen} to ${when}.`,
    `${student} moved their session from ${oldWhen} to ${when}.`,
  ],
  canceled: (student, staff, when) => [
    `Your session with ${staff} on ${when} was canceled.`,
    `${student} canceled the session on ${when}.`,
  ],
};

function describeWhen(appt) {
  return formatDate(appt.date) + ' at ' + formatTime(appt.time);
}

// Tells the student and the advisor/tutor, except the person who did the action.
function sendNotifications(appt, kind, skipUserId, oldWhen) {
  const student = findUser(appt.studentId);
  const staff = findUser(appt.staffId);
  const [toStudent, toStaff] = MESSAGES[kind](fullName(student), fullName(staff), describeWhen(appt), oldWhen);
  if (student.id !== skipUserId) notify(student.id, toStudent);
  if (staff.id !== skipUserId) notify(staff.id, toStaff);
}

// ---------- Booking, changing, cancelling ----------

// Returns null when the choice is fine, or a fail() result explaining the problem.
function checkSlotChoice(studentId, staffId, date, time) {
  if (!date || !time) return fail('missing', 'Please choose a date and a time.');
  if (studentBusyAt(studentId, date, time)) return fail('busy', 'You already have a session at that time.');
  if (!freeSlots(staffId, date).includes(time)) return fail('taken', 'That time is no longer available.');
  return null;
}

function cleanNote(note) {
  return String(note || '').trim().slice(0, 200);
}

function bookAppointment(studentId, staffId, date, time, note) {
  const problem = checkSlotChoice(studentId, staffId, date, time);
  if (problem) return problem;
  const appt = { id: newId('ap'), studentId, staffId, date, time, note: cleanNote(note), status: 'booked' };
  db.appointments.push(appt);
  sendNotifications(appt, 'booked', null);
  saveDb();
  return { ok: true, appointment: appt };
}

function rescheduleAppointment(appointmentId, date, time) {
  const appt = findAppointment(appointmentId);
  if (!appt || appt.status !== 'booked') return fail('gone', 'This session no longer exists.');
  const problem = checkSlotChoice(appt.studentId, appt.staffId, date, time);
  if (problem) return problem;
  const oldWhen = describeWhen(appt);
  appt.date = date;
  appt.time = time;
  sendNotifications(appt, 'changed', null, oldWhen);
  saveDb();
  return { ok: true, appointment: appt };
}

function cancelAppointment(appointmentId, byUser) {
  const appt = findAppointment(appointmentId);
  if (!appt || appt.status !== 'booked') return fail('gone', 'This session was already canceled.');
  appt.status = 'canceled';
  sendNotifications(appt, 'canceled', byUser.id);
  saveDb();
  return { ok: true, appointment: appt };
}

// ---------- Advisor / tutor availability ----------

function addAvailability(staffId, date, time) {
  if (!date || !time) return fail('missing', 'Please choose a date and a time.');
  if (!isFuture(date, time)) return fail('past', 'That time has already passed.');
  const duplicate = db.availability.some(slot => slot.staffId === staffId && slot.date === date && slot.time === time);
  if (duplicate) return fail('duplicate', 'You already offered that time.');
  db.availability.push({ id: newId('av'), staffId, date, time });
  saveDb();
  return { ok: true };
}

function removeAvailability(slotId) {
  const slot = db.availability.find(item => item.id === slotId);
  if (!slot) return fail('gone', 'That time was already removed.');
  if (isSlotBooked(slot.staffId, slot.date, slot.time)) {
    return fail('booked', 'A student booked this time. Cancel the session first.');
  }
  db.availability = db.availability.filter(item => item.id !== slotId);
  saveDb();
  return { ok: true };
}

// Upcoming slots of one advisor/tutor, each with the booking (if any).
function staffSlots(staffId) {
  const upcoming = db.availability.filter(slot => slot.staffId === staffId && isFuture(slot.date, slot.time));
  return sortByStart(upcoming).map(slot => ({ ...slot, booking: bookingAt(staffId, slot.date, slot.time) || null }));
}

// ---------- Calendar ----------

function appointmentsOn(user, date) {
  return myAppointments(user).filter(appt => appt.date === date);
}

// Open times on a day: students see everyone's, advisors/tutors see their own.
function openTimesOn(user, date) {
  const people = isStaff(user) ? [user] : USERS.filter(isStaff);
  return people
    .map(staff => ({ staff, times: freeSlots(staff.id, date) }))
    .filter(entry => entry.times.length > 0);
}
