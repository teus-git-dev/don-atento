const sqlite = require('better-sqlite3');
const db = new sqlite('dev.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));
const users = db.prepare("SELECT count(*) as count FROM User").get();
console.log('User count:', users.count);
if (users.count > 0) {
    const admin = db.prepare("SELECT id, email, role, isActive FROM User WHERE email = 'admin@teus.com'").get();
    console.log('Admin user:', admin);
}
