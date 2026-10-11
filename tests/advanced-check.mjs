// tests/advanced-check.mjs : Genie Studio Advanced opens and works for every product it designs (stickers, badges, pens).
// For each product: open index.html?product=<id>, then check the page heading and picker show it, the panel has the
// right size controls for the product, the canvas draws the product, a template applies, Review & Print opens with a
// price, the phone layout has no sideways scroll, and there are no script errors. Also switches products inside a family
// (the design must come along) and saves a canvas picture of every product to .cache/test-shots/advanced/.
// Usage: node server.mjs (in another terminal), then: node tests/advanced-check.mjs [baseUrl] [width] [height]
import { spawn } from "node:child_process"; import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "node:fs"; import { tmpdir } from "node:os"; import { join, dirname } from "node:path"; import { fileURLToPath } from "node:url";
const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.argv[2] || "http://127.0.0.1:8766/").replace(/\/?$/, "/"), W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900), mobile = W < 800;
const shots = join(repo, ".cache", "test-shots", "advanced"); mkdirSync(shots, { recursive: true });
const idx = JSON.parse(readFileSync(join(repo, "products", "index.json"), "utf8")).products.filter(r => r.studios && r.studios.advanced);
const DEFS = idx.map(r => JSON.parse(readFileSync(join(repo, "products", r.file), "utf8")));
const exe = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe", port = 9300 + Math.floor(Math.random() * 300);
const proc = spawn(exe, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "ac-"))}`, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let t;
for (let i = 0; i < 60 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === "page") } catch { await sleep(250) } }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener("open", r, { once: true }));
let id = 0; const pend = new Map(), errs = [];
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 240)) });
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) });
const ev = async e => (await send("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
const ui = js => ev(`(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));${js}})()`);
await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile }); if (mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true });
const fail = []; let checks = 0; const ok = (c, m) => { checks++; if (!c) fail.push(m) };
for (const d of DEFS) {
  errs.length = 0; await send("Page.navigate", { url: base + "index.html?product=" + d.id }); await sleep(2300);
  const s = await ui(`
    if(!document.querySelector('#start').hidden){document.querySelector('[data-start="blank"]').click();await w(300)}
    const tp=document.querySelector('#tplGrid [data-tpl]');tp&&tp.click();await w(700);
    const vb=document.querySelector('#cv').getAttribute('viewBox'),sub=document.querySelector('#subRect');
    return {h1:document.querySelector('#pTitle').textContent,pick:document.querySelector('#prodSel')?.value,
      free:!!document.querySelector('input[data-p="dw"]'),presets:document.querySelectorAll('[data-preset]').length,
      els:document.querySelectorAll('#elsG > g').length,sub:sub&&+sub.getAttribute('width')>0&&sub.getAttribute('fill'),vb,
      over:document.documentElement.scrollWidth>innerWidth+1?document.documentElement.scrollWidth:0,
      bar:document.querySelector('#cbSum').textContent,back:document.querySelector('#pdpBack')?.href||''}`);
  ok(s.h1 === d.name, `${d.id}: heading "${s.h1}"`);
  ok(s.pick === d.id, `${d.id}: product picker on ${s.pick}`);
  ok(d.size.mode === "free" ? s.free : !s.free, `${d.id}: size controls (${d.size.mode}) free inputs=${s.free}`);
  ok(d.size.mode !== "preset" || s.presets === d.size.presets.length || d.size.presets.length < 2, `${d.id}: ${s.presets} size choices vs ${d.size.presets && d.size.presets.length}`);
  ok(s.els > 0 && !!s.sub, `${d.id}: canvas draws (${s.els} elements, surface ${s.sub})`);
  ok(!s.over, `${d.id}: page is ${s.over}px wide at ${W}px`);
  ok(s.back.endsWith("p/" + d.bigcommerce.url.split("/").filter(Boolean).pop() + ".html"), `${d.id}: back link ${s.back}`);
  const box = await ev(`(()=>{const r=document.querySelector('#vp').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:Math.min(r.height,innerHeight-r.y)}})()`);
  if (box.width > 10 && box.height > 10) { const r = await send("Page.captureScreenshot", { format: "png", clip: { ...box, scale: 1 } }); writeFileSync(join(shots, `${W}-${d.family}-${d.id}.png`), Buffer.from(r.result.data, "base64")) }
  const rv = await ui(`document.querySelector('#reviewBtn').click();await w(600);const c=document.querySelector('#confirm');if(!c.checked)c.click();document.querySelector('#rvNext1').click();await w(500);
    const q=document.querySelector('.qopt');const r={open:document.querySelector('#reviewDlg').open,q:q&&q.innerText.replace(/\\s+/g,' ').trim()};document.querySelector('#reviewDlg').close();await w(200);return r`);
  ok(rv.open && /\$\d/.test(rv.q || ""), `${d.id}: Review & Print ${JSON.stringify(rv)}`);
  ok(errs.length === 0, `${d.id}: script errors ${errs.join(" | ")}`);
  console.log(`${d.family.padEnd(7)} ${d.id.slice(0, 44).padEnd(44)} ${s.bar.replace(/\s+/g, " ").slice(0, 60).padEnd(60)} | ${rv.q ? rv.q.slice(0, 40) : "no quantity"}${errs.length ? " | ERR" : ""}`);
}
// switching products inside a family keeps the design (and refits it)
for (const [from, to] of [["domed_white_vinyl_sticker_sheet", "metallic_brushed_gold_sticker_sheet"], ["regal_large_name_badge", "executive_metal_name_badge"], ["derby_ballpoint_pen", "printed_notebooks"]]) {
  errs.length = 0; await send("Page.navigate", { url: base + "index.html?product=" + from }); await sleep(2200);
  const r = await ui(`if(!document.querySelector('#start').hidden){document.querySelector('[data-start="blank"]').click();await w(300)}document.querySelector('#tplGrid [data-tpl]').click();await w(600);
    const n0=document.querySelectorAll('#elsG > g').length,sel=document.querySelector('#prodSel');sel.value=${JSON.stringify(to)};sel.dispatchEvent(new Event('change',{bubbles:true}));await w(700);
    return {n0,n1:document.querySelectorAll('#elsG > g').length,h1:document.querySelector('#pTitle').textContent,pick:document.querySelector('#prodSel').value}`);
  const toName = DEFS.find(x => x.id === to).name;
  ok(r.n1 === r.n0 && r.n0 > 0 && r.pick === to && r.h1 === toName && !errs.length, `switch ${from} -> ${to}: ${JSON.stringify(r)} ${errs.join(" | ")}`);
  console.log(`switch  ${from} -> ${to}: ${r.n0} -> ${r.n1} elements, heading "${r.h1}"`);
}
console.log(`${DEFS.length} products at ${W}x${H}, ${checks} checks, ${fail.length} failed`); fail.forEach(f => console.log("  FAIL " + f));
ws.close(); proc.kill(); process.exit(fail.length ? 1 : 0);
