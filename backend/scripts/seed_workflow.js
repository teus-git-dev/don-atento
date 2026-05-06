const Database = require('better-sqlite3');
const db = new Database('dev.db', { fileMustExist: true });
const tenant = db.prepare('SELECT id FROM Tenant LIMIT 1').get();
console.log('Tenant ID:', tenant.id);

if (tenant) {
  const wfId = 'wf_' + Date.now();
  db.prepare('INSERT INTO Workflow (id, name, description, tenantId) VALUES (?, ?, ?, ?)').run(
    wfId, 'Flujo de Mantenimiento', 'Flujo por defecto para mantenimiento', tenant.id
  );
  
  const s1 = 'st1_' + Date.now();
  const s2 = 'st2_' + Date.now();
  const s3 = 'st3_' + Date.now();
  
  const stmt = db.prepare('INSERT INTO WorkflowState (id, name, "order", workflowId) VALUES (?, ?, ?, ?)');
  
  stmt.run(s1, 'Pendiente', 1, wfId);
  stmt.run(s2, 'En Progreso', 2, wfId);
  stmt.run(s3, 'Resuelto', 3, wfId);

  console.log('Created Workflow and States successfully!');
}
