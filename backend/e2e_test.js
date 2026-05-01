const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const API = 'http://localhost:3000/api/data-import';
const tenantId = 'teus-tenant-id';

async function importFile(filePath, categoryId, mapping) {
  try {
    // 1. Save Template
    console.log(`Saving template for ${categoryId}...`);
    const tplRes = await axios.post(`${API}/templates`, {
      tenantId, name: `Test ${categoryId}`, categoryId, mapping
    });
    
    // 2. Upload and Execute
    console.log(`Executing import for ${categoryId}...`);
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('tenantId', tenantId);
    form.append('templateId', tplRes.data.id);
    form.append('categoryId', categoryId);
    
    const res = await axios.post(`${API}/execute`, form, { headers: form.getHeaders() });
    console.log(`[SUCCESS] ${categoryId}: Saved ${res.data.recordsSaved} of ${res.data.recordsRead} records. Errors: ${res.data.errors?.length || 0}`);
    return res.data;
  } catch (err) {
    console.error(`[ERROR] ${categoryId}:`, err.response?.data || err.message);
  }
}

const mapTenant = {
  'Cedula': 'contact_id',
  'Arrendatario': 'full_name',
  'Email': 'emails',
  'Celular 1': 'phones'
};

const mapOwner = {
  'Cedula': 'contact_id',
  'Propietario': 'full_name',
  'Email': 'emails',
  'Celular 1': 'phones'
};

const mapProp = {
  'Referencia': 'property_id',
  'IdInmueble': 'property_id',
  'Direccion': 'address',
  'Ciudad': 'city',
  'Vr Canon': 'financials.canon',
  'Vr Administracion': 'financials.admin'
};

async function runAll() {
  await importFile('C:/TeusDev/DonAtento/ARRENDATARIOS MARZO 17 DE 2026.xls', 'TENANT', mapTenant);
  await importFile('C:/TeusDev/DonAtento/PROPIETARIOS MARZO 17 DE 2026.xls', 'OWNER', mapOwner);
  await importFile('C:/TeusDev/DonAtento/INMUEBLES MARZO 17 DE 2026.xls', 'PROPERTY', mapProp);
}

runAll();
