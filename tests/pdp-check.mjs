// tests/pdp-check.mjs : every prototype product page against its definition, and every live "Start designing" button
// opened to confirm the studio loads that exact product and links back to the page.
// Usage: node server.mjs (in another terminal), then: node tests/pdp-check.mjs [baseUrl]
import { spawn } from "node:child_process"; import { mkdtempSync, readFileSync } from "node:fs"; import { tmpdir } from "node:os"; import { join, dirname } from "node:path"; import { fileURLToPath } from "node:url";
const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.argv[2] || "http://127.0.0.1:8766/").replace(/\/?$/, "/");
const idx = JSON.parse(readFileSync(join(repo, "products", "index.json"), "utf8")).products.filter(r => r.status === "live");
const defs = idx.map(r => JSON.parse(readFileSync(join(repo, "products", r.file), "utf8")));
const ADV = { sticker: "index.html", badge: "index.html", pen: "index.html" }, BAS = { badge: "badges.html" };
const slug = d => d.bigcommerce.url.split("/").filter(Boolean).pop();
const exe = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe", port = 9700 + Math.floor(Math.random() * 90);
const proc = spawn(exe, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "pd-"))}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let t;
for (let i = 0; i < 60 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === "page") } catch { await sleep(250) } }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener("open", r, { once: true }));
let id = 0; const pend = new Map(), errors = []; let where = "";
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  if (m.method === "Runtime.exceptionThrown") errors.push(where + ": " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200)) });
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) });
const ev = async e => (await send("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
const go = async (u, wait = 1200) => { where = u; await send("Page.navigate", { url: u }); await sleep(wait) };
await send("Runtime.enable"); await send("Page.enable");
const fail = []; let checks = 0; const ok = (c, m) => { checks++; if (!c) fail.push(m) };
for (const d of defs) {
  const u = base + "p/" + slug(d) + ".html"; await go(u, 700);
  const s = await ev(`(()=>{const ld=JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@graph'];return{h1:document.querySelector('h1').textContent,
    ctas:[...document.querySelectorAll('.cta')].map(c=>({s:c.dataset.studio,href:c.getAttribute('href')})),low:ld[0].offers.lowPrice,canon:document.querySelector('link[rel=canonical]').href,notice:!!document.querySelector('.notice'),oos:ld[0].offers.availability==='https://schema.org/OutOfStock',robots:document.querySelector('meta[name=robots]').content,crumbs:ld[1].itemListElement.length}})()`);
  ok(s && s.h1 === d.name, `${d.id}: h1`);
  const buy = d.pricing.variants.filter(v => !v.purchasing_disabled), lo = (buy.length ? Math.min(...buy.map(v => v.price)) : Math.min(...d.pricing.variants.map(v => v.price))).toFixed(2);
  ok(s && s.low === lo, `${d.id}: JSON-LD lowPrice ${s && s.low} vs ${lo}`);
  ok(s && s.notice === !buy.length && s.oos === !buy.length, `${d.id}: 'ordering is turned off' notice and OutOfStock only when every variant is disabled`);
  ok(s && s.canon === "https://customgenie.com" + d.bigcommerce.url && s.robots === "noindex" && s.crumbs === 3, `${d.id}: canonical, noindex, breadcrumbs`);
  for (const [k, map] of [["advanced", ADV], ["basic", BAS]]) {
    const c = s && s.ctas.find(x => x.s === k), want = d.studios[k] && map[d.family] ? `../${map[d.family]}?product=${d.id}` : null;
    ok(c && (c.href || null) === want, `${d.id}: ${k} button ${c && c.href} (expected ${want || "coming soon"})`);
    if (want) {   // open it: the studio must load this product and link back here
      await go(new URL(want, u).href, 3500);
      const st = await ev(k === "advanced"
        ? `({pid:document.querySelector('#prodSel')?.value,h1:document.querySelector('#pTitle')?.textContent,back:document.querySelector('#pdpBack')?.href,name:document.querySelector('.studio-name span')?.textContent})`
        : `({pid:document.querySelector('#product')?.value,back:document.querySelector('#pdpBack')?.href,name:document.querySelector('.studio-name span')?.textContent})`);
      ok(st && st.pid === d.id && (k !== "advanced" || st.h1 === d.name), `${d.id}: ${k} studio opened on ${JSON.stringify(st)}`);
      ok(st && st.back === u && st.name === (k === "advanced" ? "Genie Studio Advanced" : "Genie Studio Basic"), `${d.id}: ${k} studio label and back link (${st && st.back})`);
    }
  }
}
await go(base + "p/index.html", 800);
const cards = await ev(`document.querySelectorAll('.card').length`); ok(cards === defs.length, `index lists ${cards} of ${defs.length} products`);
ok(errors.length === 0, `script errors: ${errors.slice(0, 3).join(" | ")}`);
console.log(`${defs.length} product pages, ${checks} checks, ${fail.length} failed`); fail.forEach(f => console.log("  FAIL " + f));
ws.close(); proc.kill(); process.exit(fail.length ? 1 : 0);
