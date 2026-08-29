# Game art with imagegen

How we build visual assets for Gamiq games with the `imagegen` tool (gpt-image-2). Read this
before generating art for a game; keep per-game specifics in that game's `games/<slug>/ASSETS.md`.

## What imagegen is for — and what it isn't

**Generate with imagegen:**

- Backgrounds, parallax layers, skies, terrain, rooms
- Characters, creatures, vehicles, props, item sprites (with transparency)
- Textures (rock, wood, fabric, noise, patterns)
- Title/logo lockup art, hero art, OG/social preview images

**Do NOT generate — build in code instead:**

- UI icons, buttons, HUD chrome, cursors → SVG/CSS (crisp at every DPI, themeable)
- Simple shapes, gradients, glow effects, particles → drawn in canvas
- Any text that appears in the game → canvas/DOM text (never bake text into images:
  it blurs when scaled, can't be localized, and wastes bytes)
- Anything that must be pixel-perfect or deterministic

Rule of thumb: if the game scales/rotates/recolors it at runtime, a generated PNG/WebP works
great. If the DOM lays it out or it must align to a grid, build it in code.

## Workflow per asset

1. **Decide generate vs edit.** No reference → generate. Changing/deriving from an existing
   image → pass it via `edit` (up to 5 paths). Assume generate otherwise.
2. **Shape the prompt** as scene → subject → details → constraints. Short; only lines that
   materially help. Include the game's style block (below) for consistency.
3. **One `imagegen` call per asset.** Never batch distinct assets into one call.
4. **Validate** subject, style, composition, and invariants against the request.
5. **Iterate with a single targeted change** per call; restate invariants explicitly
   ("change only X; keep Y unchanged") — repeat them on every iteration to reduce drift.
6. **Post-process and commit** the optimized asset (see below), then record the final prompt
   in the game's `ASSETS.md`.

Generation is not reproducible (no seed control): the committed file plus its recorded prompt
*is* the source of truth. For follow-up tweaks, always edit the committed file — that carries
the style forward better than any prompt.

## Style consistency across a game's assets

This is the hard part of AI game art. Do it like this:

- Before the first asset, write a **style block** in the game's `ASSETS.md`: medium
  (e.g. "flat 2D vector-style illustration, soft shadows"), 4–6 color palette (hex), lighting
  mood, line treatment, and what to avoid (e.g. "no gradients, no outlines, no photorealism").
- Paste the style block verbatim into every prompt for that game.
- After the first asset is approved, pass it as an `edit` reference for every related asset:
  "Match the art style of the reference image exactly. Same palette, same line weight, same
  lighting. New subject: …". One reference per call is usually enough.
- Generate themed sets (all enemies, all tiles) in one sitting, chained off the same
  reference, while the style is fresh.

## Sizes that work (gpt-image-2 constraints)

Edges must be multiples of 16, max edge 3840, long:short ratio ≤ 3:1, 0.66–8.29 MP total.
Stick to these presets:

| Asset | Size | Notes |
| --- | --- | --- |
| Sprite / item / character | `1024x1024` | plenty; we downscale anyway |
| Wide background 16:9 | `2048x1152` | landscape full-screen |
| Tall background 9:16 | `1152x2048` | portrait full-screen |
| Square background (orientation-agnostic) | `2048x2048` | cover-crop in code |
| Icon / logo / PWA icon | `1024x1024` | |
| OG / social preview | `1200x640` | |
| Seamless texture | `1024x1024` | prompt "seamless, tileable, edge-to-edge pattern" and verify seams by tiling |

- Sprites: pass `background: "transparent"` and design the prompt so the subject fills the
  frame with a little margin (no floating heads, no cropped edges). If the model rejects
  transparency, retry with `model: "gpt-image-1.5"`.
- We cap devicePixelRatio at 2 in `resizeCanvasToDisplaySize()` — assets never need to be
  sharper than 2× their largest on-screen size.

## From output to committed asset

`imagegen` never overwrites — it writes a versioned sibling (`meteor-2.png`). So:

1. Always pass `out` pointing into the game's folder, e.g.
   `games/<slug>/src/assets/sprites/meteor.png`. Keep the best version, **delete rejects**
   before committing.
2. **Downscale to the real display size × 2** and convert to **WebP** (keeps alpha):
   sprites ≤ ~512 px, backgrounds ≤ ~2048 px wide. Targets: sprite ≤ ~80 KB,
   background ≤ ~250 KB, whole game ≤ ~10 MB — phones on mobile data have to download this.
   (Use `cwebp`/`sharp`/any converter; a `scripts/optimize-images.mjs` can be added later.)
3. Put run-time assets in `games/<slug>/src/assets/**` and `import` them so Vite fingerprints
   (hashes) their URLs for caching. Use `public/` only for fixed literal paths
   (e.g. `og-image.webp`, PWA icons).
4. Naming: kebab-case, semantic, by folder — `src/assets/sprites/meteor-brown.webp`,
   `src/assets/bg/forest-far.webp`. Never `image-2.png`, `final_final.webp`.
5. Preload only what the first screen needs; Vite handles the rest lazily.

## Animation

- **Default to code-driven motion**: position/rotation/scale tweens, squash & stretch,
  procedural particles. Cheap, tiny, smooth — usually no extra art needed.
- If you need frames: generate one base image, then use `edit` per pose
  ("same character exactly, only the arm raised"). Check alignment between frames in the game.
- **Do not ask for sprite-sheet grids** — AI models don't hold grid alignment; you'll get
  unusable sheets. One image per frame, packed later if ever needed.

## Quota discipline

Every `imagegen` call consumes the Codex image quota. Be deliberate:

- Explore compositions at `quality: "low"`, then regenerate the winner once at
  `"high"` (or `"medium"` for flat/simple art).
- Prefer one targeted `edit` over a fresh `generate` for small fixes.
- Don't generate "nice to have" variants nobody asked for.

## Per-game `ASSETS.md`

Each game that ships generated art gets a `games/<slug>/ASSETS.md` with:

- The **style block** (paste-ready, verbatim into prompts)
- One row per asset: file → prompt used → reference image (if any) → status

That table is what lets us extend the set later with the same look.
