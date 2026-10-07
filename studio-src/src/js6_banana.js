/* =====================================================================
   Genie × Nano Banana Pro (Gemini 3 Pro Image)
   Logo requests in Genie are drawn by Nano Banana Pro through the Custom Genie server
   (server.mjs), which keeps the Google API key private; the page never sees the key.
   Click a result to add it to the canvas, or drag it onto the sticker. Follow-ups
   ("make the cup blue") edit the selected AI logo. Without the server (or its key),
   Genie keeps its built-in layouts, so customers never hit a dead end.
   Point the page at another server with window.CUSTOM_GENIE_API = 'https://…/api/genie'.
   ===================================================================== */
const NB={api:(typeof window.CUSTOM_GENIE_API==='string'&&window.CUSTOM_GENIE_API)||'/api/genie',on:false,checking:null,model:'',n:2,ctl:null,cache:{},R:[]};
function nbCheck(){if(NB.on)return Promise.resolve(true);if(NB.checking)return NB.checking;
 if(!/^https?:$/.test(location.protocol)&&!window.CUSTOM_GENIE_API)return Promise.resolve(false);
 NB.checking=fetch(NB.api+'/status',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{NB.on=!!(j&&j.enabled);if(j){NB.model=j.model||'';NB.n=j.perRequest||2}if(NB.on)nbBadge();return NB.on}).catch(()=>false).finally(()=>{NB.checking=null});
 return NB.checking}
function nbBadge(){const ss=$('#startSub');if(ss)ss.textContent='Describe your logo or sticker and Genie draws options with Nano Banana Pro. Click one to add it to your canvas.';
 const first=feed.querySelector('.gm.bot .bd');if(!first||first.querySelector('.gai-badge'))return;const p0=first.querySelector('p');if(p0)p0.innerHTML=p0.innerHTML.replace("I'll design four options to start from.","I'll draw logo options for you.");
 first.insertAdjacentHTML('beforeend','<p class="gai-badge"><span class="gai-dot" aria-hidden="true"></span><span>Logos drawn by <b>Nano Banana Pro</b>. Click one to add it to your canvas.</span></p>')}
const nbIsAI=e=>!!(e&&e.type==='image'&&IM[e.key]&&(IM[e.key].ai||e.name==='Genie logo'));
function nbTarget(){const e=one();if(nbIsAI(e))return e;if(sel.length)return null;const ai=D.els.filter(nbIsAI);return ai.length===1?ai[0]:null}

/* ---------- requests ---------- */
async function nbCall(body){NB.ctl=new AbortController();
 const r=await fetch(NB.api+'/image',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:NB.ctl.signal});
 let j={};try{j=await r.json()}catch(e){}
 if(!r.ok||!j||!Array.isArray(j.images)||!j.images.length){const er=(j&&j.error)||{};const e=new Error(er.message||'Nano Banana Pro couldn\'t draw that just now.');e.code=er.code||'HTTP_'+r.status;throw e}
 return j}
function nbWait(n,label){const m=gSay(`<p class="gai-wait"><span class="gtyping" aria-hidden="true"><i></i><i></i><i></i></span><span>${esc(label)} <span class="gai-t">Usually 10 to 30 seconds.</span></span></p>
 <div class="ggrid gai-grid" aria-hidden="true">${'<div class="gcard gai sk"><i></i></div>'.repeat(n)}</div><button type="button" class="linkbtn gai-stop" data-nbstop>Cancel</button>`);
 const t0=Date.now(),tt=m.querySelector('.gai-t'),iv=setInterval(()=>{const s=Math.round((Date.now()-t0)/1000);if(s>=4)tt.textContent=`${s} s`},1000);m._stop=()=>{clearInterval(iv);m.remove()};return m}
function nbFail(e){if(e&&e.name==='AbortError'){gSay('<p>Stopped. Ask again whenever you\'re ready.</p>');return true}
 const code=e&&e.code||'';if(code==='NOT_CONFIGURED'||code==='HTTP_404'||!code)NB.on=false;
 const blocked=code==='CONTENT_BLOCKED';
 gSay(`<p>${esc((e&&e.message)||'Nano Banana Pro couldn\'t draw that just now.')}${blocked?'':' Here are layout options instead.'}</p>`);
 track('builder_ai_error',{engine:'nano-banana-pro',code});return blocked}
async function nbGenerate(p,opt){if(!(await nbCheck()))return false;opt=opt||{};
 const a=parsePrompt(p),blank=isBlank(),shape=a.shape||(blank?null:D.shape),size=a.size?resolveSize(Object.assign({},a,{shape:shape||'circle',mode:'prompt'})):(blank?null:{w:D.w,h:D.h});
 const n=NB.n;AI.busy=true;const w=nbWait(n,opt.more?'Drawing more logos with Nano Banana Pro…':`Nano Banana Pro is drawing ${n>1?n+' logos':'your logo'}…`);
 track('builder_ai_prompt',{length:p.length,engine:'nano-banana-pro'});
 try{const j=await nbCall({mode:'generate',prompt:p,name:a.name||null,tagline:a.tagline||null,colors:a.colorWords||a.colors||[],shape,size,n});w._stop();
  nbShow(j,{prompt:p,a});return true}
 catch(e){w._stop();return nbFail(e)}
 finally{AI.busy=false;NB.ctl=null}}
async function nbEdit(p,el){AI.busy=true;const m=IM[el.key],w=nbWait(1,'Nano Banana Pro is updating your logo…');
 try{const j=await nbCall({mode:'edit',prompt:p,image:m.src0||m.url});w._stop();nbShow(j,{prompt:p,replace:el.id,edit:true});track('builder_ai_edit',{engine:'nano-banana-pro'});return true}
 catch(e){w._stop();nbFail(e);return true}
 finally{AI.busy=false;NB.ctl=null}}

/* ---------- results ---------- */
function nbShow(j,meta){const rid=NB.R.push({images:j.images,meta})-1,n=j.images.length,ed=meta.edit;
 const cards=j.images.map((im,i)=>`<button type="button" class="gcard gai" data-nbpick="${rid}:${i}" draggable="true" aria-label="${ed?'Use the updated logo':'Add logo option '+(i+1)+' to the canvas'}"><img src="${im.src}" alt="${ed?'Updated logo':'Logo option '+(i+1)}" draggable="false"><span>${ed?'Updated logo':'Option '+(i+1)}</span><em class="gai-add" aria-hidden="true">${ed?'Use this':'Add to canvas'}</em></button>`).join('');
 gSay(`<p><b>${ed?'Here\'s the updated logo.':n>1?`Here are ${n} logos.`:'Here\'s your logo.'}</b> ${ed?'Click it to swap it into your sticker.':COARSE.matches?'Tap one to add it to your sticker.':'Click one to add it to your sticker, or drag it onto the canvas.'}</p>
 <div class="ggrid gai-grid${n===1?' one':''}">${cards}</div>
 <div class="gchips" style="margin-top:8px">${ed?'':`<button type="button" class="gchip" data-nbmore="${rid}"><svg class="ico" style="width:14px;height:14px"><use href="#i-spark"/></svg>More like these</button><button type="button" class="gchip" data-nblayouts="${rid}">Text layouts instead</button>`}</div>
 <p class="gai-note">${j.partial?'One option didn\'t finish, so you have fewer to pick from. ':''}Made with Nano Banana Pro. Ask for changes, like "make it navy and gold".</p>`);
 track('builder_ai_generate',{engine:'nano-banana-pro',n,edit:!!ed})}
function nbRegister(src,label,ck){if(NB.cache[ck]&&IM[NB.cache[ck]])return Promise.resolve(NB.cache[ck]);
 return new Promise((res,rej)=>{const a=new Image();a.onload=()=>{let url=src;
   /* keep drafts small enough for browser storage: high-quality WebP instead of a multi-MB PNG */
   try{const c=document.createElement('canvas');c.width=a.naturalWidth||1024;c.height=a.naturalHeight||1024;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(a,0,0,c.width,c.height);const w=c.toDataURL('image/webp',.94);if(/^data:image\/webp/.test(w)&&(w.length<src.length||!/^data:image\/(png|jpeg|webp)/.test(src)))url=w}catch(e){}
   const b=new Image();b.onload=()=>{const key=nid();IM[key]={url,img:b,name:label,vector:false,natW:b.naturalWidth||1024,natH:b.naturalHeight||1024,ai:true};NB.cache[ck]=key;upThumbs();res(key)};b.onerror=rej;b.src=url};
  a.onerror=rej;a.src=src})}
async function nbPick(rid,i,at){const R=NB.R[rid],im=R&&R.images[i];if(!im||AI.busy)return;
 let key;try{key=await nbRegister(im.src,R.meta.edit?'Genie logo (edited)':`Genie logo ${i+1}`,im.id)}catch(e){toast('That image couldn\'t be opened. Please try another.');return}
 const m0=IM[key],info0=analyzeArt(m0.img,m0),k2=await trimArt(key,info0),m=IM[k2];m.ai=true;m.round=!!info0.round;if(!m.src0)m.src0=m0.url;
 const info=k2===key?info0:analyzeArt(m.img,m),clear=!!info0.whiteBg;if(clear)await makeClear(k2);
 const ar=(m.natW||1)/(m.natH||1);
 if(R.meta.replace){const e=get(R.meta.replace);if(e){e.key=k2;e.h=e.w/ar;e.clear=clear||e.clear;sel=[e.id];CT.sig='';commit();syncPanels();req();
   toast('Logo updated.','Undo',undo);track('builder_ai_apply',{engine:'nano-banana-pro',edit:true});if(NARROW.matches)closeSheets();return}}
 const blank=isBlank();
 if(blank){const a=R.meta.a||{},shape=a.shape||(info0.round?(info0.suggest==='oval'?'oval':'circle'):(info0.suggest||'custom'));D.shape=shape;
  if(a.size){const z=resolveSize(Object.assign({},a,{shape,mode:'prompt'}));D.w=z.w;D.h=z.h}
  else if(shape==='circle'||shape==='square'){D.w=D.h=2}
  else{D.w=ar>=1?2.5:r2(clamp(2.5*ar,MIN,MAX));D.h=ar>=1?r2(clamp(2.5/ar,MIN,MAX)):2.5}
  if(a.vinyl)D.vinyl=a.vinyl;if(a.tier!=null)tier=a.tier;D.bg={t:'none',c:D.bg.c||'#FFFFFF',img:null};cam=null;zoom=1}
 /* fit inside the safe area for the sticker's shape (round art is checked by its outline, not its box) */
 let w,h;const fit=(bw,bh)=>{w=bw;h=w/ar;if(h>bh){h=bh;w=h*ar}};
 if(!blank)fit(Math.min(W(),H())*.6,Math.min(W(),H())*.6);
 else if(D.shape==='custom')fit(W()*.9,H()*.9);
 else if(/circle|oval/.test(D.shape)){const A=W()/2-SAFE,B=H()/2-SAFE;if(m.round)fit(2*A*.94,2*B*.94);else{const t=.97/Math.sqrt(ar*ar/(A*A)+1/(B*B));w=2*t*ar;h=2*t}}
 else fit((W()-2*SAFE)*.94,(H()-2*SAFE)*.94);
 const inside=at&&at.x>0&&at.y>0&&at.x<W()&&at.y<H();
 if(!started){started=true;track('builder_start',{method:'ai'})}startDismissed=true;
 addEl(base('image',{key:k2,w,h,x:inside?at.x:W()/2,y:inside?at.y:H()/2,clear,name:'Genie logo'}),'ai');
 track('builder_ai_apply',{engine:'nano-banana-pro'});quickUI();if(NARROW.matches)closeSheets();
 toast(blank?'Logo added. Drag it to place it, or ask Genie for changes.':'Logo added to your sticker.','Undo',undo)}

/* ---------- wiring (called from Genie init) ---------- */
function nbInit(){
 feed.addEventListener('click',ev=>{const pk=ev.target.closest('[data-nbpick]'),mo=ev.target.closest('[data-nbmore]'),ly=ev.target.closest('[data-nblayouts]'),st=ev.target.closest('[data-nbstop]');
  if(st){if(NB.ctl)NB.ctl.abort();return}
  if(pk){const [r,i]=pk.dataset.nbpick.split(':').map(Number);nbPick(r,i,null);return}
  if(AI.busy)return;
  if(mo){const R=NB.R[+mo.dataset.nbmore];if(R)nbGenerate(R.meta.prompt,{more:true}).then(ok=>{if(!ok){AI.a=parsePrompt(R.meta.prompt);AI.a.mode='prompt';AI.mode='prompt';AI.logo=null;AI.logoInfo=null;AI.seed=0;generate()}});return}
  if(ly){const R=NB.R[+ly.dataset.nblayouts];if(!R)return;gUser('Show text layouts instead');AI.mode='prompt';AI.logo=null;AI.logoInfo=null;AI.a=parsePrompt(R.meta.prompt);AI.a.mode='prompt';AI.seed=0;generate()}});
 feed.addEventListener('dragstart',ev=>{const c=ev.target.closest('[data-nbpick]');if(!c)return;ev.dataTransfer.setData('application/x-genie-logo',c.dataset.nbpick);ev.dataTransfer.effectAllowed='copy';const img=c.querySelector('img');if(img)try{ev.dataTransfer.setDragImage(img,32,32)}catch(e){}});
 const isLogo=ev=>!!(ev.dataTransfer&&[...ev.dataTransfer.types].includes('application/x-genie-logo'));
 vp.addEventListener('dragover',ev=>{if(!isLogo(ev))return;ev.preventDefault();ev.dataTransfer.dropEffect='copy';vp.classList.add('nb-drop')});
 vp.addEventListener('dragleave',ev=>{if(!vp.contains(ev.relatedTarget))vp.classList.remove('nb-drop')});
 vp.addEventListener('drop',ev=>{vp.classList.remove('nb-drop');if(!isLogo(ev))return;ev.preventDefault();ev.stopPropagation();const [r,i]=ev.dataTransfer.getData('application/x-genie-logo').split(':').map(Number);nbPick(r,i,editable()?toW(ev):null)});
 nbCheck()}
