import land from '../assets/earth-land.json';
import { geoArea, geoOrthographic, geoPath } from 'd3-geo';

// Geographic coastlines from Natural Earth, public domain. Connections are illustrative.
const TAU = Math.PI * 2, RAD = Math.PI / 180;
const vector = ([lon, lat]) => [Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(lon * RAD)];
// Normalize winding for D3's spherical clipping at the visible horizon.
const geography = { type: 'MultiPolygon', coordinates: land.map(ring => [geoArea({type:'Polygon',coordinates:[ring]}) > Math.PI * 2 ? [...ring].reverse() : ring]) };
const projection = geoOrthographic().clipAngle(90).precision(.35);
const geographicPath = geoPath(projection);
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
// Route geometry is stable: do not allocate/recompute every arc on every frame.
const routes = connections.map(([from, to]) => Array.from({length:61}, (_, i) => arcPoint(hubs[from], hubs[to], i / 60)));
const cityLights = [];
const cities = [[31.24,30.04], [29.9,31.2], [2.35,48.86], [-.13,51.51], [13.4,52.5], [12.5,41.9], [28.98,41.01], [37.6,55.75], [55.27,25.2], [72.88,19.07], [77.2,28.61], [121.47,31.23], [116.4,39.9], [139.69,35.69], [126.97,37.56], [103.82,1.35], [-74,40.71], [-118.24,34.05], [-87.63,41.88], [-46.63,-23.55], [18.42,-33.92]];
for (const [j, [lon, lat]] of cities.entries()) for (let i=0; i<18; i++) {
  const a=i*2.39996+j, radius=.16+Math.sqrt(i)*.14;
  cityLights.push(vector([lon+Math.cos(a)*radius,lat+Math.sin(a)*radius*.6]));
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
  // Instrument ring and atmosphere sit behind the solid sphere.
  if (!compact) {
    for (let i=0;i<72;i++) {
      const a=i/72*TAU, inner=r*1.15, outer=r*(i%6 ? 1.163 : 1.19);
      ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*inner,cy+Math.sin(a)*inner);ctx.lineTo(cx+Math.cos(a)*outer,cy+Math.sin(a)*outer);
      ctx.strokeStyle=i%6?'rgba(160,190,222,.17)':'rgba(175,218,237,.42)';ctx.lineWidth=.6;ctx.stroke();
    }
  }
  orbit(false);
  const atmosphere=ctx.createRadialGradient(cx,cy,r*.96,cx,cy,r*1.095);
  atmosphere.addColorStop(0,`rgba(${color},.01)`);atmosphere.addColorStop(.35,`rgba(${color},.20)`);atmosphere.addColorStop(.65,'rgba(112,100,237,.10)');atmosphere.addColorStop(1,'rgba(95,150,220,0)');
  ctx.fillStyle=atmosphere;ctx.beginPath();ctx.arc(cx,cy,r*1.095,0,TAU);ctx.fill();
  const ocean = ctx.createRadialGradient(cx - r * .38, cy - r * .5, r * .02, cx, cy, r * 1.15);
  ocean.addColorStop(0, '#234659'); ocean.addColorStop(.3, '#102338'); ocean.addColorStop(.64, '#09122a'); ocean.addColorStop(1, '#01030a');
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = ocean; ctx.fill();
  ctx.save(); ctx.clip();
  projection.translate([cx,cy]).scale(r).rotate([yaw/RAD,-pitch/RAD,0]);
  geographicPath.context(ctx);
  const surface=ctx.createLinearGradient(cx-r,cy-r,cx+r*.7,cy+r);
  surface.addColorStop(0,'#77aaa9');surface.addColorStop(.32,'#305e68');surface.addColorStop(.64,'#183445');surface.addColorStop(1,'#101c36');
  ctx.beginPath();geographicPath(geography);ctx.fillStyle=surface;ctx.fill();
  ctx.strokeStyle='rgba(188,247,238,.55)';ctx.lineWidth=compact?.5:.65;ctx.stroke();
  for (const circle of grid) line(circle, 'rgba(137,187,223,.12)', .5);
  for (const point of dots) {
    const p = project(point); if (p.z < .02) continue;
    ctx.fillStyle = `rgba(169,237,233,${.12 + p.z * .27})`;
    const d = (compact ? .65 : .75) + p.z * .4;
    ctx.fillRect(p.x - d / 2, p.y - d / 2, d, d);
  }
  // Small warm clusters give the dark hemisphere scale without implying live traffic.
  for (const point of cityLights) {
    const p=project(point);if(p.z<.04)continue;
    ctx.fillStyle=`rgba(255,214,161,${.32+p.z*.48})`;ctx.fillRect(p.x,p.y,compact?.6:.85,compact?.6:.85);
  }
  const sheen=ctx.createRadialGradient(cx-r*.4,cy-r*.5,0,cx-r*.3,cy-r*.35,r*.92);
  sheen.addColorStop(0,'rgba(207,251,255,.17)');sheen.addColorStop(.5,'rgba(106,205,226,.035)');sheen.addColorStop(1,'rgba(50,87,112,0)');
  ctx.fillStyle=sheen;ctx.fillRect(cx-r,cy-r,r*2,r*2);
  const shadow = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  shadow.addColorStop(0, 'rgba(187,245,255,.07)'); shadow.addColorStop(.52, 'rgba(11,10,29,0)'); shadow.addColorStop(1, 'rgba(2,3,14,.72)');
  ctx.fillStyle = shadow; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); ctx.restore();
  const rim = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  rim.addColorStop(0, '#e4fffa'); rim.addColorStop(.35, '#7ce5d4'); rim.addColorStop(.65, '#587994'); rim.addColorStop(1, '#c8a3ff');
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.strokeStyle = rim; ctx.lineWidth = compact ? .9 : 1.4; ctx.stroke();
  if (!compact) {
    // A faceted glass perimeter carries the material language of the obsidian scene.
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU + .13 + time*.025, b = (i + 1) / 16 * TAU + .13 + time*.025;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos((a + b) / 2) * r * 1.1, cy + Math.sin((a + b) / 2) * r * 1.1);
      ctx.lineTo(cx + Math.cos(b) * r, cy + Math.sin(b) * r); ctx.closePath();
      ctx.fillStyle = i % 3 ? 'rgba(133,208,210,.045)' : 'rgba(181,145,255,.11)'; ctx.fill();
      ctx.strokeStyle = i % 2 ? 'rgba(175,249,228,.22)' : 'rgba(186,158,255,.24)'; ctx.lineWidth = .65; ctx.stroke();
    }
  }
  connections.forEach(([from, to], i) => {
    const a = hubs[from], b = hubs[to];
    line(routes[i], `rgba(${i % 2 ? '190,146,255' : color},.58)`, compact ? .7 : 1);
    const p = project(arcPoint(a, b, (time * .22 + i * .173) % 1));
    if (p.z > .03) {
      // A short fading tail makes the signal direction legible.
      const u=(time*.22+i*.173)%1;
      for(let j=1;j<=5;j++){const tail=project(arcPoint(a,b,Math.max(0,u-j*.014)));if(tail.z>.03){ctx.beginPath();ctx.arc(tail.x,tail.y,Math.max(.45,1.6-j*.21),0,TAU);ctx.fillStyle=`rgba(${color},${.65-j*.1})`;ctx.fill();}}
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
  // A restrained location callout tracks the Cairo hub on the front hemisphere.
  const cairo=project(hubs[0]);
  if(!compact && w>280 && cairo.z>.35){
    const x=cairo.x+r*.22,y=cairo.y-r*.19;
    ctx.beginPath();ctx.moveTo(cairo.x+5,cairo.y-4);ctx.lineTo(x,y);ctx.lineTo(x+r*.22,y);ctx.strokeStyle='rgba(183,244,226,.55)';ctx.lineWidth=.6;ctx.stroke();
    ctx.font=`500 ${Math.max(7,Math.min(10,r*.048))}px monospace`;ctx.fillStyle='#ceeee7';ctx.fillText('CAIRO',x+3,y-5);
  }
  light(cx - r * .62, cy - r * .67, r * .16, '221,255,250', .28);
  ctx.restore();
}
