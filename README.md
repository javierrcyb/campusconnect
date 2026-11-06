# CampusConnect (class prototype)

A small mobile-style web app for **IT210**. Students book sessions with advisors and peer tutors, and check in to campus facilities. Built by Khamil Tinoco and Javier Ramirez.

**Tech stack:** plain HTML, CSS and JavaScript. No framework, no build step, no server. Data is saved in the browser (`localStorage`).

## How to run

1. Download or clone this repository.
2. Open `index.html` in Chrome, Edge, Firefox or Safari. (Tip: use the browser's phone view, or Chrome DevTools > device toolbar.)
3. Or publish it free with **GitHub Pages**: repository *Settings > Pages > Deploy from branch > main / (root)*.

To run the automatic logic tests, open `tests.html` — every line should say PASS.

## Demo accounts (all fictional)

Password for every account: `password123`. After the password the app asks for a 6-digit code; in demo mode the code is shown on the screen.

| Role | Email | Notes |
|---|---|---|
| Student | javier@campus.edu | Enrolled. Already has one booked session. |
| Student | sam@campus.edu | **Not enrolled** — facility check-in is denied. |
| Academic Advisor | alex@campus.edu | Ballston Center · room 204 |
| Peer Tutor (Math) | maria@campus.edu | Main Library · room 12 |

The **Profile** tab has a *Reset demo data* button to return everything to the starting state.

## Features and requirements

### Feature A — Session Scheduling (book, change, cancel, calendar)

1. An advisor or peer tutor can add and remove the days and times they are available.
2. A student can see open times for an advisor or peer tutor, and only times that are still free are shown.
3. A student can book a session. The app checks the time is still free before saving.
4. A student can change the time of a booked session, or cancel it (after a "Keep / Yes, cancel" confirmation).
5. The other person is notified in the **Alerts** tab when a session is booked, changed or canceled.
6. Users can see their sessions in a calendar with **Day, Week and Month** views; students also see when advisors and tutors are available.

### Feature B — Facility Check-In (NFC card)

1. A student sees the list of campus facilities.
2. The app explains that the student must swipe their physical campus card at the reader.
3. The server checks that the student is **enrolled** before access is granted.
4. If enrolled: access is granted, and the place and time are recorded.
5. If not enrolled: access is denied and nothing is recorded.
6. A different message is shown when the server cannot be reached (not the same as "not enrolled").
7. The student can view their entry history.

*(A browser cannot read a real NFC card, so the swipe is a **Simulate card swipe** button.)*

## Where the code is

| What | File |
|---|---|
| Login (email, password, 2-step code) | `js/auth.js`, `js/views-auth.js` |
| Feature A logic | `js/appointments.js`, `js/notifications.js` |
| Feature A screens | `js/views-appointments.js` |
| Feature B logic | `js/facilities.js` |
| Feature B screens | `js/views-facilities.js` |
| Demo data (users, facilities) | `js/data.js` |
| Saving data in the browser | `js/storage.js` |
| Shared screen pieces, Home, Alerts, Profile | `js/views-common.js` |
| Navigation and clicks | `js/main.js` |
| Date and text helpers | `js/helpers.js` |
| Styles | `css/style.css` |
| Automatic tests | `tests.html` |

## Known limitations (it is a prototype)

- **Not secure for real use.** Passwords are written in `js/data.js`, the 2-step code is shown on screen, and all checks run in the browser. There is no real server or database.
- Data is stored only in the browser that is being used; two different computers do not share bookings.
- Alerts appear inside the app. No real email, text message or push notification is sent.
- Facility check-in simulates the NFC swipe.
- Only students book and change sessions. Advisors and tutors manage availability and can cancel sessions.
- A session can be changed only to another time with the same advisor or tutor.
# campusconnect
