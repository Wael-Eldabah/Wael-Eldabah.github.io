// Renderer state/timing checks with simulated browser APIs; this is not browser visual QA.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
const result = await build({entryPoints:['src/cinematic.js'],bundle:true,format:'iife',globalName:'Cinematic',write:false,define:{'import.meta.url':'"https://portfolio.test/dist/cinematic.js"'}});
const noop=()=>{};
function setup(reduced=false) {
  const frames=new Map(), observers=[], videos=[], events=new Map();let next=0, now=1000;
  const ctx=new Proxy({}, {get:(_,key)=>key.startsWith('create')?()=>({addColorStop:noop}):noop,set:()=>true});
  const makeCanvas=()=>({width:0,height:0,dataset:{},getContext:()=>ctx,setAttribute:noop,getBoundingClientRect:()=>({width:390,height:400}),parentElement:{querySelector:()=>({style:{}}),classList:{add:noop},addEventListener:noop}});
  const canvases=Object.fromEntries(['heroCanvas','orbCanvas','aboutCanvas','researchCanvas','experienceCanvas'].map(id=>[id,makeCanvas()]));
  const document={hidden:false,getElementById:id=>canvases[id],querySelector:()=>({}),addEventListener:(name,fn)=>events.set(name,fn),createElement(type){
    if(type==='canvas')return makeCanvas();
    const v={setAttribute:noop,addEventListener:noop,paused:true,pause(){this.paused=true;},canPlayType:()=>''};videos.push(v);return v;
  }};
  const context=vm.createContext({document,URL,console,navigator:{},devicePixelRatio:2,innerWidth:390,
    Image:class{complete=true;naturalWidth=1254;naturalHeight=1254;},
    matchMedia:q=>({matches:q.includes('reduced-motion')?reduced:false,addEventListener:noop}),
    ResizeObserver:class{observe(){}},IntersectionObserver:class{constructor(fn){this.fn=fn;}observe(target){observers.push({target,fn:this.fn});}},
    requestAnimationFrame:fn=>{frames.set(++next,fn);return next;},cancelAnimationFrame:id=>frames.delete(id)
  });
  vm.runInContext(result.outputFiles[0].text,context);const api=context.Cinematic;api.initScenes();observers.forEach(({fn})=>fn([{isIntersecting:true}]));
  const tick=(ms=50)=>{now+=ms;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(now));};
  const advance=()=>{for(let i=0;i<10;i++)tick();};
  return{api,canvases,videos,document,events,frames,tick,advance,makeCanvas};
}
const s=setup();s.tick();
const start=Number(s.canvases.heroCanvas.dataset.frame), globeStart=Number(s.canvases.orbCanvas.dataset.frame);s.advance();
assert.equal(Number(s.canvases.heroCanvas.dataset.frame)-start,30,'2× must advance one scene second in 500 ms');
assert.equal(Number(s.canvases.orbCanvas.dataset.frame)-globeStart,30,'Globe shares the accelerated scene clock');
assert(s.videos.every(v=>v.playbackRate===2));
s.api.setMotion(false);s.tick();const paused=s.canvases.orbCanvas.dataset.frame;s.advance();assert.equal(s.canvases.orbCanvas.dataset.frame,paused);assert.equal(s.frames.size,0);
// A workflow selection repaints the paused globe without restarting movement.
s.events.get('portfolio:stage')({detail:{index:2}});s.tick();assert.equal(s.canvases.orbCanvas.dataset.frame,paused);assert.equal(s.frames.size,0);
const focus=s.makeCanvas();s.api.openSculpture(focus);s.api.controlSculpture({speed:1});s.tick();const one=Number(focus.dataset.frame);s.advance();assert.equal(Number(focus.dataset.frame)-one,15);
s.api.resetSculpture();const reset=Number(focus.dataset.frame);s.advance();assert.equal(Number(focus.dataset.frame)-reset,30);assert(s.videos.every(v=>v.playbackRate===2));
s.api.controlSculpture({playing:false});s.tick();const focusPaused=focus.dataset.frame;s.advance();assert.equal(focus.dataset.frame,focusPaused);s.api.closeSculpture();
s.api.setMotion(true);s.tick();s.document.hidden=true;s.events.get('visibilitychange')();assert.equal(s.frames.size,0);
const r=setup(true);r.tick();r.advance();assert.equal(r.canvases.orbCanvas.dataset.frame,'0');assert.equal(r.frames.size,0);assert.equal(r.api.openSculpture(r.makeCanvas()).playing,false);
console.log('Passed: 2× scene clock and video rate, 1× override, 2× reset, global/focus pause, paused stage updates, hidden-page pause, reduced motion.');
