require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('better-sqlite3')('./dev.db');

async function run() {
  const existing = db
    .prepare('SELECT id, email FROM User WHERE tenantId = ? AND role = ?')
    .get('teus-tenant-id', 'ADMIN_TENANT');

  if (existing) {
    console.log('✅ ADMIN_TENANT already exists:', existing.email);
    return;
  }

  const hash = await bcrypt.hash('IncasaAdmin2026!', 12);
  const id = 'admin-incasa-' + Date.now();

  db.prepare(
    `INSERT INTO User (id, tenantId, email, firstName, lastName, phone, role, passwordHash, mustChangePassword, isActive, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'))`
  ).run(
    id,
    'teus-tenant-id',
    'gerenciacomercial@incasainmobiliaria.com',
    'Martha',
    'Carvajal',
    '+573176397998',
    'ADMIN_TENANT',
    hash
  );

  console.log('✅ Created ADMIN_TENANT user');
  console.log('   ID:', id);
  console.log('   Email: gerenciacomercial@incasainmobiliaria.com');
  console.log('   Temp Password: IncasaAdmin2026!');
  console.log('   mustChangePassword: true');
}

run().catch(console.error);
