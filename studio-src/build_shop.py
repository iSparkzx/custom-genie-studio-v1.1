"""Build the storefront: python studio-src/build_shop.py public

  public/home.html                                   homepage (server.mjs serves it at /)
  public/p/index.html                                All products, and search results (?q=)
  public/p/stickers.html, name-badges.html, pens.html   one collection per family, with filters and sort
  public/p/<slug>.html                               one product page per live customizable product

Everything comes from the product definitions (products/<family>/*.json, pulled read-only from BigCommerce): names,
pictures, prices, quantity discounts, options. Each product page offers:
  Genie Studio Advanced -> index.html?product=<id>   when definition.studios.advanced is true
  Genie Studio Basic    -> badges.html?product=<id>  when definition.studios.basic is true
A studio that doesn't support a product yet says "coming soon", never a dead link. Claims on the pages are the ones the
site already makes (promo bar, studio trust badges, product descriptions) or are computed from the definitions.
Prototype pages are marked noindex; canonical links point at the live customgenie.com pages.
Styles: studio-src/shop/shop.css (storefront) on top of the brand tokens and site chrome. Behavior: studio-src/shop/shop.js.
"""
import os, sys, re, json, html as H
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import sitechrome
B = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(B, '..'); S = os.path.join(B, 'src'); P = os.path.join(ROOT, 'products'); SH = os.path.join(B, 'shop')
rd = lambda p: open(p, encoding='utf-8').read()
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'public')
LIVE = 'https://customgenie.com'
e = lambda s: H.escape(str(s if s is not None else ''), quote=True)
money = lambda v: '$%.2f' % v

# ---------- families, collections and product types ----------
FAMILY = {
    'sticker': {'label': 'Stickers & labels', 'page': 'stickers', 'h1': 'Custom stickers & labels', 'short': 'Stickers', 'live': '/stickers/',
                'intro': 'Domed, vinyl, metallic and clear sticker sheets, die cut and kiss cut stickers, labels on rolls, vinyl lettering and window clings. Design yours in Genie Studio, or describe your idea and Genie AI draws it for you.'},
    'badge': {'label': 'Name badges', 'page': 'name-badges', 'h1': 'Custom name badges', 'short': 'Name badges', 'live': '/name-badges/',
              'intro': 'Plastic, metal, wooden, chalkboard and engraved name badges with your logo. Add your whole team\'s names and check every badge before you order.'},
    'pen': {'label': 'Pens, pencils & notebooks', 'page': 'pens', 'h1': 'Custom pens, pencils & notebooks', 'short': 'Pens & notebooks', 'live': '/pens/',
            'intro': 'Ballpoint pens, pencils and notebooks, printed in full color or engraved with your logo. A small, useful gift your customers keep.'},
}
FAM_ORDER = ['sticker', 'badge', 'pen']
# product type: the "Type" filter and the round picture links at the top of a collection. key, label, [picture: product id, image index]
TYPES = {
    'sticker': [('domed', 'Domed stickers', ('domed_white_vinyl_sticker_sheet', 0)), ('cut', 'Die cut & kiss cut', ('die_cut_sticker', 0)),
                ('vinyl', 'Vinyl sticker sheets', ('glossy_white_vinyl_sticker_sheet', 0)), ('metallic', 'Metallic sheets', ('metallic_brushed_gold_sticker_sheet', 0)),
                ('clear', 'Clear sticker sheets', ('clear_sticker_sheet_with_white_ink_non_met_standard_sizes', 0)), ('labels', 'Labels on rolls', ('gloss_white_paper_labels_on_rolls', 0)),
                ('lettering', 'Vinyl lettering', ('vinyl_lettering_cut_vinyl_logos_gloss_black', 0)), ('clings', 'Window clings', ('window_clings_see_through_clear', 0)),
                ('fluorescent', 'Fluorescent sheets', ('fluorescent_yellow_sticker_sheet', 0))],
    'badge': [('plastic', 'Printed plastic', ('standard_plastic_name_badge', 0)), ('metal', 'Metal', ('executive_metal_name_badge', 0)),
              ('reusable', 'Reusable', ('metal_reusable_name_badge', 0)), ('engraved', 'Engraved', ('engraved_plastic_name_badge', 0)),
              ('wood', 'Wood & chalkboard', ('printed_wooden_name_badge', 0))],
    'pen': [('pens', 'Pens', ('contour_color_barrel_ballpoint_pen_with_chrome_trim_and_colored_soft_grip', 0)), ('pencils', 'Pencils', ('wooden_pencils_with_eraser_customizable_with_full_color_print', 0)),
            ('notebooks', 'Notebooks', ('printed_notebooks', 0))],
}
BADGE_TYPE = {'Printed plastic': 'plastic', 'Metal': 'metal', 'Reusable': 'reusable', 'Engraved': 'engraved', 'Wood & chalkboard': 'wood'}
PEN_TYPE = {'pen': 'pens', 'pencil': 'pencils', 'notebook': 'notebooks'}
DECO = {'printed': 'Full-color print', 'engraved': 'Engraved', 'cut_vinyl': 'Cut vinyl'}
PRICE = [('under-1', 'Under $1', 0, 1), ('1-5', '$1 to $5', 1, 5), ('5-15', '$5 to $15', 5, 15), ('15-up', '$15 and up', 15, 1e9)]
ADVANCED, BASIC = {'sticker': 'index.html', 'badge': 'index.html', 'pen': 'index.html'}, {'badge': 'badges.html'}
STUDIO_COPY = {'advanced': 'Genie Studio Advanced: the full studio, with Genie AI',
               'basic': {'badge': 'Genie Studio Basic: pick a layout, add your logo and team names', 'sticker': 'Genie Studio Basic: pick a shape and size, add your logo or text',
                         'pen': 'Genie Studio Basic: pick a layout, add your text or logo'}}
# homepage picks: real product pictures from BigCommerce (product id, image index)
HERO = [('domed_white_vinyl_sticker_sheet', 3, 'Colorful domed stickers'), ('regal_large_name_badge', 0, 'A custom name badge with a company logo'),
        ('contour_color_barrel_ballpoint_pen_with_chrome_trim_and_colored_soft_grip', 0, 'Custom printed pens in many colors')]
CAT_IMG = {'sticker': ('glossy_white_vinyl_sticker_sheet', 1), 'badge': ('executive_metal_name_badge', 1), 'pen': ('electra_soft_touch_ballpen', 3)}
FEATURED = ['domed_white_vinyl_sticker_sheet', 'die_cut_sticker', 'kiss_cut_sticker', 'glossy_white_vinyl_sticker_sheet', 'standard_plastic_name_badge',
            'executive_metal_name_badge', 'contour_color_barrel_ballpoint_pen_with_chrome_trim_and_colored_soft_grip', 'electra_soft_touch_ballpen']
PROMISES = [('s-gold', 't-check', 'Satisfaction guaranteed', "Not happy? We'll make it right with a reprint or a refund."),
            ('s-red', 't-match', 'Price match guarantee', "Found the same product for less? We'll match the price."),
            ('s-cyan', 't-truck', 'Free shipping on $75+', 'Orders of $75 or more ship free.'),
            ('s-ink', 't-zero', 'No setup or design fees', 'Proof checks, file setup and AI design help are included.')]

# ---------- data ----------
idx = json.loads(rd(os.path.join(P, 'index.json')))['products']
DEFS = [json.loads(rd(os.path.join(P, r['file']))) for r in idx if r['status'] == 'live']
BY_ID = {d['id']: d for d in DEFS}
FAMCFG = {f: json.loads(rd(os.path.join(P, 'families', f + '.json'))) for f in FAM_ORDER}
slug = lambda d: d['bigcommerce']['url'].strip('/').split('/')[-1]
def ptype(d):
    c = FAMCFG[d['family']]['studio']['products'][d['id']]
    return {'sticker': lambda: c['group'], 'badge': lambda: BADGE_TYPE[c['group']], 'pen': lambda: PEN_TYPE[c['kind']]}[d['family']]()
TYPE_LABEL = {k: l for f in TYPES for k, l, _ in TYPES[f]}
for d in DEFS:
    if ptype(d) not in [k for k, _, _ in TYPES[d['family']]]: raise SystemExit(d['id'] + ': product type %s has no label in TYPES' % ptype(d))
for f in TYPES:
    for k, _, (pid, i) in TYPES[f]:
        if pid not in BY_ID or len(BY_ID[pid]['pdp']['images']) <= i: raise SystemExit('type picture %s: %s #%d missing' % (k, pid, i))
def orderable(d): return any(not v.get('purchasing_disabled') for v in d['pricing']['variants'])
def low_high(d):
    ps = [v['price'] for v in d['pricing']['variants'] if not v.get('purchasing_disabled')] or [v['price'] for v in d['pricing']['variants']]
    return min(ps), max(ps)
def max_off(d): return max([t['amount'] for t in d['pricing']['quantity_tiers'] if t['type'] == 'percent'] or [0])
def rank_key(d):
    keys = [k for k, _, _ in TYPES[d['family']]]
    return (0 if orderable(d) else 1, FAM_ORDER.index(d['family']), keys.index(ptype(d)), -(d['pdp'].get('reviews_count') or 0), low_high(d)[0], d['name'])
RANKED = sorted(DEFS, key=rank_key); RANK = {d['id']: i for i, d in enumerate(RANKED)}
COLLECTIONS = {FAMILY[f]['page'] for f in FAMILY} | {'index'}
clash = COLLECTIONS & {slug(d) for d in DEFS}
if clash: raise SystemExit('a product page would overwrite a collection page: %s' % clash)

VULGAR = {'1/2': '½', '1/4': '¼', '3/4': '¾', '1/8': '⅛', '3/8': '⅜', '5/8': '⅝', '7/8': '⅞'}
def fmt_in(v):
    w, f = int(v), v - int(v)
    if f < 1e-6: return str(w)
    for dd in (2, 4, 8, 16):
        if abs(round(f * dd) / dd - f) < 1e-6:
            fr = '%d/%d' % (round(f * dd), dd)
            return ((str(w) if w else '') + VULGAR[fr]) if fr in VULGAR else ((('%d ' % w) if w else '') + fr)
    return '%.2f' % v
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
def card_meta(d):
    """one short, useful line under the price"""
    if d.get('product_colors'): return '%d colors' % len(d['product_colors'])
    if d.get('attachments'): return ' or '.join(a.capitalize() for a in d['attachments']) + ' back'
    z = d['size']
    if z['mode'] == 'free': return 'Any size up to %s in' % fmt_in(max(z['width']['max'], z['height']['max']))
    return ''

# ---------- pictures (BigCommerce CDN, resized by the CDN) ----------
def stencil(url, size):
    # /products/<pid>/images/<img>/<name>.<ts>.1280.1280.jpg -> /images/stencil/<size>/products/<pid>/<img>/<name>.<ts>.jpg
    m = re.match(r'^(https://cdn11\.bigcommerce\.com/s-[a-z0-9]+)/products/(\d+)/images/(\d+)/(.+?)\.\d+\.\d+(\.[a-z]+)(\?.*)?$', url or '')
    return f'{m.group(1)}/images/stencil/{size}/products/{m.group(2)}/{m.group(3)}/{m.group(4)}{m.group(5)}' if m else url
def srcset(url, widths=(320, 640, 960, 1280)): return ', '.join(f'{stencil(url, f"{w}w")} {w}w' for w in widths) if stencil(url, '640w') != url else ''
def pic(d, i=0): ims = d['pdp']['images']; return ims[i]['zoom'] if len(ims) > i else (ims[0]['zoom'] if ims else '')
def img(url, sizes, base=640, alt='', cls='', lazy=True, prio=False, w=640, h=640, widths=(320, 640, 960, 1280), id_=''):
    a = (f' id="{id_}"' if id_ else '') + (f' class="{cls}"' if cls else '')
    return (f'<img{a} src="{e(stencil(url, f"{base}w"))}" srcset="{e(srcset(url, widths))}" sizes="{sizes}" alt="{e(alt)}" width="{w}" height="{h}"'
            + (' loading="lazy" decoding="async"' if lazy else '') + (' fetchpriority="high"' if prio else '') + '>')

def clean_desc(h):
    """BigCommerce description: keep the content, drop editor attributes (data-*, aria-*, dir, tabindex, style)"""
    h = re.sub(r'\s(?:data-[\w-]+|aria-[\w-]+|dir|tabindex|style|class|id|title)="[^"]*"', '', h)
    h = re.sub(r'<p>(?:\s|&nbsp;|<br\s*/?>)*</p>', '', h)
    h = re.sub(r'<a ', '<a rel="noopener" ', h)
    return h

# ---------- cards ----------
GRID_SIZES = '(min-width:1440px) 260px, (min-width:1024px) 22vw, (min-width:761px) 30vw, 48vw'
def card(d, root='', sizes=GRID_SIZES, lazy=True):
    lo, _ = low_high(d); ok = orderable(d); ims = d['pdp']['images']; t = ptype(d); off = max_off(d)
    main = img(pic(d), sizes, 320, cls='main', lazy=lazy, widths=(320, 640, 960))
    alt = img(pic(d, 1), sizes, 320, cls='alt', widths=(320, 640, 960)) if len(ims) > 1 else ''
    price = f'<span class="card-p">From <b>{money(lo)}</b> each</span>' if ok else '<span class="card-p card-off">Currently unavailable</span>'
    meta = [f'<span class="card-save">Save up to {off:g}%</span>' if off and ok else '', f'<span>{e(card_meta(d))}</span>' if card_meta(d) else '']
    pb = next((k for k, _, a, b in PRICE if a <= lo < b), '') if ok else ''
    search = ' '.join([d['name'], FAMILY[d['family']]['label'], FAMILY[d['family']]['short'], TYPE_LABEL[t], DECO[d['decoration']]]).lower()   # what the shopper sees, so every result shows why it matched
    studio = 'basic' if d['studios']['basic'] and BASIC.get(d['family']) else ''
    return (f'<li class="pc" data-fam="{d["family"]}" data-type="{t}" data-deco="{d["decoration"]}" data-price="{pb}" data-studio="{studio}" data-avail="{1 if ok else 0}" '
            f'data-cost="{("%.2f" % lo) if ok else ""}" data-rank="{RANK[d["id"]]}" data-name="{e(d["name"].lower())}" data-search="{e(search)}">'
            f'<a class="card" href="{root}{slug(d)}.html" data-id="{e(d["id"])}"><span class="card-media{" has-alt" if alt else ""}">{"" if ok else "<span class=card-flag>Unavailable</span>"}{main}{alt}</span>'
            f'<span class="card-body"><span class="card-cat">{e(TYPE_LABEL[t])}</span><span class="card-n">{e(d["name"])}</span>{price}<span class="card-meta">{"".join(meta)}</span></span></a></li>')

def promises(cls='promises'):
    return f'<ul class="{cls}">' + ''.join(f'<li><svg class="seal {s}" aria-hidden="true"><use href="#s-seal"/><use href="#{g}" class="glyph"/></svg><span><b>{t}</b><span>{x}</span></span></li>' for s, g, t, x in PROMISES) + '</ul>'
def crumbs(items):
    li = ''.join(f'<li><a href="{h}">{e(t)}</a></li>' if h else f'<li><span aria-current="page">{e(t)}</span></li>' for t, h in items)
    return f'<nav class="crumbs" aria-label="Breadcrumb"><ol>{li}</ol></nav>'
GO = '<svg class="ico ico-go" aria-hidden="true"><use href="#i-right"/></svg>'

# ---------- page shell ----------
FONT = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Work+Sans:wght@400;500;600&display=swap'
STYLE = rd(os.path.join(S, 'style.css'))
TOKENS = STYLE[STYLE.index(':root{'):STYLE.index('*,*::before,*::after')]
CSS = TOKENS + sitechrome.css(STYLE) + rd(os.path.join(SH, 'shop.css'))
JS = sitechrome.js() + '\n</script>\n<script>\n' + rd(os.path.join(SH, 'shop.js'))
SPRITE_SRC = rd(os.path.join(S, 'sprite.html')); SPRITE_SRC = SPRITE_SRC[:SPRITE_SRC.index('</svg>') + 6]
GENIE = rd(os.path.join(B, 'assets', 'genie_mark.txt')).strip().replace('url(#mg-gn)', 'url(#gm-grad)')
def sprite(used):
    sp = re.sub(r'<symbol id="([^"]+)"[\s\S]*?</symbol>\s*', lambda m: m.group(0) if m.group(1) in used else '', SPRITE_SRC)
    if 'g-mark' not in used: sp = re.sub(r'<defs>[\s\S]*?</defs>\s*', '', sp)
    missing = used - set(re.findall(r'<symbol id="([^"]+)"', sp))
    if missing: raise SystemExit('icons not in sprite.html: %s' % sorted(missing))
    return sp.replace('{{GENIE_MARK}}', GENIE)
def page(root, active, kind, head, body, after=''):
    hdr, ftr = sitechrome.chrome(root, active)
    used = set(re.findall(r'href="#([a-z]-[a-z0-9-]+)"', hdr + ftr + body + after)) | set(sitechrome.ICONS) | {'i-x'}
    return f'''<!doctype html>
<html lang="en" data-root="{root}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{head}
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0F1B3D">
<link rel="icon" href="data:,">
<script>try{{const t=localStorage.getItem('cg-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}}catch(e){{}}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="{FONT}" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="{FONT}"></noscript>
<link rel="preconnect" href="https://cdn11.bigcommerce.com">
<style>
{CSS}
</style>
</head>
<body data-page="{kind}">
{sprite(used)}
<a class="skip" href="#main">Skip to content</a>
{hdr}
<main id="main">
{body}
</main>
{ftr}
{after}
<script>
{JS}
</script>
</body>
</html>
'''
def ld(obj): return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False).replace('</', '<\\/') + '</script>'
def trim(s, n=160): return s if len(s) <= n else s[:n - 1].rsplit(' ', 1)[0].rstrip(',;:') + '…'
def head(title, desc, canonical=None, extra=''):
    return f'<title>{e(title)}</title>\n<meta name="description" content="{e(trim(desc))}">' + (f'\n<link rel="canonical" href="{e(canonical)}">' if canonical else '') + (('\n' + extra) if extra else '')

# ---------- product page ----------
def cta(kind, d, root):
    fam = d['family']; page_ = (ADVANCED if kind == 'advanced' else BASIC).get(fam)
    if d['studios'][kind] and page_:
        t, desc, ic = ('Start designing', STUDIO_COPY['advanced'], 'i-layers') if kind == 'advanced' else ('Quick design', STUDIO_COPY['basic'][fam], 'i-tpl')
        return (f'<a class="cta cta-{kind}" href="{root}{page_}?product={e(d["id"])}" data-studio="{kind}"><span class="cta-ic"><svg class="ico" aria-hidden="true"><use href="#{ic}"/></svg></span>'
                f'<span class="cta-tx"><span class="cta-t">{t}</span><span class="cta-d">{e(desc)}</span></span><svg class="ico cta-go" aria-hidden="true"><use href="#i-right"/></svg></a>')
    label = 'Genie Studio Advanced' if kind == 'advanced' else 'Genie Studio Basic'
    return f'<p class="cta cta-off" aria-disabled="true" data-studio="{kind}"><span class="cta-t">{label}</span> <span class="cta-d">(quick and guided) is coming soon for this product.</span></p>'

def pdp(d):
    fam = FAMILY[d['family']]; lo, hi = low_high(d); ims = d['pdp']['images']; tiers = [t for t in d['pricing']['quantity_tiers'] if t['type'] == 'percent']; t = ptype(d); ok = orderable(d)
    url = LIVE + d['bigcommerce']['url']; desc = d['pdp']['meta_description'] or re.sub('<[^>]+>', ' ', d['pdp']['description_html'])[:300]; desc = ' '.join(desc.split())
    graph = [{'@type': 'Product', 'name': d['name'], 'url': url, 'image': [i['zoom'] for i in ims[:6]], 'description': desc, 'sku': d['bigcommerce']['sku'] or None,
              'brand': {'@type': 'Brand', 'name': 'Custom Genie'},
              'offers': {'@type': 'AggregateOffer', 'priceCurrency': 'USD', 'lowPrice': '%.2f' % lo, 'highPrice': '%.2f' % hi, 'offerCount': len(d['pricing']['variants']), 'url': url, **({} if ok else {'availability': 'https://schema.org/OutOfStock'})}},
             {'@type': 'BreadcrumbList', 'itemListElement': [
                 {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': LIVE + '/'},
                 {'@type': 'ListItem', 'position': 2, 'name': fam['label'], 'item': LIVE + '/' + d['bigcommerce']['url'].strip('/').split('/')[0] + '/'},
                 {'@type': 'ListItem', 'position': 3, 'name': d['name'], 'item': url}]}]
    graph[0] = {k: v for k, v in graph[0].items() if v}
    hd = head(d['pdp']['page_title'] + ' | Custom Genie', desc, url, ld({'@context': 'https://schema.org', '@graph': graph}))
    adv = f'../index.html?product={e(d["id"])}'
    # gallery
    SIZES = '(min-width:1440px) 640px, (min-width:900px) 46vw, 100vw'
    main = ims[0] if ims else None
    thumbs = ''.join(f'<button type="button" class="g-t" data-img="{e(stencil(i["zoom"], "960w"))}" data-srcset="{e(srcset(i["zoom"]))}" data-alt="{e(i["alt"] or d["name"])}" aria-pressed="{str(k == 0).lower()}" aria-label="Show picture {k + 1} of {len(ims[:8])}"><img src="{e(stencil(i["zoom"], "160w"))}" alt="" width="72" height="72" loading="lazy"></button>' for k, i in enumerate(ims[:8]))
    nav = ('<button type="button" class="g-nav g-prev" aria-label="Previous picture"><svg class="ico" aria-hidden="true"><use href="#i-left"/></svg></button>'
           '<button type="button" class="g-nav g-next" aria-label="Next picture"><svg class="ico" aria-hidden="true"><use href="#i-right"/></svg></button>'
           f'<span class="g-count" id="gCount" aria-hidden="true">1 / {len(ims[:8])}</span>') if len(ims) > 1 else ''
    gallery = (f'<section class="gallery{"" if len(ims) > 1 else " one"}" aria-label="Product pictures">' + (f'<div class="g-thumbs">{thumbs}</div>' if len(ims) > 1 else '')
               + (f'<div class="g-main">{img(main["zoom"], SIZES, 960, alt=main["alt"] or d["name"], lazy=False, prio=True, w=960, h=960, id_="mainImg")}{nav}</div>' if main else '') + '</section>')
    rows = facts(d)
    keyfacts = ''.join(f'<div><dt>{e(a)}</dt><dd>{e(b)}</dd></div>' for a, b in rows[:4])
    strip = ''.join(f'<li><b>{x["min_qty"]:,}+</b><span>{x["amount"]:g}% off</span></li>' for x in tiers)
    notice = '' if ok else ('<p class="notice" role="note"><svg class="ico" aria-hidden="true"><use href="#i-info"/></svg><span>Ordering is turned off for this product in the store right now, '
                            "so it can't be added to the cart. You can still design and preview it.</span></p>")
    buy = f'''<section class="buy" aria-labelledby="pName">
  <p class="eyebrow"><a href="{fam["page"]}.html?type={t}">{e(TYPE_LABEL[t])}</a></p>
  <h1 id="pName"{' class="long"' if len(d["name"]) > 44 else ""}>{e(d["name"])}</h1>
  <div class="price"><span class="from">From</span><span class="amt">{money(lo)}</span><span class="each">each</span></div>
  <p class="price-note">{"Your price depends on size, options and quantity. The studio shows it before you add to cart." if lo != hi else "Your price per piece goes down as your quantity goes up. The studio shows it before you add to cart."}</p>
  {notice}
  {f'<div class="tiers-strip"><h2>Buy more, save more</h2><ul>{strip}</ul></div>' if strip else ''}
  <div class="start" id="ctas" role="group" aria-label="Start designing">
   <div class="ctas">{cta("advanced", d, "../")}{cta("basic", d, "../")}</div>
   <a class="genie-link" href="{adv}&amp;genie=1" data-studio="advanced" data-from="genie"><svg class="gm" aria-hidden="true"><use href="#g-mark"/></svg><span>No artwork yet? <b>Let Genie AI design it for you</b></span></a>
  </div>
  <dl class="keyfacts">{keyfacts}</dl>
  <ul class="assure">{"".join(f'<li><svg class="seal {s}" aria-hidden="true"><use href="#s-seal"/><use href="#{g}" class="glyph"/></svg><span><b>{x}</b></span></li>' for s, g, x, _ in PROMISES)}</ul>
 </section>'''
    # sections below
    related = sorted([x for x in DEFS if x['family'] == d['family'] and x['id'] != d['id']], key=lambda x: (0 if ptype(x) == t else 1, 0 if orderable(x) else 1, RANK[x['id']]))[:4]
    specs = ''.join(f'<div><dt>{e(a)}</dt><dd>{e(b)}</dd></div>' for a, b in rows)
    tier_rows = ''.join(f'<tr><td>{x["min_qty"]:,}{" to %s" % format(x["max_qty"], ",") if x.get("max_qty") else " or more"}</td><td>{x["amount"]:g}% off</td></tr>' for x in tiers)
    tabs = [('overview', 'Overview'), ('specs', 'Specifications')] + ([('pricing', 'Volume pricing')] if tier_rows else []) + [('related', 'You may also like')]
    how = f'''<aside class="side-card" aria-labelledby="howH"><h3 id="howH">How it works</h3><p>Design online, check your proof, and we print it for you.</p>
     <ol><li><span><b>Design it your way</b>Place your logo and text in Genie Studio, or let Genie AI draw it.</span></li><li><span><b>Check your proof</b>The print check flags small text and blurry pictures before you order.</span></li><li><span><b>We print and ship</b>Made to order. Orders of $75 or more ship free.</span></li></ol>
     <a class="btn btn-primary btn-block" href="{adv}" data-studio="advanced" data-from="how">Start designing{GO}</a></aside>'''
    below = f'''<nav class="ptabs" aria-label="On this page"><div class="wrap"><ul>{"".join(f'<li><a href="#{k}" aria-current="false">{l}</a></li>' for k, l in tabs)}</ul></div></nav>
<section class="psec" id="overview" aria-labelledby="ovH"><div class="wrap"><h2 class="psec-h" id="ovH">Overview</h2><div class="overview"><div><div class="prose" id="prose">{clean_desc(d["pdp"]["description_html"])}</div>
  <button type="button" class="btn btn-outline btn-sm more" id="more" aria-expanded="false" aria-controls="prose" hidden><span class="t">Read the full description</span><svg class="ico" aria-hidden="true"><use href="#i-right"/></svg></button></div>{how}</div></div></section>
<section class="psec" id="specs" aria-labelledby="spH"><div class="wrap"><h2 class="psec-h" id="spH">Specifications</h2><dl class="specs">{specs}</dl></div></section>
{f'<section class="psec" id="pricing" aria-labelledby="vpH"><div class="wrap"><h2 class="psec-h" id="vpH">Volume pricing</h2><table class="vtable"><caption class="sr-only">Quantity discounts</caption><thead><tr><th scope="col">Quantity</th><th scope="col">Discount</th></tr></thead><tbody>{tier_rows}</tbody></table><p class="vnote">The discount for your quantity applies to every piece in the order. Genie Studio shows your price per piece and your total before you add to cart.</p></div></section>' if tier_rows else ''}
<section class="psec sec-alt" id="related" aria-labelledby="relH"><div class="wrap"><div class="sec-head"><h2 class="psec-h" id="relH" style="margin:0">You may also like</h2><a class="link-go" href="{fam["page"]}.html">All {e(fam["label"].lower())}<svg class="ico" aria-hidden="true"><use href="#i-right"/></svg></a></div>
 <ul class="pgrid four">{"".join(card(x) for x in related)}</ul></div></section>'''
    sbar = f'''<div class="sbar" id="sbar" aria-hidden="true"><div class="sbar-in"><div class="sbar-tx"><b>{e(d["name"])}</b><span>From {money(lo)} each</span></div><a class="btn btn-primary" href="{adv}" data-studio="advanced" data-from="sbar" tabindex="-1">Start designing</a></div></div>'''
    body = f'''<div class="wrap">{crumbs([("Home", "../"), (fam["label"], fam["page"] + ".html"), (d["name"], None)])}
<div class="pdp">
 {gallery}
 {buy}
</div></div>
{below}'''
    return page('../', d['family'], 'product', hd, body, sbar)

# ---------- collections ----------
def facet(key, title, opts, open_=True):
    li = ''.join(f'<li><label class="fopt"><input type="checkbox" name="{key}" value="{e(v)}"><span class="l">{e(l)}</span><span class="n" aria-hidden="true">{n}</span></label></li>' for v, l, n in opts)
    return f'<details class="fg" data-facet="{key}"{" open" if open_ else ""}><summary>{e(title)}</summary><ul class="fopts">{li}</ul></details>'
def collection(fam_key):
    is_all = fam_key is None
    defs = sorted(DEFS if is_all else [d for d in DEFS if d['family'] == fam_key], key=lambda d: RANK[d['id']])
    fams = FAM_ORDER if is_all else [fam_key]
    if is_all: title, h1, intro, page_name, canon = 'All products | Custom Genie', 'All products', 'Every customizable product: stickers and labels, name badges, pens, pencils and notebooks. Design any of them in Genie Studio, or let Genie AI do it for you.', 'index', None
    else: f = FAMILY[fam_key]; title, h1, intro, page_name, canon = f['h1'][0].upper() + f['h1'][1:] + ' | Custom Genie', f['h1'][0].upper() + f['h1'][1:], f['intro'], f['page'], LIVE + f['live']
    cnt = lambda pred: sum(1 for d in defs if pred(d))
    facets = []
    if is_all: facets.append(facet('fam', 'Category', [(f, FAMILY[f]['label'], cnt(lambda d, f=f: d['family'] == f)) for f in FAM_ORDER]))
    types = [(k, l, cnt(lambda d, k=k: ptype(d) == k)) for f in fams for k, l, _ in TYPES[f]]
    facets.append(facet('type', 'Type', [x for x in types if x[2]]))
    decos = [(k, l, cnt(lambda d, k=k: d['decoration'] == k)) for k, l in DECO.items()]
    if sum(1 for x in decos if x[2]) > 1: facets.append(facet('deco', 'Decoration', [x for x in decos if x[2]]))
    prices = [(k, l, cnt(lambda d, a=a, b=b: orderable(d) and a <= low_high(d)[0] < b)) for k, l, a, b in PRICE]
    facets.append(facet('price', 'Price per piece', [x for x in prices if x[2]]))
    if any(d['studios']['basic'] and BASIC.get(d['family']) for d in defs): facets.append(facet('studio', 'Design studio', [('basic', 'Quick guided studio (Basic)', cnt(lambda d: d['studios']['basic'] and BASIC.get(d['family'])))], False))
    if any(not orderable(d) for d in defs): facets.append(facet('avail', 'Availability', [('1', 'Available to order', cnt(orderable))], False))
    # round picture links: families on All products, product types on a family page
    if is_all:
        circles = ''.join(f'<li><a class="subcat" href="{FAMILY[f]["page"]}.html"><span class="si"><img src="{e(stencil(pic(BY_ID[CAT_IMG[f][0]], CAT_IMG[f][1]), "160w"))}" alt="" width="80" height="80" loading="lazy"></span><span>{e(FAMILY[f]["label"])}<small>{cnt(lambda d, f=f: d["family"] == f)} products</small></span></a></li>' for f in FAM_ORDER)
    else:
        circles = ''.join(f'<li><button type="button" class="subcat" data-type="{k}" aria-pressed="false"><span class="si"><img src="{e(stencil(pic(BY_ID[pid], i), "160w"))}" srcset="{e(stencil(pic(BY_ID[pid], i), "160w"))} 1x, {e(stencil(pic(BY_ID[pid], i), "320w"))} 2x" alt="" width="80" height="80"></span><span>{e(l)}<small>{n} product{"s" if n != 1 else ""}</small></span></button></li>'
                          for k, l, (pid, i) in TYPES[fam_key] for n in [cnt(lambda d, k=k: ptype(d) == k)] if n)
    promo = ('<li class="promo-tile" hidden><a href="../index.html?genie=1" data-studio="advanced" data-from="collection-tile"><svg class="gm" aria-hidden="true"><use href="#g-mark"/></svg>'
             '<b>Not sure where to start?</b><span>Describe your idea and Genie AI designs it for you, then suggests the right product.</span><em>Ask Genie AI<svg class="ico" aria-hidden="true"><use href="#i-right"/></svg></em></a></li>')
    cards = ''.join(card(d, sizes=GRID_SIZES, lazy=k >= 8) for k, d in enumerate(defs))
    ldj = ld({'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': LIVE + '/'}] + ([] if is_all else [{'@type': 'ListItem', 'position': 2, 'name': h1, 'item': canon}])})
    body = f'''<div class="wrap">
 {crumbs([("Home", "../"), (h1, None)])}
 <header class="coll-head"><h1>{e(h1)}</h1><p class="lead">{e(intro)}</p><p class="q-res" id="qRes" role="status" hidden></p></header>
 <ul class="subcats" aria-label="{"Shop by category" if is_all else "Shop by type"}">{circles}</ul>
 <div class="coll">
  <aside class="filters" id="filters" aria-labelledby="fTitle">
   <div class="f-hd"><b id="fTitleM">Filters</b><button type="button" class="f-x" data-close aria-label="Close filters"><svg class="ico" aria-hidden="true"><use href="#i-x"/></svg></button></div>
   <div class="f-body"><h2 class="f-title" id="fTitle">Filters</h2>{"".join(facets)}</div>
   <div class="f-ft"><button type="button" class="btn btn-outline" data-clear-all>Clear all</button><button type="button" class="btn btn-dark" data-close data-shown>Show {len(defs)} products</button></div>
  </aside>
  <div class="f-scrim" id="fScrim"></div>
  <section aria-labelledby="resH">
   <h2 class="sr-only" id="resH">Products</h2>
   <div class="toolbar"><p class="count" id="count" aria-live="polite"><b>{len(defs)}</b> products</p>
    <div class="tools"><button type="button" class="btn btn-outline btn-sm f-open" id="fOpen" aria-controls="filters" aria-expanded="false"><svg class="ico" aria-hidden="true"><use href="#i-sliders"/></svg>Filters</button>
     <label class="sort"><span class="sort-l">Sort by</span><select class="select" id="sort" aria-label="Sort products"><option value="featured">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name: A to Z</option></select></label></div></div>
   <div class="chips" id="chips" hidden></div>
   <ul class="pgrid" id="grid">{cards}{promo}</ul>
   <div class="empty" id="empty" hidden><b>No products match these filters</b><p>Try removing a filter, or search for something else.</p><button type="button" class="btn btn-outline" data-clear-all>Clear all filters</button><a class="btn btn-outline" href="index.html" data-all hidden>Show all products</a></div>
  </section>
 </div>
</div>'''
    return page('../', 'all' if is_all else fam_key, 'collection:' + page_name, head(title, intro, canon, ldj), body)

# ---------- homepage ----------
GDEMO_A = '''<svg viewBox="0 0 200 200" role="img" aria-label="Option 1: a round navy and gold coffee shop logo"><circle cx="100" cy="100" r="92" fill="#0F1B3D"/><circle cx="100" cy="100" r="80" fill="none" stroke="#E0B24A" stroke-width="3"/><defs><path id="gdArc" d="M38 104a62 62 0 0 1 124 0"/></defs><text font-family="Poppins,sans-serif" font-weight="700" font-size="19" letter-spacing="3" fill="#F4D68A"><textPath href="#gdArc" startOffset="50%" text-anchor="middle">BEAN THERE</textPath></text><path d="M74 104h46v16a20 20 0 0 1-20 20h-6a20 20 0 0 1-20-20z" fill="#F4D68A"/><path d="M120 108h5a9 9 0 0 1 0 18h-6" fill="none" stroke="#F4D68A" stroke-width="5"/><path d="M86 96c-4-6 4-9 0-15M98 96c-4-6 4-9 0-15M110 96c-4-6 4-9 0-15" fill="none" stroke="#F4D68A" stroke-width="3.5" stroke-linecap="round"/><text x="100" y="160" text-anchor="middle" font-family="Poppins,sans-serif" font-weight="600" font-size="11" letter-spacing="2.4" fill="#E0B24A">COFFEE CO.</text></svg>'''
GDEMO_B = '''<svg viewBox="0 0 200 200" role="img" aria-label="Option 2: an oval cream and brown coffee shop logo"><ellipse cx="100" cy="100" rx="90" ry="64" fill="#FFF4E2" stroke="#6B3E22" stroke-width="4"/><ellipse cx="100" cy="100" rx="80" ry="54" fill="none" stroke="#6B3E22" stroke-width="1.5" stroke-dasharray="3 4"/><circle cx="58" cy="100" r="24" fill="#6B3E22"/><path d="M47 96h20v8a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8z" fill="#FFF4E2"/><path d="M67 98h3a4 4 0 0 1 0 8h-3" fill="none" stroke="#FFF4E2" stroke-width="2.4"/><text x="122" y="98" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="25" fill="#4A2814">Bean</text><text x="122" y="122" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="25" fill="#4A2814">There</text></svg>'''
def home():
    n_all = len(DEFS); sticker_lo = min(low_high(d)[0] for d in DEFS if d['family'] == 'sticker' and orderable(d))
    if not all(max_off(d) for d in DEFS): raise SystemExit('the homepage says every product has quantity discounts')
    ha = ''.join(f'<figure class="ha ha-{k + 1}">{img(pic(BY_ID[pid], i), "(min-width:980px) 400px, 70vw", 640, alt=alt, lazy=k > 0, prio=k == 0, widths=(320, 640, 960))}</figure>' for k, (pid, i, alt) in enumerate(HERO))
    cats = ''.join(f'''<a class="cat" href="p/{FAMILY[f]["page"]}.html"><span class="cat-media">{img(pic(BY_ID[CAT_IMG[f][0]], CAT_IMG[f][1]), "(min-width:900px) 31vw, 100vw", 640, w=640, h=480)}</span>
      <span class="cat-body"><h3>{e(FAMILY[f]["label"])}</h3><p>{e({"sticker": "Domed, die cut, vinyl and clear stickers, labels on rolls, lettering and window clings.", "badge": "Plastic, metal, wood and engraved badges, with your whole team's names.", "pen": "Ballpoint pens, pencils and notebooks, printed or engraved with your logo."}[f])}</p>
      <span class="cat-meta">{sum(1 for d in DEFS if d["family"] == f)} products · from {money(min(low_high(d)[0] for d in DEFS if d["family"] == f and orderable(d)))} each</span><span class="link-go">Shop {e(FAMILY[f]["short"].lower())}<svg class="ico" aria-hidden="true"><use href="#i-right"/></svg></span></span></a>''' for f in FAM_ORDER)
    types = ''.join(f'<li><a class="type" href="p/stickers.html?type={k}"><span class="type-img"><img src="{e(stencil(pic(BY_ID[pid], i), "320w"))}" srcset="{e(srcset(pic(BY_ID[pid], i), (320, 640)))}" sizes="(min-width:760px) 180px, 42vw" alt="" width="180" height="180" loading="lazy"></span><span><b>{e(l)}</b><small>{n} product{"s" if n != 1 else ""}</small></span></a></li>'
                    for k, l, (pid, i) in TYPES['sticker'] for n in [sum(1 for d in DEFS if ptype(d) == k)] if n and k != 'fluorescent')
    feat = ''.join(card(BY_ID[x], 'p/', '(min-width:1100px) 320px, (min-width:761px) 30vw, 48vw') for x in FEATURED)
    ex = BY_ID['domed_white_vinyl_sticker_sheet']; ex_t = [t for t in ex['pricing']['quantity_tiers'] if t['type'] == 'percent']; top = max(t['amount'] for t in ex_t)
    bars = ''.join(f'<li><b>{t["min_qty"]:,}+</b><span class="bar"><i style="width:{t["amount"] / top * 100:.0f}%"></i></span><span class="pct">{t["amount"]:g}% off</span></li>' for t in ex_t)
    hd = head('Custom Genie | Custom stickers, name badges and pens', 'Custom stickers, name badges, pens and notebooks, made to order. Design yours in Genie Studio, or describe your idea and Genie AI draws it for you. No setup or design fees.', LIVE + '/',
              ld({'@context': 'https://schema.org', '@type': 'Organization', 'name': 'Custom Genie', 'url': LIVE + '/'}))
    body = f'''<section class="hero" aria-labelledby="heroH"><div class="wrap hero-in">
 <div class="hero-copy">
  <p class="eyebrow">Stickers · Name badges · Pens</p>
  <h1 id="heroH">Custom merch,<br> <span class="grad-text">designed your way</span></h1>
  <p class="lead">Design it yourself in Genie Studio, or describe your idea and Genie AI draws it for you. Made to order, with no setup or design fees.</p>
  <div class="hero-cta"><a class="btn btn-primary btn-lg" href="index.html" data-studio="advanced" data-from="hero">Start designing{GO}</a><a class="btn btn-outline btn-lg" href="p/index.html">Shop all products</a></div>
  <ul class="hero-proof"><li><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>Free shipping on orders $75+</li><li><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>Quantity discounts on every product</li><li><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>Satisfaction guaranteed</li></ul>
 </div>
 <div class="hero-art">{ha}
  <div class="ha-chip chip-genie" aria-hidden="true"><svg class="gm"><use href="#g-mark"/></svg><span><small>Genie AI</small>"A round gold sticker for my coffee shop"</span></div>
  <div class="ha-chip chip-fee" aria-hidden="true"><svg class="ico"><use href="#i-check"/></svg><span>No setup fees<small>Proof checks included</small></span></div>
 </div>
</div></section>
<section class="trust-bar" aria-label="Our promises"><div class="wrap">{promises()}</div></section>

<section class="sec" aria-labelledby="catH"><div class="wrap">
 <div class="sec-head"><div><p class="eyebrow">Shop by category</p><h2 class="h-sec" id="catH">Everything you can customize</h2><p class="lead">{n_all} products you can design online, from stickers at {money(sticker_lo)} each to name badges and pens.</p></div><a class="link-go" href="p/index.html">All products<svg class="ico" aria-hidden="true"><use href="#i-right"/></svg></a></div>
 <div class="cats">{cats}</div>
</div></section>

<section class="sec sec-alt" aria-labelledby="typeH"><div class="wrap">
 <div class="sec-head"><div><p class="eyebrow">Stickers</p><h2 class="h-sec" id="typeH">Find the right sticker</h2></div><a class="link-go" href="p/stickers.html">All stickers &amp; labels<svg class="ico" aria-hidden="true"><use href="#i-right"/></svg></a></div>
 <ul class="types">{types}</ul>
</div></section>

<section class="sec genie-band" aria-labelledby="genieH"><div class="wrap genie-in">
 <div>
  <p class="eyebrow">Genie AI designer</p>
  <h2 id="genieH">Describe it. Genie designs it.</h2>
  <p class="lead">Tell Genie about your brand, event or idea. It draws logo options you can add to your design with one click, then keeps editing when you ask.</p>
  <ul class="genie-list"><li><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>Options drawn from your own words, or from a picture you upload</li><li><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>Change it by asking: "make it navy and gold"</li><li><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>Every design stays fully editable in Genie Studio</li></ul>
  <div class="genie-cta"><a class="btn btn-primary btn-lg" href="index.html?genie=1" data-studio="advanced" data-from="genie-band">Try Genie AI{GO}</a></div>
 </div>
 <div class="gdemo" aria-hidden="true">
  <p class="gdemo-h"><svg class="gm"><use href="#g-mark"/></svg>What should we make?</p>
  <p class="gdemo-p">Describe your logo or sticker and Genie draws options for you.</p>
  <div class="gdemo-box"><p>A round gold sticker for my coffee shop "Bean There" with a coffee cup</p>
   <div class="gdemo-row"><span class="gdemo-chip"><svg class="ico"><use href="#i-upload"/></svg>Add your logo</span><span class="gdemo-go"><svg class="ico"><use href="#i-spark"/></svg>Generate</span></div></div>
  <div class="gdemo-res"><figure>{GDEMO_A}<figcaption>Option 1</figcaption></figure><figure>{GDEMO_B}<figcaption>Option 2</figcaption></figure></div>
 </div>
</div></section>

<section class="sec" aria-labelledby="featH"><div class="wrap">
 <div class="sec-head"><div><p class="eyebrow">Featured</p><h2 class="h-sec" id="featH">Popular places to start</h2></div><a class="link-go" href="p/index.html">Shop all products<svg class="ico" aria-hidden="true"><use href="#i-right"/></svg></a></div>
 <ul class="pgrid four">{feat}</ul>
</div></section>

<section class="sec sec-alt" aria-labelledby="studioH"><div class="wrap">
 <div class="sec-head"><div><p class="eyebrow">Genie Studio</p><h2 class="h-sec" id="studioH">Two ways to design</h2><p class="lead">Every product opens in Genie Studio Advanced. Name badges can also use the quick, guided Genie Studio Basic.</p></div></div>
 <div class="studios">
  <article class="studio-card feature"><span class="studio-tag">Every product</span><h3>Genie Studio Advanced</h3><p>The full design studio: place text, art and shapes anywhere, work in layers, chat with Genie AI, and check your print before you order.</p>
   <ul class="ticks"><li><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>Text, shapes, templates and your own artwork</li><li><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>Genie AI designer built in</li><li><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>Print check and proof before you add to cart</li></ul>
   <div class="row"><a class="btn btn-primary" href="index.html" data-studio="advanced" data-from="studios">Open Genie Studio Advanced{GO}</a><small>All {n_all} products</small></div></article>
  <article class="studio-card"><span class="studio-tag">Name badges</span><h3>Genie Studio Basic</h3><p>Quick and guided: pick a layout, add your logo, names and titles, and check every badge.</p>
   <ul class="ticks"><li><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>Ready-made layouts for every badge</li><li><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>Paste or upload your team's names: one badge per name</li><li><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>No logo? Genie AI can create one</li></ul>
   <div class="row"><a class="btn btn-dark" href="badges.html" data-studio="basic" data-from="studios">Design name badges{GO}</a><small>{sum(1 for d in DEFS if d["studios"]["basic"] and BASIC.get(d["family"]))} name badges</small></div></article>
 </div>
 <ol class="steps" style="margin-top:clamp(48px,6vw,80px)" aria-label="How it works">
  <li><b>Choose your product</b><p>Stickers, name badges, pens, pencils and notebooks.</p></li>
  <li><b>Design it your way</b><p>Use Genie Studio, or describe your idea and Genie AI draws it.</p></li>
  <li><b>Check your proof</b><p>The print check flags small text and blurry pictures before you order.</p></li>
  <li><b>We print and ship</b><p>Made to order. Orders of $75 or more ship free.</p></li>
 </ol>
</div></section>

<section class="sec" aria-labelledby="volH"><div class="wrap volume">
 <div><p class="eyebrow">Buy more, save more</p><h2 class="h-sec" id="volH">The more you order, the less each piece costs</h2><p class="lead">Every product has quantity discounts, and the discount for your quantity applies to every piece in the order. Genie Studio shows your price before you add to cart.</p>
  <a class="btn btn-primary btn-lg" href="p/index.html">Shop all products{GO}</a></div>
 <div><ul class="bars" aria-label="Quantity discounts on {e(ex["name"])}">{bars}</ul><p class="bars-note">Quantity discounts on {e(ex["name"])}. Every product page lists its own.</p></div>
</div></section>'''
    return page('', None, 'home', hd, body)

# ---------- write ----------
os.makedirs(os.path.join(OUT, 'p'), exist_ok=True); sitechrome.write_assets(OUT)
for f in os.listdir(os.path.join(OUT, 'p')):
    if f.endswith('.html'): os.remove(os.path.join(OUT, 'p', f))
for d in DEFS: open(os.path.join(OUT, 'p', slug(d) + '.html'), 'w', encoding='utf-8').write(pdp(d))
open(os.path.join(OUT, 'p', 'index.html'), 'w', encoding='utf-8').write(collection(None))
for f in FAM_ORDER: open(os.path.join(OUT, 'p', FAMILY[f]['page'] + '.html'), 'w', encoding='utf-8').write(collection(f))
open(os.path.join(OUT, 'home.html'), 'w', encoding='utf-8').write(home())
n = {k: sum(1 for d in DEFS if d['studios'][k]) for k in ('advanced', 'basic')}
print('wrote home.html, %d collections and %d product pages to %s | Advanced ready: %d, Basic ready: %d' % (len(FAM_ORDER) + 1, len(DEFS), OUT, n['advanced'], n['basic']))
