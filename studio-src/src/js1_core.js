/* =====================================================================
   Custom Genie Sticker Studio · engine
   Units: 100 = 1 inch. Elements are positioned by their center (x, y).
   ===================================================================== */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const NS='http://www.w3.org/2000/svg';
const FREE=75,KEY='cg-studio-v3';

/* ---------- products ----------
   Every product Genie Studio Advanced designs: stickers, name badges, pens and notebooks. From the product definitions
   (products/*.json, pulled read-only from BigCommerce), embedded by build.py. Prices, sizes, options, quantity discounts
   and product codes are BigCommerce's own: the studio keeps no price table, so what a shopper sees here is what the cart
   charges. A design (D) carries its product (D.pid) and the shopper's option choices (D.opt, by BigCommerce option role). */
const CATALOG={{PRODUCTS_JSON}};
const PRODS=CATALOG.products;
const URL_PID=new URLSearchParams(location.search).get('product');
let CUR_PID=PRODS[URL_PID]?URL_PID:CATALOG.default,CUR_OPT={};   /* the product new designs start on */
const PROD=()=>PRODS[D.pid]||PRODS[CATALOG.default];
const FAMI=()=>CATALOG.families[PROD().family];
const KIND_NOUN={pen:['pen','pens'],pencil:['pencil','pencils'],notebook:['notebook','notebooks']};
const GROUP_NOUN={labels:['label','labels'],lettering:['decal','decals'],clings:['window cling','window clings']};
const nounPair=()=>{const p=PROD();return p.family==='pen'?KIND_NOUN[p.kind]:GROUP_NOUN[p.group]||[FAMI().one,FAMI().many]};
const NOUN=()=>nounPair()[0],NOUNS=()=>nounPair()[1];
const isFree=()=>PROD().size.mode==='free';
const TURNAROUND_DAYS=5; /* PLACEHOLDER: production days used for the estimated ship date. Confirm with operations. */
/* size limits, quantity breaks and safe margin follow the product (set by applyProduct) */
let MIN=.5,MAX=8.5,MINW=.5,MAXW=8.5,MINH=.5,MAXH=8.5,QTY=[100],DISC=[0],SAFE=8;
const OPT_LABEL={material:'Material',background_color:'Background',border_color:'Border',attachment:'Back',pen_color:'Color',notebook_color:'Notebook color',size:'Size'};
const SIZE_ROLES=['height','width','size'];
const OPT_ORDER=['material','background_color','border_color','attachment','pen_color','notebook_color'];
const optRoles=(p=PROD())=>p.axes.filter(a=>!SIZE_ROLES.includes(a)).sort((a,b)=>(OPT_ORDER.indexOf(a)+99)%99-(OPT_ORDER.indexOf(b)+99)%99);
const presetOf=(p=PROD())=>p.size.presets?(p.size.presets.find(z=>z.id===D.opt.size)||p.size.presets[0]):null;
/* A size between BigCommerce's size steps is priced at the next step up (0.5, 1, 2 ... 8, 8.5 in). */
const bkt=(v,steps)=>{for(const x of steps)if(v<=x+1e-9)return x;return steps[steps.length-1]};
const r2=v=>Math.round(v*100)/100;
function pricedSize(){return D.shape==='custom'&&CT.url&&CT.bbox?{w:CT.bbox.w/100,h:CT.bbox.h/100}:{w:D.w,h:D.h}}
/* the shopper's choice for every BigCommerce option of this product (sizes rounded up to the next step) */
function choice(w,h){const p=PROD(),o={};
 for(const a of p.axes){if(a==='height'||a==='width')continue;const v=a==='size'?(presetOf(p)||{}).id:D.opt[a];o[a]=p.vals[a].includes(v)?v:p.vals[a][0]}
 if(p.size.mode==='free'){const s=w!=null?{w,h}:pricedSize();if(p.axes.includes('height'))o.height=bkt(s.h,p.size.steps.h);if(p.axes.includes('width'))o.width=bkt(s.w,p.size.steps.w)}
 return o}
function variantFor(o,p=PROD()){const row=p.variants.find(v=>p.axes.every((a,i)=>a==='height'||a==='width'?Math.abs(v[4+i]-o[a])<1e-9:v[4+i]===o[a]));
 return row?{id:row[0],sku:row[1],price:row[2],off:!!row[3]}:null}
const variantNow=()=>variantFor(choice());
function basePrice(w,h){const o=choice(w,h),v=variantFor(o);if(!v){console.warn('no BigCommerce variant for',o);return{b:0,exact:false}}return{b:v.price,exact:true,off:v.off}}
function tiers(){const bp=basePrice();return QTY.map((q,i)=>{const p=r2(bp.b*(1-DISC[i]));return{q,p,s:Math.round(DISC[i]*100),t:r2(p*q)}})}
const curTier=()=>tiers()[tier]||tiers()[0];
function skuFor(){return (variantNow()||{}).sku||''} /* the BigCommerce variant SKU */
/* is there an orderable variant for this option value, given the shopper's other choices? */
function optOk(role,val){const o=Object.assign(choice(),{[role]:val}),v=variantFor(o),p=PROD();return !!v&&(!v.off||p.variants.every(x=>x[3]))}   /* a product that can't be ordered at all still lets shoppers preview every option */
/* the finish/material/color choice shoppers see for the product (sticker groups), or the product's own name */
const finishName=()=>PROD().finish||'';
const siblings=(p=PROD())=>p.family==='sticker'?Object.values(PRODS).filter(q=>q.group===p.group&&q.family===p.family):[p];

/* ---------- how the product looks on screen ----------
   face: the surface under the print. frame: badge border (in units). engrave / one: everything prints in one color
   (engraving, or cut from one color of vinyl). metal: white areas print clear so the metal shows. */
const NAMED=c=>{const p=PROD();return (p.colors&&p.colors[c])||null};
function LOOK(){const p=PROD(),o=choice();
 if(p.family==='sticker'){const L=Object.assign({},p.look);if(L.by&&p.looks)Object.assign(L,p.looks[o[L.by]]||{});delete L.by;if(L.one_color){L.one=L.one_color;delete L.one_color}return L}
 if(p.family==='badge'){const k=p.kind,bg=o.background_color||'',bd=o.border_color||'';
  const fw={window:12,metal:9,border:6,edge:2}[k==='window'?'window':p.frame]||0;
  const paint=k==='window'?(bg==='Gold'?'gold':'silver'):!bd?null:bd==='Gold'?'gold':bd==='Silver'?'silver':(NAMED(bd.replace(' Edge',''))||'#111111');
  const L={frame:paint&&fw?{w:fw,paint}:null,bgOpt:bg};
  if(k==='engraved_plastic'){const [a2,b2]=bg.split('-');return Object.assign(L,{face:'color',color:NAMED(a2)||'#111111',engrave:NAMED(b2)||'#FFFFFF'})}
  if(k==='wood')return Object.assign(L,{face:'wood',engrave:p.deco==='engraved'?(p.engrave_colors||{}).wood||'#4A2C17':null});
  if(k==='chalk')return Object.assign(L,{face:'chalk'});
  if(k==='window')return Object.assign(L,{face:'white'});
  if(bg==='Gold')return Object.assign(L,{face:'gold'});
  if(bg==='Silver')return Object.assign(L,{face:'silver'});
  if(bg==='Custom Color')return Object.assign(L,{face:'custom'});
  if(bg==='Upload Background')return Object.assign(L,{face:'upload'});
  return Object.assign(L,{face:'white'})}
 /* pens, pencils, notebooks: the imprint sits on the barrel or cover color */
 const c=p.barrel||NAMED(o.pen_color||o.notebook_color)||'#1A1A1A';
 return {face:'color',color:c,engrave:p.engrave||null,item:p.kind}}
const FACE_FILL={white:'#FFFFFF',matte:'#F4F4F1',silver:'url(#gSilver)',gold:'url(#gGold)',clear:'url(#pClear)',glow:'#E4F4CC',reflective:'url(#gRefl)',kraft:'#C49A6C',grass:'#DCD5BC',wood:'url(#pWood)',chalk:'url(#pChalk)',upload:'#E9ECF1'};
const FACE_BASE={white:'#FFFFFF',matte:'#F4F4F1',silver:'#C0C4CA',gold:'#C9A227',clear:'#FFFFFF',glow:'#E4F4CC',reflective:'#E2E6EA',kraft:'#C49A6C',grass:'#DCD5BC',wood:'#C8925A',chalk:'#2E3A35',upload:'#E9ECF1'};
function faceFill(L){if(L.face==='color')return L.color;if(L.face==='custom')return D.bg.t==='color'?D.bg.c:'#1F4E9C';return FACE_FILL[L.face]||'#FFFFFF'}
function faceBase(L){if(L.one)return null;if(L.face==='color')return L.color;if(L.face==='custom')return D.bg.t==='color'?D.bg.c:'#1F4E9C';return FACE_BASE[L.face]||'#FFFFFF'}
/* the safe margin: the product's own, plus the badge frame */
function safeFor(p=PROD()){const L=LOOK();return Math.round(((p.checks&&p.checks.safe_area_in)||.08)*100)+((L.frame&&L.frame.w)||0)}
/* switch the design to a product: limits, quantity breaks, valid options, and a size the product offers */
function applyProduct(id,keepTier){const p=PRODS[id]||PRODS[CATALOG.default];D.pid=p.id;D.opt=D.opt||{};CUR_PID=p.id;CUR_OPT=D.opt;
 for(const a of p.axes){if(a==='height'||a==='width')continue;if(!p.vals[a].includes(D.opt[a]))D.opt[a]=a==='size'?p.size.presets[0].id:p.vals[a][0]}
 if(p.size.mode==='free'){MINW=p.size.w[0];MAXW=p.size.w[1];MINH=p.size.h[0];MAXH=p.size.h[1]}
 else{const z=presetOf(p);D.opt.size=z.id;MINW=MAXW=z.w;MINH=MAXH=p.shape==='circle'?z.w:z.h}
 MIN=Math.min(MINW,MINH);MAX=Math.max(MAXW,MAXH);
 if(p.shapes&&!p.shapes.includes(D.shape))D.shape=p.shapes[0];
 D.vinyl=p.family==='sticker'&&/silver/i.test(p.look.face)?'silver':p.family==='sticker'&&/gold/i.test(p.look.face)?'gold':'white';
 const t=p.tiers.slice();QTY=[];DISC=[];
 if(p.family==='badge'&&(!t.length||t[0][0]>1)){QTY.push(1);DISC.push(0)}   /* badges can be ordered one at a time */
 t.forEach(([q,pct])=>{QTY.push(q);DISC.push(pct/100)});if(!QTY.length){QTY=[1];DISC=[0]}
 if(!keepTier)tier=0;tier=clamp(tier,0,QTY.length-1);SAFE=safeFor(p)}
/* scale the whole design to a new artboard size (positions follow each side, sizes the smaller change) */
function scaleDoc(nw,nh){const sx=nw/D.w,sy=nh/D.h,k=Math.min(sx,sy);D.els.forEach(e=>{e.x*=sx;e.y*=sy;if(e.type==='text')e.size*=k;else{e.w*=k;if(e.type!=='line')e.h*=k}});D.w=r2(nw);D.h=r2(nh)}
/* make the design fit its product: a shape it offers, its preset size, or a free size inside its limits */
function conform(keepTier=true){const p=PROD();applyProduct(p.id,keepTier);let tw=D.w,th=D.h;
 if(p.size.mode!=='free'){const z=presetOf(p);tw=z.w;th=p.shape==='circle'?z.w:z.h;D.shape=p.shape}
 else{if(D.shape==='square'||D.shape==='circle'){const s2=Math.max(D.w,D.h);tw=th=s2}tw=clamp(tw,MINW,MAXW);th=clamp(th,MINH,MAXH);if(D.shape==='square'||D.shape==='circle'){const s2=clamp(Math.max(tw,th),Math.max(MINW,MINH),Math.min(MAXW,MAXH));tw=th=s2}}
 if(Math.abs(tw-D.w)>1e-6||Math.abs(th-D.h)>1e-6)scaleDoc(tw,th);
 if(LOOK().one)D.bg={t:'none',c:D.bg.c||'#FFFFFF',img:null};SAFE=safeFor(p)}
/* switch to another product of the same family: the design comes along and is refitted */
function switchProduct(id,quiet){const to=PRODS[id];if(!to||id===D.pid)return false;const keep=Object.assign({},D.opt);D.pid=id;D.opt={};
 for(const a of to.axes)if(keep[a]!=null&&to.vals[a].includes(keep[a]))D.opt[a]=keep[a];   /* same option value where the new product has it */
 conform();CT.sig='';if(D.shape!=='custom')CT.url=null;if(!quiet){track('builder_product',{product:id});commit();syncPanels()}return true}
/* change one BigCommerce option (material, background, border, back, color, size) */
function setOpt(role,val){const p=PROD();if(!p.vals[role]||!p.vals[role].includes(val))return;D.opt[role]=val;
 if(role==='size')conform();
 if(p.family==='badge'&&role==='background_color'){if(val==='Custom Color'&&D.bg.t!=='color')D.bg={t:'color',c:'#1F4E9C',img:null}}
 SAFE=safeFor(p);CT.sig='';track('builder_option',{option:role,value:val});commit();syncPanels()}
/* Genie speaks in white / silver / gold: move to that finish when the product's group has it */
const finishProduct=v=>siblings().find(q=>(q.look&&q.look.face)===v&&!(q.look&&q.look.one_color));
const finishAvail=v=>!!finishProduct(v);
const finishKey=()=>{const f=PROD().look&&PROD().look.face;return f==='silver'||f==='gold'?f:'white'};
function setFinishKey(v){const q=finishProduct(v);if(!q)return false;if(q.id!==D.pid)switchProduct(q.id,true);return true}
const DKEY=()=>KEY+(PROD().family==='sticker'?'':':'+PROD().family);   /* drafts are kept per family */
const FONTS=[
 {n:'Libre Baskerville',f:"'Libre Baskerville', Georgia, serif",w:400},
 {n:'Anton',f:"Anton, Impact, sans-serif",w:400},
 {n:'Archivo Black',f:"'Archivo Black', 'Arial Black', sans-serif",w:400},
 {n:'Work Sans',f:"'Work Sans', system-ui, sans-serif",w:500},
 {n:'Dancing Script',f:"'Dancing Script', cursive",w:600},
 {n:'Oswald',f:"Oswald, 'Arial Narrow', sans-serif",w:500},
 {n:'Bebas Neue',f:"'Bebas Neue', Impact, sans-serif",w:400},
 {n:'Lobster',f:"Lobster, cursive",w:400},
 {n:'Roboto Slab',f:"'Roboto Slab', Georgia, serif",w:500},
 {n:'Righteous',f:"Righteous, system-ui, sans-serif",w:400},
 {n:'Poppins',f:"Poppins, system-ui, sans-serif",w:500}];
const SN={rect:'Rectangle',square:'Square',circle:'Circle',oval:'Oval',oval_top:'Oval top',stadium:'Stadium',custom:'Cut to design'};
const VN={white:'Gloss White',silver:'Brushed Silver',gold:'Brushed Gold'};   /* finish names Genie understands (white, silver, gold) */
const TN={text:'Text',image:'Image',shape:'Shape',rect:'Rectangle',ellipse:'Ellipse',line:'Line',path:'Drawing'};
const TI={text:'t-text',image:'t-image',shape:'t-shapes',rect:'t-rect',ellipse:'t-ellipse',line:'t-line',path:'t-path'};
const PALETTE=['#FFFFFF','#111827','#0F1B3D','#5A3BD6','#D21F4B','#F2364C','#21C8E2','#FFD569','#F97316','#15803D','#1E3A8A','#6B4226','#EC4899','#C9A227','#6B7280','#F5EBDD'];
function burst(n,ro,ri){let d='';for(let i=0;i<n*2;i++){const r=i%2?ri:ro,a=i*Math.PI/n-Math.PI/2;d+=(i?'L':'M')+(50+r*Math.cos(a)).toFixed(2)+' '+(50+r*Math.sin(a)).toFixed(2)}return d+'Z'}
const GFX={
 circle:{n:'Circle',d:'M50 2a48 48 0 1 1 0 96a48 48 0 1 1 0-96z'},
 square:{n:'Rounded square',d:'M16 2h68a14 14 0 0 1 14 14v68a14 14 0 0 1-14 14H16A14 14 0 0 1 2 84V16A14 14 0 0 1 16 2z'},
 star:{n:'Star',d:'M50 3l14.1 29.6 32.5 4-24 22.3 6.3 32.1L50 75.2 21.1 91l6.3-32.1-24-22.3 32.5-4z'},
 heart:{n:'Heart',d:'M50 90C20 68 4 52 4 31C4 16 15 6 28 6c10 0 18 6 22 14C54 12 62 6 72 6c13 0 24 10 24 25 0 21-16 37-46 59z'},
 burst:{n:'Burst',d:burst(14,49,40)},
 banner:{n:'Banner',d:'M2 28h96l-12 22 12 22H2l12-22z'},
 bolt:{n:'Lightning',d:'M60 2L12 58h32l-8 40 52-60H56z'},
 tri:{n:'Triangle',d:'M50 5l47 86H3z'},
 cup:{n:'Coffee cup',d:'M12 22h60v30a26 26 0 0 1-26 26h-8a26 26 0 0 1-26-26z M72 30h6a14 14 0 0 1 0 28h-8v-9h8a5 5 0 0 0 0-10h-6z M8 84h72v8H8z'},
 mountain:{n:'Mountain',d:'M2 88L34 28l17 28 12-18 35 50z'},
 leaf:{n:'Leaf',d:'M88 10C36 10 10 40 12 88C62 90 90 60 88 10z'},
 crown:{n:'Crown',d:'M8 76L4 24l26 24 20-34 20 34 26-24-4 52z M8 82h84v10H8z'},
 drop:{n:'Drop',d:'M50 4C50 4 16 46 16 64a34 34 0 0 0 68 0C84 46 50 4 50 4z'},
 paw:{n:'Paw',d:[[50,68,24,20],[20,42,10,13],[40,22,10,13],[60,22,10,13],[80,42,10,13]].map(([x,y,a,b])=>`M${x-a} ${y}a${a} ${b} 0 1 0 ${2*a} 0a${a} ${b} 0 1 0 ${-2*a} 0z`).join('')},
 sun:{n:'Sun',d:'M26 50a24 24 0 1 0 48 0a24 24 0 1 0-48 0z'+Array.from({length:12},(_,i)=>{const a=i*Math.PI/6,p=(r,o)=>(50+r*Math.cos(a+o)).toFixed(1)+' '+(50+r*Math.sin(a+o)).toFixed(1);return 'M'+p(31,-.16)+'L'+p(48,0)+'L'+p(31,.16)+'z'}).join('')},
 pin:{n:'Location pin',d:'M50 2a34 34 0 0 1 34 34c0 26-34 62-34 62S16 62 16 36A34 34 0 0 1 50 2zm0 20a14 14 0 1 0 0 28a14 14 0 0 0 0-28z'},
 ring:{n:'Ring',d:'M50 2a48 48 0 1 1 0 96a48 48 0 1 1 0-96zm0 10a38 38 0 1 0 0 76a38 38 0 1 0 0-76z'},
 arrow:{n:'Arrow',d:'M4 38h56V18l36 32-36 32V62H4z'},
 badge:{n:'Shield',d:'M50 2l42 14v28c0 28-18 46-42 54C26 90 8 72 8 44V16z'},
 cloud:{n:'Cloud',d:'M26 82a22 22 0 0 1-3-43.8A28 28 0 0 1 77 34a20 20 0 0 1-1 48z'}};

/* ---------- helpers ---------- */
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const fmt=v=>String(Math.round(v*100)/100);
const f2=v=>(Math.round(v*100)/100).toFixed(2).replace(/\.?0+$/,'');
const money=v=>'$'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* number fields accept plain numbers, a trailing unit, or simple math like 1.5*2 (Figma-style) */
const num=s=>{let t=String(s).trim().replace(/,/g,'.').replace(/\s*(in|inch|inches|"|pt|°|deg|%)\s*$/i,'');if(!t)return NaN;
 if(/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t))return parseFloat(t);
 if(/^[\d.+\-*/()\s]+$/.test(t)){try{const v=Function('"use strict";return ('+t+')')();return Number.isFinite(v)?v:NaN}catch(e){return NaN}}return NaN};
window.dataLayer=window.dataLayer||[];
const track=(event,p)=>{try{window.dataLayer.push(Object.assign({event},p||{}))}catch(e){}};
let uid=1;const nid=()=>'e'+Date.now().toString(36)+(uid++);
function mk(t,a){const e=document.createElementNS(NS,t);if(a)for(const k in a)e.setAttribute(k,a[k]);return e}
function setA(e,a){for(const k in a)e.setAttribute(k,a[k])}
function show(e,on){e.style.display=on?'':'none'}
function lum(hex){if(!/^#[0-9a-f]{6}$/i.test(hex||''))return 1;const n=parseInt(hex.slice(1),16);return [n>>16&255,n>>8&255,n&255].map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0)}
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const hex2=v=>v.toString(16).padStart(2,'0');
const normHex=s=>{let t=String(s||'').trim().replace(/^#/,'');if(/^[0-9a-f]{3}$/i.test(t))t=t.split('').map(c=>c+c).join('');return /^[0-9a-f]{6}$/i.test(t)?'#'+t.toUpperCase():null};

/* ---------- element factories ---------- */
const base=(type,o)=>Object.assign({id:nid(),type,name:null,x:0,y:0,w:60,h:60,rot:0,opacity:1,hidden:false,locked:false,flipX:false,flipY:false,gid:null},o);
function T(o){return base('text',Object.assign({text:'Text',font:3,size:24,fill:'#111827',bold:false,ital:false,align:'center',spacing:0,lineH:1.15,curve:0,stroke:'none',sw:0},o))}
function S(o){return base('shape',Object.assign({kind:'circle',fill:'#21C8E2'},o))}
function R(o){return base('rect',Object.assign({fill:'#21C8E2',stroke:'none',sw:2,radius:0},o))}
function E(o){return base('ellipse',Object.assign({fill:'#21C8E2',stroke:'none',sw:2},o))}
function L(o){return base('line',Object.assign({w:100,h:0,stroke:'#111827',sw:3},o))}
function P(o){return base('path',Object.assign({pts:[],stroke:'#111827',sw:3,fill:'none'},o))}
function newDoc(){return{pid:CUR_PID,opt:Object.assign({},CUR_OPT),shape:'rect',rounded:true,w:3,h:2,vinyl:'white',bg:{t:'none',c:'#FFFFFF',img:null},gap:12,els:[]}}
const TPL=[
 {id:'badge',n:'Round badge',make:()=>Object.assign(newDoc(),{shape:'circle',w:2,h:2,bg:{t:'color',c:'#0F1B3D',img:null},els:[
   T({text:'YOUR BRAND',font:2,size:21,fill:'#FFFFFF',curve:58,spacing:8,x:100,y:50}),
   S({kind:'star',w:64,h:64,fill:'#FFD569',x:100,y:104}),
   T({text:'Tagline',font:3,size:15,fill:'#FFFFFF',bold:true,x:100,y:156})]})},
 {id:'plate',n:'Name plate',make:()=>Object.assign(newDoc(),{shape:'rect',w:3,h:1,els:[
   T({text:'Your Company',font:2,size:27,fill:'#111827',x:150,y:38}),
   L({w:150,sw:2.5,stroke:'#D21F4B',x:150,y:58}),
   T({text:'TAGLINE GOES HERE',font:3,size:11,fill:'#5F6875',spacing:18,bold:true,x:150,y:74})]})},
 {id:'label',n:'Product label',make:()=>Object.assign(newDoc(),{shape:'stadium',w:3,h:1.5,bg:{t:'color',c:'#F2364C',img:null},els:[
   T({text:'Your Brand',font:7,size:40,fill:'#FFFFFF',x:150,y:64}),
   T({text:'TAGLINE',font:3,size:13,fill:'#FFFFFF',bold:true,spacing:22,x:150,y:107})]})},
 {id:'seal',n:'Oval seal',make:()=>Object.assign(newDoc(),{shape:'oval',w:3,h:2,bg:{t:'color',c:'#1E3A8A',img:null},els:[
   S({kind:'burst',w:58,h:58,fill:'#FFD569',x:150,y:62}),
   T({text:'Your Brand',font:8,size:30,fill:'#FFFFFF',x:150,y:122}),
   T({text:'Tagline',font:3,size:13,fill:'#FFFFFF',x:150,y:152})]})},
 {id:'ring',n:'Retro ring',make:()=>Object.assign(newDoc(),{shape:'circle',w:2.5,h:2.5,bg:{t:'color',c:'#F5EBDD',img:null},els:[
   E({w:220,h:220,fill:'none',stroke:'#4A2C1D',sw:5,x:125,y:125}),
   T({text:'EST. 2026',font:3,size:15,fill:'#4A2C1D',bold:true,spacing:20,curve:46,x:125,y:52}),
   T({text:'Your\nBrand',font:0,size:38,fill:'#4A2C1D',lineH:1.05,x:125,y:128}),
   T({text:'· HANDMADE ·',font:3,size:12,fill:'#4A2C1D',bold:true,spacing:16,x:125,y:196})]})},
 {id:'sale',n:'Cut-out burst',make:()=>Object.assign(newDoc(),{shape:'custom',w:2.5,h:2.5,gap:12,els:[
   S({kind:'burst',w:225,h:225,fill:'#D21F4B',x:125,y:125}),
   T({text:'SALE',font:1,size:78,fill:'#FFFFFF',x:125,y:112,stroke:'none'}),
   T({text:'TODAY ONLY',font:3,size:14,fill:'#FFD569',bold:true,spacing:14,x:125,y:160})]})}];

/* badge and pen templates are built on the product's own size, so they fit whatever is selected */
function itemDoc(els){const p=PROD(),z=presetOf(p)||{w:3,h:1},w=z.w,h=p.shape==='circle'?z.w:z.h;return Object.assign(newDoc(),{shape:p.shape,w,h,els:els(w*100,h*100)})}
const BADGE_TPL=[
 {id:'b-name',n:'Name and title',make:()=>itemDoc((w,h)=>[T({text:'Alex Morgan',font:3,bold:true,size:Math.min(h*.3,w*.11),fill:'#111827',x:w/2,y:h*.42}),T({text:'Store Manager',font:3,size:Math.min(h*.17,w*.065),fill:'#374151',x:w/2,y:h*.7})])},
 {id:'b-logo-left',n:'Logo left',make:()=>itemDoc((w,h)=>[S({kind:'badge',w:h*.56,h:h*.56,fill:'#21C8E2',x:w*.19,y:h/2}),T({text:'Alex Morgan',font:3,bold:true,size:Math.min(h*.26,w*.085),fill:'#111827',x:w*.6,y:h*.42}),T({text:'Store Manager',font:3,size:Math.min(h*.15,w*.05),fill:'#374151',x:w*.6,y:h*.68})])},
 {id:'b-logo-top',n:'Logo on top',make:()=>itemDoc((w,h)=>[S({kind:'star',w:h*.3,h:h*.3,fill:'#D21F4B',x:w/2,y:h*.27}),T({text:'Alex Morgan',font:3,bold:true,size:Math.min(h*.22,w*.09),fill:'#111827',x:w/2,y:h*.58}),T({text:'Store Manager',font:3,size:Math.min(h*.13,w*.055),fill:'#374151',x:w/2,y:h*.78})])},
 {id:'b-big',n:'Big name',make:()=>itemDoc((w,h)=>[T({text:'Alex',font:1,size:Math.min(h*.5,w*.2),fill:'#111827',x:w/2,y:h/2})])}];
const PEN_TPL=[
 {id:'p-name',n:'Name',make:()=>itemDoc((w,h)=>[T({text:'YOUR COMPANY',font:3,bold:true,size:h*.5,spacing:6,fill:'#FFFFFF',x:w/2,y:h/2})])},
 {id:'p-logo',n:'Logo and name',make:()=>itemDoc((w,h)=>[S({kind:'circle',w:h*.7,h:h*.7,fill:'#FFFFFF',x:h*.55,y:h/2}),T({text:'Your Company',font:3,bold:true,size:h*.46,fill:'#FFFFFF',x:w*.56,y:h/2})])},
 {id:'p-two',n:'Two lines',make:()=>itemDoc((w,h)=>[T({text:'Your Company',font:3,bold:true,size:h*.36,fill:'#FFFFFF',x:w/2,y:h*.34}),T({text:'yourcompany.com',font:3,size:h*.26,fill:'#FFFFFF',x:w/2,y:h*.72})])}];
const NOTEBOOK_TPL=[
 {id:'n-logo',n:'Logo and name',make:()=>itemDoc((w,h)=>[S({kind:'badge',w:w*.36,h:w*.36,fill:'#FFFFFF',x:w/2,y:h*.4}),T({text:'Your Company',font:3,bold:true,size:w*.1,fill:'#FFFFFF',x:w/2,y:h*.8})])},
 {id:'n-big',n:'Big name',make:()=>itemDoc((w,h)=>[T({text:'Your\nCompany',font:2,size:w*.14,lineH:1.05,fill:'#FFFFFF',x:w/2,y:h/2})])}];
/* light ink on dark items, dark ink on light ones */
function inkTpl(t){return{id:t.id,n:t.n,make:()=>{const d=t.make(),save=D;D=d;const c=inkFor();D=save;d.els.forEach(e=>{if(e.fill==='#FFFFFF'||e.fill==='#111827')e.fill=c;if(e.fill==='#374151')e.fill=c==='#FFFFFF'?'#E5E7EB':'#374151'});return d}}}
const TPLS=()=>{const p=PROD();return p.family==='sticker'?TPL:(p.family==='badge'?BADGE_TPL:p.kind==='notebook'?NOTEBOOK_TPL:PEN_TPL).map(inkTpl)};

/* ---------- state ---------- */
let D=newDoc(),tier=0,sel=[],hover=null,tool='move',spaceDown=false,view='edit',zoom=1,cam=null,op=null,editing=null,K=1,guides=[],gfocus=null,clip=null,styleClip=null,started=false,cart=0,showRulers=true,replTarget=null,startDismissed=false;
const IM={},MEAS={},nodes=new Map(),CT={url:null,bbox:null,sig:'',timer:0};
let hist=[],fut=[],last='';
applyProduct(D.pid);conform();
const svg=$('#cv'),vp=$('#vp'),elsG=$('#elsG'),selG=$('#selG'),guideG=$('#guideG'),draftG=$('#draftG'),ft=$('#ft'),inl=$('#inl'),pillEl=$('#sizePill'),studio=$('#studio');
const NARROW=matchMedia('(max-width:820px)'),MID=matchMedia('(max-width:1099px)'),COARSE=matchMedia('(pointer:coarse)'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
/* Only Design is editable; 3D, Print proof and On sheet are previews of the finished sticker */
const editable=()=>view==='edit';
const W=()=>D.w*100,H=()=>D.h*100;
const get=id=>D.els.find(e=>e.id===id);
const selEls=()=>sel.map(get).filter(Boolean);
const one=()=>sel.length===1?get(sel[0]):null;
const hasStroke=e=>!!(e.stroke&&e.stroke!=='none'&&e.sw>0);
const hasFill=e=>!!(e.fill&&e.fill!=='none');

/* ---------- geometry ---------- */
function rr(x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));if(!r)return `M${x} ${y}H${x+w}V${y+h}H${x}Z`;
 return `M${x+r} ${y}H${x+w-r}A${r} ${r} 0 0 1 ${x+w} ${y+r}V${y+h-r}A${r} ${r} 0 0 1 ${x+w-r} ${y+h}H${x+r}A${r} ${r} 0 0 1 ${x} ${y+h-r}V${y+r}A${r} ${r} 0 0 1 ${x+r} ${y}Z`}
function shapeD(doc,inset){const w=doc.w*100,h=doc.h*100,x=inset,y=inset,ww=w-2*inset,hh=h-2*inset;if(ww<=0||hh<=0)return '';
 const pr=PRODS[doc.pid];if(pr&&pr.family==='badge'){const r=Math.max(Math.min(10,h*.14)-inset,0);
  if(doc.shape==='oval_top'){const a=Math.max(h*.28-inset*.6,1);return `M${x} ${y+a}A${ww/2} ${a} 0 0 1 ${x+ww} ${y+a}V${y+hh-r}${r?`A${r} ${r} 0 0 1 ${x+ww-r} ${y+hh}`:''}H${x+r}${r?`A${r} ${r} 0 0 1 ${x} ${y+hh-r}`:''}Z`}
  if(doc.shape==='rect')return rr(x,y,ww,hh,r)}
 if(pr&&pr.family==='pen')return rr(x,y,ww,hh,Math.max(3-inset,0));
 if(doc.shape==='circle'||doc.shape==='oval'){const rx=ww/2,ry=hh/2;return `M${x} ${y+ry}A${rx} ${ry} 0 1 1 ${x+ww} ${y+ry}A${rx} ${ry} 0 1 1 ${x} ${y+ry}Z`}
 if(doc.shape==='stadium')return rr(x,y,ww,hh,Math.min(ww,hh)/2);
 if(doc.shape==='custom')return rr(x,y,ww,hh,Math.max(12-inset,0));
 return rr(x,y,ww,hh,Math.max((doc.rounded?12:4)-inset,0))}
function sz(e){if(e.type==='text'){const m=MEAS[e.id];return m||{w:e.size*3,h:e.size*1.2}}if(e.type==='line')return{w:e.w,h:Math.max(e.sw,1)};return{w:e.w,h:e.h}}
function pt(e,lx,ly){const a=(e.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return{x:e.x+lx*c-ly*s,y:e.y+lx*s+ly*c}}
function corners(e){const {w,h}=sz(e);return [[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([a,b])=>pt(e,a,b))}
function bbox(e){const c=corners(e);return{x0:Math.min(...c.map(p=>p.x)),y0:Math.min(...c.map(p=>p.y)),x1:Math.max(...c.map(p=>p.x)),y1:Math.max(...c.map(p=>p.y))}}
function unionBox(els){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const e of els){const b=bbox(e);x0=Math.min(x0,b.x0);y0=Math.min(y0,b.y0);x1=Math.max(x1,b.x1);y1=Math.max(y1,b.y1)}return{x0,y0,x1,y1,w:x1-x0,h:y1-y0,cx:(x0+x1)/2,cy:(y0+y1)/2}}
function outsideSafe(e){if(D.shape==='custom'||e.hidden)return false;const {w,h}=sz(e),Wd=W(),Hd=H();let cs=corners(e);
 if(e.type==='text'&&e.curve&&!String(e.text).includes('\n'))cs=e.curve>0?[pt(e,0,-h/2),pt(e,-w/2,h/2),pt(e,w/2,h/2)]:[pt(e,0,h/2),pt(e,-w/2,-h/2),pt(e,w/2,-h/2)];
 else if((e.type==='shape'&&(e.kind==='circle'||e.kind==='burst'||e.kind==='sun'||e.kind==='ring'))||e.type==='ellipse'||(e.type==='image'&&IM[e.key]&&IM[e.key].round))cs=Array.from({length:16},(_,i)=>{const a=i*Math.PI/8;return pt(e,w/2*.98*Math.cos(a),h/2*.98*Math.sin(a))});
 if(D.shape==='circle'||D.shape==='oval'){const rx=Wd/2-SAFE,ry=Hd/2-SAFE;return cs.some(p=>((p.x-Wd/2)/rx)**2+((p.y-Hd/2)/ry)**2>1.001)}
 if(D.shape==='oval_top'){const top=Hd*.28*.6+SAFE;return cs.some(p=>p.x<SAFE-.5||p.y<top-.5||p.x>Wd-SAFE+.5||p.y>Hd-SAFE+.5)}
 return cs.some(p=>p.x<SAFE-.5||p.y<SAFE-.5||p.x>Wd-SAFE+.5||p.y>Hd-SAFE+.5)}
const ptSize=e=>Math.round(e.size*.72*10)/10;
function dpi(e){const m=IM[e.key];if(!m)return 0;if(m.vector)return 9999;return Math.round(m.natW/(e.w/100))}
function label(e){if(!e)return '';if(e.name)return e.name;if(e.type==='text'){const t=String(e.text).split('\n')[0].trim()||'Text';return t.length>26?t.slice(0,25)+'…':t}if(e.type==='image')return IM[e.key]?IM[e.key].name:'Image';if(e.type==='shape')return GFX[e.kind].n;return TN[e.type]}
const inkFor=()=>{const L=LOOK();if(L.one)return L.one;if(L.engrave)return L.engrave;const b=D.bg.t==='color'?D.bg.c:faceBase(L);return b&&lum(b)<.3||L.metal_clear&&D.bg.t==='none'?'#FFFFFF':'#111827'};
const groupOf=gid=>D.els.filter(e=>e.gid===gid);
/* clicking an item selects its whole group, unless you've double-clicked into that group */
const expand=id=>{const e=get(id);if(!e)return[];if(e.gid&&gfocus!==e.gid)return groupOf(e.gid).map(x=>x.id);return[id]};

/* ---------- element rendering ---------- */
function elTransform(e){return `translate(${e.x} ${e.y}) rotate(${e.rot||0})`+(e.flipX||e.flipY?` scale(${e.flipX?-1:1} ${e.flipY?-1:1})`:'')}
function syncEls(){
 const ids=new Set(D.els.map(e=>e.id));
 for(const [id,n] of nodes)if(!ids.has(id)){n.remove();nodes.delete(id);delete MEAS[id]}
 let reorder=elsG.children.length!==D.els.length;
 D.els.forEach((e,i)=>{let g=nodes.get(e.id);if(!g||g.dataset.type!==e.type){if(g)g.remove();g=mk('g',{class:'el'});g.dataset.type=e.type;g.appendChild(mk('g'));nodes.set(e.id,g);elsG.appendChild(g);reorder=true}
  if(!reorder&&elsG.children[i]!==g)reorder=true;
  g.setAttribute('transform',elTransform(e));
  if((e.opacity??1)<1)g.setAttribute('opacity',e.opacity);else g.removeAttribute('opacity');
  g.style.display=e.hidden?'none':'';
  g.classList.toggle('editing',editing===e.id);drawEl(e,g.firstChild)});
 if(reorder)D.els.forEach(e=>elsG.appendChild(nodes.get(e.id)));
 D.els.forEach(e=>{if(e.type==='text'&&!e.hidden){const inner=nodes.get(e.id).firstChild;if(inner.dataset.m!=='1')measure(e,inner)}})}
function imgURL(e){const m=IM[e.key];if(!m)return '';return e.clear&&m.clear?m.clear:m.url}
function paint(e){const a={fill:hasFill(e)?e.fill:'none'};if(hasStroke(e)){a.stroke=e.stroke;a['stroke-width']=e.sw}else a.stroke='none';return a}
function only(inner,tag){let n=inner.firstChild;if(!n||n.tagName!==tag||inner.childNodes.length>1){inner.textContent='';n=mk(tag);inner.appendChild(n)}return n}
const f1=v=>Math.round(v*100)/100;
function pathD(e){const p=(e.pts||[]).map(q=>[(q[0]-.5)*e.w,(q[1]-.5)*e.h]);if(!p.length)return '';if(p.length<3)return `M${f1(p[0][0])} ${f1(p[0][1])}L${f1(p[p.length-1][0]+.01)} ${f1(p[p.length-1][1])}`;
 let d=`M${f1(p[0][0])} ${f1(p[0][1])}`;for(let i=1;i<p.length-1;i++){const mx=(p[i][0]+p[i+1][0])/2,my=(p[i][1]+p[i+1][1])/2;d+=`Q${f1(p[i][0])} ${f1(p[i][1])} ${f1(mx)} ${f1(my)}`}const l=p[p.length-1];return d+`L${f1(l[0])} ${f1(l[1])}`}
function drawEl(e,inner){const t=e.type;
 if(t==='image'){const im=only(inner,'image');im.setAttribute('preserveAspectRatio','none');const u=imgURL(e);if(im.getAttribute('href')!==u)im.setAttribute('href',u);setA(im,{x:-e.w/2,y:-e.h/2,width:e.w,height:e.h});return}
 if(t==='shape'){const p=only(inner,'path');setA(p,{'fill-rule':'evenodd',d:GFX[e.kind].d,fill:hasFill(e)?e.fill:'none',transform:`translate(${-e.w/2} ${-e.h/2}) scale(${e.w/100} ${e.h/100})`});return}
 if(t==='rect'){const r=only(inner,'rect');setA(r,Object.assign({x:-e.w/2,y:-e.h/2,width:Math.max(e.w,.1),height:Math.max(e.h,.1),rx:Math.min(e.radius||0,e.w/2,e.h/2)},paint(e)));return}
 if(t==='ellipse'){const r=only(inner,'ellipse');setA(r,Object.assign({cx:0,cy:0,rx:Math.max(e.w/2,.05),ry:Math.max(e.h/2,.05)},paint(e)));return}
 if(t==='line'){const l=only(inner,'line');setA(l,{x1:-e.w/2,y1:0,x2:e.w/2,y2:0,stroke:e.stroke&&e.stroke!=='none'?e.stroke:'#111827','stroke-width':Math.max(e.sw,.5),'stroke-linecap':'round'});return}
 if(t==='path'){const p=only(inner,'path');setA(p,Object.assign({d:pathD(e),'stroke-linecap':'round','stroke-linejoin':'round'},paint(e)));return}
 const f=FONTS[e.font]||FONTS[3],lines=String(e.text||' ').split('\n'),curve=lines.length===1?(e.curve||0):0;
 const sig=JSON.stringify([e.text,e.font,e.size,e.bold,e.ital,e.align,e.spacing,curve,e.fill,e.stroke,e.sw,e.lineH]);
 if(inner.dataset.sig===sig)return;
 inner.dataset.sig=sig;inner.dataset.m='0';inner.textContent='';inner.removeAttribute('transform');
 const at={'font-family':f.f,'font-size':e.size,'font-weight':e.bold?700:f.w,'font-style':e.ital?'italic':'normal',fill:hasFill(e)?e.fill:'none','letter-spacing':(e.spacing||0)/100*e.size};
 if(hasStroke(e))Object.assign(at,{stroke:e.stroke,'stroke-width':e.sw,'paint-order':'stroke','stroke-linejoin':'round'});
 if(!curve){const tx=mk('text',Object.assign({},at,{'text-anchor':{left:'start',center:'middle',right:'end'}[e.align||'center']}));
  lines.forEach((ln,i)=>{const s=mk('tspan',{x:0,dy:i?e.size*(e.lineH||1.15):0});s.textContent=ln||' ';tx.appendChild(s)});inner.appendChild(tx)}
 else{const m=mk('text',at);m.textContent=lines[0];inner.appendChild(m);let Lw=0;try{Lw=m.getComputedTextLength()}catch(err){}m.remove();Lw=Math.max(Lw,e.size);
  const c=Math.abs(curve)/100,th=Math.max(.02,c*Math.PI),Rr=Lw/th,half=Math.min(th/2+.12,Math.PI*.95),sx=-Rr*Math.sin(half),ex=Rr*Math.sin(half),big=half>Math.PI/2?1:0,id='arc-'+e.id;
  const d=curve>0?`M${sx} ${Rr-Rr*Math.cos(half)}A${Rr} ${Rr} 0 ${big} 1 ${ex} ${Rr-Rr*Math.cos(half)}`:`M${sx} ${-Rr+Rr*Math.cos(half)}A${Rr} ${Rr} 0 ${big} 0 ${ex} ${-Rr+Rr*Math.cos(half)}`;
  inner.appendChild(mk('path',{id,d,fill:'none'}));const tx=mk('text',Object.assign({},at,{'text-anchor':'middle'}));const tp=mk('textPath',{href:'#'+id,startOffset:'50%'});tp.textContent=lines[0];tx.appendChild(tp);inner.appendChild(tx)}}
function measure(e,inner){const t=inner.querySelector('text');if(!t)return;let b;try{b=t.getBBox()}catch(err){return}if(!b.width&&!b.height)return;
 inner.setAttribute('transform',`translate(${-(b.x+b.width/2)} ${-(b.y+b.height/2)})`);MEAS[e.id]={w:Math.max(b.width,2),h:Math.max(b.height,2)};inner.dataset.m='1'}
function invalidateText(){nodes.forEach(g=>{if(g.firstChild)delete g.firstChild.dataset.sig});CT.sig='';req()}

/* ---------- artboard (sticker, vinyl, dome, cut line) ---------- */
function artboard(){
 const w=W(),h=H(),m=Math.min(w,h),con=D.shape==='custom'&&!!CT.url,d=shapeD(D,0),dome=view!=='edit',p=PROD(),L=LOOK();
 svg.dataset.dome=L.dome?'1':'0';svg.dataset.family=p.family;
 $('#maskPath').setAttribute('d',con?'':d);
 const mi=$('#maskImg');if(con){setA(mi,{href:CT.url,x:0,y:0,width:w,height:h});show(mi,1)}else show(mi,0);
 setA($('#subRect'),{x:0,y:0,width:w,height:h,fill:faceFill(L)});
 const br=$('#brushRect');setA(br,{x:0,y:0,width:w,height:h});show(br,L.face==='silver'||L.face==='gold');
 const bgR=$('#bgRect'),bgI=$('#bgImg'),useBg=p.family==='sticker'?!L.one:L.face==='custom'||L.face==='upload';
 if(useBg&&D.bg.t==='color'&&L.face!=='custom'){setA(bgR,{x:0,y:0,width:w,height:h,fill:D.bg.c});show(bgR,1)}else show(bgR,0);
 if(useBg&&D.bg.t==='img'&&IM[D.bg.img]){setA(bgI,{href:IM[D.bg.img].url,x:0,y:0,width:w,height:h});show(bgI,1)}else show(bgI,0);
 /* one-color products: engraving, or cut from one color of vinyl. Metal: white areas print clear */
 const pg=$('#printG'),hexA=c=>{const n=parseInt(c.slice(1),16);return [n>>16&255,n>>8&255,n&255].map(v=>(v/255).toFixed(3))};
 if(L.engrave){const [r,g,b]=hexA(L.engrave);$('#fEngM').setAttribute('values',`0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} -.333 -.333 -.333 1 0`);setA($('#fEngrave'),{x:-w,y:-h,width:3*w,height:3*h});pg.setAttribute('filter','url(#fEngrave)')}
 else if(L.one){const [r,g,b]=hexA(L.one);$('#fOneM').setAttribute('values',`0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 1 0`);setA($('#fOne'),{x:-w,y:-h,width:3*w,height:3*h});pg.setAttribute('filter','url(#fOne)')}
 else if(L.metal_clear){setA($('#fClear'),{x:-w,y:-h,width:3*w,height:3*h});pg.setAttribute('filter','url(#fClear)')}else pg.removeAttribute('filter');
 /* badge frame (border, metal or window frame) */
 const fr=$('#frameP');if(L.frame){const pt2=L.frame.paint,fill=pt2==='gold'?'url(#gGold)':pt2==='silver'?'url(#gSilver)':pt2;setA(fr,{d,stroke:fill,'stroke-width':L.frame.w*2});show(fr,1)}else show(fr,0)
 setA($('#glossR'),{x:0,y:0,width:w,height:h});setA($('#specR'),{x:0,y:0,width:w,height:h});
 const rim=$('#rimP');if(con)show(rim,0);else{show(rim,1);setA(rim,{d,'stroke-width':m*.07,'stroke-opacity':.3});$('#rimBlur').setAttribute('stdDeviation',m*.02)}
 const off=dome?m*.035:m*.012,blur=dome?m*.04:m*.022,opa=dome?.3:.14,sp=$('#shadowP'),si=$('#shadowImg');
 show(sp,0);show(si,0);   /* no soft shadow or halo: the sticker is always a clean die-cut edge */
 $('#shBlur').setAttribute('stdDeviation',blur);$('#shBlur2').setAttribute('stdDeviation',blur);
 /* pens and notebooks: draw the item around the imprint area, so shoppers see where the imprint sits */
 ctxUI2(p,L,w,h);
 const cut=$('#cutP'),ci=$('#cutImg'),safe=$('#safeP');cut.classList.toggle('imprint',p.family==='pen');
 if(con){show(cut,0);show(safe,0);setA(ci,{href:CT.url,x:0,y:0,width:w,height:h});$('#edgeR').setAttribute('radius',1.4*K);show(ci,1)}
 else{show(ci,0);show(cut,1);show(safe,D.shape!=='custom');setA(cut,{d,'stroke-width':1.5*K,'stroke-dasharray':p.family==='pen'?`${6*K} ${4*K}`:'none'});setA(safe,{d:shapeD(D,SAFE),'stroke-width':K,'stroke-dasharray':`${5*K} ${4*K}`})}
 const sx=w/2-462.5,sy=h/2-500;setA($('#sheetRect'),{x:sx,y:sy,width:925,height:1000});setA($('#paRect'),{x:sx+22,y:sy+68,width:881,height:864});
 const cap=$('#sheetCap');setA(cap,{x:sx,y:sy+1042,'font-size':22});cap.textContent='Actual scale on the 9.25 x 10 in sheet. Dashed line: printable area.'}
/* the pen barrel / pencil / notebook cover drawn around the imprint area (true scale, 100 units = 1 in) */
let CTXSIG='';
function ctxUI2(p,L,w,h){const g=$('#ctxG'),sig=JSON.stringify([p.id,L.color,w,h]);if(sig===CTXSIG)return;CTXSIG=sig;g.innerHTML=p.family==='pen'?ctxMarkup(p,L,w,h).svg:''}
/* returns the item's SVG and its bounds, in design units */
function ctxMarkup(p,L,w,h){const c=L.color,dark=lum(c)<.35,edge=dark?'#000':'#6B7280',hi='#FFFFFF';
 if(p.kind==='notebook'){const cw=550,ch=850,x=w/2-cw/2,y=h/2-ch/2;   /* A5-ish cover, imprint centred (placeholder position) */
  return{box:[x-4,y-4,cw+22,ch+20],svg:`<rect x="${x+10}" y="${y+8}" width="${cw}" height="${ch}" rx="18" fill="#F4EFE4" stroke="#D6CCB9" stroke-width="2"/><rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="18" fill="${c}" stroke="${edge}" stroke-opacity=".25" stroke-width="2"/><rect x="${x+cw-40}" y="${y}" width="16" height="${ch}" fill="#000" opacity=".18"/>`}}
 const pencil=p.kind==='pencil',dia=pencil?30:42,len=pencil?740:560,x0=w/2-len*.42,y0=h/2-dia/2,metal='#C9CED4';
 const tip=pencil?`<path d="M${x0} ${y0}L${x0-70} ${h/2}L${x0} ${y0+dia}Z" fill="#E8C9A0"/><path d="M${x0-48} ${h/2-dia*.16}L${x0-70} ${h/2}L${x0-48} ${h/2+dia*.16}Z" fill="#333"/>`
  :`<path d="M${x0} ${y0+3}L${x0-60} ${h/2-4}Q${x0-74} ${h/2} ${x0-60} ${h/2+4}L${x0} ${y0+dia-3}Z" fill="${metal}" stroke="#8B9299" stroke-width="1"/>`;
 const end=pencil?`<rect x="${x0+len}" y="${y0-1}" width="40" height="${dia+2}" fill="${metal}"/><rect x="${x0+len+40}" y="${y0}" width="46" height="${dia}" rx="10" fill="#F2A1A8"/>`
  :`<rect x="${x0+len}" y="${y0+2}" width="34" height="${dia-4}" rx="10" fill="${metal}" stroke="#8B9299" stroke-width="1"/><rect x="${x0+len*.62}" y="${y0-8}" width="${len*.4}" height="9" rx="4" fill="${metal}" stroke="#8B9299" stroke-width="1"/>`;
 return{box:[x0-(pencil?74:78),y0-12,len+(pencil?166:118),dia+24],svg:`${tip}<rect x="${x0}" y="${y0}" width="${len}" height="${dia}" rx="${dia*.18}" fill="${c}" stroke="${edge}" stroke-opacity=".35" stroke-width="1.2"/><rect x="${x0}" y="${y0+dia*.16}" width="${len}" height="${dia*.14}" fill="${hi}" opacity="${dark?.14:.45}"/><rect x="${x0}" y="${y0+dia*.72}" width="${len}" height="${dia*.2}" fill="#000" opacity=".1"/>${end}`}}
function dims(){const g=$('#dimsG');if(sel.length&&view==='edit'){g.textContent='';return}let cw=W(),ch=H(),ox=0,oy=0;if(D.shape==='custom'&&CT.url&&CT.bbox){cw=CT.bbox.w;ch=CT.bbox.h;ox=CT.bbox.x;oy=CT.bbox.y}
 const fs=12*K,y=oy-14*K,x=ox+cw+16*K;
 g.innerHTML=`<text class="dimt" font-size="${fs}" x="${ox+cw/2}" y="${y}" text-anchor="middle">${fmt(cw/100)} in</text><text class="dimt" font-size="${fs}" x="${x}" y="${oy+ch/2}" text-anchor="middle" transform="rotate(90 ${x} ${oy+ch/2})">${fmt(ch/100)} in</text>`}

/* ---------- contour for "Cut to design" ---------- */
function silhouette(x,e,P){if(e.hidden)return false;x.save();x.translate(e.x*P,e.y*P);x.rotate((e.rot||0)*Math.PI/180);x.scale(e.flipX?-1:1,e.flipY?-1:1);x.fillStyle='#000';x.strokeStyle='#000';let any=true;
 const fillStroke=()=>{if(hasFill(e))x.fill();if(hasStroke(e)){x.lineWidth=e.sw*P;x.stroke()}};
 switch(e.type){
  case 'image':{const m=IM[e.key],im=m&&(e.clear&&m.clearImg?m.clearImg:m.img);if(im&&im.complete&&im.naturalWidth)x.drawImage(im,-e.w/2*P,-e.h/2*P,e.w*P,e.h*P);else any=false;break}
  case 'shape':x.scale(e.w*P/100,e.h*P/100);x.translate(-50,-50);x.fill(new Path2D(GFX[e.kind].d),'evenodd');break;
  case 'rect':x.beginPath();if(x.roundRect)x.roundRect(-e.w/2*P,-e.h/2*P,e.w*P,e.h*P,Math.min(e.radius||0,e.w/2,e.h/2)*P);else x.rect(-e.w/2*P,-e.h/2*P,e.w*P,e.h*P);fillStroke();break;
  case 'ellipse':x.beginPath();x.ellipse(0,0,Math.max(e.w/2*P,.1),Math.max(e.h/2*P,.1),0,0,Math.PI*2);fillStroke();break;
  case 'line':x.beginPath();x.moveTo(-e.w/2*P,0);x.lineTo(e.w/2*P,0);x.lineWidth=Math.max(e.sw,1)*P;x.lineCap='round';x.stroke();break;
  case 'path':{x.scale(P,P);const p=new Path2D(pathD(e));if(hasFill(e))x.fill(p);x.lineWidth=Math.max(e.sw,1);x.lineCap='round';x.lineJoin='round';x.stroke(p);break}
  default:{const s=sz(e);x.fillRect(-s.w/2*P,-s.h/2*P,s.w*P,s.h*P)}}
 x.restore();return any}
function contourSig(){return JSON.stringify([D.w,D.h,D.gap,D.els.map(e=>[e.type,e.hidden,Math.round(e.x),Math.round(e.y),Math.round(e.w||0),Math.round(e.h||0),e.rot,e.kind,e.key,e.clear,e.sw,e.fill,e.stroke,e.pts&&e.pts.length,MEAS[e.id]&&Math.round(MEAS[e.id].w),MEAS[e.id]&&Math.round(MEAS[e.id].h)])])}
function schedContour(){if(D.shape!=='custom')return;const s=contourSig();if(s===CT.sig)return;CT.sig=s;clearTimeout(CT.timer);CT.timer=setTimeout(computeContour,op?80:20)}
function contourAt(gap,P,xf){const w=W(),h=H(),cw=Math.max(1,Math.ceil(w*P)),ch=Math.max(1,Math.ceil(h*P)),a=document.createElement('canvas');a.width=cw;a.height=ch;const x=a.getContext('2d');let any=false;
 if(xf){x.translate(w/2*P,h/2*P);x.scale(xf.s,xf.s);x.translate(-xf.ax*P,-xf.ay*P)}
 for(const e of D.els)if(silhouette(x,e,P))any=true;
 if(!any)return null;const r=gap*P,b=document.createElement('canvas');b.width=cw;b.height=ch;const y=b.getContext('2d');
 for(const k of [r,r*.66,r*.33])for(let i=0;i<20;i++){const t=i/20*2*Math.PI;y.drawImage(a,Math.cos(t)*k,Math.sin(t)*k)}y.drawImage(a,0,0);
 const id=y.getImageData(0,0,cw,ch),px=id.data;let x0=cw,y0=ch,x1=-1,y1=-1;
 for(let i=0,p=0;i<px.length;i+=4,p++){const on=px[i+3]>24;px[i]=px[i+1]=px[i+2]=255;px[i+3]=on?255:0;if(on){const xx=p%cw,yy=(p/cw)|0;if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(yy<y0)y0=yy;if(yy>y1)y1=yy}}
 y.putImageData(id,0,0);if(x1<0)return null;return{canvas:b,url:b.toDataURL(),bbox:{x:x0/P,y:y0/P,w:(x1-x0+1)/P,h:(y1-y0+1)/P}}}
function computeContour(){const P=Math.min(8,900/Math.max(W(),H())),c=contourAt(D.gap,P);
 if(!c){CT.url=null;CT.bbox=null;req();return}
 /* clean die-cut edge: a 2px blur rounds off the pixel steps, then the alpha is snapped back to a hard edge at the
    halfway line (under a pixel of anti-aliasing, no soft fade, and the outline stays where it was traced) */
 const sm=document.createElement('canvas');sm.width=c.canvas.width;sm.height=c.canvas.height;const sx=sm.getContext('2d');sx.filter='blur(2px)';sx.drawImage(c.canvas,0,0);sx.filter='none';
 const id=sx.getImageData(0,0,sm.width,sm.height),px=id.data;for(let i=3;i<px.length;i+=4){const a=px[i];px[i]=a<=112?0:a>=144?255:Math.round((a-112)*255/32)}sx.putImageData(id,0,0);
 CT.url=sm.toDataURL();CT.bbox=c.bbox;req();if(typeof cutSettle==='function')cutSettle()}

/* ---------- camera ---------- */
function fitBox(){const w=W(),h=H();if(view==='sheet')return[w/2-505,h/2-545,1010,1135];
 if(view==='edit'&&PROD().family==='pen'){const c=ctxMarkup(PROD(),LOOK(),w,h).box,wide=vp.clientWidth>=700;   /* desktop: the whole item; phones: the imprint stays big enough to edit */
  if(wide){const pad=Math.max(c[2],c[3])*.06;return[c[0]-pad,c[1]-pad-h*.6,c[2]+2*pad,c[3]+2*pad+h*1.2]}const bw=w*1.5,bh=h*3;return[w/2-bw/2,h/2-bh/2,bw,bh]}
 const m=Math.max(w,h)*.22;if(view==='proof'){const q=Math.max(150,Math.max(w,h)*.08+150),nar=vp.clientWidth<700;return[-m,-m*1.2,w+2*m+q,h+(nar?4.2:2.8)*m]}return[-m,-m,w+2*m,h+2*m]}
function curCam(){if(cam)return cam;const b=fitBox();return{x:b[0]+b[2]/2,y:b[1]+b[3]/2}}
function k0(){const vw=vp.clientWidth||1,vh=vp.clientHeight||1,b=fitBox();return Math.max(b[2]/vw,b[3]/vh)}
let VB=[0,0,1,1];
function camera(){const vw=vp.clientWidth,vh=vp.clientHeight;if(!vw||!vh)return;K=k0()/zoom;const c=curCam();VB=[c.x-vw*K/2,c.y-vh*K/2,vw*K,vh*K];
 svg.setAttribute('viewBox',VB.join(' '));$('#zLbl').textContent=Math.round(10000/(96*K))+'%'}
function zoomTo(z,sx,sy){const vw=vp.clientWidth,vh=vp.clientHeight,kk=k0(),c=curCam(),kOld=kk/zoom;if(sx==null){sx=vw/2;sy=vh/2}
 const wx=c.x+(sx-vw/2)*kOld,wy=c.y+(sy-vh/2)*kOld;zoom=clamp(z,.25,16);const kNew=kk/zoom;cam={x:wx-(sx-vw/2)*kNew,y:wy-(sy-vh/2)*kNew};req()}
function fit(){zoom=1;cam=null;req()}
function zoomActual(){zoomTo(zoom*(10000/(96*K))/100)}
function zoomSel(){const els=selEls();if(!els.length){fit();return}const b=unionBox(els),vw=vp.clientWidth,vh=vp.clientHeight,pad=1.6,kk=k0();const k=Math.max(b.w*pad/vw,b.h*pad/vh,.02);zoom=clamp(kk/k,.25,16);cam={x:b.cx,y:b.cy};req()}
function toScreen(x,y){return{x:(x-VB[0])/K,y:(y-VB[1])/K}}
