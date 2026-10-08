# SIGNAL ATLAS — Wael El-Dabah

**A portfolio as an interactive security exhibition, not a conventional endless-scroll template.**

This repo contains a bespoke browser-native frontend designed for an Offensive Security Engineer, with three conceptual visual strata: **Offense / Detection / Engineering**, and eight routed chapters.

## Experiences

- **Eight immersive chapters** navigated by Index, Next / Previous, deep links and keyboard shortcuts. Each chapter can scroll internally for detailed content without a long vertical homepage.
- **Signal Gate transitions**: four staggered geometric wipe panels, activated between chapters.
- **4D tesseract projection**: original interactive geometry math rendered in the native HTML Canvas 2D API, projected from 4D to 3D and then into 2D. No fabricated WebGL claim.
- **Cursor-reveal layers** alternate between three self-generated cinematic visual plates.
- **EyeGuard interactive case study** with four functional tabs and technical explanations.
- **Three CV editions**: Industry, Research, and Academic (both preview and direct PDF download).
- **Accessibility and performance**: semantic HTML, keyboard navigation, visible focus, no-scroll fallback if scripts are unavailable, touch-safe navigation, reduced-motion support, pause when tab is backgrounded, FX switch.

## Controls

- Select **INDEX** in the bottom HUD to open all chapters.
- **NEXT** and **←** move between chapters.
- When not interacting with a control, keyboard `1` to `8`, `←`, `→`, `PageUp`, `PageDown` navigate.
- `Esc` closes the chapter directory.
- The hero has three scene-selector buttons. Move the mouse over it to reveal another artistic layer; the selection buttons work with keyboard too.

## Stack

Pure HTML, CSS and JavaScript — no framework, no build step, no third-party JS, no trackers, no credentials. Google Fonts is the only third-party styling request. `assets/*.webp` are original optimized CGI artworks; all other animations are browser-native.

## Deploy

The intended repository is **Wael-Eldabah/Wael-Eldabah.github.io**. Put the contents of this directory into **main** and select GitHub Pages **Settings → Pages → Deploy from a branch → main → /(root)**. Expected address, after successful deployment: `https://wael-eldabah.github.io/`.

## Information integrity & sharing

The Industry, Research and Academic CVs are tailored documents that include personal contact details, and the website itself is public. Review before making the final deployment public. CEH is shown as *training*, not as an independently verified earned CEH certification; HCIA-Security is displayed based on the account owner's confirmation. EyeGuard is labelled a research prototype, not production software; the privately hosted source repository is not disclosed.
