const Database = require('better-sqlite3');
const db = new Database('dev.db');
console.log(db.prepare('SELECT id, whatsappProvider FROM Tenant').all());
