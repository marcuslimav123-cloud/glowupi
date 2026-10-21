// Teste de ponta a ponta: sobe o Worker localmente (wrangler dev) com um Mercado Pago falso
// e confere o fluxo de Pix, o webhook, os votos, o PIN e o que NÃO pode vazar pro navegador.
// Uso: npm test
import { spawn } from 'node:child_process';
import http from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const MP_PORT = 8799, PORT = 8788, BASE = `http://127.0.0.1:${PORT}`;
const PIN = '4321', MP_TOKEN = 'TEST-token-secreto';

// ---------- Mercado Pago falso ----------
const payments = new Map();
let nextId = 9000001;
const mpServer = http.createServer((req, res) => {
  let raw = '';
  req.on('data', c => raw += c);
  req.on('end', () => {
    const send = (code, data) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };
    if (req.headers.authorization !== `Bearer ${MP_TOKEN}`) return send(401, { message: 'unauthorized' });
    if (req.method === 'POST' && req.url === '/v1/payments') {
      const b = JSON.parse(raw);
      const p = { id: nextId++, status: 'pending', transaction_amount: b.transaction_amount, external_reference: b.external_reference,
        point_of_interaction: { transaction_data: { qr_code: '00020126-falso', qr_code_base64: 'iVBORw0KGgo=' } } };
      payments.set(String(p.id), p);
      return send(201, p);
    }
    const m = req.url.match(/^\/v1\/payments\/(\d+)$/);
    if (req.method === 'GET' && m) return payments.has(m[1]) ? send(200, payments.get(m[1])) : send(404, { message: 'not found' });
    send(404, {});
  });
});
// um pagamento da conta que NÃO é deste app (não pode entrar no total)
payments.set('777', { id: 777, status: 'approved', transaction_amount: 999, external_reference: 'loja-qualquer' });

const persist = mkdtempSync(join(tmpdir(), 'nenem-'));
let wrangler;
async function start() {
  await new Promise(r => mpServer.listen(MP_PORT, '127.0.0.1', r));
  wrangler = spawn('node_modules/.bin/wrangler', ['dev', '--port', String(PORT), '--ip', '127.0.0.1', '--persist-to', persist,
    '--var', `MP_ACCESS_TOKEN:${MP_TOKEN}`, '--var', `ADMIN_PIN:${PIN}`, '--var', `MP_API_BASE:http://127.0.0.1:${MP_PORT}`],
    { stdio: ['ignore', 'pipe', 'pipe'], detached: true, env: { ...process.env, NO_PROXY: '*', no_proxy: '*' } });
  let log = '';
  wrangler.stdout.on('data', d => log += d); wrangler.stderr.on('data', d => log += d);
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(BASE + '/api/state'); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('wrangler dev não subiu:\n' + log);
}
const call = async (path, { method = 'GET', body, token } = {}) => {
  const r = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) });
  return { status: r.status, headers: r.headers, data: await r.json().catch(() => null) };
};

let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('  ok -', name); };

try {
  await start();

  await test('página abre com cabeçalhos de segurança', async () => {
    const r = await fetch(BASE + '/');
    assert.equal(r.status, 200);
    assert.match(await r.text(), /Me ajuda a nascer\?/);
    assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
  });

  await test('estado público não tem nada sensível', async () => {
    const r = await call('/api/state');
    assert.equal(r.data.mode, 'mp');
    assert.equal(r.data.total, 0);
    assert.deepEqual(Object.keys(r.data).sort(), ['babyName', 'driverName', 'fee', 'goal', 'lmp', 'mode', 'total', 'votes']);
    const txt = JSON.stringify(r.data);
    assert.ok(!txt.includes(MP_TOKEN) && !txt.includes(PIN));
  });

  await test('configuração exige PIN', async () => {
    assert.equal((await call('/api/admin/config')).status, 401);
    assert.equal((await call('/api/login', { method: 'POST', body: { pin: '0000' } })).status, 401);
  });

  let admin, device;
  await test('PIN certo abre a configuração e salva no servidor', async () => {
    const r = await call('/api/login', { method: 'POST', body: { pin: PIN } });
    assert.equal(r.status, 200);
    ({ admin, device } = r.data);
    const save = await call('/api/admin/config', { method: 'PUT', token: admin,
      body: { driverName: 'Marcus<script>', babyName: '', lmp: '2026-08-04', goal: 15000, base: 100, fee: 1, keyType: 'phone', pixKey: '11999998888', name: 'MARCUS', city: 'SAO PAULO' } });
    assert.equal(save.status, 200);
    const st = (await call('/api/state')).data;
    assert.equal(st.total, 100);
    assert.equal(st.driverName, 'Marcusscript');            // < e > são removidos
    const cfg = (await call('/api/admin/config', { token: admin })).data;
    assert.equal(cfg.config.pixKey, '11999998888');
    assert.equal(cfg.hasMp, true);
  });

  await test('token de aparelho não abre a configuração', async () => {
    assert.equal((await call('/api/admin/config', { token: device })).status, 401);
  });

  let pix;
  await test('Pix pelo Mercado Pago: cria, espera e conta uma vez só', async () => {
    assert.equal((await call('/api/pix', { method: 'POST', body: { amount: 0.5 } })).status, 400);
    pix = (await call('/api/pix', { method: 'POST', body: { amount: 18.15 } })).data;
    assert.ok(pix.id && pix.t && pix.qr_code);
    assert.equal((await call(`/api/status?id=${pix.id}&t=${pix.t}`)).data.status, 'pending');
    payments.get(pix.id).status = 'approved';
    assert.equal((await call(`/api/status?id=${pix.id}&t=${pix.t}`)).data.status, 'approved');
    // webhook do mesmo pagamento chegando depois não pode duplicar
    await call(`/api/mp/webhook?type=payment&data.id=${pix.id}`, { method: 'POST', body: { type: 'payment', data: { id: pix.id } } });
    assert.equal((await call('/api/state')).data.total, 118.15);
  });

  await test('status não responde sem o token do pagamento', async () => {
    assert.equal((await call(`/api/status?id=${pix.id}&t=errado`)).status, 403);
    assert.equal((await call(`/api/status?id=${pix.id}`)).status, 403);
  });

  await test('webhook conta Pix pago com o tablet desligado, e ignora pagamentos de fora', async () => {
    const p2 = (await call('/api/pix', { method: 'POST', body: { amount: 12.12 } })).data;
    payments.get(p2.id).status = 'approved';
    await call('/api/mp/webhook', { method: 'POST', body: { type: 'payment', data: { id: p2.id } } });
    await call('/api/mp/webhook', { method: 'POST', body: { type: 'payment', data: { id: '777' } } });
    assert.equal((await call('/api/state')).data.total, 130.27);
  });

  await test('palpite: um por Pix, só com o token do Pix', async () => {
    assert.equal((await call('/api/vote', { method: 'POST', body: { id: pix.id, t: 'x', g: 'girl' } })).status, 403);
    const v = await call('/api/vote', { method: 'POST', body: { id: pix.id, t: pix.t, g: 'girl' } });
    assert.deepEqual(v.data.votes, { boy: 0, girl: 1 });
    assert.equal((await call('/api/vote', { method: 'POST', body: { id: pix.id, t: pix.t, g: 'boy' } })).status, 409);
  });

  await test('"Já fiz o Pix" só vale no tablet pareado', async () => {
    assert.equal((await call('/api/manual', { method: 'POST', body: { amount: 20 } })).status, 401);
    const r = await call('/api/manual', { method: 'POST', token: device, body: { amount: 20 } });
    assert.equal(r.status, 200);
    assert.equal((await call('/api/state')).data.total, 150.27);
    await call('/api/admin/donation?id=' + r.data.id, { method: 'DELETE', token: admin });
    assert.equal((await call('/api/state')).data.total, 130.27);
  });

  await test('desconectar todos derruba as sessões', async () => {
    assert.equal((await call('/api/admin/logout-all', { method: 'POST', token: admin })).status, 200);
    assert.equal((await call('/api/admin/config', { token: admin })).status, 401);
    assert.equal((await call('/api/manual', { method: 'POST', token: device, body: { amount: 20 } })).status, 401);
  });

  await test('PIN: bloqueia depois de 5 tentativas', async () => {
    let last;
    for (let i = 0; i < 6; i++) last = await call('/api/login', { method: 'POST', body: { pin: 'nope' + i } });
    assert.equal(last.status, 429);
  });

  console.log(`\n${passed} testes passaram`);
} catch (e) {
  console.error('\nFALHOU:', e);
  process.exitCode = 1;
} finally {
  try { process.kill(-wrangler.pid, 'SIGTERM'); } catch {}
  mpServer.close();
  rmSync(persist, { recursive: true, force: true });
}
