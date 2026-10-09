# Wael El-Dabah — Living Obsidian

Wael's personal portfolio, with an obsidian, violet and mint visual direction based on the supplied cinematic reference. The interface is real, selectable HTML. The landscape, foreground sculpture, portrait, typography and controls are independent layers.

## Visual system

- A Three.js WebGL2 sculpture made of irregular stone blocks, transmissive glass, luminous seams, floating fragments and orbital lights. Pointer movement changes the camera-facing orientation; **Disperse** separates the pieces and **Reassemble** brings them back.
- A separate faceted EyeGuard crystal with a luminous iris and moving orbital lights. The small dashboard is an illustrative network visualization, not live security telemetry.
- An alpha-preserving, quarter-resolution bloom pass, ACES tone mapping and image-based lighting.
- On devices without WebGL2, clean transparent artwork is combined with independently animated front/back orbital paths, particles and pointer parallax. This is a layered-art compatibility mode, not physically rendered 3D. The unavailable Disperse control is hidden.
- A separate interactive **4D dimension study**: 16 vertices and 32 edges, genuine rotations in four dimensions, then projection into 3D and 2D. Drag, speed, pause and reset controls are available.
- Responsive navigation, keyboard-operable research tabs, native modal focus handling, visible focus styles, a global motion control and `prefers-reduced-motion` support.

## Connected chapters

The sticky navigation and next-section control use native smooth anchor scrolling. Scroll motion stays under the visitor’s control; there is no forced auto-advance or wheel interception. A short light sweep, progressive reveals, reflective cards, a continuous geometric atmosphere, a moving experience timeline and a living research core connect the sections. Both the hero and persistent control can pause the site.

Certification cards show the official INE eJPT badge and official Huawei issuer logo, with native detail dialogs. Degree and competition artwork are editorial symbols, not fabricated certificate scans. The CV cards preview the actual first page of each linked PDF.

## Develop

Requires Node.js 20+ and Python 3 for the example static server.

```sh
npm ci
npm run build
npm run serve
```

Open `http://localhost:8000`. `src/scene.js` is the editable Three.js source. `npm run build` produces the self-contained browser module in `dist/scene.js` and copies the Three.js MIT license. Commit the built files when changing the scene; GitHub Pages does not run a Node build.

The rest of the site is plain HTML, CSS and browser-native JavaScript. Dependencies are pinned in `package-lock.json`; no runtime CDN import is needed for Three.js.

## Performance behavior

The page is readable before the 3D module loads. The module is deferred until idle (with a short timeout). WebGL resolution is capped at 1.5 device pixels per CSS pixel on desktop and 1.2 on mobile, then reduced when measured rendering speed stays low. Bloom uses quarter-size render targets. Scenes stop requesting frames when offscreen, when the tab is hidden, while the 4D dialog is open, or when paused. The layered-art renderer caps its animation cadence near 30 fps. These are implementation limits, not guarantees of any particular device's frame rate.

## Assets and content

- `assets/cinematic-environment.webp`: generated text-free environment artwork, optimized to WebP.
- `assets/obsidian-sculpture.webp` and `assets/eyeguard-crystal.webp`: generated transparent compatibility artwork, based on the supplied visual direction. They contain no baked interface text.
- `assets/wael-cinematic-portrait.webp`: a cinematic photographic edit of the personal portrait supplied by the owner, with graphite, mint and violet studio lighting. The generated concept person is not used as the owner.
- Google Fonts provides Bodoni Moda, DM Sans, DM Mono and Allura, with system fallbacks.
- Existing portfolio content and the three Industry, Research and Academic CV PDFs are retained. Dashboard states are illustrative. Certifications and experience are not independently re-verified by this visual redesign.

## Deployment and validation

The site is served by GitHub Pages from the root of `main`: <https://wael-eldabah.github.io/>.

Validation includes the production build, JavaScript syntax, local links/anchors and browser checks for responsive layout, research controls, navigation, pause and the 4D dialog. The available cloud browser disables WebGL, so browser visual checks cover the animated layered-art compatibility mode and Canvas2D interactions. The actual PBR shader output, GPU frame rate and physical iOS/Android behavior still require a WebGL-enabled device; no Lighthouse score or GPU benchmark is claimed.

Official asset sources: [INE eJPT](https://ine.com/security/certifications/ejpt-certification), [Huawei](https://www.huawei.com/en/). Credential program links point to issuer information, not personal credential verification.

Three.js documentation: [physical materials](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) and [responsive rendering](https://threejs.org/manual/en/responsive.html).
