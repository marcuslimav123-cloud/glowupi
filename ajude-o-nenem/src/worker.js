// Servidor do "Ajude o Neném". Serve o tablet (public/) e a API em /api/*.
// Tudo o que é sensível fica aqui: token do Mercado Pago, PIN de admin, chave Pix, doações e votos.
// O navegador só recebe o que o passageiro pode ver (nomes, gestação, meta, total e placar).
import { DurableObject } from 'cloudflare:workers';

const REF = 'ajude-o-nenem';                 // marca os pagamentos criados por este app no Mercado Pago
const MIN_AMOUNT = 1, MAX_AMOUNT = 5000;
const ADMIN_TTL = 30 * 60;                   // sessão da tela de configuração: 30 min
const DEVICE_TTL = 365 * 24 * 60 * 60;       // tablet pareado: 1 ano

const SEC_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000',
};

// ---------- utilidades ----------
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
function safeEq(a, b) {
  const x = enc.encode(String(a)), y = enc.encode(String(b));
  return x.length === y.length && crypto.subtle.timingSafeEqual(x, y);
}
const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const r2 = v => Math.round(Number(v) * 100) / 100;
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...SEC_HEADERS },
});
const fail = (error, status = 400) => json({ error }, status);
const clientIp = req => req.headers.get('cf-connecting-ip') || 'local';
const bearer = req => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
async function body(req) { try { return await req.json(); } catch { return {}; } }

const store = env => env.STORE.get(env.STORE.idFromName('main'));
let secretCache = null;                      // segredo de assinatura, gerado e guardado no banco
const appSecret = async env => secretCache ??= await store(env).secret();
const sign = async (env, kind, id) => hmac(await appSecret(env), `${kind}:${id}`);
async function verify(env, kind, id, t) { return typeof t === 'string' && safeEq(t, await sign(env, kind, id)); }

// ---------- Pix manual (BR Code estático com valor) ----------
const ascii = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '').toUpperCase().trim();
const field = (id, v) => { const s = String(v); return id + String(s.length).padStart(2, '0') + s; };
function crc16(str) {
  let c = 0xFFFF;
  for (let i = 0; i < str.length; i++) { c ^= str.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) { c = (c & 0x8000) ? ((c << 1) ^ 0x1021) : (c << 1); c &= 0xFFFF; } }
  return c.toString(16).toUpperCase().padStart(4, '0');
}
function normKey(cfg) {
  let k = (cfg.pixKey || '').trim();
  if (cfg.keyType === 'cpf') k = k.replace(/\D/g, '');
  else if (cfg.keyType === 'phone') { const d = k.replace(/\D/g, ''); k = d.startsWith('55') && d.length >= 12 ? '+' + d : '+55' + d; }
  else if (cfg.keyType === 'email') k = k.toLowerCase();
  return k;
}
function pixPayload(cfg, amount) {
  const mai = field('00', 'br.gov.bcb.pix') + field('01', normKey(cfg)) + field('02', 'AJUDE O NENEM A NASCER');
  let p = field('00', '01') + field('26', mai) + field('52', '0000') + field('53', '986') + field('54', amount.toFixed(2));
  p += field('58', 'BR') + field('59', ascii(cfg.name).slice(0, 25) || 'DOACAO') + field('60', ascii(cfg.city).slice(0, 15) || 'BRASIL');
  p += field('62', field('05', '***')) + '6304';
  return p + crc16(p);
}

// ---------- Mercado Pago ----------
const mpBase = env => env.MP_API_BASE || 'https://api.mercadopago.com';
async function mp(env, path, init = {}) {
  const res = await fetch(mpBase(env) + path, {
    ...init,
    headers: { authorization: `Bearer ${(env.MP_ACCESS_TOKEN || env.MP_TOKEN)}`, 'content-type': 'application/json', ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${data.message || 'erro'}`);
  return data;
}
// Brasília, no formato que o Mercado Pago aceita (yyyy-MM-ddTHH:mm:ss.SSS-03:00)
const brTime = ms => new Date(ms - 3 * 3600e3).toISOString().replace('Z', '-03:00');

async function createMpPix(env, url, amount) {
  const payload = {
    transaction_amount: amount,
    description: 'Ajude o neném a nascer',
    payment_method_id: 'pix',
    external_reference: `${REF}:${crypto.randomUUID()}`,
    date_of_expiration: brTime(Date.now() + 30 * 60e3),
    payer: { email: env.PAYER_EMAIL || 'doador@ajude-o-nenem.app' },
  };
  if (url.protocol === 'https:') payload.notification_url = new URL('/api/mp/webhook', url).href;
  const p = await mp(env, '/v1/payments', { method: 'POST', headers: { 'x-idempotency-key': crypto.randomUUID() }, body: JSON.stringify(payload) });
  const tx = p.point_of_interaction?.transaction_data || {};
  if (!tx.qr_code) throw new Error('Mercado Pago não devolveu o QR');
  return { id: String(p.id), qr_code: tx.qr_code, qr_code_base64: tx.qr_code_base64 || null };
}

// Busca o pagamento direto no Mercado Pago (nunca confia no que chegou de fora) e registra se aprovado.
async function syncMpPayment(env, id) {
  if (!/^\d{1,20}$/.test(String(id))) return null;
  const p = await mp(env, `/v1/payments/${id}`);
  if (!String(p.external_reference || '').startsWith(REF + ':')) return null;   // pagamento de outra coisa da conta
  const amount = r2(p.transaction_amount);
  if (p.status === 'approved') await store(env).recordDonation(String(p.id), amount, 'mp');
  return { status: p.status, amount };
}

// ---------- validação da configuração ----------
const str = (v, max) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, max);
const num = (v, min, max, dflt) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, r2(n))) : dflt; };
function cleanConfig(c) {
  return {
    driverName: str(c.driverName, 40),
    babyName: str(c.babyName, 40),
    lmp: /^\d{4}-\d{2}-\d{2}$/.test(c.lmp || '') ? c.lmp : '',
    goal: num(c.goal, 100, 10_000_000, 15000),
    base: num(c.base, 0, 10_000_000, 0),
    fee: num(c.fee, 0, 10, 1),
    keyType: ['cpf', 'phone', 'email', 'random'].includes(c.keyType) ? c.keyType : 'phone',
    pixKey: str(c.pixKey, 77),
    name: str(c.name, 25),
    city: str(c.city, 15),
  };
}

// ---------- rotas ----------
async function api(req, env, url) {
  const path = url.pathname, method = req.method, db = store(env);
  const hasMp = !!(env.MP_ACCESS_TOKEN || env.MP_TOKEN);

  if (path === '/api/state' && method === 'GET') return json(await db.publicState(hasMp));

  if (path === '/api/pix' && method === 'POST') {
    if (!(await db.hit('pix:' + clientIp(req), 30, 600))) return fail('Muitas tentativas. Espera uns minutinhos.', 429);
    const amount = r2((await body(req)).amount);
    if (!(amount >= MIN_AMOUNT && amount <= MAX_AMOUNT)) return fail(`Valor entre R$ ${MIN_AMOUNT} e R$ ${MAX_AMOUNT}.`);
    const manual = async () => {
      const cfg = await db.config();
      return cfg.pixKey && cfg.name && cfg.city ? { manual: true, amount, qr_code: pixPayload(cfg, amount) } : null;
    };
    if (hasMp) {
      try {
        const pix = await createMpPix(env, url, amount);
        return json({ ...pix, amount, t: await sign(env, 'pay', pix.id) });
      } catch (e) {
        console.error('pix', e.message);
        const m = await manual();
        return m ? json({ ...m, fallback: true }) : fail('Servidor do Pix indisponível agora.', 502);
      }
    }
    const m = await manual();
    return m ? json(m) : fail('O Pix ainda não foi configurado.', 503);
  }

  if (path === '/api/status' && method === 'GET') {
    const id = url.searchParams.get('id') || '';
    if (!hasMp || !(await verify(env, 'pay', id, url.searchParams.get('t')))) return fail('Não autorizado.', 403);
    const s = await syncMpPayment(env, id);
    return s ? json(s) : fail('Pagamento não encontrado.', 404);
  }

  if (path === '/api/mp/webhook' && method === 'POST') {
    // O Mercado Pago avisa aqui quando um Pix muda. Conferimos direto na API dele antes de contar.
    const b = await body(req);
    const id = url.searchParams.get('data.id') || url.searchParams.get('id') || b?.data?.id;
    const type = url.searchParams.get('type') || url.searchParams.get('topic') || b?.type || b?.topic;
    if (hasMp && id && (!type || type === 'payment')) { try { await syncMpPayment(env, id); } catch (e) { console.error('webhook', e.message); } }
    return json({ ok: true });
  }

  if (path === '/api/manual' && method === 'POST') {
    // "Já fiz o Pix" no modo manual: só o tablet pareado pelo dono pode somar no total.
    if (!(await db.checkToken(await sha256(bearer(req)), 'device'))) return fail('Este aparelho não está pareado.', 401);
    const amount = r2((await body(req)).amount);
    if (!(amount >= MIN_AMOUNT && amount <= MAX_AMOUNT)) return fail('Valor inválido.');
    const id = 'm-' + crypto.randomUUID();
    await db.recordDonation(id, amount, 'manual');
    return json({ id, t: await sign(env, 'pay', id) });
  }

  if (path === '/api/vote' && method === 'POST') {
    const { id, t, g } = await body(req);
    if (!['boy', 'girl'].includes(g) || !(await verify(env, 'pay', String(id), t))) return fail('Voto inválido.', 403);
    const r = await db.vote(String(id), g);
    return r.ok ? json(r) : fail(r.error, 409);
  }

  if (path === '/api/login' && method === 'POST') {
    if (!env.ADMIN_PIN) return fail('Falta configurar o ADMIN_PIN no servidor.', 503);
    if (!(await db.hit('login:' + clientIp(req), 5, 900))) return fail('Muitas tentativas. Tenta de novo em 15 minutos.', 429);
    const { pin } = await body(req);
    if (!safeEq(await sha256(String(pin || '')), await sha256(env.ADMIN_PIN))) return fail('PIN errado.', 401);
    const admin = randomToken(), device = randomToken();
    await db.addToken(await sha256(admin), 'admin', ADMIN_TTL);
    await db.addToken(await sha256(device), 'device', DEVICE_TTL);
    return json({ admin, device });
  }

  if (path.startsWith('/api/admin/')) {
    if (!(await db.checkToken(await sha256(bearer(req)), 'admin'))) return fail('Sessão expirada. Digite o PIN de novo.', 401);
    if (path === '/api/admin/config' && method === 'GET') return json({ ...(await db.adminState()), hasMp });
    if (path === '/api/admin/config' && method === 'PUT') { await db.saveConfig(cleanConfig(await body(req))); return json({ ok: true }); }
    if (path === '/api/admin/donation' && method === 'DELETE') { await db.removeManual(url.searchParams.get('id') || ''); return json({ ok: true }); }
    if (path === '/api/admin/reset' && method === 'POST') { await db.reset(); return json({ ok: true }); }
    if (path === '/api/admin/logout-all' && method === 'POST') { await db.clearTokens(); return json({ ok: true }); }
  }

  return fail('Não encontrado.', 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await api(req, env, url); }
      catch (e) { console.error(e); return fail('Erro no servidor.', 500); }
    }
    const res = await env.ASSETS.fetch(req);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(SEC_HEADERS)) out.headers.set(k, v);
    return out;
  },
};

// ---------- banco (uma instância só, consistente) ----------
const DEFAULTS = { driverName: '', babyName: '', lmp: '2026-08-04', goal: 15000, base: 0, fee: 1, keyType: 'phone', pixKey: '', name: '', city: '' };

export class Store extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.hits = new Map();
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS donations (id TEXT PRIMARY KEY, amount REAL NOT NULL, ts INTEGER NOT NULL, source TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS votes (id TEXT PRIMARY KEY, g TEXT NOT NULL, ts INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS tokens (hash TEXT PRIMARY KEY, kind TEXT NOT NULL, exp INTEGER NOT NULL);
    `);
  }
  get(k) { const r = this.sql.exec('SELECT v FROM kv WHERE k = ?', k).toArray()[0]; return r ? r.v : null; }
  set(k, v) { this.sql.exec('INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', k, v); }

  secret() { let s = this.get('secret'); if (!s) { s = randomToken(); this.set('secret', s); } return s; }
  config() { return { ...DEFAULTS, ...JSON.parse(this.get('config') || '{}') }; }
  saveConfig(cfg) { this.set('config', JSON.stringify(cfg)); }

  votes() {
    const v = { boy: 0, girl: 0 };
    for (const r of this.sql.exec('SELECT g, COUNT(*) AS n FROM votes GROUP BY g')) v[r.g] = r.n;
    return v;
  }
  publicState(hasMp) {
    const c = this.config();
    const sum = this.sql.exec('SELECT COALESCE(SUM(amount), 0) AS s FROM donations').one().s;
    return {
      driverName: c.driverName, babyName: c.babyName, lmp: c.lmp, goal: c.goal, fee: c.fee,
      total: r2(c.base + sum), votes: this.votes(),
      mode: hasMp ? 'mp' : (c.pixKey && c.name && c.city ? 'manual' : 'off'),
    };
  }
  adminState() {
    const donations = this.sql.exec('SELECT id, amount, ts, source FROM donations ORDER BY ts DESC LIMIT 300').toArray();
    return { config: this.config(), donations };
  }

  recordDonation(id, amount, source) {
    // INSERT OR IGNORE: o mesmo Pix avisado pelo tablet e pelo webhook conta uma vez só
    this.sql.exec('INSERT OR IGNORE INTO donations (id, amount, ts, source) VALUES (?, ?, ?, ?)', id, amount, Date.now(), source);
  }
  removeManual(id) { this.sql.exec("DELETE FROM donations WHERE id = ? AND source = 'manual'", id); }
  reset() { this.sql.exec('DELETE FROM donations'); this.sql.exec('DELETE FROM votes'); }

  vote(id, g) {
    if (!this.sql.exec('SELECT 1 FROM donations WHERE id = ?', id).toArray().length) return { ok: false, error: 'Doação não encontrada.' };
    const w = this.sql.exec('INSERT OR IGNORE INTO votes (id, g, ts) VALUES (?, ?, ?)', id, g, Date.now()).rowsWritten;
    if (!w) return { ok: false, error: 'Esse Pix já deu palpite.' };
    return { ok: true, votes: this.votes() };
  }

  addToken(hash, kind, ttlSec) {
    const now = Math.floor(Date.now() / 1000);
    this.sql.exec('DELETE FROM tokens WHERE exp < ?', now);
    this.sql.exec('INSERT INTO tokens (hash, kind, exp) VALUES (?, ?, ?)', hash, kind, now + ttlSec);
  }
  checkToken(hash, kind) {
    return this.sql.exec('SELECT 1 FROM tokens WHERE hash = ? AND kind = ? AND exp > ?', hash, kind, Math.floor(Date.now() / 1000)).toArray().length > 0;
  }
  clearTokens() { this.sql.exec('DELETE FROM tokens'); }

  // limite simples por IP (em memória; zera se o banco dormir, o que é aceitável pra isso)
  hit(key, limit, windowSec) {
    const now = Date.now(), h = this.hits.get(key);
    if (!h || now - h.since > windowSec * 1000) { this.hits.set(key, { n: 1, since: now }); return true; }
    h.n++;
    return h.n <= limit;
  }
}
