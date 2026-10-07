/* =====================================================================
   3D view: a real WebGL preview of the finished domed sticker (three.js).
   Preview only: nothing can be selected or moved here. Drag to turn the sticker,
   scroll or pinch to zoom, double-click to reset. Editing happens in Design.
   The texture is the studio's own SVG, so the preview always matches the print.
   three.js loads from jsDelivr on first use; self-host it for production.
   If it can't load (offline), the flat dome preview is used instead.
   ===================================================================== */
const V3={ver:'0.160.0',T:null,Room:null,loading:null,ready:false,failed:false,on:false,el:null,cv:null,ov:null,
 renderer:null,scene:null,camera:null,grp:null,mesh:null,back:null,shadow:null,tex:null,mr:null,sig:'',shapeSig:'',busy:false,dirty:false,
 yaw:.32,pitch:-.42,vy:0,vp:0,zoom:1,spin:false,drag:null,anim:null,fonts:{},rc:null,H0:8,size:[0,0],ptrs:new Map()};
const V3DEF={yaw:.32,pitch:-.42,zoom:1};

function v3dDom(){if(V3.el)return;const d=document.createElement('div');d.className='v3d';d.id='v3d';d.hidden=true;
 d.innerHTML=`<canvas class="v3d-c" tabindex="0" role="img" aria-label="3D preview of your finished sticker. Drag or use the arrow keys to turn it."></canvas>
 <div class="v3d-ui"><button type="button" class="v3d-b" data-v3="edit" data-tip="Go back to Design to change your sticker"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>Edit design</button><button type="button" class="v3d-b" data-v3="reset" data-tip="Reset view (double-click)"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4"/></svg>Reset</button><button type="button" class="v3d-b" data-v3="spin" aria-pressed="false" data-tip="Slowly turn the sticker"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="9" ry="4"/><path d="M12 3v18M17 5.5l2 2-2 2"/></svg>Turntable</button></div>
 <p class="v3d-hint"><span class="d">Preview of your finished sticker · Drag to turn · Scroll to zoom</span><span class="m">Preview · Drag to turn · Pinch to zoom</span></p>
 <div class="v3d-load" hidden><span class="gtyping" aria-hidden="true"><i></i><i></i><i></i></span><span class="v3d-lt">Preparing 3D preview…</span></div>`;
 vp.appendChild(d);V3.el=d;V3.cv=$('.v3d-c',d);
 d.addEventListener('click',ev=>{const b=ev.target.closest('[data-v3]');if(!b)return;if(b.dataset.v3==='edit'){setView('edit');return}if(b.dataset.v3==='reset')v3dReset();else{V3.spin=!V3.spin;b.setAttribute('aria-pressed',String(V3.spin));track('builder_3d_spin',{on:V3.spin})}});
 v3dPointers()}

function v3dLoad(){if(V3.loading)return V3.loading;const base=`https://cdn.jsdelivr.net/npm/three@${V3.ver}/`;
 V3.loading=Promise.all([import(base+'+esm'),import(base+'examples/jsm/environments/RoomEnvironment.js/+esm')]).then(([T,R])=>{V3.T=T;V3.Room=R.RoomEnvironment;v3dInit()}).catch(e=>{V3.loading=null;throw e});return V3.loading}
function v3dInit(){const T=V3.T,r=new T.WebGLRenderer({canvas:V3.cv,antialias:true,alpha:true});
 r.setPixelRatio(Math.min(3,Math.max(2,devicePixelRatio||1)));r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.NoToneMapping;
 const sc=new T.Scene(),pm=new T.PMREMGenerator(r);sc.environment=pm.fromScene(new V3.Room(),.04).texture;pm.dispose();
 const cam=new T.PerspectiveCamera(26,1,1,50000);cam.position.set(0,0,1000);
 const key=new T.DirectionalLight(0xffffff,.55);key.position.set(-.55,.8,1);sc.add(key);
 const rim=new T.DirectionalLight(0xffffff,.18);rim.position.set(.8,-.3,.6);sc.add(rim);
 const grp=new T.Group();sc.add(grp);
 V3.renderer=r;V3.scene=sc;V3.camera=cam;V3.grp=grp;V3.rc=new T.Raycaster();V3.ready=true}

/* ---------- view on/off ---------- */
function v3dView(on){if(!on&&!V3.el)return;v3dDom();V3.on=on&&!V3.failed;V3.el.hidden=!V3.on;studio.classList.toggle('is3d',V3.on);
 if(!V3.on){V3.drag=null;if(V3.renderer)V3.renderer.setAnimationLoop(null);return}
 const go=()=>{V3.sig='';V3.el.classList.remove('ready');V3.intro=true;ld.hidden=false;V3.vy=V3.vp=0;V3.renderer.setAnimationLoop(v3dFrame);req();track('builder_3d_open')};
 const ld=$('.v3d-load',V3.el);if(V3.ready){go();return}
 ld.hidden=false;
 v3dLoad().then(()=>{if(V3.on)go();else ld.hidden=true}).catch(()=>{ld.hidden=true;V3.failed=true;V3.on=false;V3.el.hidden=true;studio.classList.remove('is3d');req();
  toast('The 3D view needs an internet connection to load. Showing the flat dome preview instead.')})}
function v3dIntro(){V3.anim={t0:performance.now(),dur:reduce.matches?1:750,from:{yaw:0,pitch:0,zoom:1.08},to:{yaw:V3DEF.yaw,pitch:V3DEF.pitch,zoom:V3DEF.zoom}};V3.vy=V3.vp=0}
function v3dReset(){V3.spin=false;const b=V3.el&&$('[data-v3="spin"]',V3.el);if(b)b.setAttribute('aria-pressed','false');
 V3.anim={t0:performance.now(),dur:reduce.matches?1:500,from:{yaw:V3.yaw,pitch:V3.pitch,zoom:V3.zoom},to:{yaw:Math.round((V3.yaw-V3DEF.yaw)/(2*Math.PI))*2*Math.PI+V3DEF.yaw,pitch:V3DEF.pitch,zoom:V3DEF.zoom}};V3.vy=V3.vp=0}

/* ---------- design → texture ---------- */
function v3dSync(){if(!V3.on||!V3.ready)return;const sig=snapshot()+'|'+(D.shape==='custom'&&CT.url?CT.url.length+CT.url.slice(-48):'');if(sig===V3.sig)return;V3.sig=sig;v3dQueue()}
function v3dQueue(){if(V3.busy){V3.dirty=true;return}V3.busy=true;const px=2048;
 v3dBuild(px).catch(()=>{}).finally(()=>{V3.busy=false;if(V3.dirty){V3.dirty=false;v3dQueue()}})}
function b64(buf){const u=new Uint8Array(buf);let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)}
async function v3dFontCSS(){const fams=[...new Set(D.els.filter(e=>e.type==='text'&&!e.hidden).map(e=>FONTS[e.font]&&FONTS[e.font].n).filter(Boolean))];if(!fams.length)return '';
 const need=fams.filter(f=>V3.fonts[f]==null);
 if(need.length){try{const link=[...document.querySelectorAll('link[rel="stylesheet"]')].find(l=>/fonts\.googleapis\.com/.test(l.href));if(!link)throw 0;
   if(!V3.gcss)V3.gcss=await (await fetch(link.href)).text();
   const blocks=V3.gcss.split('/*').slice(1).map(b=>{const j=b.indexOf('*/');return{sub:b.slice(0,j).trim(),body:b.slice(j+2)}}).filter(b=>b.sub==='latin');
   await Promise.all(need.map(async f=>{const mine=blocks.filter(b=>(b.body.match(/font-family:\s*'([^']+)'/)||[])[1]===f);
    const parts=await Promise.all(mine.map(async b=>{const m=b.body.match(/url\((https:[^)]+)\)/);if(!m)return '';const buf=await (await fetch(m[1])).arrayBuffer();return b.body.replace(m[1],'data:font/woff2;base64,'+b64(buf))}));
    V3.fonts[f]=parts.join('\n')}))}catch(e){need.forEach(f=>{if(V3.fonts[f]==null)V3.fonts[f]=''})}}
 return fams.map(f=>V3.fonts[f]||'').join('\n')}
function svgToCanvas(node,cw,ch){return new Promise(res=>{const str=new XMLSerializer().serializeToString(node),url=URL.createObjectURL(new Blob([str],{type:'image/svg+xml'})),im=new Image();
 im.onload=()=>{const c=document.createElement('canvas');c.width=cw;c.height=ch;c.getContext('2d').drawImage(im,0,0,cw,ch);URL.revokeObjectURL(url);res(c)};im.onerror=()=>{URL.revokeObjectURL(url);res(null)};im.src=url})}
async function v3dRaster(px){const w=W(),h=H(),s=px/Math.max(w,h),cw=Math.max(2,Math.round(w*s)),ch=Math.max(2,Math.round(h*s)),c=svg.cloneNode(true);
 ['#selG','#guideG','#draftG','#dimsG','#proofG','#shadowG','#ghost'].forEach(q=>{const n=c.querySelector(q);if(n)n.remove()});
 c.querySelectorAll('.v-edit,.v-sheet,.v-dome,.v-proof').forEach(n=>n.remove());
 c.querySelectorAll('.el.editing').forEach(n=>n.classList.remove('editing'));const br=c.querySelector('#brushRect');if(br)br.remove();
 c.setAttribute('xmlns',NS);c.setAttribute('viewBox',`0 0 ${w} ${h}`);c.setAttribute('width',cw);c.setAttribute('height',ch);c.removeAttribute('style');
 const css=await v3dFontCSS();if(css){const st=document.createElementNS(NS,'style');st.textContent=css;c.insertBefore(st,c.firstChild)}
 const color=await svgToCanvas(c,cw,ch);if(!color)return null;let ink=null;
 if(D.vinyl!=='white'){const c2=c.cloneNode(true),sr=c2.querySelector('#subRect');if(sr&&sr.parentNode)sr.parentNode.remove();ink=await svgToCanvas(c2,cw,ch)}
 return{color,ink,cw,ch}}
function blurField(z,gw,gh,r,passes){let a=z,b=new Float32Array(z.length);const n=2*r+1;
 for(let p=0;p<passes;p++){for(let y=0;y<gh;y++){let acc=0;for(let x=-r;x<=r;x++)acc+=a[y*gw+clamp(x,0,gw-1)];for(let x=0;x<gw;x++){b[y*gw+x]=acc/n;acc+=a[y*gw+Math.min(gw-1,x+r+1)]-a[y*gw+Math.max(0,x-r)]}}
  for(let x=0;x<gw;x++){let acc=0;for(let y=-r;y<=r;y++)acc+=b[clamp(y,0,gh-1)*gw+x];for(let y=0;y<gh;y++){a[y*gw+x]=acc/n;acc+=b[Math.min(gh-1,y+r+1)*gw+x]-b[Math.max(0,y-r)*gw+x]}}}
 return a}
function chamfer(inside,gw,gh){const d=new Float32Array(gw*gh),B=1.4142;for(let i=0;i<d.length;i++)d[i]=inside[i]?1e9:0;
 for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){const i=y*gw+x;if(!d[i])continue;d[i]=Math.min(d[i],(x>0?d[i-1]:0)+1,(y>0?d[i-gw]:0)+1,(x>0&&y>0?d[i-gw-1]:0)+B,(x<gw-1&&y>0?d[i-gw+1]:0)+B)}
 for(let y=gh-1;y>=0;y--)for(let x=gw-1;x>=0;x--){const i=y*gw+x;if(!d[i])continue;d[i]=Math.min(d[i],(x<gw-1?d[i+1]:0)+1,(y<gh-1?d[i+gw]:0)+1,(x<gw-1&&y<gh-1?d[i+gw+1]:0)+B,(x>0&&y<gh-1?d[i+gw-1]:0)+B)}
 return d}
/* Texture with a soft, anti-aliased outline. Canvas pixels that are fully transparent lose their colour,
   so filtering would darken the rim; spread the edge colour outward first, keep the original alpha. */
function v3dEdgeTex(cv){const T=V3.T,w=cv.width,h=cv.height,a=cv.getContext('2d').getImageData(0,0,w,h).data;
 const b=document.createElement('canvas');b.width=w;b.height=h;const bx=b.getContext('2d');bx.filter=`blur(${Math.max(2,Math.round(w/340))}px)`;bx.drawImage(cv,0,0);bx.drawImage(cv,0,0);bx.filter='none';
 const d=bx.getImageData(0,0,w,h).data,o=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++){const si=y*w*4,di=(h-1-y)*w*4;for(let x=0;x<w*4;x+=4){const i=si+x,j=di+x,al=a[i+3],c=al?a:d;o[j]=c[i];o[j+1]=c[i+1];o[j+2]=c[i+2];o[j+3]=al}}
 const t=new T.DataTexture(o,w,h,T.RGBAFormat,T.UnsignedByteType);t.colorSpace=T.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;
 t.anisotropy=V3.renderer.capabilities.getMaxAnisotropy();t.needsUpdate=true;return t}
async function v3dBuild(px){const R=await v3dRaster(px);if(!V3.on)return;if(!R){v3dShow();return}const T=V3.T,w=W(),h=H(),grp=V3.grp;
 /* color texture (its alpha is the sticker outline) */
 const tex=v3dEdgeTex(R.color);
 /* metallic: white areas print clear, so the vinyl shows as real metal there */
 let mrTex=null;if(R.ink){const m=document.createElement('canvas');m.width=R.cw;m.height=R.ch;const mx=m.getContext('2d'),id=mx.createImageData(R.cw,R.ch),ia=R.ink.getContext('2d').getImageData(0,0,R.cw,R.ch).data,o=id.data;
  for(let i=0;i<o.length;i+=4){const metal=1-ia[i+3]/255;o[i]=255;o[i+1]=Math.round(255*(.55-.34*metal));o[i+2]=Math.round(255*metal);o[i+3]=255}mx.putImageData(id,0,0);mrTex=new T.CanvasTexture(m);mrTex.colorSpace=T.NoColorSpace}
 /* dome height from distance to the cut edge */
 const ssig=JSON.stringify([D.shape,D.w,D.h,D.rounded,D.gap,D.shape==='custom'&&CT.url?CT.url.length+CT.url.slice(-48):0]);
 if(ssig!==V3.shapeSig||!V3.mesh){V3.shapeSig=ssig;const G=230,gw=Math.max(8,Math.round(G*w/Math.max(w,h))),gh=Math.max(8,Math.round(G*h/Math.max(w,h))),lc=document.createElement('canvas');lc.width=gw;lc.height=gh;
  const lx=lc.getContext('2d');lx.drawImage(R.color,0,0,gw,gh);const la=lx.getImageData(0,0,gw,gh).data,ins=new Uint8Array(gw*gh);for(let i=0;i<ins.length;i++)ins[i]=la[i*4+3]>127?1:0;
  const dist=chamfer(ins,gw,gh),cell=w/gw,H0=V3.H0=clamp(Math.min(w,h)*.034,3.5,8),edge=clamp(Math.min(w,h)*.2,12,42);let zg=new Float32Array(gw*gh);
  for(let i=0;i<zg.length;i++){if(!ins[i])continue;const t=clamp((dist[i]-.5)*cell/edge,0,1);zg[i]=H0*(1-Math.pow(1-t,2.4))}
  zg=blurField(zg,gw,gh,2,3);
  const geo=new T.PlaneGeometry(w,h,gw,gh),pos=geo.attributes.position,uv=geo.attributes.uv;
  const zat=(u,v)=>{const x=clamp(u*gw-.5,0,gw-1),y=clamp(v*gh-.5,0,gh-1),x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(gw-1,x0+1),y1=Math.min(gh-1,y0+1),fx=x-x0,fy=y-y0;
   return (zg[y0*gw+x0]*(1-fx)+zg[y0*gw+x1]*fx)*(1-fy)+(zg[y1*gw+x0]*(1-fx)+zg[y1*gw+x1]*fx)*fy};
  for(let i=0;i<pos.count;i++)pos.setZ(i,zat(uv.getX(i),1-uv.getY(i)));geo.computeVertexNormals();
  if(V3.mesh){V3.mesh.geometry.dispose();V3.mesh.geometry=geo}else{V3.mesh=new T.Mesh(geo,new T.MeshPhysicalMaterial({clearcoat:1,clearcoatRoughness:.05,transparent:true,alphaTest:.01,envMapIntensity:.62,specularIntensity:.35}));V3.mesh.renderOrder=2;grp.add(V3.mesh)}
  /* back of the sticker (white liner side) */
  const mask=document.createElement('canvas');mask.width=R.cw;mask.height=R.ch;const mk2=mask.getContext('2d');mk2.drawImage(R.color,0,0);mk2.globalCompositeOperation='source-in';mk2.fillStyle='#fff';mk2.fillRect(0,0,R.cw,R.ch);
  const cov=document.createElement('canvas');cov.width=R.cw;cov.height=R.ch;const cx2=cov.getContext('2d');cx2.fillStyle='#000';cx2.fillRect(0,0,R.cw,R.ch);cx2.drawImage(mask,0,0);
  const mtex=new T.CanvasTexture(cov);mtex.anisotropy=V3.renderer.capabilities.getMaxAnisotropy();
  if(V3.back){V3.back.geometry.dispose();V3.back.material.alphaMap.dispose();V3.back.geometry=new T.PlaneGeometry(w,h);V3.back.material.alphaMap=mtex;V3.back.material.needsUpdate=true}
  else{V3.back=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({color:0xf3f2ee,roughness:.85,alphaMap:mtex,transparent:true,alphaTest:.01}));V3.back.renderOrder=1;V3.back.rotation.y=Math.PI;V3.back.position.z=-.4;grp.add(V3.back)}
  /* soft contact shadow that moves with the sticker */
  const sw=256,sh2=Math.max(8,Math.round(256*h/w)),pad=.22,sc=document.createElement('canvas');sc.width=Math.round(sw*(1+2*pad));sc.height=Math.round(sh2*(1+2*pad));const sx=sc.getContext('2d');sx.filter=`blur(${Math.round(sw*.035)}px)`;sx.globalAlpha=.55;sx.drawImage(mask,sw*pad,sh2*pad,sw,sh2);
  const stex=new T.CanvasTexture(sc);
  if(V3.shadow){V3.shadow.geometry.dispose();V3.shadow.material.map.dispose();V3.shadow.geometry=new T.PlaneGeometry(w*(1+2*pad),h*(1+2*pad));V3.shadow.material.map=stex;V3.shadow.material.needsUpdate=true}
  else{V3.shadow=new T.Mesh(new T.PlaneGeometry(w*(1+2*pad),h*(1+2*pad)),new T.MeshBasicMaterial({map:stex,color:0x0b1020,transparent:true,depthWrite:false,opacity:.75}));V3.shadow.renderOrder=0;grp.add(V3.shadow)}
  V3.shadow.position.set(w*.012,-h*.03,-1.2)}
 const mat=V3.mesh.material;if(V3.tex)V3.tex.dispose();if(V3.mr)V3.mr.dispose();V3.tex=tex;V3.mr=mrTex;
 mat.map=tex;mat.metalnessMap=mrTex;mat.roughnessMap=mrTex;mat.metalness=mrTex?1:0;mat.roughness=mrTex?1:.48;mat.envMapIntensity=mrTex?.9:.62;mat.needsUpdate=true;v3dShow()}
function v3dShow(){if(!V3.el||V3.el.classList.contains('ready'))return;V3.el.classList.add('ready');$('.v3d-load',V3.el).hidden=true;if(V3.intro){V3.intro=false;v3dIntro()}}

/* ---------- frame ---------- */
const ease=t=>1-Math.pow(1-t,3);
function v3dFrame(now){if(!V3.on)return;const r=V3.renderer,cv=V3.cv,cw=cv.clientWidth,ch=cv.clientHeight;if(!cw||!ch)return;
 if(V3.size[0]!==cw||V3.size[1]!==ch){V3.size=[cw,ch];r.setSize(cw,ch,false);V3.camera.aspect=cw/ch;V3.camera.updateProjectionMatrix()}
 if(V3.anim){const a=V3.anim,t=clamp((now-a.t0)/a.dur,0,1),k=ease(t);V3.yaw=a.from.yaw+(a.to.yaw-a.from.yaw)*k;V3.pitch=a.from.pitch+(a.to.pitch-a.from.pitch)*k;V3.zoom=a.from.zoom+(a.to.zoom-a.from.zoom)*k;if(t>=1)V3.anim=null}
 else if(!V3.drag){if(V3.spin)V3.yaw+=.0065;else if(Math.abs(V3.vy)+Math.abs(V3.vp)>1e-4){V3.yaw+=V3.vy;V3.pitch+=V3.vp;V3.vy*=.88;V3.vp*=.88}}
 V3.pitch=clamp(V3.pitch,-1.2,1.2);V3.grp.rotation.set(V3.pitch,V3.yaw,0);
 const w=W(),h=H(),cam=V3.camera,fv=Math.tan(cam.fov*Math.PI/360),need=Math.max(h*1.32/2/fv,w*1.32/2/(fv*cam.aspect));cam.position.set(0,0,need*V3.zoom);cam.lookAt(0,0,0);
 r.render(V3.scene,cam)}
/* ---------- pointer: preview only, every drag turns the sticker ---------- */
function v3dPointers(){const cv=V3.cv;
 cv.addEventListener('pointerdown',ev=>{if(!V3.ready||ev.button===2)return;closePop();hideTip();cv.focus({preventScroll:true});V3.ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});try{cv.setPointerCapture(ev.pointerId)}catch(e){}
  V3.anim=null;V3.vy=V3.vp=0;
  if(V3.ptrs.size===2){const [a,b]=[...V3.ptrs.values()];V3.drag={t:'pinch',d0:Math.hypot(a.x-b.x,a.y-b.y),z0:V3.zoom};return}
  V3.drag={t:'turn',x:ev.clientX,y:ev.clientY,lx:ev.clientX,ly:ev.clientY,lt:performance.now(),vx:0,vy:0,moved:false};cv.classList.add('grabbing')});
 cv.addEventListener('pointermove',ev=>{const d=V3.drag;if(!d)return;if(V3.ptrs.has(ev.pointerId))V3.ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(d.t==='pinch'){if(V3.ptrs.size<2)return;const [a,b]=[...V3.ptrs.values()];V3.zoom=clamp(d.z0*d.d0/Math.max(20,Math.hypot(a.x-b.x,a.y-b.y)),.45,2.6);return}
  const dx=ev.clientX-d.lx,dy=ev.clientY-d.ly;if(!d.moved&&Math.hypot(ev.clientX-d.x,ev.clientY-d.y)<3)return;d.moved=true;
  const now=performance.now(),dt=Math.max(8,now-d.lt),k=.0055;V3.yaw+=dx*k;V3.pitch=clamp(V3.pitch+dy*k,-1.2,1.2);
  d.vx=.6*d.vx+.4*(dx*k*16/dt);d.vy=.6*d.vy+.4*(dy*k*16/dt);d.lx=ev.clientX;d.ly=ev.clientY;d.lt=now});
 const end=ev=>{V3.ptrs.delete(ev.pointerId);const d=V3.drag;if(!d)return;if(d.t==='pinch'){if(V3.ptrs.size<2)V3.drag=null;return}
  V3.drag=null;cv.classList.remove('grabbing');
  if(d.moved){const fresh=performance.now()-d.lt<70;V3.vy=fresh?clamp(d.vx,-.028,.028):0;V3.vp=fresh?clamp(d.vy,-.028,.028):0;track('builder_3d_turn')}};
 cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
 cv.addEventListener('dblclick',ev=>{ev.preventDefault();v3dReset()});
 cv.addEventListener('wheel',ev=>{ev.preventDefault();V3.anim=null;V3.zoom=clamp(V3.zoom*Math.exp(ev.deltaY*.0015),.45,2.6)},{passive:false});
 cv.addEventListener('contextmenu',ev=>ev.preventDefault());
 cv.addEventListener('keydown',ev=>{const k={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,-.12],ArrowDown:[0,.12]}[ev.key];
  if(k){ev.preventDefault();ev.stopPropagation();V3.anim=null;V3.vy=V3.vp=0;V3.yaw+=k[0];V3.pitch=clamp(V3.pitch+k[1],-1.2,1.2)}
  else if(ev.key==='0'||ev.key==='Home'){ev.preventDefault();v3dReset()}
  else if(ev.key==='+'||ev.key==='='){ev.preventDefault();V3.zoom=clamp(V3.zoom/1.15,.45,2.6)}
  else if(ev.key==='-'){ev.preventDefault();V3.zoom=clamp(V3.zoom*1.15,.45,2.6)}})}
