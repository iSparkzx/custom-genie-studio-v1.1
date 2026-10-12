// tests/price-check.mjs : the studio's prices and product codes vs the BigCommerce product definitions (products/*.json).
// Part A (a debug copy of public/index.html with internals exposed, written to your temp folder):
//   every BigCommerce size x every quantity tier x White, Silver, Gold, plus 60 random in-between sizes per finish.
// Part B (the real page): pick a finish, type 3 x 5 in, open Review & Print, read the prices a shopper sees.
// Usage: node server.mjs (in another terminal), then: node tests/price-check.mjs [pageUrl]
//   CHROME=/path/to/chrome to override the browser. Screenshots go to .cache/test-shots/ (gitignored). Exit code 1 on any mismatch.
import { spawn } from "node:child_process"; import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "node:fs"; import { tmpdir } from "node:os"; import { join, dirname } from "node:path"; import { fileURLToPath } from "node:url";
const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const realUrl = process.argv[2] || "http://127.0.0.1:8766/";
mkdirSync(join(repo, ".cache", "test-shots"), { recursive: true }); const out = join(repo, ".cache", "test-shots", "price");
const def = f => JSON.parse(readFileSync(join(repo, "products", "sticker", f + "-vinyl-sticker-sheet.json"), "utf8"));
const FIN = { white: def("domed-white"), silver: def("domed-silver"), gold: def("domed-gold") };
const r2 = v => Math.round(v * 100) / 100;

// debug copy: expose internals (scratch only, never committed)
const html = readFileSync(join(repo, "public", "index.html"), "utf8").replace(/\r\n/g, "\n");
const marker = "\n})();\n</script>\n</body>";
if (!html.includes(marker)) throw new Error("bundle end marker not found");
const dbgPath = join(tmpdir(), "cg-price-check-debug.html");
writeFileSync(dbgPath, html.replace(marker, "\nwindow.__dbg={get D(){return D},tiers,skuFor,basePrice,pricedSize,QTY,MIN,MAX,CATALOG};" + marker));

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
  await send("Page.enable"); await send("Page.navigate", { url }); await sleep(4500);
  await ev(`window.__e=[];addEventListener('error',e=>__e.push(e.message));addEventListener('unhandledrejection',e=>__e.push(String(e.reason)))`);
};

// ---------- Part A
await go("file:///" + dbgPath.replace(/\\/g, "/"));
const meta = await ev(`({QTY:__dbg.QTY,MIN:__dbg.MIN,MAX:__dbg.MAX,products:Object.values(__dbg.CATALOG.products).map(p=>p.name+' ('+p.bc_id+')')})`);
console.log("A  embedded:", JSON.stringify(meta));
let checks = 0, bad = [];
for (const [fin, d] of Object.entries(FIN)) {
  const grid = d.pricing.price_grid, tiers = d.pricing.quantity_tiers;
  const skuOf = Object.fromEntries(d.pricing.variants.map(v => [`${+v.options.height}x${+v.options.width}`, v.sku]));
  const sizes = Object.keys(grid).map(k => k.split("x").map(Number)); // [h, w]
  // random in-between sizes: priced at the next BigCommerce step up
  const steps = d.size.price_steps.width, up = v => steps.find(s => v <= s + 1e-9) ?? steps.at(-1);
  for (let i = 0; i < 60; i++) { const h = Math.round((0.5 + Math.random() * 8) * 100) / 100, w = Math.round((0.5 + Math.random() * 8) * 100) / 100; sizes.push([h, w, true]) }
  const got = await ev(`(()=>{const D=__dbg.D,keep={v:D.vinyl,s:D.shape,w:D.w,h:D.h},o=[];D.vinyl=${JSON.stringify(fin)};D.shape='rect';
    for(const [h,w] of ${JSON.stringify(sizes)}){D.w=w;D.h=h;o.push({t:__dbg.tiers(),sku:__dbg.skuFor()})}Object.assign(D,{vinyl:keep.v,shape:keep.s,w:keep.w,h:keep.h});return o})()`);
  sizes.forEach(([h, w, between], i) => {
    const key = between ? `${up(h)}x${up(w)}` : `${h}x${w}`, base = grid[key];
    tiers.forEach((tr, j) => {
      const unit = r2(base * (1 - tr.amount / 100)), total = r2(unit * tr.min_qty), g = got[i].t[j]; checks++;
      if (g.q !== tr.min_qty || Math.abs(g.p - unit) > 1e-9 || Math.abs(g.t - total) > 1e-9) bad.push(`${fin} ${h}x${w}${between ? " (between)" : ""} q${tr.min_qty}: studio ${g.p}/${g.t} vs BigCommerce ${unit}/${total}`);
    });
    checks++; if (got[i].sku !== skuOf[key]) bad.push(`${fin} ${h}x${w}: sku ${got[i].sku} vs ${skuOf[key]}`);
  });
}
console.log(`A  ${checks} price and product-code checks, ${bad.length} mismatches`); bad.slice(0, 10).forEach(x => console.log("   " + x));
console.log("A  page errors:", JSON.stringify(await ev("__e")));

// ---------- Part B : the real page, like a shopper
await go(realUrl);
const ui = async (js) => ev(`(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));${js}})()`);
const rv = async () => ui(`const q=[...document.querySelectorAll('.qopt')].map(l=>l.innerText.replace(/\\s+/g,' ').trim());return q.join(' | ')`);
for (const fin of ["white", "silver", "gold"]) {
  const setup = await ui(`
    if(!document.querySelector('#start').hidden){document.querySelector('[data-start="blank"]').click();await w(400);document.querySelector('[data-tpl]').click();await w(900)}
    const v=document.querySelector('[data-vinyl="${fin}"]');if(!v)return 'no finish button';v.click();await w(250);
    const rect=document.querySelector('[data-shape="rect"]');rect&&rect.click();await w(250);
    const set=(p,val)=>{const i=document.querySelector('input[data-p="'+p+'"]');if(!i)return false;i.value=val;i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));return true};
    const lock=document.querySelector('#docLock,[data-lock]');const ok=set('dw','5')&&set('dh','3');await w(400);
    return 'finish '+${JSON.stringify(fin)}+', inputs '+(ok?'set':'MISSING')+', size shown: '+[...document.querySelectorAll('input[data-p="dw"],input[data-p="dh"]')].map(i=>i.value).join(' x ')`);
  console.log(`B  ${setup}`);
  const pane = () => ev(`[...document.querySelectorAll('#reviewDlg .rv-pane')].find(p=>!p.hidden)?.dataset.pane`);
  await ui(`document.querySelector('#reviewBtn').click();await w(700);const c=document.querySelector('#confirm');if(!c.checked)c.click();await w(150);document.querySelector('#rvNext1').click();await w(700)`);
  console.log(`B  ${fin} dialog open: ${await ev(`document.querySelector('#reviewDlg').open`)} | design layers: ${await ev(`document.querySelectorAll('#layerList li,[data-layer]').length`)} | step showing: ${await pane()}`);
  console.log(`B  ${fin} 3 x 5 in quantity step: ${await rv()}`);
  await ui(`document.querySelectorAll('.qopt input')[0].click();await w(400);document.querySelector('#rvNext2').click();await w(600)`);
  console.log(`B  ${fin} step showing: ${await pane()}`);
  console.log(`B  ${fin} cart step: ${await ev(`document.querySelector('#rvSpec').innerText.replace(/\\s+/g,' ')+' || '+document.querySelector('#addCart').innerText.replace(/\\s+/g,' ')`)}`);
  const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${out}_${fin}_cart.png`, Buffer.from(r.result.data, "base64"));
  await ui(`document.querySelector('[data-go="2"]')?.click();await w(400)`);
  const r2s = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${out}_${fin}_qty.png`, Buffer.from(r2s.result.data, "base64"));
  await ui(`document.querySelector('#reviewDlg').close();await w(300)`);
}
console.log("B  page errors:", JSON.stringify(await ev("__e")));
ws.close(); proc.kill(); process.exit(bad.length ? 1 : 0);
