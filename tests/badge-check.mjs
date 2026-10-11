// tests/badge-check.mjs : drives the name badge studio like a shopper and checks it against the BigCommerce definitions.
// Checks: all 14 badges resolve to real BigCommerce variants, logo upload and all layouts, a team list with a too-long
// name, Review & Print (proof approval, quantity tiers, price, cart option and modifier ids), engraving, phone layout,
// no script errors. Screenshots go to .cache/test-shots/ (gitignored).
// Usage: node server.mjs (in another terminal), then: node tests/badge-check.mjs [pageUrl] [width height]
//   CHROME=/path/to/chrome to override the browser. Exit code 1 on any failure.
import { spawn } from "node:child_process"; import { mkdtempSync, writeFileSync, readFileSync, readdirSync, mkdirSync } from "node:fs"; import { tmpdir } from "node:os"; import { join, dirname } from "node:path"; import { fileURLToPath } from "node:url";
const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const [url = "http://127.0.0.1:8766/badges.html?debug", W = "1440", H = "900"] = process.argv.slice(2); const mobile = +W < 800;
mkdirSync(join(repo, ".cache", "test-shots"), { recursive: true }); const out = join(repo, ".cache", "test-shots", "badge" + W);
const logoPng = join(tmpdir(), "cg-badge-test-logo.png");   // the Custom Genie logo from the repo assets, as a real PNG upload
writeFileSync(logoPng, Buffer.from(readFileSync(join(repo, "studio-src", "assets", "logo.txt"), "utf8").trim().split(",")[1], "base64"));
const r2 = v => Math.round(v * 100) / 100;
const defs = {}; for (const f of readdirSync(join(repo, "products", "badge"))) { const d = JSON.parse(readFileSync(join(repo, "products", "badge", f), "utf8")); defs[d.id] = d }
const exe = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe", port = 9700 + Math.floor(Math.random() * 90);
const proc = spawn(exe, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "bt-"))}`, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let t;
for (let i = 0; i < 60 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === "page") } catch { await sleep(250) } }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener("open", r, { once: true }));
let id = 0; const pend = new Map(), errors = [];
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description?.slice(0, 300) || m.params.exceptionDetails.text);
  if (m.method === "Log.entryAdded" && m.params.entry.level === "error" && !/favicon/.test(m.params.entry.url || "")) errors.push("console: " + m.params.entry.text.slice(0, 200)) });
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) });
const ev = async e => { const r = await send("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 500)); return r.result?.result?.value };
const shot = async (name, sel) => { let clip; if (sel) { const b = await ev(`(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return{x:r.left,y:r.top+scrollY,width:r.width,height:r.height}})()`); clip = { ...b, scale: 1 } }
  const r = await send("Page.captureScreenshot", { format: "png", ...(clip ? { clip, captureBeyondViewport: true } : {}) }); writeFileSync(`${out}_${name}.png`, Buffer.from(r.result.data, "base64")) };
await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: mobile ? 2 : 1, mobile });
if (mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable"); await send("DOM.enable");
await send("Page.navigate", { url }); await sleep(2500); await ev("localStorage.clear()"); await send("Page.reload", {}); await sleep(3500);
const pass = [], fail = []; const ok = (c, msg) => (c ? pass : fail).push(msg);
const setFile = async (sel, path) => { const doc = await send("DOM.getDocument", { depth: -1 }); const q = await send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: sel }); return send("DOM.setFileInputFiles", { nodeId: q.result.nodeId, files: [path] }) };
const choose = (name, value) => ev(`(()=>{const i=[...document.querySelectorAll('input[name="${name}"]')].find(i=>i.value===${JSON.stringify(value)});if(!i)return false;i.click();return true})()`);
const product = async pid => { await ev(`(()=>{const s=document.querySelector('#product');s.value=${JSON.stringify(pid)};s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(350) };

// 1. every badge renders, and the chosen options resolve to a real BigCommerce variant
const ids = await ev(`[...document.querySelectorAll('#product option')].map(o=>o.value)`);
ok(ids.length === 14, `14 badges in the picker (got ${ids.length})`);
for (const pid of ids) {
  await product(pid);
  const s = await ev(`(()=>{const b=__badge,v=b.variant();return{svg:!!document.querySelector('#badgeView svg text'),sku:v.sku,vid:v.id,price:v.price,S:{size:b.S.size,bg:b.S.bg,border:b.S.border,attach:b.S.attach},cap:document.querySelector('#stageCap').textContent}})()`);
  const d = defs[pid], want = { size: s.S.size === "default" ? undefined : s.S.size, background_color: s.S.bg, border_color: s.S.border, attachment: s.S.attach };
  const match = d.pricing.variants.find(v => Object.entries(v.options).every(([k, val]) => want[k] === undefined || want[k] === val));
  ok(s.svg, `${pid}: badge drawn with text`);
  ok(match && match.id === s.vid && match.sku === s.sku && match.price === s.price, `${pid}: variant ${s.sku} matches BigCommerce`);
}
// 2. logo upload switches to a logo layout; every layout renders
await product("regal_large_name_badge");
await setFile("#logoFile", logoPng); await sleep(1500);
const afterLogo = await ev(`({layout:__badge.S.layout,logo:!!__badge.S.logo,toast:document.querySelector('#toast').textContent,img:!!document.querySelector('#badgeView svg image')})`);
ok(afterLogo.logo && afterLogo.img, "logo upload shows the logo on the badge");
ok(afterLogo.layout === "6" && /Layout changed/.test(afterLogo.toast), `text-only layout switches to layout 6 after a logo is added (${afterLogo.layout})`);
for (const L of ["1", "2", "3", "4", "5", "6", "7", "text"]) { await choose("layout", L); await sleep(200);
  const r = await ev(`({l:__badge.S.layout,t:document.querySelectorAll('#badgeView svg text').length,i:document.querySelectorAll('#badgeView svg image').length})`);
  const expT = { "1": 1, "2": 1, "3": 2, "4": 1, "5": 0, "6": 2, "7": 2, text: 2 }[L], expI = L === "text" ? 0 : 1;
  ok(r.l === L && r.t === expT && r.i === expI, `layout ${L}: ${r.t} text line(s), ${r.i} logo (expected ${expT}, ${expI})`) }
await choose("layout", "6"); await sleep(200); await shot("regal_logo", "#stageBox");
// 3. team list with a too-long name
const list = "Name,Title\nAlex Morgan, Store Manager\nJordan Lee, Barista\nChristopher Alexander Montgomery-Worthington III, Senior Vice President of Regional Operations\nSam Rivera\nPriya Patel, Shift Lead";
await ev(`(()=>{const t=document.querySelector('#names');t.value=${JSON.stringify(list)};t.dispatchEvent(new Event('input',{bubbles:true}))})()`); await sleep(900);
const nl = await ev(`({count:document.querySelector('#namesCount').textContent,issues:[...document.querySelectorAll('#namesIssues li')].map(l=>l.textContent),who:document.querySelector('#whoTxt').textContent,disabled:document.querySelector('#tName').disabled})`);
ok(/^5 badges/.test(nl.count), `names list: header skipped, 5 badges (${nl.count.slice(0, 60)})`);
ok(nl.issues.length >= 1 && nl.issues.every(x => /Line 4/.test(x)), `only line 4 is flagged as too long (${nl.issues.length} issue(s): ${(nl.issues[0] || "").slice(0, 90)})`);
ok(/Badge 1 of 5/.test(nl.who) && nl.disabled, "preview steps through the list; single name fields are disabled");
await ev(`document.querySelector('#whoNext').click()`); await sleep(250); ok(/Badge 2 of 5: Jordan Lee/.test(await ev(`document.querySelector('#whoTxt').textContent`)), "next name button works");
// 4. Review & Print
await ev(`document.querySelector('#reviewBtn').click()`); await sleep(700);
const p1 = await ev(`({open:document.querySelector('#review').open,proofs:document.querySelectorAll('#proofs figure').length,bad:document.querySelectorAll('#proofs figure.bad').length})`);
ok(p1.open && p1.proofs === 5 && p1.bad === 1, `proof shows 5 badges, 1 flagged (${p1.proofs}, ${p1.bad})`);
await shot("review_proof");
await ev(`document.querySelector('#next1').click()`); await sleep(250);
ok(await ev(`!document.querySelector('#approveErr').hidden && !document.querySelector('.pane[data-pane="1"]').hidden`), "cannot continue without approving the proof");
await ev(`document.querySelector('#approve').click();document.querySelector('#next1').click()`); await sleep(400);
const q = await ev(`({txt:document.querySelector('#qtyNamesTxt').textContent,on:document.querySelector('#tiers tr.on')?.textContent})`);
ok(/^5 badges/.test(q.txt) && /^5/.test(q.on || ""), `quantity follows the list (5) and the 5+ price row is highlighted (${q.on})`);
await ev(`document.querySelector('#next2').click()`); await sleep(400);
const cd = await ev(`__badge.cartData()`), d = defs.regal_large_name_badge, v = d.pricing.variants.find(x => x.id === cd.variant_id);
const tier = d.pricing.quantity_tiers.filter(x => 5 >= x.min_qty).pop(), unit = r2(v.price * (1 - tier.amount / 100));
const shown = await ev(`document.querySelector('#total').textContent`);
ok(cd.quantity === 5 && cd.unit_price === unit && shown === "$" + (unit * 5).toFixed(2), `price: 5 x $${unit} = ${shown} (BigCommerce $${v.price} less ${tier.amount}%)`);
const optOk = cd.options.every(o => { const def = d.cart.options.find(x => x.id === o.option_id); return def && def.values.some(val => val.id === o.value_id && val.label === o.value) });
ok(optOk && cd.options.length >= 2, `cart options use real BigCommerce option and value ids (${cd.options.map(o => o.option + "=" + o.value).join(", ")})`);
ok(cd.modifiers["Review"]?.value === "Yes" && cd.modifiers["Select Layout"]?.value === "layout6" && cd.modifiers["Name"] && cd.names?.length === 5, "cart modifiers: proof approved, layout6, names attached");
await shot("review_price");
await ev(`document.querySelector('#addCart').click()`); await sleep(500);
const added = await ev(`({open:document.querySelector('#review').open,cart:document.querySelector('#cartCount').textContent,toast:document.querySelector('#toast').textContent,ev:(window.dataLayer||[]).filter(e=>e.event==='add_to_cart').length})`);
ok(!added.open && added.cart === "1" && /Added to cart: .*5 badges, \$/.test(added.toast) && added.ev === 1, `add to cart: dialog closes, cart shows 1, add_to_cart event sent (${added.toast})`);
// 5. same badge for everyone, 25 badges -> 20+ tier
await ev(`document.querySelector('#namesClear').click()`); await sleep(400);
await ev(`document.querySelector('#reviewBtn').click()`); await sleep(500); await ev(`document.querySelector('#approve').click();document.querySelector('#next1').click()`); await sleep(300);
await ev(`(()=>{const i=document.querySelector('#qty');i.value='25';i.dispatchEvent(new Event('input',{bubbles:true}))})()`); await sleep(250);
await ev(`document.querySelector('#next2').click()`); await sleep(300);
const cd2 = await ev(`__badge.cartData()`), t2 = d.pricing.quantity_tiers.filter(x => 25 >= x.min_qty).pop();
ok(cd2.quantity === 25 && cd2.unit_price === r2(v.price * (1 - t2.amount / 100)), `25 badges: ${t2.amount}% off, $${cd2.unit_price} each`);
await ev(`document.querySelector('#review').close()`);
// 6. look of other badges (with the logo)
for (const [pid, opts] of [["executive_metal_name_badge", { bg: "Silver", border: "Gold" }], ["engraved_plastic_name_badge", { bg: "Black-White" }], ["printed_wooden_name_badge", {}], ["engraved_wooden_name_badge", {}],
  ["chalkboard_name_badge", {}], ["oval_name_badge", { bg: "Custom Color" }], ["circle_name_badge", {}], ["oval_top_name_badge", { bg: "Silver" }], ["metal_reusable_name_badge", { bg: "Gold" }], ["prestige_plastic_name_badge", { border: "Maroon", bg: "Silver" }]]) {
  await product(pid); for (const [k, val] of Object.entries(opts)) await choose(k, val); await sleep(300); await shot("look_" + pid, "#stageBox") }
const eng = await ev(`(()=>{const s=document.querySelector('#badgeView svg');return null})()`);
await product("engraved_plastic_name_badge"); await choose("bg", "Black-Tan"); await sleep(300);
const engr = await ev(`({filter:!!document.querySelector('#badgeView svg image[filter]'),colorsHidden:document.querySelector('#colorRow').hidden,fill:document.querySelector('#badgeView svg text')?.getAttribute('fill')})`);
ok(engr.filter && engr.colorsHidden && engr.fill === "#C9A878", `engraved plate Black-Tan: logo and text in one engraving color (${engr.fill}), color pickers hidden`);
// 7. phone: the preview stays in view while scrolling the options
if (mobile) { await product("regal_large_name_badge"); await ev(`scrollTo(0,1400)`); await sleep(400);
  const st = await ev(`(()=>{const r=document.querySelector('.stage').getBoundingClientRect();return{top:Math.round(r.top),bottom:Math.round(r.bottom),h:innerHeight}})()`);
  ok(st.top <= 1 && st.bottom > 120 && st.bottom < st.h * .6, `phone: preview pinned at the top while scrolling (top ${st.top}, bottom ${st.bottom} of ${st.h})`); await shot("mobile_scrolled") }
const overflow = await ev(`document.documentElement.scrollWidth-innerWidth`); ok(overflow <= 0, `no horizontal overflow (${overflow}px)`);
ok(errors.length === 0, `no script errors (${errors.length}${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""})`);
console.log(`PASS ${pass.length}`); pass.forEach(x => console.log("  ok   " + x)); console.log(`FAIL ${fail.length}`); fail.forEach(x => console.log("  FAIL " + x));
ws.close(); proc.kill(); process.exit(fail.length ? 1 : 0);
