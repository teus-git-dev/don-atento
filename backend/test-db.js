process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  console.log("Setting password...");
  const hash = await bcrypt.hash('Vendiapro2025', 10);
  await pool.query('UPDATE "User" SET "passwordHash" = $1 WHERE email = \'admin@incasa.com\'', [hash]);
  console.log('Password updated for admin@incasa.com');
  pool.end();
}
run();
