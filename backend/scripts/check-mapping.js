const db = require('better-sqlite3')('dev.db');
const logs = db.prepare("SELECT templateId, createdAt FROM DataImportLog ORDER BY createdAt DESC LIMIT 1").get();
console.log('Latest log:', logs);

if (logs && logs.templateId) {
  const template = db.prepare("SELECT mapping FROM DataImportTemplate WHERE id = ?").get(logs.templateId);
  console.log('Mapping used:', template.mapping);
}
