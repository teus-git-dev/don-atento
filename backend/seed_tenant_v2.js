const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_Gq7ITHNoVd6l@ep-dark-king-a40b10ph-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
});

async function main() {
  try {
    const planId = "free-plan-id";
    const tenantId = "teus-tenant-id";
    
    // Create Plan
    await pool.query('INSERT INTO "SubscriptionPlan" (id, name, "priceMonthly", "maxProperties", "maxUsers") VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING', [planId, "Free Plan", 0, 100, 10]);
    
    // Create Tenant
    await pool.query('INSERT INTO "Tenant" (id, name, nit, "subscriptionPlanId") VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING', [tenantId, "Teus S.A.S", "900-123456-7", planId]);
    
    console.log("Seed completed: Tenant 'teus-tenant-id' and Plan 'free-plan-id' are ready.");
  } catch (e) {
    console.error("Seed error:", e);
  } finally {
    await pool.end();
  }
}

main();
