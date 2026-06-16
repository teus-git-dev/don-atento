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

    console.log('\n2. Creating Workflow: Reparación Standard...');
    const wfRes = await fetch('http://localhost:3001/workflows', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        name: 'Reparación Standard QA ' + Date.now(),
        description: 'Flujo de resolución estándar para incidencias',
        states: [
          { name: 'Abierto', order: 1, color: '#FF0000' },
          { name: 'En Progreso', order: 2, color: '#FFFF00' },
          { name: 'Cerrado', order: 3, color: '#00FF00' }
        ]
      })
    });

    if (!wfRes.ok) {
      console.log('❌ Workflow creation failed. Status: ' + wfRes.status);
      console.log(await wfRes.text());
      return;
    }
    
    const wfData = await wfRes.json();
    console.log('✅ Workflow created successfully!');
    console.log(JSON.stringify(wfData, null, 2));

  } catch (err) {
    console.error('Fatal Error:', err.message);
  }
}
run();
