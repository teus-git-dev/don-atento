async function run() {
  try {
    console.log('1. Attempting login as admin@incasa.com...');
    const res = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@incasa.com', password: 'Vendiapro2025' })
    });
    
    if (!res.ok) {
        console.log('Could not login.');
        return;
    }
    
    const data = await res.json();
    const token = data.accessToken || data.token;
    const headers = { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    };

    console.log('\n2. Fetching pre-requisites (Property, User, Workflow)...');
    
    // Get workflow
    const wfRes = await fetch('http://localhost:3001/workflows', { headers });
    const wfData = await wfRes.json();
    const workflowId = (wfData.length > 0) ? wfData[0].id : null;
    let inProgressStateId = null;
    if (workflowId && wfData[0].states) {
        inProgressStateId = wfData[0].states.find(s => s.name === 'En Progreso')?.id;
    }

    // Get Tickets
    const tRes = await fetch('http://localhost:3001/tickets', { headers });
    const tData = await tRes.json();
    const childTicket = (tData.data || tData).find(t => t.parentTicketId !== null);
    
    if (!childTicket) {
        console.log('❌ No child ticket found to transition.');
        return;
    }

    if (inProgressStateId) {
        console.log('\n3. Transitioning Ticket to "En Progreso"...');
        const trRes = await fetch(`http://localhost:3001/tickets/${childTicket.id}/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                newStateId: inProgressStateId,
                notes: 'Técnico en camino'
            })
        });
        if (!trRes.ok) {
            console.log('❌ Transition failed: ' + trRes.status);
            console.log(await trRes.text());
        } else {
            console.log('✅ Ticket transitioned successfully!');
        }
    }

    console.log('\n4. Resolving Ticket...');
    const resolveRes = await fetch(`http://localhost:3001/tickets/${childTicket.id}/resolve`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
            closureReason: 'Se reparó la tubería con éxito. Cliente satisfecho.',
        })
    });
    if (!resolveRes.ok) {
        console.log('❌ Resolve failed: ' + resolveRes.status);
        console.log(await resolveRes.text());
    } else {
        console.log('✅ Ticket resolved successfully!');
    }

    console.log('\n--- Phase 3 Part 2 Test Script Completed ---');

  } catch (err) {
    console.error('Fatal Error:', err.message);
  }
}
run();
