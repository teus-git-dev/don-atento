const Database = require('better-sqlite3');
const db = new Database('dev.db', { fileMustExist: true });
const wfs = db.prepare('SELECT * FROM Workflow').all();
console.log('Workflows:', wfs);
const states = db.prepare('SELECT * FROM WorkflowState').all();
console.log('States:', states);
