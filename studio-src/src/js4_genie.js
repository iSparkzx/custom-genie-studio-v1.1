/* =====================================================================
   Genie: AI design assistant
   Prototype: parsing, layout and edits run in the browser with rules. In production, define
     window.CustomGenieAI = {
       generate: async ({mode, prompt, answers, logo}) => [{name, doc}],   // doc matches newDoc()
       edit:     async ({prompt, doc}) => doc | null                       // optional
     }
   ===================================================================== */
const AI={a:null,mode:'prompt',logo:null,logoInfo:null,orig:null,seed:0,busy:false,recolorN:0,attach:null};
const RES=[];
const CW={red:'#DC2626',crimson:'#B91C1C',maroon:'#7F1D1D',burgundy:'#7F1D3B',coral:'#F87171',orange:'#F97316',yellow:'#FACC15',mustard:'#CA8A04',gold:'#C9A227',green:'#15803D',lime:'#84CC16',olive:'#4D7C0F',sage:'#87A878',mint:'#A7F3D0',teal:'#0F766E',turquoise:'#14B8A6',aqua:'#22D3EE',cyan:'#21C8E2',sky:'#38BDF8',blue:'#2563EB',navy:'#1E3A8A',purple:'#7C3AED',violet:'#8B5CF6',lavender:'#C4B5FD',pink:'#EC4899',magenta:'#C026D3',brown:'#6B4226',tan:'#D2B48C',beige:'#E8DCC4',cream:'#F5EBDD',ivory:'#FFFBEB',black:'#111827',charcoal:'#1F2937',white:'#FFFFFF',gray:'#6B7280',grey:'#6B7280',silver:'#C0C4CA'};
const ICONW=[[/coffee|cafe|café|espresso|latte|tea\b|mug|cup/,'cup'],[/mountain|outdoor|hike|hiking|camp|adventure|trail|peak|ski/,'mountain'],[/leaf|maple|tree|forest|plant|\beco|organic|garden|natural|vegan|herb|farm/,'leaf'],[/crown|king|queen|royal|premium|luxury|vip/,'crown'],[/water|drop|plumb|clean|wash|hydrat|oil/,'drop'],[/\bdog|\bcat\b|\bpet|paw|vet\b|groom/,'paw'],[/\bsun\b|sunny|summer|solar|beach|lemon/,'sun'],[/lightning|electric|bolt|energy|power|fast|volt/,'bolt'],[/heart|love|care|wedding|valentine/,'heart'],[/location|\bmaps?\b|travel|\bpin\b|\blocal\b|\bcity\b/,'pin'],[/\bstar|award|best|champion|winner|rating/,'star'],[/sale|deal|\bnew\b|promo|discount|launch/,'burst'],[/shield|security|guard|safe|insur/,'badge'],[/cloud|weather|sky|dream/,'cloud']];
const STYLEW=[[/vintage|retro|classic|rustic|heritage|old.?school|traditional/,'vintage'],[/modern|minimal|clean|simple|sleek|tech|corporate|professional/,'modern'],[/bold|sport|strong|loud|gym|fitness|team|athletic|industrial|tough/,'bold'],[/fun|playful|kid|cute|candy|party|quirky|happy|cartoon/,'fun'],[/elegant|wedding|script|boutique|beauty|salon|luxury|fancy|feminine/,'elegant']];
const FONTSET={vintage:[0,8,6,0],modern:[3,5,10,3],bold:[1,2,6,1],fun:[7,9,4,7],elegant:[4,0,3,4],any:[2,0,7,10]};
const UPF=new Set([1,5,6]);
const PALS=[{n:'Navy & gold',c:['#0F1B3D','#FFD569']},{n:'Black & white',c:['#111827','#FFFFFF']},{n:'Red & black',c:['#DC2626','#111827']},{n:'Forest & cream',c:['#14532D','#F5EBDD']},{n:'Coffee & cream',c:['#4A2C1D','#F3E6D3']},{n:'Ocean blues',c:['#0E4D6E','#7DD3FC']},{n:'Bright & fun',c:['#F97316','#21C8E2']},{n:'Purple & pink',c:['#5A3BD6','#F9A8D4']}];
const USES=[{k:'product',n:'Products or packaging',d:2,shape:null},{k:'laptop',n:'Laptops, phones or bottles',d:3,shape:null},{k:'equip',n:'Equipment or nameplates',d:3,shape:'rect',w:3,h:1},{k:'event',n:'Giveaways or events',d:2.5,shape:'circle'}];
const luma=h=>lum(h);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function parsePrompt(p,finishBias){const s=String(p||'').trim(),l=s.toLowerCase(),a={prompt:s};
 const q=[...s.matchAll(/["“]([^"”]{1,40})["”]/g)].map(m=>m[1].trim()).filter(Boolean);
 const tg=s.match(/(?:tagline|slogan|subtitle|and the words?)\s*(?:of|is|:)?\s*["“]([^"”]{1,50})["”]/i);
 if(tg){a.tagline=tg[1].trim();const i=q.indexOf(a.tagline);if(i>-1)q.splice(i,1)}
 if(q[0])a.name=q[0];if(!a.tagline&&q[1])a.tagline=q[1];
 if(!a.name){let m=s.match(/\b(?:called|named|says|reads|that says)\s+([A-Z0-9][\w&'’.-]*(?:\s+[A-Z0-9][\w&'’.-]*){0,3})/)||s.match(/\b(?:shop|company|business|brand|store|caf[eé]|bakery|restaurant|band|team|club|studio|salon|bar|brewery|farm|gym|church|school|firm|clinic|truck)\s+([A-Z][\w&'’.-]*(?:\s+[A-Z][\w&'’.-]*){0,3})/)||s.match(/\bfor\s+([A-Z][\w&'’.-]*(?:\s+[A-Z][\w&'’.-]*){0,3})/);if(m)a.name=m[1].replace(/[.,]$/,'')}
 let m=l.match(/(\d+(?:\.\d+)?)\s*(?:"|”|in(?:ch(?:es)?)?\.?)?\s*(?:x|×|by)\s*(\d+(?:\.\d+)?)\s*(?:"|”|in(?:ch(?:es)?)?\b)?/);
 if(m&&!/stickers?|pcs|pieces/.test(l.slice(m.index+m[0].length,m.index+m[0].length+10)))a.size={w:clamp(+m[1],MIN,MAX),h:clamp(+m[2],MIN,MAX)};
 else if(m=l.match(/(\d+(?:\.\d+)?)\s*(?:"|”|-?\s*in(?:ch(?:es)?)?\b)/))a.size={w:clamp(+m[1],MIN,MAX),h:clamp(+m[1],MIN,MAX),one:true};
 if(m=l.match(/(\d[\d,]*)\s*(?:stickers?|pcs|pieces|units|labels|badges|of them)/)){const n=+m[1].replace(/,/g,'');let t=0;QTY.forEach((x,i)=>{if(n>=x)t=i});a.tier=t;a.qtyN=n}
 if(/\b(stadium|pill|capsule|rounded rectangle)\b/.test(l))a.shape='stadium';
 else if(/\b(die[- ]?cut|cut to shape|custom shape|contour|cut around|cut to (?:the )?design|shaped like)\b/.test(l))a.shape='custom';
 else if(/\b(circle|circular|round)\b/.test(l))a.shape='circle';
 else if(/\b(oval|ellipse|elliptical)\b/.test(l))a.shape='oval';
 else if(/\bsquare\b/.test(l))a.shape='square';
 else if(/\b(rectangle|rectangular|name ?plate|plate|tag|banner)\b/.test(l))a.shape='rect';
 let fin=null;const fm=l.match(/\b(brushed |metallic |foil |shiny )?(gold|silver|chrome)\b/);
 if(fm){const pre=l.slice(Math.max(0,fm.index-6),fm.index),post=l.slice(fm.index+fm[0].length,fm.index+fm[0].length+14);
  const colorCtx=(!finishBias&&/(and|&|,|\/)\s*$/.test(pre))||/^\s*(and|&|,|\/|text|letter|lettering|font|accent|color|colour|outline|border|ink|trim)/.test(post);
  if(fm[1]||!colorCtx){a.vinyl=/gold/.test(fm[2])?'gold':'silver';fin=fm[0]}}
 if(!a.vinyl&&/\b(gloss(?:y)? white|white vinyl|white sticker)\b/.test(l))a.vinyl='white';
 let lw=fin?l.replace(fin,' '):l;for(const s2 of [a.name,a.tagline])if(s2)lw=lw.split(s2.toLowerCase()).join(' ');const cols=[];
 for(const [w,h] of Object.entries(CW)){const mm=lw.match(new RegExp('\\b'+w+'\\b'));if(mm)cols.push([mm.index,h])}
 cols.sort((x,y)=>x[0]-y[0]);const cs=[...new Set(cols.map(c=>c[1]))];if(cs.length)a.colors=cs.slice(0,3);
 for(const [r,k] of ICONW)if(r.test(l)){a.icon=k;break}
 for(const [r,k] of STYLEW)if(r.test(l)){a.style=k;break}
 if(/laptop|phone|bottle|tumbler|notebook/.test(l))a.use='laptop';else if(/equipment|machine|nameplate|name plate|appliance|asset tag/.test(l))a.use='equip';else if(/product|packag|jar|box|bag|candle|bottle label/.test(l))a.use='product';else if(/event|giveaway|swag|trade ?show|conference/.test(l))a.use='event';
 if(a.use&&!a.size){const u=USES.find(x=>x.k===a.use);if(u&&u.w)a.size={w:u.w,h:u.h}}
 if(a.use==='equip'&&!a.shape)a.shape='rect';
 return a}
function resolveSize(a){const sh=a.shape||a.shapeHint||'circle';let w,h;
 if(!a.size&&!a.sizeD&&a.mode==='upload'&&AI.logoInfo&&sh!=='circle'&&sh!=='square'){const r=AI.logoInfo.artAR;a=Object.assign({},a,{size:r>=1?{w:2,h:clamp(r2(2/r),MIN,MAX)}:{w:clamp(r2(2*r),MIN,MAX),h:2}})}
 if(a.size){w=a.size.w;h=a.size.h;if(a.size.one&&(sh==='rect'||sh==='oval'||sh==='stadium'))h=r2(Math.max(MIN,w*(sh==='rect'?.66:.6)))}else{const d=a.sizeD||2;w=d;h=d;if(sh==='rect'||sh==='oval'||sh==='stadium')h=Math.max(MIN,Math.round(d*.66*2)/2)}
 if(sh==='circle'||sh==='square'){const s=Math.max(w,h);w=h=s}
 return{w:clamp(w,MIN,MAX),h:clamp(h,MIN,MAX)}}
function pairUp(cs){const a=cs[0],b=cs.find(c=>Math.abs(luma(c)-luma(a))>.25);return [a,b||(luma(a)>.4?'#111827':'#FFFFFF')]}
const UP=()=>AI.mode==='upload';

/* ---------- artwork check ---------- */
function analyzeArt(img,m){const nw=img.naturalWidth||m.natW||1000,nh=img.naturalHeight||m.natH||1000,ar=nw/nh,Sz=128,cw=ar>=1?Sz:Math.max(8,Math.round(Sz*ar)),ch=ar>=1?Math.max(8,Math.round(Sz/ar)):Sz;
 const c=document.createElement('canvas');c.width=cw;c.height=ch;const x=c.getContext('2d');let d;
 try{x.drawImage(img,0,0,cw,ch);d=x.getImageData(0,0,cw,ch).data}catch(e){return{pxW:nw,pxH:nh,ar,artAR:ar,bg:'solid',solidBg:true,whiteBg:false,transparent:false,colors:[],ink:{x:0,y:0,w:nw,h:nh},round:false,suggest:Math.abs(ar-1)<.12?'square':'rect',vector:!!m.vector,sharpW:nw/300}}
 const Pq=(i,j)=>{const k=(j*cw+i)*4;return[d[k],d[k+1],d[k+2],d[k+3]]},cs=[Pq(0,0),Pq(cw-1,0),Pq(0,ch-1),Pq(cw-1,ch-1)];
 let clearPx=0;for(let i=3;i<d.length;i+=4)if(d[i]<20)clearPx++;
 const transparent=cs.filter(p=>p[3]<20).length>=3||clearPx>cw*ch*.12,whiteBg=!transparent&&cs.filter(p=>p[3]>200&&Math.min(p[0],p[1],p[2])>232).length>=3,solidBg=!transparent&&!whiteBg;
 const ink=(i,j)=>{const p=Pq(i,j);return p[3]>=128&&(transparent||solidBg||Math.min(p[0],p[1],p[2])<=232)};
 let x0=cw,y0=ch,x1=-1,y1=-1;for(let j=0;j<ch;j++)for(let i=0;i<cw;i++)if(ink(i,j)){if(i<x0)x0=i;if(i>x1)x1=i;if(j<y0)y0=j;if(j>y1)y1=j}
 if(x1<0){x0=0;y0=0;x1=cw-1;y1=ch-1}
 const bw=x1-x0+1,bh=y1-y0+1,frac=(ax,ay,aw,ah)=>{let n=0,t=0;for(let j=Math.floor(ay);j<Math.ceil(ay+ah);j++)for(let i=Math.floor(ax);i<Math.ceil(ax+aw);i++){t++;if(ink(i,j))n++}return t?n/t:0};
 const k=.16,corner=[frac(x0,y0,bw*k,bh*k),frac(x1-bw*k,y0,bw*k,bh*k),frac(x0,y1-bh*k,bw*k,bh*k),frac(x1-bw*k,y1-bh*k,bw*k,bh*k)].reduce((a,b)=>a+b,0)/4,center=frac(x0+bw*.3,y0+bh*.3,bw*.4,bh*.4);
 const inkAR=bw/bh,round=!solidBg&&corner<.12&&center>.55&&inkAR>.55&&inkAR<1.8;
 const sx=nw/cw,sy=nh/ch,inkPx={x:x0*sx,y:y0*sy,w:bw*sx,h:bh*sy};
 const artAR=solidBg?ar:inkAR,near1=Math.abs(artAR-1)<.12;
 const suggest=solidBg?(near1?'square':'rect'):round?(near1?'circle':'oval'):'custom';
 const map={};for(let i=0;i<d.length;i+=4){if(d[i+3]<128)continue;const r=d[i],g=d[i+1],b=d[i+2];if(Math.min(r,g,b)>225)continue;const kk=(r>>5)+','+(g>>5)+','+(b>>5);const o=map[kk]||(map[kk]={n:0,r:0,g:0,b:0});o.n++;o.r+=r;o.g+=g;o.b+=b}
 const colors=Object.values(map).filter(o=>o.n>cw*ch*.01).sort((a,b)=>b.n-a.n).map(o=>'#'+[o.r/o.n,o.g/o.n,o.b/o.n].map(v=>hex2(Math.round(v))).join('').toUpperCase()).slice(0,4);
 return{pxW:nw,pxH:nh,ar,artAR,bg:transparent?'transparent':whiteBg?'white':'solid',transparent,whiteBg,solidBg,colors,ink:solidBg?{x:0,y:0,w:nw,h:nh}:inkPx,round,suggest,vector:!!m.vector,sharpW:(solidBg?nw:inkPx.w)/300}}
function trimArt(k,info){return new Promise(res=>{const m=IM[k],ink=info.ink,pad=Math.max(info.pxW,info.pxH)/128*1.5+Math.max(ink.w,ink.h)*.01;
 const x0=Math.max(0,ink.x-pad),y0=Math.max(0,ink.y-pad),w=Math.min(info.pxW-x0,ink.w+2*pad),h=Math.min(info.pxH-y0,ink.h+2*pad);
 if(m.vector||info.solidBg||(w>info.pxW*.95&&h>info.pxH*.95)){res(k);return}
 const sc=Math.min(1,3000/Math.max(w,h)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*sc));c.height=Math.max(1,Math.round(h*sc));
 try{c.getContext('2d').drawImage(m.img,x0,y0,w,h,0,0,c.width,c.height);const url=c.toDataURL('image/png'),img=new Image(),nk=nid();
  img.onload=()=>{IM[nk]={url,img,name:m.name,vector:false,natW:img.naturalWidth,natH:img.naturalHeight,derived:true};res(nk)};img.onerror=()=>res(k);img.src=url}catch(e){res(k)}})}

/* ---------- layout generation ---------- */
const FW={0:.62,1:.42,2:.68,3:.56,4:.46,5:.46,6:.4,7:.5,8:.58,9:.58,10:.6};
function SS(o){if(o.color){o.fill=o.color;delete o.color}return S(o)}
function tx(o){o=Object.assign({align:'center'},o);if(o.color){o.fill=o.color;delete o.color}const e=T(o);if(UPF.has(e.font))e.text=e.text.toUpperCase();const lines=e.text.split('\n'),Ln=Math.max(...lines.map(x=>x.length),1);
 e.size=Math.max(8,Math.min(o.mh/(1.18*lines.length),o.mw/(Ln*FW[e.font]*(1+(e.spacing||0)/100))));e._mw=o.mw;e._mh=o.mh;delete e.mw;delete e.mh;return e}
function icon(kind,s,x,y,color){return SS({kind,w:s,h:s,x,y,color})}
function logoEl(box,x,y){const m=IM[AI.logo],ar=m.natW/m.natH;let w=box,h=box;if(ar>=1)h=w/ar;else w=h*ar;return base('image',{key:AI.logo,w,h,x,y,clear:!!(AI.logoInfo&&AI.logoInfo.whiteBg)})}
function split2(t){if(t.length<11||!t.includes(' '))return t;const mid=t.length/2;let best=-1;for(let i=0;i<t.length;i++)if(t[i]===' '&&(best<0||Math.abs(i-mid)<Math.abs(best-mid)))best=i;return t.slice(0,best)+'\n'+t.slice(best+1)}
function fitDoc(doc){const save=D;D=doc;const host=$('#msr');
 for(const e of doc.els){if(e.type!=='text')continue;
  for(let i=0;i<45;i++){host.textContent='';const g=mk('g');host.appendChild(g);drawEl(e,g);measure(e,g);const s=MEAS[e.id]||{w:0,h:0};
   if(!((e._mw&&s.w>e._mw)||(e._mh&&s.h>e._mh)||outsideSafe(e)))break;e.size*=.93}
  delete e._mw;delete e._mh}
 host.textContent='';D=save;return doc}
function localGenerate(a,seed){const shape=a.shape||'circle',{w,h}=resolveSize(a),Wd=w*100,Hd=h*100,mn=Math.min(Wd,Hd),vinyl=a.vinyl||'white',metal=vinyl!=='white';
 let cols=a.colors&&!a.surprise?a.colors.slice():PALS[(seed*3+(a.name||'').length)%PALS.length].c.slice();if(cols.length<2)cols=pairUp(cols);
 let dark=luma(cols[0])<=luma(cols[1])?cols[0]:cols[1],light=dark===cols[0]?cols[1]:cols[0];
 if(luma(dark)>.35)dark='#111827';if(luma(light)<.45)light='#FFFFFF';
 const accent=cols.find(c=>c!==dark&&c!=='#FFFFFF'&&c!=='#111827')||cols.find(c=>c!=='#FFFFFF'&&c!=='#111827')||(luma(light)<.95?light:dark);
 const ink=metal?'#FFFFFF':light;
 const fonts=FONTSET[a.style||'any'],F=i=>fonts[(i+seed)%fonts.length];
 const name=a.noText?'':(a.name||''),tag=a.noText?'':(a.tagline||''),ic=a.icon||(seed%2?'star':null),hasMark=!!AI.logo||!!ic;
 const mark=(box,x,y,color)=>AI.logo?(luma(color||'#000000')>.5?[SS({kind:'circle',w:box*1.34,h:box*1.34,x,y,color:'#FFFFFF'}),logoEl(box*.88,x,y)]:logoEl(box,x,y)):ic?icon(ic,box,x,y,color):null;
 const bd=()=>Object.assign(newDoc(),{shape,w,h,vinyl,rounded:true,gap:12});
 const round=shape==='circle'||shape==='oval',wide=!round&&shape!=='custom'&&w/h>=1.45,out=[];
 const add=(n,doc)=>{doc.els=doc.els.flat().filter(Boolean);if(doc.els.length||doc.bg.t!=='none')out.push({name:n,doc:fitDoc(doc)})};
 if(round){
  {const d=bd();d.bg={t:'color',c:dark,img:null};
   if(name)d.els.push(tx({text:name,font:F(0),color:ink,curve:58,spacing:6,x:Wd/2,y:Hd*.27,mw:Wd*.8,mh:Hd*.2}));
   d.els.push(mark(mn*(name?.3:.5),Wd/2,Hd*(name?.53:.5),metal?'#FFFFFF':accent===dark?light:accent));
   if(tag)d.els.push(tx({text:tag,font:3,bold:true,color:ink,spacing:8,x:Wd/2,y:Hd*.77,mw:Wd*.5,mh:Hd*.09}));add('Classic badge',d)}
  {const d=bd();if(!metal&&light!=='#FFFFFF')d.bg={t:'color',c:light,img:null};
   d.els.push(mark(mn*.28,Wd/2,Hd*(name?.3:.5),accent===light?dark:accent));
   if(name)d.els.push(tx({text:hasMark?name:split2(name),font:F(1),color:dark,x:Wd/2,y:Hd*(hasMark?.57:.45),mw:Wd*.74,mh:Hd*(hasMark?.2:.32)}));
   if(tag)d.els.push(tx({text:tag,font:3,color:dark,spacing:4,x:Wd/2,y:Hd*(hasMark?.73:.65),mw:Wd*.58,mh:Hd*.08}));add('Clean and simple',d)}
  {const d=bd();d.bg={t:'color',c:accent!==light?accent:dark,img:null};const tc=metal?'#FFFFFF':(luma(d.bg.c)<.4?'#FFFFFF':'#111827');
   if(name)d.els.push(tx({text:split2(name),font:F(2)===4?2:F(2),color:tc,x:Wd/2,y:Hd*.46,mw:Wd*.76,mh:Hd*.36}));else d.els.push(mark(mn*.5,Wd/2,Hd*.48,tc));
   if(tag)d.els.push(tx({text:tag.toUpperCase(),font:3,bold:true,color:tc,spacing:18,x:Wd/2,y:Hd*.72,mw:Wd*.56,mh:Hd*.07}));
   if(name&&hasMark&&!tag)d.els.push(mark(mn*.14,Wd/2,Hd*.74,tc));add('Bold name',d)}
  {const d=bd();d.bg={t:metal?'none':'color',c:metal?'#FFFFFF':light,img:null};d.els.push(SS({kind:'circle',w:Wd*.84,h:Hd*.84,x:Wd/2,y:Hd/2,color:dark}));
   d.els.push(mark(mn*.2,Wd/2,Hd*(name?.34:.5),ink));
   if(name)d.els.push(tx({text:hasMark?name:split2(name),font:F(3),color:ink,x:Wd/2,y:Hd*(hasMark?.54:.47),mw:Wd*.6,mh:Hd*(hasMark?.15:.28)}));
   if(tag)d.els.push(tx({text:tag,font:3,color:ink,spacing:6,x:Wd/2,y:Hd*.68,mw:Wd*.46,mh:Hd*.07}));add('Ring border',d)}}
 else if(shape==='custom'){
  {const d=bd();d.els.push(SS({kind:'circle',w:mn*.92,h:mn*.92,x:Wd/2,y:Hd/2,color:dark}));
   d.els.push(mark(mn*(name?.28:.46),Wd/2,Hd/2-(name?mn*.12:0),metal?'#FFFFFF':accent===dark?light:accent));
   if(name)d.els.push(tx({text:split2(name),font:F(0),color:ink,x:Wd/2,y:Hd/2+mn*.2,mw:mn*.66,mh:mn*.2}));add('Round cut',d)}
  {const d=bd();d.els.push(SS({kind:'burst',w:mn*.94,h:mn*.94,x:Wd/2,y:Hd/2,color:accent}));const tc=luma(accent)<.4?'#FFFFFF':'#111827';
   if(name)d.els.push(tx({text:split2(name),font:F(1),color:tc,x:Wd/2,y:Hd/2,mw:mn*.56,mh:mn*.36}));else d.els.push(mark(mn*.4,Wd/2,Hd/2,tc));add('Starburst',d)}
  {const d=bd();d.els.push(mark(mn*.5,Wd/2,Hd*.36,accent));if(name)d.els.push(tx({text:name,font:F(2),color:dark,x:Wd/2,y:Hd*.76,mw:Wd*.9,mh:Hd*.2,stroke:'#FFFFFF',sw:0}));add('Logo and name',d)}
  {const d=bd();d.els.push(SS({kind:'banner',w:Wd*.96,h:Hd*.5,x:Wd/2,y:Hd/2,color:dark}));if(name)d.els.push(tx({text:name,font:F(3),color:ink,x:Wd/2,y:Hd/2,mw:Wd*.66,mh:Hd*.22}));else d.els.push(mark(Hd*.3,Wd/2,Hd/2,ink));add('Banner',d)}}
 else if(wide){
  const iS=Math.min(Hd*.62,Wd*.28),ix=8+Wd*.05+iS/2,rx0=hasMark?ix+iS/2+Wd*.04:Wd*.08,rx1=Wd-8-Wd*.05,cx=(rx0+rx1)/2,mw=rx1-rx0;
  {const d=bd();d.bg={t:'color',c:dark,img:null};d.els.push(mark(iS,ix,Hd/2,metal?'#FFFFFF':accent===dark?light:accent));
   if(name)d.els.push(tx({text:name,font:F(0),color:ink,x:cx,y:Hd*(tag?.42:.5),mw,mh:Hd*(tag?.36:.5)}));
   if(tag)d.els.push(tx({text:tag,font:3,color:ink,spacing:6,x:cx,y:Hd*.72,mw,mh:Hd*.16}));add('Logo left',d)}
  {const d=bd();if(!metal&&light!=='#FFFFFF')d.bg={t:'color',c:light,img:null};
   if(name)d.els.push(tx({text:name,font:F(1),color:dark,x:Wd/2,y:Hd*(tag?.42:.5),mw:Wd*.84,mh:Hd*(tag?.4:.56)}));else d.els.push(mark(Hd*.6,Wd/2,Hd/2,accent));
   if(tag)d.els.push(tx({text:tag.toUpperCase(),font:3,bold:true,color:accent===light?dark:accent,spacing:16,x:Wd/2,y:Hd*.74,mw:Wd*.7,mh:Hd*.14}));add('Centered',d)}
  {const d=bd();d.bg={t:'color',c:accent!==light?accent:dark,img:null};const tc=metal?'#FFFFFF':(luma(d.bg.c)<.4?'#FFFFFF':'#111827');
   if(name)d.els.push(tx({text:name,font:F(2)===4?1:F(2),color:tc,x:Wd/2,y:Hd*(tag?.42:.5),mw:Wd*.84,mh:Hd*(tag?.44:.6)}));else d.els.push(mark(Hd*.6,Wd/2,Hd/2,tc));
   if(tag)d.els.push(tx({text:tag,font:3,color:tc,x:Wd/2,y:Hd*.76,mw:Wd*.7,mh:Hd*.14}));add('Bold color',d)}
  {const d=bd();d.bg={t:metal?'none':'color',c:'#FFFFFF',img:null};d.els.push(R({w:Wd*.9,h:Hd*.78,x:Wd/2,y:Hd/2,fill:dark,radius:Math.min(Wd,Hd)*.08}));
   const m2=mark(Math.min(Hd*.46,Wd*.22),Wd*.18,Hd/2,ink);if(m2)d.els.push(m2);const x0=m2?Wd*.3:Wd*.12;
   if(name)d.els.push(tx({text:name,font:F(3),color:ink,x:(x0+Wd*.9)/2,y:Hd*(tag?.43:.5),mw:Wd*.9-x0-Wd*.04,mh:Hd*(tag?.3:.4)}));
   if(tag)d.els.push(tx({text:tag,font:3,color:ink,x:(x0+Wd*.9)/2,y:Hd*.68,mw:Wd*.9-x0-Wd*.04,mh:Hd*.12}));add('Framed plate',d)}}
 else{
  {const d=bd();d.bg={t:'color',c:dark,img:null};d.els.push(mark(mn*.32,Wd/2,Hd*(name?.32:.5),metal?'#FFFFFF':accent===dark?light:accent));
   if(name)d.els.push(tx({text:name,font:F(0),color:ink,x:Wd/2,y:Hd*(hasMark?.62:.45),mw:Wd*.8,mh:Hd*.18}));
   if(tag)d.els.push(tx({text:tag,font:3,color:ink,spacing:6,x:Wd/2,y:Hd*.78,mw:Wd*.72,mh:Hd*.08}));add('Stacked',d)}
  {const d=bd();if(!metal&&light!=='#FFFFFF')d.bg={t:'color',c:light,img:null};d.els.push(mark(mn*.3,Wd/2,Hd*(name?.3:.5),accent===light?dark:accent));
   if(name)d.els.push(tx({text:hasMark?name:split2(name),font:F(1),color:dark,x:Wd/2,y:Hd*(hasMark?.6:.46),mw:Wd*.8,mh:Hd*(hasMark?.2:.34)}));if(tag)d.els.push(tx({text:tag,font:3,color:dark,x:Wd/2,y:Hd*.76,mw:Wd*.7,mh:Hd*.08}));add('Clean and simple',d)}
  {const d=bd();d.bg={t:'color',c:accent!==light?accent:dark,img:null};const tc=metal?'#FFFFFF':(luma(d.bg.c)<.4?'#FFFFFF':'#111827');
   if(name)d.els.push(tx({text:split2(name),font:F(2)===4?2:F(2),color:tc,x:Wd/2,y:Hd*.45,mw:Wd*.84,mh:Hd*.4}));else d.els.push(mark(mn*.5,Wd/2,Hd/2,tc));
   if(tag)d.els.push(tx({text:tag.toUpperCase(),font:3,bold:true,color:tc,spacing:16,x:Wd/2,y:Hd*.74,mw:Wd*.7,mh:Hd*.08}));add('Bold name',d)}
  {const d=bd();d.bg={t:metal?'none':'color',c:'#FFFFFF',img:null};d.els.push(R({w:Wd*.86,h:Hd*.86,x:Wd/2,y:Hd/2,fill:dark,radius:mn*.08}));
   d.els.push(mark(mn*.22,Wd/2,Hd*(name?.34:.5),ink));if(name)d.els.push(tx({text:hasMark?name:split2(name),font:F(3),color:ink,x:Wd/2,y:Hd*(hasMark?.58:.47),mw:Wd*.7,mh:Hd*(hasMark?.16:.3)}));
   if(tag)d.els.push(tx({text:tag,font:3,color:ink,x:Wd/2,y:Hd*.72,mw:Wd*.6,mh:Hd*.07}));add('Framed',d)}}
 return out}
function mix(a,b,t){const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),A=p(a),B=p(b);return '#'+A.map((v,i)=>hex2(Math.round(v*(1-t)+B[i]*t))).join('').toUpperCase()}
function uploadGenerate(a,seed){const i=AI.logoInfo,shape=a.shape||a.shapeHint||'rect',{w,h}=resolveSize(a),Wd=w*100,Hd=h*100,vinyl=a.vinyl||'white',round=shape==='circle'||shape==='oval';
 const m=IM[AI.logo],ar=m.natW/m.natH,clr=!!i.whiteBg,cols=i.colors&&i.colors.length?i.colors:['#111827'],dom=cols[seed%cols.length],dk=cols.find(c=>luma(c)<.25)||'#111827';
 const bd=o=>Object.assign(newDoc(),{shape,w,h,vinyl,rounded:true,gap:10},o||{});
 const fit=(fw,fh,x,y,clear)=>{let bw=fw,bh=fw/ar;if(bh>fh){bh=fh;bw=fh*ar}return base('image',{key:AI.logo,w:bw,h:bh,x,y,clear:!!clear})};
 const sw=Wd-2*SAFE-4,sh=Hd-2*SAFE-4,rk=round?.72:1,out=[],add=(n,doc)=>{doc.els=doc.els.flat().filter(Boolean);out.push({name:n,doc:fitDoc(doc)})};
 const tint=mix(dom,'#FFFFFF',[.86,.75,.92][seed%3]);
 if(shape==='custom'){const d=bd();d.els.push(fit(Wd*.94,Hd*.94,Wd/2,Hd/2,clr));add('Cut around your design',d)}
 else{const d=bd();if(i.solidBg&&!round)d.bg={t:'img',c:'#FFFFFF',img:AI.logo};else d.els.push(fit(sw*rk,sh*rk,Wd/2,Hd/2,false));add(i.solidBg&&!round?'Edge to edge':'Your design, as is',d)}
 if(i.solidBg){const d=bd();d.els.push(fit(sw*rk*.86,sh*rk*.86,Wd/2,Hd/2,false));add('With a white border',d)}
 else if(shape!=='custom'){const d=bd({bg:{t:'color',c:luma(dom)<.5?tint:'#111827',img:null}});d.els.push(fit(sw*rk*.8,sh*rk*.8,Wd/2,Hd/2,clr));add('On a tinted background',d)}
 if(!i.solidBg&&shape!=='custom'){const d=bd({shape:'custom'});d.els.push(fit(Wd*.94,Hd*.94,Wd/2,Hd/2,clr));add('Cut around your design',d)}
 else if(shape==='custom'){const s=clamp(Math.max(w,h),MIN,MAX),S2=s*100,d=Object.assign(newDoc(),{shape:'circle',w:s,h:s,vinyl,bg:{t:'color',c:luma(dom)<.5?tint:'#111827',img:null}});d.els.push(fit((S2-2*SAFE)*.66,(S2-2*SAFE)*.66,S2/2,S2/2,clr));add('On a round sticker',d)}
 const name=a.noText?'':(a.name||''),tag=a.noText?'':(a.tagline||''),fnt=[3,5,0,2][seed%4];
 if(name){const d=bd(),wd=Wd/Hd>=1.45&&!round;
  if(wd){const bw=Math.min(Hd*.7,Wd*.34),x0=8+Wd*.08+bw,x1=Wd-8-Wd*.04;d.els.push(fit(bw,Hd*.7,8+Wd*.04+bw/2,Hd/2,clr));
   d.els.push(tx({text:name,font:fnt,color:dk,x:(x0+x1)/2,y:Hd*(tag?.42:.5),mw:x1-x0,mh:Hd*(tag?.32:.42)}));if(tag)d.els.push(tx({text:tag,font:3,color:dk,x:(x0+x1)/2,y:Hd*.72,mw:x1-x0,mh:Hd*.14}))}
  else{d.els.push(fit(sw*(round?.62:.9),Hd*(round?.36:.48),Wd/2,Hd*(round?.38:.35),clr));
   d.els.push(tx({text:name,font:fnt,color:dk,x:Wd/2,y:Hd*(tag?.67:.72),mw:Wd*(round?.62:.84),mh:Hd*.13}));if(tag)d.els.push(tx({text:tag,font:3,color:dk,x:Wd/2,y:Hd*.8,mw:Wd*(round?.42:.7),mh:Hd*.07}))}
  add('With your text',d)}
 else if(!i.solidBg&&shape!=='custom'&&luma(dom)>.3){const d=bd({bg:{t:'color',c:dk,img:null}});d.els.push(fit(sw*rk*.8,sh*rk*.8,Wd/2,Hd/2,clr));add('On a dark background',d)}
 return out}

/* static render of any doc (Genie results, templates, proof) */
function thumbSVG(doc,lab,opt){opt=opt||{};const save=D;D=doc;const w=doc.w*100,h=doc.h*100,m=Math.max(w,h)*(opt.proof?.05:.08),host=$('#msr'),metal=doc.vinyl!=='white',basef=doc.vinyl==='white'?'#FFFFFF':doc.vinyl==='silver'?'url(#gSilver)':'url(#gGold)';let els='';
 for(const e of doc.els){if(e.hidden)continue;host.textContent='';const g=mk('g');host.appendChild(g);drawEl(e,g);if(e.type==='text')measure(e,g);els+=`<g transform="${elTransform(e)}"${(e.opacity??1)<1?` opacity="${e.opacity}"`:''}>${g.outerHTML}</g>`}
 host.textContent='';D=save;const u=nid();
 els=els.replace(/id="arc-([^"]+)"/g,`id="arc-$1-${u}"`).replace(/href="#arc-([^"]+)"/g,`href="#arc-$1-${u}"`);
 if(metal)els=els.replace(/fill="#FFFFFF"/gi,`fill="${basef}"`);
 const bg=doc.bg.t==='color'?`<rect width="${w}" height="${h}" fill="${metal&&doc.bg.c.toUpperCase()==='#FFFFFF'?basef:doc.bg.c}"/>`:doc.bg.t==='img'&&IM[doc.bg.img]?`<image href="${IM[doc.bg.img].url}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`:'';
 const lbl=`role="img" aria-label="${esc(lab||'Design option')}"`;
 if(doc.shape==='custom'){const back=doc.vinyl==='white'?'#FFFFFF':doc.vinyl==='silver'?'#CDD2D8':'#D9B865';
  return `<svg viewBox="${-m} ${-m} ${w+2*m} ${h+2*m}" ${lbl}><defs><filter id="ct${u}" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="${doc.gap}" result="d"/><feFlood flood-color="${back}"/><feComposite in2="d" operator="in" result="bk"/><feDropShadow in="bk" dx="0" dy="${w*.012}" stdDeviation="${w*.012}" flood-opacity=".25" result="sh"/><feMerge><feMergeNode in="sh"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#ct${u})">${els}</g></svg>`}
 const sd=shapeD(doc,0);
 return `<svg viewBox="${-m} ${-m} ${w+2*m} ${h+2*m}" ${lbl}><defs><clipPath id="cp${u}"><path d="${sd}"/></clipPath><filter id="sh${u}" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="${Math.max(w,h)*.012}" stdDeviation="${Math.max(w,h)*.014}" flood-opacity=".22"/></filter></defs><path d="${sd}" fill="${basef}" filter="url(#sh${u})"/><g clip-path="url(#cp${u})">${bg}${els}${opt.proof?'':`<path d="${sd}" fill="url(#gGloss)"/>`}</g><path d="${sd}" fill="none" stroke="rgba(0,0,0,${opt.proof?.45:.12})" stroke-width="${Math.max(w,h)*(opt.proof?.004:.006)}"/></svg>`}

/* ---------- Genie conversation UI ---------- */
const feed=$('#gfeed');
const gAvatar='<span class="av" aria-hidden="true"><svg class="gmark" viewBox="26 14 326 606"><use href="#g-mark"/></svg></span>';
function gPush(who,html){const d=document.createElement('div');d.className='gm '+(who==='genie'?'bot':'user');d.innerHTML=who==='genie'?gAvatar+`<div class="bd">${html}</div>`:html;feed.appendChild(d);const fr=feed.getBoundingClientRect(),dr=d.getBoundingClientRect();feed.scrollTop+=dr.height>fr.height-16?dr.top-fr.top-8:dr.bottom-fr.bottom+8;return d}
function gUser(text,key){gPush('me',(text?esc(text):(key?'Here\'s my artwork.':''))+(key&&IM[key]?`<br><img src="${IM[key].url}" alt="">`:''))}
function gSay(html){return gPush('genie',html)}
function gThinking(t){return gPush('genie',`<p style="display:flex;align-items:center;gap:8px"><span class="gtyping" aria-hidden="true"><i></i><i></i><i></i></span>${esc(t)}</p>`)}
function genieIntro(){feed.innerHTML='';gSay(`<p><b>Hi, I'm Genie.</b> Tell me about your sticker and I'll design four options to start from. Everything stays editable.</p><div class="gchips">${['Round sticker for my coffee shop "Bean There", brown and cream','Silver nameplate "Apex Machining", 3 x 1 inches','Fun gold label for "Sunny Days" lemonade with a sun'].map(x=>`<button type="button" class="gchip" data-gsend="${esc(x)}">${esc(x.length>36?x.slice(0,34)+'…':x)}</button>`).join('')}</div><p style="margin-top:8px;color:var(--ink-3)">Have a logo? <button type="button" class="linkbtn" data-gupload>Upload it</button> and I'll check it for print and suggest a shape and size. Once you have a design, ask me to change it, like <i>"make it navy and gold"</i>.</p>`);quickUI();if(NB.on)nbBadge();if(GC.on)gcIntro()}
function quickUI(){const q=$('#gquick'),blank=isBlank();const list=blank?[]:['New colors','Bolder text','Add an outline','Tidy the layout',D.vinyl==='gold'?'Make it silver':'Make it gold','Curve the name'];const s=list.join('|');if(q.dataset.sig===s)return;q.dataset.sig=s;q.innerHTML=list.map(x=>`<button type="button" class="gchip" data-gsend="${esc(x)}">${esc(x)}</button>`).join('');q.hidden=!list.length}
function openGenie(focus){if(NARROW.matches)openSheet('genie');else{studio.classList.remove('no-left');if(MID.matches)studio.classList.add('show-left');setLTab('genie');panelBtns()}quickUI();if(focus)setTimeout(()=>$('#gtext').focus(),60)}
function genieOpened(){quickUI()}
feed.addEventListener('click',ev=>{const s=ev.target.closest('[data-gsend]'),pk=ev.target.closest('[data-pick]'),rf=ev.target.closest('[data-refine]'),up=ev.target.closest('[data-gupload]'),un=ev.target.closest('[data-gundo]'),mo=ev.target.closest('[data-gmore]');
 if(s){genieSubmit(s.dataset.gsend,null,!!s.dataset.gdirect);return}
 if(up){$('#gfile').click();return}
 if(un){undo();un.disabled=true;un.textContent='Undone';return}
 if(pk){const [r,i]=pk.dataset.pick.split(':').map(Number);const res=RES[r]&&RES[r].list[i];if(res)applyAI(res,RES[r]);return}
 if(mo){const r=RES[+mo.dataset.gmore];if(!r)return;AI.a=JSON.parse(JSON.stringify(r.a));AI.mode=r.mode;AI.logo=r.logo;AI.logoInfo=r.logoInfo;AI.seed=(r.seed||0)+1;generate();return}
 if(rf){const r=RES[+rf.dataset.res];if(!r)return;const o=JSON.parse(rf.dataset.refine);AI.a=Object.assign(JSON.parse(JSON.stringify(r.a)),o);if(o.colors)AI.a.surprise=false;if(o.shape)delete AI.a.shapeHint;AI.mode=r.mode;AI.logo=r.logo;AI.logoInfo=r.logoInfo;AI.seed=r.seed||0;gUser(rf.dataset.say||rf.textContent.trim());generate()}});
$('#gquick').addEventListener('click',ev=>{const s=ev.target.closest('[data-gsend]');if(s)genieSubmit(s.dataset.gsend,null,true)});
$('#gcomp').addEventListener('submit',ev=>{ev.preventDefault();const t=$('#gtext'),p=t.value.trim(),k=AI.attach;if(!p&&!k){t.focus();return}t.value='';t.style.height='';AI.attach=null;$('#gatt').hidden=true;genieSubmit(p,k)});
$('#gtext').addEventListener('keydown',ev=>{if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();$('#gcomp').requestSubmit()}});
$('#gtext').addEventListener('input',ev=>{ev.target.style.height='auto';ev.target.style.height=Math.min(280,ev.target.scrollHeight)+'px'});
$('#gattach').addEventListener('click',()=>{$('#gfile').dataset.mode='attach';$('#gfile').click()});
$('#gattRm').addEventListener('click',()=>{AI.attach=null;$('#gatt').hidden=true});
$('#gfile').addEventListener('change',ev=>{const f=ev.target.files[0],mode=ev.target.dataset.mode;ev.target.value='';ev.target.dataset.mode='';if(!f)return;
 if(mode==='gcref'){openGenie(false);loadFile(f,k=>{gUser('',k);if(GC.on)gcTurn('Here is my logo or a reference image to work from.',k).then(ok=>{if(!ok)genieAnalyze(k)});else genieAnalyze(k)});return}
 if(mode==='attach'){loadFile(f,k=>{AI.attach=k;$('#gattName').textContent=IM[k].name;$('#gattImg').src=IM[k].url;$('#gatt').hidden=false;$('#gtext').focus()});return}
 genieUpload(f)});
function genieUpload(file){openGenie(false);startDismissed=true;req();loadFile(file,k=>{gUser('',k);gcAddRef(k);gcNote(`The shopper uploaded artwork "${IM[k].name}"; Genie checked it for print and showed layouts with it.`);genieAnalyze(k)})}

async function genieSubmit(p,key,direct){if(AI.busy||GC.busy)return;openGenie(false);startDismissed=true;req();gUser(p,key);
 if(GC.on&&!direct){if(await gcTurn(p,key))return}          /* Genie chat (server model) leads; built-in rules below are the fallback */
 if(!p&&key){genieAnalyze(key);return}
 const isNew=/\b(sticker|label|badge|logo|design|nameplate|plate|tag) (for|that|with|of)\b|\bfor my\b|\bnew (design|sticker)\b|\bcreate\b|\bdesign (a|an|me)\b|\bmake (a|an|me) /i.test(p);
 if(!key&&!isNew&&NB.on){const t=nbTarget();if(t){await nbEdit(p,t);return}}          /* change the selected Nano Banana logo */
 if(!isBlank()&&!key&&!isNew){const done=await genieEdit(p);if(done)return}
 if(!key&&await nbGenerate(p))return;                                                   /* draw new logos with Nano Banana Pro */
 AI.mode='prompt';AI.logo=key||null;AI.logoInfo=key?analyzeArt(IM[key].img,IM[key]):null;if(AI.logoInfo&&AI.logoInfo.whiteBg)makeClear(key);
 AI.a=parsePrompt(p);AI.a.mode='prompt';AI.seed=0;track('builder_ai_prompt',{length:p.length,logo:!!key});generate()}
async function genieAnalyze(k){AI.busy=true;const m=IM[k],first=analyzeArt(m.img,m);AI.orig={key:k,info:first};
 const k2=await trimArt(k,first),m2=IM[k2];AI.mode='upload';AI.logo=k2;
 AI.logoInfo=k2===k?first:Object.assign(analyzeArt(m2.img,m2),{pxW:first.pxW,pxH:first.pxH,sharpW:first.sharpW,bg:first.bg,transparent:first.transparent,whiteBg:first.whiteBg,solidBg:first.solidBg,round:first.round,suggest:first.suggest,colors:first.colors,artAR:first.artAR,ink:first.ink});
 IM[k2].round=!!first.round;if(AI.logoInfo.whiteBg)makeClear(k2);const i=AI.logoInfo,li=(ok,h)=>`<li class="${ok?'':'warn'}"><svg class="ico" aria-hidden="true"><use href="#${ok?'i-check':'i-warn'}"/></svg><span>${h}</span></li>`;
 const shapeTxt=i.round?`Looks round, so a <b>${i.suggest==='oval'?'oval':'circle'}</b> fits it best.`:i.solidBg?`Solid background, so a <b>${i.suggest==='square'?'square':'rectangle'}</b> keeps all of it.`:'I can <b>cut right around</b> the artwork.';
 const sw=i.sharpW,items=[li(true,`<b>${i.pxW.toLocaleString()} × ${i.pxH.toLocaleString()} px</b>, ${i.artAR>1.15?'wide':i.artAR<.87?'tall':'about square'}`),
  i.vector?li(true,'Vector file, <b>sharp at any size</b>.'):sw>=2?li(true,`Prints sharp up to about <b>${fmt(Math.min(sw,8.5))} in</b> wide.`):li(false,`Low resolution: may blur above ${fmt(Math.max(sw,.5))} in wide. A larger file will print sharper.`),
  li(true,i.transparent?'<b>Transparent background</b>, great for cutting to shape.':i.whiteBg?'<b>White background</b>. I can remove it for a cut-to-shape sticker.':'<b>Solid background</b>, printed edge to edge.'),li(true,shapeTxt)];
 if(i.colors.length)items.push(li(true,`Main colors <span class="pal">${i.colors.map(c=>`<i style="background:${c}"></i>`).join('')}</span>`));
 gSay(`<p><b>I checked your artwork for print.</b></p><ul class="glist">${items.join('')}</ul>`);
 AI.a={mode:'upload',prompt:'',shapeHint:first.suggest};AI.seed=0;AI.busy=false;track('builder_ai_upload',{bg:first.bg});generate()}
async function generate(){AI.busy=true;const a=AI.a,th=gThinking(UP()?'Placing your artwork…':'Designing four options…');
 if(AI.logo&&AI.logoInfo&&AI.logoInfo.whiteBg)await makeClear(AI.logo);
 let out=null;const t0=Date.now();
 try{if(window.CustomGenieAI&&typeof window.CustomGenieAI.generate==='function')out=await window.CustomGenieAI.generate({mode:AI.mode,prompt:a.prompt,answers:JSON.parse(JSON.stringify(a)),logo:AI.logo?IM[AI.logo].url:null})}catch(e){out=null}
 if(!Array.isArray(out)||!out.length)out=UP()?uploadGenerate(a,AI.seed):localGenerate(a,AI.seed);
 await sleep(Math.max(0,(reduce.matches?120:900)-(Date.now()-t0)));th.remove();
 const rid=RES.push({list:out,a:JSON.parse(JSON.stringify(a)),mode:AI.mode,logo:AI.logo,logoInfo:AI.logoInfo,seed:AI.seed})-1;
 const sh=a.shape||a.shapeHint||'circle',s=resolveSize(a),cur=a.vinyl||'white';
 const chip=(o,txt,on,say)=>`<button type="button" class="gchip" data-res="${rid}" data-refine='${esc(JSON.stringify(o))}' aria-pressed="${!!on}"${say?` data-say="${esc(say)}"`:''}>${txt}</button>`;
 const shapes=(UP()?['circle','oval','rect','square','custom']:['circle','oval','rect','stadium','custom']).map(k=>chip({shape:k},SN[k]+(k===AI.logoInfo?.suggest&&UP()?' ★':''),k===sh,`Make it ${SN[k].toLowerCase()}`)).join('');
 const fins=['white','silver','gold'].map(v=>chip({vinyl:v},`<span class="sw sw-${v}" style="width:12px;height:12px" aria-hidden="true"></span>${VN[v]}`,v===cur,`Use ${VN[v]}`)).join('');
 const pals=UP()?'':PALS.slice(0,5).map(p=>chip({colors:p.c},`<span class="pal">${p.c.map(c=>`<i style="background:${c}"></i>`).join('')}</span>${p.n}`,false,`Use ${p.n.toLowerCase()}`)).join('');
 const who=a.name?`"${esc(a.name)}"`:UP()?'your artwork':'your sticker';
 gSay(`<p>Here ${out.length===1?'is an option':`are ${out.length} options`} for ${who}: ${esc(SN[sh].toLowerCase())}, ${fmt(s.w)} × ${fmt(s.h)} in, ${esc(VN[cur])}. Pick one to start.</p>
  <div class="ggrid">${out.map((r,i)=>`<button type="button" class="gcard" data-pick="${rid}:${i}" aria-label="Use design: ${esc(r.name)}">${thumbSVG(r.doc,r.name)}<span>${esc(r.name)}</span></button>`).join('')}</div>
  <div class="grefine"><span class="gl">Shape</span><div class="gchips">${shapes}</div><span class="gl">Finish</span><div class="gchips">${fins}</div>${pals?`<span class="gl">Colors</span><div class="gchips">${pals}</div>`:''}<div class="gchips" style="margin-top:6px"><button type="button" class="gchip" data-gmore="${rid}"><svg class="ico" style="width:14px;height:14px"><use href="#i-spark"/></svg>More like these</button></div></div>`);
 AI.busy=false;track('builder_ai_generate',{n:out.length,seed:AI.seed,mode:AI.mode})}
function applyAI(r,meta){const c=JSON.parse(JSON.stringify(r.doc)),had=!isBlank();c.els.forEach(e=>{e.id=nid();e.gid=null});D=Object.assign(newDoc(),c);D.groups={};if(meta&&meta.a&&meta.a.tier!=null)tier=meta.a.tier;
 sel=[];gfocus=null;startDismissed=true;CT.sig='';CT.url=null;cam=null;zoom=1;if(!editable())setView('edit');if(!started){started=true;track('builder_start',{method:'ai'})}
 track('builder_ai_apply',{design:r.name});gcNote(`The shopper applied the layout "${r.name}".`);commit();syncPanels();req();quickUI();if(NARROW.matches)closeSheets();
 toast(had?`Replaced your design with "${r.name}".`:COARSE.matches?'Design added. Tap anything to change it.':'Design added. Click anything to change it, or double-click text to type.',had?'Undo':null,had?undo:null)}

/* natural-language edits on the current design */
function recolor(cols,scope){const c=cols.length>1?cols.slice(0,3):pairUp(cols);let dark=luma(c[0])<=luma(c[1])?c[0]:c[1],light=dark===c[0]?c[1]:c[0],accent=c[2]||light;
 if(scope==='bg'){D.bg={t:'color',c:cols[0],img:null};D.els.forEach(e=>{if(e.type==='text'&&hasFill(e)&&contrast(e.fill,cols[0])<2.5)e.fill=contrast('#111827',cols[0])>contrast('#FFFFFF',cols[0])?'#111827':'#FFFFFF'});return}
 const area=W()*H();D.bg={t:'color',c:dark,img:null};
 D.els.forEach(e=>{if(e.type==='image')return;if(e.type==='text'){if(hasFill(e))e.fill=light;if(hasStroke(e))e.stroke=dark;return}
  const big=e.w*e.h>area*.45;if(hasFill(e))e.fill=big?mix(dark,light,.12):accent;if(hasStroke(e))e.stroke=big?light:accent;if(e.type==='line')e.stroke=accent})}
const listJoin=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];
async function genieEdit(p){const l=p.toLowerCase(),done=[];
 if(window.CustomGenieAI&&typeof window.CustomGenieAI.edit==='function'){try{const nd=await window.CustomGenieAI.edit({prompt:p,doc:JSON.parse(JSON.stringify(D))});if(nd&&Array.isArray(nd.els)){D=Object.assign(newDoc(),nd);D.groups=D.groups||{};CT.sig='';commit();syncPanels();req();gSay(`<p>Done. <button type="button" class="gchip" data-gundo>Undo</button></p>`);return true}}catch(e){}}
 const texts=D.els.filter(e=>e.type==='text'&&!e.hidden).sort((a,b)=>b.size-a.size),main=texts[0];
 let m=p.match(/(?:text|name|words?|title|it)\s+(?:to|say|says|read|reads)\s+["“]?(.+?)["”]?\s*$/i)||p.match(/^(?:say|write)\s+["“]?(.+?)["”]?$/i);
 if(m&&main){main.text=m[1].trim();done.push(`changed the text to "${esc(main.text)}"`)}
 const a=parsePrompt(m?'':p,false);
 if(a.shape&&a.shape!==D.shape){D.shape=a.shape;if(a.shape==='square'||a.shape==='circle'){const s=Math.max(D.w,D.h);setSize(s,s)}if(a.shape!=='custom')CT.url=null;done.push(`made it ${/^[aeiou]/i.test(SN[a.shape])?'an':'a'} ${SN[a.shape].toLowerCase()}`)}
 if(a.vinyl&&a.vinyl!==D.vinyl){D.vinyl=a.vinyl;done.push(`switched to ${VN[a.vinyl]}`)}
 if(a.size){const sq=D.shape==='square'||D.shape==='circle';let nw=a.size.w,nh=a.size.one?(sq?a.size.w:r2(a.size.w*D.h/D.w)):a.size.h;if(sq)nh=nw;setSize(nw,nh);done.push(`resized it to ${fmt(D.w)} × ${fmt(D.h)} in`)}
 if(a.tier!=null&&a.tier!==tier){tier=a.tier;done.push(`set the quantity to ${QTY[tier].toLocaleString()}`)}
 if(/new colou?rs|different colou?rs|another palette|surprise|recolou?r|random colou?rs?|other colou?rs/.test(l)){AI.recolorN++;recolor(PALS[AI.recolorN%PALS.length].c,'all');done.push(`tried ${PALS[AI.recolorN%PALS.length].n.toLowerCase()}`)}
 else if(a.colors&&a.colors.length&&!m){const bgOnly=/background|\bbg\b/.test(l)&&a.colors.length===1;recolor(a.colors,bgOnly?'bg':'all');done.push(bgOnly?'changed the background color':'recolored it')}
 if(texts.length){if(/(bigger|larger|increase).*(text|font|words|name)|(text|font|words|name).*(bigger|larger)/.test(l)){texts.forEach(e=>e.size*=1.15);done.push('made the text bigger')}
  if(/(smaller|decrease).*(text|font|words|name)|(text|font|words|name).*smaller/.test(l)){texts.forEach(e=>e.size/=1.15);done.push('made the text smaller')}
  if(/\bbold(er)?\b/.test(l)){texts.forEach(e=>e.bold=true);done.push('made the text bold')}
  if(/outline|stroke/.test(l)&&!/remove/.test(l)){texts.forEach(e=>{e.stroke=lum(e.fill)>.5?'#111827':'#FFFFFF';e.sw=Math.max(2,e.size*.07)});done.push('outlined the text')}
  if(/(curve|arc)/.test(l)&&main&&!String(main.text).includes('\n')){main.curve=main.curve?0:55;main.spacing=Math.max(main.spacing||0,main.curve?8:0);done.push(main.curve?'curved the name':'straightened the name')}
  const fm=FONTS.findIndex(f=>l.includes(f.n.toLowerCase()));if(fm>-1){texts.forEach(e=>e.font=fm);done.push(`set the font to ${FONTS[fm].n}`)}
  else if(/script|handwrit|cursive/.test(l)){main.font=4;done.push('used a script font')}else if(/serif|classic font|elegant font/.test(l)){main.font=0;done.push('used a classic serif')}}
 const am=l.match(/\badd (?:an? |some )?([a-z ]+?)(?: icon| shape| to it| on it|$|,|\.)/);
 if(am&&!/outline|text|border/.test(am[1])){const w=am[1].trim();let k=Object.keys(GFX).find(x=>w.includes(x)||GFX[x].n.toLowerCase().includes(w));if(!k)for(const [r,kk] of ICONW)if(r.test(w)){k=kk;break}
  if(k){const s=Math.min(W(),H())*.22,c=texts.length?texts[0].fill:inkFor(),el=SS({kind:k,w:s,h:s,x:W()/2,y:H()*.22,color:c});D.els.push(el);fitInside(el);done.push(`added ${/^[aeiou]/i.test(GFX[k].n)?'an':'a'} ${GFX[k].n.toLowerCase()}`)}
  else if(/text|words|tagline|slogan/.test(am[1])){addText('sub');done.push('added a line of text')}}
 if(/add (?:a |some )?text|add (?:a )?tagline/.test(l)&&!done.some(x=>x.includes('text'))){const q=p.match(/["“]([^"”]+)["”]/),el=T({text:q?q[1]:'Your tagline',font:3,size:Math.min(W(),H())*.09,fill:inkFor(),x:W()/2,y:H()*.8});D.els.push(el);measureNow(el);fitInside(el);done.push('added a tagline')}
 if(/tidy|clean ?up|center (?:it|everything|the)|fix (?:the )?layout|align everything|straighten/.test(l)){units().forEach(u=>{const b=unionBox(u);shiftUnit(u,W()/2-b.cx,0)});D.els.forEach(e=>{if(outsideSafe(e))fitInside(e)});done.push('tidied the layout')}
 if(/remove (?:the )?(?:white )?(?:background|bg)/.test(l)){const im=D.els.find(e=>e.type==='image');if(im){im.clear=true;await makeClear(im.key)}else D.bg={t:'none',c:D.bg.c,img:null};done.push('removed the background')}
 if(/\b(fill|edge to edge|remove (?:the )?(?:white )?border)\b/.test(l)&&D.els.some(e=>e.type==='image')){removeBorder('fill');done.push('filled the sticker edge to edge')}
 if(!done.length)return false;
 texts.forEach(e=>{measureNow(e);if(outsideSafe(e))fitInside(e)});invalidateText();CT.sig='';commit();syncPanels();req();quickUI();track('builder_ai_edit',{n:done.length});
 gSay(`<p>Done: I ${listJoin(done)}.</p><div class="gchips"><button type="button" class="gchip" data-gundo>Undo</button><button type="button" class="gchip" data-gsend="New colors" data-gdirect="1">Try other colors</button></div>`);return true}

/* ---------- init ---------- */
nbInit();gcInit();
const restored=loadDraft();
D.groups=D.groups||{};
last=snapshot();upThumbs();setTool('move');setLTab(restored?'layers':'assets');
syncPanels();refreshUndo();panelBtns();genieIntro();
new ResizeObserver(()=>req()).observe(vp);req();
if(restored||draftLostImg)setTimeout(()=>toast(draftLostImg?(restored?"Welcome back. Your design was restored, but your uploaded image couldn't be kept. Please upload it again.":"Your uploaded image couldn't be kept. Please upload it again."):'Welcome back. Your last design was restored.'),400);
if(document.fonts){document.fonts.ready.then(()=>{invalidateText();$('#tplGrid').innerHTML=TPL.map((t,i)=>`<button type="button" class="tpl" data-tpl="${i}">${thumbSVG(t.make(),t.n)}${esc(t.n)}</button>`).join('')});if(document.fonts.addEventListener)document.fonts.addEventListener('loadingdone',invalidateText)}
setTimeout(invalidateText,1500);
window.addEventListener('beforeunload',save);
