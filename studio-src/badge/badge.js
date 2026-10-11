/* Custom Genie · Name badge studio
   DATA (embedded by build_badges.py): badge products from the BigCommerce definitions, the Doogma layout masters,
   print checks and colors. Every badge is drawn as SVG in badge units (100 per inch). */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const KEY='cg-badge-v1',U=100,C=DATA.box,TS=DATA.text_size;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const r2=v=>Math.round(v*100)/100,money=v=>'$'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtIn=v=>{const w=Math.floor(v+1e-9),f=v-w;if(f<1e-6)return String(w);for(const d of[2,4,8,16]){const n=Math.round(f*d);if(Math.abs(n/d-f)<1e-6)return(w?w+' ':'')+n+'/'+d}return v.toFixed(2)};
const prod=id=>DATA.products.find(p=>p.id===id);
const params=new URLSearchParams(location.search),DEBUG=params.has('debug');
const track=(event,p={})=>{(window.dataLayer=window.dataLayer||[]).push({event,...p})};
const W700=new Set(['Alegreya','Josefin Sans','Lato','Libre Baskerville','Montserrat','Oswald']);
const NAMED=DATA.colors;
const pickFont=(list,pref)=>pref.find(f=>list.includes(f))||list[0];

/* ---------- layouts: Doogma layouts 1 to 7, plus a studio text-only layout ---------- */
const LAYOUTS={...DATA.layouts,text:{text1:[480,440,679,90],text2:[480,530,679,69],image:null,label:'Name and title only',studio:true}};
const LAYOUT_ORDER=['text','1','2','3','4','5','6','7'];
const hasImg=id=>!!LAYOUTS[id].image,hasT2=id=>!!LAYOUTS[id].text2,hasT1=id=>!!LAYOUTS[id].text1;

/* ---------- state ---------- */
function blank(p){return{pid:p.id,size:p.sizes[0].id,bg:p.bg[0]||null,border:p.border[0]||null,attach:p.attach[0]||null,custom:'#1F4E9C',bgImg:null,bgScale:DATA.bg_scale.default,
  layout:'text',name:'Alex Morgan',title:'Store Manager',font1:pickFont(p.fonts,['Montserrat','Lato']),font2:pickFont(p.fonts,['Lato','Montserrat']),
  fs1:TS.text1.default,fs2:TS.text2.default,c1:null,c2:null,align:'center',logo:null,logoRaw:null,logoW:0,logoH:0,logoSvg:false,logoScale:DATA.logo_scale.default,dropWhite:false,logoGenie:false,
  names:'',qty:1,notes:''}}
function fit(S){const p=prod(S.pid);const ok=(v,l)=>l.includes(v)?v:(l[0]||null);
  S.size=p.sizes.some(z=>z.id===S.size)?S.size:p.sizes[0].id;S.bg=ok(S.bg,p.bg);S.border=ok(S.border,p.border);S.attach=ok(S.attach,p.attach);
  S.font1=p.fonts.includes(S.font1)?S.font1:pickFont(p.fonts,['Montserrat']);S.font2=p.fonts.includes(S.font2)?S.font2:pickFont(p.fonts,['Lato']);
  if(!LAYOUTS[S.layout])S.layout='text';return S}
let S;{let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
  const want=prod(params.get('product'))||prod(saved&&saved.pid)||prod(DATA.default_product)||DATA.products[0];
  S=fit(Object.assign(blank(want),saved||{},{pid:want.id}))}
let saveT;function save(){clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){try{localStorage.setItem(KEY,JSON.stringify({...S,logo:null,logoRaw:null,bgImg:null}))}catch(e2){}}},250)}
const P=()=>prod(S.pid);

/* ---------- colors ---------- */
const hex2rgb=h=>{h=String(h||'#000').replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[n>>16&255,n>>8&255,n&255]};
const lum=h=>{const[r,g,b]=hex2rgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b};
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const autoInk=bg=>bg&&lum(bg)<.32?'#FFFFFF':'#111111';
function look(p,S){ /* what the badge face looks like: fill key, plain color used for contrast, engraving color */
  const k=p.kind,bg=S.bg||'';
  if(k==='engraved_plastic'){const[a,b]=bg.split('-');return{face:'solid',color:NAMED[a]||'#111111',engrave:NAMED[b]||'#FFFFFF'}}
  if(k==='wood')return{face:'wood',color:'#C8925A',engrave:p.decoration==='engraved'?DATA.engrave.wood:null};
  if(k==='chalk')return{face:'chalk',color:'#2E3A35'};
  if(k==='window')return{face:'solid',color:'#FFFFFF',frame:bg==='Gold'?'gold':'silver'};
  if(bg==='Gold')return{face:'gold',color:'#D7B35A'};
  if(bg==='Silver')return{face:'silver',color:'#C9CDD2'};
  if(bg==='Custom Color')return{face:'solid',color:S.custom};
  if(bg==='Upload Background')return{face:'image',color:null};
  return{face:'solid',color:'#FFFFFF'}}
function borderPaint(p,S){const b=S.border||'';if(!b)return null;if(b==='Gold')return'gold';if(b==='Silver')return'silver';return NAMED[b.replace(' Edge','')]||'#111111'}

/* ---------- geometry ---------- */
const sizeOf=(p,S)=>p.sizes.find(z=>z.id===S.size)||p.sizes[0];
function frameIn(p,look){if(p.kind==='window')return .12;if(p.frame==='metal')return .09;if(p.frame==='border')return .06;if(p.frame==='edge')return .02;return 0}
function geo(p,S,lk){const z=sizeOf(p,S),W=z.w*U,H=(p.shape==='circle'?z.w:z.h)*U,fw=frameIn(p,lk)*U,m=DATA.checks.safe_margin_in*U;
  let s={x:fw+m,y:fw+m,w:W-2*(fw+m),h:H-2*(fw+m)};
  if(p.shape==='oval'||p.shape==='circle'){const cw=(W-2*fw)*Math.SQRT1_2-2*m,ch=(H-2*fw)*Math.SQRT1_2-2*m;s={x:(W-cw)/2,y:(H-ch)/2,w:cw,h:ch}}
  if(p.shape==='oval_top'){const y0=H*.28*.6+fw+m;s={x:fw+m,y:y0,w:W-2*(fw+m),h:H-y0-fw-m}}
  return{z,W,H,fw,s}}
function shapePath(p,W,H){
  if(p.shape==='oval'||p.shape==='circle')return`M0 ${H/2}A${W/2} ${H/2} 0 1 1 ${W} ${H/2}A${W/2} ${H/2} 0 1 1 0 ${H/2}Z`;
  const r=Math.min(.1*U,H*.14);
  if(p.shape==='oval_top'){const a=H*.28;return`M0 ${a}A${W/2} ${a} 0 0 1 ${W} ${a}L${W} ${H-r}Q${W} ${H} ${W-r} ${H}L${r} ${H}Q0 ${H} 0 ${H-r}Z`}
  return`M${r} 0H${W-r}Q${W} 0 ${W} ${r}V${H-r}Q${W} ${H} ${W-r} ${H}H${r}Q0 ${H} 0 ${H-r}V${r}Q0 0 ${r} 0Z`}
const mapBox=(b,s)=>b&&b[0]>-400?{x:s.x+(b[0]-b[2]/2-C.x)/C.w*s.w,y:s.y+(b[1]-b[3]/2-C.y)/C.h*s.h,w:b[2]/C.w*s.w,h:b[3]/C.h*s.h}:null;

/* ---------- text measuring ---------- */
const mctx=document.createElement('canvas').getContext('2d');
function textW(t,font,w,size){mctx.font=`${w} 100px "${font}", sans-serif`;return mctx.measureText(t).width/100*size}

/* ---------- one badge as SVG ---------- */
let uid=0;
const METAL={gold:['#8F6A20','#D9B45A','#F6E3A3','#C99B3E','#8A651E'],silver:['#7E848A','#C9CDD2','#FAFBFC','#B3B8BD','#7A8086']};
function badge(p,S,person,{mode='edit',px=null}={}){
  const id='b'+(++uid),lk=look(p,S),g=geo(p,S,lk),{W,H,s}=g,issues=[],d=shapePath(p,W,H);
  const grad=(n,stops)=>`<linearGradient id="${id}${n}" x1="0" y1="0" x2="1" y2="1">${stops.map((c,i)=>`<stop offset="${i/(stops.length-1)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  let defs=`<clipPath id="${id}c"><path d="${d}"/></clipPath>${grad('gold',METAL.gold)}${grad('silver',METAL.silver)}
   <pattern id="${id}br" width="9" height="1.4" patternUnits="userSpaceOnUse"><rect width="9" height=".45" fill="#fff" opacity=".22"/></pattern>
   <pattern id="${id}wd" width="80" height="16" patternUnits="userSpaceOnUse"><path d="M0 8Q20 3 40 8T80 8M0 14Q20 11 40 14T80 14" fill="none" stroke="#7A4B24" stroke-width=".9" opacity=".35"/></pattern>
   <pattern id="${id}ck" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".7" fill="#fff" opacity=".09"/><circle cx="10" cy="11" r=".5" fill="#fff" opacity=".07"/></pattern>`;
  /* face */
  let face='';const f=lk.face;
  if(f==='gold'||f==='silver')face=`<rect width="${W}" height="${H}" fill="url(#${id}${f})"/><rect width="${W}" height="${H}" fill="url(#${id}br)"/>`;
  else if(f==='wood')face=`<rect width="${W}" height="${H}" fill="#C8925A"/><rect width="${W}" height="${H}" fill="url(#${id}wd)"/>`;
  else if(f==='chalk')face=`<rect width="${W}" height="${H}" fill="#2E3A35"/><rect width="${W}" height="${H}" fill="url(#${id}ck)"/>`;
  else if(f==='image'){if(S.bgImg){const k=S.bgScale,w=W*k,h=H*k;face=`<rect width="${W}" height="${H}" fill="#fff"/><image href="${S.bgImg}" x="${(W-w)/2}" y="${(H-h)/2}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`}
    else{face=`<rect width="${W}" height="${H}" fill="#E9ECF1"/>`;if(mode==='edit')face+=`<text x="${W/2}" y="${H-8}" font-family="Work Sans,sans-serif" font-size="${Math.max(7,H*.07)}" fill="#5F6875" text-anchor="middle">Upload a background image under Background</text>`;else issues.push({lvl:'warn',msg:'Upload a background image, or pick another background.'})}}
  else face=`<rect width="${W}" height="${H}" fill="${lk.color}"/>`;
  /* frame */
  let frame='';const fw=g.fw;
  if(fw>0){const paint=p.kind==='window'?lk.frame:borderPaint(p,S);if(paint){const fill=paint==='gold'||paint==='silver'?`url(#${id}${paint})`:paint;
    frame=`<path d="${d}" fill="none" stroke="${fill}" stroke-width="${fw*2}"/>`;if(paint==='gold'||paint==='silver')frame+=`<path d="${d}" fill="none" stroke="url(#${id}br)" stroke-width="${fw*2}"/>`}}
  /* ink */
  const ink1=lk.engrave||S.c1||autoInk(lk.color),ink2=lk.engrave||S.c2||autoInk(lk.color);
  /* layout */
  const L=LAYOUTS[S.layout],k=s.h/C.h;let b1=mapBox(L.text1,s),b2=mapBox(L.text2,s);const bi=mapBox(L.image,s);
  const name=(person.name||'').trim(),title=(person.title||'').trim();
  if(b1&&b2&&!title){const top=b1.y,bot=b2.y+b2.h;b1={...b1,y:(top+bot)/2-b1.h/2};b2=null}
  let txt='';const minU=DATA.checks.min_text_pt/72*U;
  const line=(t,b,font,fs,ink,label)=>{if(!b||!t)return;const w=W700.has(font)&&label==='Name'?700:400,max=Math.min(fs*k,b.h),tw=textW(t,font,w,max),sz=tw>b.w?max*b.w/tw:max;
    if(sz<minU)issues.push({lvl:'warn',field:label,msg:`${label} "${t}" is too long to print clearly (${(Math.floor(sz/U*72*10)/10).toFixed(1)} pt). Shorten it, pick a narrower font or a wider layout.`});
    const a=S.align,x=a==='left'?b.x:a==='right'?b.x+b.w:b.x+b.w/2,anchor=a==='left'?'start':a==='right'?'end':'middle';
    txt+=`<text x="${x.toFixed(2)}" y="${(b.y+b.h/2+sz*.35).toFixed(2)}" font-family="${esc(font)}, sans-serif" font-weight="${w}" font-size="${sz.toFixed(2)}" fill="${ink}" text-anchor="${anchor}">${esc(t)}</text>`};
  if(hasT1(S.layout)&&!name)issues.push({lvl:'warn',field:'Name',msg:'Add a name.'});
  line(name,b1,S.font1,S.fs1,ink1,'Name');line(title,b2,S.font2,S.fs2,ink2,'Title');
  /* logo */
  let logo='';
  if(bi){if(S.logo){const sc=S.logoScale,w=bi.w*sc,h=bi.h*sc,x=bi.x+(bi.w-w)/2,y=bi.y+(bi.h-h)/2;
      if(lk.engrave){const[r,gg,bb]=hex2rgb(lk.engrave).map(v=>(v/255).toFixed(3));defs+=`<filter id="${id}e" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 ${r} 0 0 0 0 ${gg} 0 0 0 0 ${bb} -.333 -.333 -.333 1 0"/><feComponentTransfer><feFuncA type="linear" slope="4"/></feComponentTransfer></filter>`}
      logo=`<image href="${S.logo}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" preserveAspectRatio="xMidYMid meet"${lk.engrave?` filter="url(#${id}e)"`:''}/>`;
      if(S.logoW&&!S.logoSvg){const ar=S.logoW/S.logoH,fitW=Math.min(w,h*ar)/U,dpi=S.logoW/fitW;if(dpi<150)issues.push({lvl:'warn',msg:`Your logo is low resolution for this size (${Math.round(dpi)} dpi). It may print blurry; upload a larger file if you have one.`})}}
    else{issues.push({lvl:'warn',msg:'This layout has a spot for a logo. Add one under Logo, or pick "Name and title only" under Layout.'});
      if(mode==='edit')logo=`<rect x="${bi.x}" y="${bi.y}" width="${bi.w}" height="${bi.h}" rx="4" fill="none" stroke="#8A929D" stroke-width="1" stroke-dasharray="4 3"/><text x="${bi.x+bi.w/2}" y="${bi.y+bi.h/2+3}" font-family="Work Sans,sans-serif" font-size="${Math.min(bi.h*.2,11)}" fill="#5F6875" text-anchor="middle">Your logo</text>`}}
  /* contrast */
  if(lk.color&&!lk.engrave){const c=contrast(ink1,lk.color);if(name&&c<DATA.checks.min_contrast)issues.push({lvl:'warn',msg:`The name color is hard to read on this background (contrast ${c.toFixed(1)}:1). Pick a darker or lighter color.`})}
  const size=px?` width="${(W/U*px).toFixed(1)}" height="${(H/U*px).toFixed(1)}"`:'';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${W+4} ${H+4}"${size} aria-hidden="true" focusable="false"><defs>${defs}</defs><g clip-path="url(#${id}c)">${face}${logo}${txt}${frame}</g><path d="${d}" fill="none" stroke="rgba(0,0,0,.3)" stroke-width=".8"/></svg>`;
  return{svg,issues}}

/* ---------- names ---------- */
function parseNames(t){const out=[];String(t||'').split(/\r?\n/).forEach((raw,i)=>{let l=raw.trim();if(!l)return;
  if(i===0&&/^"?name"?\s*([,\t;]|$)/i.test(l))return;
  const m=l.match(/^("?)(.*?)\1\s*(?:[,\t;]\s*("?)(.*?)\3\s*)?$/);const name=(m?m[2]:l).trim(),title=(m&&m[4]||'').trim();
  if(name||title)out.push({name,title,line:i+1})});return out.slice(0,2000)}
let who=0;
const people=()=>{const n=parseNames(S.names);return n.length?n:[{name:S.name,title:S.title,line:0}]};
const usingList=()=>parseNames(S.names).length>0;

/* ---------- pricing (BigCommerce) ---------- */
/* variants are compact arrays: [id, sku, price, size, background, border, attachment] (see DATA.vkeys) */
const V=a=>({id:a[0],sku:a[1],price:a[2],o:Object.fromEntries(DATA.vkeys.map((k,i)=>[k,a[3+i]]).filter(([,v])=>v!=null))});
function variant(p,S){const want={size:S.size==='default'?undefined:S.size,background_color:S.bg,border_color:S.border,attachment:S.attach};
  const a=p.variants.find(x=>DATA.vkeys.every((k,i)=>x[3+i]==null||want[k]===undefined||want[k]===x[3+i]))||p.variants[0];return V(a)}
function unitFor(p,v,q){let pct=0;for(const t of p.tiers)if(q>=t.min_qty)pct=t.pct;return{unit:r2(v.price*(1-pct/100)),pct}}
const qtyNow=()=>usingList()?parseNames(S.names).length:Math.max(1,Math.min(5000,parseInt(S.qty,10)||1));

/* ---------- UI build ---------- */
const sw=(label,css,{name,val,checked,text=label})=>`<label><input type="radio" name="${name}" value="${esc(val)}"${checked?' checked':''}><span><i style="background:${css}" aria-hidden="true"></i>${esc(text)}</span></label>`;
const metalCss=k=>`linear-gradient(135deg,${METAL[k].join(',')})`;
function swCss(v){if(v==='Gold')return metalCss('gold');if(v==='Silver')return metalCss('silver');if(v==='Custom Color')return'conic-gradient(#F2364C,#F5B82E,#21C8E2,#5A3BD6,#F2364C)';
  if(v==='Upload Background')return'linear-gradient(135deg,#9ad 0 40%,#fc8 40% 70%,#7b6 70%)';if(v.includes('-')){const[a,b]=v.split('-');return`linear-gradient(135deg,${NAMED[a]||'#111'} 50%,${NAMED[b]||'#fff'} 50%)`}
  return NAMED[v.replace(' Edge','')]||'#ccc'}
function layoutThumb(id){const L=LAYOUTS[id],pad=24,vb=`${C.x-pad} ${C.y-pad} ${C.w+2*pad} ${C.h+2*pad}`;let s=`<rect x="${C.x-pad+4}" y="${C.y-pad+4}" width="${C.w+2*pad-8}" height="${C.h+2*pad-8}" rx="22" fill="#fff" stroke="#C6CDD5" stroke-width="5"/>`;
  const box=(b,fill,hFrac,wFrac)=>{if(!b||b[0]<-400)return'';const h=b[3]*hFrac,w=b[2]*wFrac;return`<rect x="${b[0]-w/2}" y="${b[1]-h/2}" width="${w}" height="${h}" rx="${Math.min(10,h/2)}" fill="${fill}"/>`};
  if(L.image){const b=L.image,sz=Math.min(b[2],b[3])*.9;s+=`<rect x="${b[0]-b[2]/2+6}" y="${b[1]-b[3]/2+6}" width="${b[2]-12}" height="${b[3]-12}" rx="12" fill="#E3E7EC"/><path d="M${b[0]-sz*.35} ${b[1]+sz*.25}l${sz*.25}-${sz*.3}l${sz*.15}${sz*.15}l${sz*.12}-${sz*.1}l${sz*.18}${sz*.25}z" fill="#A9B1BB"/>`}
  s+=box(L.text1,'#3F4854',.62,.72)+box(L.text2,'#A9B1BB',.5,.55);return`<svg viewBox="${vb}" aria-hidden="true">${s}</svg>`}
function buildStatic(){
  const groups={};DATA.products.forEach(p=>{(groups[p.group]=groups[p.group]||[]).push(p)});
  $('#product').innerHTML=Object.entries(groups).map(([g,l])=>`<optgroup label="${esc(g)}">${l.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</optgroup>`).join('');
  $('#layouts').innerHTML=LAYOUT_ORDER.map(id=>`<label><input type="radio" name="layout" value="${id}"><span>${layoutThumb(id)}${esc(LAYOUTS[id].label)}</span></label>`).join('');
  const rng=(el,o)=>{el.min=o.min;el.max=o.max;el.step=o.step};rng($('#fs1'),TS.text1);rng($('#fs2'),TS.text2);rng($('#logoScale'),DATA.logo_scale);rng($('#bgScale'),DATA.bg_scale)}
function syncPanel(){const p=P(),lk=look(p,S);
  $('#product').value=p.id;$('#crumbName').textContent=p.name;$('#pdpBack').href='p/'+p.url.split('/').filter(Boolean).pop()+'.html';
  $('#productHint').textContent=p.decoration==='engraved'?'Engraved: your text and logo are cut into the badge in one color.':'Printed in full color.';
  $('#sizes').innerHTML=p.sizes.map(z=>`<label><input type="radio" name="size" value="${z.id}"${z.id===S.size?' checked':''}><span>${z.known?`${fmtIn(z.w)} × ${fmtIn(p.shape==='circle'?z.w:z.h)} in`:esc(z.label)}</span></label>`).join('');
  $('#attach').innerHTML=p.attach.map(a=>`<label><input type="radio" name="attach" value="${esc(a)}"${a===S.attach?' checked':''}><span>${esc(a)}</span></label>`).join('');$('#attachSet').hidden=!p.attach.length;
  $$('#layouts input').forEach(i=>i.checked=i.value===S.layout);
  const list=usingList();$('#tName').value=S.name;$('#tTitle').value=S.title;$('#tName').disabled=$('#tTitle').disabled=list;
  $('#namesHint').textContent=list?`Using your Team names list (${parseNames(S.names).length} badges). These two fields are not used.`:'Ordering for a team? Add everyone\'s names under Team names.';
  $('#titleField').hidden=!hasT2(S.layout);$('#font2Field').hidden=$('#fs2Field').hidden=$('#c2Field').hidden=!hasT2(S.layout);
  const fo=l=>l.map(f=>`<option style="font-family:'${esc(f)}'">${esc(f)}</option>`).join('');$('#font1').innerHTML=fo(p.fonts);$('#font2').innerHTML=fo(p.fonts);$('#font1').value=S.font1;$('#font2').value=S.font2;
  $('#fs1').value=S.fs1;$('#fs2').value=S.fs2;$('#fs1o').textContent=S.fs1;$('#fs2o').textContent=S.fs2;
  $('#colorRow').hidden=!!lk.engrave;$('#engraveHint').hidden=!lk.engrave;
  if(lk.engrave)$('#engraveHint').textContent=p.kind==='wood'?'Engraving burns the design into the wood, so it shows in one dark brown.':`Engraving shows in ${(S.bg||'').split('-')[1]||'the core color'}, set by the plate color you choose.`;
  $('#c1').value=S.c1||autoInk(lk.color);$('#c2').value=S.c2||autoInk(lk.color);
  $$('#align input').forEach(i=>i.checked=i.value===S.align);
  $('#logoRemove').hidden=!S.logo;$('#logoScaleField').hidden=!S.logo;$('#logoScale').value=S.logoScale;$('#logoScaleO').textContent=S.logoScale.toFixed(1)+'×';
  $('#whiteRow').hidden=!S.logo||S.logoSvg;$('#dropWhite').checked=S.dropWhite;
  const bgLegend=p.kind==='engraved_plastic'?'Plate color':p.kind==='window'?'Frame':'Background';$('#bgLegend').textContent=bgLegend;
  $('#bgs').innerHTML=p.bg.map(v=>sw(v,swCss(v),{name:'bg',val:v,checked:v===S.bg,text:v.replace('-',' with ')+(p.kind==='engraved_plastic'?' engraving':'')})).join('');$('#bgSet').hidden=!p.bg.length;
  $('#customField').hidden=S.bg!=='Custom Color';$('#custom').value=S.custom;$('#bgImgField').hidden=S.bg!=='Upload Background';$('#bgScale').value=S.bgScale;$('#bgScaleO').textContent=S.bgScale.toFixed(1)+'×';
  $('#borderLegend').textContent=p.frame==='metal'?'Frame':p.frame==='edge'?'Edge':'Border';
  $('#borders').innerHTML=p.border.map(v=>sw(v,swCss(v),{name:'border',val:v,checked:v===S.border})).join('');$('#borderSet').hidden=!p.border.length;
  $('#bgSec').hidden=!p.bg.length&&!p.border.length;
  $('#namesSec').hidden=!p.bulk;
  $$('.sec').filter(s=>!s.hidden).forEach((s,i)=>{s.querySelector('.n').textContent=i+1});
  if($('#names').value!==S.names)$('#names').value=S.names;$('#namesClear').hidden=!S.names}

/* ---------- render ---------- */
let rq=0,actual=false;
function render(){cancelAnimationFrame(rq);rq=requestAnimationFrame(()=>{const p=P(),ppl=people();if(who>=ppl.length)who=0;const person=ppl[who],z=sizeOf(p,S);
  const r=badge(p,S,person,{mode:'edit',px:actual?96:null});$('#badgeView').innerHTML=r.svg;
  $('#badgeView').setAttribute('aria-label',`${p.name} preview${person.name?': '+person.name:''}${person.title?', '+person.title:''}`);
  $('#stageBox').classList.toggle('actual',actual);
  const dim=z.known?`${fmtIn(z.w)} × ${fmtIn(p.shape==='circle'?z.w:z.h)} in`:`${z.label}, preview proportions are approximate`;
  $('#stageCap').textContent=dim+(actual?' · close to actual size (screens vary)':' · enlarged to show detail');
  const list=usingList();$('#who').hidden=!list;if(list)$('#whoTxt').textContent=`Badge ${who+1} of ${ppl.length}: ${person.name||'(no name)'}`;
  const iss=dedupe(r.issues);$('#checks').innerHTML=iss.length?iss.map(i=>`<li class="warn"><svg class="ico" aria-hidden="true"><use href="#i-warn"/></svg><span>${esc(i.msg)}</span></li>`).join(''):`<li class="ok"><svg class="ico" aria-hidden="true"><use href="#i-ok"/></svg><span>Ready to print.</span></li>`;
  const q=qtyNow();$('#barSum').textContent=`${p.name} · ${dim.split(',')[0]} · ${q} badge${q===1?'':'s'}`;
  namesReport();save()})}
const dedupe=l=>{const s=new Set();return l.filter(i=>!s.has(i.msg)&&s.add(i.msg))};
function namesReport(){const p=P(),list=parseNames(S.names);if(!list.length){$('#namesCount').textContent='Leave this empty to order the same badge for everyone.';$('#namesIssues').innerHTML='';return}
  const bad=[];list.forEach(n=>{const r=badge(p,S,n,{mode:'proof'});r.issues.filter(i=>i.field).forEach(i=>bad.push(`Line ${n.line}: ${i.msg}`))});
  $('#namesCount').textContent=`${list.length} badge${list.length===1?'':'s'}, one per line.${bad.length?` ${bad.length} need${bad.length===1?'s':''} attention:`:' Every name fits.'}`;
  $('#namesIssues').innerHTML=bad.slice(0,100).map(t=>`<li>${esc(t)}</li>`).join('')+(bad.length>100?`<li>And ${bad.length-100} more.</li>`:'')}

/* ---------- images ---------- */
const MAXB=10*1024*1024;
const readFile=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)});
const loadImg=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src});
async function shrink(src,max=1400){const i=await loadImg(src),k=Math.min(1,max/Math.max(i.naturalWidth,i.naturalHeight));const c=document.createElement('canvas');c.width=Math.round(i.naturalWidth*k);c.height=Math.round(i.naturalHeight*k);c.getContext('2d').drawImage(i,0,0,c.width,c.height);return{src:c.toDataURL('image/png'),w:i.naturalWidth,h:i.naturalHeight}}
async function dropWhite(src){const i=await loadImg(src),c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const x=c.getContext('2d');x.drawImage(i,0,0);
  const d=x.getImageData(0,0,c.width,c.height),a=d.data;for(let j=0;j<a.length;j+=4){const m=Math.min(a[j],a[j+1],a[j+2]);if(m>=245)a[j+3]=0;else if(m>=215)a[j+3]=Math.round(a[j+3]*(245-m)/30)}x.putImageData(d,0,0);return c.toDataURL('image/png')}
async function setLogo(src,{genie=false,svg=false}={}){
  if(svg){S.logoRaw=S.logo=src;S.logoSvg=true;S.logoW=S.logoH=0;S.dropWhite=false}
  else{const r=await shrink(src);S.logoRaw=r.src;S.logoW=r.w;S.logoH=r.h;S.logoSvg=false;S.dropWhite=genie;S.logo=genie?await dropWhite(r.src):r.src}
  S.logoGenie=genie;let moved=false;if(!hasImg(S.layout)){S.layout='6';moved=true}
  syncPanel();render();return moved}

/* ---------- toast ---------- */
window.CG_TOAST=m=>toast(m);   /* the shared site script (site.js: header, cart) uses this page's toast */
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,4200)}

/* ---------- events ---------- */
function on(){
  $('#panel').addEventListener('submit',e=>e.preventDefault());
  $('#product').addEventListener('change',e=>{const keep={...S};S=fit(Object.assign(blank(prod(e.target.value)),{name:keep.name,title:keep.title,layout:keep.layout,font1:keep.font1,font2:keep.font2,fs1:keep.fs1,fs2:keep.fs2,
    align:keep.align,logo:keep.logo,logoRaw:keep.logoRaw,logoW:keep.logoW,logoH:keep.logoH,logoSvg:keep.logoSvg,logoScale:keep.logoScale,dropWhite:keep.dropWhite,logoGenie:keep.logoGenie,names:keep.names,qty:keep.qty,custom:keep.custom,bgImg:keep.bgImg,bgScale:keep.bgScale,c1:keep.c1,c2:keep.c2}));
    history.replaceState(null,'',`?product=${S.pid}${DEBUG?'&debug':''}`);track('badge_product',{product:S.pid});syncPanel();render()});
  $('#panel').addEventListener('change',e=>{const t=e.target;if(t.type!=='radio')return;const k={size:'size',attach:'attach',layout:'layout',bg:'bg',border:'border',align:'align'}[t.name];if(!k)return;S[k]=t.value;track('badge_option',{option:k,value:t.value});syncPanel();render()});
  const txt=(id,k)=>$(id).addEventListener('input',e=>{S[k]=e.target.value;render()});txt('#tName','name');txt('#tTitle','title');
  $('#font1').addEventListener('change',e=>{S.font1=e.target.value;loadFont(S.font1)});$('#font2').addEventListener('change',e=>{S.font2=e.target.value;loadFont(S.font2)});
  const num=(id,k,o,fmt)=>$(id).addEventListener('input',e=>{S[k]=parseFloat(e.target.value);if(o)$(o).textContent=fmt?fmt(S[k]):S[k];render()});
  num('#fs1','fs1','#fs1o');num('#fs2','fs2','#fs2o');num('#logoScale','logoScale','#logoScaleO',v=>v.toFixed(1)+'×');num('#bgScale','bgScale','#bgScaleO',v=>v.toFixed(1)+'×');
  $('#c1').addEventListener('input',e=>{S.c1=e.target.value;render()});$('#c2').addEventListener('input',e=>{S.c2=e.target.value;render()});
  $('#custom').addEventListener('input',e=>{S.custom=e.target.value;if(!S.c1)$('#c1').value=autoInk(S.custom);render()});
  $('#logoFile').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
    if(f.size>MAXB)return toast('That file is over 10 MB. Please upload a smaller one.');if(!/^image\/(png|jpeg|svg\+xml|webp)$/.test(f.type))return toast('Please upload a PNG, JPG, SVG or WEBP file.');
    try{const moved=await setLogo(await readFile(f),{svg:f.type==='image/svg+xml'});track('badge_logo_upload',{type:f.type});toast(moved?'Logo added. Layout changed to "Logo, then name and title"; you can pick another under Layout.':'Logo added.')}catch(err){toast('We couldn\'t read that image. Try a PNG or JPG.')}});
  $('#logoRemove').addEventListener('click',()=>{Object.assign(S,{logo:null,logoRaw:null,logoW:0,logoH:0,logoSvg:false,logoGenie:false});syncPanel();render()});
  $('#dropWhite').addEventListener('change',async e=>{S.dropWhite=e.target.checked;S.logo=S.dropWhite?await dropWhite(S.logoRaw):S.logoRaw;render()});
  $('#bgFile').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(f.size>MAXB)return toast('That file is over 10 MB. Please upload a smaller one.');
    try{S.bgImg=(await shrink(await readFile(f),1600)).src;render()}catch(err){toast('We couldn\'t read that image. Try a PNG or JPG.')}});
  $('#names').addEventListener('input',e=>{S.names=e.target.value;who=0;syncPanelNames();render()});
  $('#namesFile').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(f.size>5*1024*1024)return toast('That file is over 5 MB.');
    S.names=(await f.text()).slice(0,200000);$('#names').value=S.names;who=0;track('badge_names_import',{rows:parseNames(S.names).length});syncPanel();render()});
  $('#namesClear').addEventListener('click',()=>{S.names='';$('#names').value='';syncPanel();render()});
  $('#whoPrev').addEventListener('click',()=>{const n=people().length;who=(who-1+n)%n;render()});$('#whoNext').addEventListener('click',()=>{who=(who+1)%people().length;render()});
  $('#actualBtn').addEventListener('click',e=>{actual=!actual;e.currentTarget.setAttribute('aria-pressed',String(actual));e.currentTarget.textContent=actual?'Fit to screen':'Actual size';render()});
  $('#reviewBtn').addEventListener('click',openReview);
}
let syncN;function syncPanelNames(){clearTimeout(syncN);syncN=setTimeout(syncPanel,300)}
function themeLabel(){const d=document.documentElement;if(!d.dataset.theme)d.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}

/* ---------- fonts: re-measure once each font arrives ---------- */
const loaded=new Set();
function loadFont(f){if(!document.fonts){render();return}Promise.all([document.fonts.load(`700 40px "${f}"`),document.fonts.load(`400 40px "${f}"`)]).then(()=>{loaded.add(f);render()}).catch(render);render()}
if(document.fonts){document.fonts.addEventListener('loadingdone',()=>render());document.fonts.ready.then(render)}

/* ---------- Genie AI logo ---------- */
async function genieInit(){try{const r=await fetch('/api/genie/status');if(!r.ok)return;const s=await r.json();if(!s.enabled)return;$('#genie').hidden=false}catch(e){return}
  $('#genieGo').addEventListener('click',async()=>{const prompt=$('#genieP').value.trim(),btn=$('#genieGo'),msg=$('#genieMsg');if(!prompt){msg.textContent='Describe the logo you want first.';$('#genieP').focus();return}
    btn.disabled=true;btn.setAttribute('aria-busy','true');msg.textContent='Genie is designing 2 options. This takes about 30 seconds.';$('#geniePicks').innerHTML='';track('badge_genie_request');
    try{const r=await fetch('/api/genie/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,mode:'generate',n:2,product:'badge',shape:'square'})});const j=await r.json();
      if(!r.ok)throw new Error(j&&j.error&&j.error.message||'Genie couldn\'t make a logo right now.');
      $('#geniePicks').innerHTML=j.images.map((im,i)=>`<button type="button" data-i="${i}" aria-label="Use option ${i+1}"><img src="${im.src}" alt="Genie AI Generated Artwork, option ${i+1}"><span>Use option ${i+1}</span></button>`).join('');
      $$('#geniePicks button').forEach(b=>b.addEventListener('click',async()=>{const moved=await setLogo(j.images[+b.dataset.i].src,{genie:true});track('badge_genie_pick');toast('Genie AI Generated Artwork added as your logo.'+(moved?' Layout changed to "Logo, then name and title".':''))}));
      msg.textContent='Pick one to use it. Genie AI Generated Artwork.'}
    catch(e){msg.textContent=e.message}finally{btn.disabled=false;btn.removeAttribute('aria-busy')}})}

/* ---------- Review & Print ---------- */
const dlg=$('#review');let step=1;
function go(n){step=n;$$('.pane',dlg).forEach(p=>p.hidden=+p.dataset.pane!==n);$$('#steps li').forEach(li=>{const s=+li.dataset.s;li.className=s===n?'now':s<n?'done':'';li.toggleAttribute('aria-current',s===n)});
  if(n===2)renderQty();if(n===3)renderPrice();track('review_step',{step:n})}
function openReview(){const p=P(),ppl=people();const all=[];
  const cap=Math.min(ppl.length,120);let html='';for(let i=0;i<cap;i++){const r=badge(p,S,ppl[i],{mode:'proof'});all.push(...r.issues);const bad=r.issues.some(x=>x.field);
    html+=`<figure${bad?' class="bad"':''}>${r.svg}<figcaption>${esc(ppl[i].name||'(no name)')}${ppl[i].title?' · '+esc(ppl[i].title):''}</figcaption></figure>`}
  $('#proofs').innerHTML=html+(ppl.length>cap?`<p class="hint">And ${ppl.length-cap} more badges in the same design.</p>`:'');
  $('#proofLead').textContent=usingList()?`${ppl.length} badges, one per name. Check every name and title.`:'Check the name, title and logo.';
  const iss=dedupe(all);$('#rvChecks').innerHTML=iss.map(i=>`<li class="warn"><svg class="ico" aria-hidden="true"><use href="#i-warn"/></svg><span>${esc(i.msg)}</span></li>`).join('');
  $('#approve').checked=false;$('#approveErr').hidden=true;$('#notes').value=S.notes;go(1);dlg.showModal();track('review_open',{badges:ppl.length})}
function renderQty(){const p=P(),v=variant(p,S),list=usingList(),q=qtyNow();$('#qtyNames').hidden=!list;$('#qtySame').hidden=list;
  if(list)$('#qtyNamesTxt').textContent=`${q} badges, one per name on your list. To order spares, add them to the list.`;else $('#qty').value=q;
  const rows=[{min_qty:1,pct:0},...p.tiers];$('#tiers tbody').innerHTML=rows.map((t,i)=>{const hi=rows[i+1]?rows[i+1].min_qty-1:null,on=q>=t.min_qty&&(hi===null||q<=hi);
    return`<tr${on?' class="on"':''}><td>${t.min_qty}${hi===null?'+':hi===t.min_qty?'':`–${hi}`}</td><td>${money(r2(v.price*(1-t.pct/100)))}</td><td>${t.pct?t.pct+'%':'–'}</td></tr>`}).join('');
  const next=p.tiers.find(t=>t.min_qty>q);$('#tierHint').textContent=next?`Order ${next.min_qty-q} more to pay ${money(r2(v.price*(1-next.pct/100)))} each (${next.pct}% off).`:'You get the best price per badge.'}
function cartData(){const p=P(),v=variant(p,S),q=qtyNow(),u=unitFor(p,v,q),list=parseNames(S.names),m=p.mods,set={};
  const put=(role,val)=>{if(m[role]&&val!==undefined&&val!==null&&val!=='')set[m[role].name]={modifier_id:m[role].id,value:val}};
  put('name',list.length?list[0].name:S.name);put('title',hasT2(S.layout)?(list.length?list[0].title:S.title):'');put('font_1',S.font1);put('font_2',hasT2(S.layout)?S.font2:'');
  put('font_1_size',String(S.fs1));put('font_2_size',String(S.fs2));put('color_1',S.c1||autoInk(look(p,S).color));put('color_2',S.c2||autoInk(look(p,S).color));put('alignment',S.align);
  put('layout',LAYOUTS[S.layout].studio?'(text only: no matching Doogma layout yet)':'layout'+S.layout);put('logo_size',S.logo?String(S.logoScale):'');put('custom_color',S.bg==='Custom Color'?S.custom:'');
  put('background_size',S.bg==='Upload Background'?String(S.bgScale):'');put('special_instructions',S.notes);put('proof_approval','Yes');
  if(list.length)put('bulk_names_file',`(names file to attach: ${list.length} rows)`);put('saved_print_output','(not available yet)');
  const opt=Object.entries({size:S.size==='default'?null:S.size,background_color:S.bg,border_color:S.border,attachment:S.attach}).filter(([k,v2])=>v2&&p.opts[k]).map(([k,v2])=>({option_id:p.opts[k].id,option:p.opts[k].name,value_id:p.opts[k].values[v2],value:v2}));
  return{product_id:p.bc_id,variant_id:v.id,sku:v.sku,quantity:q,unit_price:u.unit,discount_pct:u.pct,options:opt,modifiers:set,images:{logo:!!S.logo,background:S.bg==='Upload Background'&&!!S.bgImg},names:list.length?list:undefined}}
function renderPrice(){const p=P(),v=variant(p,S),q=qtyNow(),u=unitFor(p,v,q),z=sizeOf(p,S),sub=r2(u.unit*q);
  const rows=[['Badge',p.name],['Product code',v.sku||'–'],['Size',z.known?`${fmtIn(z.w)} × ${fmtIn(p.shape==='circle'?z.w:z.h)} in`:z.label],['Layout',LAYOUTS[S.layout].label]];
  if(S.bg)rows.push([$('#bgLegend').textContent,S.bg==='Custom Color'?`Custom color ${S.custom.toUpperCase()}`:S.bg]);if(S.border)rows.push([$('#borderLegend').textContent,S.border]);if(S.attach)rows.push(['Back',S.attach]);
  rows.push(['Logo',S.logo?(S.logoGenie?'Genie AI Generated Artwork':'Your upload'):'None']);rows.push(['Quantity',`${q} badge${q===1?'':'s'}${usingList()?' (one per name)':''}`]);
  rows.push(['Price each',u.pct?`${money(u.unit)} (${u.pct}% off ${money(v.price)})`:money(u.unit)]);
  $('#spec').innerHTML=rows.map(([a,b])=>`<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('');$('#total').textContent=money(sub);$('#addCart').textContent=`Add to cart · ${money(sub)}`;
  const cd=cartData();window.__badgeCart=cd;$('#cartDebug').hidden=!DEBUG;if(DEBUG)$('#cartJson').textContent=JSON.stringify(cd,null,2)}
function rvEvents(){
  $('#rvClose').addEventListener('click',()=>dlg.close());
  dlg.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)go(+b.dataset.go)});
  $('#notes').addEventListener('input',e=>{S.notes=e.target.value;save()});
  $('#approve').addEventListener('change',()=>{if($('#approve').checked)$('#approveErr').hidden=true});
  $('#next1').addEventListener('click',()=>{if(!$('#approve').checked){$('#approveErr').hidden=false;$('#approve').focus();return}go(2)});
  const setQ=v=>{S.qty=Math.max(1,Math.min(5000,v||1));$('#qty').value=S.qty;renderQty();save()};
  $('#qty').addEventListener('input',e=>{const v=parseInt(e.target.value,10);if(v>0)setQ(v)});$('#qMinus').addEventListener('click',()=>setQ(qtyNow()-1));$('#qPlus').addEventListener('click',()=>setQ(qtyNow()+1));
  $('#next2').addEventListener('click',()=>go(3));
  $('#addCart').addEventListener('click',()=>{const p=P(),cd=cartData(),value=r2(cd.unit_price*cd.quantity);
    track('add_to_cart',{ecommerce:{currency:'USD',value,items:[{item_id:cd.sku,item_name:p.name,item_variant:[S.size,S.bg,S.border,S.attach].filter(Boolean).join(' / '),price:cd.unit_price,quantity:cd.quantity}]}});
    if(window.CGSite)window.CGSite.add({name:p.name,detail:(()=>{const z=sizeOf(p,S),n=parseNames(S.names).length;return[`${fmtIn(z.w)} × ${fmtIn(z.h)} in`,S.bg,S.border,S.attach,n>1?n+' names':''].filter(Boolean).join(' · ')})(),qty:cd.quantity,unit:cd.unit_price,total:value,sku:cd.sku,url:'p/'+p.url.split('/').filter(Boolean).pop()+'.html',studio:'basic',bigcommerce:cd});dlg.close();   /* one cart for the whole site (site.js) */
    toast(`Added to cart: ${p.name}, ${cd.quantity} badge${cd.quantity===1?'':'s'}, ${money(value)}.`)})}

/* ---------- start ---------- */
buildStatic();syncPanel();on();rvEvents();themeLabel();render();loadFont(S.font1);loadFont(S.font2);genieInit();
track('badge_view',{product:S.pid});
if(DEBUG)window.__badge={get S(){return S},people,badge:(n)=>badge(P(),S,n||people()[0],{mode:'proof'}),variant:()=>variant(P(),S),cartData,DATA};
