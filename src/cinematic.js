// V8: transparent cinematic video inside a shared layered scene. Detailed still
// artwork is retained while media loads and on browsers without video alpha.
// Surrounding fragments, particles and light remain independently interactive.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
const asset = name => new URL(`../assets/${name}`,import.meta.url).href;
const art = {};
const views = [];
let playing = !reduced.matches, modalOpen = false, expanded = false, focusView;
const focus = {open:false,playing:!reduced.matches,speed:1,rotationX:0,rotationY:0,pulse:0};
const media = {};
for(const [type,name] of [['hero','obsidian'],['orb','prism']]){
  const video=document.createElement('video');
  video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='none';
  video.setAttribute('playsinline','');video.setAttribute('muted','');
  const entry=media[type]={video,name,requested:false,ready:false,failed:false};
  video.addEventListener('loadeddata',()=>{
    // Some browsers decode VP9 but discard its alpha. Never paint a black box.
    const probe=document.createElement('canvas');probe.width=probe.height=2;
    const pc=probe.getContext('2d',{willReadFrequently:true});
    try{pc.drawImage(video,0,0,2,2,0,0,2,2);entry.ready=pc.getImageData(0,0,1,1).data[3]<16;}
    catch{entry.ready=false;}
    if(!entry.ready){entry.failed=true;video.pause();}
    for(const view of views)if(view.type===type)view.request();focusView?.request();syncMedia();
  });
  video.addEventListener('error',()=>{entry.failed=true;entry.ready=false;video.pause();for(const view of views)if(view.type===type)view.request();});
}
let motionManifest;
async function loadVideo(entry,variant){
 try{
  motionManifest ||= fetch(asset('motion/manifest.json')).then(r=>{if(!r.ok)throw Error('Media manifest');return r.json();});
  const manifest=await motionManifest, spec=manifest[`${entry.name}-${variant}`];
  if(!spec?.parts?.length)throw Error('No motion source for this scene');
  const parts=await Promise.all(spec.parts.map(async part=>{const r=await fetch(asset(`motion/${part}`));if(!r.ok)throw Error('Media segment');return r.arrayBuffer();}));
  const blob=new Blob(parts,{type:'video/webm; codecs="vp9"'});
  if(blob.size!==spec.bytes)throw Error('Incomplete video');
  entry.url=URL.createObjectURL(blob);entry.video.src=entry.url;entry.video.load();syncMedia();
 }catch{entry.failed=true;entry.ready=false;}
}
function syncMedia(){
  for(const [type,entry]of Object.entries(media)){
    const active=!document.hidden&&(focus.open?type==='hero'&&focus.playing:!modalOpen&&playing&&views.some(v=>v.type===type&&v.visible));
    if(active&&!entry.requested&&!entry.failed&&!navigator.connection?.saveData&&entry.video.canPlayType('video/webm; codecs="vp9"')){
      entry.requested=true;
      const size=matchMedia('(max-width:800px)').matches?'mobile-':'';
      loadVideo(entry,size?'mobile':'desktop');
    }
    entry.video.playbackRate=focus.open?focus.speed:1;
    if(active&&entry.requested&&!entry.failed){if(entry.video.paused)entry.video.play().catch(()=>{});}
    else entry.video.pause();
  }
}
const artworkFiles={hero:'obsidian-v8.webp',orb:'prism-v8.webp',portal:'rift-v8.webp',spire:'spire-v8.webp',rock:'obsidian-shard.webp'};
function loadArtwork(key){if(!art[key].src)art[key].src=asset(artworkFiles[key]);}
for (const key of Object.keys(artworkFiles)) {
  const img=new Image(); img.decoding='async'; art[key]=img;
  img.onload=()=>{for(const view of views)view.request();focusView?.request();};
}
const config={hero:{scale:.94,fragments:6},orb:{scale:.86,fragments:3},portal:{scale:.88,fragments:4},spire:{scale:.96,fragments:3}};
class CinematicScene {
  constructor(canvas,type,isFocus=false){
    this.canvas=canvas;this.type=type;this.isFocus=isFocus;this.ctx=canvas.getContext('2d',{alpha:true});
    this.frame=0;this.time=0;this.last=0;this.visible=false;this.mx=0;this.my=0;this.px=0;this.py=0;this.energy=0;
    this.fallback=canvas.parentElement.querySelector('.scene-fallback');
    canvas.dataset.state='cinematic-layers';
    canvas.setAttribute('aria-label',`Animated ${({hero:'obsidian sculpture',orb:'angular crystal core',portal:'basalt rift',spire:'layered spire'})[type]} with textured layers, depth, fragments and light`);
    this.resizeObserver=new ResizeObserver(()=>{this.resize();this.request();});this.resizeObserver.observe(canvas);
    this.observer=new IntersectionObserver(([e])=>{this.visible=e.isIntersecting;if(this.visible){loadArtwork(this.type);loadArtwork('rock');this.request();}else this.stop();syncMedia();},{rootMargin:'90px'});this.observer.observe(canvas);
    const parent=canvas.parentElement;
    parent.addEventListener('pointermove',e=>{if(!playing||reduced.matches||!finePointer.matches||e.pointerType!=='mouse'||this.isFocus)return;const r=parent.getBoundingClientRect();this.mx=clamp((e.clientX-r.left)/r.width*2-1,-1,1);this.my=clamp((e.clientY-r.top)/r.height*2-1,-1,1);this.request();},{passive:true});
    parent.addEventListener('pointerleave',()=>{this.mx=0;this.my=0;if(playing)this.request();});
    this.resize();if(!isFocus)views.push(this);
  }
  resize(){const r=this.canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;this.dpr=Math.min(devicePixelRatio||1,innerWidth<=800?2:2.25,2300/Math.max(1,r.width,r.height));this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);this.canvas.dataset.ratio=this.dpr.toFixed(2);}
  stop(){cancelAnimationFrame(this.frame);this.frame=0;this.last=0;}
  request(){if(!this.frame&&!document.hidden&&(this.isFocus?focus.open:!modalOpen))this.frame=requestAnimationFrame(t=>this.draw(t));}
  sprite(c,img,x,y,w,h,angle=0,alpha=1){c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=alpha;c.drawImage(img,-w/2,-h/2,w,h);c.restore();}
  light(c,x,y,r,color,strength){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${color},${strength})`);g.addColorStop(.23,`rgba(${color},${strength*.32})`);g.addColorStop(1,`rgba(${color},0)`);c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
  draw(ms){
    this.frame=0;if(document.hidden||!this.visible||!this.w||!this.h)return;
    const move=this.isFocus?focus.playing:playing;
    if(move&&this.last&&ms-this.last<31){this.request();return;}
    const dt=(this.last?Math.min((ms-this.last)/1000,.12):.016)*(this.isFocus?focus.speed:1);this.last=ms;if(move)this.time+=dt;
    const t=this.time,c=this.ctx,w=this.w,h=this.h,cfg=config[this.type],img=art[this.type];
    if(!c||!img.complete||!img.naturalWidth)return;
    const clip=media[this.type],motionSource=clip?.ready?clip.video:img;
    this.canvas.dataset.media=clip?.ready?'video':'artwork';
    if(clip?.ready)this.canvas.dataset.videoTime=clip.video.currentTime.toFixed(2);
    if(this.fallback)this.fallback.style.visibility='hidden';
    this.canvas.parentElement.classList.add('cinematic-ready');
    this.px+=(this.mx-this.px)*.075;this.py+=(this.my-this.py)*.075;
    const px=this.isFocus?focus.rotationY:this.px,py=this.isFocus?focus.rotationX:this.py;
    const side=Math.min(w,h),scale=Math.min(w/img.naturalWidth,h/img.naturalHeight)*cfg.scale;
    const aw=img.naturalWidth*scale,ah=img.naturalHeight*scale;
    const cx=w*.5+Math.sin(t*.17)*side*.011+px*side*.022,cy=h*.49+Math.sin(t*.44)*side*.012+py*side*.013;
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,w,h);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
    this.energy+=( (this.isFocus?focus.pulse:expanded?.7:0)-this.energy)*.09;
    const breath=.08+.045*(Math.sin(t*1.35)+1)+this.energy*.14;
    c.globalCompositeOperation='screen';this.light(c,cx,cy,side*.42,'108,50,231',.12);this.light(c,cx+side*.21,cy-side*.13,side*.26,'72,240,209',.06);c.globalCompositeOperation='source-over';
    // Depth-sorted rocks live on their own paths, never baked into the main art.
    const rocks=[];
    for(let i=0;i<cfg.fragments;i++){
      const a=i*2.39996+.2,z=Math.sin(a+t*.1),radius=side*(.37+this.energy*.055),p=3.4/(3.4-z*.42);
      rocks.push({x:cx+Math.cos(a)*radius*p+Math.sin(t*.31+i)*side*.018,y:cy+Math.sin(a)*radius*.84+Math.cos(t*.39+i)*side*.018,z,s:side*(.08+(i%3)*.022)*p,a:i*1.91+Math.sin(t*.17+i)*.2});
    }
    const drawRock=r=>{if(art.rock.complete&&art.rock.naturalWidth)this.sprite(c,art.rock,r.x+px*r.z*10,r.y,r.s,r.s,r.a,r.z<0?.66:1);};
    rocks.filter(r=>r.z<0).forEach(drawRock);
    // Orbital paths project through depth; their rear halves sit behind the art.
    const rings=this.type==='hero'?2:1;
    const drawRings=front=>{
      for(let k=0;k<rings;k++){
        const tilt=[-.29,.3][k]+Math.sin(t*.11+k)*.025,rx=side*(this.type==='orb'?.47:.49),ry=rx*(k?.25:.22),a0=front?Math.PI:0;
        const point=a=>{const x=Math.cos(a)*rx,y=Math.sin(a)*ry;return[cx+x*Math.cos(tilt)-y*Math.sin(tilt),cy+x*Math.sin(tilt)+y*Math.cos(tilt)];};
        c.beginPath();for(let n=0;n<=80;n++){const p=point(a0+n/80*Math.PI);if(n)c.lineTo(...p);else c.moveTo(...p);}
        c.strokeStyle=k?'rgba(151,255,227,.43)':'rgba(185,137,255,.5)';c.lineWidth=.85;c.stroke();
        const a=(t*(k?.22:.18)+k*2.4)%(Math.PI*2);if((a>=Math.PI)===front){const p=point(a);this.light(c,p[0],p[1],10,k?'151,255,227':'185,137,255',.7);}
      }
    };
    drawRings(false);
    c.save();c.translate(cx,cy);c.transform(1,py*.007,px*.014,1,0,0);
    const angle=this.type==='orb'?Math.sin(t*.12)*.07:this.type==='portal'?Math.sin(t*.15)*.06:Math.sin(t*.14)*.016;
    c.rotate(angle);c.drawImage(motionSource,-aw/2,-ah/2,aw,ah);
    // Restrict live light to the sculpture silhouette on a tiny cached overlay.
    if(!this.mask){this.mask=document.createElement('canvas');this.mask.width=440;this.mask.height=Math.round(440*img.naturalHeight/img.naturalWidth);this.maskCtx=this.mask.getContext('2d');}
    const mc=this.maskCtx,mw=this.mask.width,mh=this.mask.height;mc.clearRect(0,0,mw,mh);mc.drawImage(motionSource,0,0,mw,mh);mc.globalCompositeOperation='source-in';
    const sweep=(Math.sin(t*.29)+1)*.5;const grad=mc.createLinearGradient(0,mh*sweep-mh*.22,mw,mh*sweep+mh*.08);grad.addColorStop(0,'rgba(119,255,218,0)');grad.addColorStop(.45,`rgba(151,255,232,${breath*.7})`);grad.addColorStop(.53,`rgba(178,131,255,${breath})`);grad.addColorStop(1,'rgba(144,93,245,0)');mc.fillStyle=grad;mc.fillRect(0,0,mw,mh);mc.globalCompositeOperation='source-over';
    c.globalCompositeOperation='screen';c.drawImage(this.mask,-aw/2,-ah/2,aw,ah);c.globalCompositeOperation='source-over';c.restore();
    drawRings(true);rocks.filter(r=>r.z>=0).forEach(drawRock);
    c.globalCompositeOperation='screen';this.light(c,cx,cy,side*.17,'152,70,255',breath*.38);
    for(let i=0;i<38;i++){const a=i*2.39996+t*.019;const x=cx+Math.cos(a)*side*(.34+(i%5)*.025),y=cy+Math.sin(a)*side*.44;const alpha=.15+(Math.sin(t*.9+i)+1)*.16;c.fillStyle=`rgba(${i%3?'183,255,235':'198,161,255'},${alpha})`;c.fillRect(x,y,i%7?1:2,i%7?1:2);}
    c.globalCompositeOperation='source-over';
    this.canvas.dataset.frame=String(Math.round(t*30));
    if(this.isFocus&&move)focus.pulse*=Math.exp(-dt*1.8);
    if(move)this.request();
  }
}
export function setMotion(value){playing=value;for(const view of views){view.stop();if(!value)view.mx=view.my=view.px=view.py=0;view.request();}syncMedia();}
export function setSpread(value){expanded=value;for(const view of views)view.request();}
export function openSculpture(canvas){focus.open=true;focus.playing=!reduced.matches;if(!focusView)focusView=new CinematicScene(canvas,'hero',true);focusView.resize();focusView.visible=true;focusView.request();syncMedia();return{renderer:'cinematic-layers',playing:focus.playing};}
export function closeSculpture(){focus.open=false;focusView?.stop();syncMedia();}
export function controlSculpture(values){Object.assign(focus,values);focusView?.stop();focusView?.request();syncMedia();}
export function resetSculpture(){Object.assign(focus,{rotationX:0,rotationY:0,speed:1,pulse:0});focusView?.request();syncMedia();}
export function initScenes(){
  for(const [id,type]of [['heroCanvas','hero'],['orbCanvas','orb'],['aboutCanvas','portal'],['researchCanvas','orb'],['experienceCanvas','spire']]){const canvas=document.getElementById(id);if(canvas)new CinematicScene(canvas,type);}
  document.querySelector('#disperseButton').hidden=false;document.querySelector('.scene-caption').textContent='OBSIDIAN / INTERACTIVE';
  document.addEventListener('portfolio:modal',e=>{modalOpen=e.detail.open;for(const view of views){view.stop();if(!modalOpen)view.request();}syncMedia();});
  document.addEventListener('visibilitychange',()=>{for(const view of views){view.stop();if(!document.hidden)view.request();}focusView?.stop();if(!document.hidden)focusView?.request();syncMedia();});
  reduced.addEventListener('change',()=>{setMotion(!reduced.matches);controlSculpture({playing:!reduced.matches});});
}
