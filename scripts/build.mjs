import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/cinematic.js'], bundle: true, minify: true, format: 'esm', target: ['es2020'], outfile: 'dist/cinematic.js', legalComments: 'external', metafile: false });
await copyFile('node_modules/three/LICENSE', 'dist/THREE-LICENSE.txt');
console.log('Built cinematic renderer with local assets.');
