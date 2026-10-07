/* ---------- chrome (state that follows every render) ---------- */
const TOOLHINT={text:'Click anywhere to place text.',rect:'Drag to draw a rectangle. Shift keeps it square, Alt draws from the center.',ellipse:'Drag to draw an ellipse. Shift keeps it round, Alt draws from the center.',line:'Drag to draw a line. Shift snaps to 15° angles.',pencil:'Draw freely. Press V or Esc to go back to Move.',hand:'Drag to pan. Ctrl + scroll to zoom.'};
function chrome(){
 const blank=isBlank();$('#start').hidden=!(view==='edit'&&blank&&!startDismissed);
 const msg=$('#vpMsg');let m='';
 if(view==='sheet')m='Your sticker at actual size on the 9.25 x 10 in sheet.';
 else if(editable()&&TOOLHINT[tool]&&!op)m=TOOLHINT[tool];else if(view==='dome'&&V3.failed&&!op&&!blank)m='Flat preview of the finished sticker (the 3D view needs an internet connection). Switch to Design to edit.';
 else if(view==='edit'&&D.shape==='custom'&&!CT.url&&$('#start').hidden)m='"Cut to design" traces around your artwork. Add a logo, text or shape first.';
 if(view!=='proof'){msg.textContent=m;msg.hidden=!m}
 legendUI();layersUI();fillIns();cbarUI();
 $('#layerArtTxt').textContent=`${SN[D.shape]} · ${fmt(pricedSize().w)} × ${fmt(pricedSize().h)} in`;$('#layerArt').setAttribute('aria-pressed',String(!sel.length))}

/* ---------- layers ---------- */
const gopen={};
function issueOf(e){return !e.hidden&&((outsideSafe(e)&&!covers(e))||(e.type==='text'&&ptSize(e)<8)||(e.type==='image'&&IM[e.key]&&!IM[e.key].vector&&dpi(e)<150))}
function layersUI(){const ul=$('#layers'),rows=[];const s=new Set(sel);
 for(const u of [...units()].reverse()){const e0=u[0];
  if(u.length>1||(e0.gid&&gfocus!==e0.gid)){const g=e0.gid,open=gopen[g]!==false;rows.push({k:'g',id:g,name:(D.groups&&D.groups[g]&&D.groups[g].name)||'Group',sel:u.every(e=>s.has(e.id)),hid:u.every(e=>e.hidden),lock:u.every(e=>e.locked),warn:u.some(issueOf),d:0,open,icon:'t-group'});
   if(open)for(const e of [...u].reverse())rows.push({k:'e',id:e.id,name:label(e),sel:s.has(e.id)&&!u.every(x=>s.has(x.id)),hid:e.hidden,lock:e.locked,warn:issueOf(e),d:1,icon:TI[e.type]})}
  else if(e0.gid){rows.push({k:'e',id:e0.id,name:label(e0),sel:s.has(e0.id),hid:e0.hidden,lock:e0.locked,warn:issueOf(e0),d:1,icon:TI[e0.type],infocus:1})}
  else rows.push({k:'e',id:e0.id,name:label(e0),sel:s.has(e0.id),hid:e0.hidden,lock:e0.locked,warn:issueOf(e0),d:0,icon:TI[e0.type]})}
 /* a focused group (double-clicked into) still shows its header row */
 if(gfocus){const mem=groupOf(gfocus);if(mem.length){const ids=new Set(mem.map(e=>e.id));const first=rows.findIndex(r=>ids.has(r.id));if(first>-1)rows.splice(first,0,{k:'g',id:gfocus,name:(D.groups[gfocus]||{}).name||'Group',sel:false,hid:mem.every(e=>e.hidden),lock:mem.every(e=>e.locked),warn:mem.some(issueOf),d:0,open:true,icon:'t-group',focus:1})}}
 $('#lempty').hidden=rows.length>0;
 const sig=JSON.stringify(rows);if(ul.dataset.sig===sig)return;ul.dataset.sig=sig;
 ul.innerHTML=rows.map(r=>{const n=esc(r.name);return `<li class="lrow${r.hid?' is-hidden':''}" role="treeitem" aria-selected="${r.sel}" ${r.k==='g'?`data-gid="${r.id}" aria-expanded="${r.open}"`:`data-lid="${r.id}"`} draggable="true" style="--d:${r.d}" tabindex="-1">`+
  (r.k==='g'?`<button type="button" class="chev" data-lact="toggle" aria-expanded="${r.open}" aria-label="${r.open?'Collapse':'Expand'} ${n}"><svg class="ico"><use href="#i-caret"/></svg></button>`:'')+
  `<span class="lt" aria-hidden="true"><svg class="ico"><use href="#${r.icon}"/></svg></span><span class="ln">${n}</span>`+
  (r.warn?`<span class="lw" data-tip="Needs attention, see the print check"><svg class="ico" role="img" aria-label="Needs attention"><use href="#i-warn"/></svg></span>`:'')+
  `<button type="button" class="lb${r.lock?' on':''}" data-lact="lock" aria-label="${r.lock?'Unlock':'Lock'} ${n}" aria-pressed="${r.lock}"><svg class="ico"><use href="#${r.lock?'i-lock':'i-unlock'}"/></svg></button>`+
  `<button type="button" class="lb${r.hid?' on':''}" data-lact="hide" aria-label="${r.hid?'Show':'Hide'} ${n}" aria-pressed="${r.hid}"><svg class="ico"><use href="#${r.hid?'i-eyeoff':'i-eye'}"/></svg></button></li>`}).join('')}
const rowTarget=li=>li.dataset.gid?{gid:li.dataset.gid}:{id:li.dataset.lid};
const rowEls=t=>t.gid?groupOf(t.gid):[get(t.id)].filter(Boolean);
$('#layers').addEventListener('click',ev=>{const li=ev.target.closest('.lrow');if(!li)return;const t=rowTarget(li),b=ev.target.closest('[data-lact]');
 if(b){const a=b.dataset.lact,els=rowEls(t);if(a==='toggle'){gopen[t.gid]=gopen[t.gid]===false;layersUI();return}
  if(a==='lock'){const on=!els.every(e=>e.locked);els.forEach(e=>e.locked=on)}if(a==='hide'){const on=!els.every(e=>e.hidden);els.forEach(e=>e.hidden=on);if(on)sel=sel.filter(id=>!els.some(e=>e.id===id))}
  CT.sig='';commit();syncPanels();return}
 const add=ev.shiftKey||ev.metaKey||ev.ctrlKey;let ids;
 if(t.gid){gfocus=null;ids=groupOf(t.gid).map(e=>e.id)}else{const e=get(t.id);if(e&&e.gid)gfocus=e.gid;ids=[t.id]}
 if(add){const on=ids.every(id=>sel.includes(id));setSel(on?sel.filter(id=>!ids.includes(id)):[...sel,...ids])}else setSel(ids);
 if(!editable())setView('edit')});
$('#layers').addEventListener('dblclick',ev=>{const li=ev.target.closest('.lrow');if(!li||ev.target.closest('[data-lact]'))return;const t=rowTarget(li);if(t.gid)renameLayer(null,t.gid);else{const e=get(t.id);if(e&&e.type==='text'&&ev.target.closest('.lt'))startEdit(e.id);else renameLayer(t.id)}});
function renameLayer(id,gid){const li=gid?$(`#layers [data-gid="${gid}"]`):$(`#layers [data-lid="${id}"]`);if(!li)return;const ln=$('.ln',li),cur=gid?(D.groups[gid]||{}).name||'Group':label(get(id));
 const inp=document.createElement('input');inp.className='lname';inp.value=cur;inp.setAttribute('aria-label','Layer name');ln.replaceWith(inp);inp.focus();inp.select();let done=false;
 const fin=ok=>{if(done)return;done=true;const v=inp.value.trim();if(ok){if(gid){D.groups[gid]=Object.assign(D.groups[gid]||{},{name:v||'Group'})}else{const e=get(id);if(e)e.name=v&&v!==label(Object.assign({},e,{name:null}))?v:null}commit()}$('#layers').dataset.sig='';layersUI()};
 inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')fin(true);if(e.key==='Escape')fin(false)});inp.addEventListener('blur',()=>fin(true))}
let dragSrc=null;
$('#layers').addEventListener('dragstart',ev=>{const li=ev.target.closest('.lrow');if(!li)return;dragSrc=rowTarget(li);li.classList.add('ghost');ev.dataTransfer.effectAllowed='move';try{ev.dataTransfer.setData('text/plain','layer')}catch(e){}});
$('#layers').addEventListener('dragend',()=>{dragSrc=null;$$('#layers .lrow').forEach(r=>r.classList.remove('ghost','drop-before','drop-after','drop-in'))});
$('#layers').addEventListener('dragover',ev=>{if(!dragSrc)return;const li=ev.target.closest('.lrow');if(!li)return;ev.preventDefault();const r=li.getBoundingClientRect(),y=(ev.clientY-r.top)/r.height;
 $$('#layers .lrow').forEach(x=>x.classList.remove('drop-before','drop-after','drop-in'));li.classList.add(li.dataset.gid&&!dragSrc.gid&&y>.3&&y<.7?'drop-in':y<.5?'drop-before':'drop-after')});
$('#layers').addEventListener('drop',ev=>{if(!dragSrc)return;const li=ev.target.closest('.lrow');if(!li)return;ev.preventDefault();const pos=li.classList.contains('drop-in')?'in':li.classList.contains('drop-before')?'before':'after';moveLayer(dragSrc,rowTarget(li),pos);dragSrc=null});
function moveLayer(src,tgt,pos){const moving=rowEls(src);if(!moving.length)return;const tEls=rowEls(tgt);if(!tEls.length||tEls.some(e=>moving.includes(e)))return;
 const rest=D.els.filter(e=>!moving.includes(e));let gid=null,idx;
 if(tgt.gid||(src.gid&&tEls[0].gid)){const g=tgt.gid||tEls[0].gid,mem=rest.filter(e=>e.gid===g),lo=rest.indexOf(mem[0]),hi=rest.indexOf(mem[mem.length-1]);if(pos==='in'){gid=g;idx=hi+1}else idx=pos==='before'?hi+1:lo}
 else{const t=tEls[0];gid=src.gid?null:t.gid;const i=rest.indexOf(t);idx=pos==='before'?i+1:i}
 if(!src.gid)moving.forEach(e=>e.gid=gid);rest.splice(idx,0,...moving);D.els=rest;tidyGroups();CT.sig='';commit();syncPanels()}
$('#layerArt').addEventListener('click',()=>{setSel([]);if(NARROW.matches)openSheet('props')});
$('#lempty').addEventListener('click',ev=>{const b=ev.target.closest('[data-quick]');if(!b)return;const q=b.dataset.quick;if(q==='text')addText('heading');if(q==='image')$('#upFile').click();if(q==='genie')openGenie(true)});

/* ---------- inspector ---------- */
const PRESETS={square:[[1,1],[1.5,1.5],[2,2],[3,3],[4,4]],circle:[[1,1],[1.5,1.5],[2,2],[3,3],[4,4]],rect:[[2,1],[3,1],[3,2],[4,3]],oval:[[2,1.5],[3,2],[4,3]],stadium:[[2,1],[3,1],[3,1.5],[4,2]],custom:[[2,2],[3,3],[4,4]]};
const SHAPEICON={rect:'<rect x="3" y="5" width="24" height="14" rx="2"/>',square:'<rect x="7" y="4" width="16" height="16" rx="2"/>',circle:'<circle cx="15" cy="12" r="9"/>',oval:'<ellipse cx="15" cy="12" rx="12" ry="8"/>',stadium:'<rect x="2" y="6" width="26" height="12" rx="6"/>',custom:'<path d="M7 6c4-4 7 1 10-1s8 0 6 6 2 6 1 9-6 2-9 2-6 3-9 0 1-6 0-8-3-6 1-8z"/>'};
let keepRatio=false,docLock=false;
const NUM=(p,lab,u,tip,icon)=>`<div class="num"><label data-scrub="${p}" for="in-${p}" data-tip="${tip||lab}">${icon?`<svg class="ico"><use href="#${icon}"/></svg>`:lab}</label><input id="in-${p}" data-p="${p}" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="${tip||lab}">${u?`<span class="u">${u}</span>`:''}</div>`;
const PAINT=(k,lab)=>`<div class="paint"><button type="button" class="chip" data-paint="${k}" aria-label="${lab} color"></button><div class="num"><label class="nl" style="cursor:default">#</label><input data-hex="${k}" aria-label="${lab} hex color" maxlength="7" spellcheck="false" autocomplete="off"></div></div>`;
function insSig(){const els=selEls();if(!els.length)return 'doc:'+D.shape+':'+(tool==='pencil'||tool==='line'?'pen':'');return els.map(e=>e.type+(e.locked?'L':'')+(hasStroke(e)?'s':'')+(hasFill(e)?'f':'')).join(',')+'|'+els.length}
function syncPanels(){const sig=insSig(),ins=$('#ins');if(ins.dataset.sig!==sig){ins.dataset.sig=sig;ins.innerHTML=selEls().length?selHTML():docHTML();if(D.shape==='custom'&&!selEls().length){thumbSig='';schedThumbs()}}
 ctxUI();fillIns();layersUI();$('#mPropsLbl').textContent=sel.length?'Edit':'Sticker'}
function ctxUI(){const els=selEls(),c=$('#insCtx');let h;
 if(!els.length)h=tool==='pencil'||tool==='line'?`<svg class="ico"><use href="#${tool==='pencil'?'t-pencil':'t-line'}"/></svg><b>${tool==='pencil'?'Pencil':'Line'}</b>`:`<svg class="ico"><use href="#i-sticker"/></svg><b>Sticker</b><span>${esc(SN[D.shape])}</span>`;
 else if(els.length===1){const e=els[0];h=`<svg class="ico"><use href="#${TI[e.type]}"/></svg><b>${esc(label(e))}</b>${e.locked?'<svg class="ico" aria-label="Locked"><use href="#i-lock"/></svg>':''}<button type="button" class="linkbtn" data-ctx="doc">Sticker settings</button>`}
 else{const g=els[0].gid&&els.every(e=>e.gid===els[0].gid)?els[0].gid:null;h=`<svg class="ico"><use href="#t-group"/></svg><b>${g?esc((D.groups[g]||{}).name||'Group'):els.length+' items'}</b><button type="button" class="linkbtn" data-ctx="doc">Sticker settings</button>`}
 if(c.dataset.h!==h){c.dataset.h=h;c.innerHTML=h}}
$('#insCtx').addEventListener('click',ev=>{if(ev.target.closest('[data-ctx="doc"]'))setSel([])});
function docHTML(){const pen=tool==='pencil'||tool==='line';let s='';
 if(pen)s+=`<section class="psec"><h3 class="psec-h">Stroke</h3>${PAINT('pen','Stroke')}<div class="f-row">${NUM('pensw','W','pt','Stroke width','i-sliders')}</div><p class="hint">Applies to new ${tool==='pencil'?'drawings':'lines'}. Select a drawing afterwards to change it.</p></section>`;
 s+=`<section class="psec"><h3 class="psec-h">Shape</h3><div class="shapes" role="radiogroup" aria-label="Sticker shape">${Object.keys(SN).map(k=>`<button type="button" class="shp" role="radio" data-shape="${k}" aria-checked="false"><svg viewBox="0 0 30 24" aria-hidden="true">${SHAPEICON[k]}</svg><span>${SN[k]}</span></button>`).join('')}</div>
  <div class="f-row" id="cornersRow" style="margin-top:10px;justify-content:space-between"><span class="fl" style="margin:0">Corners</span><div class="seg" id="cornersSeg" role="group" aria-label="Corner radius"><button type="button" data-corner="yes" data-tip="0.12 in radius">Standard</button><button type="button" data-corner="no" data-tip="0.04 in radius, the smallest we can dome">Minimal</button></div></div>
  <div id="borderBox" hidden style="margin-top:12px"><span class="fl">White border around your design</span><div class="btiles" id="borderTiles" role="radiogroup" aria-label="Border width"></div><div class="range" style="margin-top:10px"><input type="range" id="gapIn" min="6" max="30" step="1" aria-label="Exact border width"><output id="gapOut" for="gapIn"></output></div></div>
  <p class="hint" id="shapeHelp"></p></section>`;
 s+=`<section class="psec"><h3 class="psec-h">Size <small>0.5 – 8.5 in</small></h3><div class="f-row">${NUM('dw','W','in','Sticker width')}<button type="button" class="ratio" id="docLockBtn" aria-pressed="false" aria-label="Keep proportions" data-tip="Keep proportions"><svg class="ico"><use href="#i-link"/></svg></button>${NUM('dh','H','in','Sticker height')}</div><div class="presets" id="presets"></div><p class="hint">Your design scales with the sticker. Price is per sticker at your quantity.</p></section>`;
 s+=`<section class="psec"><h3 class="psec-h">Finish</h3><div class="fins" role="radiogroup" aria-label="Vinyl finish">${[['white','Gloss White'],['silver','Silver'],['gold','Gold']].map(([v,n])=>`<button type="button" class="fin" role="radio" data-vinyl="${v}" aria-checked="false"><span class="sw sw-${v}" aria-hidden="true"></span>${n}</button>`).join('')}</div><p class="hint" id="vinylHelp"></p></section>`;
 s+=`<section class="psec"><h3 class="psec-h">Background<span><input type="file" id="bgFile" class="sr-only" accept="image/*"><button type="button" class="iconbtn" id="bgImgBtn" aria-label="Use an image as the background" data-tip="Use an image"><svg class="ico"><use href="#t-image"/></svg></button></span></h3>${PAINT('bg','Background')}<p class="hint" id="bgHelp"></p></section>`;
 return s}
function selHTML(){const els=selEls(),e=els.length===1?els[0]:null,types=new Set(els.map(x=>x.type)),allText=els.every(x=>x.type==='text'),locked=els.some(x=>x.locked);let s='';
 if(locked)return `<section class="psec"><p class="hint" style="margin:0"><b>Locked.</b> Locked layers can't be moved or edited on the canvas.</p><button type="button" class="btn btn-ghost sm" data-act="lock" style="margin-top:10px"><svg class="ico"><use href="#i-unlock"/></svg>Unlock</button></section>`;
 const A=(a,ic,l,k)=>`<button type="button" class="tool" data-act="${a}" aria-label="${l}" data-tip="${l}"${k?` data-key="${k}"`:''}><svg class="ico"><use href="#${ic}"/></svg></button>`;
 s+=`<div class="alignbar" role="toolbar" aria-label="Align">${A('alignL','a-l','Align left','Alt A')}${A('alignCH','a-ch','Align horizontal centers','Alt H')}${A('alignR','a-r','Align right','Alt D')}${A('alignT','a-t','Align top','Alt W')}${A('alignCV','a-cv','Align vertical centers','Alt V')}${A('alignB','a-b','Align bottom','Alt S')}${A('distH','a-dh','Distribute horizontally')}${A('distV','a-dv','Distribute vertically')}</div>`;
 s+=`<section class="psec"><h3 class="psec-h">Layout</h3><div class="f-grid">${NUM('x','X','in','X position')}${NUM('y','Y','in','Y position')}${NUM('w','W','in','Width')}${NUM('h','H','in','Height')}</div>
  <div class="f-row">${e?NUM('rot','','°','Rotation','i-rot'):''}<button type="button" class="ratio" id="ratioBtn" aria-pressed="false" aria-label="Keep proportions" data-tip="Keep proportions when typing W or H"><svg class="ico"><use href="#i-link"/></svg></button><div class="seg" role="group" aria-label="Flip">${'<button type="button" data-act="flipH" aria-label="Flip horizontal" data-tip="Flip horizontal" data-key="⇧ H"><svg class="ico"><use href="#i-fliph"/></svg></button><button type="button" data-act="flipV" aria-label="Flip vertical" data-tip="Flip vertical" data-key="⇧ V"><svg class="ico"><use href="#i-flipv"/></svg></button>'}</div></div>
  <div class="f-grid">${NUM('op','','%','Opacity','i-eye')}${e&&e.type==='rect'?NUM('rad','','in','Corner radius','t-rect'):'<span></span>'}</div></section>`;
 if(allText){s+=`<section class="psec"><h3 class="psec-h">Text</h3>${e?`<textarea class="sel" id="tContent" rows="2" style="height:auto;min-height:52px;padding:8px 10px;white-space:pre-wrap;resize:vertical" aria-label="Text content"></textarea><div class="f-row"></div>`:''}
  <div class="f-row"><button type="button" class="sel" id="fontSel" aria-haspopup="listbox"></button></div>
  <div class="f-grid">${NUM('pt','Size','pt','Font size')}<div class="seg full" role="group" aria-label="Style"><button type="button" id="tBold" aria-pressed="false" aria-label="Bold" data-tip="Bold"><b>B</b></button><button type="button" id="tItal" aria-pressed="false" aria-label="Italic" data-tip="Italic"><i style="font-family:Georgia,serif">I</i></button></div></div>
  <div class="f-grid"><div class="seg full" id="tAlign" role="group" aria-label="Alignment">${['left','center','right'].map(a=>`<button type="button" data-align="${a}" aria-label="Align ${a}"><svg class="ico"><use href="#a-${a==='left'?'l':a==='center'?'ch':'r'}"/></svg></button>`).join('')}</div>${NUM('sp','','%','Letter spacing','t-text')}</div>
  <div class="f-grid">${NUM('lh','','×','Line height','i-sliders')}${NUM('curve','','','Curve (−100 to 100)','t-path')}</div>
  <p class="warnline" id="tWarn" hidden><svg class="ico"><use href="#i-warn"/></svg><span></span></p></section>`}
 const canFill=els.every(x=>['text','rect','ellipse','shape','path'].includes(x.type)),canStroke=els.every(x=>['text','rect','ellipse','line','path'].includes(x.type));
 if(canFill)s+=`<section class="psec"><h3 class="psec-h">Fill${els.some(hasFill)?`<button type="button" class="iconbtn" data-nofill="fill" aria-label="Remove fill" data-tip="Remove fill"><svg class="ico"><use href="#i-minus"/></svg></button>`:`<button type="button" class="iconbtn" data-addpaint="fill" aria-label="Add fill" data-tip="Add fill"><svg class="ico"><use href="#i-plus"/></svg></button>`}</h3>${els.some(hasFill)?PAINT('fill','Fill'):'<p class="hint" style="margin:0">No fill.</p>'}</section>`;
 if(canStroke){const lineOnly=els.every(x=>x.type==='line'),on=els.some(hasStroke)||lineOnly;s+=`<section class="psec"><h3 class="psec-h">${allText?'Outline':'Stroke'}${lineOnly?'':on?`<button type="button" class="iconbtn" data-nofill="stroke" aria-label="Remove ${allText?'outline':'stroke'}" data-tip="Remove"><svg class="ico"><use href="#i-minus"/></svg></button>`:`<button type="button" class="iconbtn" data-addpaint="stroke" aria-label="Add ${allText?'outline':'stroke'}" data-tip="Add ${allText?'an outline':'a stroke'}"><svg class="ico"><use href="#i-plus"/></svg></button>`}</h3>${on?PAINT('stroke','Stroke')+`<div class="f-row">${NUM('sw','W','pt','Stroke width','i-sliders')}</div>`:`<p class="hint" style="margin:0">${allText?'Add an outline to make text pop on busy backgrounds.':'No stroke.'}</p>`}</section>`}
 if(e&&e.type==='image')s+=`<section class="psec"><h3 class="psec-h">Image</h3><div class="imgcard"><img id="iThumb" alt=""><div style="min-width:0"><div class="iname" id="iName"></div><span class="badge" id="iDpi"></span></div></div><p class="hint" id="iDpiHelp"></p>
  <div class="blk"><label class="switch" for="iClear"><span>Remove white background<small>Makes white around your logo see-through</small></span><input type="checkbox" id="iClear"></label></div>
  <div class="acts blk"><button type="button" class="btn btn-ghost sm" data-act="replace"><svg class="ico"><use href="#i-swap"/></svg>Replace</button><button type="button" class="btn btn-ghost sm" data-act="fillEdge" data-tip="Scale the art to cover the sticker, removing the white border"><svg class="ico"><use href="#i-fill"/></svg>Fill edge</button><button type="button" class="btn btn-ghost sm" data-act="fitArt" style="grid-column:span 2" data-tip="Change the sticker's shape and size to match the art"><svg class="ico"><use href="#i-fitsz"/></svg>Fit sticker to my art</button></div></section>`;
 s+=`<section class="psec"><h3 class="psec-h">Arrange</h3><div class="f-row" style="justify-content:space-between">${A('front','i-front','Bring to front','Ctrl ⇧ ]')}${A('fwd','i-up','Bring forward','Ctrl ]')}${A('back','i-down','Send backward','Ctrl [')}${A('bottom','i-back','Send to back','Ctrl ⇧ [')}${els.length>1?(els.every(x=>x.gid&&x.gid===els[0].gid)?A('ungroup','t-group','Ungroup','Ctrl ⇧ G'):A('group','t-group','Group','Ctrl G')):A('center','i-center','Center on sticker')}${A('dup','i-copy','Duplicate','Ctrl D')}${A('del','i-trash','Delete','Del')}</div></section>`;
 return s}
/* values that live in the inspector */
function gp(p){if(p==='dw')return fmt(D.w);if(p==='dh')return fmt(D.h);if(p==='pensw')return f2(penStyle.sw*.72);const els=selEls(),e=els[0];if(!e)return '';const b=els.length===1?bbox(e):unionBox(els),s=els.length===1?sz(e):b;
 switch(p){case 'x':return f2(b.x0/100);case 'y':return f2(b.y0/100);case 'w':return f2(s.w/100);case 'h':return e.type==='line'&&els.length===1?'—':f2(s.h/100);case 'rot':return f2(e.rot||0);case 'op':return String(Math.round((e.opacity??1)*100));
  case 'rad':return f2((e.radius||0)/100);case 'pt':{const v=els.map(ptSize);return v.every(x=>x===v[0])?String(v[0]):''}case 'sp':return String(e.spacing||0);case 'lh':return f2(e.lineH||1.15);case 'curve':return String(e.curve||0);case 'sw':return f2((e.sw||0)*.72);
  case 'dw':return fmt(D.w);case 'dh':return fmt(D.h);case 'pensw':return f2(penStyle.sw*.72)}return ''}
function sp(p,v,live){const els=selEls();if(p==='dw'||p==='dh'){if(!(v>=MIN&&v<=MAX)){toast('Enter a size between 0.5 and 8.5 inches.');return false}const sq=D.shape==='square'||D.shape==='circle',r=D.h/D.w;if(p==='dw')setSize(v,sq?v:docLock?v*r:D.h);else setSize(sq?v:docLock?v/r:D.w,v);return true}
 if(p==='pensw'){penStyle.sw=clamp(v/.72,.5,200);return true}
 if(!els.length)return false;const b=els.length===1?bbox(els[0]):unionBox(els);
 switch(p){
  case 'x':{const d=v*100-b.x0;els.forEach(e=>e.x+=d);break}
  case 'y':{const d=v*100-b.y0;els.forEach(e=>e.y+=d);break}
  case 'w':case 'h':{if(!(v>0))return false;if(els.length===1){const e=els[0],s=sz(e),cur=p==='w'?s.w:s.h,f=v*100/cur;if(e.type==='text')e.size=clamp(e.size*f,2,1400);else if(e.type==='line'){if(p==='w')e.w=v*100}else{if(p==='w'){e.w=v*100;if(keepRatio||e.type==='image')e.h*=f}else{e.h=v*100;if(keepRatio||e.type==='image')e.w*=f}}}
   else{const cur=p==='w'?b.w:b.h,f=v*100/cur;els.forEach(e=>{e.x=b.x0+(e.x-b.x0)*f;e.y=b.y0+(e.y-b.y0)*f;if(e.type==='text')e.size*=f;else{e.w*=f;if(e.type!=='line')e.h*=f}})}break}
  case 'rot':els.forEach(e=>e.rot=((v+180)%360+360)%360-180);break;
  case 'op':els.forEach(e=>e.opacity=clamp(v,0,100)/100);break;
  case 'rad':els.forEach(e=>{if(e.type==='rect')e.radius=clamp(v*100,0,Math.min(e.w,e.h)/2)});break;
  case 'pt':els.forEach(e=>{if(e.type==='text')e.size=clamp(v/.72,2,1400)});break;
  case 'sp':els.forEach(e=>{if(e.type==='text')e.spacing=clamp(v,-20,100)});break;
  case 'lh':els.forEach(e=>{if(e.type==='text')e.lineH=clamp(v,.6,3)});break;
  case 'curve':els.forEach(e=>{if(e.type==='text')e.curve=clamp(Math.round(v),-100,100)});break;
  case 'sw':els.forEach(e=>{e.sw=clamp(v/.72,0,400)});break}
 CT.sig='';if(!live)invalidateIfText(els);return true}
function invalidateIfText(els){}
function fillIns(){const ins=$('#ins'),els=selEls(),e=els.length===1?els[0]:null;
 $$('input[data-p]',ins).forEach(i=>{if(document.activeElement!==i){const v=gp(i.dataset.p);i.value=v;i.placeholder=v===''?'Mixed':''}});
 $$('[data-paint]',ins).forEach(c=>{const k=c.dataset.paint,v=paintVal(k);c.style.background=v&&v!=='none'?v:'';c.classList.toggle('none',!v||v==='none')});
 $$('input[data-hex]',ins).forEach(i=>{if(document.activeElement!==i){const v=paintVal(i.dataset.hex);i.value=v&&v!=='none'?v.replace('#',''):''}});
 if(!els.length){$$('.shp',ins).forEach(b=>b.setAttribute('aria-checked',String(b.dataset.shape===D.shape)));$$('.fin',ins).forEach(b=>b.setAttribute('aria-checked',String(b.dataset.vinyl===D.vinyl)));
  const cr=$('#cornersRow');if(cr){cr.hidden=!(D.shape==='rect'||D.shape==='square');$$('#cornersSeg button').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.corner==='yes')===!!D.rounded)))}
  const bb=$('#borderBox');if(bb){bb.hidden=D.shape!=='custom';const g=$('#gapIn');if(document.activeElement!==g)g.value=D.gap;$('#gapOut').textContent=fmt(D.gap/100)+' in';tilesUI()}
  const sh=$('#shapeHelp');if(sh){const t={custom:'The cut follows your artwork with a smooth outline. Size sets the design area.',circle:'Round art fits best. Square artwork will have its corners trimmed.'}[D.shape]||'';sh.textContent=t;sh.hidden=!t}
  const sq=D.shape==='square'||D.shape==='circle',dh=$('#in-dh');if(dh){dh.disabled=sq;$('#docLockBtn').disabled=sq;$('#docLockBtn').setAttribute('aria-pressed',String(sq||docLock))}
  const pr=$('#presets');if(pr){const list=PRESETS[D.shape]||PRESETS.rect,sig=JSON.stringify([D.shape,tier,D.w,D.h]);if(pr.dataset.sig!==sig){pr.dataset.sig=sig;pr.innerHTML=list.map(([w,h])=>{const p=r2(basePrice(w,h).b*(1-DISC[tier]));return `<button type="button" class="pchip" data-pw="${w}" data-ph="${h}" aria-pressed="${D.w===w&&D.h===h}" data-tip="${money(p)} each at ${QTY[tier].toLocaleString()}">${sq?w:w+' × '+h}${sq?' in':''}</button>`}).join('')}}
  const vh=$('#vinylHelp');if(vh)vh.textContent=D.vinyl==='white'?'Bright white base for bold, full color.':'White areas of your design print clear, so the metal shows through.';
  const bh=$('#bgHelp');if(bh)bh.textContent=D.bg.t==='img'?'Using an image. Pick a color to replace it.':D.vinyl==='white'?'"None" leaves the gloss white vinyl.':'Choose "None" to let the metal show.';return}
 const rb=$('#ratioBtn');if(rb)rb.setAttribute('aria-pressed',String(keepRatio||(e&&(e.type==='image'||e.type==='text'))));
 if(els.every(x=>x.type==='text')){const f=els.map(x=>x.font),fs=$('#fontSel');if(fs){const one2=f.every(x=>x===f[0]);fs.textContent=one2?FONTS[f[0]].n:'Mixed fonts';fs.style.fontFamily=one2?FONTS[f[0]].f:''}
  $('#tBold').setAttribute('aria-pressed',String(els.every(x=>x.bold)));$('#tItal').setAttribute('aria-pressed',String(els.every(x=>x.ital)));
  $$('#tAlign [data-align]').forEach(b=>b.setAttribute('aria-pressed',String(els.every(x=>x.align===b.dataset.align))));
  const tc=$('#tContent');if(tc&&e&&document.activeElement!==tc)tc.value=e.text;
  const cv=$('#in-curve');if(cv)cv.disabled=els.some(x=>String(x.text).includes('\n'));
  const small=els.find(x=>ptSize(x)<8),w=$('#tWarn');if(w){w.hidden=!small;if(small)$('span',w).textContent=`${ptSize(small)} pt is hard to read under the dome. Use 8 pt or larger.`}}
 if(e&&e.type==='image'){const m=IM[e.key]||{},d=dpi(e),b=$('#iDpi');$('#iThumb').src=(e.clear&&m.clear)||m.url||'';$('#iName').textContent=m.name||'';b.className='badge '+(d>=300?'ok':d>=150?'mid':'bad');
  b.textContent=m.vector?'Vector · prints sharp':d>=300?`${d} dpi · sharp`:d>=150?`${d} dpi · OK`:`${d} dpi · may look blurry`;const h=$('#iDpiHelp');h.textContent=m.vector?'':d<300?'Make it smaller, or upload a larger file for a sharper print.':'';h.hidden=!h.textContent;$('#iClear').checked=!!e.clear}}
function paintVal(k){if(k==='bg')return D.bg.t==='color'?D.bg.c:'none';if(k==='pen')return penStyle.stroke;const e=selEls().find(x=>k==='fill'?x.type!=='line'&&x.type!=='image':x.type!=='image'&&x.type!=='shape');if(!e)return 'none';return k==='stroke'&&e.type==='line'?(e.stroke||'#111827'):e[k]}
function setPaint(k,v,live){v=v==='none'?'none':normHex(v);if(!v)return;
 if(k==='bg'){D.bg=v==='none'?{t:'none',c:D.bg.c,img:D.bg.img}:{t:'color',c:v,img:D.bg.img};startDismissed=true}
 else if(k==='pen')penStyle.stroke=v==='none'?'#111827':v;
 else{selEls().forEach(e=>{if(k==='fill'&&['text','rect','ellipse','shape','path'].includes(e.type)){e.fill=v;if(v!=='none'&&e.type!=='text')lastFill=v}if(k==='stroke'&&['text','rect','ellipse','line','path'].includes(e.type)){e.stroke=e.type==='line'&&v==='none'?'#111827':v;if(v!=='none'&&!(e.sw>0))e.sw=e.type==='text'?Math.max(2,e.size*.06):3;if(e.type==='line'||e.type==='path')penStyle.stroke=e.stroke}})}
 CT.sig='';if(live)req();else{commit();syncPanels()}}
/* inspector events */
const insEl=$('#ins');
insEl.addEventListener('change',ev=>{const t=ev.target;
 if(t.dataset.p){const v=num(t.value);if(Number.isFinite(v)&&sp(t.dataset.p,v)){commit();syncPanels()}else t.value=gp(t.dataset.p);return}
 if(t.dataset.hex){const v=normHex(t.value);if(v)setPaint(t.dataset.hex,v);else t.value=(paintVal(t.dataset.hex)||'').replace('#','');return}
 if(t.id==='tContent'){const e=one();if(e){if(!t.value.trim()){act('del');return}e.text=t.value;CT.sig='';commit()}return}
 if(t.id==='iClear'){act('clearBg');return}
 if(t.id==='gapIn'){setGap(D.gap,'slider');return}
 if(t.id==='bgFile'){loadFile(t.files[0],k=>{D.bg={t:'img',c:D.bg.c,img:k};startDismissed=true;commit();syncPanels()});t.value=''}});
insEl.addEventListener('input',ev=>{const t=ev.target;if(t.id==='tContent'){const e=one();if(e&&t.value.trim()){e.text=t.value;req()}}if(t.id==='gapIn'){D.gap=+t.value;CT.sig='';$('#gapOut').textContent=fmt(D.gap/100)+' in';req()}});
insEl.addEventListener('keydown',ev=>{const t=ev.target;if(t.dataset&&t.dataset.p&&(ev.key==='ArrowUp'||ev.key==='ArrowDown')){ev.preventDefault();const st=STEP[t.dataset.p]*(ev.shiftKey?10:1)*(ev.key==='ArrowUp'?1:-1),cur=num(t.value);if(!Number.isFinite(cur))return;if(sp(t.dataset.p,r2(cur+st))){t.value=gp(t.dataset.p);commitSoon();req()}}if(ev.key==='Enter'&&t.tagName==='INPUT')t.blur();if(ev.key==='Escape'&&t.tagName==='INPUT'){t.value=t.dataset.p?gp(t.dataset.p):t.value;t.blur()}});
insEl.addEventListener('click',ev=>{const t=ev.target,b=t.closest('button');if(!b)return;
 if(b.dataset.act){act(b.dataset.act);return}
 if(b.dataset.shape){setShape(b.dataset.shape);return}
 if(b.dataset.vinyl){setVinyl(b.dataset.vinyl);return}
 if(b.dataset.corner){D.rounded=b.dataset.corner==='yes';commit();syncPanels();return}
 if(b.dataset.pw){setSize(+b.dataset.pw,+b.dataset.ph);commit();syncPanels();return}
 if(b.id==='docLockBtn'){docLock=!docLock;fillIns();return}
 if(b.id==='ratioBtn'){keepRatio=!keepRatio;fillIns();return}
 if(b.id==='bgImgBtn'){$('#bgFile').click();return}
 if(b.dataset.paint){openColor(b,b.dataset.paint);return}
 if(b.dataset.nofill){setPaint(b.dataset.nofill,'none');return}
 if(b.dataset.addpaint){const k=b.dataset.addpaint;setPaint(k,k==='stroke'?(lum(paintVal('fill'))>.5?'#111827':'#FFFFFF'):lastFill);return}
 if(b.id==='fontSel'){openFonts(b);return}
 if(b.id==='tBold'||b.id==='tItal'){const k=b.id==='tBold'?'bold':'ital',els=selEls(),on=!els.every(x=>x[k]);els.forEach(x=>x[k]=on);CT.sig='';commit();syncPanels();return}
 if(b.dataset.align){selEls().forEach(x=>x.align=b.dataset.align);commit();syncPanels();return}
 const tile=t.closest('.btile');if(tile){const g=+tile.dataset.gap;if(g===D.gap&&!fitXf(g))return;setGap(g,'tile')}});
/* drag a field's label to scrub its value (Figma-style) */
const STEP={x:.01,y:.01,w:.01,h:.01,rot:1,op:1,rad:.01,pt:.5,sp:1,lh:.05,curve:1,sw:.25,dw:.05,dh:.05,pensw:.25};
insEl.addEventListener('pointerdown',ev=>{const l=ev.target.closest('[data-scrub]');if(!l||ev.button!==0)return;const p=l.dataset.scrub,inp=$('#in-'+p);if(!inp||inp.disabled)return;ev.preventDefault();const v0=num(inp.value);if(!Number.isFinite(v0))return;
 let moved=false;const x0=ev.clientX;l.setPointerCapture(ev.pointerId);document.body.style.cursor='ew-resize';
 const mv=e2=>{const dx=e2.clientX-x0;if(!moved&&Math.abs(dx)<2)return;moved=true;const v=r2(v0+Math.round(dx/2)*STEP[p]*(e2.shiftKey?10:1));if(sp(p,v,true)){inp.value=gp(p);req()}};
 const up=()=>{l.removeEventListener('pointermove',mv);l.removeEventListener('pointerup',up);l.removeEventListener('pointercancel',up);document.body.style.cursor='';if(moved){commit();syncPanels()}else{inp.focus();inp.select()}};
 l.addEventListener('pointermove',mv);l.addEventListener('pointerup',up);l.addEventListener('pointercancel',up)});

/* ---------- sticker shape / size / finish ---------- */
let szBase=null;
function setSize(nw,nh){nw=clamp(nw,MIN,MAX);nh=clamp(nh,MIN,MAX);
 if(!szBase||szBase.sig!==JSON.stringify(D.els))szBase={w:D.w,h:D.h,els:JSON.stringify(D.els)};
 const sx=nw/szBase.w,sy=nh/szBase.h,s=Math.min(sx,sy);D.els=JSON.parse(szBase.els);
 D.els.forEach(e=>{e.x*=sx;e.y*=sy;if(e.type==='text')e.size*=s;else{e.w*=s;if(e.type!=='line')e.h*=s}});D.w=Math.round(nw*100)/100;D.h=Math.round(nh*100)/100;szBase.sig=JSON.stringify(D.els);CT.sig='';if(zoom===1)cam=null;req()}
function setShape(v){D.shape=v;if(v==='square'||v==='circle'){const m=Math.max(D.w,D.h);if(D.w!==m||D.h!==m)setSize(m,m)}CT.sig='';if(v!=='custom')CT.url=null;track('builder_shape',{shape:v});commit();syncPanels()}
function setVinyl(v){D.vinyl=v;track('builder_vinyl',{vinyl:v});commit();syncPanels()}

/* ---------- popovers ---------- */
const pop=$('#pop');let popFor=null,popClose=null;
function openPop(anchor,html,opt){opt=opt||{};pop.innerHTML=html;pop.className='pop '+(opt.cls||'');pop.setAttribute('role',opt.role||'menu');pop.hidden=false;popFor=opt.btn||null;popClose=opt.onClose||null;if(popFor)popFor.setAttribute('aria-expanded','true');
 const r=anchor.getBoundingClientRect?anchor.getBoundingClientRect():{left:anchor.x,right:anchor.x,top:anchor.y,bottom:anchor.y},pw=pop.offsetWidth,ph=pop.offsetHeight,vw=innerWidth,vh=innerHeight;
 let x=opt.align==='right'?r.right-pw:r.left,y=opt.above?r.top-ph-6:r.bottom+6;if(y+ph>vh-8)y=Math.max(8,r.top-ph-6);if(opt.above&&y<8)y=r.bottom+6;x=clamp(x,8,vw-pw-8);y=clamp(y,8,vh-ph-8);
 pop.style.left=x+'px';pop.style.top=y+'px';const f=$('[aria-checked="true"],.mi:not(:disabled),input,button',pop);if(f&&opt.focus!==false)f.focus({preventScroll:true})}
function closePop(){if(pop.hidden)return;pop.hidden=true;if(popFor)popFor.setAttribute('aria-expanded','false');const c=popClose;popFor=null;popClose=null;if(c)c()}
document.addEventListener('pointerdown',ev=>{if(!pop.hidden&&!pop.contains(ev.target)&&!(popFor&&popFor.contains(ev.target)))closePop()},true);
document.addEventListener('keydown',ev=>{if(pop.hidden)return;if(ev.key==='Escape'){ev.stopPropagation();const b=popFor;closePop();if(b)b.focus();return}
 if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){const items=$$('.mi:not(:disabled),.qrow',pop);if(!items.length)return;ev.preventDefault();const i=items.indexOf(document.activeElement),n=items[(i+(ev.key==='ArrowDown'?1:-1)+items.length)%items.length];n.focus()}},true);
window.addEventListener('resize',closePop);
const MI=(a,ic,l,k,dis)=>`<button type="button" class="mi" role="menuitem" data-mact="${a}"${dis?' disabled':''}>${ic?`<svg class="ico"><use href="#${ic}"/></svg>`:'<span style="width:16px"></span>'}<span>${l}</span>${k?`<kbd>${k}</kbd>`:''}</button>`;
function openCtxMenu(x,y){const els=selEls(),n=els.length,locked=els.some(e=>e.locked),grp=n>1&&els.every(e=>e.gid&&e.gid===els[0].gid);let h='';
 if(!n){h=MI('paste','i-copy','Paste','Ctrl V',!clip)+MI('selectAll','t-move','Select all','Ctrl A',!D.els.length)+'<div class="msep"></div>'+MI('zfit','i-fill','Zoom to fit','⇧ 1')+MI('rulers','i-ruler',showRulers?'Hide rulers':'Show rulers','⇧ R')+'<div class="msep"></div>'+MI('sticker','i-sticker','Sticker settings')}
 else{if(n===1&&els[0].type==='text')h+=MI('edit','i-pencil','Edit text','Enter');
  h+=MI('copy','i-copy','Copy','Ctrl C')+MI('paste','i-copy','Paste','Ctrl V',!clip)+MI('dup','i-copy','Duplicate','Ctrl D')+MI('del','i-trash','Delete','Del')+'<div class="msep"></div>'+
   MI('front','i-front','Bring to front','Ctrl ⇧ ]')+MI('fwd','i-up','Bring forward','Ctrl ]')+MI('back','i-down','Send backward','Ctrl [')+MI('bottom','i-back','Send to back','Ctrl ⇧ [')+'<div class="msep"></div>'+
   (n>1?(grp?MI('ungroup','t-group','Ungroup','Ctrl ⇧ G'):MI('group','t-group','Group selection','Ctrl G')):'')+MI('flipH','i-fliph','Flip horizontal','⇧ H')+MI('flipV','i-flipv','Flip vertical','⇧ V')+MI('center','i-center','Center on sticker')+'<div class="msep"></div>'+
   MI('copyStyle','i-palette','Copy style','Ctrl Alt C')+MI('pasteStyle','i-palette','Paste style','Ctrl Alt V',!styleClip)+'<div class="msep"></div>'+
   MI('lock',locked?'i-unlock':'i-lock',locked?'Unlock':'Lock','Ctrl ⇧ L')+MI('hide','i-eyeoff','Hide','Ctrl ⇧ H')+(n===1?MI('rename','i-pencil','Rename layer'):'')+MI('zsel','i-search','Zoom to selection','⇧ 2')}
 openPop({x,y},h,{})}
pop.addEventListener('click',ev=>{const b=ev.target.closest('[data-mact]');if(!b||b.disabled)return;const a=b.dataset.mact;closePop();
 if(a==='zfit')return fit();if(a==='zsel')return zoomSel();if(a==='zin')return zoomTo(zoom*1.25);if(a==='zout')return zoomTo(zoom/1.25);if(a==='z100')return zoomActual();
 if(a==='rulers'){showRulers=!showRulers;$('#cvWrap').classList.toggle('no-rulers',!showRulers);req();return}
 if(a==='sticker'){setSel([]);return}
 if(a==='rename'){const e=one();if(e){if(NARROW.matches)openSheet('layers');setLTab('layers');requestAnimationFrame(()=>renameLayer(e.id))}return}
 if(a.startsWith('gfx:')){addShape(a.slice(4));return}
 act(a)});
$('#shapesBtn').addEventListener('click',ev=>{const b=ev.currentTarget;if(!pop.hidden&&popFor===b){closePop();return}
 openPop(b,`<div class="mh">Basic</div><div class="gfx" style="padding:0 4px 6px">${[['prim-rect','Rectangle','<rect x="12" y="22" width="76" height="56" rx="4"/>'],['prim-ellipse','Ellipse','<circle cx="50" cy="50" r="38"/>'],['prim-line','Line','<path d="M14 86L86 14"/>']].map(([k,n,d])=>`<button type="button" class="prim" data-mact="gfx:${k}" aria-label="${n}" data-tip="${n}"><svg viewBox="0 0 100 100" aria-hidden="true">${d}</svg></button>`).join('')}</div><div class="mh">Shapes &amp; icons</div><div class="gfx" style="padding:0 4px 4px">${Object.entries(GFX).map(([k,g])=>`<button type="button" data-mact="gfx:${k}" aria-label="${g.n}" data-tip="${g.n}"><svg viewBox="0 0 100 100" aria-hidden="true"><path fill-rule="evenodd" d="${g.d}"/></svg></button>`).join('')}</div>`,{btn:b,cls:'cpop',focus:false})});
$('#zLbl').addEventListener('click',ev=>{const b=ev.currentTarget;openPop(b,MI('zin','i-plus','Zoom in','Ctrl +')+MI('zout','i-minus','Zoom out','Ctrl −')+'<div class="msep"></div>'+MI('zfit','i-fill','Zoom to fit','⇧ 1')+MI('zsel','i-search','Zoom to selection','⇧ 2',!sel.length)+MI('z100','i-sticker','Actual size (100%)','⇧ 0')+'<div class="msep"></div>'+MI('rulers','i-ruler',showRulers?'Hide rulers':'Show rulers','⇧ R'),{btn:b,above:true,align:'right'})});
$('#zIn').addEventListener('click',()=>zoomTo(zoom*1.25));$('#zOut').addEventListener('click',()=>zoomTo(zoom/1.25));
/* color */
function docColors(){const s=new Set();D.els.forEach(e=>{['fill','stroke'].forEach(k=>{if(e[k]&&e[k]!=='none'&&/^#/.test(e[k]))s.add(e[k].toUpperCase())})});if(D.bg.t==='color')s.add(D.bg.c.toUpperCase());return [...s].slice(0,16)}
function openColor(btn,k){const cur=(paintVal(k)||'none').toUpperCase(),dc=docColors(),noneOk=k!=='pen'&&!(k==='stroke'&&selEls().every(e=>e.type==='line'));
 const sw=list=>`<div class="sws">${list.map(c=>`<button type="button" data-c="${c}" style="background:${c}" aria-label="${c}" aria-pressed="${c===cur}"></button>`).join('')}</div>`;
 openPop(btn,`<div class="mh">Brand &amp; basics</div>${sw(PALETTE)}${dc.length?`<div class="mh">In this design</div>${sw(dc)}`:''}<div class="f-row"><input type="color" id="cpNative" value="${cur!=='NONE'?cur.toLowerCase():'#21c8e2'}" aria-label="Custom color"><div class="num" style="flex:1"><label class="nl" style="cursor:default">#</label><input id="cpHex" value="${cur!=='NONE'?cur.slice(1):''}" maxlength="7" aria-label="Hex color"></div>${noneOk?`<button type="button" class="chip none" data-c="none" aria-label="None" data-tip="None" style="width:32px;height:32px"></button>`:''}</div>`,{btn,cls:'cpop',role:'dialog',onClose:()=>{commit();syncPanels()}});
 pop.onclick=ev=>{const c=ev.target.closest('[data-c]');if(!c)return;setPaint(k,c.dataset.c,true);$$('.sws button',pop).forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.c===c.dataset.c)));if(c.dataset.c!=='none')$('#cpHex').value=c.dataset.c.slice(1);syncPanels()};
 $('#cpNative').addEventListener('input',ev=>{setPaint(k,ev.target.value,true);$('#cpHex').value=ev.target.value.slice(1).toUpperCase();fillIns()});
 $('#cpHex').addEventListener('change',ev=>{const v=normHex(ev.target.value);if(v){setPaint(k,v,true);$('#cpNative').value=v.toLowerCase();fillIns()}});
 $('#cpHex').addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();ev.target.dispatchEvent(new Event('change'));closePop()}})}
pop.addEventListener('click',()=>{});
const _openPop=openPop;openPop=function(a,h,o){pop.onclick=null;_openPop(a,h,o)};
function openFonts(btn){const els=selEls(),cur=els.length&&els.every(e=>e.font===els[0].font)?els[0].font:-1;
 openPop(btn,`<div class="fontlist" role="listbox" aria-label="Font">${FONTS.map((f,i)=>`<button type="button" class="mi" role="option" data-font="${i}" aria-checked="${i===cur}" style="font-family:${f.f.replace(/"/g,"'")};font-weight:${f.w}">${f.n}</button>`).join('')}</div>`,{btn,role:'dialog'});
 pop.onclick=ev=>{const b=ev.target.closest('[data-font]');if(!b)return;selEls().forEach(e=>{if(e.type==='text')e.font=+b.dataset.font});CT.sig='';commit();closePop();syncPanels()};
 pop.onmouseover=null}
ft.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.paint){openColor(b,b.dataset.paint);return}if(b.dataset.act)act(b.dataset.act)});

/* ---------- tooltips ---------- */
const tip=$('#tip');let tipT=0,tipEl=null;
function hideTip(){clearTimeout(tipT);tip.classList.remove('show');tipEl=null}
document.addEventListener('pointerover',ev=>{if(ev.pointerType!=='mouse')return;const el=ev.target.closest('[data-tip]');if(el===tipEl)return;hideTip();if(!el)return;tipEl=el;tipT=setTimeout(()=>{if(!document.contains(el))return;
 const k=el.dataset.key;tip.innerHTML=esc(el.dataset.tip)+(k?' '+k.split(' ').map(x=>`<kbd>${esc(x)}</kbd>`).join(''):'');const r=el.getBoundingClientRect(),tw=tip.offsetWidth,th=tip.offsetHeight;let y=r.bottom+8;if(y+th>innerHeight-6)y=r.top-th-8;
 tip.style.left=clamp(r.left+r.width/2-tw/2,6,innerWidth-tw-6)+'px';tip.style.top=y+'px';tip.classList.add('show')},380)});
document.addEventListener('pointerdown',hideTip,true);document.addEventListener('scroll',hideTip,true);

/* ---------- quote bar ---------- */
function cbarUI(){const t=curTier(),all=tiers(),ps=pricedSize(),blank=isBlank(),ck=blank?null:checks(),nw=ck?ck.filter(c=>c.level==='warning'||c.level==='error').length:0;
 const pill=$('#chkPill');pill.className='pill '+(blank?'':nw?'warn':'ok');$('#chkTxt').textContent=blank?'Print check':nw?`${nw} thing${nw===1?'':'s'} to check`:'Print-ready';pill.setAttribute('aria-label',blank?'Print check runs once you add a design':nw?`${nw} print issues to check`:'Print check passed');
 const sm=`<b>${esc(SN[D.shape])}</b><span class="sep">·</span>${fmt(ps.w)} × ${fmt(ps.h)} in<span class="sep">·</span>${esc(VN[D.vinyl])}`;if($('#cbSum').dataset.h!==sm){$('#cbSum').dataset.h=sm;$('#cbSum').innerHTML=sm}
 $('#qtyTxt').textContent=`${t.q.toLocaleString()} stickers`;$('#qtyEach').textContent=`${money(t.p)} ea`;
 $('#totAmt').textContent=money(t.t);const rem=FREE-t.t;$('#totSub').innerHTML=`<span class="save">Save ${t.s}%</span> · ${rem>0?`Free shipping at ${money(FREE)}`:'Ships free'}`;
 const rb=$('#reviewBtn');const nar=NARROW.matches;rb.innerHTML=blank?'<svg class="ico" aria-hidden="true"><use href="#i-spark"/></svg>'+(nar?'Design it':'Add your design'):(nar?'Order':'Review &amp; order')+'<svg class="ico" aria-hidden="true"><use href="#i-send"/></svg>';
 const tp=$('#tpShipTxt');if(tp)tp.textContent=rem>0?`Orders of $75 or more ship free. Add ${money(rem)} more to this order to qualify.`:'Good news: this order ships free.';
 $('#skuCode')&&($('#skuCode').textContent=skuFor());upsellUI(t)}
function priceBreak(){const all=tiers(),t=all[tier],n=all[tier+1];if(!n)return '';return `At ${n.q.toLocaleString()} the price drops from ${money(t.p)} to ${money(n.p)} each.`}
$('#qtyBtn').addEventListener('click',ev=>{const b=ev.currentTarget;if(!pop.hidden&&popFor===b){closePop();return}const all=tiers();
 openPop(b,`<div class="mh">Quantity · ${fmt(pricedSize().w)} × ${fmt(pricedSize().h)} in</div>${all.map((x,i)=>`<button type="button" class="qrow" role="menuitemradio" data-tier="${i}" aria-checked="${i===tier}"><span class="rd" aria-hidden="true"></span><span><b>${x.q.toLocaleString()}</b><small>${money(x.p)} each</small></span><span class="sv">Save ${x.s}%</span><span class="tt">${money(x.t)}</span></button>`).join('')}${priceBreak()?`<p class="qnote">${priceBreak()}</p>`:''}`,{btn:b,cls:'qpop',above:true,align:'right'});
 pop.onclick=e2=>{const r=e2.target.closest('[data-tier]');if(!r)return;tier=+r.dataset.tier;commit();closePop();track('builder_qty',{qty:QTY[tier]})}});
$('#chkPill').addEventListener('click',ev=>{const b=ev.currentTarget;if(!pop.hidden&&popFor===b){closePop();return}
 if(isBlank()){openPop(b,`<p class="hint" style="margin:6px 8px 8px;max-width:280px">The print check looks for small text, low-resolution images, art past the safe area, thin lines and low contrast. It runs as soon as you add a design.</p>`,{btn:b,above:true,role:'dialog',cls:'chkpop'});return}
 openPop(b,`<div class="mh">Print check</div><ul class="checks" style="padding:0 2px 4px">${checksHTML(checks())}</ul>`,{btn:b,above:true,role:'dialog',cls:'chkpop'});pop.onclick=e2=>onCheckClick(e2,false)});
$('#reviewBtn').addEventListener('click',()=>{if(isBlank()){startDismissed=false;setView('edit');req();if(NARROW.matches)openSheet('genie');else requestAnimationFrame(()=>$('#startText').focus());return}openReview()});

/* ---------- print check (codes follow the Print MCP spec) ---------- */
const VBASE={white:'#FFFFFF',silver:'#C0C4CA',gold:'#C9A227'};
function colorBehind(e){const i=D.els.indexOf(e);for(let j=i-1;j>=0;j--){const o=D.els[j];if(o.hidden)continue;const b=bbox(o);if(e.x<b.x0||e.x>b.x1||e.y<b.y0||e.y>b.y1)continue;if(o.type==='image')return null;if(['rect','ellipse','shape'].includes(o.type)&&hasFill(o))return o.fill}
 if(D.bg.t==='img')return null;if(D.bg.t==='color')return D.vinyl!=='white'&&D.bg.c.toUpperCase()==='#FFFFFF'?VBASE[D.vinyl]:D.bg.c;return VBASE[D.vinyl]}
function fitInside(e){const cx=W()/2,cy=H()/2;for(let i=0;i<60&&outsideSafe(e);i++){e.x+=(cx-e.x)*.15;e.y+=(cy-e.y)*.15;if(i>6){if(e.type==='text')e.size*=.96;else{e.w*=.96;if(e.type!=='line')e.h*=.96}if(e.type==='text')measureNow(e)}}}
function measureNow(e){const host=$('#msr');host.textContent='';const g=mk('g');host.appendChild(g);drawEl(e,g);measure(e,g);host.textContent=''}
function checks(){if(isBlank())return[{level:'error',code:'EMPTY_DESIGN',message:'Your sticker is blank.',suggestion:'Generate a design with Genie, upload artwork or pick a template.'}];const out=[];
 for(const e of D.els){if(e.hidden)continue;const n=label(e);
  if(outsideSafe(e)&&!covers(e))out.push({level:'warning',code:'OUTSIDE_SAFE_AREA',id:e.id,message:`"${n}" runs past the safe area.`,suggestion:'Details near the edge can be trimmed or distorted under the dome.',fix:'Move inside',run:()=>fitInside(e)});
  if(e.type==='text'&&ptSize(e)<8)out.push({level:'warning',code:'TEXT_TOO_SMALL',id:e.id,message:`"${n}" is ${ptSize(e)} pt.`,suggestion:'Text under 8 pt is hard to read under the dome.',fix:'Make it 8 pt',run:()=>{e.size=8/.72}});
  if(e.type==='image'&&IM[e.key]&&!IM[e.key].vector&&dpi(e)<150){const sharpW=IM[e.key].natW/3;out.push({level:'warning',code:'RESOLUTION_TOO_LOW',id:e.id,message:`"${n}" is ${dpi(e)} dpi at this size.`,suggestion:`It may print blurry. Upload a larger file, or use it at ${f2(sharpW/100)} in wide or smaller.`,fix:sharpW>=30?'Resize to sharp':null,run:()=>{const f=sharpW/e.w;e.w*=f;e.h*=f}})}
  if((e.type==='line'||e.type==='path'||hasStroke(e))&&e.sw*.72<.5)out.push({level:'warning',code:'THIN_LINE',id:e.id,message:`"${n}" has a ${f2(e.sw*.72)} pt line.`,suggestion:'Lines under 0.5 pt may not print.',fix:'Make it 1 pt',run:()=>{e.sw=1/.72}});
  if(e.type==='text'&&hasFill(e)){const bg=colorBehind(e);if(bg&&contrast(e.fill,hasStroke(e)?e.stroke:bg)<1.5&&contrast(e.fill,bg)<1.5){const better=contrast('#111827',bg)>contrast('#FFFFFF',bg)?'#111827':'#FFFFFF';out.push({level:'warning',code:'LOW_CONTRAST',id:e.id,message:`"${n}" is hard to see on its background.`,suggestion:'Use a color with more contrast.',fix:better==='#111827'?'Use dark text':'Use light text',run:()=>{e.fill=better}})}}}
 const hid=D.els.filter(e=>e.hidden).length;if(hid)out.push({level:'info',code:'HIDDEN_LAYERS',message:`${hid} hidden layer${hid===1?'':'s'} won't print.`,suggestion:'Show them in Layers if they should.'});
 {const bt=borderTarget();if(bt&&D.shape!=='custom'&&D.shape!=='circle'&&D.shape!=='oval'&&D.bg.t==='none'&&inkOf(bt.key).round)out.push({level:'info',code:'ROUND_ART',message:'Your art is round, so the corners print white.',fix:'Make it round',run:()=>removeBorder('fit'),later:1})}
 if(D.els.some(covers))out.push({level:'info',code:'EDGE_TO_EDGE',message:'Your artwork runs to the edge.',suggestion:'Keep key text and logos inside the dashed safe line.'});
 else if(hasBorder(borderTarget()))out.push({level:'info',code:'WHITE_BORDER',message:'There\'s a white border around your artwork.',fix:'Fill edge to edge',run:()=>removeBorder('fill'),later:1});
 if(D.shape==='custom'&&D.els.some(e=>e.type==='image'&&!e.clear))out.push({level:'info',code:'CUT_FOLLOWS_BOX',message:'The cut follows the image box.',suggestion:'If your logo has a white background, turn on "Remove white background" for a tighter cut.'});
 if(D.vinyl!=='white')out.push({level:'info',code:'METALLIC_WHITE',message:`White areas print clear, so the ${D.vinyl} shows through.`});
 const txt=D.els.filter(e=>e.type==='text'&&!e.hidden).map(e=>'"'+String(e.text).replace(/\n/g,' ')+'"');if(txt.length)out.push({level:'info',code:'SPELLING',message:`Check your spelling: ${txt.join(', ')}.`});
 if(!out.some(c=>c.level==='warning'||c.level==='error'))out.unshift({level:'ok',code:'OK',message:'No print problems found.'});return out}
let CK=[];
function checksHTML(list){CK=list;return list.map((c,i)=>`<li class="${c.level}"><svg class="ico" aria-hidden="true"><use href="#${c.level==='ok'?'i-ok':c.level==='info'?'i-info':'i-warn'}"/></svg><span>${esc(c.message)}${c.suggestion?`<small>${esc(c.suggestion)}</small>`:''}</span>${c.fix?`<button type="button" class="fix" data-fix="${i}">${esc(c.fix)}</button>`:c.id?`<button type="button" class="fix" data-show="${i}">Show</button>`:''}</li>`).join('')}
function onCheckClick(ev,inReview){const f=ev.target.closest('[data-fix]'),s=ev.target.closest('[data-show]');if(!f&&!s)return;const c=CK[f?+f.dataset.fix:+s.dataset.show];if(!c)return;
 if(f){if(c.run)c.run();CT.sig='';if(!c.later)commit();track('print_check_fix',{code:c.code});toast(`Fixed: ${c.fix}.`,'Undo',undo);if(inReview)renderReview();else{closePop()}if(c.id&&!inReview)setSel([c.id]);syncPanels();req();return}
 if(c.id){if(inReview)$('#reviewDlg').close();closePop();setView('edit');setSel([c.id]);zoomSel()}}

/* ---------- remove white border / fit ---------- */
const BLEED=.03;
function inkOf(k){const m=IM[k];if(!m)return{x:0,y:0,w:1,h:1};if(m.ink)return m.ink;const im=m.img;if(!im||!im.complete||!im.naturalWidth)return{x:0,y:0,w:1,h:1};
 const s=Math.min(1,320/Math.max(im.naturalWidth,im.naturalHeight)),cw=Math.max(1,Math.round(im.naturalWidth*s)),ch=Math.max(1,Math.round(im.naturalHeight*s)),c=document.createElement('canvas');c.width=cw;c.height=ch;
 let d;try{const x=c.getContext('2d');x.drawImage(im,0,0,cw,ch);d=x.getImageData(0,0,cw,ch).data}catch(e){return m.ink={x:0,y:0,w:1,h:1}}
 let x0=cw,y0=ch,x1=-1,y1=-1;for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const j=(y*cw+x)*4;if(d[j+3]<24||Math.min(d[j],d[j+1],d[j+2])>=244)continue;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
 if(x1<0)return m.ink={x:0,y:0,w:1,h:1};
 const iw=x1-x0+1,ih=y1-y0+1,cs=Math.max(2,Math.round(Math.min(iw,ih)*.12));let tot=0,inkc=0;
 for(const [cx,cy] of [[x0,y0],[x1-cs+1,y0],[x0,y1-cs+1],[x1-cs+1,y1-cs+1]])for(let y=cy;y<cy+cs;y++)for(let x=cx;x<cx+cs;x++){const j=(y*cw+x)*4;tot++;if(d[j+3]>=24&&Math.min(d[j],d[j+1],d[j+2])<244)inkc++}
 return m.ink={x:x0/cw,y:y0/ch,w:iw/cw,h:ih/ch,round:inkc/tot<.06}}
function borderTarget(){const s=one();if(s&&s.type==='image')return s;let best=null,ba=0;for(const e of D.els)if(e.type==='image'&&!e.hidden&&e.w*e.h>ba){ba=e.w*e.h;best=e}return best}
function fillEl(e){const k=inkOf(e.key),Wd=W()*(1+BLEED),Hd=H()*(1+BLEED),ar=e.w/e.h,w=Math.max(Wd/k.w,Hd/k.h*ar),h=w/ar;e.rot=0;e.w=w;e.h=h;e.x=W()/2-((k.x+k.w/2)-.5)*w;e.y=H()/2-((k.y+k.h/2)-.5)*h}
function covers(e){if(!e||e.type!=='image'||D.shape==='custom'||Math.round(e.rot||0)%360)return false;const k=inkOf(e.key),l=e.x-e.w/2+k.x*e.w,t=e.y-e.h/2+k.y*e.h;return l<=1&&t<=1&&l+k.w*e.w>=W()-1&&t+k.h*e.h>=H()-1}
function hasBorder(e){if(!e||D.shape==='custom'||D.bg.t!=='none')return false;const k=inkOf(e.key);if((e.rot||0)%360)return false;const l=e.x-e.w/2+k.x*e.w,t=e.y-e.h/2+k.y*e.h,r=l+k.w*e.w,b=t+k.h*e.h,m=Math.min(W(),H())*.04;return l>m||t>m||W()-r>m||H()-b>m}
function removeBorder(mode){
 if(D.shape==='custom'){const mn=6;if(D.gap<=mn){toast('The border is already as thin as we can cut.');return}D.gap=mn;CT.sig='';commit();syncPanels();track('border_remove',{mode:'gap'});toast(`Border set to the thinnest we can cut (${fmt(mn/100)} in).`,'Undo',undo);return}
 const e=borderTarget();if(!e){toast('Add an image first. For text-only designs, pick a background color in Sticker settings.');return}
 let msg='Artwork now fills the sticker edge to edge.';
 if(mode==='fit'){const k=inkOf(e.key),art=(e.w*k.w)/(e.h*k.h),sq=D.shape==='square'||D.shape==='circle',isRound=D.shape==='circle'||D.shape==='oval';
  if(k.round&&!isRound){const ns=art>.9&&art<1.1?'circle':'oval';D.shape=ns;CT.url=null;if(ns==='circle'){const m=Math.max(D.w,D.h);setSize(m,m)}else{const long=Math.max(D.w,D.h);setSize(art>=1?long:long*art,art>=1?long/art:long)}msg=`Your art is round, so the sticker is now ${ns==='circle'?'a circle':'an oval'} at ${fmt(D.w)} x ${fmt(D.h)} in.`}
  else if(sq)msg='Square and circle stickers keep their shape, so the artwork was filled instead.';
  else{const long=Math.max(D.w,D.h);let nw=art>=1?long:long*art,nh=art>=1?long/art:long;const f=Math.min(1,MAX/Math.max(nw,nh));nw=Math.max(MIN,Math.round(nw*f*20)/20);nh=Math.max(MIN,Math.round(nh*f*20)/20);setSize(nw,nh);msg=`Sticker resized to ${fmt(D.w)} x ${fmt(D.h)} in to match your art.`}}
 const e2=borderTarget()||e;fillEl(e2);CT.sig='';commit();syncPanels();req();track('border_remove',{mode});toast(msg,'Undo',undo)}

/* ---------- border tiles (Cut to design) ---------- */
const BGAPS=[[6,'Tight'],[12,'Standard'],[20,'Bold'],[30,'Extra']];
function fitXf(g){const c=contourAt(0,Math.min(1,300/Math.max(W(),H())));if(!c)return null;const b=c.bbox,w=W(),h=H();
 if(b.x-g>=-.5&&b.y-g>=-.5&&b.x+b.w+g<=w+.5&&b.y+b.h+g<=h+.5)return null;return{s:Math.min(1,(w-2*g)/b.w,(h-2*g)/b.h),ax:b.x+b.w/2,ay:b.y+b.h/2}}
function applyXf(xf){D.els.forEach(e=>{e.x=(e.x-xf.ax)*xf.s+W()/2;e.y=(e.y-xf.ay)*xf.s+H()/2;if(e.type==='text')e.size*=xf.s;else{e.w*=xf.s;if(e.type!=='line')e.h*=xf.s}});invalidateText()}
let bfitSig='';
function setGap(g,src){const prevB=D.bfit&&D.bfit<1&&bfitSig===JSON.stringify(D.els)?D.bfit:1;if(prevB<1)applyXf({s:1/prevB,ax:W()/2,ay:H()/2});D.bfit=1;
 const xf=fitXf(g);if(xf){applyXf(xf);D.bfit=xf.s}bfitSig=JSON.stringify(D.els);D.gap=g;CT.sig='';commit();syncPanels();req();track('border_pick',{gap:g,src});
 if(xf&&xf.s<.995)toast(`Your design was scaled to ${Math.round(xf.s*100)}% so a ${fmt(g/100)} in border fits in ${fmt(D.w)} x ${fmt(D.h)} in.`,'Undo',undo);else if(prevB<1)toast('Your design is back to its full size.')}
let thumbT=0,thumbSig='',tilesHTML='';
function schedThumbs(){if(D.shape!=='custom'||selEls().length)return;const s=JSON.stringify([contourSig(),D.vinyl]);if(s===thumbSig&&$('#borderTiles')&&$('#borderTiles').innerHTML)return;thumbSig=s;clearTimeout(thumbT);thumbT=setTimeout(buildThumbs,op?250:60)}
function buildThumbs(){const box=$('#borderTiles');if(!box)return;const w=W(),h=H(),P=Math.min(1,200/Math.max(w,h)),xfs=BGAPS.map(([g])=>fitXf(g)),res=BGAPS.map(([g],i)=>contourAt(g,P,xfs[i]));
 if(!res[3]){box.innerHTML='<p class="hint" style="grid-column:1/-1;margin:0">Add artwork to preview border widths.</p>';return}
 const ub=res.reduce((u,r)=>{const b=r.bbox;return{x0:Math.min(u.x0,b.x),y0:Math.min(u.y0,b.y),x1:Math.max(u.x1,b.x+b.w),y1:Math.max(u.y1,b.y+b.h)}},{x0:1e9,y0:1e9,x1:-1e9,y1:-1e9}),bb={x:ub.x0,y:ub.y0,w:ub.x1-ub.x0,h:ub.y1-ub.y0};
 const uxf=i=>{const f=xfs[i];return f?` transform="translate(${w/2} ${h/2}) scale(${f.s}) translate(${-f.ax} ${-f.ay})"`:''};
 const side=Math.max(bb.w,bb.h)*1.08,vx=bb.x+bb.w/2-side/2,vy=bb.y+bb.h/2-side/2,fill=D.vinyl==='white'?'#FFFFFF':D.vinyl==='silver'?'url(#gSilver)':'url(#gGold)';
 box.innerHTML=BGAPS.map(([g,n],i)=>`<button type="button" class="btile" role="radio" aria-checked="false" data-gap="${g}" aria-label="${n} border, ${fmt(g/100)} inch"><svg viewBox="${vx} ${vy} ${side} ${side}" aria-hidden="true"><defs><mask id="btm${g}" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><image href="${res[i].url}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none"/></mask></defs><g class="bt-edge"><rect x="0" y="0" width="${w}" height="${h}" fill="${fill}" mask="url(#btm${g})"/></g><use href="#elsG"${uxf(i)}/></svg><b>${n}</b><small>${fmt(g/100)} in</small></button>`).join('');
 tilesUI()}
function tilesUI(){$$('#borderTiles .btile').forEach(b=>b.setAttribute('aria-checked',String(+b.dataset.gap===D.gap)))}

/* ---------- views + legend + proof overlay ---------- */
function setView(v){if(v===view)return;view=v;$$('.views [data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===v)));svg.dataset.view=v;if(v!=='edit'&&v!=='dome'){ft.hidden=true;if(editing)inl.blur()}cam=null;zoom=1;track('builder_view',{view:v});if(v==='dome'&&sel.length)setSel([],true);v3dView(v==='dome');req()}
$$('.views [data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
function legendUI(){const L=$('#legend');let s='';if(view==='edit'&&!isBlank())s=D.shape==='custom'?'<i></i>Cut line':'<i></i>Cut line<i class="s"></i>Safe area';else if(view==='proof')s='<i class="lg-edge"></i>Sticker edge'+(trimmed()?'<i class="lg-trim" style="margin-left:8px"></i>Trimmed':'')+(D.vinyl!=='white'?`<i class="lg-clear" style="margin-left:8px"></i>${D.vinyl==='silver'?'Silver':'Gold'} shows`:'');
 if(L.dataset.sig!==s){L.dataset.sig=s;L.innerHTML=s}L.hidden=!s}
const QUARTER=95.5;const QIMG='{{QUARTER}}';
function trimmed(){if(D.shape==='custom')return false;const w=W(),h=H();return D.els.some(e=>{if(e.hidden)return false;const b=bbox(e);if(e.type==='image'){const k=inkOf(e.key),l=e.x-e.w/2+k.x*e.w,t=e.y-e.h/2+k.y*e.h;return l<-1||t<-1||l+k.w*e.w>w+1||t+k.h*e.h>h+1}return b.x0<-1||b.y0<-1||b.x1>w+1||b.y1>h+1})}
function proofUI(){const g=$('#proofG');if(view!=='proof'){if(g.childElementCount){g.innerHTML='';g.dataset.sig=''}return}
 let bx=0,by=0,bw=W(),bh=H();if(D.shape==='custom'&&CT.bbox){({x:bx,y:by,w:bw,h:bh}=CT.bbox)}
 const r=QUARTER/2,cx=bx+bw+Math.max(40,26*K)+r,cy=by+bh-r,fs=11*K;
 const s=`<defs><clipPath id="qClip"><circle cx="${cx}" cy="${cy}" r="${r*.985}"/></clipPath></defs><g style="filter:drop-shadow(0 ${1.5*K}px ${2.5*K}px rgba(0,0,0,.35))"><image href="${QIMG}" x="${cx-r}" y="${cy-r}" width="${2*r}" height="${2*r}" clip-path="url(#qClip)" preserveAspectRatio="xMidYMid slice"/></g><text class="pf-t" font-size="${fs}" x="${cx}" y="${cy+r+16*K}" text-anchor="middle">US quarter</text><text class="pf-s" font-size="${fs*.92}" x="${cx}" y="${cy+r+30*K}" text-anchor="middle">for scale</text>`;
 if(g.dataset.sig!==s){g.dataset.sig=s;g.innerHTML=s}
 const msg=$('#vpMsg'),metal=D.vinyl!=='white';let m;
 if(isBlank())m='Add a design to see what prints.';else if(D.shape==='custom')m=`${fmt(D.gap/100)} in ${metal?'border':'white border'} all around. The outer edge is the cut.`;else if(trimmed())m='Faded parts are outside the cut and get trimmed off.';else if(hasBorder(borderTarget()))m='White areas around your art print as white vinyl.';else m='This is exactly what prints, before the clear dome is added.';
 if(metal&&!isBlank())m+=` White areas print clear, so the ${D.vinyl} shows.`;msg.textContent=m;msg.hidden=false}

/* ---------- print API adapter (shaped like the Print MCP tools) ----------
   Replace with real calls to get_quote / create_proof / create_checkout. Nothing here collects payment data. */
const PrintAPI=window.CustomGeniePrint=window.CustomGeniePrint||(()=>{const drafts={};const shipDate=d=>{const t=new Date();let n=0;while(n<d){t.setDate(t.getDate()+1);if(t.getDay()%6)n++}return t};
 return{
  listProducts:async()=>[{product_id:'domed_vinyl_sticker',name:'Domed Vinyl Sticker Sheet',sizes:{min_in:MIN,max_in:MAX},shapes:Object.keys(SN),options:{finish:Object.keys(VN)},min_quantity:QTY[0],typical_turnaround_days:TURNAROUND_DAYS}],
  getQuote:async({size_in,shape,quantity,options})=>{const bp=basePrice(size_in.w,size_in.h).b,i=Math.max(0,QTY.indexOf(quantity)),unit=r2(bp*(1-DISC[i])),sub=r2(unit*quantity);
   return{quote_id:'q_'+nid(),expires_at:new Date(Date.now()+864e5).toISOString(),product_id:'domed_vinyl_sticker',shape,size_in,quantity,options,unit_price:unit,subtotal:sub,setup_fee:0,shipping_estimate:sub>=FREE?0:null,total:sub,currency:'USD',price_breaks:QTY.map((q,j)=>({quantity:q,unit_price:r2(bp*(1-DISC[j]))})),turnaround_days:TURNAROUND_DAYS,estimated_ship_date:shipDate(TURNAROUND_DAYS).toISOString().slice(0,10),warnings:checks().filter(c=>c.level==='warning').map(c=>({code:c.code,message:c.message,suggestion:c.suggestion}))}},
  createProof:async({quote_id,notes})=>({proof_id:'prf_'+nid(),quote_id,final_dimensions:pricedSize(),thread_or_ink_colors:docColors(),production_notes:notes?[notes]:[],status:'auto'}),
  createCheckout:async({quote_id,proof_id,idempotency_key})=>{if(drafts[idempotency_key])return drafts[idempotency_key];const id='do_'+nid();return drafts[idempotency_key]={checkout_url:'#checkout/'+id,draft_order_id:id,expires_at:new Date(Date.now()+36e5).toISOString(),summary:{quote_id,proof_id}}}}})();

/* ---------- review: proof + quote + approve ---------- */
let rvMode='flat',QUOTE=null;
async function openReview(){const d=$('#reviewDlg');resetOrder();rvMode='flat';renderReview();if(!d.open)d.showModal();track('review_open');
 const ps=pricedSize();QUOTE=await PrintAPI.getQuote({size_in:{w:ps.w,h:ps.h},shape:D.shape,quantity:QTY[tier],options:{finish:D.vinyl}});renderReview()}
function renderReview(){const t=curTier(),ps=pricedSize(),rem=FREE-t.t,q=QUOTE;
 $$('.rv-tabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rv===rvMode)));
 $('#rvArt').innerHTML=thumbSVG(D,'Proof of your sticker',{proof:rvMode==='flat'});
 $('#rvCap').textContent=`Actual size ${fmt(ps.w)} × ${fmt(ps.h)} in${D.vinyl!=='white'?` · white areas print clear on ${D.vinyl}`:''}${D.shape==='custom'?` · ${fmt(D.gap/100)} in border, cut around the design`:''}`;
 const ship=q&&q.estimated_ship_date?new Date(q.estimated_ship_date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}):'';
 $('#rvSpec').innerHTML=[['Product',PNAME[D.vinyl]],['Product code',skuFor()],['Shape',SN[D.shape]+(D.shape==='rect'||D.shape==='square'?(D.rounded?', standard corners':', minimal corners'):'')],['Size',`${fmt(ps.w)} × ${fmt(ps.h)} in`],['Finish',VN[D.vinyl]],['Quantity',`${t.q.toLocaleString()} <button type="button" class="linkbtn" id="rvQty">Change</button>`],['Unit price',money(t.p)],['Subtotal',money(t.t)],['Setup fee','<span class="free">FREE</span>'],['Design help','<span class="free">FREE</span>'],['Shipping',rem>0?`Calculated at checkout · ${money(rem)} more ships free`:'<span class="free">FREE</span>'],ship?['Estimated ship date',ship]:null,['Total',money(t.t),'tot']].filter(Boolean).map(([a,b,c])=>`<div${c?` class="${c}"`:''}><dt>${a}</dt><dd>${b}</dd></div>`).join('');
 const pb=priceBreak(),rb=$('#rvBreak');rb.hidden=!pb;rb.textContent=pb;
 $('#rvChecks').innerHTML=checksHTML(checks());$('#rvQuoteTxt').textContent=q?`Quote ${q.quote_id.slice(0,10)} · valid 24 h`:'Pricing…';
 $('#addCart').textContent=`Add to cart · ${money(t.t)}`}
$('#reviewDlg').addEventListener('click',ev=>{if(ev.target===ev.currentTarget){ev.currentTarget.close();return}const b=ev.target.closest('[data-rv]');if(b){rvMode=b.dataset.rv;renderReview();return}
 if(ev.target.id==='rvQty'){const all=tiers();openPop(ev.target,all.map((x,i)=>`<button type="button" class="qrow" data-tier="${i}" aria-checked="${i===tier}"><span class="rd"></span><span><b>${x.q.toLocaleString()}</b><small>${money(x.p)} each</small></span><span class="sv">Save ${x.s}%</span><span class="tt">${money(x.t)}</span></button>`).join(''),{btn:ev.target,cls:'qpop'});pop.onclick=e2=>{const r=e2.target.closest('[data-tier]');if(!r)return;tier=+r.dataset.tier;commit();closePop();openReview()};return}
 onCheckClick(ev,true)});
$('#rvClose').addEventListener('click',()=>$('#reviewDlg').close());
$('#instr').addEventListener('input',ev=>{$('#instrCount').textContent=`${ev.target.value.length} / 250`});
$('#confirm').addEventListener('change',ev=>{if(ev.target.checked){$('#confirmBox').dataset.invalid='false';$('#confirmErr').hidden=true}});
function confirmOk(){const ok=$('#confirm').checked;$('#confirmBox').dataset.invalid=String(!ok);$('#confirmErr').hidden=ok;if(!ok)$('#confirm').focus();return ok}
function resetOrder(){$('#confirm').checked=false;$('#confirmBox').dataset.invalid='false';$('#confirmErr').hidden=true;$('#instr').value='';$('#instrCount').textContent='0 / 250';$('#instrWrap').open=false}
async function cartPush(artwork){const t=curTier(),ps=pricedSize(),instr=$('#instr').value.trim();
 let co=null;try{const q=QUOTE||await PrintAPI.getQuote({size_in:{w:ps.w,h:ps.h},shape:D.shape,quantity:t.q,options:{finish:D.vinyl}}),pr=await PrintAPI.createProof({quote_id:q.quote_id,notes:instr});co=await PrintAPI.createCheckout({quote_id:q.quote_id,proof_id:pr.proof_id,idempotency_key:q.quote_id+':'+pr.proof_id})}catch(e){}
 cart++;$('#cartCount').textContent=cart;$('#cartBtn').setAttribute('aria-label',`Cart, ${cart} item${cart===1?'':'s'}`);$('#cartBtn').classList.remove('bump');void $('#cartBtn').offsetWidth;$('#cartBtn').classList.add('bump');window.dataLayer.push({ecommerce:null});
 track('add_to_cart',{ecommerce:{currency:'USD',value:t.t,items:[{item_id:skuFor(),item_name:PNAME[D.vinyl],item_variant:`${VN[D.vinyl]} / ${SN[D.shape]} / ${fmt(ps.w)}x${fmt(ps.h)} in`,price:t.p,quantity:t.q}]},artwork,special_instructions:instr,draft_order_id:co&&co.draft_order_id});return t}
$('#addCart').addEventListener('click',async()=>{if(!confirmOk())return;const t=await cartPush('designed');$('#reviewDlg').close();toast(`Added to cart: ${t.q.toLocaleString()} ${VN[D.vinyl]} domed stickers, ${money(t.t)}.`,'View cart',()=>toast("Prototype: the cart page isn't connected."));resetOrder()});
['gpay','apay'].forEach(id=>$('#'+id).addEventListener('click',()=>{if(confirmOk())toast(`Prototype: ${id==='gpay'?'Google Pay':'Apple Pay'} opens on the secure checkout page in production.`)}));
$('#saveBtn').addEventListener('click',()=>{save();toast("Design saved in this browser. It'll be here when you come back.")});
$('#laterBtn').addEventListener('click',async()=>{const t=await cartPush('email_later');toast(`Added ${t.q.toLocaleString()} stickers (${money(t.t)}) to your cart. We'll email you to collect your artwork.`)});

/* ---------- panels: tabs, toggles, mobile sheets ---------- */
function setLTab(t){$$('.ptabs [data-ltab]').forEach(b=>{const on=b.dataset.ltab===t;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1});$$('#lp .pbody').forEach(p=>p.hidden=p.dataset.pane!==t);$('#lpTitle').textContent={layers:'Layers',assets:'Add to your sticker',genie:'Genie'}[t];studio.classList.toggle('lt-genie',t==='genie');$('#genieBtn').setAttribute('aria-pressed',String(t==='genie'&&!studio.classList.contains('no-left')));if(t==='genie'&&typeof genieOpened==='function')genieOpened()}
$$('.ptabs [data-ltab]').forEach((b,i,all)=>{b.addEventListener('click',()=>setLTab(b.dataset.ltab));b.addEventListener('keydown',ev=>{const d={ArrowRight:1,ArrowLeft:-1}[ev.key];if(!d)return;ev.preventDefault();const n=all[(i+d+all.length)%all.length];setLTab(n.dataset.ltab);n.focus()})});
function togglePanels(){const hid=studio.classList.contains('no-left')&&studio.classList.contains('no-right');studio.classList.toggle('no-left',!hid);studio.classList.toggle('no-right',!hid);panelBtns();req()}
function panelBtns(){$('#toggleL').setAttribute('aria-pressed',String(MID.matches?studio.classList.contains('show-left'):!studio.classList.contains('no-left')));$('#toggleR').setAttribute('aria-pressed',String(!studio.classList.contains('no-right')));setTimeout(req,220)}
$('#toggleL').addEventListener('click',()=>{if(MID.matches&&!NARROW.matches)studio.classList.toggle('show-left');else studio.classList.toggle('no-left');panelBtns()});
$('#toggleR').addEventListener('click',()=>{studio.classList.toggle('no-right');panelBtns()});
function openSheet(which){if(!NARROW.matches&&!MID.matches){if(which==='props')studio.classList.remove('no-right');else{studio.classList.remove('no-left');setLTab(which)}panelBtns();return}
 if(MID.matches&&!NARROW.matches){if(which!=='props'){studio.classList.add('show-left');setLTab(which)}panelBtns();return}
 studio.classList.remove('show-left','show-right');if(which==='props')studio.classList.add('show-right');else{studio.classList.add('show-left');setLTab(which)}$('#scrim').hidden=false;$$('.mtabs [data-mtab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mtab===which)))}
function closeSheets(){studio.classList.remove('show-left','show-right');$('#scrim').hidden=true;$$('.mtabs [data-mtab]').forEach(b=>b.setAttribute('aria-pressed','false'));panelBtns()}
$$('.mtabs [data-mtab]').forEach(b=>b.addEventListener('click',()=>{if(b.getAttribute('aria-pressed')==='true'){closeSheets();return}openSheet(b.dataset.mtab)}));
$$('[data-close-sheet]').forEach(b=>b.addEventListener('click',closeSheets));$('#scrim').addEventListener('click',closeSheets);
NARROW.addEventListener('change',()=>{closeSheets();req()});MID.addEventListener('change',()=>{studio.classList.remove('show-left');panelBtns()});
$('#genieBtn').addEventListener('click',()=>openGenie(true));
$('#imgBtn').addEventListener('click',()=>$('#upFile').click());
$('#upFile').addEventListener('change',ev=>{const fs=[...ev.target.files];ev.target.value='';fs.slice(0,5).forEach(f=>loadFile(f,k=>{addImage(k);if(NARROW.matches)closeSheets()}))});
$('#replFile').addEventListener('change',ev=>{const f=ev.target.files[0];ev.target.value='';loadFile(f,k=>{const e=get(replTarget);if(!e)return;const m=IM[k];e.key=k;e.clear=false;e.h=e.w*m.natH/m.natW;CT.sig='';commit();syncPanels()})});

/* assets */
$('#tplGrid').innerHTML=TPL.map((t,i)=>`<button type="button" class="tpl" data-tpl="${i}">${thumbSVG(t.make(),t.n)}${esc(t.n)}</button>`).join('');
$('#tStyles').innerHTML=Object.entries(TSTYLES).map(([k,c])=>{const f=FONTS[c.font];return `<button type="button" class="tstyle" data-addtext="${k}" style="font-family:${f.f.replace(/"/g,"'")};font-weight:${c.b?700:f.w};font-size:${clamp(c.pt*.62,13,22)}px;${c.spacing?'letter-spacing:.08em;':''}">${esc(c.t)}<small>${c.lab}</small></button>`}).join('');
$('#gfxGrid').innerHTML=[['prim-rect','Rectangle','<rect x="12" y="22" width="76" height="56" rx="4"/>'],['prim-ellipse','Ellipse','<circle cx="50" cy="50" r="38"/>'],['prim-line','Line','<path d="M14 86L86 14"/>']].map(([k,n,d])=>`<button type="button" class="prim" data-gfx="${k}" aria-label="Add ${n}" data-tip="${n}"><svg viewBox="0 0 100 100" aria-hidden="true">${d}</svg></button>`).join('')+Object.entries(GFX).map(([k,g])=>`<button type="button" data-gfx="${k}" aria-label="Add ${g.n}" data-tip="${g.n}"><svg viewBox="0 0 100 100" aria-hidden="true"><path fill-rule="evenodd" d="${g.d}"/></svg></button>`).join('');
$('#lp-assets').addEventListener('click',ev=>{const t=ev.target.closest('[data-tpl]'),x=ev.target.closest('[data-addtext]'),g=ev.target.closest('[data-gfx]'),i=ev.target.closest('[data-addimg]');
 if(t){if(!isBlank()&&!confirmReplace())return;applyTpl(TPL[+t.dataset.tpl])}else if(x)addText(x.dataset.addtext);else if(g)addShape(g.dataset.gfx);else if(i)addImage(i.dataset.addimg);else return;if(NARROW.matches)closeSheets()});
function confirmReplace(){return true}

/* drag & drop images onto the studio */
let dragN=0;const hasFiles=ev=>ev.dataTransfer&&[...ev.dataTransfer.types].includes('Files');
studio.addEventListener('dragenter',ev=>{if(!hasFiles(ev))return;ev.preventDefault();dragN++;$('#dropzone').hidden=false});
studio.addEventListener('dragover',ev=>{if(hasFiles(ev)){ev.preventDefault();ev.dataTransfer.dropEffect='copy'}});
studio.addEventListener('dragleave',ev=>{if(!hasFiles(ev))return;dragN=Math.max(0,dragN-1);if(!dragN)$('#dropzone').hidden=true});
studio.addEventListener('drop',ev=>{if(!hasFiles(ev))return;ev.preventDefault();dragN=0;$('#dropzone').hidden=true;const files=[...ev.dataTransfer.files].filter(f=>/^image\//.test(f.type));if(!files.length)return;
 if(isBlank()&&!startDismissed&&ev.target.closest('#gfeed,.gcomp,#start')){genieUpload(files[0]);return}
 if(!editable())setView('edit');const at=vp.contains(ev.target)?toW(ev):null;files.slice(0,5).forEach((f,i)=>loadFile(f,k=>addImage(k,i?null:at)))});

/* start card */
$('#startText').addEventListener('input',ev=>{ev.target.style.height='auto';ev.target.style.height=Math.min(220,ev.target.scrollHeight)+'px'});
$('#startText').addEventListener('keydown',ev=>{if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();$('#startGo').click()}});
let startLogo=null;
$('#startAttach').addEventListener('click',()=>$('#startFile').click());
$('#startFile').addEventListener('change',ev=>{const f=ev.target.files[0];ev.target.value='';loadFile(f,k=>{startLogo=k;const b=$('#startAttach');b.classList.add('has');$('span',b).textContent=IM[k].name})});
$('#startGo').addEventListener('click',()=>{const p=$('#startText').value.trim();if(!p&&!startLogo){$('#startText').focus();toast('Describe your sticker, or add your logo.');return}const k=startLogo;startLogo=null;const b=$('#startAttach');b.classList.remove('has');$('span',b).textContent='Add your logo';$('#startText').value='';genieSubmit(p,k)});
$$('#start [data-ex]').forEach(b=>b.addEventListener('click',()=>{const t=$('#startText');t.value=b.dataset.ex;t.dispatchEvent(new Event('input'));t.focus()}));
$('#start').addEventListener('click',ev=>{const b=ev.target.closest('[data-start]');if(!b)return;const k=b.dataset.start;
 if(k==='upload'){$('#gfile').dataset.mode='analyze';$('#gfile').click()}
 if(k==='templates'){openSheet('assets');setLTab('assets');toast('Pick a template on the left. Everything in it stays editable.')}
 if(k==='blank'){startDismissed=true;req();svg.focus();toast('Blank canvas. Press T for text, R for a rectangle, or open Assets.')}});

/* ---------- shortcuts sheet ---------- */
const KEYS=[['Tools',[['Move','V'],['Hand / pan','H · Space'],['Text','T'],['Rectangle','R'],['Ellipse','O'],['Line','L'],['Pencil','P'],['Place image','Ctrl ⇧ K']]],
 ['Edit',[['Undo','Ctrl Z'],['Redo','Ctrl ⇧ Z'],['Copy · Cut · Paste','Ctrl C · X · V'],['Duplicate','Ctrl D'],['Duplicate while dragging','Alt drag'],['Delete','Del'],['Select all','Ctrl A'],['Copy / paste style','Ctrl Alt C · V'],['Edit text / enter group','Enter'],['Deselect / exit group','Esc']]],
 ['Arrange',[['Group / ungroup','Ctrl G · Ctrl ⇧ G'],['Forward / backward','Ctrl ] · ['],['To front / to back','Ctrl ⇧ ] · ['],['Align left · right','Alt A · D'],['Align top · bottom','Alt W · S'],['Align centers','Alt H · V'],['Flip','⇧ H · ⇧ V'],['Nudge','Arrows (⇧ ×10)'],['Lock / hide','Ctrl ⇧ L · H']]],
 ['View',[['Zoom in / out','Ctrl + · Ctrl −'],['Zoom to fit','⇧ 1'],['Zoom to selection','⇧ 2'],['Actual size','⇧ 0'],['Rulers','⇧ R'],['Hide panels','Ctrl \\'],['Pan','Scroll · Space drag'],['Zoom','Ctrl scroll · pinch']]],
 ['While dragging',[['Keep proportions / straight','Shift'],['From center','Alt'],['Skip snapping','Ctrl'],['Rotate in 15° steps','Shift']]]];
function openKeys(){$('#kcols').innerHTML=KEYS.map(([h,l])=>`<section><h3>${h}</h3><dl>${l.map(([a,k])=>`<div><dt>${a}</dt><dd>${k.split(' ').map(x=>x==='·'?'<span style="color:var(--ink-4)">·</span>':`<kbd>${esc(x)}</kbd>`).join('')}</dd></div>`).join('')}</dl></section>`).join('');$('#keysDlg').showModal()}
$('#keysBtn').addEventListener('click',openKeys);
$$('[data-close-dlg]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
$('#keysDlg').addEventListener('click',ev=>{if(ev.target===ev.currentTarget)ev.currentTarget.close()});

/* ---------- page chrome ---------- */
let tt;function toast(m,label,fn){const t=$('#toast');$('#toastTxt').textContent=m;const b=$('#toastAct');if(label&&fn){b.hidden=false;b.textContent=label;b.onclick=()=>{t.classList.remove('show');fn()}}else{b.hidden=true;b.onclick=null}t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),label?6500:4200)}
function say(m){const l=$('#live');l.textContent='';setTimeout(()=>{l.textContent=m},30)}
document.addEventListener('click',ev=>{const a=ev.target.closest('[data-proto]');if(a){ev.preventDefault();toast('Prototype: '+a.dataset.proto)}});
$('#cartBtn').addEventListener('click',()=>toast(cart?`Prototype: the cart page isn't connected. ${cart} item${cart===1?'':'s'} added this session.`:'Your cart is empty. Design your sticker and add it here.'));
$('#searchForm').addEventListener('submit',ev=>{ev.preventDefault();toast("Prototype: search isn't connected.")});
const DARKQ=matchMedia('(prefers-color-scheme: dark)');
const isDark=()=>{const t=document.documentElement.dataset.theme;return t?t==='dark':DARKQ.matches};
function themeUI(){const l=isDark()?'Switch to light mode':'Switch to dark mode',b=$('#themeBtn');b.setAttribute('aria-label',l);b.title=l;rulCol=null}
$('#themeBtn').addEventListener('click',()=>{const t=isDark()?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('cg-theme',t)}catch(e){}themeUI();req()});
DARKQ.addEventListener('change',()=>{themeUI();req()});themeUI();
{const more=$('#descMore'),db=$('#descBtn');if(db)db.addEventListener('click',()=>{const open=db.getAttribute('aria-expanded')==='true';db.setAttribute('aria-expanded',String(!open));more.hidden=open;db.textContent=open?'Read more':'Show less'})}
const dtabs=$$('.dtabs [role=tab]');
function openD(t){dtabs.forEach(x=>{const on=x===t;x.setAttribute('aria-selected',String(on));x.tabIndex=on?0:-1;$('#'+x.getAttribute('aria-controls')).hidden=!on})}
dtabs.forEach((t,i)=>{t.addEventListener('click',()=>openD(t));t.addEventListener('keydown',ev=>{const d={ArrowRight:1,ArrowLeft:-1}[ev.key];if(!d)return;ev.preventDefault();const n=dtabs[(i+d+dtabs.length)%dtabs.length];openD(n);n.focus()})});
$$('[data-dtab]').forEach(a=>a.addEventListener('click',()=>openD($('#dt-'+a.dataset.dtab))));
{const f=$('#newsForm');if(f)f.addEventListener('submit',ev=>{ev.preventDefault();const i=$('#newsEmail'),er=$('#newsErr');if(!i.value.trim()||!i.checkValidity()){er.hidden=false;i.setAttribute('aria-invalid','true');i.focus();return}er.hidden=true;i.removeAttribute('aria-invalid');i.value='';toast('Signed up. (Prototype: nothing was sent.)')})}
const nb=$('#notesBtn'),nCount=$$('.note').length;
const setNotes=on=>{document.body.classList.toggle('hide-notes',!on);nb.setAttribute('aria-pressed',String(on));nb.textContent=on?`Hide review notes (${nCount})`:`Show review notes (${nCount})`};
nb.addEventListener('click',()=>setNotes(nb.getAttribute('aria-pressed')!=='true'));setNotes(false);
const tbs=$$('.tbadge');function closeTrust(except){tbs.forEach(b=>{if(b===except)return;b.setAttribute('aria-expanded','false');$('#'+b.getAttribute('aria-controls')).hidden=true})}
tbs.forEach(b=>b.addEventListener('click',ev=>{ev.stopPropagation();const open=b.getAttribute('aria-expanded')==='true';closeTrust(b);b.setAttribute('aria-expanded',String(!open));$('#'+b.getAttribute('aria-controls')).hidden=open;if(!open)track('trust_badge_open',{badge:b.getAttribute('aria-controls')})}));
document.addEventListener('click',ev=>{if(!ev.target.closest('.trust'))closeTrust()});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&tbs.some(b=>b.getAttribute('aria-expanded')==='true')){const o=tbs.find(b=>b.getAttribute('aria-expanded')==='true');closeTrust();o.focus()}});
/* upsell: Silver and Gold switch the finish on the visitor's own design (same price list assumed) */
function upsellUI(t){$$('[data-tryfinish]').forEach(b=>{const on=D.vinyl===b.dataset.tryfinish;b.setAttribute('aria-pressed',String(on));const s=$('span',b);if(s)s.textContent=on?'On your design now':'Try it on my design'});
 $$('[data-upprice]').forEach(s=>{s.textContent=D.vinyl===s.dataset.upprice?'':`Same price: ${money(t.t)} for your ${t.q.toLocaleString()}`})}
$$('[data-tryfinish]').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.tryfinish;if(D.vinyl===v)return;setVinyl(v);track('upsell_try',{vinyl:v});if(!isBlank())setView('dome');$('#builder').scrollIntoView({behavior:reduce.matches?'auto':'smooth',block:'start'});toast(`Switched to ${v==='silver'?'Silver':'Gold'}. Same price.`,'Undo',undo)}));
{const row=$('.up-cards'),dots=$('#upDots');if(row&&dots){const cards=$$('.pcard',row);dots.innerHTML=cards.map((c,i)=>`<button type="button" aria-label="Show card ${i+1} of ${cards.length}"></button>`).join('');const bs=$$('button',dots);
 const cur=()=>{const x=row.scrollLeft;let best=0,bd=1e9;cards.forEach((c,i)=>{const d=Math.abs(c.offsetLeft-16-x);if(d<bd){bd=d;best=i}});bs.forEach((b,i)=>b.setAttribute('aria-current',String(i===best)))};
 row.addEventListener('scroll',()=>requestAnimationFrame(cur),{passive:true});bs.forEach((b,i)=>b.addEventListener('click',()=>row.scrollTo({left:cards[i].offsetLeft-16,behavior:reduce.matches?'auto':'smooth'})));cur()}}
/* mega menu */
{const megaBtn=$('#megaBtn'),mega=$('#mega'),megaHov=matchMedia('(hover:hover) and (min-width:1180px)');let megaT=0,megaAt=0;
 const megaOpen=(on,back)=>{if(on===!mega.hidden)return;megaBtn.setAttribute('aria-expanded',String(on));mega.hidden=!on;if(on){megaAt=Date.now();$$('#mega .pop img').forEach((im,i)=>{const g=$$('.gallery img')[i];if(g&&!im.src)im.src=g.src})}else if(back)megaBtn.focus()};
 megaBtn.addEventListener('click',()=>{if(!mega.hidden&&Date.now()-megaAt<450)return;megaOpen(mega.hidden)});
 megaBtn.parentElement.addEventListener('mouseenter',()=>{if(!megaHov.matches)return;clearTimeout(megaT);megaT=setTimeout(()=>megaOpen(true),140)});
 megaBtn.parentElement.addEventListener('mouseleave',()=>{if(!megaHov.matches)return;clearTimeout(megaT);megaT=setTimeout(()=>megaOpen(false),220)});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!mega.hidden)megaOpen(false,true)});
 document.addEventListener('click',ev=>{if(!mega.hidden&&!ev.target.closest('.has-mega'))megaOpen(false)});
 megaBtn.parentElement.addEventListener('focusout',ev=>{if(!megaBtn.parentElement.contains(ev.relatedTarget))megaOpen(false)});
 mega.addEventListener('click',ev=>{const sh=ev.target.closest('[data-mshape]'),fn=ev.target.closest('[data-mfin]'),go=ev.target.closest('[data-mgo]'),cur=ev.target.closest('a[aria-current]');if(!sh&&!fn&&!go&&!cur)return;ev.preventDefault();megaOpen(false);
  $('#builder').scrollIntoView({behavior:reduce.matches?'auto':'smooth',block:'start'});
  if(go&&go.dataset.mgo==='ai'){openGenie(true);return}if(sh){setSel([]);setShape(sh.dataset.mshape);toast(`Shape set to ${SN[sh.dataset.mshape]}.`)}if(fn){setSel([]);setVinyl(fn.dataset.mfin);toast(`Finish set to ${VN[fn.dataset.mfin]}.`)}})}

/* how much of the viewport bottom the quote bar covers; notes pill and toasts sit above it */
{let raf=0;const cb=$('.cbar'),upd=()=>{raf=0;const r=cb.getBoundingClientRect(),ob=r.top<innerHeight&&r.bottom>0?Math.max(0,innerHeight-r.top):0;document.documentElement.style.setProperty('--ob',Math.round(ob)+'px')};
 const q=()=>{if(!raf)raf=requestAnimationFrame(upd)};addEventListener('scroll',q,{passive:true});addEventListener('resize',q);setTimeout(upd,300)}

/* ---------- resizable left panel: drag its right edge, double-click to reset (Genie and Layers widths are kept separately) ---------- */
{const lp=$('#lp'),h=document.createElement('div');h.className='lp-rs';h.setAttribute('role','separator');h.setAttribute('aria-orientation','vertical');h.setAttribute('aria-label','Resize panel. Use the left and right arrow keys.');h.tabIndex=0;h.dataset.tip='Drag to resize · double-click to reset';lp.appendChild(h);
 const LWK='cg-lw';let WS={};try{WS=JSON.parse(localStorage.getItem(LWK)||'{}')||{}}catch(e){}
 const apply=()=>{[['g','lwg-user','--lwgu'],['l','lw-user','--lwu']].forEach(([k,cls,v])=>{if(WS[k]){studio.style.setProperty(v,WS[k]+'px');studio.classList.add(cls)}else{studio.style.removeProperty(v);studio.classList.remove(cls)}})};
 const save=()=>{try{localStorage.setItem(LWK,JSON.stringify(WS))}catch(e){}};
 const which=()=>studio.classList.contains('lt-genie')?'g':'l';
 const lim=()=>{const sw=studio.getBoundingClientRect().width,rw=studio.classList.contains('no-right')?0:$('#rp').getBoundingClientRect().width;return [240,Math.max(300,Math.min(680,sw-rw-320))]};
 apply();let drag=null;
 h.addEventListener('pointerdown',ev=>{if(MID.matches||NARROW.matches||ev.button!==0)return;ev.preventDefault();try{h.setPointerCapture(ev.pointerId)}catch(e){}drag={x:ev.clientX,w:lp.getBoundingClientRect().width,k:which()};studio.classList.add('resizing');hideTip()});
 h.addEventListener('pointermove',ev=>{if(!drag)return;const [a,b]=lim();WS[drag.k]=Math.round(clamp(drag.w+ev.clientX-drag.x,a,b));apply();req()});
 const end=()=>{if(!drag)return;drag=null;studio.classList.remove('resizing');save();req();track('builder_panel_resize',{panel:which()==='g'?'genie':'layers',width:WS[which()]})};
 h.addEventListener('pointerup',end);h.addEventListener('pointercancel',end);
 h.addEventListener('dblclick',()=>{delete WS[which()];apply();save();req()});
 h.addEventListener('keydown',ev=>{const d={ArrowLeft:-20,ArrowRight:20}[ev.key];if(!d)return;ev.preventDefault();ev.stopPropagation();const [a,b]=lim(),k=which();WS[k]=Math.round(clamp((WS[k]||lp.getBoundingClientRect().width)+d,a,b));apply();save();req()})}
