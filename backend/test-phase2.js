async function run() {
  try {
    console.log('1. Attempting login as admin@incasa.com...');
    const res = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@incasa.com', password: 'Vendiapro2025' })
    });
    
    if (!res.ok) {
        console.log('Could not login. Status: ' + res.status);
        console.log(await res.text());
        return;
    }
    
    const data = await res.json();
    const token = data.accessToken || data.token;
    console.log('✅ Login successful! Token acquired.');
    const headers = { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    };

    console.log('\n2. Creating CRM Prospect...');
    const prospectRes = await fetch('http://localhost:3001/crm/prospects', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        firstName: 'Juan',
        lastName: 'Pérez QA',
        email: 'juan.perez.qa@example.com',
        phone: '+573000000000',
        source: 'MANUAL'
      })
    });
    if (!prospectRes.ok) {
        console.log('❌ Prospect creation failed: ' + prospectRes.status);
        console.log(await prospectRes.text());
    } else {
        console.log('✅ CRM Prospect created!');
    }

    console.log('\n3. Creating Provider (Plumber)...');
    const provRes = await fetch('http://localhost:3001/providers', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Plomería Total QA',
        contactName: 'Carlos',
        contactLastName: 'Fontanero',
        phone: '+573111111111',
        email: 'contacto@plomeriatotal.com',
        specialty: 'PLUMBING'
      })
    });
    if (!provRes.ok) {
        console.log('❌ Provider creation failed: ' + provRes.status);
        console.log(await provRes.text());
    } else {
        console.log('✅ Provider created!');
    }

    console.log('\n4. Validating Owners and Tenants loading...');
    const ownersRes = await fetch('http://localhost:3001/users/owners', { headers });
    const tenantsRes = await fetch('http://localhost:3001/users/tenants', { headers });
    if (ownersRes.ok && tenantsRes.ok) {
        const owners = await ownersRes.json();
        const tenants = await tenantsRes.json();
        console.log(`✅ Loaded ${owners.data?.length || owners.length || 0} Owners and ${tenants.data?.length || tenants.length || 0} Tenants successfully.`);
    } else {
        console.log('❌ Failed to load users.');
    }

    console.log('\n5. Creating Inventory Template...');
    const invRes = await fetch('http://localhost:3001/inventory-templates', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Plantilla Apartamento Estandar QA',
        description: 'Plantilla de inventario base',
        zones: [
          {
            name: 'Sala',
            items: [
              { name: 'Puerta Principal' },
              { name: 'Pintura Paredes' }
            ]
          }
        ]
      })
    });
    if (!invRes.ok) {
        console.log('❌ Inventory template creation failed: ' + invRes.status);
        console.log(await invRes.text());
    } else {
        console.log('✅ Inventory Template created!');
    }

    console.log('\n--- Phase 2 Test Script Completed ---');

  } catch (err) {
    console.error('Fatal Error:', err.message);
  }
}
run();
