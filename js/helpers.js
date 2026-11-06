// helpers.js — small helpers for dates, times and safe text.
// Dates are stored as "YYYY-MM-DD" and times as "HH:MM" (24-hour) strings.

function pad(number) {
  return String(number).padStart(2, '0');
}

function toDateStr(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function todayStr() {
  return toDateStr(new Date());
}

function parseDate(str) {
  const [year, month, day] = str.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(str, days) {
  const date = parseDate(str);
  date.setDate(date.getDate() + days);
  return toDateStr(date);
}

function addMonths(str, months) {
  const date = parseDate(str);
  date.setDate(1); // avoid "Jan 31 + 1 month" jumping to March
  date.setMonth(date.getMonth() + months);
  return toDateStr(date);
}

function formatDate(str) {
  return parseDate(str).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDateLong(str) {
  return parseDate(str).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return (hours % 12 || 12) + ':' + pad(minutes) + ' ' + suffix;
}

function addMinutes(time, minutes) {
  const [hours, mins] = time.split(':').map(Number);
  const total = hours * 60 + mins + minutes;
  return pad(Math.floor(total / 60) % 24) + ':' + pad(total % 60);
}

function timeRange(time) {
  return formatTime(time) + ' – ' + formatTime(addMinutes(time, SESSION_MINUTES));
}

function isFuture(date, time) {
  return new Date(date + 'T' + time) > new Date();
}

function isWeekday(str) {
  const day = parseDate(str).getDay();
  return day !== 0 && day !== 6;
}

// The next `count` weekdays, starting today.
function nextWeekdays(count) {
  const days = [];
  let date = todayStr();
  while (days.length < count) {
    if (isWeekday(date)) days.push(date);
    date = addDays(date, 1);
  }
  return days;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// "2026-11-05T14:30:00.000Z" -> local "YYYY-MM-DD" and "HH:MM"
function isoToDate(iso) {
  return toDateStr(new Date(iso));
}

function isoToTime(iso) {
  const date = new Date(iso);
  return pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function formatStamp(iso) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Escape user text before putting it into HTML (prevents HTML injection).
function esc(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(text).replace(/[&<>"']/g, char => map[char]);
}

let idCounter = 0;
function newId(prefix) {
  idCounter += 1;
  return prefix + Date.now().toString(36) + idCounter.toString(36) + Math.random().toString(36).slice(2, 5);
}

// Standard "something went wrong" result used by all logic functions.
function fail(reason, message) {
  return { ok: false, reason, message };
}
