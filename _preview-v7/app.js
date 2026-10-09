const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let playing = !reduced.matches;
let sceneModule;
let modalWasPlaying = false;
let dispersed = false;
const motionButton = $('#motionButton');

function updateMotion() {
  document.body.classList.toggle('motion-paused', !playing);
  motionButton.setAttribute('aria-pressed', String(!playing));
  motionButton.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
  $('#motionText').textContent = playing ? 'PAUSE' : 'PLAY';
  $('#motionIcon').textContent = playing ? 'Ⅱ' : '▷';
  sceneModule?.setMotion(playing);
  startRadar();
  document.dispatchEvent(new CustomEvent('portfolio:motion', { detail: { playing } }));
}
motionButton.addEventListener('click', () => { playing = !playing; updateMotion(); });
reduced.addEventListener('change', () => { playing = !reduced.matches; updateMotion(); });
$('#disperseButton').addEventListener('click', e => {
  dispersed = !dispersed;
  const button = e.currentTarget;
  button.setAttribute('aria-pressed', String(dispersed));
  button.innerHTML = dispersed ? 'REASSEMBLE <span>↙</span>' : 'DISPERSE <span>↗</span>';
  sceneModule?.setSpread(dispersed);
});
// Keep the readable HTML and environment available before loading any 3D code.
let scenesPromise;
const loadScenes = () => scenesPromise ||= (async () => {
  try { sceneModule = await import('./dist/scene.js?v=7.0'); sceneModule.initScenes(); sceneModule.setMotion(playing); sceneModule.setSpread(dispersed); }
  catch (e) { $('#disperseButton').hidden = true; $('.scene-caption').textContent = 'OBSIDIAN / VIOLET / MINT'; console.warn('Artwork fallback active.', e.message); }
})();
if ('requestIdleCallback' in window) requestIdleCallback(loadScenes, { timeout: 600 }); else setTimeout(loadScenes, 60);

$('#year').textContent = new Date().getFullYear();
const menu = $('#mobileNav');
const menuButton = $('#menuToggle');
function closeMenu() { menu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open navigation'); }
menuButton.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); });
$$('.mobile-nav a').forEach(a => a.addEventListener('click', closeMenu));
addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { closeMenu(); menuButton.focus(); } });
const portrait = $('.portrait-image');
portrait.addEventListener('error', () => portrait.classList.add('is-unavailable'));
if (portrait.complete && !portrait.naturalWidth) portrait.classList.add('is-unavailable');

let scrollFrame = 0;
addEventListener('scroll', () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => { const range = document.documentElement.scrollHeight - innerHeight; $('#scrollLine').style.width = `${range > 0 ? scrollY / range * 100 : 0}%`; scrollFrame = 0; });
}, { passive: true });
const reveal = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); reveal.unobserve(e.target); } }), { threshold: .05, rootMargin: '80px' });
$$('.reveal').forEach(el => reveal.observe(el));

const states = [
  { mode: 'CAPTURE', metrics: ['INGEST', 'READY', 'FLOW'], kicker: 'PASSIVE TRAFFIC ANALYSIS', title: 'Every packet<br>has a story.', description: 'Passive traffic capture with Scapy / PyShark, network flow reconstruction and feature extraction to turn raw packets into useful security telemetry.', tags: ['PYTHON', 'SCAPY', 'PYSHARK'] },
  { mode: 'DETECT', metrics: ['FEATURES', 'SCORING', 'ANOMALY'], kicker: 'ML-ASSISTED DETECTION', title: 'Patterns beyond<br>signatures.', description: 'Isolation Forest, LightGBM, Random Forest and XGBoost are explored for attack classification and anomaly analysis using benchmark network security datasets.', tags: ['ISOLATION FOREST', 'LIGHTGBM', 'XGBOOST'] },
  { mode: 'ENRICH', metrics: ['IOC', 'CONTEXT', 'TRIAGE'], kicker: 'THREAT INTELLIGENCE CONTEXT', title: 'An alert needs<br>context.', description: 'Indicators can be enriched with reputation and exposure intelligence from VirusTotal, AlienVault OTX, AbuseIPDB and Shodan.', tags: ['VIRUSTOTAL', 'OTX', 'ABUSEIPDB'] },
  { mode: 'RESPOND', metrics: ['POLICY', 'REVIEW', 'ACTION'], kicker: 'RESPONSE ENGINEERING ROADMAP', title: 'From signal<br>to decision.', description: 'EyeGuard explores policy-driven incident response through connector-based workflows. These are architectural concepts, not claims of live automated production containment.', tags: ['RESPONSE POLICY', 'INTEGRATIONS', 'RESEARCH'] }
];
let stageIndex = 0;
function setStage(i) {
  stageIndex = i; const s = states[i];
  $('#socModeText').textContent = s.mode;
  ['#metricOne', '#metricTwo', '#metricThree'].forEach((id, j) => $(id).textContent = s.metrics[j]);
  $('#researchKicker').textContent = s.kicker; $('#researchTitle').innerHTML = s.title; $('#researchDescription').textContent = s.description;
  $('#researchTags').replaceChildren(...s.tags.map(t => { const el = document.createElement('span'); el.textContent = t; return el; }));
  $$('.soc-switch,.stage').forEach(button => { const selected = Number(button.dataset.index) === i; button.classList.toggle('active', selected); button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; });
  startRadar();
  document.dispatchEvent(new CustomEvent('portfolio:stage', { detail: { index: i } }));
}
$$('[role="tablist"]').forEach((list, group) => {
  const tabs = $$('[role="tab"]', list);
  tabs.forEach((button, i) => {
    button.id = `workflow-${group}-${i}`; button.setAttribute('aria-controls', 'researchDetail');
    button.addEventListener('click', () => setStage(i));
    button.addEventListener('keydown', e => {
      let target;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') target = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') target = (i + tabs.length - 1) % tabs.length;
      if (e.key === 'Home') target = 0;
      if (e.key === 'End') target = tabs.length - 1;
      if (target !== undefined) { e.preventDefault(); setStage(target); tabs[target].focus(); }
    });
  });
});
$('#researchDetail').setAttribute('aria-live', 'polite');

// An illustrative globe, drawn from points in 3D and projected to canvas.
const radarCanvas = $('#networkVisual');
const radarContext = radarCanvas.getContext('2d');
let radarVisible = false, radarFrame = 0, radarTime = 0, radarLast = 0;
const nodes = Array.from({ length: 105 }, (_, i) => { const y = 1 - (i / 104) * 2; const radius = Math.sqrt(1 - y * y), a = i * 2.39996; return [Math.cos(a) * radius, y, Math.sin(a) * radius]; });
function startRadar() { if (!radarFrame && radarVisible && !document.hidden) radarFrame = requestAnimationFrame(drawRadar); }
function drawRadar(ms) {
  radarFrame = 0; if (!radarVisible || document.hidden || !radarContext) return;
  const dt = radarLast ? Math.min(ms - radarLast, 100) : 16; radarLast = ms;
  if (playing) radarTime += dt * .00012;
  const d = Math.min(devicePixelRatio || 1, 1.5), w = radarCanvas.clientWidth, h = radarCanvas.clientHeight;
  if (radarCanvas.width !== Math.round(w * d) || radarCanvas.height !== Math.round(h * d)) { radarCanvas.width = Math.round(w * d); radarCanvas.height = Math.round(h * d); }
  const ctx = radarContext; ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);
  const cx = w * .51, cy = h * .53, r = h * .43;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.3); glow.addColorStop(0, 'rgba(74,33,139,.35)'); glow.addColorStop(.8, 'rgba(73,231,208,.055)'); glow.addColorStop(1, 'transparent'); ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(134,214,223,.12)'; ctx.lineWidth = .6;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(cx, cy, r * Math.cos(i * .38), r, 0, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(cx, cy + i * r * .29, Math.sqrt(r * r - (i * r * .29) ** 2), r * .15, 0, 0, Math.PI * 2); ctx.stroke(); }
  const points = nodes.map(([x, y, z], i) => { const x1 = x * Math.cos(radarTime) - z * Math.sin(radarTime), z1 = x * Math.sin(radarTime) + z * Math.cos(radarTime); return { x: cx + x1 * r, y: cy + y * r, z: z1, i }; });
  for (const p of points) {
    if (p.z < -.15) continue;
    const active = (p.i + stageIndex) % 9 === 0;
    ctx.fillStyle = active ? '#b27dff' : `rgba(129,255,225,${.25 + p.z * .65})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, active ? 2.1 : 1, 0, Math.PI * 2); ctx.fill();
    if (active) {
      const target = points[(p.i + 18) % points.length]; if (target.z < -.15) continue;
      ctx.strokeStyle = p.i % 2 ? 'rgba(141,84,238,.6)' : 'rgba(121,255,218,.4)'; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(cx, cy - r * 1.05, target.x, target.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(143,96,255,.15)'; ctx.beginPath(); ctx.arc(p.x, p.y, 5 + Math.sin(radarTime * 9 + p.i) * 2, 0, Math.PI * 2); ctx.stroke();
    }
  }
  if (playing) radarFrame = requestAnimationFrame(drawRadar);
}
new IntersectionObserver(([e]) => { radarVisible = e.isIntersecting; if (radarVisible) startRadar(); else { cancelAnimationFrame(radarFrame); radarFrame = 0; radarLast = 0; } }).observe(radarCanvas);
addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(radarFrame); radarFrame = 0; radarLast = 0; } else startRadar(); });

// The same solid sculpture, isolated from the background site's motion state.
const modal = $('#dimensionModal'), sculptureStage = $('#sculptureStage');
let sculpturePlaying = !reduced.matches, sculptureRotation = { x: 0, y: 0 }, sculptureDrag;
function syncSculptureControl() {
  $('#dimensionPause').setAttribute('aria-pressed', String(!sculpturePlaying));
  $('#dimensionPause').textContent = sculpturePlaying ? 'PAUSE Ⅱ' : 'PLAY ▷';
  $('#sculpturePulse').disabled = !sculpturePlaying;
  sceneModule?.controlSculpture({ playing: sculpturePlaying });
}
$('#dimensionButton').addEventListener('click', async () => {
  modalWasPlaying = playing; playing = false; updateMotion(); modal.showModal();
  document.dispatchEvent(new CustomEvent('portfolio:modal', { detail: { open: true } }));
  $('#dimensionClose').focus(); sculptureStage.setAttribute('aria-busy','true');
  await loadScenes();
  if (!modal.open) return;
  if (sceneModule) {
    const state = sceneModule.openSculpture($('#dimensionCanvas'));
    sculpturePlaying = state.playing;
    $('#sculptureHint').textContent = state.renderer === 'webgl' ? 'DRAG TO ROTATE · ARROW KEYS TO EXPLORE' : 'DRAG TO SHIFT PERSPECTIVE · ARROW KEYS TO EXPLORE';
    syncSculptureControl();
  } else { $('#sculptureHint').textContent = 'OBSIDIAN / VIOLET / MINT'; }
  sculptureStage.removeAttribute('aria-busy');
});
$('#dimensionClose').addEventListener('click', () => modal.close());
modal.addEventListener('close', () => {
  sceneModule?.closeSculpture(); sculptureDrag = null;
  document.dispatchEvent(new CustomEvent('portfolio:modal', { detail: { open: false } }));
  playing = modalWasPlaying; updateMotion(); $('#dimensionButton').focus();
});
modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
$('#dimensionPause').addEventListener('click', () => { sculpturePlaying = !sculpturePlaying; syncSculptureControl(); });
$('#speedRange').addEventListener('input', e => {
  const speed = Number(e.target.value); $('#speedValue').textContent = `${speed.toFixed(1)}×`; sceneModule?.controlSculpture({ speed });
});
$('#dimensionReset').addEventListener('click', () => {
  sculptureRotation = { x: 0, y: 0 }; $('#speedRange').value = '1'; $('#speedValue').textContent = '1.0×'; sceneModule?.resetSculpture();
});
$('#sculpturePulse').addEventListener('click', () => { if (sculpturePlaying) sceneModule?.controlSculpture({ pulse: 1 }); });
function moveSculpture(dx,dy) {
  sculptureRotation.x = Math.max(-.9,Math.min(.9,sculptureRotation.x + dy));
  const is3D = $('#dimensionCanvas').dataset.state === 'webgl';
  sculptureRotation.y = is3D ? sculptureRotation.y + dx : Math.max(-1.4,Math.min(1.4,sculptureRotation.y + dx));
  sceneModule?.controlSculpture({ rotationX: sculptureRotation.x, rotationY: sculptureRotation.y });
}
sculptureStage.addEventListener('pointerdown', e => { sculptureDrag = { x: e.clientX, y: e.clientY }; sculptureStage.setPointerCapture(e.pointerId); });
sculptureStage.addEventListener('pointermove', e => {
  if (!sculptureDrag) return;
  moveSculpture((e.clientX-sculptureDrag.x)*.006,(e.clientY-sculptureDrag.y)*.004);
  sculptureDrag = { x: e.clientX, y: e.clientY };
});
sculptureStage.addEventListener('pointerup', () => { sculptureDrag = null; });
sculptureStage.addEventListener('pointercancel', () => { sculptureDrag = null; });
sculptureStage.addEventListener('keydown', e => {
  const direction = { ArrowLeft: [-.12,0], ArrowRight: [.12,0], ArrowUp: [0,-.08], ArrowDown: [0,.08] }[e.key];
  if (direction) { e.preventDefault(); moveSculpture(...direction); }
});
reduced.addEventListener('change', () => { sculpturePlaying = !reduced.matches; syncSculptureControl(); });
setStage(0); updateMotion();
document.documentElement.dataset.ready = 'true';
