# Highrise design system

## Overview

Highrise is a single-page precision stacking game for pointer, touch, and keyboard play. Its visual direction is a dark blue architectural blueprint with yellow accents. The page uses a quiet header, one introductory heading, a large play area, scores, and three short instructions. The crane, grid, crosshairs, isometric blocks, and floor scale are original Canvas drawings.

Source of truth: `web/src/style.css` for interface tokens and composition, `web/index.html` for semantic component markup, `web/src/render.ts` for illustration roles, `web/src/main.ts` for component states, and `web/src/engine.ts` for the rules. Native HTML and TypeScript keep this small game independent of a component framework.

## Colors

The implemented palette uses hex values, with primitives mapped to semantic interface tokens in `style.css:3–11`.

| Semantic token | Value | Role |
| --- | --- | --- |
| `--color-bg` | `#0b192b` | Page background |
| `--color-surface` | `#0e2036` | Score card, toolbar, controls, status panel |
| `--color-board` | `#102640` | Drawing field |
| `--color-hover` | `#152d48` | Secondary button hover |
| `--color-line` | `#29405b` | Structural separators and borders |
| `--color-text` | `#e9eff5` | Primary text |
| `--color-muted` | `#a1b3c9` | Descriptions and technical captions |
| `--color-accent` | `#f5cf55` | Primary action; active block and crane cable |
| `--color-accent-hover` | `#ffe083` | Primary action hover |
| `--color-on-accent` | `#0b192b` | Label on yellow |
| `--color-focus` | `#e9eff5` | Keyboard outline |

Canvas roles are grouped in `render.ts` as `ink`: grid `#1a3551`, major grid `#24415d`, blueprint lines `#6f96b9`, block front/top/side `#173c59` / `#244d67` / `#0d2b45`, and yellow block front/top/side `#f5cf55` / `#ffe083` / `#bb9339`. Canvas numbers and labels are decorative; score and instructions also exist in HTML. Color never provides the only result cue: placement and end states have text and live announcements.

There is one deliberate dark theme. Forced-colors mode preserves browser system colors for interface controls and their focus rings while keeping the game artwork intact. Measured contrast pairs and the Canvas limitations are recorded in `artifacts/validation.md`.

## Typography

`--font-body` is `'Trebuchet MS', Arial, sans-serif`; `--font-mono` is `'SFMono-Regular', Consolas, 'Liberation Mono', monospace`. There are no downloaded fonts. Available faces depend on the system; requested 500 weight may resolve to an available regular face. Regular and bold roles use 400/700, with synthesis disabled.

- `--text-xs`: 0.6875rem; technical labels, uppercase via CSS, with positive tracking.
- `--text-sm`: 0.8125rem; instructions, captions, and secondary controls.
- `--text-body`: 0.9375rem; primary button and instruction heading.
- Page heading: `clamp(2rem, 4.2vw, 3rem)`, 500 weight, 1.1 line height, −0.045em tracking. At the single-column breakpoint it uses `clamp(1.9rem, 5.8vw, 2.6rem)`.
- Scene heading: 2rem, 1.15 line height; 1.75rem on narrow screens; status-panel variant 1.65rem.
- Score: 4.7rem on desktop and 2.4rem in the compact score row. Best score: 1.25rem / 1.5rem. Both use tabular numbers. Current-score digits stay together; the unit can wrap independently.
- Descriptions: line height 1.6 and `text-wrap: pretty`. Headings balance. Instruction titles use 700 weight and 1.5 line height.

The smallest 9px mobile annotations are decorative drafting captions and the header tagline. Play instructions are 13px on narrow screens. The native browser font-size setting is supported through rem-based sizing and growing containers.

## Layout

Spacing tokens are 4, 8, 12, 16, 24, 32, and 48px. Components also use local optical adjustments documented by their CSS. The shell has a maximum width of 1224px including its padding, centered in the iframe or viewport. The desktop grid has a flexible game column, a 280px sidebar, and a 24px gap. Scores sit above instructions in the sidebar. There is no sticky header or action covering content.

Breakpoints are `65rem`, `49rem`, and `27rem`:

| Width | Implemented change |
| --- | --- |
| Above 65rem | 48px shell padding, 280px sidebar, 480px playfield |
| At/below 65rem | 28px padding, 250px sidebar, 20px gap; header secondary tagline is hidden |
| At/below 49rem | Single column, 640px maximum shell, 24px padding; scores move above the game; instructions form three columns; field is 405px; icon targets become 44px |
| At/below 27rem | 16px padding; 365px field; instructions stack vertically; decorative chrome reduces; control row and header can wrap |

The playfield has matching rem-based minimum heights (30rem / 25.3125rem / 22.8125rem), so text enlargement grows the field and keeps status text above the controls. Score groups wrap rather than splitting their digits. A storage-denied notice remains visible even where the ordinary saved-score caption is hidden.

The renderer maps the available canvas to a 600-unit game width and scales its height to fit. Game geometry and difficulty do not depend on viewport width. Camera tracking keeps the newest floors in view. Device pixel ratio is capped at 2. Reflow was checked at 320, 360, 600, 800, and 1200px; screenshots were inspected at 360 and 1200px. A 360px view with 200% root font size was also inspected, separately from native browser zoom, which was not tested.

## Elevation & Depth

The interface is flat: no shadows, blur, or entrance effects. Dark tonal layers and 1px structural borders separate areas. The Canvas blocks have top and side faces for isometric depth. Pause and game-over messages use an opaque surface so the moving scene cannot reduce text legibility. They are inline status panels, not modals: no focus trap or dismissal dialog is introduced.

## Shapes

Game and score cards use 8px radii. Buttons use 4px; status panels use 6px; keycaps use 3px. Crane geometry, gridlines, and block corners are square. Interface icons use a single outline style with round caps/joins, typically 1.6px stroke and 1.9px in the primary button. The game card clips artwork; the playfield focus ring is inset so it remains visible.

## Components

All markup patterns live in `web/index.html`; these are native elements, not exported framework components.

| Pattern | Classes / controller | Behavior |
| --- | --- | --- |
| Wordmark | `.wordmark` | Original layered-block SVG and text; native link to the main game |
| Game toolbar | `.game-toolbar`, `.icon-button` | Sound toggle with pressed state; pause/resume button, disabled before play and after a miss |
| Playfield | `.playfield`, `Renderer` | Native button around an aria-hidden canvas; click/tap/Space/Enter uses the same game action |
| Primary action | `.primary-button`, `activate()` | Start building → Drop block → Resume building / Build again; duplicate drops rejected while a block falls |
| Status panel | `.scene-message.is-status`, `update()` | Ready, pause, and end text; paused/end states have an opaque backing |
| Score card | `.score-card`, `update()` | Current and best values; local storage fallback; current score resets on replay |
| Instructions | `.notes-card`, `#game-instructions` | Three numbered instructions; responsive columns/rows |
| Live result | `#announcer`, `announce()` | Stable polite region for score, pause, resume, and end-of-run messages |

Keyboard focus uses a 3px outline with 4px offset, except the playfield's −5px inset. Tab follows native document order; P toggles pause, Escape pauses a running game, and Space starts/drops/resumes/restarts unless another native control has focus. Losing window focus or hiding the document pauses the run.

Hover only applies on hover-capable devices. Optional control transitions are 150ms with `cubic-bezier(.2, 0, 0, 1)` and a 0.96 press scale. Reduced motion disables these and the falling offcut effect. The user-started swing/drop movement remains essential to the timing game. There is no motion before starting; ready and paused scenes are redrawn only when needed. Sound starts muted and uses a local Web Audio oscillator after explicit activation.

## Do's and Don'ts

- Reuse semantic color tokens, the shell, the spacing rhythm, and native controls.
- Give a view one filled yellow primary action. Use outlined secondary buttons.
- Keep crucial game state in HTML as well as the drawing. Preserve focus and clear result text.
- Preserve the dark blue grid and yellow active block; do not add remote art, web fonts, analytics, wallets, or network-dependent features.
- Keep platform text enlargement, small-screen wrapping, and paused-state legibility when changing copy.

For an additional static view, start with the existing shell and semantic tokens, add a proper heading and native actions, and keep navigation within the single-page/hash architecture unless a separate static file is intentionally exported. Rebuild with the relative Vite base and repeat the responsive and keyboard checks.
