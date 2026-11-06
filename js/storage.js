// storage.js — the app's "database". Data is kept in the browser's localStorage,
// so it survives page reloads but is private to this browser (demo only).

let dbKey = 'campusconnect_db_v1';
let db = { availability: [], appointments: [], notifications: [], entries: [], seeded: false };

// Open times for every advisor/tutor on the next 14 weekdays.
function buildAvailability() {
  const slots = [];
  nextWeekdays(14).forEach(date => {
    USERS.filter(isStaff).forEach(staff => {
      (SEED_TIMES[staff.id] || []).forEach(time => {
        slots.push({ id: newId('av'), staffId: staff.id, date, time });
      });
    });
  });
  return slots;
}

function createSeedDb() {
  const sampleDay = nextWeekdays(3)[2];
  return {
    availability: buildAvailability(),
    appointments: [
      { id: newId('ap'), studentId: 's1', staffId: 'a1', date: sampleDay, time: '13:00', note: 'Course planning', status: 'booked' },
    ],
    notifications: [],
    entries: [],
    seeded: true,
  };
}

function saveDb() {
  try {
    localStorage.setItem(dbKey, JSON.stringify(db));
  } catch (error) {
    // Storage blocked (private mode): the app still works, but data lives only in memory.
  }
}

// Always call loadDb() before reading, so two browser tabs see each other's changes.
function loadDb() {
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(dbKey));
  } catch (error) {
    stored = null;
  }
  if (stored) {
    db = stored;
  } else if (!db.seeded) {
    db = createSeedDb();
    saveDb();
  }
  topUpAvailability();
}

// If every open time is in the past (demo opened weeks later), add fresh ones.
function topUpAvailability() {
  const hasFuture = db.availability.some(slot => isFuture(slot.date, slot.time));
  if (hasFuture) return;
  db.availability = db.availability.concat(buildAvailability());
  saveDb();
}

function resetDemoData() {
  db = createSeedDb();
  saveDb();
}
