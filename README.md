# Wael El-Dabah — Living Obsidian

Personal offensive-security portfolio at https://wael-eldabah.github.io/.
The main page is V8.2. `_preview-v8/` preserves the earlier V8.1 study.

## Design

- Reference-led **DM Serif Display** headings and **DM Sans** copy, with DM Mono labels and Allura signature. Fonts and their OFL licenses are hosted locally. The original angular W monogram is retained.
- Obsidian, mint glass and violet light connect the chapters. Project stages and CV perspectives have coordinated accents. Important text remains separate from decorative artwork.
- The mobile hero uses content-driven grid placement: copy, full-width sculpture, controls and portrait occupy separate rows. Controls have larger touch targets and readable small text. The display face was selected by comparing rendered letter shapes against the supplied design image, not by claiming an exact font identification.
- EyeGuard workflow buttons synchronize with the research tabs. The CV dossier includes Industry, Research and Academic perspectives, real PDF previews, and view/download links.
- Credential cards distinguish certifications, education and achievements. Graphics for academic and competition achievements are illustrations, not certificate scans. Existing biographical content and CV documents are preserved.

## Motion

`src/cinematic.js` builds to `dist/cinematic.js`. The renderer composites transparent video, textured artwork, independently moving fragments, particles and light on Canvas 2D. This is a layered cinematic effect, not a real-time 3D mesh or a physical 4D simulation.

| Source | Desktop | Mobile (up to 800 CSS px) |
| --- | --- | --- |
| Obsidian | 1080 × 1080; 3.30 MB | 640 × 640; 1.64 MB |
| EyeGuard prism | 960 × 960; 6.69 MB | 640 × 640; 2.81 MB |

Videos are approximately 10 seconds long and use VP9 alpha. Small binary segments are assembled into a WebM Blob after the scene becomes visible and animation is enabled. Static textured artwork remains available while loading, when alpha decoding is unsupported, or when data saving is enabled. Section artwork loads as its scene approaches the viewport.

Canvas animation targets approximately 30 fps, pauses outside the viewport and when the page is hidden, and obeys the site's pause controls and reduced-motion preference. Decorative CSS animations also pause outside the viewport. Pointer effects are limited to a mouse and stop with global pause. These are implementation behaviors, not a measured device-performance guarantee.

## Development

```sh
npm ci
npm run build
node scripts/verify.mjs
npm run serve
```

Use Node.js 20.11+ and Python for the simple static server. GitHub Pages serves the committed files; it does not run the Node build. Commit `dist/cinematic.js` whenever its source changes. Old Three.js source and bundle are historical and are not loaded by the main page.

`scripts/verify.mjs` checks local assets and anchors, unique IDs, font-family wiring, complete video segment sets and CV file signatures. Verification scope and remaining limits are in `docs/verification/v8.2.md`.
