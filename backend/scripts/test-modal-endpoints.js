const axios = require('axios');

async function run() {
  const tenantId = 'teus-tenant-id'; // assuming this is it
  try {
    const props = await axios.get('http://localhost:3001/api/properties?tenantId=' + tenantId).catch(e => e.response);
    const wfs = await axios.get('http://localhost:3001/api/workflows?tenantId=' + tenantId).catch(e => e.response);
    const techs = await axios.get('http://localhost:3001/api/users/technicians?tenantId=' + tenantId).catch(e => e.response);
    
    console.log('Props is array?', Array.isArray(props.data), 'Props keys:', Object.keys(props.data || {}));
    console.log('WFs is array?', Array.isArray(wfs.data), 'WFs keys:', Object.keys(wfs.data || {}));
    console.log('Techs is array?', Array.isArray(techs.data), 'Techs keys:', Object.keys(techs.data || {}));
  } catch (e) {
    console.error(e);
  }
}
run();
