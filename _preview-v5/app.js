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
const loadScenes = async () => {
  try { sceneModule = await import('./dist/scene.js?v=6.0'); sceneModule.initScenes(); sceneModule.setMotion(playing); sceneModule.setSpread(dispersed); }
  catch (e) { $('#disperseButton').hidden = true; $('.scene-caption').textContent = 'OBSIDIAN / VIOLET / MINT'; console.warn('Artwork fallback active.', e.message); }
};
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
const reveal = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); reveal.unobserve(e.target); } }), { threshold: .05 });
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

// Genuine 4D rotations, followed by perspective projection 4D -> 3D -> 2D.
const vertices = Array.from({ length: 16 }, (_, i) => [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
const edges = []; for (let i = 0; i < 16; i++) for (let j = i + 1; j < 16; j++) { const d = i ^ j; if ((d & (d - 1)) === 0) edges.push([i, j]); }
function project(t, rx, ry) {
  return vertices.map(vertex => {
    const p = [...vertex];
    for (const [a, b, angle] of [[0, 3, t * .4 + rx], [1, 2, t * .27 + ry], [2, 3, t * .18]]) { const x = p[a], y = p[b]; p[a] = x * Math.cos(angle) - y * Math.sin(angle); p[b] = x * Math.sin(angle) + y * Math.cos(angle); }
    const d4 = 3.4 / (3.4 - p[3]); const [x, y, z] = p.slice(0, 3).map(v => v * d4); const d3 = 7 / (7 - z);
    return [x * d3, y * d3, z];
  });
}
const modal = $('#dimensionModal'), canvas4 = $('#dimensionCanvas'), context4 = canvas4.getContext('2d');
let dimFrame = 0, dimTime = 0, dimLast = 0, dimPlaying = !reduced.matches, rotX = .3, rotY = .15, dragging = false, lastX = 0, lastY = 0;
function dimDraw(ms) {
  dimFrame = 0; if (!modal.open || document.hidden) return;
  if (dimLast && dimPlaying) dimTime += Math.min(ms - dimLast, 80) * .001 * Number($('#speedRange').value); dimLast = ms;
  const w = canvas4.clientWidth, h = canvas4.clientHeight, d = Math.min(devicePixelRatio || 1, 1.7);
  if (canvas4.width !== Math.round(w * d) || canvas4.height !== Math.round(h * d)) { canvas4.width = Math.round(w * d); canvas4.height = Math.round(h * d); }
  const ctx = context4; ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);
  const points = project(dimTime, rotX, rotY), scale = Math.min(w, h) * .15;
  for (let i = 0; i < edges.length; i++) { const [a, b] = edges[i], u = points[a], v = points[b]; ctx.strokeStyle = i % 3 ? '#83ffe0' : '#b178ff'; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(w / 2 + u[0] * scale, h / 2 + u[1] * scale); ctx.lineTo(w / 2 + v[0] * scale, h / 2 + v[1] * scale); ctx.stroke(); }
  ctx.shadowBlur = 0;
  points.forEach(([x, y]) => { ctx.fillStyle = '#e0fff6'; ctx.beginPath(); ctx.arc(w / 2 + x * scale, h / 2 + y * scale, 2.5, 0, Math.PI * 2); ctx.fill(); });
  if (dimPlaying) dimFrame = requestAnimationFrame(dimDraw);
}
function requestDim() { if (!dimFrame && modal.open) dimFrame = requestAnimationFrame(dimDraw); }
function updateDimPause() { $('#dimensionPause').setAttribute('aria-pressed', String(!dimPlaying)); $('#dimensionPause').textContent = dimPlaying ? 'PAUSE Ⅱ' : 'PLAY ▷'; requestDim(); }
$('#dimensionButton').addEventListener('click', () => {
  modalWasPlaying = playing; playing = false; updateMotion(); modal.showModal(); dimLast = 0; updateDimPause(); $('#dimensionClose').focus();
  document.dispatchEvent(new CustomEvent('portfolio:modal', { detail: { open: true } }));
});
$('#dimensionClose').addEventListener('click', () => modal.close());
modal.addEventListener('close', () => { cancelAnimationFrame(dimFrame); dimFrame = 0; playing = modalWasPlaying; updateMotion(); document.dispatchEvent(new CustomEvent('portfolio:modal', { detail: { open: false } })); $('#dimensionButton').focus(); });
modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
$('#dimensionPause').addEventListener('click', () => { dimPlaying = !dimPlaying; updateDimPause(); });
$('#speedRange').addEventListener('input', e => { $('#speedValue').textContent = `${Number(e.target.value).toFixed(1)}×`; requestDim(); });
$('#dimensionReset').addEventListener('click', () => { rotX = .3; rotY = .15; dimTime = 0; $('#speedRange').value = '1'; $('#speedValue').textContent = '1.0×'; requestDim(); });
canvas4.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas4.setPointerCapture(e.pointerId); });
canvas4.addEventListener('pointermove', e => { if (!dragging) return; rotX += (e.clientX - lastX) * .007; rotY += (e.clientY - lastY) * .007; lastX = e.clientX; lastY = e.clientY; requestDim(); });
canvas4.addEventListener('pointerup', () => dragging = false); canvas4.addEventListener('pointercancel', () => dragging = false);
new ResizeObserver(requestDim).observe(canvas4);
addEventListener('visibilitychange', () => { if (!document.hidden) { dimLast = 0; requestDim(); } });
setStage(0); updateMotion();
document.documentElement.dataset.ready = 'true';
