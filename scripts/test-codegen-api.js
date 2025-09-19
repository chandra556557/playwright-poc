// Simple codegen API smoke test (ESM-friendly, uses built-in fetch)
// Usage: node scripts/test-codegen-api.js

const BASE = process.env.CODEGEN_BASE || 'http://localhost:3001/api/codegen';

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res.json();
}

async function main() {
  try {
    console.log('✅ Testing Codegen API at', BASE);

    // 1) Status
    const status = await getJson(`${BASE}/status`);
    console.log('\n[STATUS]\n', status);
    if (!status?.ready) {
      console.warn('Codegen service not ready. Aborting early.');
      return;
    }

    // 2) Start recording (useNativeRecording=false to avoid UI inspector)
    const startBody = {
      browserName: 'chromium',
      language: 'javascript',
      url: 'https://example.com',
      viewport: { width: 1200, height: 800 },
      testIdAttribute: 'data-testid',
      generateAssertions: true,
      healingMode: true,
      useNativeRecording: false
    };
    const start = await postJson(`${BASE}/start`, startBody);
    console.log('\n[START]\n', start);

    const sessionId = start?.data?.sessionId || start?.data?.id;
    if (!sessionId) throw new Error('No sessionId returned by /start');

    // 3) Poll session status briefly
    const session = await getJson(`${BASE}/session/${sessionId}`);
    console.log('\n[SESSION]\n', session);

    // 4) Get generated code (may be empty at first)
    const code = await getJson(`${BASE}/code/${sessionId}`);
    console.log('\n[CODE]\n', code);

    // 5) Stop recording
    const stop = await postJson(`${BASE}/stop/${sessionId}`);
    console.log('\n[STOP]\n', stop);

    // 6) Export generated test (optional)
    try {
      const exportRes = await postJson(`${BASE}/export/${sessionId}`, {
        language: 'javascript',
        filename: 'generated-login.spec.js',
        includeComments: true,
        includeHealing: true
      });
      console.log('\n[EXPORT]\n', exportRes);
    } catch (e) {
      console.warn('Export failed (this can be normal if no actions recorded):', e.message);
    }

    // 7) List sessions
    const sessions = await getJson(`${BASE}/sessions`);
    console.log('\n[SESSIONS]\n', sessions);

    console.log('\n✅ Codegen API smoke test finished');
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    process.exitCode = 1;
  }
}

main();
