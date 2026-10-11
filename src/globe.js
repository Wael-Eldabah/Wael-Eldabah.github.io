import land from '../assets/earth-land.json';

// Geographic coastlines from Natural Earth, public domain. Connections are illustrative.
const TAU = Math.PI * 2, RAD = Math.PI / 180;
const vector = ([lon, lat]) => [Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(lon * RAD)];
const coasts = land.map(ring => ring.map(vector));
const bounds = land.map(ring => [Math.min(...ring.map(p => p[0])), Math.min(...ring.map(p => p[1])), Math.max(...ring.map(p => p[0])), Math.max(...ring.map(p => p[1]))]);
function onLand(x, y) {
  return land.some((ring, k) => {
    const b = bounds[k]; if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) return false;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  });
}
const dots = [];
for (let lat = -58; lat <= 80; lat += 2.5) {
  for (let lon = -180; lon < 180; lon += 2.5 / Math.max(.3, Math.cos(lat * RAD))) {
    if (onLand(lon, lat)) dots.push(vector([lon, lat]));
  }
}
const grid = [];
for (let lat = -60; lat <= 60; lat += 30) grid.push(Array.from({ length: 121 }, (_, i) => vector([-180 + i * 3, lat])));
for (let lon = -180; lon < 180; lon += 30) grid.push(Array.from({ length: 61 }, (_, i) => vector([lon, -90 + i * 3])));
const hubs = [[31.24, 30.04], [-.13, 51.51], [-74, 40.71], [103.82, 1.35], [139.69, 35.69], [-46.63, -23.55], [18.42, -33.92]].map(vector);
const connections = [[0, 1], [0, 3], [1, 2], [3, 4], [0, 6], [2, 5]];
const palettes = [[144, 248, 224], [199, 160, 255], [141, 207, 255], [180, 255, 217]];
function arcPoint(a, b, u) {
  const angle = Math.acos(Math.max(-1, Math.min(1, a.reduce((n, v, i) => n + v * b[i], 0))));
  const sine = Math.sin(angle), height = 1.02 + Math.sin(Math.PI * u) * .2;
  return a.map((v, i) => (v * Math.sin((1 - u) * angle) + b[i] * Math.sin(u * angle)) / sine * height);
}
export function drawSignalGlobe(ctx, w, h, time = 0, stage = 0, px = 0, py = 0, compact = false) {
  const r = Math.min(w * .35, h * (compact ? .44 : .36)), cx = w * .5, cy = h * (compact ? .51 : .48);
  const yaw = -.35 + time * .1 + px * .13, pitch = .22 + py * .08;
  const ca = Math.cos(yaw), sa = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const color = palettes[stage % palettes.length];
  const project = v => {
    const x = v[0] * ca + v[2] * sa, z = v[2] * ca - v[0] * sa;
    return { x: cx + x * r, y: cy - (v[1] * cp - z * sp) * r, z: v[1] * sp + z * cp };
  };
  const line = (points, stroke, width = .6) => {
    ctx.beginPath(); let pen = false;
    for (const point of points) {
      const p = project(point);
      if (p.z < .015) { pen = false; continue; }
      if (pen) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
      pen = true;
    }
    ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke();
  };
  const light = (x, y, radius, rgb, opacity) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(${rgb},${opacity})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  ctx.save();
  light(cx - r * .2, cy, r * 1.6, '105,66,210', .2);
  light(cx + r * .65, cy - r * .5, r * .9, color, .1);
  const orbit = front => {
    for (let k = 0; k < (compact ? 1 : 2); k++) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(k ? .37 : -.38);
      ctx.beginPath(); ctx.ellipse(0, 0, r * (k ? 1.3 : 1.43), r * .28, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
      ctx.strokeStyle = k ? 'rgba(187,149,255,.48)' : `rgba(${color},${front ? .65 : .24})`;
      ctx.lineWidth = front ? 1 : .65; ctx.stroke(); ctx.restore();
    }
  };
  orbit(false);
  const ocean = ctx.createRadialGradient(cx - r * .38, cy - r * .5, r * .02, cx, cy, r * 1.15);
  ocean.addColorStop(0, '#244551'); ocean.addColorStop(.36, '#102735'); ocean.addColorStop(.72, '#0b172c'); ocean.addColorStop(1, '#02040b');
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = ocean; ctx.fill();
  ctx.save(); ctx.clip();
  for (const circle of grid) line(circle, 'rgba(120,175,205,.16)', .5);
  for (const point of dots) {
    const p = project(point); if (p.z < .02) continue;
    ctx.fillStyle = `rgba(161,226,228,${.2 + p.z * .68})`;
    const d = (compact ? .65 : .75) + p.z * .4;
    ctx.fillRect(p.x - d / 2, p.y - d / 2, d, d);
  }
  for (const coast of coasts) line(coast, 'rgba(183,248,233,.78)', compact ? .65 : .8);
  const shadow = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  shadow.addColorStop(0, 'rgba(187,245,255,.07)'); shadow.addColorStop(.52, 'rgba(11,10,29,0)'); shadow.addColorStop(1, 'rgba(2,3,14,.72)');
  ctx.fillStyle = shadow; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); ctx.restore();
  const rim = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  rim.addColorStop(0, '#e4fffa'); rim.addColorStop(.35, '#7ce5d4'); rim.addColorStop(.65, '#587994'); rim.addColorStop(1, '#c8a3ff');
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.strokeStyle = rim; ctx.lineWidth = compact ? .9 : 1.4; ctx.stroke();
  if (!compact) {
    // A faceted glass perimeter carries the material language of the obsidian scene.
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU + .13, b = (i + 1) / 16 * TAU + .13;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos((a + b) / 2) * r * 1.1, cy + Math.sin((a + b) / 2) * r * 1.1);
      ctx.lineTo(cx + Math.cos(b) * r, cy + Math.sin(b) * r); ctx.closePath();
      ctx.fillStyle = i % 3 ? 'rgba(133,208,210,.045)' : 'rgba(181,145,255,.11)'; ctx.fill();
      ctx.strokeStyle = i % 2 ? 'rgba(175,249,228,.22)' : 'rgba(186,158,255,.24)'; ctx.lineWidth = .65; ctx.stroke();
    }
  }
  connections.forEach(([from, to], i) => {
    const a = hubs[from], b = hubs[to];
    line(Array.from({ length: 41 }, (_, n) => arcPoint(a, b, n / 40)), `rgba(${i % 2 ? '190,146,255' : color},.58)`, compact ? .7 : 1);
    const p = project(arcPoint(a, b, (time * .22 + i * .173) % 1));
    if (p.z > .03) {
      light(p.x, p.y, compact ? 7 : 11, color, .5);
      ctx.beginPath(); ctx.arc(p.x, p.y, compact ? 1.25 : 1.8, 0, TAU); ctx.fillStyle = '#effffb'; ctx.fill();
    }
  });
  hubs.forEach((v, i) => {
    const p = project(v); if (p.z < .03) return;
    light(p.x, p.y, compact ? 8 : 13, color, .35);
    ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, TAU); ctx.fillStyle = i ? `rgb(${color})` : '#f4fffc'; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, p.y, 5 + (Math.sin(time * 1.6 + i) + 1) * 2, 0, TAU);
    ctx.strokeStyle = `rgba(${color},.3)`; ctx.lineWidth = .65; ctx.stroke();
  });
  orbit(true);
  light(cx - r * .62, cy - r * .67, r * .16, '221,255,250', .28);
  ctx.restore();
}
