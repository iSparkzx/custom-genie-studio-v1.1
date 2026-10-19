/* Custom Genie · storefront behavior (homepage, collections, product pages). Runs after site.js.
   Collections: filters, sort and search over the product cards already in the page, kept in the URL (?type=…&sort=…&q=…).
   Product pages: image gallery, read more, section tabs, and a buy bar on small screens once the main buttons scroll away. */
(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const track=(event,p)=>{try{(window.dataLayer=window.dataLayer||[]).push(Object.assign({event},p||{}))}catch(e){}};
const reduce=matchMedia('(prefers-reduced-motion: reduce)');

/* every way into a studio is measured the same way */
document.addEventListener('click',ev=>{const a=ev.target.closest('a[data-studio]');if(a)track('start_designing',{studio:a.dataset.studio,product:new URL(a.href).searchParams.get('product'),from:a.dataset.from||document.body.dataset.page});
 const c=ev.target.closest('a.card');if(c)track('select_item',{item_id:c.dataset.id,item_list:document.body.dataset.page})});

/* ---------- collections ---------- */
const grid=$('#grid');
if(grid){
 const items=$$('li.pc',grid),promo=$('li.promo-tile',grid),form=$('#filters'),countEl=$('#count'),qRes=$('#qRes'),chips=$('#chips'),empty=$('#empty'),sortSel=$('#sort');
 const FACETS=$$('[data-facet]',form).map(f=>f.dataset.facet);
 const url=new URLSearchParams(location.search);
 const q=(url.get('q')||'').trim().toLowerCase(),words=q.split(/\s+/).filter(Boolean);
 const hit=it=>{if(!words.length)return true;const t=it.dataset.search;return words.every(w=>t.includes(w)||(w.endsWith('s')&&t.includes(w.slice(0,-1))))};
 /* only values this page offers are taken from the URL (anything else is ignored, never written into the page) */
 const known={};$$('input[type=checkbox]',form).forEach(i=>(known[i.name]=known[i.name]||new Set).add(i.value));
 const sel={};FACETS.forEach(f=>sel[f]=new Set((url.get(f)||'').split(',').filter(v=>known[f]&&known[f].has(v))));
 $$('input[type=checkbox]',form).forEach(i=>{i.checked=sel[i.name].has(i.value)});
 if(sortSel&&url.get('sort')&&[...sortSel.options].some(o=>o.value===url.get('sort')))sortSel.value=url.get('sort');
 const val=(it,f)=>(it.dataset[f]||'').split(' ');
 const match=(it,skip)=>FACETS.every(f=>f===skip||!sel[f].size||val(it,f).some(v=>sel[f].has(v)));
 const box=(f,v)=>$$(`input[name="${f}"]`,form).find(i=>i.value===v);
 const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const label=(f,v)=>{const i=box(f,v);return i?i.closest('label').querySelector('.l').textContent:v};
 const SORT={featured:(a,b)=>a.dataset.rank-b.dataset.rank,
  'price-asc':(a,b)=>(a.dataset.cost===''?1e9:+a.dataset.cost)-(b.dataset.cost===''?1e9:+b.dataset.cost)||a.dataset.rank-b.dataset.rank,
  'price-desc':(a,b)=>(b.dataset.cost===''?-1:+b.dataset.cost)-(a.dataset.cost===''?-1:+a.dataset.cost)||a.dataset.rank-b.dataset.rank,
  name:(a,b)=>a.dataset.name.localeCompare(b.dataset.name)};
 function render(push){
  const pool=items.filter(hit),shown=pool.filter(it=>match(it));
  items.forEach(it=>{it.hidden=!shown.includes(it)});
  const order=[...items].sort(SORT[sortSel?sortSel.value:'featured']);
  order.forEach(it=>grid.appendChild(it));
  if(promo){const vis=order.filter(it=>!it.hidden);promo.hidden=vis.length<4;if(!promo.hidden)vis[3].after(promo)}
  /* each option's count: what you'd see if you added it, given the other filters */
  $$('input[type=checkbox]',form).forEach(i=>{const n=pool.filter(it=>match(it,i.name)&&val(it,i.name).includes(i.value)).length,l=i.closest('label');l.querySelector('.n').textContent=n;l.classList.toggle('zero',!n&&!i.checked)});
  const n=shown.length;
  countEl.innerHTML=`<b>${n}</b> product${n===1?'':'s'}`;
  $$('[data-shown]').forEach(e=>e.textContent=`Show ${n} product${n===1?'':'s'}`);
  if(empty){empty.hidden=!!n;if(!n){const bySearch=!pool.length;$('b',empty).textContent=bySearch?'No products match your search':'No products match these filters';
   $('p',empty).textContent=bySearch?'Check the spelling, or try a broader word like “sticker”, “badge” or “pen”.':'Try removing a filter to see more products.';
   $('[data-clear-all]',empty).hidden=bySearch;$('[data-all]',empty).hidden=!bySearch}}
  if(qRes&&words.length){qRes.innerHTML=(pool.length?pool.length+' product'+(pool.length===1?'':'s')+' match':'No products match')+' <b></b>. <a href="index.html">Show all products</a>';qRes.querySelector('b').textContent='“'+q+'”';qRes.hidden=false}
  const act=FACETS.flatMap(f=>[...sel[f]].map(v=>[f,v]));
  chips.hidden=!act.length;
  chips.innerHTML=act.map(([f,v])=>`<button type="button" class="chip" data-f="${esc(f)}" data-v="${esc(v)}" aria-label="Remove filter: ${esc(label(f,v))}">${esc(label(f,v))}<svg class="ico" aria-hidden="true"><use href="#i-x"/></svg></button>`).join('')+(act.length>1?'<button type="button" class="chip-clear" data-clear>Clear all</button>':'');
  $$('button.subcat').forEach(b=>b.setAttribute('aria-pressed',String(sel.type&&sel.type.size===1&&sel.type.has(b.dataset.type))));
  const p=new URLSearchParams();if(q)p.set('q',q);FACETS.forEach(f=>{if(sel[f].size)p.set(f,[...sel[f]].join(','))});if(sortSel&&sortSel.value!=='featured')p.set('sort',sortSel.value);
  history.replaceState(null,'',location.pathname+(p.toString()?'?'+p.toString().replace(/%2C/g,','):'')+location.hash);
  if(push)track('filter_products',{list:document.body.dataset.page,filters:p.toString(),results:n});
  return n}
 form.addEventListener('change',ev=>{const i=ev.target;if(i.type!=='checkbox')return;sel[i.name][i.checked?'add':'delete'](i.value);render(true)});
 if(sortSel)sortSel.addEventListener('change',()=>{render(true)});
 const clear=()=>{FACETS.forEach(f=>sel[f].clear());$$('input[type=checkbox]',form).forEach(i=>i.checked=false);render(true)};
 chips.addEventListener('click',ev=>{const c=ev.target.closest('.chip');if(c){sel[c.dataset.f].delete(c.dataset.v);const i=box(c.dataset.f,c.dataset.v);if(i)i.checked=false;render(true);(chips.querySelector('.chip')||countEl).focus?.();return}if(ev.target.closest('[data-clear]'))clear()});
 $$('[data-clear-all]').forEach(b=>b.addEventListener('click',clear));
 $$('button.subcat[data-type]').forEach(b=>b.addEventListener('click',()=>{const t=b.dataset.type,on=sel.type.size===1&&sel.type.has(t);sel.type.clear();if(!on)sel.type.add(t);$$('input[name="type"]',form).forEach(i=>i.checked=sel.type.has(i.value));render(true)}));
 /* filters drawer on small screens */
 const scrim=$('#fScrim'),opener=$('#fOpen'),wide=matchMedia('(min-width:1024px)');
 const drawer=on=>{form.classList.toggle('open',on);scrim.classList.toggle('open',on);opener.setAttribute('aria-expanded',String(on));document.documentElement.style.overflow=on?'hidden':'';
  if(on){form.setAttribute('role','dialog');form.setAttribute('aria-modal','true');setTimeout(()=>$('.f-x',form).focus(),30)}else{form.removeAttribute('role');form.removeAttribute('aria-modal')}};
 opener.addEventListener('click',()=>drawer(true));
 $$('[data-close]',form).forEach(b=>b.addEventListener('click',()=>{drawer(false);opener.focus()}));
 scrim.addEventListener('click',()=>{drawer(false);opener.focus()});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&form.classList.contains('open')){drawer(false);opener.focus()}
  if(ev.key==='Tab'&&form.classList.contains('open')){const f=$$('button,input,select,a[href]',form).filter(x=>x.offsetParent);if(!f.length)return;const a=f[0],z=f[f.length-1];if(ev.shiftKey&&document.activeElement===a){ev.preventDefault();z.focus()}else if(!ev.shiftKey&&document.activeElement===z){ev.preventDefault();a.focus()}}});
 wide.addEventListener('change',()=>{if(wide.matches&&form.classList.contains('open'))drawer(false)});
 const n=render(false);
 if(words.length)track('view_search_results',{search_term:q,results:n});
 track('view_item_list',{list:document.body.dataset.page,results:n});
}

/* ---------- product page ---------- */
const main=$('#mainImg');
if(main){
 const thumbs=$$('.g-t'),cnt=$('#gCount');let at=0;
 const show=k=>{if(!thumbs.length)return;at=(k+thumbs.length)%thumbs.length;const t=thumbs[at];main.srcset=t.dataset.srcset||'';main.src=t.dataset.img;main.alt=t.dataset.alt;
  thumbs.forEach((x,i)=>x.setAttribute('aria-pressed',String(i===at)));if(cnt)cnt.textContent=`${at+1} / ${thumbs.length}`;t.scrollIntoView({block:'nearest',inline:'nearest',behavior:reduce.matches?'auto':'smooth'})};
 thumbs.forEach((t,i)=>t.addEventListener('click',()=>show(i)));
 const pv=$('.g-prev'),nx=$('.g-next');if(pv)pv.addEventListener('click',()=>show(at-1));if(nx)nx.addEventListener('click',()=>show(at+1));
 $('.gallery').addEventListener('keydown',ev=>{if(ev.key==='ArrowRight'||ev.key==='ArrowDown'&&ev.target.classList.contains('g-t')){ev.preventDefault();show(at+1);thumbs[at].focus()}else if(ev.key==='ArrowLeft'||ev.key==='ArrowUp'&&ev.target.classList.contains('g-t')){ev.preventDefault();show(at-1);thumbs[at].focus()}});
 /* swipe on the main picture */
 let x0=null;const gm=$('.g-main');gm.addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true});gm.addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>40)show(at+(dx<0?1:-1));x0=null});
 thumbs.slice(1,4).forEach(t=>{const i=new Image();i.src=t.dataset.img});
}
const prose=$('#prose'),more=$('#more');
if(prose&&more){if(prose.scrollHeight>720){prose.classList.add('clamp');more.hidden=false;more.addEventListener('click',()=>{const open=prose.classList.toggle('clamp');more.setAttribute('aria-expanded',String(!open));more.querySelector('.t').textContent=open?'Read the full description':'Show less';if(open)prose.scrollIntoView({block:'start',behavior:reduce.matches?'auto':'smooth'})})}}
const tabs=$$('.ptabs a');
if(tabs.length&&'IntersectionObserver' in window){const secs=tabs.map(a=>$(a.getAttribute('href'))).filter(Boolean),on=new Set();
 const io=new IntersectionObserver(es=>{es.forEach(e=>e.isIntersecting?on.add(e.target.id):on.delete(e.target.id));const cur=secs.find(s=>on.has(s.id));tabs.forEach(a=>a.setAttribute('aria-current',String(!!cur&&a.getAttribute('href')==='#'+cur.id)))},{rootMargin:'-120px 0px -55% 0px'});
 secs.forEach(s=>io.observe(s))}
const sbar=$('#sbar'),ctas=$('#ctas');
if(sbar&&ctas&&'IntersectionObserver' in window){document.body.classList.add('has-sbar');
 new IntersectionObserver(([e])=>{const past=!e.isIntersecting&&e.boundingClientRect.top<0;sbar.classList.toggle('show',past);sbar.setAttribute('aria-hidden',String(!past));$$('a,button',sbar).forEach(x=>x.tabIndex=past?0:-1)}).observe(ctas)}
})();
