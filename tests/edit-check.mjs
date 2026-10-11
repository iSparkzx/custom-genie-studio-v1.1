// Editing works on every product type, with real mouse, touch and keyboard input (not script calls):
// open the product page, Genie Studio Advanced, apply a template, select the text, edit it, drag it, add text.
// Also checks the design area is fully visible above the bottom bar and big enough to work in.
// Usage: node server.mjs (in another terminal), then: node tests/edit-check.mjs [baseUrl] [width] [height] [product ids...]
//   Screenshots go to .cache/test-shots/edit/ (gitignored). Exit code 1 on any failure.
import { spawn } from "node:child_process"; import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs"; import { tmpdir } from "node:os"; import { join, dirname } from "node:path"; import { fileURLToPath } from "node:url";
const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.argv[2] || "http://127.0.0.1:8766/").replace(/\/?$/, "/"), W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900), mobile = W < 800;
const IDS = process.argv.slice(5).length ? process.argv.slice(5) : ["derby_ballpoint_pen", "wooden_pencils_with_eraser_customizable_with_full_color_print", "printed_notebooks", "regal_large_name_badge", "domed_white_vinyl_sticker_sheet"];
const defs = Object.fromEntries(JSON.parse(readFileSync(join(repo, "products", "index.json"), "utf8")).products.map(r => [r.id, JSON.parse(readFileSync(join(repo, "products", r.file), "utf8"))]));
const out = join(repo, ".cache", "test-shots", "edit"); mkdirSync(out, { recursive: true });
const exe = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe", port = 9100 + Math.floor(Math.random() * 280);
const proc = spawn(exe, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "ed-"))}`, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let t;
for (let i = 0; i < 60 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === "page") } catch { await sleep(250) } }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener("open", r, { once: true }));
let id = 0; const pend = new Map(), errs = [];
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200)) });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) });
const ev = async e => (await send("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
const mouse = (type, x, y, n = 1) => send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: n });
const click = async (x, y, n = 1) => { for (let i = 1; i <= n; i++) { await mouse("mousePressed", x, y, i); await mouse("mouseReleased", x, y, i) } };
const tap = async (x, y) => { await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] }); await sleep(60); await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }) };
const press = (x, y) => mobile ? tap(x, y) : click(x, y);
const key = async (k, code, vk, text) => { await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, ...(text ? { text } : {}) }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk }) };
const box = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,top:r.top,bottom:r.bottom}})()`);
const into = async sel => { await ev(`document.querySelector(${JSON.stringify(sel)})?.scrollIntoView({block:'center'})`); await sleep(350) };
const texts = () => ev(`[...document.querySelectorAll('#elsG text')].map(t=>t.textContent).join(' / ')`);
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m) } };
await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile }); if (mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true });
for (const pid of IDS) {
  const d = defs[pid], slug = d.bigcommerce.url.split("/").filter(Boolean).pop(), name = d.name.slice(0, 34);
  await ev(`localStorage.clear()`).catch(() => {});
  await send("Page.navigate", { url: base + "p/" + slug + ".html" }); await sleep(1300);
  await into('.cta[data-studio="advanced"]'); const cta = await box('.cta[data-studio="advanced"]'); await press(cta.x, cta.y); await sleep(3200);
  ok((await ev(`location.search`)) === "?product=" + pid, `${name}: product page button didn't open the studio on this product`);
  /* the design area: fully visible above the bottom bar, and big enough to work in */
  const vis = await ev(`(()=>{const c=document.querySelector('#cutP').getBoundingClientRect(),b=document.querySelector('.cbar').getBoundingClientRect(),v=document.querySelector('#vp').getBoundingClientRect();return {top:c.top,bottom:c.bottom,w:c.width,h:c.height,bar:b.top,vpTop:v.top,vpW:v.width}})()`);
  ok(vis.top >= vis.vpTop - 1 && vis.bottom <= vis.bar + 1, `${name}: design area ${Math.round(vis.top)}-${Math.round(vis.bottom)} not fully visible (canvas from ${Math.round(vis.vpTop)}, bar at ${Math.round(vis.bar)})`);
  ok(vis.w >= vis.vpW * (mobile ? .7 : .4) || vis.h >= (vis.bar - vis.vpTop) * .5, `${name}: design area only ${Math.round(vis.w)} x ${Math.round(vis.h)} px`);
  /* start from a template like a shopper */
  if (mobile) { await into('[data-start="templates"]'); const s = await box('[data-start="templates"]'); await tap(s.x, s.y); await sleep(800) }
  await into('#tplGrid [data-tpl]'); const tp = await box('#tplGrid [data-tpl]'); await press(tp.x, tp.y); await sleep(900);
  if (mobile) { await ev(`document.querySelectorAll('.sheet-close,[data-close-sheet]').forEach(b=>b.offsetParent&&b.click())`); await sleep(500); await into('#vp') }
  const n0 = await ev(`document.querySelectorAll('#elsG > g').length`); ok(n0 > 0, `${name}: template didn't add anything`);
  /* select the text and change it */
  const tx = await ev(`(()=>{const gs=[...document.querySelectorAll('#elsG > g')],i=gs.findIndex(g=>g.dataset.type==='text');if(i<0)return null;const r=gs[i].getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,n:i+1}})()`);
  const tsel = tx && `#elsG > g:nth-child(${tx.n})`;
  ok(!!tx, `${name}: no text on the template`);
  if (tx) {
    await press(tx.x, tx.y); await sleep(450);
    ok(await ev(`(document.querySelector('#insCtx')?.innerText||'').length>0&&document.querySelectorAll('#selG *').length>0`), `${name}: text didn't select`);
    if (mobile) { const pen = await ev(`(()=>{const b=[...document.querySelectorAll('#ft button')].find(b=>b.offsetParent&&/edit text/i.test(b.getAttribute('aria-label')||''));if(!b)return null;const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`); ok(!!pen, `${name}: no Edit text button`); if (pen) await tap(pen.x, pen.y) }
    else await click(tx.x, tx.y, 2);
    await sleep(500); ok(await ev(`!document.querySelector('#inl').hidden`), `${name}: text editor didn't open`);
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: 2 }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: 2 });
    await send("Input.insertText", { text: "ACME CO" }); await sleep(250);
    if (mobile) { await ev(`document.activeElement&&document.activeElement.blur()`) } else { await key("Escape", "Escape", 27) } await sleep(400);
    ok((await texts()).includes("ACME CO"), `${name}: typed text didn't land (${await texts()})`);
    if (!mobile) {
      const a = await box(tsel); await mouse("mousePressed", a.x, a.y); for (let i = 1; i <= 8; i++) { await mouse("mouseMoved", a.x + i * 3, a.y + i); await sleep(16) } await mouse("mouseReleased", a.x + 24, a.y + 8); await sleep(300);
      const b = await box(tsel); ok(b && Math.abs(b.x - a.x) > 10, `${name}: drag didn't move the text`);
      await ev(`document.querySelector('#cv').focus()`); await key("t", "KeyT", 84, "t"); const c = await box('#cutP'); const n1 = await ev(`document.querySelectorAll('#elsG > g').length`);
      await click(c.x - c.w * .3, c.y + c.h * .25); await sleep(500); ok((await ev(`document.querySelectorAll('#elsG > g').length`)) > n1, `${name}: Text tool didn't add text`);
      await key("Escape", "Escape", 27); await sleep(200);
    }
  }
  const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(out, `${W}-${pid.slice(0, 40)}.png`), Buffer.from(r.result.data, "base64"));
}
ok(errs.length === 0, "script errors: " + errs.join(" | "));
console.log(`edit-check ${W}x${H}: ${IDS.length} products, ${pass + fail} checks, ${fail} failed`);
ws.close(); proc.kill(); process.exit(fail ? 1 : 0);
