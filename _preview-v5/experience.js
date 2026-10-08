// Cinematic enhancements keep navigation native and all content readable without JS.
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let motion = !document.body.classList.contains('motion-paused');
const motionButton = $('#motionButton');
const globalMotion = $('#globalMotion');
const chapters = [
  ['home', 'INTRODUCTION'], ['work', 'EYEGUARD'], ['credentials', 'CREDENTIALS'],
  ['about', 'THE APPROACH'], ['research', 'UNDER THE SIGNAL'], ['experience', 'EXPERIENCE'],
  ['cv', 'THE DOSSIER'], ['contact', 'OPEN CHANNEL']
].map(([id, name]) => ({ element: document.getElementById(id), id, name }));
let activeChapter = -1, scrollFrame = 0, crossingTimer = 0;
function updateChapters() {
  scrollFrame = 0;
  let current = 0;
  for (let i = 0; i < chapters.length; i++) {
    const el = chapters[i].element, r = el.getBoundingClientRect();
    if (r.top < innerHeight * .38) current = i;
    if (r.bottom > 0 && r.top < innerHeight) {
      const progress = Math.max(0, Math.min(1, (innerHeight - r.top) / (innerHeight + r.height)));
      el.style.setProperty('--chapter-progress', motion && !reduced.matches ? progress.toFixed(3) : '0');
      if (i === 0) el.style.setProperty('--hero-lift', motion && !reduced.matches ? `${Math.min(23, Math.max(0, -r.top * .04))}px` : '0px');
    }
  }
  if (current === activeChapter) return;
  activeChapter = current;
  $('#chapterNumber').textContent = String(current + 1).padStart(2, '0');
  $('#chapterName').textContent = chapters[current].name;
  const next = chapters[(current + 1) % chapters.length];
  $('#nextChapter').href = `#${next.id}`;
  $('#nextChapter').setAttribute('aria-label', `Continue to ${next.name.toLowerCase()}`);
  $$('.desktop-nav a,.mobile-nav a').forEach(a => {
    const selected = a.hash === `#${chapters[current].id}`;
    a.classList.toggle('is-active', selected);
    if (selected) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
  });
  document.body.dataset.chapter = chapters[current].id;
}
function requestChapterUpdate() { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateChapters); }
addEventListener('scroll', requestChapterUpdate, { passive: true });
addEventListener('resize', requestChapterUpdate, { passive: true });
$$('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
  if (!motion || reduced.matches || link.classList.contains('skip')) return;
  const wipe = $('.chapter-wipe');
  wipe.classList.remove('is-crossing');
  requestAnimationFrame(() => wipe.classList.add('is-crossing'));
  clearTimeout(crossingTimer); crossingTimer = setTimeout(() => wipe.classList.remove('is-crossing'), 900);
}));
$$('.story-grid,.credential-grid,.cv-grid').forEach(grid => [...grid.children].forEach((card, i) => card.style.setProperty('--reveal-delay', `${Math.min(i * 65, 195)}ms`)));

// A small reflective response to a mouse; touch scrolling is never intercepted.
$$('[data-tilt]').forEach(card => {
  let pending = 0, last;
  card.addEventListener('pointermove', e => {
    if (!motion || reduced.matches || e.pointerType !== 'mouse') return;
    last = { x: e.clientX, y: e.clientY };
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0; const r = card.getBoundingClientRect();
      const x = (last.x - r.left) / r.width, y = (last.y - r.top) / r.height;
      card.style.setProperty('--rx', `${(0.5 - y) * 5}deg`);
      card.style.setProperty('--ry', `${(x - .5) * 6}deg`);
      card.style.setProperty('--hx', `${x * 100}%`); card.style.setProperty('--hy', `${y * 100}%`);
    });
  }, { passive: true });
  card.addEventListener('pointerleave', () => { cancelAnimationFrame(pending); pending = 0; card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
});
document.addEventListener('portfolio:stage', e => {
  const detail = $('#researchDetail'); detail.classList.remove('is-changing');
  if (motion && !reduced.matches) requestAnimationFrame(() => detail.classList.add('is-changing'));
  $('.research-orbit').dataset.stage = e.detail.index;
});

// Actual official badge / issuer graphics, with clearly separated personal achievements.
const credentials = {
  ejpt: { title: 'eJPT', issuer: 'INE SECURITY / EARNED', description: 'Junior Penetration Tester. A practical certification covering assessment methodology, host and network auditing, host and network penetration testing, and web application security.', tags: ['PRACTICAL ASSESSMENT', 'PENETRATION TESTING'], href: 'https://ine.com/security/certifications/ejpt-certification', link: 'ABOUT THE CERTIFICATION ↗' },
  hcia: { title: 'HCIA-Security', issuer: 'HUAWEI / EARNED', description: 'Huawei Certified ICT Associate in Security. A foundation in network and information security, security technologies and protection of enterprise networks.', tags: ['NETWORK SECURITY', 'ICT ASSOCIATE'], href: 'https://e.huawei.com/en/talent/cert/', link: 'HUAWEI CERTIFICATIONS ↗' },
  degree: { title: 'Software Engineering', issuer: 'ASSIUT NATIONAL UNIVERSITY / 2026', description: 'Bachelor’s degree in Software Engineering, Faculty of Computers and Artificial Intelligence. Final grade: Very Good. Graduation project: EyeGuard — Excellent.', tags: ['BACHELOR OF SCIENCE', 'EYEGUARD'], href: 'cv/Wael_El-Dabah_Academic_CV.pdf', link: 'VIEW ACADEMIC CV ↗' },
  depi: { title: 'Ideas with impact.', issuer: 'DIGITOPIA / DEPI', description: 'EyeGuard achieved fourth place nationwide in Digitopia. Recognized as Best Team Leader in the Digital Egypt Pioneers Initiative.', tags: ['4TH NATIONWIDE', 'BEST TEAM LEADER'], href: 'https://depi.gov.eg/', link: 'ABOUT DEPI ↗' }
};
const credentialModal = $('#credentialModal');
let credentialTrigger, credentialWasPlaying = false;
$$('[data-credential]').forEach(button => button.addEventListener('click', () => {
  const record = credentials[button.dataset.credential]; credentialTrigger = button;
  $('#credentialArt').replaceChildren(button.closest('article').querySelector('.credential-visual').cloneNode(true));
  $('#credentialIssuer').textContent = record.issuer; $('#credentialTitle').textContent = record.title; $('#credentialDescription').textContent = record.description;
  $('#credentialTags').replaceChildren(...record.tags.map(text => { const span = document.createElement('span'); span.textContent = text; return span; }));
  $('#credentialLink').href = record.href; $('#credentialLink').textContent = record.link;
  credentialWasPlaying = !document.body.classList.contains('motion-paused');
  if (credentialWasPlaying) motionButton.click();
  credentialModal.showModal(); $('#credentialClose').focus();
  document.dispatchEvent(new CustomEvent('portfolio:modal', { detail: { open: true } }));
}));
$('#credentialClose').addEventListener('click', () => credentialModal.close());
credentialModal.addEventListener('click', e => { if (e.target === credentialModal) credentialModal.close(); });
credentialModal.addEventListener('close', () => {
  document.dispatchEvent(new CustomEvent('portfolio:modal', { detail: { open: false } }));
  if (credentialWasPlaying && document.body.classList.contains('motion-paused')) motionButton.click();
  credentialTrigger?.focus();
});

// A low-resolution atmosphere: projected geometric fragments, dust, and signal paths.
// It sits behind the HTML; it never captures pointer or keyboard input.
const canvas = $('#atmosphereCanvas'), ctx = canvas.getContext('2d');
let frame = 0, lastTime = 0, time = 0, width = 1, height = 1, ratio = 1;
const particles = Array.from({ length: 52 }, (_, i) => ({ x: ((i * .61803398875) % 1), y: ((i * .41421356237) % 1), depth: .3 + (i % 7) / 10, phase: i * 2.39996 }));
function resizeAtmosphere() {
  width = innerWidth; height = innerHeight; ratio = Math.min(devicePixelRatio || 1, 1.2);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  requestAmbient(); requestChapterUpdate();
}
function stopAmbient() { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
function requestAmbient() { if (ctx && !frame && !document.hidden) frame = requestAnimationFrame(drawAtmosphere); }
function drawAtmosphere(ms) {
  frame = 0; if (document.hidden || !ctx) return;
  if (motion && lastTime && ms - lastTime < 32) { requestAmbient(); return; }
  const dt = lastTime ? Math.min(ms - lastTime, 80) : 16; lastTime = ms;
  if (motion) time += dt * .001;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
  const t = time, offset = scrollY * .035;
  for (const p of particles) {
    const x = p.x * width + Math.sin(t * .12 + p.phase) * 18;
    const y = ((p.y * height + t * 3 * p.depth - offset) % height + height) % height;
    const alpha = .18 + Math.sin(t * .7 + p.phase) * .1;
    ctx.fillStyle = `rgba(${p.depth > .65 ? '178,142,255' : '148,235,216'},${alpha})`;
    ctx.fillRect(x, y, p.depth > .7 ? 1.6 : .8, p.depth > .7 ? 1.6 : .8);
  }
  for (let j = 0; j < 3; j++) {
    const cx = width * [.91, .075, .73][j], cy = height * [.35, .76, .93][j] + Math.sin(t * .13 + j) * 22;
    const r = Math.min(width * .13, 135) * (1 - j * .12), a = t * .018 + j;
    const vertices = [[-1,-.62,.3],[.8,-.72,.6],[1,.55,-.4],[-.65,.9,-.2],[.04,.05,1.35]];
    const points = vertices.map(([x,y,z]) => { const X=x*Math.cos(a)-z*Math.sin(a), Z=x*Math.sin(a)+z*Math.cos(a), d=3/(3-Z); return [cx+X*r*d,cy+y*r*d]; });
    ctx.strokeStyle = j % 2 ? 'rgba(112,226,198,.13)' : 'rgba(151,117,214,.14)'; ctx.lineWidth = .65;
    for (const [u,v] of [[0,1],[1,2],[2,3],[3,0],[0,4],[1,4],[2,4],[3,4]]) { ctx.beginPath();ctx.moveTo(...points[u]);ctx.lineTo(...points[v]);ctx.stroke(); }
  }
  if (motion) requestAmbient();
}
function syncMotion() {
  motion = !document.body.classList.contains('motion-paused');
  globalMotion.textContent = motion ? 'Ⅱ' : '▷'; globalMotion.setAttribute('aria-pressed', String(!motion));
  globalMotion.setAttribute('aria-label', motion ? 'Pause site animation' : 'Play site animation');
  stopAmbient(); requestAmbient(); requestChapterUpdate();
}
globalMotion.addEventListener('click', () => motionButton.click());
document.addEventListener('portfolio:motion', syncMotion);
addEventListener('visibilitychange', () => { stopAmbient(); if (!document.hidden) requestAmbient(); });
addEventListener('resize', resizeAtmosphere, { passive: true });
reduced.addEventListener('change', syncMotion);
resizeAtmosphere(); syncMotion(); updateChapters();
