const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testApiImport() {
  const API_URL = 'http://localhost:3001/api';
  const TENANT_ID = 'teus-tenant-id';
  
  // 1. Upload to get headers and mapping (simulated)
  // 2. Execute import
  const form = new FormData();
  form.append('file', fs.createReadStream('test-tenants.csv'));
  form.append('tenantId', TENANT_ID);
  form.append('categoryId', 'TENANT');
  form.append('mapping', JSON.stringify({
    'contact_id': 'contact_id',
    'full_name': 'full_name',
    'emails': 'emails',
    'phones': 'phones'
  }));

  try {
    console.log('Sending import request to backend...');
    const res = await axios.post(`${API_URL}/data-import/execute`, form, {
      headers: form.getHeaders()
    });
    console.log('API Response:', res.data);
  } catch (err) {
    console.error('API Error:', err.response ? err.response.data : err.message);
  }
}

testApiImport();
