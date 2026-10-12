"""Shared site chrome: the Genie Studio Advanced header and footer on every page of the prototype.

Used by build.py (Genie Studio Advanced), build_badges.py (Genie Studio Basic) and build_pdp.py (product pages):
  sitechrome.chrome(root, active)  -> header and footer HTML for a page ('' at the site root, '../' under p/)
  sitechrome.css(style_css)        -> the header and footer rules, taken from the studio's style.css (one source of truth)
  sitechrome.strip(css)            -> a page stylesheet without its own header/footer rules
  sitechrome.js()                  -> studio-src/site/site.js (theme, mega menu, search, one cart for the whole site)
  sitechrome.write_assets(public)  -> logo and menu pictures as files in public/assets/ (cached once for every page)
"""
import os, re, json, base64
HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.join(HERE, 'site'); SRC = os.path.join(HERE, 'src'); A = os.path.join(HERE, 'assets')
P = os.path.join(HERE, '..', 'products')
rd = lambda p: open(p, encoding='utf-8').read()

FILES = {'logo.png': 'logo.txt', 'gal-oval.svg': 'gal_oval.txt', 'gal-sheet.svg': 'gal_sheet.txt', 'gal-phone.svg': 'gal_phone.txt', 'gal-shapes.svg': 'gal_shapes.txt'}
def write_assets(public):
    out = os.path.join(public, 'assets'); os.makedirs(out, exist_ok=True)
    for name, src in FILES.items():
        m = re.match(r'data:[^;]+;base64,(.*)$', rd(os.path.join(A, src)).strip(), re.S)
        if not m: raise SystemExit('asset %s is not a base64 data URL' % src)
        open(os.path.join(out, name), 'wb').write(base64.b64decode(m.group(1)))
    return sorted(FILES)

# ---------- CSS: the header and footer rules of style.css ----------
SITE_SEL = re.compile(r'(\.(promo|promo-row|promo-msg|promo-end|util|theme-btn|tb-l|when-light|when-dark|hdr|hdr-row|hdr-actions|hdr-link|logo|search|cart-btn|cart-count|nav|nav-dd|has-mega|mega|mega-in|mega-col|mega-list|mega-help|mega-promo|mtiles|mtile|mfins|mfin|pop-grid|pop|btn-line|foot|foot-grid|foot-brand|copy|skip|wrap|ico|sr-only|sw|sw-white|sw-silver|sw-gold|light|t|mt)(?![-\w]))'
                      r'|#(q|searchForm|mega|megaBtn|themeBtn|cartBtn|cartCount)(?![-\w])|(^|[\s,>+~])(header|footer)(?![-\w])')
PAGE_ONLY = re.compile(r'#(builder|studio|cv|vp)\b|\.(studio|cbar|tool|panel|psec|rv|start|gm|ins|lp|rp|sheet|qopt|tpl|zoomfab)\b')
def _blocks(css):
    i, n = 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0: break
        depth, k = 1, j + 1
        while depth and k < n:
            if css[k] == '{': depth += 1
            elif css[k] == '}': depth -= 1
            k += 1
        yield css[i:j].strip(), css[j + 1:k - 1]
        i = k
def _is_site(sel):
    """a rule belongs to the site chrome when every selector in it is about the header or footer"""
    parts = [s.strip() for s in sel.split(',') if s.strip()]
    return bool(parts) and all(SITE_SEL.search(s) and not PAGE_ONLY.search(s) for s in parts) and any(re.search(r'promo|util|theme|hdr|logo|search|cart|nav|mega|mtile|mfin|pop|btn-line|foot|copy|skip|wrap|when-|header|footer|#q|\.sw(?![-\w])|\.sw-(white|silver|gold)', s) for s in parts)
def _walk(css, keep):
    out = []
    for pre, body in _blocks(re.sub(r'/\*.*?\*/', '', css, flags=re.S)):
        if pre.startswith('@media') or pre.startswith('@supports'):
            inner = _walk(body, keep)
            if inner: out.append(pre + '{' + inner + '}')
        elif pre.startswith('@keyframes'):
            if keep and 'bump' in pre: out.append(pre + '{' + body + '}')
            elif not keep and 'bump' not in pre: out.append(pre + '{' + body + '}')
        elif pre.startswith('@'):
            if not keep: out.append(pre + '{' + body + '}')
        elif _is_site(pre) == keep:
            out.append(pre + '{' + body + '}')
    return '\n'.join(out)
def css(style_css):
    return _walk(style_css, True) + '\n' + rd(os.path.join(SITE, 'site.css'))
def strip(page_css):
    return _walk(page_css, False)

# ---------- header + footer ----------
def _slug(d): return d['bigcommerce']['url'].strip('/').split('/')[-1]
def _mega_stickers(root):
    idx = json.loads(rd(os.path.join(P, 'index.json')))['products']; defs = {}
    for r in idx:
        if r['family'] == 'sticker' and r['status'] == 'live': d = json.loads(rd(os.path.join(P, r['file']))); defs[d['id']] = d
    pick = ['domed_white_vinyl_sticker_sheet', 'domed_silver_vinyl_sticker_sheet', 'domed_gold_vinyl_sticker_sheet', 'domed_color_vinyl_sticker_sheet', 'glossy_white_vinyl_sticker_sheet', 'die_cut_sticker']
    li = ''.join(f'<li><a href="{root}p/{_slug(defs[k])}.html">{defs[k]["name"].replace(" Sticker Sheet", "")}<svg class="ico" aria-hidden="true"><use href="#i-right"/></svg></a></li>' for k in pick if k in defs)
    return li + f'<li><a href="{root}p/index.html#stickers">All stickers ({len(defs)})<svg class="ico" aria-hidden="true"><use href="#i-right"/></svg></a></li>'
def _mega_art():
    return rd(os.path.join(A, 'mega_art.svg')).strip()
def chrome(root, active):
    """active: 'all', 'sticker', 'badge', 'pen' or None. Returns (header_html, footer_html)."""
    cur = ' aria-current="page"'
    h = rd(os.path.join(SITE, 'header.html'))
    h = (h.replace('{{ON_ALL}}', cur if active == 'all' else '').replace('{{ON_BADGE}}', cur if active == 'badge' else '').replace('{{ON_PEN}}', cur if active == 'pen' else '')
          .replace('{{ON_STICKER_CLS}}', ' on' if active == 'sticker' else '').replace('{{MEGA_STICKERS}}', _mega_stickers(root)).replace('{{MEGA_ART}}', _mega_art()))
    f = rd(os.path.join(SITE, 'footer.html'))
    h, f = h.replace('{{ROOT}}', root), f.replace('{{ROOT}}', root)
    left = re.findall(r'\{\{[A-Z_]+\}\}', h + f)
    if left: raise SystemExit('site chrome placeholders left: %s' % left)
    return h, f
def js():
    return rd(os.path.join(SITE, 'site.js'))
THEME_INIT = "<script>try{const t=localStorage.getItem('cg-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>"
ICONS = ['i-moon', 'i-sun', 'i-search', 'i-user', 'i-cart', 'i-caret', 'i-right', 'i-x']
