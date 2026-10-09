import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/scene.js'], bundle: true, minify: true, format: 'esm', target: ['es2020'], outfile: 'dist/scene.js', legalComments: 'external', metafile: false });
await copyFile('node_modules/three/LICENSE', 'dist/THREE-LICENSE.txt');
console.log('Built locally hosted Three.js scene. No CDN required.');
