// tests/price-check.mjs : Genie Studio Advanced prices and product codes vs the BigCommerce product definitions (products/*.json).
// Part A (a debug copy of public/index.html with internals exposed, written to your temp folder): every BigCommerce
//   variant of every product the studio designs x every quantity break, plus 25 random in-between sizes per free-size
//   product (priced at the next size step up). Expected values are computed here from the definition files, not from the page.
// Part B (the real page, like a shopper): one product per family, options picked with clicks, then Review & Print.
// Usage: node server.mjs (in another terminal), then: node tests/price-check.mjs [pageUrl]
//   CHROME=/path/to/chrome to override the browser. Screenshots go to .cache/test-shots/ (gitignored). Exit code 1 on any mismatch.
import { spawn } from "node:child_process"; import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "node:fs"; import { tmpdir } from "node:os"; import { join, dirname } from "node:path"; import { fileURLToPath } from "node:url";
const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const realUrl = (process.argv[2] || "http://127.0.0.1:8766/").replace(/\/?$/, "/");
mkdirSync(join(repo, ".cache", "test-shots"), { recursive: true }); const out = join(repo, ".cache", "test-shots", "price");
const idx = JSON.parse(readFileSync(join(repo, "products", "index.json"), "utf8")).products.filter(r => r.studios && r.studios.advanced);
const DEFS = idx.map(r => JSON.parse(readFileSync(join(repo, "products", r.file), "utf8")));
const r2 = v => Math.round(v * 100) / 100, SIZE = ["height", "width"];
/* quantity list the studio offers: BigCommerce's quantity breaks (badges can also be ordered one at a time) */
const qtys = d => { const t = d.pricing.quantity_tiers.map(x => [x.min_qty, x.amount]); if (d.family === "badge" && (!t.length || t[0][0] > 1)) t.unshift([1, 0]); return t.length ? t : [[1, 0]] };
const money = v => "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// debug copy: expose internals (scratch only, never committed)
const html = readFileSync(join(repo, "public", "index.html"), "utf8").replace(/\r\n/g, "\n");
const marker = "\n})();\n</script>\n</body>";
if (!html.includes(marker)) throw new Error("bundle end marker not found");
const dbgPath = join(tmpdir(), "cg-price-check-debug.html");
writeFileSync(dbgPath, html.replace(marker, "\nwindow.__dbg={get D(){return D},tiers,skuFor,switchProduct,conform,variantNow,get QTY(){return QTY},CATALOG};" + marker));

const exe = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe", port = 9700 + Math.floor(Math.random() * 90);
const proc = spawn(exe, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "pt-"))}`, "--no-first-run", "--hide-scrollbars", "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let t;
for (let i = 0; i < 60 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === "page") } catch { await sleep(250) } }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener("open", r, { once: true }));
let id = 0; const pend = new Map(); ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } });
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) });
const ev = async e => { const r = await send("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result?.result?.value };
const go = async (url, W = 1440, H = 900) => {
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send("Page.enable"); await send("Page.navigate", { url }); await sleep(4000);
  await ev(`window.__e=[];addEventListener('error',e=>__e.push(e.message));addEventListener('unhandledrejection',e=>__e.push(String(e.reason)))`);
};

// ---------- Part A
await go("file:///" + dbgPath.replace(/\\/g, "/"));
const embedded = await ev(`Object.keys(__dbg.CATALOG.products).length`);
console.log(`A  products in the studio: ${embedded} (definitions with Advanced on: ${DEFS.length})`);
let checks = 0; const bad = [];
if (embedded !== DEFS.length) bad.push(`studio has ${embedded} products, definitions ${DEFS.length}`);
for (const d of DEFS) {
  const vs = d.pricing.variants, Q = qtys(d), free = d.size.mode === "free";
  const cases = vs.map(v => ({ o: v.options, want: v }));
  if (free) {   // in-between sizes: priced at the next BigCommerce step up (other options = the first variant's)
    const st = d.size.price_steps, up = (v, s) => s.find(x => v <= x + 1e-9) ?? s.at(-1), rnd = (a, b) => Math.round((a + Math.random() * (b - a)) * 100) / 100;
    for (let i = 0; i < 25; i++) {
      const w = rnd(d.size.width.min, d.size.width.max), h = rnd(d.size.height.min, d.size.height.max), o = { ...vs[0].options, width: String(w), height: String(h) };
      const want = vs.find(v => Object.entries(vs[0].options).every(([k, x]) => SIZE.includes(k) || v.options[k] === x) && +v.options.width === up(w, st.width) && +v.options.height === up(h, st.height));
      cases.push({ o, want, between: true });
    }
  }
  const got = await ev(`(()=>{const g=__dbg,o=[];g.switchProduct(${JSON.stringify(d.id)},true);
    for(const c of ${JSON.stringify(cases.map(c => c.o))}){const D=g.D;D.els=[];for(const [k,v] of Object.entries(c)){if(k==='height')D.h=+v;else if(k==='width')D.w=+v;else D.opt[k]=v}
     if(D.shape==='custom'||D.shape==='circle'||D.shape==='square')D.shape=g.CATALOG.products[D.pid].shapes.find(s=>s==='rect'||s==='stadium')||D.shape;
     g.conform();const v=g.variantNow();o.push({pid:D.pid,t:g.tiers(),sku:g.skuFor(),vid:v&&v.id})}return o})()`);
  cases.forEach((c, i) => {
    const g = got[i], tag = `${d.id} ${JSON.stringify(c.o)}${c.between ? " (between)" : ""}`;
    checks++; if (g.pid !== d.id) bad.push(`${tag}: studio is on ${g.pid}`);
    checks++; if (!c.want || g.vid !== c.want.id) { bad.push(`${tag}: variant ${g.vid} vs BigCommerce ${c.want && c.want.id}`); return }
    checks++; if (g.sku !== c.want.sku) bad.push(`${tag}: sku ${g.sku} vs ${c.want.sku}`);
    checks++; if (g.t.length !== Q.length) bad.push(`${tag}: ${g.t.length} quantity breaks vs ${Q.length}`);
    Q.forEach(([q, pct], j) => {
      const unit = r2(c.want.price * (1 - pct / 100)), total = r2(unit * q), x = g.t[j]; checks++;
      if (!x || x.q !== q || Math.abs(x.p - unit) > 1e-9 || Math.abs(x.t - total) > 1e-9) bad.push(`${tag} q${q}: studio ${x && x.p}/${x && x.t} vs BigCommerce ${unit}/${total}`);
    });
  });
}
console.log(`A  ${checks} price, product-code and variant checks over ${DEFS.reduce((n, d) => n + d.pricing.variants.length, 0)} BigCommerce variants, ${bad.length} mismatches`); bad.slice(0, 12).forEach(x => console.log("   " + x));
const errA = await ev("__e"); console.log("A  page errors:", JSON.stringify(errA)); if (errA.length) bad.push("page errors in part A");

// ---------- Part B : the real page, like a shopper
const ui = async (js) => ev(`(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));${js}})()`);
const FLOW = [
  { id: "domed_white_vinyl_sticker_sheet", size: [5, 3] },
  { id: "domed_gold_vinyl_sticker_sheet", size: [3, 4] },
  { id: "die_cut_sticker", opts: { material: "Matte" }, size: [3, 2] },
  { id: "regal_large_name_badge", opts: { background_color: "Silver", border_color: "White" } },
  { id: "derby_ballpoint_pen", opts: { pen_color: "Red" } },
  { id: "printed_notebooks", opts: { notebook_color: "Blue" } },
];
for (const f of FLOW) {
  const d = DEFS.find(x => x.id === f.id);
  await go(realUrl + "index.html?product=" + f.id);
  const setup = await ui(`
    if(!document.querySelector('#start').hidden){document.querySelector('[data-start="blank"]').click();await w(400);document.querySelector('[data-tpl]').click();await w(900)}
    const r=[];for(const [k,v] of Object.entries(${JSON.stringify(f.opts || {})})){const b=document.querySelector('[data-opt="'+k+'"][data-val="'+v+'"]');if(!b)return 'no button for '+k+' '+v;b.click();await w(300);r.push(k+'='+v)}
    ${f.size ? `const rect=document.querySelector('[data-shape="rect"]');rect&&rect.click();await w(250);
    const set=(p,val)=>{const i=document.querySelector('input[data-p="'+p+'"]');if(!i)return false;i.value=val;i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));return true};
    if(!(set('dw','${f.size[0]}')&&set('dh','${f.size[1]}')))return 'size inputs missing';await w(400);r.push('size '+[...document.querySelectorAll('input[data-p="dw"],input[data-p="dh"]')].map(i=>i.value).join(' x '))` : ""}
    return r.join(', ')`);
  // expected: the BigCommerce variant for these choices (other options keep the product's first value)
  const first = d.pricing.variants[0].options;
  const wantOpt = Object.fromEntries(Object.keys(first).map(k => [k, f.size && k === "width" ? f.size[0] : f.size && k === "height" ? f.size[1] : f.opts && k in f.opts ? f.opts[k] : first[k]]));
  if (f.size) {   // price the size the studio shows: "Cut to design" keeps the art's proportions, and sizes round up to the next step
    const shown = await ev(`[...document.querySelectorAll('input[data-p="dw"],input[data-p="dh"]')].map(i=>+i.value)`), st = d.size.price_steps, up = (v, s2) => s2.find(x => v <= x + 1e-9) ?? s2.at(-1);
    wantOpt.width = up(shown[0], st.width); wantOpt.height = up(shown[1], st.height);
  }
  const want = d.pricing.variants.find(v => Object.entries(wantOpt).every(([k, x]) => SIZE.includes(k) ? +v.options[k] === +x : v.options[k] === x));
  const Q = qtys(d), unit = r2(want.price * (1 - Q[0][1] / 100)), total = r2(unit * Q[0][0]);
  await ui(`document.querySelector('#reviewBtn').click();await w(700);const c=document.querySelector('#confirm');if(!c.checked)c.click();await w(150);document.querySelector('#rvNext1').click();await w(700)`);
  const qrow = await ev(`[...document.querySelectorAll('.qopt')][0]?.innerText.replace(/\\s+/g,' ').trim()`) || "";
  await ui(`document.querySelectorAll('.qopt input')[0].click();await w(400);document.querySelector('#rvNext2').click();await w(600)`);
  const spec = await ev(`document.querySelector('#rvSpec').innerText.replace(/\\s+/g,' ')`), cartBtn = await ev(`document.querySelector('#addCart').innerText.trim()`);
  const okSku = spec.includes(want.sku), okPrice = want.purchasing_disabled ? cartBtn === "Not available to order" && qrow.includes(money(unit)) : cartBtn.includes(money(total)) && qrow.includes(money(unit)) && qrow.includes(money(total));
  checks += 2; if (!okSku) bad.push(`B ${f.id}: product code ${want.sku} not on the cart step: ${spec.slice(0, 200)}`); if (!okPrice) bad.push(`B ${f.id}: expected ${Q[0][0]} at ${money(unit)} = ${money(total)}, saw "${qrow}" / "${cartBtn}"`);
  console.log(`B  ${f.id}: ${setup || "defaults"} | first quantity: ${qrow} | ${cartBtn} | expected ${want.sku} ${money(unit)} x ${Q[0][0]} = ${money(total)}${want.purchasing_disabled ? " (ordering is off in BigCommerce: cart must be disabled)" : ""} ${okSku && okPrice ? "OK" : "MISMATCH"}`);
  const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${out}_${f.id}_cart.png`, Buffer.from(r.result.data, "base64"));
  const e = await ev("__e"); if (e.length) { bad.push(`B ${f.id}: page errors ${e.join(" | ")}`); console.log("B  page errors:", JSON.stringify(e)) }
}
console.log(`${checks} checks, ${bad.length} mismatches`);
ws.close(); proc.kill(); process.exit(bad.length ? 1 : 0);
