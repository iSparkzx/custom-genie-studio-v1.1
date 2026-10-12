"""Build the name badge studio: python studio-src/build_badges.py public/badges.html

Inputs:
  products/index.json + products/badge/*.json   BigCommerce product definitions (read-only pull + generator)
  products/families/badge.json                  studio settings per badge (shape, material, sizes; placeholders marked)
  products/families/badge-layouts.json          Doogma layout masters (layouts 1 to 7)
  studio-src/src/style.css (brand tokens only), sprite.html, studio-src/assets/logo.txt
  studio-src/badge/badge.html, badge.css, badge.js
"""
import os, sys, re, json
B = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(B, '..'); S = os.path.join(B, 'src'); BD = os.path.join(B, 'badge'); P = os.path.join(ROOT, 'products')
rd = lambda p: open(p, encoding='utf-8').read()
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'public', 'badges.html')
g = lambda v: '%g' % float(v)

VKEYS = ['size', 'background_color', 'border_color', 'attachment']
def data():
    idx = json.loads(rd(os.path.join(P, 'index.json')))['products']
    fam = json.loads(rd(os.path.join(P, 'families', 'badge.json'))); lay = json.loads(rd(os.path.join(P, 'families', 'badge-layouts.json')))
    cfg = fam['studio']['products']; prods = []
    for r in idx:
        if r['family'] != 'badge' or r['studio_status'] != 'built': continue
        d = json.loads(rd(os.path.join(P, r['file']))); c = cfg.get(d['id'])
        if not c: raise SystemExit(d['id'] + ': no studio settings in products/families/badge.json')
        pr = d['pricing']; vs = pr['variants']
        uniq = lambda k: list(dict.fromkeys(v['options'][k] for v in vs if k in v['options']))
        if d['size']['mode'] == 'preset': size_ids = sorted(p['id'] for p in d['size']['presets'])
        else: size_ids = ['default']
        if sorted(c['sizes']) != size_ids: raise SystemExit(d['id'] + ': sizes in badge.json %s do not match BigCommerce %s' % (sorted(c['sizes']), size_ids))
        sizes = [{'id': k, 'label': 'Size %s' % k[4:] if k.startswith('size') else 'One size', 'w': c['sizes'][k][0], 'h': c['sizes'][k][1], 'known': c['sizes'][k][2], 'src': c['sizes'][k][3]} for k in size_ids]
        if any(t['type'] != 'percent' for t in pr['quantity_tiers']): raise SystemExit(d['id'] + ': only percent quantity discounts are supported')
        mods = {m['role']: {'id': m['id'], 'name': m['name']} for m in d['cart']['modifiers'] if m['role'] and m['role'] != 'layout_data'}
        opts = {o['role']: {'id': o['id'], 'name': o['name'], 'values': {v['label']: v['id'] for v in o['values']}} for o in d['cart']['options'] if o['role']}
        prods.append({
            'id': d['id'], 'name': d['name'], 'bc_id': d['bigcommerce']['product_id'], 'url': d['bigcommerce']['url'], 'decoration': d['decoration'],
            'group': c['group'], 'kind': c['kind'], 'shape': c['shape'], 'frame': c.get('frame'), 'sizes': sizes,
            'bg': uniq('background_color'), 'border': uniq('border_color'), 'attach': uniq('attachment'), 'fonts': d['fonts'],
            'price': pr['base_price'], 'tiers': [{'min_qty': t['min_qty'], 'pct': t['amount']} for t in pr['quantity_tiers']], 'pulled_at': pr['pulled_at'],
            'variants': [[v['id'], v['sku'], v['price']] + [v['options'].get(k) for k in VKEYS] for v in vs],
            'mods': mods, 'opts': opts, 'bulk': 'bulk_names_file' in mods,
        })
    grp = ['Printed plastic', 'Metal', 'Reusable', 'Engraved', 'Wood & chalkboard']
    prods.sort(key=lambda p: (grp.index(p['group']) if p['group'] in grp else 99, p['name']))
    L = lay['badge']['layouts']
    return {'vkeys': VKEYS, 'products': prods, 'default_product': fam['studio']['default_product'], 'layouts': L, 'box': lay['content_box_px'],
            'text_size': lay['text_size_px'], 'logo_scale': lay['logo_scale'], 'bg_scale': lay['background_scale'],
            'checks': fam['checks'], 'engrave': fam['studio']['engraving_colors'], 'colors': fam['studio']['named_colors']}

D = data()
tokens = rd(os.path.join(S, 'style.css')); tokens = tokens[tokens.index(':root{'):tokens.index('*,*::before,*::after')]
logo = rd(os.path.join(B, 'assets', 'logo.txt')).strip()
used = set(re.findall(r'#(i-[a-z-]+)', rd(os.path.join(BD, 'badge.html')) + rd(os.path.join(BD, 'badge.js'))))
sprite = rd(os.path.join(S, 'sprite.html')); sprite = sprite[:sprite.index('</svg>') + 6]
sprite = re.sub(r'<defs>[\s\S]*?</defs>\s*', '', sprite)
sprite = re.sub(r'<symbol id="([^"]+)"[\s\S]*?</symbol>\s*', lambda m: m.group(0) if m.group(1) in used else '', sprite)
missing = used - set(re.findall(r'<symbol id="([^"]+)"', sprite))
if missing: raise SystemExit('icons not in sprite.html: %s' % sorted(missing))
FONTS = ['Alegreya:wght@400;700', 'Anton', 'Archivo+Black', 'Bebas+Neue', 'Homemade+Apple', 'Josefin+Sans:wght@400;700', 'Lato:wght@400;700',
         'Libre+Baskerville:wght@400;700', 'Montserrat:wght@400;700', 'Oswald:wght@400;700', 'Work+Sans:wght@400;500;600;700;800']
font_url = 'https://fonts.googleapis.com/css2?' + '&'.join('family=' + f for f in FONTS) + '&display=swap'
html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Custom Name Badges | Custom Genie</title>
<meta name="description" content="Design custom name badges with your logo, names and titles. Magnet or pin, metal, plastic, wood or engraved. Add your whole team's names and check every badge before you order.">
<script>try{{const t=localStorage.getItem('cg-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}}catch(e){{}}</script>
<link rel="icon" href="data:,">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="{font_url}" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="{font_url}"></noscript>
<style>
{tokens}
{rd(os.path.join(BD, 'badge.css'))}
</style>
</head>
<body>
{sprite}
{rd(os.path.join(BD, 'badge.html')).replace('{{LOGO}}', logo)}
<script>
(()=>{{'use strict';
const DATA={json.dumps(D, separators=(',', ':'))};
{rd(os.path.join(BD, 'badge.js'))}
}})();
</script>
</body>
</html>
'''
def asset(m):
    name = m.group(1)
    for ext in ('.txt', '.svg'):
        f = os.path.join(B, 'assets', name.lower() + ext)
        if os.path.exists(f):
            v = rd(f).strip()
            return v.replace('url(#mg-gn)', 'url(#gm-grad)') if name == 'GENIE_MARK' else v
    return m.group(0)
html = re.sub(r'\{\{([A-Z_]+)\}\}', asset, html)
left = re.findall(r'\{\{[A-Z_]+\}\}', html)
if left: raise SystemExit('leftover placeholders: %s' % left)
open(out, 'w', encoding='utf-8').write(html)
print('wrote', out, len(html), 'bytes |', len(D['products']), 'badges:', ', '.join('%s (%s)' % (p['name'], p['bc_id']) for p in D['products']))
