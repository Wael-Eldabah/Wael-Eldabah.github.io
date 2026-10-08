/*
  SIGNAL ATLAS / custom scene router & projected 4D geometry.
  No third-party runtime, no credentials, no analytics, no frameworks.
  If JS fails, original semantic long-form page remains accessible.
*/
(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const ids=['home','manifesto','cases','expertise','timeline','credentials','resumes','contact'];
const names=['THE THRESHOLD','THE MINDSET','THE ARTIFACT','THE METHODS','THE TRAJECTORY','THE PROOF','THE ARCHIVE','THE HANDSHAKE'];
const subs=['OFFENSIVE SECURITY / ENTRY POINT','ADVERSARIAL THINKING','EYEGUARD / SECURITY RESEARCH','ASSESSMENT / APPSEC / THREAT MODEL','SECURITY EXPERIENCE / INSTRUCTION','CREDENTIALS / RECOGNITION','3 SPECIALIZED CV EDITIONS','OPEN CONTACT CHANNEL'];
const sections=ids.map(id=>document.getElementById(id));
const hud=$('#chapterHud'),map=$('#chapterMap'),wipe=$('#transitionWipe'),counter=$('#hudCounter'),title=$('#hudTitle'),subtitle=$('#hudSubtitle'),track=$('#hudTrack span');
const previous=$('#previousChapter'),next=$('#nextChapter'),indexButton=$('#openIndex'),closeIndex=$('#closeIndex');
const motionToggle=$('#motionToggle'),motionLabel=$('#motionLabel');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let effectsEnabled=!reduce,active=0,busy=false,timeoutId=0,previousFocus=null;
function currentIndex(){const raw=decodeURIComponent(location.hash.replace(/^#/,''));return Math.max(0,ids.indexOf(raw))}
function setUi(){counter.innerHTML=String(active+1).padStart(2,'0')+' <i>/ 08</i>';title.textContent=names[active];subtitle.textContent=subs[active];track.style.width=((active+1)/ids.length*100)+'%';previous.disabled=active===0;previous.style.opacity=active===0?'.4':'1';next.textContent=active===ids.length-1?'RESTART ↺':'NEXT →';$$('[data-go]').forEach(b=>b.classList.toggle('selected',b.dataset.go===ids[active]));}
function openMap(){previousFocus=document.activeElement;map.hidden=false;indexButton.setAttribute('aria-expanded','true');closeIndex.focus({preventScroll:true})}
function shutMap(){if(map.hidden)return;map.hidden=true;indexButton.setAttribute('aria-expanded','false');if(previousFocus && previousFocus.isConnected) previousFocus.focus({preventScroll:true});}
function prepareSection(index){const old=active;sections.forEach((el,i)=>{if(i===index){el.classList.add('view-active');el.classList.remove('view-outgoing');el.inert=false;el.removeAttribute('aria-hidden');}else{el.classList.remove('view-active');el.inert=true;el.setAttribute('aria-hidden','true');el.classList.toggle('view-outgoing',i===old);}});active=index;setUi();sections[index].scrollTop=0;}
function moveTo(index,{instant=false,writeHistory=true,focus=true}={}){
  if(index<0||index>=ids.length||busy)return;
  shutMap();if(index===active){if(writeHistory)history.replaceState({chapter:index},'', '#'+ids[index]);return;}
  if(writeHistory)history.pushState({chapter:index},'','#'+ids[index]);
  const shouldAnimate=effectsEnabled&&!instant;
  if(!shouldAnimate){prepareSection(index);if(focus)focusChapter(index);return;}
  busy=true;document.body.classList.remove('transiting');void wipe.offsetWidth;document.body.classList.add('transiting');
  const gate=window.setTimeout(()=>{prepareSection(index);if(focus)focusChapter(index)},340);
  timeoutId=window.setTimeout(()=>{document.body.classList.remove('transiting');sections.forEach(el=>el.classList.remove('view-outgoing'));busy=false},990);
}
function focusChapter(i){const target=sections[i].querySelector('h1,h2');if(target){target.setAttribute('tabindex','-1');target.focus({preventScroll:true})}}
function moveRelative(delta){if(busy)return;moveTo(delta===1?(active+1)%ids.length:Math.max(0,active-1))}
// Navigation with standard anchors and address-bar deep links.
document.addEventListener('click',e=>{const link=e.target.closest('a[href^="#"]');if(!link)return;const hash=link.getAttribute('href').slice(1),idx=ids.indexOf(hash);if(idx<0)return;e.preventDefault();moveTo(idx);});
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>moveTo(ids.indexOf(b.dataset.go))));
previous.addEventListener('click',()=>moveRelative(-1));next.addEventListener('click',()=>moveRelative(1));
indexButton.addEventListener('click',()=>map.hidden?openMap():shutMap());closeIndex.addEventListener('click',shutMap);
window.addEventListener('popstate',()=>moveTo(currentIndex(),{instant:true,writeHistory:false}));
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){shutMap();return;}if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;
  if(e.target.closest('a,button,input,textarea,select,[contenteditable="true"]'))return;
  if(map.hidden&&['ArrowRight','PageDown'].includes(e.key)){e.preventDefault();moveRelative(1)}
  if(map.hidden&&['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();moveRelative(-1)}
  if(map.hidden&&/^[1-8]$/.test(e.key)){e.preventDefault();moveTo(Number(e.key)-1)}
});
// Touch gestures only on the hero to preserve scrolling through dense content.
let downX=0,downY=0;
$('#home').addEventListener('touchstart',e=>{if(e.touches.length!==1)return;downX=e.touches[0].clientX;downY=e.touches[0].clientY},{passive:true});
$('#home').addEventListener('touchend',e=>{if(!e.changedTouches.length||e.target.closest('button,a'))return;const x=e.changedTouches[0].clientX-downX,y=e.changedTouches[0].clientY-downY;if(Math.abs(x)>105&&Math.abs(x)>Math.abs(y)*1.8)moveRelative(x<0?1:-1)},{passive:true});
// Add contextual CTA to every scene; not an endless scroll.
sections.slice(1,-1).forEach((section,j)=>{const shell=section.querySelector('.shell')||section;const footer=document.createElement('div');footer.className='scene-chapter-next';footer.innerHTML='<span>END / '+String(j+2).padStart(2,'0')+' — CONTINUE THE INVESTIGATION</span><button type="button">NEXT CHAPTER ↗</button>';footer.querySelector('button').addEventListener('click',()=>moveTo(j+2));shell.append(footer)});
function setEffects(on){effectsEnabled=!!on&&!reduce;document.body.classList.toggle('effects-off',!effectsEnabled);motionToggle.setAttribute('aria-pressed',String(effectsEnabled));motionToggle.setAttribute('aria-label',effectsEnabled?'Turn visual effects off':'Turn visual effects on');motionLabel.textContent=effectsEnabled?'ON':'OFF';drawStatic();}
motionToggle.addEventListener('click',()=>setEffects(!effectsEnabled));
// 4D hypercube projection: rotate four-dimensional coordinates and project to the 2D Canvas.
// This mathematically projects 4D geometry; it is not described as hardware WebGL rendering.
const canvas=$('#hypercube'),ctx=canvas.getContext('2d',{alpha:true});let cw=0,ch=0,ratio=1,animation=0,lastFrame=0,orbit=0,mx=0,my=0;
const verts=[],connections=[];
for(let i=0;i<16;i++)verts.push([i&1?1:-1,i&2?1:-1,i&4?1:-1,i&8?1:-1]);
for(let i=0;i<16;i++)for(let b=0;b<4;b++){const j=i^(1<<b);if(j>i)connections.push([i,j]);}
function resize(){const box=canvas.getBoundingClientRect();cw=Math.max(220,box.width);ch=Math.max(220,box.height);ratio=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(cw*ratio);canvas.height=Math.round(ch*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);drawStatic();}
function rotate4(a,b,i,j,theta){const c=Math.cos(theta),s=Math.sin(theta),x=a[i],y=a[j];a[i]=x*c-y*s;a[j]=x*s+y*c;}
function projections(t){const size=Math.min(cw,ch)*.29,cx=cw*.52,cy=ch*.49;return verts.map((p)=>{let v=p.slice();rotate4(v,0,3,t*.00023+mx*.23);rotate4(v,1,2,t*.0003);rotate4(v,2,3,t*.00018);rotate4(v,0,1,t*.00016);const p4=2.9/(2.9-v[3]*.6);v=[v[0]*p4,v[1]*p4,v[2]*p4];const yaw=.38+Math.sin(t*.00017)*.24,cyaw=Math.cos(yaw),syaw=Math.sin(yaw);let xx=v[0]*cyaw-v[2]*syaw,zz=v[0]*syaw+v[2]*cyaw;const pitch=.22+my*.2,cp=Math.cos(pitch),sp=Math.sin(pitch);let yy=v[1]*cp-zz*sp;zz=v[1]*sp+zz*cp;const p3=3.7/(3.7-.43*zz);return{x:cx+xx*size*p3,y:cy+yy*size*p3,z:zz}});}
function render(time){if(!ctx)return;ctx.clearRect(0,0,cw,ch);const pts=projections(time),r=Math.min(cw,ch)*.34,cx=cw*.52,cy=ch*.49;const shade=ctx.createRadialGradient(cx,cy,20,cx,cy,r*1.48);shade.addColorStop(0,'rgba(7,13,17,.72)');shade.addColorStop(.72,'rgba(7,13,17,.31)');shade.addColorStop(1,'rgba(7,13,17,0)');ctx.fillStyle=shade;ctx.beginPath();ctx.arc(cx,cy,r*1.48,0,Math.PI*2);ctx.fill();
  // Scope rings evoke forensic target acquisition, rather than a generic spinning earth.
  ctx.save();ctx.translate(cx,cy);ctx.rotate(-.17);for(let k=0;k<3;k++){ctx.beginPath();ctx.ellipse(0,0,r*(1+k*.18),r*(.4+k*.09),0,0,Math.PI*2);ctx.strokeStyle='rgba(204,255,116,'+(.075-k*.018)+')';ctx.lineWidth=.8;ctx.stroke();}ctx.restore();
  const palette=['206,255,107','173,154,255','255,129,103'];let selected=0;const chosen=document.querySelector('.scene-switch.active');if(chosen)selected=Number(chosen.dataset.scene)||0;const color=palette[selected];
  ctx.globalCompositeOperation='screen';ctx.lineWidth=1.75;ctx.shadowColor='rgba('+color+',.8)';ctx.shadowBlur=7;
  connections.forEach(([a,b],k)=>{const A=pts[a],B=pts[b],alpha=.38+.4*Math.max(0,(A.z+B.z+3)/6);ctx.strokeStyle='rgba('+color+','+alpha+')';ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();});
  for(let i=0;i<pts.length;i++){const p=pts[i];ctx.fillStyle='rgba('+color+','+(.55+.24*Math.sin(time*.001+i))+')';ctx.beginPath();ctx.arc(p.x,p.y,3.6,0,2*Math.PI);ctx.fill();}
  // Crosshair and materialized attack paths.
  ctx.shadowBlur=0;ctx.lineWidth=1;ctx.strokeStyle='rgba('+color+',.55)';ctx.beginPath();ctx.moveTo(cx-21,cy);ctx.lineTo(cx-7,cy);ctx.moveTo(cx+7,cy);ctx.lineTo(cx+21,cy);ctx.moveTo(cx,cy-21);ctx.lineTo(cx,cy-7);ctx.moveTo(cx,cy+7);ctx.lineTo(cx,cy+21);ctx.stroke();ctx.globalCompositeOperation='source-over';}
function drawStatic(){if(!ctx)return;render(effectsEnabled?performance.now():0)}
function tick(t){animation=0;if(!effectsEnabled||document.hidden||active!==0)return;if(t-lastFrame>=24){render(t);lastFrame=t;}animation=requestAnimationFrame(tick)}
function animate(){if(effectsEnabled&&!animation&&active===0&&!document.hidden)animation=requestAnimationFrame(tick)}
function pause(){if(animation)cancelAnimationFrame(animation);animation=0;}
if(ctx){window.addEventListener('resize',resize,{passive:true});if('ResizeObserver'in window)new ResizeObserver(resize).observe(canvas);const stage=$('#home');stage.addEventListener('pointermove',e=>{const b=stage.getBoundingClientRect();mx=(e.clientX-b.left)/b.width-.5;my=(e.clientY-b.top)/b.height-.5},{passive:true});stage.addEventListener('pointerleave',()=>{mx=0;my=0});document.addEventListener('visibilitychange',()=>document.hidden?pause():animate());resize()}
const basePrepare=prepareSection;prepareSection=(function(prepare){return function(i){prepare(i);if(i===0)animate();else pause();}})(basePrepare);
// Pointer-reveal alternates which other security stratum is exposed each time.
let returns=0;const stageHero=$('#home'),layers=['assets/fracture.webp','assets/terrain.webp','assets/monolith.webp'];
stageHero.addEventListener('pointerenter',e=>{if(e.pointerType==='touch'||!effectsEnabled)return;const chosen=document.querySelector('.scene-switch.active'),idx=Number(chosen?.dataset.scene)||0;returns++;const target=(idx+1+(returns%2))%3;$('#sceneReveal').style.backgroundImage='url("'+layers[target]+'")'},{passive:true});
// Optional preference to disable visual effects without hiding content.
const style=document.createElement('style');style.textContent='body.effects-off .dimension-field{display:none}body.effects-off .scene-reveal{display:none}body.effects-off .stage-beam{animation:none}body.effects-off .scene,body.effects-off .hero-lens{transition:none}';document.head.append(style);
// Activate presentation mode only after all event handlers have been registered.
sections.forEach((el,i)=>{el.classList.toggle('view-active',i===0);el.inert=i!==0;if(i!==0)el.setAttribute('aria-hidden','true')});
document.body.classList.add('cinema-mode');hud.hidden=false;setEffects(!reduce);setUi();
const initial=currentIndex();if(initial!==0)moveTo(initial,{instant:true,writeHistory:false,focus:false});else animate();
})();
