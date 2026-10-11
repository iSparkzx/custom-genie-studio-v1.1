import os,sys,re,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import sitechrome
B=os.path.dirname(os.path.abspath(__file__));S=os.path.join(B,'src');A=os.path.join(B,'assets')
rd=lambda p:open(p,encoding='utf-8').read()
out=sys.argv[1] if len(sys.argv)>1 else os.path.join(B,'out.html')
HEAD="""<!doctype html>
<html lang="en" data-root="">
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
html=HEAD+rd(os.path.join(S,'style.css'))+'\n'+rd(os.path.join(B,'site','site.css'))+"\n</style>\n</head>\n<body>\n"
html+=rd(os.path.join(S,'sprite.html'))
html+='\n<a class="skip" href="#builder">Skip to the sticker studio</a>\n'
SITE_HEADER,SITE_FOOTER=sitechrome.chrome('','sticker')   # shared site header/footer (studio-src/site/)
html+=SITE_HEADER
html+='\n<main id="main">\n <div class="wrap">\n  '+rd(os.path.join(S,'hero.html'))+'\n{{HERO_NAMES}}\n'+rd(os.path.join(S,'studio.html'))+'\n  '
# Below the builder: nothing until the footer (upsell, gallery, details and newsletter sections removed).
# upsell.html, gallery.html, details.html and news.html stay in src/ in case any are wanted back.
html+=' </div>\n</main>\n\n'+SITE_FOOTER+'\n'+rd(os.path.join(S,'dialogs.html'))
js='\n'.join(rd(os.path.join(S,f)) for f in ['js1_core.js','js2_interact.js','js3_panels.js','js5_3d.js','js6_banana.js','js7_chat.js','js4_genie.js'])
html+="\n<script>\n"+sitechrome.js()+"\n</script>\n<script>\n(()=>{'use strict';\n"+js+"\n})();\n</script>\n</body>\n</html>\n"
# Every product Genie Studio Advanced designs (studios.advanced in products/index.json), embedded so the page needs no
# BigCommerce access at runtime. Prices, sizes, options, quantity discounts and product codes are BigCommerce's own;
# how each product looks on screen (material, frame, imprint area) comes from products/families/<family>.json "studio".
FAMILIES={'sticker':{'label':'Stickers','one':'sticker','many':'stickers'},'badge':{'label':'Name badges','one':'badge','many':'badges'},'pen':{'label':'Pens & notebooks','one':'item','many':'items'}}
SIZE_AXES=('height','width')
def studio_products():
    P=os.path.join(B,'..','products');idx=json.loads(rd(os.path.join(P,'index.json')));fam={f:json.loads(rd(os.path.join(P,'families',f+'.json'))) for f in FAMILIES};out={}
    for r in idx['products']:
        if not r.get('studios',{}).get('advanced'):continue
        d=json.loads(rd(os.path.join(P,r['file'])));f=d['family'];cfg=fam[f]['studio'];c=cfg['products'].get(d['id'])
        if c is None:raise SystemExit(d['id']+': no studio settings in products/families/%s.json'%f)
        pr=d['pricing'];z=d['size'];vs=pr['variants']
        if any(t['type']!='percent' for t in pr['quantity_tiers']):raise SystemExit(d['id']+': only percent quantity discounts are supported')
        axes=[o['role'] for o in d['cart']['options'] if o['role']]
        if any(a not in v['options'] for v in vs for a in axes):raise SystemExit(d['id']+': a variant is missing an option value')
        num=lambda a,v:float(v) if a in SIZE_AXES else v
        rec={'id':d['id'],'name':d['name'],'family':f,'type':d['type'],'bc_id':d['bigcommerce']['product_id'],'url':d['bigcommerce']['url'],'pulled_at':pr['pulled_at'],
             'deco':d.get('decoration'),'axes':axes,
             'opts':{o['role']:{'id':o['id'],'name':o['name'],'ids':{v['label']:v['id'] for v in o['values']}} for o in d['cart']['options'] if o['role']},
             'vals':{a:list(dict.fromkeys(v['options'][a] for v in sorted(vs,key=lambda v:num(a,v['options'][a])) if True)) if a in SIZE_AXES else list(dict.fromkeys(v['options'][a] for v in vs)) for a in axes},
             'variants':[[v['id'],v['sku'],v['price'],1 if v.get('purchasing_disabled') else 0]+[num(a,v['options'][a]) for a in axes] for v in vs],
             'mods':{m['role']:{'id':m['id'],'name':m['name']} for m in d['cart']['modifiers'] if m['role']},
             'tiers':[[t['min_qty'],t['amount']] for t in pr['quantity_tiers']]}
        for a in SIZE_AXES:
            if a in rec['vals']:rec['vals'][a]=[g(x) for x in sorted({float(x) for x in rec['vals'][a]})]
        if f=='sticker':
            grp=cfg['groups'][c['group']];types=fam[f]['types'].get(d['type'],{})
            shapes=[s['id'] for s in d['shapes']]
            if 'rect' in shapes:shapes.insert(shapes.index('rect')+1,'square')   # a square is a Rectangle with equal sides
            if c['look'].get('dome') and 'oval' not in shapes:shapes.insert(shapes.index('circle')+1 if 'circle' in shapes else len(shapes),'oval')   # Carlos: keep Oval on domed (cart mapping still open)
            if z['mode']!='free':raise SystemExit(d['id']+': stickers must have free sizes')
            rec.update({'group':c['group'],'group_label':grp['label'],'category':grp['category'],'finish':c['finish'],'look':c['look'],'shapes':shapes,
                'size':{'mode':'free','w':[z['width']['min'],z['width']['max']],'h':[z['height']['min'],z['height']['max']],'steps':{'w':z['price_steps']['width'],'h':z['price_steps']['height']}},
                'sheet':types.get('sheet_in'),'format':types.get('format'),'checks':fam[f]['checks']})
            if c['look'].get('by'):rec['looks']=cfg['material_looks']
            # every size step on the grid must be a real variant (the studio never invents a price)
            for a,k in (('height','h'),('width','w')):
                if [float(x) for x in rec['vals'][a]]!=[float(x) for x in rec['size']['steps'][k]]:raise SystemExit(d['id']+': size steps differ from the variants')
        elif f=='badge':
            if d['size']['mode']=='preset':ids=sorted(p['id'] for p in d['size']['presets'])
            else:ids=['default']
            if sorted(c['sizes'])!=ids:raise SystemExit(d['id']+': sizes in badge.json do not match BigCommerce')
            rec.update({'group':c['group'],'category':c['group'],'kind':c['kind'],'shape':c['shape'],'frame':c.get('frame'),'shapes':[c['shape']],
                'size':{'mode':'preset','presets':[{'id':k,'label':('Size %s'%k[4:]) if k.startswith('size') else 'One size','w':c['sizes'][k][0],'h':c['sizes'][k][1],'known':c['sizes'][k][2]} for k in ids]},
                'checks':fam[f]['checks'],'engrave_colors':cfg['engraving_colors'],'colors':cfg['named_colors']})
        else:
            im=c['imprint'];kind=c['kind']
            rec.update({'group':kind,'category':{'pen':'Pens','pencil':'Pencils','notebook':'Notebooks'}[kind],'kind':kind,'shape':'rect','shapes':['rect'],
                'size':{'mode':'fixed','presets':[{'id':'default','label':'Imprint area','w':im['w'],'h':im['h'],'known':im['known']}]},
                'barrel':c.get('barrel'),'engrave':c.get('engrave'),'colors':cfg['colors'],'checks':{'safe_area_in':0.03,'min_text_pt':6,'min_dpi':150,'min_line_pt':0.5}})
        if not rec['variants']:raise SystemExit(d['id']+': no variants')
        out[d['id']]=rec
    for f in FAMILIES:
        dflt=fam[f]['studio']['default_product']
        if dflt not in out:raise SystemExit(f+': default product %s is not in the studio'%dflt)
    return {'families':{f:dict(v,default=fam[f]['studio']['default_product']) for f,v in FAMILIES.items()},'default':fam['sticker']['studio']['default_product'],'products':out}
g=lambda v:'%g'%float(v)
PRODUCTS=studio_products()
def asset(name):
    for ext in ('.txt','.svg'):
        p=os.path.join(A,name.lower()+ext)
        if os.path.exists(p):return rd(p).strip()
    raise SystemExit('missing asset '+name)
def sub(m):
    if m.group(1)=='PRODUCTS_JSON':return json.dumps(PRODUCTS,separators=(',',':'))
    if m.group(1)=='HERO_NAMES':
        # set the heading, breadcrumb and title before the first paint (no layout shift when the product isn't the default)
        names={k:[p['name'],PRODUCTS['families'][p['family']]['label'],p.get('category') or p['name'],p['family']] for k,p in PRODUCTS['products'].items()}
        return "<script>(()=>{const N="+json.dumps(names,separators=(',',':'))+",q=new URLSearchParams(location.search).get('product'),n=N[q]||N["+json.dumps(PRODUCTS['default'])+"];const t=document.getElementById('pTitle');t.textContent=n[0];t.classList.toggle('long',n[0].length>34);document.getElementById('crumbFam').textContent=n[1];document.getElementById('crumbProd').textContent=n[2];document.title=n[0]+' | Genie Studio Advanced | Custom Genie';const f=n[3];document.getElementById('megaBtn').classList.toggle('on',f==='sticker');document.querySelectorAll('[data-nav]').forEach(a=>{if(a.dataset.nav===f)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')})})()</script>"
    v=asset(m.group(1))
    return v.replace('url(#mg-gn)','url(#gm-grad)') if m.group(1)=='GENIE_MARK' else v
html=re.sub(r'\{\{([A-Z_]+)\}\}',sub,html)
left=re.findall(r'\{\{[A-Z_]+\}\}',html)
sitechrome.write_assets(os.path.dirname(os.path.abspath(out)))
open(out,'w',encoding='utf-8').write(html)
print('wrote',out,len(html),'bytes; leftover placeholders:',left,'| products:',len(PRODUCTS['products']),{f:sum(1 for p in PRODUCTS['products'].values() if p['family']==f) for f in FAMILIES})
