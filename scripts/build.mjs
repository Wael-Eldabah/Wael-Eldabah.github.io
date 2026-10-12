import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/cinematic.js'], bundle: true, minify: true, format: 'esm', target: ['es2020'], outfile: 'dist/cinematic.js', legalComments: 'external', metafile: false });
await copyFile('node_modules/three/LICENSE', 'dist/THREE-LICENSE.txt');
for (const packageName of ['d3-geo', 'd3-array', 'internmap']) await copyFile(`node_modules/${packageName}/LICENSE`, `dist/${packageName.toUpperCase()}-LICENSE.txt`);
console.log('Built cinematic renderer with local assets.');
