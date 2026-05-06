const Database = require('better-sqlite3');
const db = new Database('dev.db', { fileMustExist: true });

// Delete workflows without states
const brokenWfs = db.prepare(`
  SELECT w.id FROM Workflow w
  LEFT JOIN WorkflowState ws ON w.id = ws.workflowId
  WHERE ws.id IS NULL
`).all();

console.log('Broken Workflows:', brokenWfs);

for (const wf of brokenWfs) {
  db.prepare('DELETE FROM Workflow WHERE id = ?').run(wf.id);
  console.log('Deleted broken workflow:', wf.id);
}

// Find a good workflow
const goodWf = db.prepare('SELECT id FROM Workflow LIMIT 1').get();
if (goodWf) {
  // Fix tickets assigned to broken workflows
  const updated = db.prepare('UPDATE Ticket SET workflowId = ?').run(goodWf.id);
  console.log('Updated tickets to use good workflow:', updated.changes);
  
  // Update the current state of tickets to the 'Resuelto' state of the new workflow so we don't get foreign key errors or bad state logic later
  const firstState = db.prepare('SELECT id FROM WorkflowState WHERE workflowId = ? ORDER BY "order" ASC LIMIT 1').get(goodWf.id);
  if (firstState) {
      db.prepare('UPDATE Ticket SET currentStateId = ?').run(firstState.id);
      console.log('Updated tickets to use first state:', firstState.id);
  }
}
