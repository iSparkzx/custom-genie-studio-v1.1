// Start over (full reset) in Genie Studio Advanced, with real mouse, touch and keyboard input:
// disabled when there's nothing to clear, Escape and "Keep my design" change nothing, "Clear and start over" empties the
// canvas, resets size/shape/options and Genie, shows the start card, saves; one Undo brings the design back.
// Usage: node server.mjs (in another terminal), then: node tests/reset-check.mjs [baseUrl] [width] [height]
//   Screenshots go to .cache/test-shots/reset/ (gitignored). Exit code 1 on any failure.
import { spawn } from "node:child_process"; import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs"; import { tmpdir } from "node:os"; import { join, dirname } from "node:path"; import { fileURLToPath } from "node:url";
const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.argv[2] || "http://127.0.0.1:8766/").replace(/\/?$/, "/"), W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900), mobile = W < 800;
const out = join(repo, ".cache", "test-shots", "reset"); mkdirSync(out, { recursive: true });
const exe = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe", port = 9100 + Math.floor(Math.random() * 280);
const proc = spawn(exe, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "rs-"))}`, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let t;
for (let i = 0; i < 60 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === "page") } catch { await sleep(250) } }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener("open", r, { once: true }));
let id = 0; const pend = new Map(), errs = [];
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200)) });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) });
const ev = async e => (await send("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
const mouse = (type, x, y) => send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
const tap = async (x, y) => { await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] }); await sleep(60); await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }) };
const press = async (sel, wait = 450) => { await ev(`document.querySelector(${JSON.stringify(sel)})?.scrollIntoView({block:'center'})`); await sleep(250);
  const b = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e||!e.getClientRects().length)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  if (!b) return false; if (mobile) await tap(b.x, b.y); else { await mouse("mouseMoved", b.x, b.y); await mouse("mousePressed", b.x, b.y); await mouse("mouseReleased", b.x, b.y) } await sleep(wait); return true };
const key = async (k, code, vk, mods = 0) => { await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, modifiers: mods, ...(k === "Enter" ? { text: "\r" } : {}) }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk, modifiers: mods }); await sleep(250) };
const S = () => ev(`(()=>{const k=Object.keys(localStorage).find(k=>/^cg-studio-v3/.test(k)&&localStorage.getItem(k).includes('"pid"')&&JSON.parse(localStorage.getItem(k)).D.pid===new URLSearchParams(location.search).get('product'));const sv=k?JSON.parse(localStorage.getItem(k)).D:null;
  return {els:document.querySelectorAll('#elsG > g').length,sum:document.querySelector('#cbSum').innerText.replace(/\\s+/g,' ').trim(),start:!document.querySelector('#start').hidden,btn:document.querySelector('#resetBtn').getAttribute('aria-disabled')==='true',foot:!document.querySelector('#lfoot').hidden,
   dlg:document.querySelector('#resetDlg').open,list:[...document.querySelectorAll('#resetList li')].map(l=>l.textContent),feed:document.querySelector('#gfeed,#feed,.gfeed')?.children.length,undo:document.querySelector('#undoBtn').disabled,toast:document.querySelector('#toastTxt')?.textContent||'',saved:sv&&sv.els.length,focus:document.activeElement?.id||document.activeElement?.textContent?.trim().slice(0,20)}})()`);
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m) } };
const shot = async n => { const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(out, `${W}-${n}.png`), Buffer.from(r.result.data, "base64")) };
await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile }); if (mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true });

for (const [pid, change] of [["domed_white_vinyl_sticker_sheet", '[data-shape="circle"]'], ["regal_large_name_badge", '[data-opt="background_color"][data-val="Silver"]'], ["derby_ballpoint_pen", '[data-opt="pen_color"][data-val="Red"]']]) {
  await send("Page.navigate", { url: base + "index.html?product=" + pid }); await sleep(2600);
  const s0 = await S(); ok(s0.btn === true && !s0.foot, `${pid}: Start over should be off on a blank design (${JSON.stringify(s0)})`);
  /* the toolbar button is on screen and takes a real click at this width, without scrolling the toolbar */
  await ev(`document.querySelector('.tbar').scrollIntoView({block:'center'})`); await sleep(200);
  const vis = await ev(`(()=>{const b=document.querySelector('#resetBtn'),r=b.getBoundingClientRect(),T=document.querySelector('.tbar').getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {in:r.x>=T.x-1&&r.right<=Math.min(T.right,innerWidth)+1,hit:!!h&&b.contains(h),op:+getComputedStyle(b).opacity,u:(()=>{const u=document.querySelector('#undoBtn').getBoundingClientRect();return u.right<=Math.min(T.right,innerWidth)+1})()}})()`);
  ok(vis.in && vis.hit && vis.u, `${pid}: Start over and Undo on screen and clickable at ${W}px ${JSON.stringify(vis)}`);
  ok(vis.op >= 0.55, `${pid}: Start over readable when there's nothing to clear (opacity ${vis.op})`);
  await press('#resetBtn', 450); let n0 = await S(); ok(!n0.dlg && /Nothing to clear/.test(n0.toast), `${pid}: nothing to clear says so (${n0.toast})`);
  await press('#startClose', 450); ok((await S()).btn === false, `${pid}: with the start card closed, Start over is on`);
  await press('#resetBtn', 450); n0 = await S(); ok(!n0.dlg && n0.start, `${pid}: on a blank canvas Start over brings the start card back`);
  /* build up a design: template, then an option change */
  /* under 1100 px the left panel is hidden: shoppers reach templates from the start card, like here */
  if (W < 1100) { await press('[data-start="templates"]', 800) }
  await press('#tplGrid [data-tpl]', 900);
  if (W < 1100) { await ev(`document.querySelectorAll('.sheet-close,[data-close-sheet]').forEach(b=>b.offsetParent&&b.click())`); await sleep(400) }
  await key("Escape", "Escape", 27); await key("Escape", "Escape", 27);
  if (mobile) await press('.mtabs [data-mtab="props"]', 600);
  const changed = await press('#ins ' + change, 600);
  if (mobile) { await ev(`document.querySelectorAll('.sheet-close,[data-close-sheet]').forEach(b=>b.offsetParent&&b.click())`); await sleep(400) }
  const s1 = await S(); ok(s1.els > 0 && changed, `${pid}: setup (template ${s1.els} layers, option click ${changed})`);
  ok(s1.btn === false, `${pid}: Start over should be on once there's a design`);
  /* open, then back out two ways: nothing changes */
  if (mobile) { await press('.mtabs [data-mtab="layers"]', 600); ok((await S()).foot, `${pid}: Start over link under the layers`) }
  await press(mobile ? '#resetLink' : '#resetBtn', 500);
  let s = await S(); ok(s.dlg && s.list.some(x => x.startsWith(`${s1.els} layer`)), `${pid}: dialog lists what's cleared ${JSON.stringify(s.list)}`);
  ok(s.focus === "Keep my design", `${pid}: focus starts on the safe button (${s.focus})`);
  await shot(pid.slice(0, 20) + "-1-dialog");
  await key("Escape", "Escape", 27); s = await S(); ok(!s.dlg && s.els === s1.els && s.sum === s1.sum, `${pid}: Escape keeps the design`);
  await press(mobile ? '#resetLink' : '#resetBtn', 500); await press('#resetDlg [data-close-dlg].btn', 400); s = await S(); ok(!s.dlg && s.els === s1.els, `${pid}: Keep my design keeps it`);
  /* clear */
  await press(mobile ? '#resetLink' : '#resetBtn', 500); await press('#resetGo', 900);
  const s2 = await S();
  ok(!s2.dlg && s2.els === 0, `${pid}: canvas cleared (${s2.els} layers left)`);
  ok(s2.sum === s0.sum, `${pid}: size/shape/options back to the start: "${s2.sum}" vs "${s0.sum}"`);
  ok(s2.start, `${pid}: start card shows again`);
  ok(s2.btn === true && !s2.foot, `${pid}: Start over off again after clearing`);
  ok(/Design cleared/.test(s2.toast), `${pid}: toast "${s2.toast}"`);
  ok(s2.saved === 0, `${pid}: the cleared design is what's saved (${s2.saved})`);
  ok(!mobile || !(await ev(`document.querySelector('#studio').classList.contains('show-left')`)), `${pid}: phone sheet closed after clearing`);
  await shot(pid.slice(0, 20) + "-2-cleared");
  /* one Undo brings it all back */
  if (mobile || !(await press('#toastAct', 700))) await press('#undoBtn', 700);
  const s3 = await S(); ok(s3.els === s1.els && s3.sum === s1.sum && !s3.start, `${pid}: Undo restores the design (${s3.els}/${s1.els}, "${s3.sum}")`);
  /* clear again and reload: it stays cleared */
  await press(mobile ? '.mtabs [data-mtab="layers"]' : '#resetBtn', 500); if (mobile) await press('#resetLink', 500); await press('#resetGo', 900); await sleep(900);
  await send("Page.reload"); await sleep(2600); const s4 = await S(); ok(s4.els === 0 && s4.start, `${pid}: still cleared after a reload (${s4.els} layers)`);
}
/* keyboard only: Tab to the button, Enter opens, Escape closes and focus goes back */
if (!mobile) {
  if (W < 1100) await press('[data-start="templates"]', 800);
  await press('#tplGrid [data-tpl]', 900);
  if (W < 1100) { await ev(`document.querySelectorAll('.sheet-close,[data-close-sheet]').forEach(b=>b.offsetParent&&b.click())`); await sleep(400) }
  await key("Escape", "Escape", 27); await key("Escape", "Escape", 27);
  /* with something selected on the canvas, Enter and Space must still press the focused button */
  const el = await ev(`(()=>{const g=document.querySelector('#elsG > g');const r=g.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await mouse("mouseMoved", el.x, el.y); await mouse("mousePressed", el.x, el.y); await mouse("mouseReleased", el.x, el.y); await sleep(400);
  ok((await ev(`document.querySelectorAll('#selG *').length`)) > 0, "keyboard: something is selected first");
  await ev(`document.querySelector('#genieBtn').focus()`); let hops = 0;
  while (hops++ < 6 && (await ev(`document.activeElement.id`)) !== "resetBtn") await key("Tab", "Tab", 9);
  ok((await ev(`document.activeElement.id`)) === "resetBtn", "keyboard: Tab reaches Start over");
  await key("Enter", "Enter", 13); ok((await S()).dlg, "keyboard: Enter opens the dialog");
  await key("Escape", "Escape", 27); ok((await ev(`document.activeElement.id`)) === "resetBtn", "keyboard: focus back on Start over after Escape");
  ok(!(await S()).start && (await ev(`document.querySelectorAll('#elsG > g').length`)) > 0, "keyboard: Enter didn't touch the design");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32, text: " " }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 }); await sleep(300);
  ok((await S()).dlg, "keyboard: Space opens the dialog too"); await key("Escape", "Escape", 27);
  await ev(`document.querySelector('#undoBtn').focus()`); const h0 = await ev(`document.querySelectorAll('#elsG > g').length`); await key("Enter", "Enter", 13);
  ok((await ev(`document.querySelectorAll('#elsG > g').length`)) !== h0, "keyboard: Enter on Undo undoes (it used to start text editing)");
}
/* the start card: X in the top-right corner (and Esc) closes it; example prompts fill the box on every product */
for (const [pid, word] of [["domed_white_vinyl_sticker_sheet", "sticker"], ["derby_ballpoint_pen", "Pens"]]) {
  await ev(`localStorage.clear()`); await send("Page.navigate", { url: base + "index.html?product=" + pid }); await sleep(2600);
  const g = await ev(`(()=>{const c=document.querySelector('.start-card').getBoundingClientRect(),x=document.querySelector('#startClose').getBoundingClientRect();return {open:!document.querySelector('#start').hidden,dr:Math.round(c.right-x.right),dt:Math.round(x.top-c.top),w:Math.round(x.width),h:Math.round(x.height),name:document.querySelector('#startClose').getAttribute('aria-label')}})()`);
  ok(g.open && g.dr >= 0 && g.dr <= 24 && g.dt >= 0 && g.dt <= 24 && g.w >= 24 && g.h >= 24 && g.name === "Close", `${pid}: X in the top-right corner, ${g.w}x${g.h} px (${JSON.stringify(g)})`);
  await press('#startEx [data-ex]', 400);
  const v = await ev(`document.querySelector('#startText').value`); ok(v.includes(word), `${pid}: example prompt fills the box ("${v.slice(0, 50)}")`);
  await press('#startClose', 500);
  const c = await ev(`({open:!document.querySelector('#start').hidden,focus:document.activeElement?.id,toast:document.querySelector('#toastTxt').textContent})`);
  ok(!c.open && c.focus === "cv" && /Genie is still here/.test(c.toast), `${pid}: X closes the card ${JSON.stringify(c)}`);
  ok(mobile ? /bottom/.test(c.toast) : /toolbar/.test(c.toast), `${pid}: the toast says where Genie is on this screen`);
  await send("Page.reload"); await sleep(2600);
  if (!mobile) { await press('#startText', 200); await send("Input.insertText", { text: "a logo" }); await key("Escape", "Escape", 27);
    ok((await ev(`document.querySelector('#start').hidden`)) === true, `${pid}: Esc closes the card while typing`) }
}
/* Genie Studio Basic (name badges): the same Start over */
{
  await send("Page.navigate", { url: base + "badges.html?product=regal_large_name_badge" }); await sleep(2200);
  const B = () => ev(`(()=>({name:document.querySelector('#tName').value,bg:document.querySelector('#bgs input:checked')?.value||document.querySelector('#bgs [aria-checked="true"]')?.textContent,btn:document.querySelector('#startOver').disabled,dlg:document.querySelector('#resetDlg').open,toast:document.querySelector('#toastTxt').textContent,list:[...document.querySelectorAll('#resetList li')].map(l=>l.textContent)}))()`);
  const b0 = await B(); ok(b0.btn === true, `Basic: Start over off on a fresh badge (${JSON.stringify(b0)})`);
  const selAll = process.platform === "darwin" ? 4 : 2;   // select all: Cmd+A on a Mac, Ctrl+A elsewhere
  await press('#tName', 200); await send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: selAll, commands: selAll === 4 ? ["selectAll"] : [] }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: selAll });
  await send("Input.insertText", { text: "Jordan Lee" }); await sleep(500);
  const sw = await ev(`(()=>{const l=[...document.querySelectorAll('#bgs label, #bgs button')];const x=l.find(e=>!(e.querySelector('input')||e).matches(':checked,[aria-checked="true"]'));if(!x)return null;x.id=x.id||'swPick';return '#'+x.id})()`);
  if (sw) await press(sw, 500);
  const b1 = await B(); ok(b1.name === "Jordan Lee" && b1.bg !== b0.bg && b1.btn === false, `Basic: setup ${JSON.stringify(b1)}`);
  await press('#startOver', 500); let b = await B(); ok(b.dlg && b.list.length >= 2, `Basic: dialog lists ${JSON.stringify(b.list)}`);
  await press('#resetKeep', 400); b = await B(); ok(!b.dlg && b.name === "Jordan Lee", "Basic: Keep my design keeps it");
  await press('#startOver', 500); await press('#resetGo', 700); b = await B();
  ok(!b.dlg && b.name === b0.name && b.bg === b0.bg && b.btn === true && /Badge cleared/.test(b.toast), `Basic: cleared ${JSON.stringify(b)}`);
  await shot("basic-cleared");
  await press('#toastAct', 600); b = await B(); ok(b.name === "Jordan Lee" && b.bg === b1.bg, `Basic: Undo brings it back ${JSON.stringify(b)}`);
  await press('#startOver', 500); await press('#resetGo', 700); await sleep(500); await send("Page.reload"); await sleep(2200); b = await B();
  ok(b.name === b0.name && b.btn === true, `Basic: still cleared after a reload (${b.name})`);
}
ok(errs.length === 0, "script errors: " + errs.join(" | "));
console.log(`reset-check ${W}x${H}: ${pass + fail} checks, ${fail} failed`);
ws.close(); proc.kill(); process.exit(fail ? 1 : 0);
