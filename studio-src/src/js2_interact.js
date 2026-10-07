/* ---------- selection overlay ---------- */
function screenRect(els){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const e of els)for(const c of corners(e)){const s=toScreen(c.x,c.y);x0=Math.min(x0,s.x);y0=Math.min(y0,s.y);x1=Math.max(x1,s.x);y1=Math.max(y1,s.y)}return{left:x0,top:y0,right:x1,bottom:y1,cx:(x0+x1)/2}}
function drawSel(){
 selG.textContent='';guideG.textContent='';draftG.textContent='';pillEl.hidden=true;
 const sw=1.5*K,L=Math.max(W(),H())*3;
 for(const g of guides){if(g.x!=null)guideG.appendChild(mk('line',{class:'gd',x1:g.x,y1:g.a??-L,x2:g.x,y2:g.b??L,'stroke-width':K}));else guideG.appendChild(mk('line',{class:'gd',x1:g.a??-L,y1:g.y,x2:g.b??L,y2:g.y,'stroke-width':K}))}
 if(op&&op.t==='draw'){const b=drawBox(op);if(op.kind==='line')draftG.appendChild(mk('line',{x1:b.ax,y1:b.ay,x2:b.bx,y2:b.by,stroke:'var(--sel)','stroke-width':Math.max(penStyle.sw,1.5*K),'stroke-linecap':'round'}));
  else draftG.appendChild(mk(op.kind==='rect'?'rect':'ellipse',op.kind==='rect'?{x:b.x0,y:b.y0,width:b.w,height:b.h,fill:lastFill,'fill-opacity':.85,stroke:'var(--sel)','stroke-width':sw}:{cx:b.x0+b.w/2,cy:b.y0+b.h/2,rx:b.w/2,ry:b.h/2,fill:lastFill,'fill-opacity':.85,stroke:'var(--sel)','stroke-width':sw}));
  showPill((b.x0+b.w/2-VB[0])/K,(b.y1-VB[1])/K+10,`${f2(b.w/100)} × ${f2(b.h/100)} in`)}
 if(op&&op.t==='pencil'&&op.pts.length>1)draftG.appendChild(mk('path',{d:'M'+op.pts.map(p=>p.x.toFixed(1)+' '+p.y.toFixed(1)).join('L'),fill:'none',stroke:penStyle.stroke,'stroke-width':penStyle.sw,'stroke-linecap':'round','stroke-linejoin':'round'}));
 if(op&&op.t==='marq'){const x0=Math.min(op.p0.x,op.p1.x),y0=Math.min(op.p0.y,op.p1.y);draftG.appendChild(mk('rect',{class:'marq',x:x0,y:y0,width:Math.abs(op.p1.x-op.p0.x),height:Math.abs(op.p1.y-op.p0.y),'stroke-width':K}))}
 if(view==='sheet'||view==='proof'||editing){ft.hidden=true;return}
 if(hover&&!sel.includes(hover)&&!op){const hs=expand(hover).map(get).filter(Boolean);if(hs.length===1){const e=hs[0],s=sz(e);selG.appendChild(mk('rect',{class:'hov',x:-s.w/2,y:-s.h/2,width:s.w,height:s.h,transform:`translate(${e.x} ${e.y}) rotate(${e.rot||0})`,'stroke-width':1.5*K}))}else if(hs.length){const b=unionBox(hs);selG.appendChild(mk('rect',{class:'hov',x:b.x0,y:b.y0,width:b.w,height:b.h,'stroke-width':1.5*K}))}}
 const els=selEls();if(!els.length){ft.hidden=true;return}
 const locked=els.some(e=>e.locked),HS=(COARSE.matches?9:4.5)*K,busy=op&&(op.t==='move'&&op.moved),rotY=22*K;
 const H8=(x,y,n,s)=>mk('rect',{class:'hdl c-'+n,'data-h':n,x:x-(s||HS),y:y-(s||HS),width:2*(s||HS),height:2*(s||HS),rx:1.5*K,'stroke-width':1.3*K});
 if(els.length===1){const e=els[0],{w,h}=sz(e),g=mk('g',{transform:`translate(${e.x} ${e.y}) rotate(${e.rot||0})`});
  g.appendChild(mk('rect',{class:'sbox',x:-w/2,y:-h/2,width:w,height:h,'stroke-width':sw}));
  if(!locked&&!busy){
   g.appendChild(mk('line',{class:'sline',x1:0,y1:-h/2,x2:0,y2:-h/2-rotY,'stroke-width':K}));
   g.appendChild(mk('circle',{class:'hdl rot','data-h':'rot',cx:0,cy:-h/2-rotY,r:HS*1.1,'stroke-width':1.5*K}));
   if(e.type==='line'){g.appendChild(H8(-w/2,0,'w'));g.appendChild(H8(w/2,0,'e'))}
   else{for(const [hx,hy,n] of [[-1,-1,'nw'],[1,-1,'ne'],[1,1,'se'],[-1,1,'sw']])g.appendChild(H8(hx*w/2,hy*h/2,n));
    if(['rect','ellipse','shape','path'].includes(e.type))for(const [hx,hy,n] of [[1,0,'e'],[-1,0,'w'],[0,1,'s'],[0,-1,'n']])g.appendChild(H8(hx*w/2,hy*h/2,n,HS*.85))}}
  selG.appendChild(g);
  if(op&&op.t==='rot'){const p=pt(e,0,-h/2-44*K),t=mk('text',{class:'gdt',x:p.x,y:p.y,'text-anchor':'middle','font-size':12*K});t.textContent=Math.round(e.rot)+'°';selG.appendChild(t)}}
 else{for(const e of els){const s=sz(e);selG.appendChild(mk('rect',{class:'mbox',x:-s.w/2,y:-s.h/2,width:s.w,height:s.h,transform:`translate(${e.x} ${e.y}) rotate(${e.rot||0})`,'stroke-width':K}))}
  const b=unionBox(els);selG.appendChild(mk('rect',{class:'sbox',x:b.x0,y:b.y0,width:b.w,height:b.h,'stroke-width':sw}));
  if(!locked&&!busy){selG.appendChild(mk('line',{class:'sline',x1:b.cx,y1:b.y0,x2:b.cx,y2:b.y0-rotY,'stroke-width':K}));selG.appendChild(mk('circle',{class:'hdl rot','data-h':'rot',cx:b.cx,cy:b.y0-rotY,r:HS*1.1,'stroke-width':1.5*K}));
   for(const [x,y,n] of [[b.x0,b.y0,'nw'],[b.x1,b.y0,'ne'],[b.x1,b.y1,'se'],[b.x0,b.y1,'sw']])selG.appendChild(H8(x,y,n))}}
 const r=screenRect(els),bx=els.length===1?sz(els[0]):unionBox(els);
 if(!(op&&op.t==='draw'))showPill(r.cx,r.bottom+10,locked?'Locked':`${f2((bx.w)/100)} × ${f2((bx.h)/100)} in`);
 placeFt(els,r)}
function showPill(x,y,txt){pillEl.textContent=txt;pillEl.hidden=false;const w=pillEl.offsetWidth;pillEl.style.transform=`translate(${Math.round(x-w/2)}px,${Math.round(Math.min(y,vp.clientHeight-28))}px)`}

/* floating toolbar next to the selection */
function placeFt(els,r){if(op||editing||!editable()||V3.on){ft.hidden=true;return}
 const e=els.length===1?els[0]:null,sig=e?e.type+(e.locked?'L':'')+(e.type==='image'&&e.clear?'c':''):(els.some(x=>x.locked)?'mL':'m')+(els.every(x=>x.gid&&x.gid===els[0].gid)?'g':'');
 if(ft.dataset.sig!==sig){ft.dataset.sig=sig;const B=(a,ic,l,x)=>`<button type="button" class="tool" data-act="${a}" aria-label="${l}" data-tip="${l}"${x||''}><svg class="ico"><use href="#${ic}"/></svg></button>`;let s='';
  if(els.some(x=>x.locked))s=B('lock','i-unlock','Unlock');
  else if(e){if(e.type==='text')s+=B('edit','i-pencil','Edit text')+B('smaller','i-minus','Smaller')+B('bigger','i-plus','Bigger')+`<button type="button" class="chip" data-paint="fill" aria-label="Text color" data-tip="Color"></button>`;
   else if(e.type==='image')s+=B('replace','i-swap','Replace image')+B('clearBg','i-wand','Remove white background',` aria-pressed="${!!e.clear}"`)+B('fillEdge','i-fill','Fill sticker edge to edge');
   else if(e.type==='line')s+=`<button type="button" class="chip" data-paint="stroke" aria-label="Line color" data-tip="Color"></button>`;
   else s+=`<button type="button" class="chip" data-paint="${hasFill(e)||!hasStroke(e)?'fill':'stroke'}" aria-label="Color" data-tip="Color"></button>`}
  else{s+=(sig.endsWith('g')?B('ungroup','t-group','Ungroup'):B('group','t-group','Group selection'))+B('alignCH','a-ch','Align centers')+B('alignCV','a-cv','Align middles')}
  if(!els.some(x=>x.locked))s+='<span class="sep"></span>'+B('dup','i-copy','Duplicate')+B('del','i-trash','Delete')+B('menu','i-dots','More actions');
  ft.innerHTML=s}
 ft.hidden=false;$$('[data-paint]',ft).forEach(c=>{const k=c.dataset.paint,v=e?e[k]:'none';c.style.background=v&&v!=='none'?v:'';c.classList.toggle('none',!v||v==='none')});
 const vw=vp.clientWidth,vh=vp.clientHeight,fw=ft.offsetWidth,fh=ft.offsetHeight;let left,top;
 if(NARROW.matches){left=(vw-fw)/2;top=8}else{top=r.top-fh-36;if(top<8)top=r.bottom+40;top=clamp(top,8,vh-fh-8);left=clamp(r.cx-fw/2,8,vw-fw-8)}
 ft.style.transform=`translate(${Math.round(left)}px,${Math.round(top)}px)`}

/* ---------- rulers ---------- */
let rulCol=null;
function rulers(){if(!showRulers||NARROW.matches)return;drawRuler($('#rulX'),'x');drawRuler($('#rulY'),'y')}
function drawRuler(c,ax){const dpr=devicePixelRatio||1,rw=c.clientWidth,rh=c.clientHeight;if(!rw||!rh)return;
 if(c.width!==Math.round(rw*dpr)||c.height!==Math.round(rh*dpr)){c.width=Math.round(rw*dpr);c.height=Math.round(rh*dpr)}
 const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);
 if(!rulCol){const cs=getComputedStyle(studio);rulCol={bg:cs.getPropertyValue('--surface').trim(),tk:cs.getPropertyValue('--ink-4').trim(),tx:cs.getPropertyValue('--ink-3').trim(),hl:cs.getPropertyValue('--accent-soft').trim(),ac:cs.getPropertyValue('--accent').trim()}}
 const C=rulCol,len=ax==='x'?rw:rh,o=ax==='x'?VB[0]:VB[1],th=ax==='x'?rh:rw;x.fillStyle=C.bg;x.fillRect(0,0,rw,rh);
 const els=selEls();if(els.length&&editable()){const b=unionBox(els),a=((ax==='x'?b.x0:b.y0)-o)/K,e2=((ax==='x'?b.x1:b.y1)-o)/K;x.fillStyle=C.hl;if(ax==='x')x.fillRect(a,0,e2-a,rh);else x.fillRect(0,a,rw,e2-a)}
 const st=[6.25,12.5,25,50,100,200,500].find(s=>s/K>=7)||500,major=[25,50,100,200,500,1000].find(s=>s/K>=46)||1000;
 x.strokeStyle=C.tk;x.fillStyle=C.tx;x.lineWidth=1;x.font='500 9.5px Poppins, system-ui, sans-serif';x.beginPath();
 const i0=Math.floor(o/st),i1=Math.ceil((o+len*K)/st);
 for(let i=i0;i<=i1;i++){const v=i*st,p=Math.round((v-o)/K)+.5,isM=Math.abs(v/major-Math.round(v/major))<1e-6,isH=!isM&&Math.abs(v/(major/2)-Math.round(v/(major/2)))<1e-6,tl=isM?th*.62:isH?th*.4:th*.24;
  if(ax==='x'){x.moveTo(p,rh);x.lineTo(p,rh-tl)}else{x.moveTo(rw,p);x.lineTo(rw-tl,p)}
  if(isM){const t=f2(v/100);if(ax==='x')x.fillText(t,p+3,9);else{x.save();x.translate(9,p-3);x.rotate(-Math.PI/2);x.fillText(t,0,0);x.restore()}}}
 x.stroke()}

/* ---------- render loop ---------- */
let rq=0;function req(){if(!rq)rq=requestAnimationFrame(()=>{rq=0;render()})}
function render(){svg.dataset.view=view;syncEls();camera();artboard();drawSel();dims();rulers();chrome();proofUI();if(D.shape==='custom'){schedContour();schedThumbs()}if(view==='dome')v3dSync()}
const isBlank=()=>!D.els.length&&D.bg.t==='none';

/* ---------- tools ---------- */
let lastFill='#21C8E2';const penStyle={stroke:'#111827',sw:4};
function setTool(t){if(view!=='edit'&&t!=='move'&&t!=='hand')setView('edit');tool=t;$$('.tbar [data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===t)));vp.dataset.tool=t;if(t!=='move'){hover=null}if(t==='text'||t==='rect'||t==='ellipse'||t==='line'||t==='pencil'){startDismissed=true;if(editing)inl.blur()}req();syncPanels()}
$$('.tbar [data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));

/* ---------- pointer interaction ---------- */
function toW(ev){const r=vp.getBoundingClientRect();return{x:VB[0]+(ev.clientX-r.left)*K,y:VB[1]+(ev.clientY-r.top)*K}}
function hitTest(p){const tol=4*K;for(let i=D.els.length-1;i>=0;i--){const e=D.els[i];if(e.hidden||e.locked)continue;const {w,h}=sz(e),a=-(e.rot||0)*Math.PI/180,dx=p.x-e.x,dy=p.y-e.y,lx=dx*Math.cos(a)-dy*Math.sin(a),ly=dx*Math.sin(a)+dy*Math.cos(a);
 if(e.type==='line'){if(Math.abs(lx)<=e.w/2+tol&&Math.abs(ly)<=Math.max(e.sw/2,4*K)+tol)return e;continue}
 if(Math.abs(lx)<=w/2+tol&&Math.abs(ly)<=h/2+tol)return e}return null}
function setSel(ids,quiet){sel=[...new Set(ids)].filter(id=>get(id));if(!sel.some(id=>{const e=get(id);return e.gid&&e.gid===gfocus}))gfocus=null;hover=null;if(editing&&!sel.includes(editing))inl.blur();syncPanels();req();if(!quiet){const e=sel.length===1?get(sel[0]):null;say(e?`Selected ${label(e)}`:sel.length?`${sel.length} items selected`:'Nothing selected')}}
function drawBox(o){let ax=o.p0.x,ay=o.p0.y,bx=o.p1.x,by=o.p1.y;
 if(o.kind==='line'){if(o.shift){const a=Math.round(Math.atan2(by-ay,bx-ax)/(Math.PI/12))*(Math.PI/12),d=Math.hypot(bx-ax,by-ay);bx=ax+d*Math.cos(a);by=ay+d*Math.sin(a)}if(o.alt){ax=2*o.p0.x-bx;ay=2*o.p0.y-by}return{ax,ay,bx,by,x0:Math.min(ax,bx),y0:Math.min(ay,by),x1:Math.max(ax,bx),y1:Math.max(ay,by),w:Math.hypot(bx-ax,by-ay),h:0}}
 let w=Math.abs(bx-ax),h=Math.abs(by-ay);if(o.shift){const m=Math.max(w,h);w=h=m}const sx=bx<ax?-1:1,sy=by<ay?-1:1;let x0,y0;
 if(o.alt){x0=ax-w;y0=ay-h;w*=2;h*=2}else{x0=sx>0?ax:ax-w;y0=sy>0?ay:ay-h}return{x0,y0,x1:x0+w,y1:y0+h,w,h}}
function snapBox(b,ids){const T0=6*K,set=new Set(ids),Wd=W(),Hd=H(),tx=[[0,0,Hd],[Wd/2,0,Hd],[Wd,0,Hd]],ty=[[0,0,Wd],[Hd/2,0,Wd],[Hd,0,Wd]];
 if(D.shape!=='custom'){tx.push([SAFE,0,Hd],[Wd-SAFE,0,Hd]);ty.push([SAFE,0,Wd],[Hd-SAFE,0,Wd])}
 for(const o of D.els){if(set.has(o.id)||o.hidden)continue;const ob=bbox(o);for(const v of [ob.x0,(ob.x0+ob.x1)/2,ob.x1])tx.push([v,ob.y0,ob.y1]);for(const v of [ob.y0,(ob.y0+ob.y1)/2,ob.y1])ty.push([v,ob.x0,ob.x1])}
 let bx=null,dx=T0,by=null,dy=T0;
 for(const c of [b.x0,(b.x0+b.x1)/2,b.x1])for(const t of tx){const d=Math.abs(c-t[0]);if(d<dx){dx=d;bx={off:t[0]-c,t}}}
 for(const c of [b.y0,(b.y0+b.y1)/2,b.y1])for(const t of ty){const d=Math.abs(c-t[0]);if(d<dy){dy=d;by={off:t[0]-c,t}}}
 const g=[],ox=bx?bx.off:0,oy=by?by.off:0;
 if(bx)g.push({x:bx.t[0],a:Math.min(bx.t[1],b.y0+oy)-8*K,b:Math.max(bx.t[2],b.y1+oy)+8*K});
 if(by)g.push({y:by.t[0],a:Math.min(by.t[1],b.x0+ox)-8*K,b:Math.max(by.t[2],b.x1+ox)+8*K});
 return{dx:ox,dy:oy,g}}
const pointers=new Map();
svg.addEventListener('pointerdown',ev=>{
 if(editing)inl.blur();closePop();hideTip();
 pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
 if(pointers.size===2){const [a,b]=[...pointers.values()];op={t:'pinch',d0:Math.hypot(a.x-b.x,a.y-b.y),z0:zoom,m0:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},cam0:curCam()};return}
 if(ev.button===2)return;
 svg.focus({preventScroll:true});
 const p=toW(ev);
 const cap=()=>{try{svg.setPointerCapture(ev.pointerId)}catch(err){}};
 if(view!=='edit'||ev.button===1||tool==='hand'||spaceDown){op={t:'pan',c0:{x:ev.clientX,y:ev.clientY},cam0:curCam(),moved:false,click:!(ev.button===1||tool==='hand'||spaceDown)};vp.classList.add('panning');cap();return}
 if(tool==='rect'||tool==='ellipse'||tool==='line'){op={t:'draw',kind:tool,p0:p,p1:p,shift:ev.shiftKey,alt:ev.altKey};cap();req();return}
 if(tool==='pencil'){op={t:'pencil',pts:[p]};cap();req();return}
 if(tool==='text'){const e=T({text:'Your text',size:Math.max(18,Math.min(W(),H())*.13),fill:inkFor(),x:p.x,y:p.y});addEl(e,'text_tool');setTool('move');requestAnimationFrame(()=>requestAnimationFrame(()=>startEdit(e.id)));return}
 const hd=ev.target.getAttribute&&ev.target.getAttribute('data-h'),els=selEls();
 if(hd&&els.length&&!els.some(e=>e.locked)){startHandle(hd,p,els);cap();req();return}
 const hit=hitTest(p);
 if(hit){const ids=expand(hit.id),add=ev.shiftKey||ev.metaKey||ev.ctrlKey;
  if(add){const on=ids.every(id=>sel.includes(id));setSel(on?sel.filter(id=>!ids.includes(id)):[...sel,...ids]);if(on){req();return}}
  else if(!sel.includes(hit.id))setSel(ids);
  op={t:'move',p0:p,moved:false,alt:ev.altKey}}
 else{if(gfocus)gfocus=null;op={t:'marq',p0:p,p1:p,add:ev.shiftKey||ev.metaKey||ev.ctrlKey,base:sel.slice(),moved:false}}
 cap();req()});
function startHandle(hd,p,els){
 if(els.length===1){const e=els[0],{w,h}=sz(e);
  if(hd==='rot'){op={t:'rot',id:e.id,a0:Math.atan2(p.y-e.y,p.x-e.x),r0:e.rot||0};return}
  if(e.type==='line'){op={t:'lineEnd',id:e.id,A:pt(e,hd==='e'?-e.w/2:e.w/2,0)};return}
  const M={nw:[-1,-1],ne:[1,-1],se:[1,1],sw:[-1,1],e:[1,0],w:[-1,0],n:[0,-1],s:[0,1]}[hd];
  op={t:'resize',id:e.id,M,w0:w,h0:h,size0:e.size,A:pt(e,-M[0]*w/2,-M[1]*h/2),C:{x:e.x,y:e.y}};return}
 const b=unionBox(els),start=els.map(e=>({id:e.id,x:e.x,y:e.y,w:e.w,h:e.h,size:e.size,rot:e.rot||0,sw:e.sw}));
 if(hd==='rot'){op={t:'mrot',c:{x:b.cx,y:b.cy},a0:Math.atan2(p.y-b.cy,p.x-b.cx),start};return}
 const M={nw:[-1,-1],ne:[1,-1],se:[1,1],sw:[-1,1]}[hd],A={x:M[0]>0?b.x0:b.x1,y:M[1]>0?b.y0:b.y1},Cc={x:M[0]>0?b.x1:b.x0,y:M[1]>0?b.y1:b.y0};
 op={t:'mscale',A,V:{x:Cc.x-A.x,y:Cc.y-A.y},C:{x:b.cx,y:b.cy},start}}
svg.addEventListener('pointermove',ev=>{
 if(pointers.has(ev.pointerId))pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
 if(op&&op.t==='pinch'){if(pointers.size<2)return;const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y),r=vp.getBoundingClientRect();zoom=op.z0;cam=op.cam0;zoomTo(op.z0*d/op.d0,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);return}
 if(!op){if(ev.pointerType==='mouse'&&tool==='move'&&editable()){const h=hitTest(toW(ev)),id=h?h.id:null;if(id!==hover){hover=id;req()}}return}
 const p=toW(ev);
 if(op.t==='pan'){const dx=ev.clientX-op.c0.x,dy=ev.clientY-op.c0.y;if(!op.moved&&Math.hypot(dx,dy)<4)return;op.moved=true;cam={x:op.cam0.x-dx*K,y:op.cam0.y-dy*K};req();return}
 if(op.t==='draw'){op.p1=p;op.shift=ev.shiftKey;op.alt=ev.altKey;req();return}
 if(op.t==='pencil'){const l=op.pts[op.pts.length-1];if(Math.hypot(p.x-l.x,p.y-l.y)>=1.5*K){op.pts.push(p);req()}return}
 if(op.t==='marq'){op.p1=p;if(!op.moved&&Math.hypot(p.x-op.p0.x,p.y-op.p0.y)<3*K)return;op.moved=true;const x0=Math.min(op.p0.x,p.x),y0=Math.min(op.p0.y,p.y),x1=Math.max(op.p0.x,p.x),y1=Math.max(op.p0.y,p.y);
  const hit=D.els.filter(e=>{if(e.hidden||e.locked)return false;const b=bbox(e);return b.x1>=x0&&b.x0<=x1&&b.y1>=y0&&b.y0<=y1}).flatMap(e=>expand(e.id));
  sel=[...new Set([...(op.add?op.base:[]),...hit])];syncPanels();req();return}
 if(op.t==='move'){let dx=p.x-op.p0.x,dy=p.y-op.p0.y;if(!op.moved&&Math.hypot(dx,dy)<3*K)return;
  if(!op.moved){op.moved=true;if(op.alt){dupSel(0);}op.start=selEls().map(e=>({id:e.id,x:e.x,y:e.y}));op.box=unionBox(selEls())}
  if(ev.shiftKey){if(Math.abs(dx)>Math.abs(dy))dy=0;else dx=0}
  const b=op.box,s=ev.ctrlKey||ev.metaKey?{dx:0,dy:0,g:[]}:snapBox({x0:b.x0+dx,y0:b.y0+dy,x1:b.x1+dx,y1:b.y1+dy},sel);
  for(const st of op.start){const e=get(st.id);if(e){e.x=st.x+dx+s.dx;e.y=st.y+dy+s.dy}}guides=s.g;ft.hidden=true;req();return}
 if(op.t==='rot'){const e=get(op.id);let r=op.r0+(Math.atan2(p.y-e.y,p.x-e.x)-op.a0)*180/Math.PI;if(ev.shiftKey)r=Math.round(r/15)*15;else{const n=Math.round(r/90)*90;if(Math.abs(r-n)<3)r=n}e.rot=Math.round((((r+180)%360+360)%360-180)*10)/10;op.moved=true;req();return}
 if(op.t==='mrot'){let da=(Math.atan2(p.y-op.c.y,p.x-op.c.x)-op.a0)*180/Math.PI;if(ev.shiftKey)da=Math.round(da/15)*15;const a=da*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  for(const st of op.start){const e=get(st.id),dx=st.x-op.c.x,dy=st.y-op.c.y;e.x=op.c.x+dx*c-dy*s;e.y=op.c.y+dx*s+dy*c;e.rot=Math.round((((st.rot+da+180)%360+360)%360-180)*10)/10}op.moved=true;req();return}
 if(op.t==='mscale'){const A=ev.altKey?op.C:op.A,V=ev.altKey?{x:op.V.x/2,y:op.V.y/2}:op.V,dd=V.x*V.x+V.y*V.y;let t=((p.x-A.x)*V.x+(p.y-A.y)*V.y)/dd;t=Math.max(t,.05);
  for(const st of op.start){const e=get(st.id);e.x=A.x+(st.x-A.x)*t;e.y=A.y+(st.y-A.y)*t;if(e.type==='text')e.size=st.size*t;else{e.w=st.w*t;if(e.type!=='line')e.h=st.h*t}}op.moved=true;req();return}
 if(op.t==='lineEnd'){const e=get(op.id);let bx=p.x,by=p.y;if(ev.shiftKey){const a=Math.round(Math.atan2(by-op.A.y,bx-op.A.x)/(Math.PI/12))*(Math.PI/12),d=Math.hypot(bx-op.A.x,by-op.A.y);bx=op.A.x+d*Math.cos(a);by=op.A.y+d*Math.sin(a)}
  e.w=Math.max(4,Math.hypot(bx-op.A.x,by-op.A.y));e.rot=Math.round(Math.atan2(by-op.A.y,bx-op.A.x)*1800/Math.PI)/10;e.x=(bx+op.A.x)/2;e.y=(by+op.A.y)/2;op.moved=true;req();return}
 if(op.t==='resize'){const e=get(op.id),M=op.M,a=(e.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),alt=ev.altKey,an=alt?op.C:op.A,f=alt?2:1;
  const dx=p.x-an.x,dy=p.y-an.y,lx=dx*c+dy*s,ly=-dx*s+dy*c;let nw=op.w0,nh=op.h0;
  if(M[0])nw=Math.max(4,lx*M[0]*f);if(M[1])nh=Math.max(4,ly*M[1]*f);
  const keep=e.type==='text'||(e.type==='image'?!ev.shiftKey:ev.shiftKey);
  if(keep&&M[0]&&M[1]){const t=Math.max(nw/op.w0,nh/op.h0);nw=op.w0*t;nh=op.h0*t}
  if(e.type==='text')e.size=clamp(op.size0*nw/op.w0,2,1400);else{e.w=nw;e.h=nh}
  if(alt){e.x=op.C.x;e.y=op.C.y}else{const hx=M[0]*nw/2,hy=M[1]*nh/2;e.x=an.x+hx*c-hy*s;e.y=an.y+hx*s+hy*c}
  op.moved=true;req()}});
function endOp(ev){if(ev)pointers.delete(ev.pointerId);if(!op)return;const o=op;op=null;guides=[];vp.classList.remove('panning');
 if(o.t==='pinch'){return}
 if(o.t==='pan'){if(!o.moved&&o.click&&editable())setSel([]);req();return}
 if(o.t==='marq'){if(!o.moved&&!o.add)setSel([]);else syncPanels();req();return}
 if(o.t==='draw'){const b=drawBox(o),tiny=Math.max(b.w,b.h)/K<6,m=Math.min(W(),H())*.36;let e;
  if(o.kind==='line'){e=tiny?L({w:m*1.2,x:o.p0.x,y:o.p0.y,stroke:penStyle.stroke,sw:penStyle.sw}):L({w:b.w,x:(b.ax+b.bx)/2,y:(b.ay+b.by)/2,rot:Math.round(Math.atan2(b.by-b.ay,b.bx-b.ax)*1800/Math.PI)/10,stroke:penStyle.stroke,sw:penStyle.sw})}
  else{const F=o.kind==='rect'?R:E;e=tiny?F({w:m,h:m,x:o.p0.x,y:o.p0.y,fill:lastFill}):F({w:b.w,h:b.h,x:b.x0+b.w/2,y:b.y0+b.h/2,fill:lastFill})}
  addEl(e,'draw_'+o.kind);setTool('move');return}
 if(o.t==='pencil'){if(o.pts.length>1){const pts=simplify(o.pts,.6*K);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const q of pts){x0=Math.min(x0,q.x);y0=Math.min(y0,q.y);x1=Math.max(x1,q.x);y1=Math.max(y1,q.y)}
  const w=Math.max(x1-x0,1),h=Math.max(y1-y0,1),e=P({x:x0+w/2,y:y0+h/2,w,h,pts:pts.map(q=>[(q.x-x0)/w,(q.y-y0)/h]),stroke:penStyle.stroke,sw:penStyle.sw});
  D.els.push(e);startDismissed=true;started=true;track('builder_add_item',{item_type:'path',method:'pencil'});CT.sig='';commit()}req();return}
 if(o.moved){CT.sig='';commit();syncPanels()}else if(o.t==='move'&&!o.add){const p=toW(ev||{clientX:0,clientY:0}),hit=hitTest(p);if(hit&&sel.length>1&&!(ev&&(ev.shiftKey||ev.metaKey||ev.ctrlKey)))setSel(expand(hit.id))}
 req()}
svg.addEventListener('pointerup',endOp);svg.addEventListener('pointercancel',endOp);
svg.addEventListener('pointerleave',()=>{if(hover&&!op){hover=null;req()}});
function simplify(pts,eps){if(pts.length<3)return pts;const dist=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;if(!l)return Math.hypot(p.x-a.x,p.y-a.y);const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l,0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)};
 const rdp=(s,e)=>{let m=0,i0=-1;for(let i=s+1;i<e;i++){const d=dist(pts[i],pts[s],pts[e]);if(d>m){m=d;i0=i}}return m>eps?[...rdp(s,i0).slice(0,-1),...rdp(i0,e)]:[pts[s],pts[e]]};return rdp(0,pts.length-1)}
svg.addEventListener('dblclick',ev=>{if(tool!=='move'||!editable())return;const p=toW(ev);const h=hitTest(p);if(!h)return;
 if(h.gid&&gfocus!==h.gid){gfocus=h.gid;setSel([h.id]);if(h.type==='text')startEdit(h.id);return}
 if(h.type==='text')startEdit(h.id);else if(h.type==='image'){replTarget=h.id;$('#replFile').click()}});
svg.addEventListener('contextmenu',ev=>{ev.preventDefault();if(!editable())return;const h=hitTest(toW(ev));if(h&&!sel.includes(h.id))setSel(expand(h.id));if(!h&&!ev.shiftKey)setSel([]);openCtxMenu(ev.clientX,ev.clientY)});
vp.addEventListener('wheel',ev=>{ev.preventDefault();const r=vp.getBoundingClientRect();if(ev.ctrlKey||ev.metaKey){zoomTo(zoom*Math.exp(-ev.deltaY*.0022),ev.clientX-r.left,ev.clientY-r.top)}else{const c=curCam(),dx=ev.shiftKey&&!ev.deltaX?ev.deltaY:ev.deltaX,dy=ev.shiftKey&&!ev.deltaX?0:ev.deltaY;cam={x:c.x+dx*K,y:c.y+dy*K};req()}},{passive:false});

/* ---------- commands ---------- */
function units(){const out=[],seen=new Set();for(const e of D.els){if(e.gid&&gfocus!==e.gid){if(seen.has(e.gid))continue;seen.add(e.gid);out.push(groupOf(e.gid))}else out.push([e])}return out}
function selUnits(){const s=new Set(sel);return units().filter(u=>u.some(e=>s.has(e.id)))}
function tidyGroups(){D.groups=D.groups||{};const cnt={};D.els.forEach(e=>{if(e.gid)cnt[e.gid]=(cnt[e.gid]||0)+1});D.els.forEach(e=>{if(e.gid&&cnt[e.gid]<2)e.gid=null});for(const g in D.groups)if(!cnt[g]||cnt[g]<2)delete D.groups[g];if(gfocus&&!cnt[gfocus])gfocus=null}
function reorder(kind){const g=gfocus&&selEls().length&&selEls().every(e=>e.gid===gfocus)?gfocus:null;let list=g?groupOf(g).map(e=>[e]):units();const s=new Set(sel),isS=u=>u.some(e=>s.has(e.id));
 if(kind==='front')list=[...list.filter(u=>!isS(u)),...list.filter(isS)];
 else if(kind==='bottom')list=[...list.filter(isS),...list.filter(u=>!isS(u))];
 else if(kind==='fwd'){for(let i=list.length-2;i>=0;i--)if(isS(list[i])&&!isS(list[i+1]))[list[i],list[i+1]]=[list[i+1],list[i]]}
 else for(let i=1;i<list.length;i++)if(isS(list[i])&&!isS(list[i-1]))[list[i],list[i-1]]=[list[i-1],list[i]];
 const flat=list.flat();if(g){const idx=D.els.findIndex(e=>e.gid===g),rest=D.els.filter(e=>e.gid!==g);rest.splice(idx,0,...flat);D.els=rest}else D.els=flat}
function shiftUnit(u,dx,dy){u.forEach(e=>{e.x+=dx;e.y+=dy})}
function align(kind){const us=selUnits();if(!us.length)return;const tgt=us.length>1?unionBox(us.flat()):{x0:0,y0:0,x1:W(),y1:H(),cx:W()/2,cy:H()/2};
 for(const u of us){const b=unionBox(u);const d={l:[tgt.x0-b.x0,0],ch:[tgt.cx-b.cx,0],r:[tgt.x1-b.x1,0],t:[0,tgt.y0-b.y0],cv:[0,tgt.cy-b.cy],b:[0,tgt.y1-b.y1]}[kind];shiftUnit(u,d[0],d[1])}}
function distribute(ax){const us=selUnits();if(us.length<3)return;const bs=us.map(u=>({u,b:unionBox(u)}));const k0=ax==='h'?'x0':'y0',k1=ax==='h'?'x1':'y1',sz2=ax==='h'?'w':'h';bs.sort((a,b)=>(a.b[k0]+a.b[k1])-(b.b[k0]+b.b[k1]));
 const span=bs[bs.length-1].b[k1]-bs[0].b[k0],sum=bs.reduce((s,x)=>s+x.b[sz2],0),gap=(span-sum)/(bs.length-1);let pos=bs[0].b[k0];
 for(const x of bs){const d=pos-x.b[k0];shiftUnit(x.u,ax==='h'?d:0,ax==='h'?0:d);pos+=x.b[sz2]+gap}}
function cloneEls(els,off){const gm={};return els.map(e=>{const c=JSON.parse(JSON.stringify(e));c.id=nid();if(c.gid){gm[c.gid]=gm[c.gid]||'g'+nid();c.gid=gm[c.gid]}c.x+=off;c.y+=off;return c})}
function dupSel(off){const els=selEls();if(!els.length)return;const top=Math.max(...els.map(e=>D.els.indexOf(e))),cs=cloneEls(els,off);(D.groups=D.groups||{});cs.forEach(c=>{if(c.gid&&!D.groups[c.gid])D.groups[c.gid]={name:'Group '+(Object.keys(D.groups).length+1)}});D.els.splice(top+1,0,...cs);sel=cs.map(c=>c.id)}
function pasteEls(){if(!clip||!clip.length)return;const cs=cloneEls(clip,clip._n=(clip._n||0)+12);(D.groups=D.groups||{});cs.forEach(c=>{if(c.gid&&!D.groups[c.gid])D.groups[c.gid]={name:'Group '+(Object.keys(D.groups).length+1)}});D.els.push(...cs);startDismissed=true;setSel(cs.map(c=>c.id));CT.sig='';commit();toast(`Pasted ${cs.length===1?label(cs[0]):cs.length+' items'}`)}
const STYLE_KEYS=['fill','stroke','sw','opacity','radius','font','size','bold','ital','spacing','lineH','align'];
const CMD={
 edit(){const e=one();if(e&&e.type==='text')startEdit(e.id)},
 smaller(){selEls().forEach(e=>{if(e.type==='text')e.size=clamp(e.size/1.1,2,1400);else{e.w/=1.1;if(e.type!=='line')e.h/=1.1}})},
 bigger(){selEls().forEach(e=>{if(e.type==='text')e.size=clamp(e.size*1.1,2,1400);else{e.w*=1.1;if(e.type!=='line')e.h*=1.1}})},
 dup(){dupSel(12)},
 del(){const n=sel.length;if(!n)return;const ids=new Set(sel);D.els=D.els.filter(e=>!ids.has(e.id));sel=[];toast(n===1?'Deleted.':`Deleted ${n} items.`,'Undo',undo)},
 copy(){const els=selEls();if(!els.length)return;clip=JSON.parse(JSON.stringify(els));clip._n=0;toast(els.length===1?`Copied ${label(els[0])}`:`Copied ${els.length} items`);return 'nocommit'},
 cut(){CMD.copy();const ids=new Set(sel);D.els=D.els.filter(e=>!ids.has(e.id));sel=[]},
 paste(){pasteEls();return 'nocommit'},
 front(){reorder('front')},fwd(){reorder('fwd')},back(){reorder('back')},bottom(){reorder('bottom')},
 group(){const els=selEls();if(els.length<2)return;D.groups=D.groups||{};const gid='g'+nid(),ids=new Set(sel),top=Math.max(...els.map(e=>D.els.indexOf(e))),below=D.els.slice(0,top).filter(e=>!ids.has(e.id)).length,members=D.els.filter(e=>ids.has(e.id)),rest=D.els.filter(e=>!ids.has(e.id));
  members.forEach(e=>e.gid=gid);rest.splice(below,0,...members);D.els=rest;D.groups[gid]={name:'Group '+(Object.keys(D.groups).length+1),open:true};gfocus=null;toast('Grouped. Double-click to edit inside the group.')},
 ungroup(){const gs=new Set(selEls().map(e=>e.gid).filter(Boolean));if(!gs.size)return;D.els.forEach(e=>{if(gs.has(e.gid))e.gid=null});gs.forEach(g=>delete D.groups[g]);gfocus=null},
 flipH(){const els=selEls();if(!els.length)return;const b=unionBox(els);els.forEach(e=>{e.x=2*b.cx-e.x;e.rot=-(e.rot||0);e.flipX=!e.flipX})},
 flipV(){const els=selEls();if(!els.length)return;const b=unionBox(els);els.forEach(e=>{e.y=2*b.cy-e.y;e.rot=-(e.rot||0);e.flipY=!e.flipY})},
 lock(){const els=selEls();const on=!els.every(e=>e.locked);els.forEach(e=>e.locked=on);toast(on?'Locked. Unlock it from Layers or the menu.':'Unlocked.')},
 hide(){const els=selEls();const on=!els.every(e=>e.hidden);els.forEach(e=>e.hidden=on);if(on){sel=[];toast('Hidden. Hidden layers don\'t print.')}},
 alignL(){align('l')},alignCH(){align('ch')},alignR(){align('r')},alignT(){align('t')},alignCV(){align('cv')},alignB(){align('b')},
 distH(){distribute('h')},distV(){distribute('v')},
 center(){const us=selUnits();us.forEach(u=>{const b=unionBox(u);shiftUnit(u,W()/2-b.cx,H()/2-b.cy)})},
 selectAll(){setSel(D.els.filter(e=>!e.hidden&&!e.locked).map(e=>e.id));return 'nocommit'},
 copyStyle(){const e=one()||selEls()[0];if(!e)return;styleClip={};STYLE_KEYS.forEach(k=>{if(e[k]!==undefined)styleClip[k]=e[k]});toast('Style copied. Paste it with Ctrl+Alt+V.');return 'nocommit'},
 pasteStyle(){if(!styleClip)return;selEls().forEach(e=>{for(const k in styleClip)if(e[k]!==undefined&&!(k==='size'&&e.type!=='text'))e[k]=styleClip[k]})},
 replace(){const e=one();if(e&&e.type==='image'){replTarget=e.id;$('#replFile').click()}return 'nocommit'},
 clearBg(){const e=one();if(!e||e.type!=='image')return;e.clear=!e.clear;if(e.clear)makeClear(e.key).then(()=>{CT.sig='';syncPanels();req()})},
 fillEdge(){removeBorder('fill');return 'nocommit'},
 fitArt(){removeBorder('fit');return 'nocommit'},
 menu(){const b=$('[data-act="menu"]',ft).getBoundingClientRect();openCtxMenu(b.left,b.bottom+6);return 'nocommit'},
 rename(){const e=one();if(e)renameLayer(e.id);return 'nocommit'}};
function act(name){const f=CMD[name];if(!f)return;const r=f();if(r!=='nocommit'){tidyGroups();CT.sig='';commit()}syncPanels();req()}

/* ---------- inline text editing ---------- */
function startEdit(id){const e=get(id);if(!e||e.type!=='text'||e.locked)return;if(!editable())setView('edit');editing=id;sel=[id];inl.value=e.text;inl.hidden=false;ft.hidden=true;render();posInl();inl.focus();inl.select()}
function posInl(){const e=get(editing);if(!e)return;const f=FONTS[e.font]||FONTS[3],c=toScreen(e.x,e.y),px=1/K;
 Object.assign(inl.style,{fontFamily:f.f,fontWeight:e.bold?700:f.w,fontStyle:e.ital?'italic':'normal',fontSize:(e.size*px)+'px',letterSpacing:((e.spacing||0)/100)+'em',lineHeight:String(e.lineH||1.15),color:hasFill(e)?e.fill:'#111827',textAlign:e.align||'center'});
 inl.rows=Math.max(1,inl.value.split('\n').length);inl.style.width='20px';inl.style.height='auto';const w=Math.max(inl.scrollWidth+14,60);inl.style.width=w+'px';inl.style.height=inl.scrollHeight+'px';
 inl.style.transform=`translate(${c.x-w/2}px,${c.y-inl.offsetHeight/2}px) rotate(${e.rot||0}deg)`;inl.style.textShadow=lum(e.fill)>.7?'0 0 2px rgba(0,0,0,.6)':'none'}
function endEdit(){if(!editing)return;const e=get(editing);editing=null;inl.hidden=true;if(e&&!e.text.trim()){D.els.splice(D.els.indexOf(e),1);sel=[]}CT.sig='';commit();syncPanels();req()}
inl.addEventListener('input',()=>{const e=get(editing);if(!e)return;e.text=inl.value;render();posInl()});
inl.addEventListener('blur',endEdit);
inl.addEventListener('keydown',e=>{if(e.key==='Escape'||(e.key==='Enter'&&(e.ctrlKey||e.metaKey))){e.preventDefault();inl.blur();svg.focus({preventScroll:true})}e.stopPropagation()});

/* ---------- keyboard ---------- */
const typing=t=>t&&t.closest&&t.closest('input,textarea,select,[contenteditable="true"]');
document.addEventListener('keydown',ev=>{const t=ev.target;if(typing(t))return;if($('#reviewDlg').open||$('#keysDlg').open)return;
 if(!studio.contains(t)&&t!==document.body&&!(t&&t.closest&&t.closest('.pop')))return;
 const mod=ev.ctrlKey||ev.metaKey,c=ev.code,k=ev.key;
 if(k===' '&&!ev.repeat&&!mod){ev.preventDefault();spaceDown=true;vp.classList.add('panning');return}
 if(mod&&c==='KeyZ'){ev.preventDefault();ev.shiftKey?redo():undo();return}
 if(mod&&c==='KeyY'){ev.preventDefault();redo();return}
 if(mod&&(k==='='||k==='+')){ev.preventDefault();zoomTo(zoom*1.25);return}
 if(mod&&k==='-'){ev.preventDefault();zoomTo(zoom/1.25);return}
 if(mod&&c==='Digit0'){ev.preventDefault();zoomActual();return}
 if(ev.shiftKey&&!mod&&c==='Digit1'){ev.preventDefault();fit();return}
 if(ev.shiftKey&&!mod&&c==='Digit2'){ev.preventDefault();zoomSel();return}
 if(ev.shiftKey&&!mod&&c==='Digit0'){ev.preventDefault();zoomActual();return}
 if(mod&&c==='Backslash'){ev.preventDefault();togglePanels();return}
 if(view!=='edit'){/* previews are read-only: only undo/redo, help, Escape and tool keys (which return to Design) */
  if(k==='?'||(ev.shiftKey&&c==='Slash')){ev.preventDefault();openKeys();return}
  if(k==='Escape'){closePop();return}
  if(!mod&&!ev.altKey&&!ev.shiftKey){const m={KeyT:'text',KeyR:'rect',KeyO:'ellipse',KeyL:'line',KeyP:'pencil'}[c];if(m){ev.preventDefault();setTool(m);return}}
  return}
 if(mod&&ev.shiftKey&&c==='KeyK'){ev.preventDefault();$('#upFile').click();return}
 if(ev.shiftKey&&!mod&&c==='KeyR'){ev.preventDefault();showRulers=!showRulers;$('#cvWrap').classList.toggle('no-rulers',!showRulers);req();return}
 if(k==='?'||(ev.shiftKey&&c==='Slash')){ev.preventDefault();openKeys();return}
 if(mod&&c==='KeyA'){ev.preventDefault();act('selectAll');return}
 if(mod&&ev.altKey&&c==='KeyC'){ev.preventDefault();act('copyStyle');return}
 if(mod&&ev.altKey&&c==='KeyV'){ev.preventDefault();act('pasteStyle');return}
 if(mod&&c==='KeyC'){if(sel.length){ev.preventDefault();act('copy')}return}
 if(mod&&c==='KeyX'){if(sel.length){ev.preventDefault();act('cut')}return}
 if(mod&&c==='KeyD'){ev.preventDefault();act('dup');return}
 if(mod&&ev.shiftKey&&c==='KeyG'){ev.preventDefault();act('ungroup');return}
 if(mod&&c==='KeyG'){ev.preventDefault();act('group');return}
 if(mod&&ev.shiftKey&&c==='KeyH'){ev.preventDefault();act('hide');return}
 if(mod&&ev.shiftKey&&c==='KeyL'){ev.preventDefault();act('lock');return}
 if(mod&&c==='BracketRight'){ev.preventDefault();act(ev.shiftKey||ev.altKey?'front':'fwd');return}
 if(mod&&c==='BracketLeft'){ev.preventDefault();act(ev.shiftKey||ev.altKey?'bottom':'back');return}
 if(ev.altKey&&!mod){const m={KeyA:'alignL',KeyD:'alignR',KeyW:'alignT',KeyS:'alignB',KeyH:'alignCH',KeyV:'alignCV'}[c];if(m){ev.preventDefault();act(m);return}}
 if(ev.shiftKey&&!mod&&c==='KeyH'&&sel.length){ev.preventDefault();act('flipH');return}
 if(ev.shiftKey&&!mod&&c==='KeyV'&&sel.length){ev.preventDefault();act('flipV');return}
 if(!mod&&!ev.altKey&&!ev.shiftKey){const m={KeyV:'move',KeyH:'hand',KeyT:'text',KeyR:'rect',KeyO:'ellipse',KeyL:'line',KeyP:'pencil'}[c];if(m){ev.preventDefault();setTool(m);return}}
 if(k==='Escape'){if(tool!=='move'){setTool('move');return}if(gfocus){const g=gfocus;gfocus=null;setSel(groupOf(g).map(e=>e.id));return}setSel([]);closePop();return}
 if(!sel.length)return;
 if(k==='Delete'||k==='Backspace'){ev.preventDefault();act('del');return}
 if(k==='Enter'){ev.preventDefault();const e=one();if(e&&e.type==='text')startEdit(e.id);else if(e&&e.gid&&gfocus!==e.gid){gfocus=e.gid}else if(sel.length>1){const g=get(sel[0]).gid;if(g&&selEls().every(x=>x.gid===g)){gfocus=g;setSel([sel[0]])}}return}
 const st=ev.shiftKey?10:1,mv={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]}[k];
 if(mv){ev.preventDefault();selEls().forEach(e=>{if(!e.locked){e.x+=mv[0];e.y+=mv[1]}});CT.sig='';req();commitSoon();syncPanels()}});
document.addEventListener('keyup',ev=>{if(ev.key===' '){spaceDown=false;if(!op||op.t!=='pan')vp.classList.remove('panning')}});
window.addEventListener('blur',()=>{spaceDown=false;vp.classList.remove('panning')});
document.addEventListener('paste',ev=>{const t=ev.target;if(typing(t))return;if(!studio.contains(t)&&t!==document.body)return;const f=[...((ev.clipboardData&&ev.clipboardData.files)||[])].find(x=>/^image\//.test(x.type));if(f){ev.preventDefault();loadFile(f,k=>addImage(k));return}if(clip){ev.preventDefault();pasteEls()}});

/* ---------- history + autosave ---------- */
const snapshot=()=>JSON.stringify({D,tier});
function commit(){const s=snapshot();if(s===last)return;hist.push(last);if(hist.length>100)hist.shift();last=s;fut=[];saveSoon();req();refreshUndo()}
let cT;function commitSoon(){clearTimeout(cT);cT=setTimeout(commit,350)}
function restore(s){const o=JSON.parse(s);D=o.D;tier=o.tier;D.groups=D.groups||{};sel=sel.filter(id=>get(id));if(editing){editing=null;inl.hidden=true}CT.sig='';if(D.shape!=='custom')CT.url=null;syncPanels();req();saveSoon();refreshUndo()}
function undo(){if(!hist.length)return;fut.push(last);last=hist.pop();restore(last);say('Undone')}
function redo(){if(!fut.length)return;hist.push(last);last=fut.pop();restore(last);say('Redone')}
function refreshUndo(){$('#undoBtn').disabled=!hist.length;$('#redoBtn').disabled=!fut.length}
let svT;function saveSoon(){clearTimeout(svT);svT=setTimeout(save,700)}
let storeWarned=false;function save(){try{const keys=new Set(D.els.filter(e=>e.type==='image').map(e=>e.key));if(D.bg.t==='img'&&D.bg.img)keys.add(D.bg.img);const imgs={};keys.forEach(k=>{if(IM[k])imgs[k]={url:IM[k].url,name:IM[k].name,vector:!!IM[k].vector}});
 const b={v:3,D,tier};try{localStorage.setItem(KEY,JSON.stringify(Object.assign({imgs},b)))}catch(e){localStorage.setItem(KEY,JSON.stringify(Object.assign({imgs:{}},b)));if(keys.size&&!storeWarned){storeWarned=true;toast("Your image is too large to keep after you leave this page. It stays while this tab is open.")}}}catch(e){}}
let draftLostImg=false;function loadDraft(){try{const s=localStorage.getItem(KEY);if(!s)return false;const o=JSON.parse(s);if(!o||o.v!==3||!o.D||!Array.isArray(o.D.els))return false;
 Object.entries(o.imgs||{}).forEach(([k,v])=>{const img=new Image();IM[k]={url:v.url,img,name:v.name,vector:v.vector,natW:1000,natH:1000};img.onload=()=>{IM[k].natW=img.naturalWidth||1000;IM[k].natH=img.naturalHeight||1000;if(D.els.some(e=>e.key===k&&e.clear))makeClear(k).then(()=>{CT.sig='';req()});CT.sig='';upThumbs();syncPanels();req()};img.src=v.url});
 const n0=o.D.els.length;o.D.els=o.D.els.filter(e=>e.type!=='image'||IM[e.key]);if(o.D.els.length<n0)draftLostImg=true;if(o.D.bg&&o.D.bg.t==='img'&&!IM[o.D.bg.img]){o.D.bg.t='none';draftLostImg=true}D=o.D;D.groups=D.groups||{};tier=o.tier||0;
 if(D.els.length||D.bg.t!=='none'){startDismissed=true;started=true;return true}return false}catch(e){return false}}

/* ---------- images ---------- */
const MAX_MB=25;function loadFile(file,cb){if(!file)return;if(!/^image\//.test(file.type)){toast(`"${file.name}" isn't an image. Choose a PNG, JPG, SVG or WebP file.`);return}if(file.size>MAX_MB*1048576){toast(`"${file.name}" is ${(file.size/1048576).toFixed(0)} MB. Choose a file under ${MAX_MB} MB.`);return}
 const r=new FileReader();r.onload=()=>{const key=nid(),img=new Image();img.onload=()=>{IM[key]={url:r.result,img,name:file.name,vector:file.type==='image/svg+xml',natW:img.naturalWidth||1000,natH:img.naturalHeight||1000};upThumbs();cb(key)};img.onerror=()=>toast(`Couldn't open "${file.name}". Try a PNG or JPG.`);img.src=r.result};r.readAsDataURL(file)}
function upThumbs(){const g=$('#upGrid');g.innerHTML=Object.entries(IM).filter(([k,m])=>!m.derived).map(([k,m])=>`<button type="button" data-addimg="${k}" aria-label="Add ${esc(m.name)} to the sticker" data-tip="${esc(m.name)}"><img src="${m.url}" alt=""></button>`).join('')}
function addImage(key,at){const m=IM[key],ar=m.natW/m.natH,mx=Math.min(W(),H())*.7;let w=mx,h=mx;if(ar>=1)h=w/ar;else w=h*ar;if(w>W()*.85){h*=W()*.85/w;w=W()*.85}
 const inside=at&&at.x>0&&at.y>0&&at.x<W()&&at.y<H();addEl(base('image',{key,w,h,x:inside?at.x:W()/2,y:inside?at.y:H()/2,clear:false}),'upload')}
function makeClear(key){const m=IM[key];if(!m)return Promise.resolve();if(m.clear)return Promise.resolve();if(m.clearing)return m.clearing;
 m.clearing=new Promise(res=>{const run=()=>{const im=m.img,s=Math.min(1,1600/Math.max(im.naturalWidth||1,im.naturalHeight||1)),c=document.createElement('canvas');c.width=Math.max(1,Math.round((im.naturalWidth||1000)*s));c.height=Math.max(1,Math.round((im.naturalHeight||1000)*s));
  const x=c.getContext('2d');x.drawImage(im,0,0,c.width,c.height);let d;try{d=x.getImageData(0,0,c.width,c.height)}catch(e){m.clear=m.url;m.clearImg=im;res();return}
  const p=d.data,w=c.width,h=c.height,n=w*h,seen=new Uint8Array(n),q=new Int32Array(n);let qs=0,qe=0;
  const bgp=i=>{const j=i*4;return p[j+3]<16||Math.min(p[j],p[j+1],p[j+2])>=232};
  const push=i=>{if(!seen[i]&&bgp(i)){seen[i]=1;q[qe++]=i}};
  for(let x2=0;x2<w;x2++){push(x2);push((h-1)*w+x2)}for(let y2=0;y2<h;y2++){push(y2*w);push(y2*w+w-1)}
  while(qs<qe){const i=q[qs++],x2=i%w;p[i*4+3]=0;if(x2>0)push(i-1);if(x2<w-1)push(i+1);if(i>=w)push(i-w);if(i<n-w)push(i+w)}
  for(let i=0;i<n;i++){if(seen[i])continue;const x2=i%w;if((x2>0&&seen[i-1])||(x2<w-1&&seen[i+1])||(i>=w&&seen[i-w])||(i<n-w&&seen[i+w])){const j=i*4,mn=Math.min(p[j],p[j+1],p[j+2]);if(mn>190)p[j+3]=Math.round(p[j+3]*(232-mn)/42)}}
  x.putImageData(d,0,0);m.clear=c.toDataURL('image/png');const ci=new Image();ci.onload=()=>{m.clearImg=ci;res()};ci.onerror=()=>res();ci.src=m.clear};
  if(m.img.complete&&m.img.naturalWidth)run();else m.img.addEventListener('load',run,{once:true})});return m.clearing}

/* ---------- adding things ---------- */
function addEl(el,method){D.els.push(el);startDismissed=true;gfocus=null;if(!started){started=true;track('builder_start',{method})}track('builder_add_item',{item_type:el.type,method});if(!editable())setView('edit');setSel([el.id],true);CT.sig='';commit();say(`Added ${label(el)}`)}
function freeY(){const H0=H(),n=D.els.filter(e=>Math.abs(e.y-H0/2)<H0*.12).length;return clamp(H0/2+n*H0*.2,H0*.15,H0*.85)}
const TSTYLES={heading:{t:'Your Brand',pt:36,f:.26,b:true,font:2,lab:'Heading'},sub:{t:'Tagline',pt:20,f:.15,b:false,font:10,lab:'Subheading'},body:{t:'Your text here',pt:12,f:.1,b:false,font:3,lab:'Body text'},script:{t:'Handmade',pt:30,f:.2,b:false,font:4,lab:'Script'},arc:{t:'CURVED TEXT',pt:16,f:.12,b:true,font:3,lab:'Curved',curve:55,spacing:12}};
function addText(kind){const m=Math.min(W(),H()),c=TSTYLES[kind]||TSTYLES.heading;
 const el=T({text:c.t,size:Math.min(c.pt/.72,m*c.f),bold:c.b,font:c.font,curve:c.curve||0,spacing:c.spacing||0,fill:inkFor(),x:W()/2,y:freeY()});addEl(el,'text');requestAnimationFrame(()=>requestAnimationFrame(()=>startEdit(el.id)))}
function addShape(kind){const s=Math.min(W(),H())*.4;if(kind==='prim-rect')return addEl(R({w:s*1.3,h:s,fill:lastFill,x:W()/2,y:H()/2}),'graphic');if(kind==='prim-ellipse')return addEl(E({w:s,h:s,fill:lastFill,x:W()/2,y:H()/2}),'graphic');if(kind==='prim-line')return addEl(L({w:s*1.5,x:W()/2,y:H()/2,stroke:penStyle.stroke,sw:penStyle.sw}),'graphic');
 addEl(S({kind,w:s,h:s,fill:D.bg.t==='color'&&D.bg.c.toUpperCase()===lastFill.toUpperCase()?'#FFFFFF':lastFill,x:W()/2,y:H()/2}),'graphic')}
function applyTpl(t){D=t.make();D.groups={};sel=[];startDismissed=true;CT.sig='';CT.url=null;if(!started){started=true;track('builder_start',{method:'template'})}track('builder_template',{template:t.id});cam=null;zoom=1;if(!editable())setView('edit');commit();syncPanels();req();toast(COARSE.matches?'Template added. Tap any text, then the pencil, to change it.':'Template added. Double-click any text to change it.','Undo',undo)}
