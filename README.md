# Highrise

A self-contained tower stacking game with a dark blue blueprint scene, a swinging crane, yellow blocks, current score, and a locally saved personal best. The finished site is in **`dist/`**. It needs no backend, account, wallet, external asset, or runtime request beyond loading its own static files.

## Play

Select **Start building**, then tap/click the play area or select **Drop block** when the suspended block aligns with the tower. Space also drops; native focused buttons accept Enter or Space. Each landed block earns one point. Overhang is trimmed; drops within 7 game units snap into a perfect placement. Missing the tower ends the run. **Build again** starts a fresh run and keeps the best score.

The pause button or **P** pauses/resumes; **Escape** pauses. Leaving the tab or window pauses automatically. Sound is off by default and can be enabled with the speaker button. Best scores use `localStorage` under `highrise.best.v1`; when storage is blocked, the game shows that the best lasts only for the visit. Sound is synthesized locally.

## Install and develop

Requires Node.js 22.12+ and npm. All dependency versions and resolutions are in `package-lock.json`.

```sh
npm ci
npm run dev
```

The dependency installation may use the network. Once installed, build and typecheck run without network access. `npm ci --offline` also works when the npm cache already contains the locked packages; no dependency archives or registry mirror are shipped.

## Rebuild and preview

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

The preview command prints its local URL. `vite.config.mjs` sets `root: 'web'`, `base: './'`, and `outDir: '../dist'`. Source assets, including the favicon, are local. The production export contains one HTML file, one CSS file, one JavaScript file, and the SVG favicon. Do not open `dist/index.html` through `file://`; serve it over HTTP(S) so ES modules load normally.

## Publish and embed

Upload **the contents of `dist/`**, keeping `assets/` and `favicon.svg` alongside `index.html`. It works at a host root or a subdirectory; no routing rewrites are needed. Keep the generated export alongside the source and lockfile in the submission because the publisher serves that export directly. Only publish the export, not the development tree or validation files.

An ordinary iframe can use the published directory as its `src`. Give it a descriptive title, 100% available width, and enough height to show the game (or allow internal scrolling). A sandboxed iframe must allow scripts; the tested sandbox uses `allow-scripts allow-same-origin`. Restrictive host storage policies may make the best score session-only. The module does not read or control its parent page.

No server-side configuration, credentials, chain access, or deployment keys are needed. The page's CSP denies fetch connections and permits only locally served scripts, styles, and images.

## Source and checks

- `web/src/engine.ts`: independent game rules and state transitions.
- `web/src/render.ts`: responsive Canvas drawing and crane animation.
- `web/src/main.ts`: native controls, storage, audio, and announcements.
- `web/src/style.css`: tokens, layout, component states, and responsive rules.
- `web/src/engine.test.ts`: 9 meaningful engine tests, including 10,000 generated overlap cases and a 300-floor run.
- `scripts/browser-check.mjs`: starts its own temporary foreground HTTP server, checks the actual export under `/preview/`, then closes the browser and server.
- `DESIGN.md`: implemented design system.
- `artifacts/validation.md`: six-domain review, fixes, actual check results, and limitations.

To rerun the browser validation after installation:

```sh
npx playwright-core install chromium
npm run build
npm run check:browser
```

Browser installation may require network access and system browser libraries. `CHROMIUM_PATH` can select an already installed Chromium executable. `PLAYWRIGHT_MODULE` and `AXE_MODULE` can select external absolute module paths when tools are installed outside the repository. The test writes screenshots and `artifacts/browser-results.json`; these are actual test outputs, not a runtime dependency.

## Actual validation

On 2026-10-05: the locked dependencies installed successfully offline from a populated temporary cache; the production build and `tsc --noEmit` passed. All 9 engine tests passed. Local headless Chromium passed the primary interactions, six consecutive placements, restart, best-score persistence, pause, sound-toggle state, storage-denied fallback, mobile taps, and sandboxed iframe loading. There was no horizontal page overflow at 320, 360, 600, 800, or 1200px, or at 360px with 200% root font size. No observed page errors, failed requests, or external requests occurred in the instrumented session.

Because repository `node_modules/` was left untouched, the worker installed the locked tools into `/tmp/highrise-99a3c0a3` and ran the actual production commands as:

```sh
/tmp/highrise-99a3c0a3/node_modules/.bin/vite build
/tmp/highrise-99a3c0a3/node_modules/.bin/tsc --noEmit
npm test
PLAYWRIGHT_MODULE=/tmp/highrise-99a3c0a3/node_modules/playwright-core/index.mjs \
AXE_MODULE=/tmp/highrise-99a3c0a3/node_modules/@axe-core/playwright/dist/index.mjs \
CHROMIUM_PATH=/opt/imd-tools/ms-playwright/chromium_headless_shell-1246/chrome-headless-shell-linux64/chrome-headless-shell \
npm run check:browser
```

The supplied browser connector returned `Transport closed`; the bounded local Playwright script supplied rendered evidence instead. Three axe scans reported zero automatic violations, with Canvas-backed contrast needing manual review. Selected computed color pairs were measured separately. This is a visual timing game: screen-reader-only spatial play is not provided. Physical devices, other browser engines, native 200% browser zoom, a screen-reader session, and audible playback were not tested. Text enlargement and touch emulation are distinct checks. These are worker observations, not independent verification.

Design-reference attribution and preserved licenses are in `docs/`. The deliverable contains no dependency directory, package cache, generated registry archive, or submodule. No ignore file was changed.
