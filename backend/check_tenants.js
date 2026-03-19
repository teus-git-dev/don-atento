const { Client } = require('pg');
require('dotenv').config();

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  const res = await client.query('SELECT id, name FROM "Tenant"');
  console.log('--- TENANTS IN DATABASE ---');
  console.log(res.rows);
  await client.end();
}

check().catch(console.error);
