"""Build the prototype product pages: python studio-src/build_pdp.py public/p

One page per live customizable product (public/p/<url-slug>.html) plus an index (public/p/index.html), all from the
product definitions (products/<family>/*.json, pulled read-only from BigCommerce). Each page offers:
  Genie Studio Advanced  -> the full studio (index.html)        when definition.studios.advanced is true
  Genie Studio Basic     -> the guided studio (badges.html, ...) when definition.studios.basic is true
A studio that doesn't support the product yet shows as "Coming soon", never as a dead link.
Prototype pages are marked noindex; canonical points at the live customgenie.com URL.
"""
import os, sys, re, json, html as H
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import sitechrome
B = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(B, '..'); S = os.path.join(B, 'src'); P = os.path.join(ROOT, 'products')
rd = lambda p: open(p, encoding='utf-8').read()
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'public', 'p')
LIVE = 'https://customgenie.com'
FAMILY = {'sticker': ('Stickers & labels', 'stickers'), 'badge': ('Name badges', 'badges'), 'pen': ('Pens, pencils & notebooks', 'pens')}
ADVANCED = {'sticker': '../index.html', 'badge': '../index.html', 'pen': '../index.html'}   # family -> Genie Studio Advanced page (one studio for every family)
BASIC = {'badge': '../badges.html'}                           # family -> Genie Studio Basic page
STUDIO_COPY = {
    'advanced': 'The full design studio: place text, art and shapes anywhere, work in layers, chat with Genie AI, and check your print before you order.',
    'basic': {'badge': 'Quick and guided: pick a layout, add your logo, names and titles, and check every badge.',
              'sticker': 'Quick and guided: pick a shape and size, add your logo or text, and order.',
              'pen': 'Quick and guided: pick a layout, add your text or logo, and order.'},
}
e = lambda s: H.escape(str(s if s is not None else ''), quote=True)
money = lambda v: '$%.2f' % v
slug = lambda d: d['bigcommerce']['url'].strip('/').split('/')[-1]
fmt_in = lambda v: (lambda w, f: str(w) if f < 1e-6 else (next(((('%d ' % w) if w else '') + '%d/%d' % (round(f * dd), dd) for dd in (2, 4, 8, 16) if abs(round(f * dd) / dd - f) < 1e-6), '%.2f' % v)))(int(v), v - int(v))

def facts(d):
    rows = []; z = d['size']
    if z['mode'] == 'free': rows.append(('Size', 'Any size from %s × %s to %s × %s in' % (fmt_in(z['width']['min']), fmt_in(z['height']['min']), fmt_in(z['width']['max']), fmt_in(z['height']['max']))))
    elif z['mode'] == 'preset': rows.append(('Sizes', '%d sizes' % len(z['presets'])))
    elif z.get('w_in'): rows.append(('Size', '%s × %s in' % (fmt_in(z['w_in']), fmt_in(z['h_in']))))
    if d.get('shapes'): rows.append(('Shapes', ', '.join(s['bigcommerce_label'] for s in d['shapes'])))
    if d.get('materials'): rows.append(('Material', ', '.join(d['materials'])))
    if d.get('background_colors'): rows.append(('Background', ', '.join(d['background_colors'])))
    if d.get('border_colors'): rows.append(('Border', ', '.join(d['border_colors'])))
    if d.get('product_colors'): rows.append(('Colors', ', '.join(d['product_colors'])))
    if d.get('attachments'): rows.append(('Back', ' or '.join(a.capitalize() for a in d['attachments'])))
    rows.append(('Decoration', {'engraved': 'Engraved', 'cut_vinyl': 'Cut from solid-color vinyl'}.get(d['decoration'], 'Printed in full color')))
    if d['quantity'].get('min') and d['quantity']['min'] > 1: rows.append(('Minimum order', str(d['quantity']['min'])))
    if d.get('personalization') and d['personalization'].get('bulk_names_file'): rows.append(('Team orders', 'Upload a list of names, one badge per name'))
    return rows

def stencil(url, size):
    # BigCommerce CDN resize: /products/<pid>/images/<img>/<name>.<ts>.1280.1280.jpg -> /images/stencil/<size>/products/<pid>/<img>/<name>.<ts>.jpg
    m = re.match(r'^(https://cdn11\.bigcommerce\.com/s-[a-z0-9]+)/products/(\d+)/images/(\d+)/(.+?)\.\d+\.\d+(\.[a-z]+)(\?.*)?$', url or '')
    return f'{m.group(1)}/images/stencil/{size}/products/{m.group(2)}/{m.group(3)}/{m.group(4)}{m.group(5)}' if m else url
def srcset(url): return ', '.join(f'{stencil(url, f"{w}w")} {w}w' for w in (320, 640, 960)) if stencil(url, '640w') != url else ''
def orderable(d): return any(not v.get('purchasing_disabled') for v in d['pricing']['variants'])
def low_high(d):
    ps = [v['price'] for v in d['pricing']['variants'] if not v.get('purchasing_disabled')] or [v['price'] for v in d['pricing']['variants']]
    return min(ps), max(ps)

def cta(kind, d):
    fam = d['family']; ok = d['studios'][kind]; page = (ADVANCED if kind == 'advanced' else BASIC).get(fam)
    label = 'Genie Studio Advanced' if kind == 'advanced' else 'Genie Studio Basic'
    copy = STUDIO_COPY['advanced'] if kind == 'advanced' else STUDIO_COPY['basic'][fam]
    if ok and page:
        return f'<a class="cta cta-{kind}" href="{page}?product={e(d["id"])}" data-studio="{kind}"><span class="cta-t">{label}</span><span class="cta-d">{e(copy)}</span></a>'
    return f'<div class="cta cta-off" aria-disabled="true" data-studio="{kind}"><span class="cta-t">{label}</span><span class="cta-d">Coming soon for this product.</span></div>'

def page(d, head_extra, body):
    SITE = sitechrome.chrome('../', d['family'] if d else 'all')   # shared site header/footer (studio-src/site/)
    return f'''<!doctype html>
<html lang="en" data-root="../">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{head_extra}
<meta name="robots" content="noindex">
<link rel="icon" href="data:,">
<script>try{{const t=localStorage.getItem('cg-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}}catch(e){{}}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="{FONT}" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="{FONT}"></noscript>
<link rel="preconnect" href="https://cdn11.bigcommerce.com">
<style>
{CSS}
</style>
</head>
<body>
{SPRITE}
<a class="skip" href="#main">Skip to content</a>
{SITE[0]}
<main id="main"><div class="wrap">
{body}
</div></main>
{SITE[1]}
<script>
{SITE_JS}
</script>
<script>
(()=>{{const main=document.getElementById('mainImg');if(main)document.querySelectorAll('[data-img]').forEach(t=>t.addEventListener('click',()=>{{main.srcset=t.dataset.srcset||'';main.src=t.dataset.img;main.alt=t.dataset.alt;document.querySelectorAll('[data-img]').forEach(x=>x.setAttribute('aria-pressed',String(x===t)))}}));
const qr=document.getElementById('qRes');if(qr){{const q=(new URLSearchParams(location.search).get('q')||'').trim().toLowerCase(),words=q.split(/\\s+/).filter(Boolean);if(words.length){{let n=0;
 document.querySelectorAll('.fam').forEach(s=>{{let k=0;s.querySelectorAll('li').forEach(li=>{{const t=li.textContent.toLowerCase(),hit=words.every(w=>t.includes(w)||(w.endsWith('s')&&t.includes(w.slice(0,-1))));li.hidden=!hit;if(hit)k++}});s.hidden=!k;n+=k;const c=s.querySelector('h2 .muted');if(c)c.textContent='('+k+')'}});
 qr.innerHTML=(n?n+' product'+(n===1?'':'s')+' match':'No products match')+' <b></b>. <a href="index.html">Show all products</a>';qr.querySelector('b').textContent='\u201c'+q+'\u201d';qr.hidden=false;(window.dataLayer=window.dataLayer||[]).push({{event:'view_search_results',search_term:q,results:n}})}}}}
document.querySelectorAll('a[data-studio]').forEach(a=>a.addEventListener('click',()=>{{(window.dataLayer=window.dataLayer||[]).push({{event:'start_designing',studio:a.dataset.studio,product:new URL(a.href).searchParams.get('product')}})}}));}})();
</script>
</body>
</html>
'''

def pdp(d):
    fam_label, fam_anchor = FAMILY[d['family']]; lo, hi = low_high(d); imgs = d['pdp']['images']; tiers = d['pricing']['quantity_tiers']
    url = LIVE + d['bigcommerce']['url']; desc = d['pdp']['meta_description'] or re.sub('<[^>]+>', ' ', d['pdp']['description_html'])[:300]
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'Product', 'name': d['name'], 'url': url, 'image': [i['zoom'] for i in imgs[:6]], 'description': ' '.join(desc.split()), 'sku': d['bigcommerce']['sku'] or None,
         'brand': {'@type': 'Brand', 'name': 'Custom Genie'},
         'offers': {'@type': 'AggregateOffer', 'priceCurrency': 'USD', 'lowPrice': '%.2f' % lo, 'highPrice': '%.2f' % hi, 'offerCount': len(d['pricing']['variants']), 'url': url, **({} if orderable(d) else {'availability': 'https://schema.org/OutOfStock'})}},
        {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': LIVE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': fam_label, 'item': LIVE + '/' + d['bigcommerce']['url'].strip('/').split('/')[0] + '/'},
            {'@type': 'ListItem', 'position': 3, 'name': d['name'], 'item': url}]}]}
    ld['@graph'][0] = {k: v for k, v in ld['@graph'][0].items() if v}
    head = f'<title>{e(d["pdp"]["page_title"])} | Custom Genie</title>\n<meta name="description" content="{e(" ".join(desc.split())[:160])}">\n<link rel="canonical" href="{e(url)}">\n<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False).replace("</", "<\\/")}</script>'
    main = imgs[0] if imgs else None
    SIZES = '(min-width: 900px) 600px, 100vw'
    gallery = (f'<div class="g-main"><img id="mainImg" src="{e(stencil(main["zoom"], "640w"))}" srcset="{e(srcset(main["zoom"]))}" sizes="{SIZES}" alt="{e(main["alt"])}" width="640" height="640" fetchpriority="high"></div>' if main else '') + \
        ('<div class="g-thumbs">' + ''.join(f'<button type="button" class="g-t" data-img="{e(stencil(i["zoom"], "640w"))}" data-srcset="{e(srcset(i["zoom"]))}" data-alt="{e(i["alt"])}" aria-pressed="{str(k == 0).lower()}" aria-label="Show image {k + 1} of {len(imgs)}"><img src="{e(stencil(i["zoom"], "160w"))}" alt="" width="72" height="72" loading="lazy"></button>' for k, i in enumerate(imgs[:8])) + '</div>' if len(imgs) > 1 else '')
    tier_rows = ''.join(f'<tr><td>{t["min_qty"]}+</td><td>{t["amount"]:g}% off</td></tr>' for t in tiers if t['type'] == 'percent')
    facts_html = ''.join(f'<dt>{e(a)}</dt><dd>{e(b)}</dd>' for a, b in facts(d))
    price_line = f'From <strong>{money(lo)}</strong> each' + ('' if lo == hi else f' <span class="muted">(depends on size and options)</span>')
    body = f'''<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="index.html">Home</a></li><li><a href="index.html#{fam_anchor}">{e(fam_label)}</a></li><li aria-current="page">{e(d["name"])}</li></ol></nav>
<div class="pdp">
 <section class="gallery" aria-label="Product images">{gallery}</section>
 <section class="buy" aria-labelledby="pName">
  <p class="eyebrow">{e(fam_label)}</p>
  <h1 id="pName">{e(d["name"])}</h1>
  <p class="price">{price_line}</p>
  {'' if orderable(d) else '<p class="notice" role="note">Ordering is turned off for this product in the store right now, so it can\'t be added to the cart.</p>'}
  <div class="start" role="group" aria-labelledby="startH">
   <h2 id="startH">Start designing</h2>
   <div class="ctas">{cta("advanced", d)}{cta("basic", d)}</div>
  </div>
  {f'<table class="tiers"><caption>Buy more, save more</caption><thead><tr><th scope="col">Quantity</th><th scope="col">Discount</th></tr></thead><tbody>{tier_rows}</tbody></table>' if tier_rows else ''}
  <dl class="facts">{facts_html}</dl>
 </section>
</div>
<section class="desc" aria-labelledby="descH"><h2 id="descH">Product details</h2><div class="desc-in">{d["pdp"]["description_html"]}</div></section>'''
    return page(d, head, body)

def index(defs):
    cards = {}
    for d in defs:
        lo, _ = low_high(d); img = stencil(d['pdp']['images'][0]['zoom'], '320w') if d['pdp']['images'] else ''
        ready = lambda k: d['studios'][k] and (ADVANCED if k == 'advanced' else BASIC).get(d['family'])
        avail = ' '.join(f'<span class="tag{"" if ready(k) else " tag-off"}">{"Advanced" if k == "advanced" else "Basic"}<span class="sr-only">{" ready" if ready(k) else " coming soon"}</span></span>' for k in ('advanced', 'basic'))
        cards.setdefault(d['family'], []).append(f'<li><a class="card" href="{slug(d)}.html"><img src="{e(img)}" alt="" width="240" height="240" loading="lazy"><span class="card-n">{e(d["name"])}</span><span class="card-p">From {money(lo)} each</span><span class="tags">{avail}</span></a></li>')
    secs = ''.join(f'<section class="fam" id="{FAMILY[f][1]}" aria-labelledby="h-{f}"><h2 id="h-{f}">{e(FAMILY[f][0])} <span class="muted">({len(cards.get(f, []))})</span></h2><ul class="cards">{"".join(cards.get(f, []))}</ul></section>' for f in FAMILY)
    body = f'<div class="intro"><h1>Custom Genie products</h1><p class="sub">Every customizable product, with the studios you can design it in. <span class="tag">Advanced</span> and <span class="tag">Basic</span> show which Genie Studio is ready; grey means coming soon.</p><p class="q-res" id="qRes" role="status" hidden></p></div>{secs}'
    return page(None, '<title>Custom Genie products | Prototype</title>', body)

idx = json.loads(rd(os.path.join(P, 'index.json')))['products']
defs = [json.loads(rd(os.path.join(P, r['file']))) for r in idx if r['status'] == 'live']
FONT = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Work+Sans:wght@400;500;600;700;800&display=swap'
tokens = rd(os.path.join(S, 'style.css')); tokens = tokens[tokens.index(':root{'):tokens.index('*,*::before,*::after')]
base = rd(os.path.join(B, 'badge', 'badge.css')); base = base[:base.index('/* intro */')]       # reset, header, buttons from the badge studio
CSS = (tokens + sitechrome.css(rd(os.path.join(S, 'style.css'))) + sitechrome.strip(base) + sitechrome.strip(rd(os.path.join(B, 'pdp', 'pdp.css')))
       + '\nbody{font-family:"Poppins","Work Sans",system-ui,-apple-system,"Segoe UI",sans-serif}\n')
SITE_JS = sitechrome.js()
LOGO = rd(os.path.join(B, 'assets', 'logo.txt')).strip()
sp = rd(os.path.join(S, 'sprite.html')); sp = sp[:sp.index('</svg>') + 6]; sp = re.sub(r'<defs>[\s\S]*?</defs>\s*', '', sp)
SPRITE = re.sub(r'<symbol id="([^"]+)"[\s\S]*?</symbol>\s*', lambda m: m.group(0) if m.group(1) in set(sitechrome.ICONS) | set(re.findall(r'#(i-[a-z-]+)', rd(os.path.join(sitechrome.SITE, 'header.html')) + rd(os.path.join(sitechrome.SITE, 'footer.html')))) else '', sp)
os.makedirs(OUT, exist_ok=True); sitechrome.write_assets(os.path.join(OUT, '..'))
for f in os.listdir(OUT):
    if f.endswith('.html'): os.remove(os.path.join(OUT, f))
for d in defs: open(os.path.join(OUT, slug(d) + '.html'), 'w', encoding='utf-8').write(pdp(d))
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(index(defs))
n = {k: sum(1 for d in defs if d['studios'][k]) for k in ('advanced', 'basic')}
print('wrote %d product pages + index to %s | Advanced ready: %d, Basic ready: %d' % (len(defs), OUT, n['advanced'], n['basic']))
