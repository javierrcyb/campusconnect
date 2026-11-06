// notifications.js — simple in-app alerts (no real email or push in this prototype).

function notify(userId, text) {
  db.notifications.push({ id: newId('n'), userId, text, createdAt: new Date().toISOString(), read: false });
}

function notificationsFor(userId) {
  return db.notifications
    .filter(item => item.userId === userId)
    .reverse() // so alerts made in the same millisecond still keep newest first
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function unreadCount(userId) {
  return notificationsFor(userId).filter(item => !item.read).length;
}

function markNotificationsRead(userId) {
  let changed = false;
  db.notifications.forEach(item => {
    if (item.userId === userId && !item.read) {
      item.read = true;
      changed = true;
    }
  });
  if (changed) saveDb();
}
