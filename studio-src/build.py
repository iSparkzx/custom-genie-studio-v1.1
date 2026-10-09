import os,sys,re
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
html+=rd(os.path.join(S,'upsell.html'))+rd(os.path.join(S,'gallery.html'))+rd(os.path.join(S,'details.html'))+rd(os.path.join(S,'news.html'))
html+=' </div>\n</main>\n\n'+rd(os.path.join(S,'footer.html'))+'\n'+rd(os.path.join(S,'dialogs.html'))
js='\n'.join(rd(os.path.join(S,f)) for f in ['js1_core.js','js2_interact.js','js3_panels.js','js5_3d.js','js6_banana.js','js7_chat.js','js4_genie.js'])
html+="\n<script>\n(()=>{'use strict';\n"+js+"\n})();\n</script>\n</body>\n</html>\n"
def asset(name):
    for ext in ('.txt','.svg'):
        p=os.path.join(A,name.lower()+ext)
        if os.path.exists(p):return rd(p).strip()
    raise SystemExit('missing asset '+name)
def sub(m):
    v=asset(m.group(1))
    return v.replace('url(#mg-gn)','url(#gm-grad)') if m.group(1)=='GENIE_MARK' else v
html=re.sub(r'\{\{([A-Z_]+)\}\}',sub,html)
left=re.findall(r'\{\{[A-Z_]+\}\}',html)
open(out,'w',encoding='utf-8').write(html)
print('wrote',out,len(html),'bytes; leftover placeholders:',left)
