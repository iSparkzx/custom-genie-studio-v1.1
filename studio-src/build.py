import os,sys,re,json
B=os.path.dirname(os.path.abspath(__file__));S=os.path.join(B,'src');A=os.path.join(B,'assets')
rd=lambda p:open(p,encoding='utf-8').read()
out=sys.argv[1] if len(sys.argv)>1 else os.path.join(B,'out.html')
HEAD="""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Domed Vinyl Stickers | Custom Genie</title>
<meta name="description" content="Design custom domed vinyl stickers in a full design studio, or let Genie AI design them for you. Gloss white, silver and gold. Free proofs, no setup fees.">
<script>try{const t=localStorage.getItem('cg-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Work+Sans:wght@400;500;600;700;800;900&family=Anton&family=Archivo+Black&family=Bebas+Neue&family=Dancing+Script:wght@600&family=Libre+Baskerville&family=Lobster&family=Oswald:wght@500&family=Righteous&family=Roboto+Slab:wght@500&display=swap">
<style>
"""
html=HEAD+rd(os.path.join(S,'style.css'))+"\n</style>\n</head>\n<body>\n"
html+=rd(os.path.join(S,'sprite.html'))
html+='\n<a class="skip" href="#builder">Skip to the sticker studio</a>\n'
html+=rd(os.path.join(S,'header.html'))
html+='\n<main id="main">\n <div class="wrap">\n  '+rd(os.path.join(S,'hero.html'))+'\n'+rd(os.path.join(S,'studio.html'))+'\n  '
# Below the builder: nothing until the footer (upsell, gallery, details and newsletter sections removed).
# upsell.html, gallery.html, details.html and news.html stay in src/ in case any are wanted back.
html+=' </div>\n</main>\n\n'+rd(os.path.join(S,'footer.html'))+'\n'+rd(os.path.join(S,'dialogs.html'))
js='\n'.join(rd(os.path.join(S,f)) for f in ['js1_core.js','js2_interact.js','js3_panels.js','js5_3d.js','js6_banana.js','js7_chat.js','js4_genie.js'])
html+="\n<script>\n(()=>{'use strict';\n"+js+"\n})();\n</script>\n</body>\n</html>\n"
# Products this studio supports (studio_status "built" in products/index.json), embedded so the page needs no
# BigCommerce access at runtime. Prices, size steps, quantity discounts and product codes are BigCommerce's own.
VINYL_PRODUCTS={'white':'domed_white_vinyl_sticker_sheet','silver':'domed_silver_vinyl_sticker_sheet','gold':'domed_gold_vinyl_sticker_sheet'}
def studio_products():
    P=os.path.join(B,'..','products');idx=json.loads(rd(os.path.join(P,'index.json')));g=lambda v:'%g'%float(v);out={}
    for r in idx['products']:
        if r['studio_status']!='built':continue
        d=json.loads(rd(os.path.join(P,r['file'])));z=d['size'];pr=d['pricing']
        if z['mode']!='free':raise SystemExit(d['id']+': the studio only supports free sizes')
        tiers=[{'min_qty':t['min_qty'],'pct':t['amount']} for t in pr['quantity_tiers']]
        if any(t['type']!='percent' for t in pr['quantity_tiers']):raise SystemExit(d['id']+': only percent quantity discounts are supported')
        sku={g(v['options']['height'])+'x'+g(v['options']['width']):v['sku'] for v in pr['variants'] if 'height' in v['options'] and 'width' in v['options']}
        steps={'w':z['price_steps']['width'],'h':z['price_steps']['height']}
        if len(pr['price_grid'])!=len(steps['w'])*len(steps['h']) or set(sku)!=set(pr['price_grid']):raise SystemExit(d['id']+': incomplete price grid')
        out[d['id']]={'id':d['id'],'name':d['name'],'bc_id':d['bigcommerce']['product_id'],'url':d['bigcommerce']['url'],'pulled_at':pr['pulled_at'],
          'size':{'min':min(z['width']['min'],z['height']['min']),'max':max(z['width']['max'],z['height']['max']),'steps':steps},
          'tiers':tiers,'grid':pr['price_grid'],'sku':sku}
    miss=[k for k,v in VINYL_PRODUCTS.items() if v not in out]
    if miss:raise SystemExit('no product definition for finish: '+', '.join(miss))
    q=[[t['min_qty'] for t in p['tiers']] for p in out.values()]
    if any(x!=q[0] for x in q):raise SystemExit('the studio products have different quantity breaks')
    return {'vinyl':VINYL_PRODUCTS,'products':out}
PRODUCTS=studio_products()
def asset(name):
    for ext in ('.txt','.svg'):
        p=os.path.join(A,name.lower()+ext)
        if os.path.exists(p):return rd(p).strip()
    raise SystemExit('missing asset '+name)
def sub(m):
    if m.group(1)=='PRODUCTS_JSON':return json.dumps(PRODUCTS,separators=(',',':'))
    v=asset(m.group(1))
    return v.replace('url(#mg-gn)','url(#gm-grad)') if m.group(1)=='GENIE_MARK' else v
html=re.sub(r'\{\{([A-Z_]+)\}\}',sub,html)
left=re.findall(r'\{\{[A-Z_]+\}\}',html)
open(out,'w',encoding='utf-8').write(html)
print('wrote',out,len(html),'bytes; leftover placeholders:',left,'| products:',', '.join(f"{p['name']} ({p['bc_id']})" for p in PRODUCTS['products'].values()))
