// Custom Genie server: serves the studio and draws logos with Nano Banana Pro (Gemini 3 Pro Image).
//
// Why a server: the Google API key must never be in the web page (anyone could copy it from the
// page source and spend on your account). The page calls /api/genie/*; only this server talks to Google.
//
// Run:   node server.mjs        (Node 18 or newer, no npm install needed)
// Key:   put your key in the .env file next to this script. Changes are picked up without a restart.
//        Google Gemini key (AIza…):  GEMINI_API_KEY=...
//        OpenRouter key (sk-or-…):   OPENROUTER_API_KEY=...   (an sk-or- key under GEMINI_API_KEY also works)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(DIR, 'public');
const ENV_FILE = path.join(DIR, '.env');
const GOOGLE = 'https://generativelanguage.googleapis.com';
const KEY_NAMES = ['OPENROUTER_API_KEY', 'OPEN_ROUTER_API_KEY', 'OPENROUTER_KEY', 'NANO_BANANA_API_KEY', 'NANO_BANANA_PRO_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'API_KEY'];
const blankKey = v => /^(|paste.*|your.*|xxx.*)$/i.test(v);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- settings (.env, re-read when the file changes) ---------- */
let envCache = { mtime: -1, vals: {} };
function readEnv() {
  try {
    const st = fs.statSync(ENV_FILE);
    if (st.mtimeMs !== envCache.mtime) {
      const vals = {};
      for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
        if (/^\s*#/.test(line)) continue;
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (m) { const v = m[2]; vals[m[1]] = /^(["']).*\1$/.test(v) ? v.slice(1, -1) : v.replace(/\s+#.*$/, ''); }
      }
      envCache = { mtime: st.mtimeMs, vals };
    }
  } catch { envCache = { mtime: -1, vals: {} }; }
  return (k) => process.env[k] ?? envCache.vals[k];
}
function cfg() {
  const g = readEnv();
  let key = '', from = '';
  for (const n of KEY_NAMES) { const v = (g(n) || '').trim().replace(/^Bearer\s+/i, ''); if (!blankKey(v)) { key = v; from = n; break; } }
  const want = (g('GENIE_PROVIDER') || '').trim().toLowerCase();
  const provider = want === 'google' || want === 'openrouter' ? want : (/^sk-or-/i.test(key) || /OPEN_?ROUTER/.test(from) ? 'openrouter' : 'google');
  let model = (g('GENIE_IMAGE_MODEL') || 'gemini-3-pro-image').trim();
  if (provider === 'openrouter' && !model.includes('/')) model = 'google/' + model;            // OpenRouter ids are vendor/model
  if (provider === 'google') model = model.replace(/^google\//, '');
  return {
    key, provider,
    orBase: (g('OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1').replace(/\/+$/, ''),
    siteUrl: g('GENIE_SITE_URL') || process.env.RENDER_EXTERNAL_URL || 'http://localhost:8765',
    model,
    perRequest: clamp(parseInt(g('GENIE_IMAGES_PER_REQUEST') || '2', 10) || 2, 1, 4),
    size: /^(1K|2K|4K)$/.test(g('GENIE_IMAGE_SIZE') || '') ? g('GENIE_IMAGE_SIZE') : '2K',
    ratePer10Min: Math.max(1, parseInt(g('GENIE_RATE_PER_10MIN') || '8', 10) || 8),
    dailyImages: Math.max(1, parseInt(g('GENIE_DAILY_IMAGE_LIMIT') || '200', 10) || 200),
    origins: (g('GENIE_ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean),
    mock: g('GENIE_MOCK') === '1',
    teamPassword: (g('GENIE_TEAM_PASSWORD') || '').trim(),
    port: parseInt(g('PORT') || '8765', 10) || 8765,
    host: g('HOST') || (process.env.RENDER ? '0.0.0.0' : '127.0.0.1'),   // on Render listen publicly; on your PC only locally
  };
}

/* ---------- limits: per visitor and per day, so nobody can run up the bill ---------- */
const hits = new Map(); let day = { date: '', images: 0 };
function allow(ip, c, n) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 600000);
  if (list.length >= c.ratePer10Min) return 'You have made a lot of requests. Please wait a few minutes and try again.';
  const today = new Date().toISOString().slice(0, 10);
  if (day.date !== today) day = { date: today, images: 0 };
  if (day.images + n > c.dailyImages) return 'Genie has reached today\'s logo limit. Please try again tomorrow, or use the built-in layouts.';
  list.push(now); hits.set(ip, list); day.images += n; return null;
}

/* ---------- prompts ---------- */
const SHAPE_WORDS = { circle: 'circle', oval: 'oval', rect: 'rectangle', square: 'square', stadium: 'rounded pill shape', custom: 'die-cut shape that follows the outline of the artwork' };
const VARIANTS = ['a bold emblem or badge', 'a clean, modern mark', 'a vintage, hand-crafted look', 'a playful illustrated mascot'];
const s = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
function genPrompt(o, i, n) {
  const L = ['Design an original logo artwork for a custom printed domed vinyl sticker.', `Customer request: "${s(o.prompt, 600)}"`];
  if (o.name) L.push(`Include this text, spelled exactly: "${s(o.name, 40)}"${o.tagline ? ` and the tagline "${s(o.tagline, 60)}"` : ''}. Make the lettering large, bold and easy to read on a small sticker.`);
  if (Array.isArray(o.colors) && o.colors.length) L.push(`Colors to use: ${o.colors.slice(0, 5).map(c => s(c, 20)).join(', ')}.`);
  if (SHAPE_WORDS[o.shape]) L.push(`The sticker is cut as a ${SHAPE_WORDS[o.shape]}; compose the artwork to fill that shape nicely.`);
  L.push('Print requirements: flat, vector-style graphic with clean crisp edges and solid colors; no photographic textures, no tiny details, no hairline strokes. Center the artwork with a comfortable margin on a plain, solid, pure white (#FFFFFF) background. Draw only the artwork itself: no sticker mockup, no product photo, no scene, no frame around the canvas, no drop shadow, no watermark.');
  if (n > 1) L.push(`For variety, lean toward ${VARIANTS[i % VARIANTS.length]} if it suits the request.`);
  return L.join('\n');
}
function editPrompt(o) {
  return [`Edit this sticker logo: ${s(o.prompt, 600)}`,
    'Change only what is asked. Keep the same layout, style and exact spelling of any text unless the request says otherwise.',
    'Keep it print-ready: flat vector-style artwork, solid colors, crisp edges, on a plain solid pure white (#FFFFFF) background, with no mockup, frame, shadow or watermark.'].join('\n');
}
const RATIOS = ['1:1', '3:2', '2:3', '4:3', '3:4', '5:4', '4:5', '16:9', '9:16', '21:9', '4:1', '1:4'];
const OR_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];   // what OpenRouter accepts for Nano Banana Pro
function ratioFor(size, shape, list = RATIOS) {
  if (!size || !(size.w > 0) || !(size.h > 0) || shape === 'circle' || shape === 'square') return '1:1';
  const r = Math.log(size.w / size.h);
  return list.reduce((b, x) => { const [a, c] = x.split(':').map(Number); return Math.abs(Math.log(a / c) - r) < Math.abs(Math.log(b.split(':')[0] / b.split(':')[1]) - r) ? x : b; }, '1:1');
}

/* ---------- Google call (newer and older field names, stable and preview model ids) ---------- */
let working = null;
class GenieError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
/* setup problems: the details go to the server log for you; customers see a neutral message */
const SETUP = new Set(['KEY_INVALID', 'KEY_FORBIDDEN', 'MODEL_UNAVAILABLE', 'NOT_CONFIGURED', 'NO_CREDITS']);
const PUBLIC_SETUP_MSG = 'Genie can\'t draw logos right now.';
async function gemini(c, parts, aspect) {
  const models = [c.model, ...(c.model === 'gemini-3-pro-image' ? ['gemini-3-pro-image-preview'] : [])];
  let combos = [];
  for (const model of models) for (const ver of ['v1', 'v1beta']) for (const fmt of ['responseFormat', 'imageConfig']) combos.push({ model, ver, fmt });
  if (working) combos = [working, ...combos.filter(x => JSON.stringify(x) !== JSON.stringify(working))];
  let last = null;
  for (const cb of combos) {
    const img = { aspectRatio: aspect, imageSize: c.size };
    const generationConfig = cb.fmt === 'responseFormat'
      ? { responseModalities: ['TEXT', 'IMAGE'], responseFormat: { image: img } }
      : { responseModalities: ['TEXT', 'IMAGE'], imageConfig: img };
    let r, j;
    try {
      r = await fetch(`${GOOGLE}/${cb.ver}/models/${encodeURIComponent(cb.model)}:generateContent`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': c.key },
        body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig }), signal: AbortSignal.timeout(170000),
      });
      j = await r.json().catch(() => ({}));
    } catch (e) { throw new GenieError(504, 'UPSTREAM_TIMEOUT', 'Nano Banana Pro took too long to answer. Please try again.'); }
    if (r.ok) {
      const cand = (j.candidates || [])[0] || {}, ps = (cand.content && cand.content.parts) || [];
      const images = ps.filter(p => (p.inlineData || p.inline_data) && !p.thought).map(p => { const d = p.inlineData || p.inline_data; return { mime: d.mimeType || d.mime_type || 'image/png', data: d.data }; });
      const text = ps.filter(p => p.text && !p.thought).map(p => p.text).join(' ').trim();
      if (!images.length) {
        const why = (j.promptFeedback && j.promptFeedback.blockReason) || cand.finishReason || '';
        if (/SAFETY|PROHIBITED|BLOCK|RECITATION|IMAGE_/i.test(why)) throw new GenieError(422, 'CONTENT_BLOCKED', 'Nano Banana Pro can\'t make that design. Try describing it differently, and avoid other brands\' logos or characters.');
        throw new GenieError(502, 'NO_IMAGE', 'Nano Banana Pro didn\'t return an image that time. Please try again.');
      }
      working = cb; return { images: [images[images.length - 1]], text };
    }
    const msg = (j.error && j.error.message) || `HTTP ${r.status}`, st = (j.error && j.error.status) || '';
    last = { status: r.status, msg, st };
    if (r.status === 404) continue;                                                     // model id / API version not available: try the next
    if (r.status === 400 && /unknown name|cannot find field|invalid json payload|responseFormat|imageConfig|not supported/i.test(msg)) continue; // field naming differs: try the other
    if (r.status === 400 && /api key|API_KEY/i.test(msg)) throw new GenieError(401, 'KEY_INVALID', 'The Google API key on the server was rejected. Check GEMINI_API_KEY in the .env file.');
    if (r.status === 403) throw new GenieError(403, 'KEY_FORBIDDEN', 'The Google API key can\'t use Nano Banana Pro. Make sure billing is enabled for the key\'s project (Nano Banana Pro has no free tier).');
    if (r.status === 429) throw new GenieError(429, 'QUOTA', 'Nano Banana Pro is busy or the account\'s quota is used up. Please try again in a minute.');
    if (r.status === 400 && /safety|blocked|policy/i.test(msg)) throw new GenieError(422, 'CONTENT_BLOCKED', 'Nano Banana Pro can\'t make that design. Try describing it differently.');
    throw new GenieError(502, 'UPSTREAM', `Nano Banana Pro returned an error (${r.status}). Please try again.`);
  }
  console.error('[genie] no working model/format combination:', last && `${last.status} ${last.st} ${last.msg}`);
  throw new GenieError(502, 'MODEL_UNAVAILABLE', `The image model "${c.model}" isn't available for this key. Check GENIE_IMAGE_MODEL in .env.`);
}

/* ---------- OpenRouter call (Images API, with chat-completions fallback) ---------- */
let orWorking = null;
async function openrouter(c, prompt, ref, aspect, ip) {
  const models = [c.model, ...(/-preview$/.test(c.model) ? [] : [c.model + '-preview'])];
  const routes = []; for (const model of models) routes.push({ route: 'images', model }); routes.push({ route: 'chat', model: c.model });
  const order = orWorking ? [orWorking, ...routes.filter(x => x.route !== orWorking.route || x.model !== orWorking.model)] : routes;
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${c.key}`, 'http-referer': c.siteUrl, 'x-title': 'Custom Genie' };
  const user = crypto.createHash('sha256').update('genie:' + ip).digest('hex').slice(0, 24);   // lets OpenRouter spot abuse per visitor, never the raw IP
  let last = null;
  for (const rt of order) {
    const body = rt.route === 'images'
      ? { model: rt.model, prompt, n: 1, resolution: c.size, aspect_ratio: aspect, user, ...(ref ? { input_references: [{ type: 'image_url', image_url: { url: ref } }] } : {}) }
      : { model: rt.model, modalities: ['image', 'text'], image_config: { aspect_ratio: aspect, image_size: c.size }, user,
          messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, ...(ref ? [{ type: 'image_url', image_url: { url: ref } }] : [])] }] };
    let r, j;
    try {
      r = await fetch(`${c.orBase}/${rt.route === 'images' ? 'images' : 'chat/completions'}`, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(170000) });
      j = await r.json().catch(() => ({}));
    } catch (e) { throw new GenieError(504, 'UPSTREAM_TIMEOUT', 'Nano Banana Pro took too long to answer. Please try again.'); }
    if (r.ok) {
      let im = null;
      if (rt.route === 'images') { const d = (j.data || []).find(x => x && x.b64_json); if (d) im = { mime: d.media_type || 'image/png', data: d.b64_json }; }
      else { const msg = ((j.choices || [])[0] || {}).message || {}, u = (((msg.images || [])[0] || {}).image_url || {}).url || ''; const m = u.match(/^data:([^;]+);base64,(.+)$/); if (m) im = { mime: m[1], data: m[2] }; }
      if (!im) throw new GenieError(502, 'NO_IMAGE', 'Nano Banana Pro didn\'t return an image that time. Please try again.');
      orWorking = rt;
      const cost = j.usage && typeof j.usage.cost === 'number' ? j.usage.cost : null;
      return { images: [im], text: '', cost };
    }
    const msg = (j.error && (j.error.message || j.error.code)) || `HTTP ${r.status}`; last = { status: r.status, msg };
    if (r.status === 404 || (r.status === 400 && /not a valid model|model.*not (found|exist|available)|no endpoints|unknown model/i.test(msg))) continue;   // try the next model id / route
    if (r.status === 401) throw new GenieError(401, 'KEY_INVALID', 'OpenRouter rejected the API key. Check the key in the .env file.');
    if (r.status === 402) throw new GenieError(402, 'NO_CREDITS', 'The OpenRouter account is out of credits. Add credits at https://openrouter.ai/settings/credits');
    if (r.status === 403) throw new GenieError(422, 'CONTENT_BLOCKED', 'Nano Banana Pro can\'t make that design. Try describing it differently, and avoid other brands\' logos or characters.');
    if (r.status === 408) throw new GenieError(504, 'UPSTREAM_TIMEOUT', 'Nano Banana Pro took too long to answer. Please try again.');
    if (r.status === 429) throw new GenieError(429, 'QUOTA', 'Nano Banana Pro is busy right now. Please try again in a minute.');
    if (r.status === 400 && /safety|blocked|policy|moderation|flagged/i.test(msg)) throw new GenieError(422, 'CONTENT_BLOCKED', 'Nano Banana Pro can\'t make that design. Try describing it differently.');
    if (r.status === 502) throw new GenieError(502, 'NO_IMAGE', 'Nano Banana Pro couldn\'t finish that image. Please try again (failed images aren\'t charged).');
    console.error(`[genie] OpenRouter ${r.status}: ${msg}`);
    throw new GenieError(502, 'UPSTREAM', `Nano Banana Pro returned an error (${r.status}). Please try again.`);
  }
  console.error('[genie] OpenRouter: no working model/route:', last && `${last.status} ${last.msg}`);
  throw new GenieError(502, 'MODEL_UNAVAILABLE', `The image model "${c.model}" isn't available on this OpenRouter account. Check GENIE_IMAGE_MODEL in .env.`);
}

/* ---------- mock images for testing without spending (GENIE_MOCK=1) ---------- */
function mockImage(o, i, edit) {
  const pal = [['#0F1B3D', '#F4B400'], ['#6B4226', '#F5EBDD'], ['#5A3BD6', '#FFFFFF'], ['#D21F4B', '#FFF1F2']][(i + (edit ? 2 : 0)) % 4];
  const name = s(o.name || 'Your Logo', 18).replace(/[<&>"]/g, ''), fs2 = Math.min(150, Math.round(1500 / Math.max(5, name.length)));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#fff"/><circle cx="512" cy="512" r="400" fill="${pal[0]}"/><circle cx="512" cy="512" r="356" fill="none" stroke="${pal[1]}" stroke-width="16"/><path d="M432 330h160v40a80 80 0 0 1-160 0z" fill="${pal[1]}"/><text x="512" y="600" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="${fs2}" fill="${pal[1]}" text-anchor="middle">${name}</text><text x="512" y="700" font-family="Arial,sans-serif" font-size="40" letter-spacing="6" fill="${pal[1]}" text-anchor="middle">${edit ? 'EDITED' : 'MOCK ' + (i + 1)}</text></svg>`;
  return { mime: 'image/svg+xml', data: Buffer.from(svg).toString('base64') };
}

/* ---------- HTTP ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin', ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function readJSON(req, limit = 16 * 1048576) {
  return new Promise((ok, bad) => {
    let n = 0; const chunks = [];
    req.on('data', d => { n += d.length; if (n > limit) { bad(new GenieError(413, 'TOO_LARGE', 'That image is too large to edit. Please use a smaller image.')); req.destroy(); } else chunks.push(d); });
    req.on('end', () => { try { ok(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { bad(new GenieError(400, 'BAD_JSON', 'Bad request.')); } });
    req.on('error', bad);
  });
}
function originOK(req, c) {
  const o = req.headers.origin; if (!o) return true;
  try { if (new URL(o).host === req.headers.host) return true; } catch { return false; }
  return c.origins.includes(o);
}
function cors(req, c) { const o = req.headers.origin; return o && c.origins.includes(o) ? { 'access-control-allow-origin': o, 'vary': 'Origin', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' } : {}; }

async function api(req, res, url, c) {
  const extra = cors(req, c);
  if (req.method === 'OPTIONS') return send(res, 204, '', 'text/plain', extra);
  if (url.pathname === '/api/genie/status') {
    const enabled = c.mock || !!c.key;
    return send(res, 200, { enabled, engine: 'Nano Banana Pro', provider: c.mock ? 'mock' : c.provider, model: c.mock ? 'mock' : c.model, perRequest: c.perRequest, size: c.size, mock: c.mock, reason: enabled ? null : 'not configured' }, undefined, extra);
  }
  if (url.pathname !== '/api/genie/image' || req.method !== 'POST') return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Not found.' } }, undefined, extra);
  if (!originOK(req, c)) return send(res, 403, { error: { code: 'ORIGIN', message: 'This site is not allowed to use Genie.' } });
  const t0 = Date.now(), ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  let o, n = 0, mode = '?', counted = false;
  try {
    o = await readJSON(req); mode = o.mode === 'edit' ? 'edit' : 'generate';
    if (!c.mock && !c.key) throw new GenieError(503, 'NOT_CONFIGURED', 'Nano Banana Pro isn\'t set up on the server yet.');
    if (!s(o.prompt, 600)) throw new GenieError(400, 'EMPTY', 'Tell Genie what to draw.');
    let edit = null;
    if (mode === 'edit') {
      const m = String(o.image || '').match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!m) throw new GenieError(400, 'NO_IMAGE_INPUT', 'Pick the logo you want to change first.');
      edit = { mime: m[1], data: m[2] };
    }
    n = mode === 'edit' ? 1 : clamp(parseInt(o.n, 10) || c.perRequest, 1, c.perRequest);
    const why = allow(ip, c, n); if (why) throw new GenieError(429, 'RATE', why); counted = true;
    const aspect = ratioFor(o.size, o.shape, c.provider === 'openrouter' ? OR_RATIOS : RATIOS);
    const jobs = Array.from({ length: n }, (_, i) => c.mock
      ? new Promise(r => setTimeout(() => r({ images: [mockImage(o, i, !!edit)], text: '' }), 900 + i * 250))
      : c.provider === 'openrouter'
        ? openrouter(c, edit ? editPrompt(o) : genPrompt(o, i, n), edit ? `data:${edit.mime};base64,${edit.data}` : null, aspect, ip)
        : gemini(c, edit ? [{ inlineData: { mimeType: edit.mime, data: edit.data } }, { text: editPrompt(o) }] : [{ text: genPrompt(o, i, n) }], aspect));
    const out = await Promise.allSettled(jobs), ok = out.filter(x => x.status === 'fulfilled');
    day.images -= n - ok.length; counted = false;          // only images actually made count toward the daily limit
    if (!ok.length) throw out[0].reason;
    const images = ok.map(x => x.value.images[0]).map(im => ({ id: crypto.randomUUID(), src: `data:${im.mime};base64,${im.data}` }));
    const cost = ok.reduce((t, x) => t + (x.value.cost || 0), 0);
    console.log(`[genie] 200 ${mode} n=${images.length}/${n} aspect=${aspect} ${((Date.now() - t0) / 1000).toFixed(1)}s via=${c.mock ? 'mock' : c.provider}${cost ? ` cost=$${cost.toFixed(4)}` : ''} ip=${ip}`);
    return send(res, 200, { images, engine: 'Nano Banana Pro', model: c.mock ? 'mock' : c.provider === 'openrouter' ? ((orWorking && orWorking.model) || c.model) : ((working && working.model) || c.model), partial: images.length < n }, undefined, extra);
  } catch (e) {
    const st = e instanceof GenieError ? e.status : 500, code = e instanceof GenieError ? e.code : 'SERVER';
    if (!(e instanceof GenieError)) console.error('[genie] error', e);
    if (counted) day.images -= n;
    console.log(`[genie] ${st} ${mode} ${code} ${((Date.now() - t0) / 1000).toFixed(1)}s ip=${ip}`);
    if (SETUP.has(code)) console.error(`[genie] SETUP: ${e.message}`);
    const msg = SETUP.has(code) ? PUBLIC_SETUP_MSG : e instanceof GenieError ? e.message : 'Something went wrong on the server.';
    return send(res, SETUP.has(code) ? 503 : st, { error: { code: SETUP.has(code) ? 'UNAVAILABLE' : code, message: msg } }, undefined, extra);
  }
}

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === '/' || p === '/studio.html') p = '/index.html';
  const f = path.normalize(path.join(PUBLIC, p));
  if (!f.startsWith(PUBLIC)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.readFile(f, (err, buf) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, buf, MIME[path.extname(f).toLowerCase()] || 'application/octet-stream');
  });
}

/* optional team password (GENIE_TEAM_PASSWORD): the browser asks once, any user name works */
function teamOK(req, c) {
  if (!c.teamPassword) return true;
  const m = String(req.headers.authorization || '').match(/^Basic\s+(.+)$/i); if (!m) return false;
  const pass = Buffer.from(m[1], 'base64').toString('utf8').replace(/^[^:]*:/, '');
  const a = crypto.createHash('sha256').update(pass).digest(), b = crypto.createHash('sha256').update(c.teamPassword).digest();
  return crypto.timingSafeEqual(a, b);
}

const start = cfg();
http.createServer((req, res) => {
  const c = cfg(), url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/healthz') return send(res, 200, 'ok', 'text/plain');            // for the host's health check
  if (!teamOK(req, c)) return send(res, 401, 'This test link is for the Custom Genie team. Ask your team lead for the password.', 'text/plain; charset=utf-8', { 'www-authenticate': 'Basic realm="Custom Genie test", charset="UTF-8"' });
  if (url.pathname.startsWith('/api/genie/')) return void api(req, res, url, c);
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', 'text/plain');
  serveStatic(req, res, url);
}).listen(start.port, start.host, () => {
  console.log(`Custom Genie studio: http://${start.host === '0.0.0.0' ? 'localhost' : start.host}:${start.port}/${start.teamPassword ? '  (team password on)' : ''}`);
  console.log(start.mock ? 'Nano Banana Pro: MOCK mode (no API calls, no cost).' : start.key ? `Nano Banana Pro: ready via ${start.provider === 'openrouter' ? 'OpenRouter' : 'Google Gemini API'} (model ${start.model}, ${start.perRequest} image(s) per request, ${start.size}).` : 'Nano Banana Pro: waiting for an API key in .env (Genie uses built-in layouts until then).');
});
