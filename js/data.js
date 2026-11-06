// data.js — demo constants. Everything here is FICTIONAL class-demo data.

const SESSION_MINUTES = 60;   // every session lasts one hour
const CODE_MINUTES = 5;       // how long a 2-step verification code stays valid
const CHECK_DELAY_MS = 1200;  // pretend the server needs a moment to check enrollment
const DEMO_PASSWORD = 'password123';

const USERS = [
  { id: 's1', role: 'student', firstName: 'Javier', lastName: 'Smith', studentId: 79163844,
    email: 'javier@campus.edu', password: DEMO_PASSWORD, enrolled: true },
  { id: 's2', role: 'student', firstName: 'Sam', lastName: 'Taylor', studentId: 79163999,
    email: 'sam@campus.edu', password: DEMO_PASSWORD, enrolled: false },
  { id: 'a1', role: 'advisor', firstName: 'Alex', lastName: 'Smith', title: 'Academic Advisor',
    location: 'Ballston Center · room 204', email: 'alex@campus.edu', password: DEMO_PASSWORD },
  { id: 't1', role: 'tutor', firstName: 'Maria', lastName: 'Lopez', title: 'Peer Tutor · Math',
    location: 'Main Library · room 12', email: 'maria@campus.edu', password: DEMO_PASSWORD },
];

const FACILITIES = [
  { id: 'ballston', name: 'Ballston Center', floor: 4, room: 204 },
  { id: 'library', name: 'Main Library', floor: 1, room: 101 },
  { id: 'rec', name: 'Recreation Center', floor: 1, room: 10 },
];

// Times an advisor or tutor can pick when adding availability (08:00 to 17:00).
const HOURS = Array.from({ length: 10 }, (_, i) => String(8 + i).padStart(2, '0') + ':00');

// Times that are open for each advisor/tutor when the demo data is created.
const SEED_TIMES = {
  a1: ['10:00', '13:00', '15:00'],
  t1: ['09:00', '11:00', '14:00'],
};

function findUser(id) {
  return USERS.find(user => user.id === id) || null;
}

function fullName(user) {
  return user.firstName + ' ' + user.lastName;
}

function isStaff(user) {
  return user.role !== 'student';
}

function listStaff(role) {
  return USERS.filter(user => user.role === role);
}
