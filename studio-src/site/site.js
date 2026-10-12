/* Custom Genie · site chrome, shared by every page (Genie Studio Advanced, Genie Studio Basic, product pages):
   theme, mega menu, search, prototype links, and one cart for the whole site (kept in this browser).
   Pages can hook in: window.CG_TOAST(message) shows their own toast, window.CG_MEGA(action) handles a mega menu
   action on the studio page (return true when handled). Other scripts add to the cart with window.CGSite.add(line). */
(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const ROOT=document.documentElement.dataset.root||'';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'$'+(+v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const track=(event,p)=>{try{(window.dataLayer=window.dataLayer||[]).push(Object.assign({event},p||{}))}catch(e){}};

/* ---------- toast (the page's own, or a simple one) ---------- */
let tT=0;
function toast(m){if(typeof window.CG_TOAST==='function'){window.CG_TOAST(m);return}
 let t=$('#siteToast');if(!t){t=document.createElement('div');t.id='siteToast';t.className='site-toast';t.setAttribute('role','status');t.setAttribute('aria-live','polite');document.body.appendChild(t)}
 t.textContent=m;t.classList.add('show');clearTimeout(tT);tT=setTimeout(()=>t.classList.remove('show'),4200)}

/* ---------- light / dark ---------- */
const DARKQ=matchMedia('(prefers-color-scheme: dark)'),isDark=()=>{const t=document.documentElement.dataset.theme;return t?t==='dark':DARKQ.matches};
function themeUI(){const b=$('#themeBtn');if(!b)return;const l=isDark()?'Switch to light mode':'Switch to dark mode';b.setAttribute('aria-label',l);b.title=l}
const tb=$('#themeBtn');if(tb)tb.addEventListener('click',()=>{const t=isDark()?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('cg-theme',t)}catch(e){}themeUI();dispatchEvent(new CustomEvent('cg:theme',{detail:t}))});
DARKQ.addEventListener('change',()=>{themeUI();dispatchEvent(new CustomEvent('cg:theme'))});themeUI();

/* ---------- links that aren't part of the prototype ---------- */
document.addEventListener('click',ev=>{const a=ev.target.closest('[data-proto]');if(a){ev.preventDefault();toast('Prototype: '+a.dataset.proto)}});

/* ---------- search: All products, filtered ---------- */
const sf=$('#searchForm');if(sf)sf.addEventListener('submit',ev=>{ev.preventDefault();const q=($('#q').value||'').trim();track('search',{search_term:q});location.href=ROOT+'p/index.html'+(q?'?q='+encodeURIComponent(q):'')});
{const q=new URLSearchParams(location.search).get('q'),i=$('#q');if(q&&i)i.value=q}

/* ---------- mega menu ---------- */
{const megaBtn=$('#megaBtn'),mega=$('#mega');if(megaBtn&&mega){const megaHov=matchMedia('(hover:hover) and (min-width:1180px)');let megaT=0,megaAt=0;
 const megaOpen=(on,back)=>{if(on===!mega.hidden)return;megaBtn.setAttribute('aria-expanded',String(on));mega.hidden=!on;if(on){megaAt=Date.now();$$('#mega .pop img').forEach(im=>{if(!im.getAttribute('src')&&im.dataset.src)im.src=im.dataset.src})}else if(back)megaBtn.focus()};
 megaBtn.addEventListener('click',()=>{if(!mega.hidden&&Date.now()-megaAt<450)return;megaOpen(mega.hidden)});
 megaBtn.parentElement.addEventListener('mouseenter',()=>{if(!megaHov.matches)return;clearTimeout(megaT);megaT=setTimeout(()=>megaOpen(true),140)});
 megaBtn.parentElement.addEventListener('mouseleave',()=>{if(!megaHov.matches)return;clearTimeout(megaT);megaT=setTimeout(()=>megaOpen(false),220)});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!mega.hidden)megaOpen(false,true)});
 document.addEventListener('click',ev=>{if(!mega.hidden&&!ev.target.closest('.has-mega'))megaOpen(false)});
 megaBtn.parentElement.addEventListener('focusout',ev=>{if(!megaBtn.parentElement.contains(ev.relatedTarget))megaOpen(false)});
 /* shape, finish and "design" buttons: the studio page handles them itself; every other page opens the studio */
 const FIN={white:'domed_white_vinyl_sticker_sheet',silver:'domed_silver_vinyl_sticker_sheet',gold:'domed_gold_vinyl_sticker_sheet'};
 mega.addEventListener('click',ev=>{const sh=ev.target.closest('[data-mshape]'),fn=ev.target.closest('[data-mfin]'),go=ev.target.closest('[data-mgo]');if(!sh&&!fn&&!go)return;ev.preventDefault();megaOpen(false);
  const a={shape:sh&&sh.dataset.mshape,fin:fn&&fn.dataset.mfin,go:go&&go.dataset.mgo};
  if(typeof window.CG_MEGA==='function'&&window.CG_MEGA(a))return;
  const p=new URLSearchParams({product:FIN[a.fin]||FIN.white});if(a.shape)p.set('shape',a.shape);if(a.go==='ai')p.set('genie','1');location.href=ROOT+'index.html?'+p})}}

/* ---------- cart: one cart for the whole site, kept in this browser ---------- */
const CK='cg-cart-v1';
const items=()=>{try{const l=JSON.parse(localStorage.getItem(CK)||'[]');return Array.isArray(l)?l:[]}catch(e){return[]}};
const save=l=>{try{localStorage.setItem(CK,JSON.stringify(l))}catch(e){}};
const units=l=>l.reduce((n,x)=>n+(+x.qty||0),0);
function cartUI(bump){const l=items(),n=l.length,b=$('#cartBtn'),c=$('#cartCount');if(c)c.textContent=n;
 if(b){b.setAttribute('aria-label',`Cart, ${n} item${n===1?'':'s'}`);if(bump){b.classList.remove('bump');void b.offsetWidth;b.classList.add('bump')}}if(!mc.hidden)miniUI()}
/* line: {name, detail, qty, unit, total, sku, url} */
function add(line){const l=items();l.push(Object.assign({id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),at:Date.now()},line));save(l);cartUI(true);return l.length}
const mc=document.createElement('div');mc.className='mini-cart';mc.id='miniCart';mc.hidden=true;mc.setAttribute('role','dialog');mc.setAttribute('aria-label','Your cart');document.body.appendChild(mc);
function miniUI(){const l=items(),sub=l.reduce((s,x)=>s+(+x.total||0),0);
 mc.innerHTML=`<div class="mc-hd"><b>Your cart</b><button type="button" class="mc-x" data-mc-close aria-label="Close cart"><svg class="ico" aria-hidden="true"><use href="#i-x"/></svg></button></div>`+
  (l.length?`<ul class="mc-list">${l.map(x=>`<li><div class="mc-t">${x.url?`<a href="${esc(ROOT+x.url)}">${esc(x.name)}</a>`:esc(x.name)}<small>${esc(x.detail||'')}</small><small>${(+x.qty||0).toLocaleString()} × ${money(x.unit)}${x.sku?` · ${esc(x.sku)}`:''}</small></div><div class="mc-r"><b>${money(x.total)}</b><button type="button" class="linkbtn" data-mc-rm="${esc(x.id)}">Remove</button></div></li>`).join('')}</ul>
   <div class="mc-sub"><span>Subtotal (${l.length} item${l.length===1?'':'s'}, ${units(l).toLocaleString()} pieces)</span><b>${money(sub)}</b></div>
   <p class="mc-note">Shipping and tax are added at checkout. Orders of $75 or more ship free.</p>
   <button type="button" class="mc-go" data-proto="Checkout runs on BigCommerce in production. Nothing is charged here.">Check out · ${money(sub)}</button>`
  :`<p class="mc-empty">Your cart is empty.</p><a class="mc-go" href="${ROOT}p/index.html">Browse products</a>`)}
function openMini(on){mc.hidden=!on;const b=$('#cartBtn');if(b)b.setAttribute('aria-expanded',String(on));if(on){miniUI();const r=b?b.getBoundingClientRect():{bottom:64};mc.style.top=Math.round(Math.max(8,r.bottom+8+scrollY))+'px';track('view_cart',{items:items().length});requestAnimationFrame(()=>{const f=$('button,a',mc);f&&f.focus({preventScroll:true})})}else if(b)b.focus({preventScroll:true})}
{const b=$('#cartBtn');if(b){b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-controls','miniCart');b.setAttribute('aria-expanded','false');b.addEventListener('click',ev=>{ev.stopPropagation();openMini(mc.hidden)})}}
mc.addEventListener('click',ev=>{ev.stopPropagation();const r=ev.target.closest('[data-mc-rm]');if(r){save(items().filter(x=>x.id!==r.dataset.mcRm));cartUI();miniUI();toast('Removed from your cart.');return}if(ev.target.closest('[data-mc-close]'))openMini(false)});
document.addEventListener('click',()=>{if(!mc.hidden)openMini(false)});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!mc.hidden)openMini(false)});
addEventListener('storage',ev=>{if(ev.key===CK)cartUI()});
cartUI();
window.CGSite={add,items,toast,root:ROOT,openCart:()=>openMini(true)};
})();
