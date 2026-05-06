const axios = require('axios');
async function run() {
  try {
    const res = await axios.get('http://localhost:3001/api/users/tenants?page=1&limit=1000', {
      headers: {
        'tenantId': 'teus-tenant-id' // The interceptor/middleware usually sets this, but since we don't have JWT...
      }
    });
    console.log('Total returned by API:', res.data.totalRecords);
    console.log('Data count:', res.data.data.length);
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
run();
