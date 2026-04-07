#!/usr/bin/env node
/**
 * Don Atento — Stress Test Script
 * Tests backend API resilience under concurrent load
 * 
 * Phase 5 QA: Stress & Resiliency Testing
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:3001';
const results = { success: 0, failure: 0, times: [] };

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = new URL(BASE_URL + path);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        // No JWT — testing public/401 responses for now
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const elapsed = Date.now() - start;
        results.times.push(elapsed);
        // 200, 201, 401, 403 are all valid responses (auth guard working)
        if ([200, 201, 401, 403, 404].includes(res.statusCode)) {
          results.success++;
        } else {
          results.failure++;
          console.error(`  ✗ ${method} ${path} → ${res.statusCode} (${elapsed}ms)`);
        }
        resolve({ status: res.statusCode, elapsed });
      });
    });

    req.on('error', (err) => {
      results.failure++;
      results.times.push(5000);
      console.error(`  ✗ ${method} ${path} → ERROR: ${err.message}`);
      resolve({ status: 0, elapsed: 5000 });
    });

    req.on('timeout', () => {
      req.destroy();
      results.failure++;
      results.times.push(5000);
      console.error(`  ✗ ${method} ${path} → TIMEOUT`);
      resolve({ status: 0, elapsed: 5000 });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function runStressTest() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   Don Atento — Stress Test Suite                    ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── Test 1: Health Check — 50 concurrent GET /api/docs ──────────────────
  console.log('▶ Test 1: 50 concurrent requests to GET /api/docs');
  const batch1 = Array(50).fill(null).map(() => makeRequest('/api/docs'));
  await Promise.all(batch1);
  console.log(`  ✓ Completed: ${results.success} success / ${results.failure} failure\n`);

  const snap1 = { ...results };

  // ── Test 2: Auth Endpoint — 20 concurrent POST /auth/login ──────────────
  console.log('▶ Test 2: 20 concurrent POST /auth/login (invalid creds → 401 expected)');
  const batch2 = Array(20).fill(null).map(() =>
    makeRequest('/auth/login', 'POST', { email: 'stress@test.com', password: 'wrong' }),
  );
  await Promise.all(batch2);
  console.log(`  ✓ Completed (cumulative): ${results.success} success / ${results.failure} failure\n`);

  // ── Test 3: Protected endpoint — 30 concurrent without token ────────────
  console.log('▶ Test 3: 30 concurrent GET /properties (no JWT → 401 expected, guard working)');
  const batch3 = Array(30).fill(null).map(() => makeRequest('/properties'));
  await Promise.all(batch3);
  console.log(`  ✓ Completed (cumulative): ${results.success} success / ${results.failure} failure\n`);

  // ── Test 4: WhatsApp webhook — 10 concurrent POST (public route) ─────────
  console.log('▶ Test 4: 10 concurrent POST /whatsapp/webhook (public route — non-WA event)');
  const batch4 = Array(10).fill(null).map(() =>
    makeRequest('/whatsapp/webhook', 'POST', {
      // Non-WhatsApp event — should return 200 with NOT_A_WHATSAPP_EVENT response
      source: 'stress-test',
    }),
  );
  await Promise.all(batch4);
  console.log(`  ✓ Completed (cumulative): ${results.success} success / ${results.failure} failure\n`);

  // ── Results Summary ───────────────────────────────────────────────────────
  const total = results.times.length;
  const p50 = percentile(results.times, 50);
  const p95 = percentile(results.times, 95);
  const p99 = percentile(results.times, 99);
  const avg = Math.round(results.times.reduce((a, b) => a + b, 0) / total);

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   STRESS TEST RESULTS                                ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Total Requests  : ${String(total).padEnd(33)}║`);
  console.log(`║  Successful      : ${String(results.success).padEnd(33)}║`);
  console.log(`║  Failed          : ${String(results.failure).padEnd(33)}║`);
  console.log(`║  Avg Response    : ${String(avg + 'ms').padEnd(33)}║`);
  console.log(`║  P50 Latency     : ${String(p50 + 'ms').padEnd(33)}║`);
  console.log(`║  P95 Latency     : ${String(p95 + 'ms').padEnd(33)}║`);
  console.log(`║  P99 Latency     : ${String(p99 + 'ms').padEnd(33)}║`);
  console.log('╠══════════════════════════════════════════════════════╣');

  const passed = results.failure === 0 && p95 < 2000;
  if (passed) {
    console.log('║  STATUS: ✅ PASS — Backend resiliente bajo carga     ║');
  } else {
    console.log('║  STATUS: ⚠️  REVIEW — Algunos requests excedieron SLA ║');
  }
  console.log('╚══════════════════════════════════════════════════════╝\n');

  process.exit(results.failure > 10 ? 1 : 0);
}

runStressTest().catch((err) => {
  console.error('Stress test failed:', err);
  process.exit(1);
});
