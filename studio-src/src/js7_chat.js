/* =====================================================================
   Genie chat: a chat model (server.mjs /api/genie/chat) talks with the shopper,
   gathers the brief, and decides when Nano Banana Pro should draw.
   The model never touches the canvas directly. It returns actions, and this file
   carries each one out with the studio's own functions (setShape, setSize, genieEdit,
   nbEdit, generate, commit), so every change is a normal, undoable studio edit and
   all manual tools keep working. Without the server, Genie falls back to its
   built-in rules (js4_genie.js), so shoppers never hit a dead end.
   ===================================================================== */
const GC = { on: false, model: '', mode: 'open', hist: [], brief: {}, refs: [], notes: [], plans: [], busy: false };
const gcFmt = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n+/g, '<br>');

/* what Genie knows about the sticker and the product (sent each turn, never invented by the model) */
function gcFacts() { return { shapes: Object.values(SN), minIn: MIN, maxIn: MAX, finishes: Object.values(VN), quantities: QTY } }
function gcDesign() {
  return { blank: isBlank(), shape: D.shape, width_in: D.w, height_in: D.h, finish: VN[D.vinyl] || D.vinyl, quantity: QTY[tier],
    background: D.bg.t === 'color' ? D.bg.c : D.bg.t === 'img' ? 'image' : 'none',
    elements: D.els.filter(e => !e.hidden).slice(0, 12).map(e => e.type === 'text'
      ? { type: 'text', text: String(e.text || '').slice(0, 40), font: (FONTS[e.font] || {}).n, color: e.fill }
      : { type: e.type, ai_logo: nbIsAI(e) || undefined, uploaded: e.type === 'image' && !nbIsAI(e) ? true : undefined }) };
}
function gcNote(t) { if (GC.on) GC.notes.push(t) }

/* reference images: shrink in the browser before upload (JPEG on white keeps requests small) */
function gcThumb(key, max) {
  const m = IM[key]; if (!m || !m.img) return Promise.resolve(null);
  return new Promise(res => {
    try {
      const im = m.img, s = Math.min(1, max / Math.max(im.naturalWidth || 1, im.naturalHeight || 1));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round((im.naturalWidth || max) * s)); c.height = Math.max(1, Math.round((im.naturalHeight || max) * s));
      const x = c.getContext('2d'); x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', .9));
    } catch (e) { res(null) }
  });
}
function gcAddRef(key) { if (!key || GC.refs.includes(key)) return; GC.refs.push(key); if (GC.refs.length > 3) GC.refs.shift(); GC.brief.use_references = true }

/* ---------- entry: the two ways in ---------- */
function gcIntro() {
  const first = feed.querySelector('.gm.bot .bd'); if (!first || first.querySelector('.gmodes')) return;
  const p0 = first.querySelector('p'); (p0 || first).insertAdjacentHTML(p0 ? 'afterend' : 'beforeend', `<div class="gmodes" role="group" aria-label="How should Genie help?">
   <button type="button" class="gmode" data-gcmode="guide"><svg class="ico" aria-hidden="true"><use href="#i-chat"/></svg><span><b>Walk me through it</b><small>A few quick questions, then I draw it</small></span></button>
   <button type="button" class="gmode" data-gcmode="auto"><svg class="ico" aria-hidden="true"><use href="#i-wand"/></svg><span><b>Just make it for me</b><small>Tell me one thing, I'll do the rest</small></span></button></div>`);
}
function gcStart(mode) {
  if (AI.busy || GC.busy) return; GC.mode = mode; openGenie(false); startDismissed = true; req();
  track('builder_ai_chat_mode', { mode });
  if (mode === 'guide') { gUser('Walk me through it'); gcTurn('Walk me through designing my sticker, one question at a time.') }
  else {
    gUser('Just make it for me');
    GC.hist.push({ role: 'user', content: 'Just make it for me.' });
    const say = 'Happy to. Tell me the name to put on it or what it\'s for, or attach a logo or photo. I\'ll take care of the rest.';
    GC.hist.push({ role: 'assistant', content: say });
    gSay(`<p>${esc(say)}</p><div class="gchips"><button type="button" class="gchip" data-gcref>Attach a logo or photo</button><button type="button" class="gchip" data-gcask="Surprise me">Surprise me</button></div>`);
    setTimeout(() => $('#gtext').focus(), 60);
  }
}

/* ---------- one chat turn ---------- */
async function gcTurn(text, key) {
  if (GC.busy) return true; GC.busy = true; AI.busy = true;
  if (key) gcAddRef(key);
  const content = (GC.notes.length ? `(Studio update: ${GC.notes.join(' ')})\n` : '') + (text || (key ? 'Here is my logo or reference image.' : ''));
  GC.notes = []; GC.hist.push({ role: 'user', content });
  const th = gThinking('Genie is thinking…');
  let j = null, err = null;
  try {
    const image = key ? await gcThumb(key, 768) : null;
    const r = await fetch(NB.api + '/chat', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: GC.hist.slice(-24), mode: GC.mode, brief: GC.brief, design: gcDesign(), facts: gcFacts(),
        refs: GC.refs.length, refNames: GC.refs.map(k => (IM[k] || {}).name || 'image'), image }) });
    j = await r.json().catch(() => ({}));
    if (!r.ok) { err = (j && j.error) || { code: 'HTTP_' + r.status }; j = null }
  } catch (e) { err = { code: 'NETWORK', message: e.message } }
  th.remove(); GC.busy = false; AI.busy = false;

  if (!j) {
    GC.hist.pop();
    if (['UNAVAILABLE', 'NOT_CONFIGURED', 'HTTP_404', 'NETWORK'].includes(err.code)) { GC.on = false; track('builder_ai_chat_off', { code: err.code }); return false }   // built-in Genie takes over
    gSay(`<p>${esc(err.message || 'Genie couldn\'t answer just now.')}</p><div class="gchips"><button type="button" class="gchip" data-gcask="${esc(text || 'Try again')}">Try again</button></div>`);
    return true;
  }
  track('builder_ai_chat', { actions: (j.actions || []).map(a => a.type).join(',') || 'none' });
  await gcApply(j);
  return true;
}

/* ---------- carry out the model's actions with the studio's own functions ---------- */
async function gcApply(j) {
  const acts = Array.isArray(j.actions) ? j.actions : [], ask = acts.find(a => a.type === 'ask_user');
  let reply = String(j.reply || '').trim();
  if (ask && ask.message && !reply.toLowerCase().includes(ask.message.toLowerCase().slice(0, 30))) reply = reply ? reply + ' ' + ask.message : ask.message;
  if (/^(done\.?|here is my plan\.?)$/i.test(reply) && acts.some(a => a.type === 'set_sticker')) reply = '';
  let memo = reply, undoable = false;
  for (const a of acts) if (a.type === 'update_brief') { const { type, ...f } = a; Object.assign(GC.brief, f) }

  /* 1) do the work first, with the studio's own functions */
  for (const a of acts) {
    if (a.type === 'set_sticker') { const d = gcSetSticker(a, !!reply); if (d) { memo += `\n[Changed the sticker: ${d}]`; undoable = !!reply } }
    else if (a.type === 'edit_design' && a.instruction) { const ok = await genieEdit(a.instruction); if (!ok) gSay('<p>I couldn\'t make that change automatically. You can do it with the tools on the canvas, or tell me another way to put it.</p>'); memo += `\n[Edited the layout: ${a.instruction}${ok ? '' : ' (could not apply)'}]` }
    else if (a.type === 'edit_logo' && a.change) { const tg = nbTarget(); if (tg) { await nbEdit(a.change, tg); memo += `\n[Redrew the AI logo: ${a.change}]` } else { gSay('<p>There isn\'t an AI logo on the sticker to change yet. Want me to draw one?</p>'); memo += '\n[No AI logo to edit]' } }
    else if (a.type === 'show_layouts') { gcLayouts(); memo += '\n[Showed free text layouts]' }
  }

  /* 2) then Genie's reply, and the next question as tap-able answers */
  const plan = acts.find(a => a.type === 'create_designs' && a.image_prompt);
  if (ask) {
    const q = ask.question || '';
    const chips = (ask.choices || []).map(c => `<button type="button" class="gchip" data-gcask="${esc(c)}">${esc(c)}</button>`).join('')
      + (ask.allow_upload ? '<button type="button" class="gchip" data-gcref><svg class="ico" style="width:14px;height:14px" aria-hidden="true"><use href="#i-clip"/></svg>Attach a logo or photo</button>' : '');
    gSay(`${reply ? `<p>${gcFmt(reply)}</p>` : ''}${q ? `<p><b>${esc(q)}</b></p>` : ''}${chips ? `<div class="gchips gask">${chips}</div>` : ''}${undoable ? '<div class="gchips"><button type="button" class="gchip" data-gundo>Undo</button></div>' : ''}`);
    memo += `${memo ? '\n' : ''}[Asked: ${q}${ask.choices && ask.choices.length ? ' Choices: ' + ask.choices.join(' / ') : ''}]`;
  } else if (reply && !plan) gSay(`<p>${gcFmt(reply)}</p>${undoable ? '<div class="gchips"><button type="button" class="gchip" data-gundo>Undo</button></div>' : ''}`);

  /* 3) drawing: confirmed with one tap, or right away in "do it for me" mode */
  if (plan) {
    const pid = GC.plans.push(plan) - 1;
    memo += `\n[Proposed designs: ${plan.summary}]`;
    if (GC.mode === 'auto') { if (reply && !ask) gSay(`<p>${gcFmt(reply)}</p>`); GC.hist.push({ role: 'assistant', content: memo }); memo = ''; await gcCreate(pid) }
    else gcPlanCard(pid, ask ? '' : reply);
  }
  if (memo) GC.hist.push({ role: 'assistant', content: memo });
}

function gcSetSticker(a, quiet) {
  const done = [];
  if (a.shape && a.shape !== D.shape) { setShape(a.shape); done.push(`shape ${SN[a.shape]}`) }
  if (a.width_in || a.height_in) {
    let w = a.width_in || D.w, h = a.height_in || D.h; if (D.shape === 'circle' || D.shape === 'square') w = h = Math.max(a.width_in || 0, a.height_in || 0) || Math.max(w, h);
    setSize(w, h); done.push(`size ${fmt(D.w)} x ${fmt(D.h)} in`);
  }
  if (a.vinyl && a.vinyl !== D.vinyl) { D.vinyl = a.vinyl; done.push(VN[a.vinyl]) }
  if (a.quantity) { let t = 0; QTY.forEach((q, i) => { if (a.quantity >= q) t = i }); if (t !== tier) { tier = t; done.push(`quantity ${QTY[t].toLocaleString()}`) } }
  if (!done.length) return '';
  CT.sig = ''; commit(); syncPanels(); req(); quickUI();
  if (!quiet) gSay(`<p>Done: ${esc(done.join(', '))}.</p><div class="gchips"><button type="button" class="gchip" data-gundo>Undo</button></div>`);
  return done.join(', ');
}

function gcLayouts() {
  const b = GC.brief, words = [b.business_name ? `"${b.business_name}"` : '', b.tagline ? `tagline "${b.tagline}"` : '', (b.colors || []).join(' '), b.shape ? SN[b.shape] : '', b.subject || '', b.style || '', b.vinyl || ''].filter(Boolean).join(' ');
  AI.mode = 'prompt'; AI.logo = null; AI.logoInfo = null; AI.a = parsePrompt(words || 'sticker'); AI.a.mode = 'prompt';
  if (b.width_in) AI.a.size = { w: b.width_in, h: b.height_in || b.width_in };
  AI.seed = 0; generate();
}

/* plan card: what Genie gathered, confirmed with one tap before anything is drawn */
function gcPlanCard(pid, reply) {
  const p = GC.plans[pid], b = GC.brief, row = (k, v) => v ? `<li><span>${k}</span><b>${esc(v)}</b></li>` : '';
  const size = b.width_in ? `${fmt(b.width_in)} x ${fmt(b.height_in || b.width_in)} in` : '';
  gSay(`${reply ? `<p>${gcFmt(reply)}</p>` : ''}<div class="gplan"><p class="gplan-h"><svg class="ico" aria-hidden="true"><use href="#i-spark"/></svg>Here's my plan</p><p>${esc(p.summary)}</p>
   <ul class="gplan-list">${row('Text', b.business_name === '' ? 'No text' : [b.business_name, b.tagline].filter(Boolean).join(', '))}${row('Picture', b.subject)}${row('Look', b.style)}${row('Colors', (b.colors || []).join(', '))}${row('Shape', [b.shape ? SN[b.shape] : '', size].filter(Boolean).join(', '))}${row('Finish', b.vinyl ? VN[b.vinyl] : '')}${row('Working from', GC.refs.length && b.use_references !== false ? `${GC.refs.length} attached image${GC.refs.length > 1 ? 's' : ''}` : '')}</ul>
   <div class="gplan-act"><button type="button" class="btn btn-primary sm" data-gcgo="${pid}"><svg class="ico" aria-hidden="true"><use href="#i-spark"/></svg>Create my designs</button><button type="button" class="btn btn-ghost sm" data-gcchange>Change something</button></div></div>`);
}

async function gcCreate(pid) {
  const p = GC.plans[pid]; if (!p || AI.busy) return;
  if (!(await nbCheck())) { gSay('<p>The AI drawing tool isn\'t available right now, so here are free text layouts instead.</p>'); gcLayouts(); return }
  const b = GC.brief, blank = isBlank(), shape = b.shape || (blank ? null : D.shape);
  const size = b.width_in ? { w: b.width_in, h: b.height_in || b.width_in } : (blank ? null : { w: D.w, h: D.h });
  const n = NB.n; AI.busy = true;
  const w = nbWait(n, `Genie is drawing ${n > 1 ? n + ' designs' : 'your design'}…`);
  track('builder_ai_prompt', { length: p.image_prompt.length, engine: 'genie-ai', via: 'chat', refs: GC.refs.length });
  try {
    const refs = b.use_references === false ? [] : (await Promise.all(GC.refs.map(k => gcThumb(k, 1024)))).filter(Boolean);
    const j = await nbCall({ mode: 'generate', prompt: p.image_prompt, name: b.business_name || null, tagline: b.tagline || null, colors: b.colors || [], shape, size, n, refs });
    w._stop();
    const a = {}; if (shape) a.shape = shape; if (size) a.size = size; if (b.vinyl) a.vinyl = b.vinyl;
    nbShow(j, { prompt: p.image_prompt, a });
    gcNote(`Showed ${j.images.length} new design${j.images.length > 1 ? 's' : ''} for: ${p.summary}`);
  } catch (e) { w._stop(); nbFail(e); gcNote('The drawing failed.') }
  finally { AI.busy = false; NB.ctl = null }
}

/* ---------- wiring (called from Genie init) ---------- */
function gcInit() {
  feed.addEventListener('click', ev => {
    const md = ev.target.closest('[data-gcmode]'), as = ev.target.closest('[data-gcask]'), go = ev.target.closest('[data-gcgo]'), ch = ev.target.closest('[data-gcchange]'), rf = ev.target.closest('[data-gcref]');
    if (md) { gcStart(md.dataset.gcmode); return }
    if (rf) { $('#gfile').dataset.mode = 'gcref'; $('#gfile').click(); return }
    if (AI.busy || GC.busy) return;
    if (as) { const box = as.closest('.gchips'); if (box) box.querySelectorAll('button').forEach(b => { b.disabled = true; if (b === as) b.setAttribute('aria-pressed', 'true') }); genieSubmit(as.dataset.gcask, null); return }
    if (go) { go.disabled = true; go.textContent = 'Drawing…'; gcCreate(+go.dataset.gcgo); return }
    if (ch) { const t = $('#gtext'); t.placeholder = 'What should I change? e.g. "use navy and gold" or "make it a rectangle"'; t.focus(); return }
  });
}
