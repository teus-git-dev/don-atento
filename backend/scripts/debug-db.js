const db = require('better-sqlite3')('dev.db');

const tenantDist = db.prepare("SELECT tenantId, count(*) as count FROM User WHERE role = 'TENANT_USER' GROUP BY tenantId").all();
console.log('Tenant ID distribution for TENANT_USER:', tenantDist);

const props = db.prepare("SELECT count(*) as count FROM Property").get().count;
console.log('Total Properties:', props);
