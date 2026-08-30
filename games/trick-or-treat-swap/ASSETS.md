# Assets — Trick or Treat Swap

Per-game asset inventory for the Halloween swap-3. See `docs/assets.md` for the
workflow (imagegen → downscale to 2× display size → WebP → import from
`src/assets/**`). No art exists yet; every generated row below is **todo**.

## Style block

> Paste verbatim into every imagegen prompt for this game.

Chunky cartoon Halloween game art, flat 2D vector-style illustration with soft
shadows and thick rounded outlines, big readable silhouettes. Deep night
palette: midnight indigo `#1a1033`, shadow plum `#3b1f5e`, moonlit lavender
`#8b7cc4`; warm accents: pumpkin orange `#ff8a2a`, candy corn yellow `#ffd23f`,
candle-lit warm glow highlights. Slight glossy sheen on candy-like objects.
No photorealism, no harsh black outlines, no text baked into images.

## Sprite guidelines

- Tiles and power-ups: generate at `1024x1024`, `background: "transparent"`,
  subject fills the frame with a small margin; downscale to ≤ 256 px (2× the
  ~128 px cell size), WebP with alpha, ≤ 80 KB each.
- Backgrounds / map strips: `2048x2048` (orientation-agnostic, cover-crop) or
  `1152x2048` (portrait); ≤ 2048 px wide, ≤ 250 KB.
- UI chrome (buttons, HUD, moves counter, stars): code-drawn SVG/canvas, never
  generated.
- After the first tile is approved, chain every other tile off it via
  `edit` with "match the art style of the reference image exactly".

## Inventory

Tiles — 6 match colors (epic 9pbwcw):

| File | Prompt | Ref | Status |
| --- | --- | --- | --- |
| `src/assets/sprites/tile-pumpkin.webp` | todo | — | todo |
| `src/assets/sprites/tile-ghost.webp` | todo | — | todo |
| `src/assets/sprites/tile-skull.webp` | todo | — | todo |
| `src/assets/sprites/tile-bat.webp` | todo | — | todo |
| `src/assets/sprites/tile-candy.webp` | todo | — | todo |
| `src/assets/sprites/tile-potion.webp` | todo | — | todo |

Power-ups:

| File | Prompt | Ref | Status |
| --- | --- | --- | --- |
| `src/assets/sprites/power-broom.webp` | todo | first tile | todo |
| `src/assets/sprites/power-pumpkin-bomb.webp` | todo | first tile | todo |
| `src/assets/sprites/power-cauldron.webp` | todo | first tile | todo |
| `src/assets/sprites/power-little-ghost.webp` | todo | first tile | todo |

Combo FX: prefer code-driven particles/flashes; only generate a sprite if a
combo needs one. Obstacles — cobweb (1–3 layer overlay), gravestone, cursed
ice, lock/cage, slime: same style, generated when the obstacle tickets land.

| File | Prompt | Ref | Status |
| --- | --- | --- | --- |
| `src/assets/sprites/obstacle-cobweb-1.webp` … `-3.webp` | todo | first tile | todo |
| `src/assets/sprites/obstacle-gravestone.webp` | todo | first tile | todo |
| `src/assets/sprites/obstacle-ice.webp` | todo | first tile | todo |
| `src/assets/sprites/obstacle-lock.webp` | todo | first tile | todo |
| `src/assets/sprites/obstacle-slime.webp` | todo | first tile | todo |

Characters & world:

| File | Prompt | Ref | Status |
| --- | --- | --- | --- |
| `src/assets/sprites/kid-avatar.webp` | todo | — | todo |
| `src/assets/bg/alley-ch1.webp` … `alley-ch6.webp` (one per chapter) | todo | — | todo |
| `src/assets/sprites/door-closed.webp`, `door-open.webp` | todo | alley ch1 | todo |
| `src/assets/sprites/boss-<chapter>.webp` (6 portraits) | todo | — | todo |

Fixed literal paths (not fingerprinted): `public/og-image.webp` (1200×640),
PWA icon `1024x1024` — todo.

Code-drawn (no imagegen): HUD buttons, moves/treat-bag counter chrome, star
icons, lampposts, fog, particles, board grid.
