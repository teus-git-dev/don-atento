// ────────────────────────────────────────────────────────────
// donatento.stress.k6.js  —  Pruebas de Estrés / Carga
// Framework: k6  (https://k6.io)
// Ejecutar:
//   k6 run donatento.stress.k6.js
//   DONATENTO_URL=https://doniq-rho.vercel.app k6 run donatento.stress.k6.js
// ────────────────────────────────────────────────────────────
import http              from 'k6/http';
import { sleep, check, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Métricas personalizadas ──────────────────────────────────
const errorRate      = new Rate('error_rate');
const aiResponseTime = new Trend('ai_response_time_ms', true);
const ticketsOk      = new Counter('successful_tickets');
const p200           = new Rate('status_200_rate');

// ── Escenarios de prueba ─────────────────────────────────────
export const options = {
  scenarios: {
    carga_sostenida: {
      executor:  'constant-vus',
      vus:        50,
      duration:  '3m',
      tags:       { escenario: 'carga_sostenida' },
    },
  },
  thresholds: {
    'http_req_duration':                       ['p(95)<2000'],  // 95% de requests < 2 s
    'http_req_failed':                         ['rate<0.01'],   // fallos HTTP < 1%
    'error_rate':                              ['rate<0.02'],   // errores lógicos < 2%
    'status_200_rate':                         ['rate>0.98'],   // 200 OK > 98%
  },
};

const BASE = __ENV.DONATENTO_URL || 'http://localhost:3001';

// ── Setup: obtener token de autenticación ────────────────────
export function setup() {
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email: 'admin@incasa.com', password: 'IncasaAdmin2026!' }),
    { headers: { 'Content-Type': 'application/json', 'Origin': 'https://doniq-rho.vercel.app' } }
  );
  
  check(res, {
    '[setup] Login OK (200)':     r => r.status === 200 || r.status === 201,
    '[setup] Token recibido':     r => !!r.json('accessToken'),
  });
  
  if (res.status !== 200 && res.status !== 201) {
    console.error('ERROR en setup — login falló:', res.body);
  }
  
  return { 
    token: res.json('accessToken'),
    tenantId: 'teus-tenant-id' // Tenant ID estático de Incasa
  };
}

// ── Función principal de usuario virtual ────────────────────
export default function (data) {
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${data.token}`,
    'Origin': 'https://doniq-rho.vercel.app'
  };

  // ── GRUPO 1: Listar Inmuebles ─────────────────────────────────
  group(`GET /properties?tenantId=${data.tenantId}`, () => {
    const r = http.get(`${BASE}/properties?tenantId=${data.tenantId}&page=1&limit=20`, { headers, tags: { name: 'get_properties' } });
    const ok = check(r, {
      'properties: status 200':      res => res.status === 200,
      'properties: < 1.5 s':         res => res.timings.duration < 1500,
    });
    errorRate.add(!ok);
    p200.add(r.status === 200);
  });
  sleep(0.5);

  // ── GRUPO 2: Listar Tickets ──────────────────────────────
  group(`GET /tickets?tenantId=${data.tenantId}`, () => {
    const r = http.get(`${BASE}/tickets?tenantId=${data.tenantId}&page=1&limit=20`, { headers, tags: { name: 'get_tickets' } });
    check(r, {
      'tickets: 200':         res => res.status === 200,
    });
    errorRate.add(r.status !== 200);
  });
  sleep(0.5);

  // ── GRUPO 3: Asistente IA Cognitivo ──────────────────────────────────
  group('POST /cognitive/process-text', () => {
    const t0   = Date.now();
    const body = JSON.stringify({
      text: 'Tenemos una tubería rota en el apto 401',
      tenantId: data.tenantId,
      phone: '+573000000000'
    });
    const r = http.post(`${BASE}/cognitive/process-text`, body, {
      headers,
      tags:    { name: 'ai_cognitive' },
      timeout: '12s',
    });
    const elapsed = Date.now() - t0;
    aiResponseTime.add(elapsed);

    check(r, {
      'IA: status 200 o 201':     res => res.status === 200 || res.status === 201,
      'IA: < 8 s':                ()  => elapsed < 8000,
    });
    
    if (r.status !== 200 && r.status !== 201) {
      errorRate.add(1);
    } else {
      ticketsOk.add(1);
    }
  });
  sleep(1);
}

// ── Teardown: resumen final ──────────────────────────────────
export function teardown(data) {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  🏁  DonAtento — Pruebas de Estrés Finalizadas');
  console.log('══════════════════════════════════════════════════');
  console.log('  ► Revisa los thresholds en el reporte de k6');
  console.log('══════════════════════════════════════════════════\n');
}
