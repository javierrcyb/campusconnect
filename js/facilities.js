// facilities.js — FEATURE B logic: facility check-in with a (simulated) NFC card swipe.
// The "server" checks that the student is enrolled, then records place and time.

function findFacility(id) {
  return FACILITIES.find(facility => facility.id === id) || null;
}

// serverUp = false simulates the CampusConnect server being unreachable.
function checkIn(user, facilityId, serverUp) {
  if (!serverUp) return fail('server', 'We could not reach the CampusConnect server.');
  if (!findFacility(facilityId)) return fail('unknown', 'That facility was not found.');
  if (user.role !== 'student') return fail('role', 'Only students can check in to facilities.');
  if (!user.enrolled) return fail('not_enrolled', 'We could not verify your enrollment.');
  const entry = { id: newId('en'), studentId: user.id, facilityId, time: new Date().toISOString() };
  db.entries.push(entry);
  saveDb();
  return { ok: true, entry };
}

// A student's successful entries, newest first.
function entriesFor(studentId) {
  return db.entries
    .filter(entry => entry.studentId === studentId)
    .reverse() // so entries made in the same millisecond still keep newest first
    .sort((a, b) => b.time.localeCompare(a.time));
}
