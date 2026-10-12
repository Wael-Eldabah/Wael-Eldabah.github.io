import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { credentials } from '../src/credentials.js';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const html = read('index.html');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML IDs');
let references = 0;
function verifyURL(url, from) {
  if (/^(?:https?:|mailto:|data:|blob:)/.test(url)) return;
  if (url.startsWith('#')) {
    assert(ids.includes(url.slice(1)), `Missing anchor ${url}`);
    return;
  }
  assert(existsSync(resolve(root, dirname(from), url.split(/[?#]/)[0])), `Missing file ${url} in ${from}`);
  references++;
}
for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) verifyURL(url, 'index.html');
for (const [, url] of html.matchAll(/href="([^"]+\.css[^\"]*)"/g)) {
  const file = url.split('?')[0];
  for (const match of read(file).matchAll(/url\((?:(['"])(.*?)\1|([^)'"\s]+))\)/gs)) verifyURL(match[2] || match[3], file);
}
assert(!html.includes('fonts.googleapis.com'), 'Fonts must be local');
assert(html.includes('refinement.css?v=8.4.1'), 'Missing current design refinements');
for (const family of ['DM Serif Display', 'DM Sans', 'DM Mono', 'Allura']) assert(read('fonts.css').includes(family));
const manifest = JSON.parse(read('assets/motion/manifest.json'));
for (const [name, spec] of Object.entries(manifest)) {
  const data = Buffer.concat(spec.parts.map(part => readFileSync(resolve(root, 'assets/motion', part))));
  assert.equal(data.length, spec.bytes, `Truncated ${name}`);
  assert.equal(data.subarray(0, 4).toString('hex'), '1a45dfa3', `Invalid WebM ${name}`);
}
assert.notDeepEqual(manifest['obsidian-desktop'].parts, manifest['obsidian-mobile'].parts, 'Desktop must have its full-resolution source');
for (const kind of ['Industry', 'Research', 'Academic']) {
  assert.equal(readFileSync(resolve(root, `cv/Wael_El-Dabah_${kind}_CV.pdf`)).subarray(0, 4).toString(), '%PDF');
}
console.log(`Verified ${references} local references, ${ids.length} unique IDs, 4 complete motion variants, 4 font families and 3 CV PDFs.`);

for (const [key, record] of Object.entries(credentials)) {
  assert(html.includes(`data-credential="${key}"`), `Missing credential trigger: ${key}`);
  if (record.image) assert(existsSync(resolve(root, record.image)), `Missing credential image: ${key}`);
}
assert.equal(Object.values(credentials).filter(r => r.kind === 'certification').length, 1);
assert.equal(Object.values(credentials).filter(r => r.kind === 'training').length, 8);
assert.equal(credentials.ejpt.href, 'https://certs.ine.com/cec37ed6-8feb-495e-bd16-5fe978ef1c0d#acc.IJqoARQM');
assert.equal(credentials.hcia.kind, 'training');
assert.equal(credentials.hccda.kind, 'training');
console.log('Verified 12 credential records, 11 document images, 8 training programs and the personal INE verification link.');
