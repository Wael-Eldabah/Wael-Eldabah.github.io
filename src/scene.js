import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MINT = 0x8effe0, VIOLET = 0x8841ff;
const clamp = THREE.MathUtils.clamp;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pointer = { x: 0, y: 0 };
let paused = reduceMotion.matches;
let spread = false;
let modalOpen = false;
const scenes = [];

function random(seed) {
  let n = seed;
  return () => { n = Math.imul(n ^ n >>> 15, 1 | n); n ^= n + Math.imul(n ^ n >>> 7, 61 | n); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}
const rand = random(84721);
function hash(x, y, z) { const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return n - Math.floor(n); }
function noise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let u = x - ix, v = y - iy, w = z - iz;
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v); w = w * w * (3 - 2 * w);
  const lerp = THREE.MathUtils.lerp;
  return lerp(lerp(lerp(hash(ix, iy, iz), hash(ix + 1, iy, iz), u), lerp(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), u), v), lerp(lerp(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), u), lerp(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), u), v), w);
}
function fbm(x, y, z) { return noise(x, y, z) * .54 + noise(x * 2.03, y * 2.03, z * 2.03) * .27 + noise(x * 4.1, y * 4.1, z * 4.1) * .13 + noise(x * 8.3, y * 8.3, z * 8.3) * .06; }

function rockTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const n = fbm(x / 37, y / 37, 3.72);
    const vein = Math.pow(1 - Math.abs(noise(x / 17, y / 17, 5.1) * 2 - 1), 10);
    const v = clamp(22 + n * 160 + vein * 45 + hash(x, y, 0) * 23, 0, 255);
    const i = (y * 512 + x) * 4; img.data[i] = v * .86; img.data[i + 1] = v * .9; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d'); const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, '#fff'); g.addColorStop(.08, '#ffffffcc'); g.addColorStop(.24, '#ffffff36'); g.addColorStop(1, '#ffffff00');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
const sparkMap = glowTexture();
const bumpMap = rockTexture();
const emissive = (color, power = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), toneMapped: false });
function sparkle(group, color, size, position) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkMap, color, transparent: true, opacity: .85, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size); s.position.copy(position); group.add(s); return s;
}
function orbit(group, radius, color, tilt, flatten = .78, thickness = .004) {
  const points = [];
  for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; points.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius * flatten, 0)); }
  const curve = new THREE.CatmullRomCurve3(points, true);
  const ring = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, thickness, 4, true), emissive(color, 2));
  ring.rotation.set(tilt[0], tilt[1], tilt[2]); group.add(ring);
  const bead = sparkle(ring, color, .17, new THREE.Vector3());
  return { ring, bead, radius, flatten, phase: rand() * 6.28 };
}
function fracturedBox(seed) {
  const g = new THREE.BoxGeometry(.91, .91, .91, 14, 14, 14); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const n = fbm(v.x * 9 + seed, v.y * 9 + seed, v.z * 9 + seed) - .5;
    const edge = Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
    v.multiplyScalar(1 + n * .35 + noise(v.x * 28 + seed, v.y * 28, v.z * 28) * .06);
    v.x += Math.sin(v.y * 18 + seed) * .018 * edge;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}

// One render of the scene plus quarter-resolution separable bloom. The final
// alpha composite preserves the real HTML landscape behind the WebGL canvas.
class GlowPipeline {
  constructor(renderer) {
    this.renderer = renderer;
    const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
    this.base = new THREE.WebGLRenderTarget(2, 2, opts);
    this.a = new THREE.WebGLRenderTarget(2, 2, { ...opts, depthBuffer: false });
    this.b = this.a.clone();
    this.screen = new THREE.Scene(); this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.quad.frustumCulled = false; this.screen.add(this.quad);
    const vertexShader = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
    this.extract = new THREE.ShaderMaterial({ vertexShader, uniforms: { t: { value: this.base.texture } }, fragmentShader: 'uniform sampler2D t;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(.85,2.1,l),1.);}' });
    this.blur = new THREE.ShaderMaterial({ vertexShader, uniforms: { t: { value: null }, direction: { value: new THREE.Vector2() } }, fragmentShader: 'uniform sampler2D t;uniform vec2 direction;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb*.227027;c+=texture2D(t,vUv+direction*1.384615).rgb*.316216;c+=texture2D(t,vUv-direction*1.384615).rgb*.316216;c+=texture2D(t,vUv+direction*3.230769).rgb*.070270;c+=texture2D(t,vUv-direction*3.230769).rgb*.070270;gl_FragColor=vec4(c,1.);}' });
    this.combine = new THREE.ShaderMaterial({ vertexShader, transparent: false, toneMapped: true, uniforms: { base: { value: this.base.texture }, bloom: { value: this.a.texture } }, fragmentShader: 'uniform sampler2D base;uniform sampler2D bloom;varying vec2 vUv;void main(){vec4 c=texture2D(base,vUv);vec3 g=texture2D(bloom,vUv).rgb*.52;float a=clamp(c.a+max(g.r,max(g.g,g.b))*.7,0.,1.);gl_FragColor=vec4(c.rgb+g,a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\nif(a>.001)gl_FragColor.rgb/=a;}' });
  }
  resize(w, h) { this.base.setSize(w, h); this.a.setSize(Math.max(2, Math.round(w / 4)), Math.max(2, Math.round(h / 4))); this.b.setSize(this.a.width, this.a.height); }
  pass(material, target) { this.quad.material = material; this.renderer.setRenderTarget(target); this.renderer.render(this.screen, this.camera); }
  render(scene, camera) {
    this.renderer.setRenderTarget(this.base); this.renderer.clear(); this.renderer.render(scene, camera);
    this.pass(this.extract, this.a);
    this.blur.uniforms.t.value = this.a.texture; this.blur.uniforms.direction.value.set(1 / this.a.width, 0); this.pass(this.blur, this.b);
    this.blur.uniforms.t.value = this.b.texture; this.blur.uniforms.direction.value.set(0, 1 / this.a.height); this.pass(this.blur, this.a);
    this.pass(this.combine, null);
  }
}

class SceneView {
  constructor(canvas, type) {
    this.canvas = canvas; this.type = type; this.time = 0; this.visible = false; this.lost = false; this.frame = 0; this.prev = 0; this.frames = 0; this.sampleStart = 0; this.samples = 0; this.fps = 0;
    this.mobile = matchMedia('(max-width: 720px)').matches;
    this.pixelRatio = Math.min(devicePixelRatio || 1, this.mobile ? 1.2 : 1.5);
    const context = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!context) throw new Error('WebGL2 unavailable');
    this.renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0); this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15; this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.transmissionResolutionScale = .5;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(32, 1, .1, 70); this.camera.position.set(0, .05, type === 'hero' ? 12.8 : 9.3);
    const env = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer); this.environment = pmrem.fromScene(env, .045); this.scene.environment = this.environment.texture; env.dispose(); pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xe2efff, 0x1b133c, 1.9));
    const key = new THREE.DirectionalLight(0xeef5ff, 4.2); key.position.set(-3, 5, 4); this.scene.add(key);
    const rim = new THREE.DirectionalLight(MINT, 2.7); rim.position.set(4, .3, -2); this.scene.add(rim);
    const violet = new THREE.PointLight(VIOLET, 45, 10, 2); violet.position.set(.2, -.7, 1.6); this.scene.add(violet); this.light = violet;
    this.group = new THREE.Group(); this.scene.add(this.group); this.parts = []; this.orbits = []; this.gems = [];
    if (type === 'hero') this.buildHero(); else this.buildOrb();
    this.pipeline = new GlowPipeline(this.renderer); this.resize();
    this.resizeObserver = new ResizeObserver(() => { this.resize(); this.requestFrame(); }); this.resizeObserver.observe(canvas);
    this.observer = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; if (this.visible) this.requestFrame(); else this.stop(); }, { rootMargin: '60px', threshold: 0 }); this.observer.observe(canvas);
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; this.stop(); canvas.parentElement.classList.remove('scene-ready'); canvas.dataset.state = 'fallback'; });
    canvas.addEventListener('webglcontextrestored', () => { this.lost = false; canvas.parentElement.classList.add('scene-ready'); this.requestFrame(); });
    canvas.parentElement.classList.add('scene-ready'); canvas.dataset.state = 'webgl'; scenes.push(this);
  }
  buildHero() {
    const stone = new THREE.MeshStandardMaterial({ color: 0x565a63, map: bumpMap, bumpMap, bumpScale: .11, metalness: .48, roughness: .43, envMapIntensity: 1.2 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xa4eee6, metalness: .05, roughness: .075, transmission: .86, thickness: .45, ior: 1.55, envMapIntensity: 1.8, clearcoat: 1, clearcoatRoughness: .1, iridescence: .36 });
    const coreMat = new THREE.MeshPhysicalMaterial({ color: VIOLET, metalness: .28, roughness: .18, emissive: VIOLET, emissiveIntensity: 1.7, clearcoat: 1 });
    let id = 0;
    for (let y = -1.5; y <= 1.5; y++) for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) {
      id++; if ((x === 1 && y === 1.5 && z === 1) || (x === -1 && y === -1.5 && z === 1) || (x === 0 && y === 1.5 && z === -1)) continue;
      const isGlass = [3, 8, 12, 16, 25].includes(id);
      const part = new THREE.Group();
      const m = new THREE.Mesh(isGlass ? new THREE.BoxGeometry(.92, .92, .92) : fracturedBox(id * 8.3), isGlass ? glass : stone); part.add(m);
      const base = new THREE.Vector3(x * 1.045 + (rand() - .5) * .12, y * 1.055 + (rand() - .5) * .1, z * 1.045 + (rand() - .5) * .12); part.position.copy(base);
      part.rotation.set((rand() - .5) * .17, (rand() - .5) * .16, (rand() - .5) * .12);
      part.scale.set(.94 + rand() * .09, .91 + rand() * .16, .94 + rand() * .1);
      if (!isGlass) {
        const inner = new THREE.Mesh(new THREE.BoxGeometry(.74, .74, .74), coreMat); part.add(inner);
        const crackPoints = [];
        const crackX = (rand() - .5) * .46;
        for (let k = 0; k < 9; k++) {
          const v = new THREE.Vector3(crackX + Math.sin(k * 2.4 + id) * .035, k / 8 * .86 - .43, .455);
          const n = fbm(v.x * 9 + id * 8.3, v.y * 9 + id * 8.3, v.z * 9 + id * 8.3) - .5;
          v.multiplyScalar(1 + n * .35 + noise(v.x * 28 + id * 8.3, v.y * 28, v.z * 28) * .06);
          v.z += .005; crackPoints.push(v);
        }
        const crack = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(crackPoints), 18, .0045, 3, false), emissive(id % 6 ? VIOLET : MINT, 2.1)); part.add(crack);
      } else { const edge = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: MINT, transparent: true, opacity: .48 })); part.add(edge); }
      this.group.add(part); this.parts.push({ mesh: part, base, phase: rand() * 6.28, direction: base.clone().normalize(), glass: isGlass });
    }
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.26, 0), coreMat); this.group.add(core); this.core = core;
    this.coreMaterial = coreMat;
    for (let i = 0; i < 3; i++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.05, 4.45, .025), new THREE.MeshPhysicalMaterial({ color: MINT, metalness: .2, roughness: .11, transparent: true, opacity: .09, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }));
      panel.position.set((i - 1) * .76, (i - 1) * .16, -1.12 - i * .28); panel.rotation.y = i % 2 ? -.18 : .13;
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(panel.geometry), new THREE.LineBasicMaterial({ color: i === 1 ? 0xc4e5f4 : MINT, transparent: true, opacity: .38 })); panel.add(edge); this.group.add(panel);
    }
    for (let i = 0; i < 9; i++) {
      const geom = new THREE.IcosahedronGeometry(.12 + rand() * .13, 1); const pos = geom.attributes.position;
      for (let k = 0; k < pos.count; k++) { const v = new THREE.Vector3().fromBufferAttribute(pos, k); v.multiplyScalar(.7 + noise(v.x * 15 + i, v.y * 15, v.z * 15) * .65); pos.setXYZ(k, v.x, v.y, v.z); } geom.computeVertexNormals();
      const rock = new THREE.Mesh(geom, stone); const a = i * 2.39996; const base = new THREE.Vector3(Math.cos(a) * (2.2 + rand() * .3), Math.sin(a) * 1.8, Math.sin(a * 2) * .7); rock.position.copy(base); rock.rotation.set(rand() * 3, rand() * 3, rand() * 3); this.scene.add(rock); this.gems.push({ mesh: rock, base, phase: a });
      if (i % 3 === 0) sparkle(rock, VIOLET, .4, new THREE.Vector3(0, -.12, .06));
    }
    const rings = new THREE.Group(); this.scene.add(rings); this.ringGroup = rings;
    this.orbits.push(orbit(rings, 2.85, VIOLET, [1.19, -.12, -.37], .84));
    this.orbits.push(orbit(rings, 2.98, MINT, [1.32, .16, .27], .83, .003));
    this.orbits.push(orbit(rings, 2.68, 0xcad9ff, [1.36, -.15, -.12], .9, .002));
    this.group.rotation.set(.18, -.54, -.08);
    const particles = new Float32Array(85 * 3);
    for (let i = 0; i < particles.length; i += 3) { particles[i] = (rand() - .5) * 7.6; particles[i + 1] = (rand() - .5) * 5.8; particles[i + 2] = (rand() - .5) * 3.4; }
    const geom = new THREE.BufferGeometry(); geom.setAttribute('position', new THREE.BufferAttribute(particles, 3));
    this.dust = new THREE.Points(geom, new THREE.PointsMaterial({ color: MINT, size: .028, map: sparkMap, transparent: true, opacity: .66, blending: THREE.AdditiveBlending, depthWrite: false })); this.scene.add(this.dust);
    sparkle(this.group, VIOLET, 1.5, new THREE.Vector3(.15, -.15, 1.51));
    sparkle(this.group, MINT, .6, new THREE.Vector3(-1.3, 1.1, 1.12));
    this.explosion = 0;
  }
  buildOrb() {
    const shell = new THREE.MeshPhysicalMaterial({ color: 0xa4ede5, roughness: .075, metalness: .1, transmission: .9, thickness: .8, ior: 1.8, iridescence: .7, iridescenceIOR: 1.45, clearcoat: 1, envMapIntensity: 2.1, side: THREE.DoubleSide });
    const geometry = new THREE.IcosahedronGeometry(1.2, 1);
    this.crystal = new THREE.Mesh(geometry, shell); this.group.add(this.crystal);
    this.group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 1), new THREE.LineBasicMaterial({ color: 0xc7fff2, transparent: true, opacity: .42 })));
    const core = new THREE.Group(); this.group.add(core); this.core = core;
    core.add(new THREE.Mesh(new THREE.SphereGeometry(.59, 36, 24), new THREE.MeshStandardMaterial({ color: 0x080a18, metalness: .92, roughness: .2, envMapIntensity: 2.2 })));
    const iris = new THREE.Mesh(new THREE.TorusGeometry(.34, .042, 12, 64), emissive(VIOLET, 3.2)); iris.position.z = .54; core.add(iris);
    const iris2 = new THREE.Mesh(new THREE.TorusGeometry(.46, .008, 6, 64), emissive(0xa780ff, 2)); iris2.position.z = .43; core.add(iris2);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(.16, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0x03030c, clearcoat: 1, metalness: .8, roughness: .07 })); lens.position.z = .6; core.add(lens);
    sparkle(core, VIOLET, 1.1, new THREE.Vector3(0, 0, .7));
    this.orbits.push(orbit(this.scene, 1.95, MINT, [1.04, .05, -.32], .84, .005));
    this.orbits.push(orbit(this.scene, 2.1, VIOLET, [1.35, -.04, .38], .82, .004));
    this.orbits.push(orbit(this.scene, 1.78, 0xc9e6ff, [.63, .24, -.45], .82, .003));
    for (let i = 0; i < 17; i++) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(.16 + rand() * .13), new THREE.MeshPhysicalMaterial({ color: i % 3 ? MINT : VIOLET, metalness: .65, roughness: .13, clearcoat: 1, envMapIntensity: 1.8 }));
      const phi = Math.acos(1 - 2 * (i + .5) / 17), a = i * 2.39996; const base = new THREE.Vector3(Math.cos(a) * Math.sin(phi), Math.cos(phi), Math.sin(a) * Math.sin(phi)).multiplyScalar(1.23);
      shard.position.copy(base); shard.rotation.set(a, phi, a); this.group.add(shard); this.gems.push({ mesh: shard, base, phase: a });
    }
  }
  resize() {
    const r = this.canvas.getBoundingClientRect(); this.width = Math.max(1, r.width); this.height = Math.max(1, r.height);
    this.renderer.setPixelRatio(this.pixelRatio); this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.position.z = this.type === 'hero' ? Math.max(11.6, 6.7 / this.camera.aspect) : Math.max(8.1, 8.4 / this.camera.aspect);
    this.camera.updateProjectionMatrix(); this.pipeline?.resize(Math.round(this.width * this.pixelRatio), Math.round(this.height * this.pixelRatio));
  }
  stop() { cancelAnimationFrame(this.frame); this.frame = 0; this.prev = 0; this.sampleStart = 0; this.frames = 0; }
  requestFrame() { if (!this.frame && !this.lost && !modalOpen && !document.hidden) this.frame = requestAnimationFrame(t => this.draw(t)); }
  draw(ms) {
    this.frame = 0; if (this.lost || document.hidden || !this.visible) return;
    const dt = this.prev ? Math.min((ms - this.prev) / 1000, .08) : .016; this.prev = ms;
    if (!paused) this.time += dt;
    const t = this.time;
    if (this.type === 'hero') {
      this.explosion = reduceMotion.matches ? (spread ? 1 : 0) : THREE.MathUtils.lerp(this.explosion, spread ? 1 : 0, 1 - Math.exp(-dt * 3));
      this.group.rotation.y = -.54 + Math.sin(t * .2) * .13 + pointer.x * .16;
      this.group.rotation.x = .18 + Math.cos(t * .21) * .035 + pointer.y * .1;
      this.group.rotation.z = -.075 + Math.sin(t * .18) * .025;
      this.group.position.y = .14 + Math.sin(t * .65) * .09;
      for (const p of this.parts) { p.mesh.position.copy(p.base).addScaledVector(p.direction, this.explosion * .9 + Math.sin(t * .7 + p.phase) * .013); }
      this.core.rotation.y = t * .16; this.ringGroup.rotation.y = Math.sin(t * .13) * .1;
      this.coreMaterial.emissiveIntensity = 1.55 + Math.sin(t * 1.15) * .24;
      this.dust.rotation.y = t * .015;
    } else {
      this.group.rotation.y = Math.sin(t * .22) * .22 + pointer.x * .06; this.group.rotation.z = Math.sin(t * .18) * .07; this.group.position.y = Math.sin(t * .8) * .055;
      this.crystal.rotation.y = t * .11; this.crystal.rotation.x = t * .04;
    }
    for (const gem of this.gems) { gem.mesh.position.copy(gem.base); gem.mesh.position.y += Math.sin(t * .75 + gem.phase) * .09; gem.mesh.rotation.x += paused ? 0 : dt * .045; gem.mesh.rotation.y += paused ? 0 : dt * .08; }
    for (const o of this.orbits) { const a = t * .4 + o.phase; o.bead.position.set(Math.cos(a) * o.radius, Math.sin(a) * o.radius * o.flatten, 0); }
    this.light.intensity = 35 + Math.sin(t * 1.5) * 8;
    this.pipeline.render(this.scene, this.camera);
    this.frames++; if (!this.sampleStart) this.sampleStart = ms;
    if (ms - this.sampleStart > 1800) {
      this.fps = Math.round(this.frames * 1000 / (ms - this.sampleStart)); this.canvas.dataset.fps = String(this.fps); this.canvas.dataset.ratio = this.pixelRatio.toFixed(2); this.frames = 0; this.sampleStart = ms;
      if (!paused && this.fps < 34 && this.pixelRatio > .7 && this.samples++ > 1) { this.pixelRatio = Math.max(.7, this.pixelRatio * .82); this.resize(); }
    }
    if (!paused || Math.abs(this.explosion - (spread ? 1 : 0)) > .004) this.requestFrame();
  }
}

// Progressive fallback: transparent art + independently projected 3D orbital
// paths and pointer parallax. This is intentionally labelled layered art, not PBR.
class LayeredArtView {
  constructor(canvas, type) {
    this.canvas = canvas; this.type = type; this.time = 0; this.frame = 0; this.prev = 0; this.visible = false; this.frames = 0; this.sampleStart = 0;
    this.image = canvas.parentElement.querySelector('.scene-fallback');
    this.context = canvas.getContext('2d');
    if (!this.context) {
      const replacement = canvas.cloneNode(); canvas.replaceWith(replacement); this.canvas = replacement; this.context = replacement.getContext('2d');
    }
    this.back = document.createElement('canvas'); this.back.className = 'fallback-orbit-back'; this.back.setAttribute('aria-hidden', 'true'); this.canvas.parentElement.prepend(this.back); this.backContext = this.back.getContext('2d');
    this.canvas.dataset.state = 'layered-art'; this.canvas.parentElement.classList.add('scene-layered');
    this.canvas.setAttribute('aria-label', type === 'hero' ? 'Animated obsidian artwork with independent orbital lights and pointer parallax' : 'Animated EyeGuard crystal artwork with orbital lights');
    this.resizeObserver = new ResizeObserver(() => { this.resize(); this.requestFrame(); }); this.resizeObserver.observe(this.canvas);
    this.observer = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; if (this.visible) this.requestFrame(); else this.stop(); }, { rootMargin: '50px' }); this.observer.observe(this.canvas);
    this.resize(); scenes.push(this);
  }
  resize() {
    const r = this.canvas.getBoundingClientRect(); this.w = r.width; this.h = r.height; this.ratio = Math.min(devicePixelRatio || 1, 1.5);
    for (const c of [this.canvas, this.back]) { c.width = Math.round(this.w * this.ratio); c.height = Math.round(this.h * this.ratio); }
  }
  stop() { cancelAnimationFrame(this.frame); this.frame = 0; this.prev = 0; this.frames = 0; this.sampleStart = 0; }
  requestFrame() { if (!this.frame && !modalOpen && !document.hidden) this.frame = requestAnimationFrame(t => this.draw(t)); }
  draw(ms) {
    this.frame = 0; if (!this.visible || document.hidden) return;
    if (!paused && this.prev && ms - this.prev < 32) { this.requestFrame(); return; }
    const dt = this.prev ? Math.min(ms - this.prev, 80) : 16; this.prev = ms; if (!paused) this.time += dt * .001;
    const t = this.time, w = this.w, h = this.h, cx = w * .5 + pointer.x * 5, cy = h * .49 + Math.sin(t * .7) * 4;
    const rx = this.type === 'hero' ? Math.min(w * .475, h * .65) : Math.min(w * .47, h * .67);
    for (const c of [this.context, this.backContext]) { c.setTransform(this.ratio, 0, 0, this.ratio, 0, 0); c.clearRect(0, 0, w, h); }
    if (this.image) this.image.style.transform = `translate3d(${pointer.x * -7}px,${Math.sin(t * .7) * 5}px,0) rotate(${Math.sin(t * .18) * .65}deg)`;
    for (let ring = 0; ring < 3; ring++) {
      const tilt = [-.34, .24, -.12][ring] + Math.sin(t * .18 + ring) * .025;
      const ry = rx * [.21, .2, .3][ring];
      const color = ['#b68bff', '#a1ffe4', '#dbf5ff'][ring];
      const point = a => { const x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]; };
      for (let half = 0; half < 2; half++) {
        const c = half ? this.context : this.backContext; c.strokeStyle = color; c.lineWidth = ring === 2 ? .55 : .9; c.globalAlpha = ring === 2 ? .4 : .75; c.shadowColor = color; c.shadowBlur = 6;
        c.beginPath(); for (let i = 0; i <= 72; i++) { const a = (half * Math.PI) + i / 72 * Math.PI; const p = point(a); if (!i) c.moveTo(...p); else c.lineTo(...p); } c.stroke(); c.shadowBlur = 0; c.globalAlpha = 1;
      }
      const a = (t * .36 + ring * 2.1) % (2 * Math.PI), p = point(a), c = a >= Math.PI ? this.context : this.backContext;
      const g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], 14); g.addColorStop(0, '#ffffff'); g.addColorStop(.1, color); g.addColorStop(.35, color + '60'); g.addColorStop(1, color + '00'); c.fillStyle = g; c.fillRect(p[0] - 14, p[1] - 14, 28, 28);
    }
    const c = this.context; c.globalAlpha = .35;
    for (let i = 0; i < 25; i++) { const a = i * 2.39996 + t * .015; const px = cx + Math.cos(a) * rx * (1 + Math.sin(i) * .12), py = cy + Math.sin(a) * h * .39; c.fillStyle = i % 3 ? '#aaffdd' : '#b499ff'; c.fillRect(px, py, i % 4 ? 1 : 2, i % 4 ? 1 : 2); }
    c.globalAlpha = 1;
    // Independent light passes breathe over the foreground art, never the text.
    const glowRadius = rx * (this.type === 'hero' ? .32 : .3);
    const glow = c.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    const breath = .05 + (Math.sin(t * 1.15) + 1) * .035;
    glow.addColorStop(0, `rgba(156,85,255,${breath})`); glow.addColorStop(1, 'rgba(108,46,220,0)');
    c.globalCompositeOperation = 'screen'; c.fillStyle = glow; c.fillRect(cx-glowRadius,cy-glowRadius,glowRadius*2,glowRadius*2);
    if (this.type === 'orb') {
      c.strokeStyle = `rgba(204,174,255,${.2 + Math.sin(t * 1.2) * .09})`; c.lineWidth = .8;
      c.beginPath(); c.arc(cx,cy,rx*.23,t*.15,t*.15+Math.PI*1.35);c.stroke();
    } else {
      const size = Math.min(w*.87,h*.9);
      [[-.19,-.23],[.22,.26],[-.17,.25],[.12,-.34],[.06,.08]].forEach(([x,y],i) => {
        const px=w*.49+x*size,py=h*.49+y*size,b=.1+(Math.sin(t*.8+i*2.1)+1)*.15;
        const g=c.createRadialGradient(px,py,0,px,py,12);g.addColorStop(0,`rgba(211,255,245,${b})`);g.addColorStop(.2,`rgba(129,255,224,${b*.7})`);g.addColorStop(1,'rgba(129,255,224,0)');c.fillStyle=g;c.fillRect(px-12,py-12,24,24);
      });
    }
    c.globalCompositeOperation = 'source-over';
    this.frames++; if (!this.sampleStart) this.sampleStart = ms;
    if (ms - this.sampleStart > 1800) { this.canvas.dataset.fps = String(Math.round(this.frames * 1000 / (ms - this.sampleStart))); this.sampleStart = ms; this.frames = 0; }
    if (!paused) this.requestFrame();
  }
}

export function setMotion(playing) { paused = !playing; for (const view of scenes) { view.stop(); view.requestFrame(); } }
export function setSpread(value) { spread = value; for (const view of scenes) view.requestFrame(); }
export function initScenes() {
  const hero = document.querySelector('#heroCanvas'); const orb = document.querySelector('#orbCanvas');
  for (const [canvas, type] of [[hero, 'hero'], [orb, 'orb']]) {
    if (!canvas) continue;
    try { new SceneView(canvas, type); } catch (error) { new LayeredArtView(canvas, type); if (type === 'hero') { document.querySelector('#disperseButton').hidden = true; document.querySelector('.scene-caption').textContent = 'CINEMATIC VIEW'; } console.info('Layered artwork mode: ' + error.message); }
  }
  const surface = document.querySelector('#heroArt');
  surface?.addEventListener('pointermove', e => { if (paused || e.pointerType === 'touch') return; const r = surface.getBoundingClientRect(); pointer.x = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1); pointer.y = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1); });
  surface?.addEventListener('pointerleave', () => { pointer.x = pointer.y = 0; });
  document.addEventListener('visibilitychange', () => { for (const view of scenes) { view.stop(); if (!document.hidden) view.requestFrame(); } });
  document.addEventListener('portfolio:modal', e => { modalOpen = e.detail.open; for (const view of scenes) { if (modalOpen) view.stop(); else view.requestFrame(); } });
  reduceMotion.addEventListener('change', () => setMotion(!reduceMotion.matches));
}
