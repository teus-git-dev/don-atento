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
    console.log('✅ Login successful!');
    const headers = { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    };

    console.log('\n2. Fetching pre-requisites (Property, User, Workflow)...');
    
    // Get property
    const propRes = await fetch('http://localhost:3001/properties', { headers });
    const propData = await propRes.json();
    const propertyId = (propData.data && propData.data.length > 0) ? propData.data[0].id : null;
    
    // Get user
    const userRes = await fetch('http://localhost:3001/users/owners', { headers });
    const userData = await userRes.json();
    const userId = (userData.data && userData.data.length > 0) ? userData.data[0].id : null;
    
    // Get workflow
    const wfRes = await fetch('http://localhost:3001/workflows', { headers });
    const wfData = await wfRes.json();
    const workflowId = (wfData.length > 0) ? wfData[0].id : null;
    let openStateId = null;
    if (workflowId && wfData[0].states) {
        openStateId = wfData[0].states.find(s => s.name === 'Abierto')?.id || wfData[0].states[0].id;
    }

    if (!propertyId || !userId) {
        console.log('❌ Missing required dependencies to create tickets. Make sure DB is seeded.');
        return;
    }

    console.log('\n3. Creating Parent Ticket...');
    const parentRes = await fetch('http://localhost:3001/tickets', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        propertyId,
        reportedByUserId: userId,
        workflowId,
        title: 'Múltiples Daños en Apartamento',
        description: 'Reporto daño eléctrico y fuga de agua.',
        priority: 'HIGH'
      })
    });
    let parentTicketId;
    if (!parentRes.ok) {
        console.log('❌ Parent ticket creation failed: ' + parentRes.status);
        console.log(await parentRes.text());
        return;
    } else {
        const pData = await parentRes.json();
        parentTicketId = pData.id;
        console.log('✅ Parent Ticket created! ID: ' + parentTicketId);
    }

    console.log('\n4. Creating Child Ticket (Plomería)...');
    const childRes = await fetch('http://localhost:3001/tickets', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        propertyId,
        reportedByUserId: userId,
        workflowId,
        parentTicketId,
        title: 'Fuga de agua lavaplatos',
        description: 'Goteo constante.',
        priority: 'MEDIUM'
      })
    });
    let childTicketId;
    if (!childRes.ok) {
        console.log('❌ Child ticket creation failed: ' + childRes.status);
        console.log(await childRes.text());
        return;
    } else {
        const cData = await childRes.json();
        childTicketId = cData.id;
        console.log('✅ Child Ticket created! ID: ' + childTicketId);
    }

    if (openStateId) {
        console.log('\n5. Transitioning Child Ticket State...');
        const trRes = await fetch(`http://localhost:3001/tickets/${childTicketId}/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                newStateId: openStateId,
                notes: 'Ticket inicializado correctamente en el flujo'
            })
        });
        if (!trRes.ok) {
            console.log('❌ Transition failed: ' + trRes.status);
            console.log(await trRes.text());
        } else {
            console.log('✅ State transitioned!');
        }
    }

    console.log('\n--- Phase 3 Test Script Completed ---');

  } catch (err) {
    console.error('Fatal Error:', err.message);
  }
}
run();
