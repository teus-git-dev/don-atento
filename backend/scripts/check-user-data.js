const db = require('better-sqlite3')('dev.db');
const users = db.prepare("SELECT firstName, lastName, email, phone, governmentId FROM User WHERE role='TENANT_USER' LIMIT 5").all();
console.log(users);
