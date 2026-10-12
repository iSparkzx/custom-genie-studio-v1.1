// One website: every page type has the same header and footer as Genie Studio Advanced, every link in them works,
// and search, theme and the cart carry across pages.
// Usage: node server.mjs (in another terminal), then: node tests/site-check.mjs [baseUrl] [width] [height]
//   Screenshots go to .cache/test-shots/site/ (gitignored). Exit code 1 on any failure.
import { spawn } from "node:child_process"; import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs"; import { tmpdir } from "node:os"; import { join, dirname } from "node:path"; import { fileURLToPath } from "node:url";
const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.argv[2] || "http://127.0.0.1:8766/").replace(/\/?$/, "/"), W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900), mobile = W < 800;
const out = join(repo, ".cache", "test-shots", "site"); mkdirSync(out, { recursive: true });
const exe = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe", port = 9400 + Math.floor(Math.random() * 300);
const proc = spawn(exe, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "st-"))}`, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let t;
for (let i = 0; i < 60 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === "page") } catch { await sleep(250) } }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener("open", r, { once: true }));
let id = 0; const pend = new Map(), errs = [];
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200)) });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) });
const ev = async e => (await send("Runtime.evaluate", { expression: `(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));${e}})()`, awaitPromise: true, returnByValue: true })).result?.result?.value;
const go = async (u, wait = 1800) => { await send("Page.navigate", { url: u.startsWith("http") ? u : base + u }); await sleep(wait) };
const shot = async n => { const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(out, `${W}-${n}.png`), Buffer.from(r.result.data, "base64")) };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m) } };
await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile }); if (mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true });

/* the header and footer, with only the per-page parts taken out: path prefix, current section, live labels */
const CHROME = `const norm=s=>s.replace(/(href|src|data-src)="\\.\\.\\//g,'$1="').replace(/ aria-current="page"/g,'').replace(/class="nav-dd on"/g,'class="nav-dd"')
  .replace(/ (aria-label|title|aria-expanded|aria-haspopup|aria-controls)="[^"]*"/g,'').replace(/<span class="cart-count" id="cartCount">[^<]*<\\/span>/,'').replace(/ value="[^"]*"/g,'').replace(/ src="[^"]*" data-src/g,' data-src').replace(/\\s+/g,' ');
 const h=document.querySelector('.promo'),hd=document.querySelector('body > header, header.site'),f=document.querySelector('footer.foot, footer');
 const r=e=>e?Math.round(e.getBoundingClientRect().height):0,logo=document.querySelector('header .logo img');
 return {head:norm((h?h.outerHTML:'')+(hd?hd.outerHTML:'')),foot:norm(f?f.outerHTML:''),hh:r(h)+r(hd),logo:!!logo&&logo.complete&&logo.naturalWidth>0,
  cur:[...document.querySelectorAll('header .nav [aria-current="page"], header .nav .nav-dd.on')].map(a=>a.textContent.trim()),over:document.documentElement.scrollWidth-innerWidth,
  links:[...document.querySelectorAll('.promo a[href], header a[href], footer a[href]')].map(a=>({href:a.href,proto:a.hasAttribute('data-proto')}))}`;
const PAGES = [["index.html", "Advanced, stickers", "Stickers"], ["index.html?product=derby_ballpoint_pen", "Advanced, pen", "Pens"], ["index.html?product=regal_large_name_badge", "Advanced, badge", "Name Badges"],
  ["badges.html", "Basic badge studio", "Name Badges"], ["p/index.html", "All products", "All Products"], ["p/derby-ballpoint-pen.html", "Pen product page", "Pens"],
  ["p/regal-large-name-badge.html", "Badge product page", "Name Badges"], ["p/domed-white-vinyl-sticker-sheet.html", "Sticker product page", "Stickers"]];
let ref = null; const links = new Map();
for (const [u, name, cur] of PAGES) {
  await go(u); const c = await ev(CHROME);
  if (!ref) ref = c;
  ok(c.head && c.head === ref.head, `${name}: header differs from Genie Studio Advanced`);
  ok(c.foot && c.foot === ref.foot, `${name}: footer differs from Genie Studio Advanced`);
  ok(Math.abs(c.hh - ref.hh) <= 1, `${name}: header height ${c.hh} vs ${ref.hh}`);
  ok(c.logo, `${name}: logo didn't load`);
  ok(c.cur.length === 1 && c.cur[0].toLowerCase() === cur.toLowerCase(), `${name}: current section ${JSON.stringify(c.cur)}, expected ${cur}`);
  ok(c.over <= 0, `${name}: sideways scroll ${c.over}px`);
  for (const l of c.links) if (!l.proto) links.set(l.href.split("#")[0], name);
  await shot(u.replace(/[^a-z0-9]+/gi, "_"));
  if (c.head !== ref.head && process.env.DIFF) { let i = 0; while (c.head[i] === ref.head[i]) i++; console.log("  differs at", i, "\n  ref:", ref.head.slice(i - 80, i + 120), "\n  got:", c.head.slice(i - 80, i + 120)) }
}
/* every real link in the header and footer opens a page */
for (const [href, from] of links) {
  if (!href.startsWith(base)) { ok(/^https:\/\/(www\.worldemblem\.com|herospride\.com)\/$/.test(href), `${from}: unexpected outside link ${href}`); continue }
  const r = await fetch(href); ok(r.status === 200, `${from}: link ${href} returned ${r.status}`);
}
/* search from a product page: All products, filtered */
await go("p/derby-ballpoint-pen.html");
if (mobile) await ev(`document.querySelector('#q').scrollIntoView({block:'center'})`);
await ev(`const q=document.querySelector('#q');q.value='gold';document.querySelector('#searchForm').requestSubmit()`); await sleep(1800);
const sr = await ev(`return {url:location.pathname+location.search,res:document.querySelector('#qRes')?.innerText,cards:[...document.querySelectorAll('.fam li')].filter(li=>!li.hidden).map(li=>li.innerText.toLowerCase()),q:document.querySelector('#q').value,heads:[...document.querySelectorAll('.fam')].filter(s=>!s.hidden).map(s=>[+s.querySelector('h2 .muted').textContent.replace(/\\D/g,''),[...s.querySelectorAll('li')].filter(li=>!li.hidden).length])}`);
ok(sr.url === "/p/index.html?q=gold", `search went to ${sr.url}`);
ok(sr.cards.length > 0 && sr.cards.every(c => c.includes("gold")), `search results: ${sr.cards.length} cards, not all gold`);
ok(sr.res && sr.res.startsWith(sr.cards.length + " product"), `search count line: ${sr.res}`);
ok(sr.q === "gold", "search box keeps the search term");
ok(sr.heads.every(([k, n]) => k === n), `section counts don't match the results: ${JSON.stringify(sr.heads)}`);
await shot("search");
/* theme: chosen on one page, kept on the next */
const th0 = await ev(`document.querySelector('#themeBtn').click();await w(200);return document.documentElement.dataset.theme`);
await go("badges.html"); const th1 = await ev(`return document.documentElement.dataset.theme`);
ok(th0 && th0 === th1, `theme ${th0} on the product page, ${th1} on the next page`);
await go("p/index.html"); await ev(`document.querySelector('#themeBtn').click();await w(200)`);
/* mega menu on a product page: shape button opens the studio on that shape */
if (!mobile) {
  await go("p/regal-large-name-badge.html");
  const mg = await ev(`document.querySelector('#megaBtn').click();await w(400);const m=document.querySelector('#mega');return {open:!m.hidden,links:[...m.querySelectorAll('.mega-list a')].map(a=>a.getAttribute('href'))}`);
  ok(mg.open, "mega menu didn't open on a product page");
  ok(mg.links.length >= 5 && mg.links.every(h => /^\.\.\/p\/[a-z0-9-]+\.html(#stickers)?$/.test(h)), `mega menu links: ${mg.links}`);
  await shot("mega");
  await ev(`document.querySelector('#mega [data-mshape="circle"]').click()`); await sleep(2200);
  const ms = await ev(`return {url:location.pathname+location.search,title:document.querySelector('#pTitle').textContent,sum:document.querySelector('#cbSum')?.innerText}`);
  ok(ms.url.startsWith("/index.html?product=domed_white_vinyl_sticker_sheet&shape=circle"), `mega shape went to ${ms.url}`);
  ok(/circle/i.test(ms.sum || ""), `studio opened from the mega menu isn't on Circle: ${ms.sum}`);
}
/* one cart: add in Genie Studio Advanced, see it on a product page and in Genie Studio Basic, add there too */
await go("index.html?product=domed_white_vinyl_sticker_sheet", 2500);
await ev(`document.querySelector('#start [data-start="blank"]')?.click();await w(300);document.querySelector('#reviewBtn').click();await w(700);const c=document.querySelector('#confirm');if(!c.checked)c.click();await w(150);document.querySelector('#rvNext1').click();await w(600);document.querySelectorAll('.qopt input')[0].click();await w(300);document.querySelector('#rvNext2').click();await w(600)`);
const btn = await ev(`return document.querySelector('#addCart').innerText.trim()`);
await ev(`document.querySelector('#addCart').click();await w(900)`);
const c1 = await ev(`return {n:document.querySelector('#cartCount').textContent,items:window.CGSite.items()}`);
ok(c1.n === "1" && c1.items.length === 1, `Advanced add to cart: count ${c1.n}, ${c1.items.length} lines`);
const line = c1.items[0] || {}; ok(line.name === "Domed White Vinyl Sticker Sheet" && btn.includes("$" + (line.total || 0).toFixed(2)) && /^57/.test(line.sku || ""), `cart line ${JSON.stringify(line).slice(0, 200)} vs button "${btn}"`);
await go("p/derby-ballpoint-pen.html");
const c2 = await ev(`const b=document.querySelector('#cartBtn');b.scrollIntoView({block:'center'});b.click();await w(300);const m=document.querySelector('#miniCart');return {n:document.querySelector('#cartCount').textContent,open:!m.hidden,txt:m.innerText,link:m.querySelector('.mc-t a')?.getAttribute('href')}`);
ok(c2.n === "1", `product page cart count ${c2.n}`);
ok(c2.open && c2.txt.includes("Domed White Vinyl Sticker Sheet") && c2.txt.includes("Subtotal"), "mini cart on the product page doesn't show the line");
ok(c2.link === "../p/domed-white-vinyl-sticker-sheet.html", `mini cart product link ${c2.link}`);
await shot("minicart");
await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));await w(150)`);
await go("badges.html");
await ev(`document.querySelector('#reviewBtn').click();await w(600);const a=document.querySelector('#approve');if(!a.checked)a.click();await w(150);document.querySelector('#next1').click();await w(500);document.querySelector('#next2').click();await w(500);document.querySelector('#addCart').click();await w(800)`);
const c3 = await ev(`return {n:document.querySelector('#cartCount').textContent,items:window.CGSite.items()}`);
ok(c3.n === "2" && c3.items.length === 2 && c3.items[1].studio === "basic" && c3.items[1].url && c3.items[1].url.startsWith("p/"), `Basic add to cart: count ${c3.n}, ${JSON.stringify(c3.items[1] || {}).slice(0, 220)}`);
await go("index.html"); const c4 = await ev(`return document.querySelector('#cartCount').textContent`);
ok(c4 === "2", `Advanced studio cart count after the badge: ${c4}`);
ok(errs.length === 0, "script errors: " + errs.join(" | "));
console.log(`site-check ${W}x${H}: ${PAGES.length} pages, ${links.size} links, ${pass + fail} checks, ${fail} failed`);
ws.close(); proc.kill(); process.exit(fail ? 1 : 0);
