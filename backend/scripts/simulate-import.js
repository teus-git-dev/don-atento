const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const fs = require('fs');

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

// Mocking the DataImportService logic locally
async function testImport() {
  const tenantId = 'teus-tenant-id';
  const categoryId = 'TENANT';
  const mapping = {
    'contact_id': 'contact_id',
    'full_name': 'full_name',
    'emails': 'emails',
    'phones': 'phones'
  };
  
  const fileBuffer = fs.readFileSync('test-tenants.csv');
  const xlsx = require('xlsx');
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawArray = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  const headers = rawArray[0];
  const dataRows = rawArray.slice(1);
  
  console.log('Headers:', headers);
  console.log('Data Rows:', dataRows.length);

  for (const row of dataRows) {
    const record = {};
    headers.forEach((h, idx) => {
      const target = mapping[h];
      if (target) record[target] = row[idx];
    });

    console.log('Processing record:', record);

    if (!record.contact_id) {
      console.log('Skipping: no contact_id');
      continue;
    }

    const governmentId = String(record.contact_id).trim();
    const email = record.emails || `no-reply-${governmentId}@test.com`;

    const data = {
      tenantId,
      firstName: record.full_name || 'Desconocido',
      lastName: '',
      governmentId,
      email,
      phone: record.phones || null,
      role: 'TENANT_USER',
      sourceTag: 'DEBUG_MANUAL_IMPORT',
      passwordHash: 'IMPORTED_NO_PASSWORD'
    };

    const user = await prisma.user.create({ data });
    console.log('User saved with ID:', user.id);
  }
}

testImport()
  .then(() => console.log('Done'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
