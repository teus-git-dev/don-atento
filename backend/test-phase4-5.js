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

    console.log('\n2. Fetching Accounting Journal Entries...');
    const accRes = await fetch('http://localhost:3001/accounting/journal-entries', { headers });
    if (!accRes.ok) {
        console.log('❌ Failed to fetch accounting journal entries: ' + accRes.status);
    } else {
        const accData = await accRes.json();
        console.log(`✅ Fetched ${accData.data?.length || accData.length || 0} journal entries.`);
    }

    console.log('\n3. Fetching Analytics Dashboards...');
    const funnelRes = await fetch('http://localhost:3001/crm/analytics/funnel', { headers });
    if (!funnelRes.ok) {
        console.log('❌ Failed to fetch funnel: ' + funnelRes.status);
    } else {
        console.log(`✅ CRM Funnel fetched successfully!`);
    }

    const sentimentRes = await fetch('http://localhost:3001/crm/analytics/sentiment', { headers });
    if (!sentimentRes.ok) {
        console.log('❌ Failed to fetch sentiment: ' + sentimentRes.status);
    } else {
        console.log(`✅ CRM Sentiment fetched successfully!`);
    }

    console.log('\n4. Finding a Resolved Ticket for Survey...');
    const tRes = await fetch('http://localhost:3001/tickets', { headers });
    const tData = await tRes.json();
    const resolvedTicket = (tData.data || tData).find(t => t.status === 'RESOLVED' || t.state?.name === 'Cerrado' || t.state?.name === 'RESOLVED');
    
    if (!resolvedTicket) {
        console.log('⚠️ No resolved ticket found for survey test.');
    } else {
        console.log(`Found resolved ticket: ${resolvedTicket.id}. Testing Survey Info...`);
        const surveyRes = await fetch(`http://localhost:3001/tickets/${resolvedTicket.id}/survey-info`);
        // Public endpoint might require a token query param, but we'll just check status.
        // It might be 400 or 401 if token is missing. We just want to see if it responds gracefully.
        if (surveyRes.ok || surveyRes.status === 400 || surveyRes.status === 403) {
            console.log(`✅ Survey info endpoint reached (Status: ${surveyRes.status}).`);
        } else {
            console.log(`❌ Survey info error: ${surveyRes.status}`);
        }
    }

    console.log('\n--- Phase 4 and 5 Test Script Completed ---');

  } catch (err) {
    console.error('Fatal Error:', err.message);
  }
}
run();
