const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_Gq7ITHNoVd6l@ep-dark-king-a40b10ph-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
});

async function main() {
  try {
    const id = "teus-tenant-id";
    const name = "Teus S.A.S";
    await pool.query('INSERT INTO "Tenant" (id, name, subdomain, logo) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING', [id, name, "teus", ""]);
    console.log("Tenant 'teus-tenant-id' created successfully or already exists.");
  } catch (e) {
    console.error("Seed error:", e);
  } finally {
    await pool.end();
  }
}

main();
