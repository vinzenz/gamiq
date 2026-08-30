# Assets — Trick or Treat Swap

Per-game asset inventory for the Halloween swap-3. See `docs/assets.md` for the
workflow (imagegen → downscale to 2× display size → WebP → import from
`src/assets/**`). Board art (tiles, power-ups, obstacles, combo FX) is **done**
and lives in `assets/sprites/` — import it from `src` with
`../../assets/sprites/<file>.webp`. Meta art (map strips, kid avatar, doors,
bosses, treat bag) is **done** too and lives in `assets/meta/` — import it the
same way (`../../assets/meta/<file>.webp`) when wiring the map screen.

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

How the board art was made (ToTS-nf8phv): every sprite was generated at
`1024x1024` with `background: "transparent"`, using the style block above as the
prompt prefix. `tile-pumpkin` is the style anchor (quality `high`); every other
row was chained off a reference with *"Match the art style of the reference
image exactly… same rendering, line weight and framing (single centered subject
filling ~80% of the frame)"* plus the per-row subject (quality `medium`). Several
edits came back with a flat baked background; a follow-up edit with *"keep this
subject exactly unchanged, only replace the background with real alpha-0
transparency"* fixed them — reuse that trick when extending the set. Post-process:
`magick in.png -resize 256x256 -background none -gravity center -extent 256x256
-define webp:alpha-quality=100 -quality 88 out.webp` → 256×256 square (2× the
~128 px cell), subject centered, ≤ 40 KB each.

Tiles — 6 match colors (epic 9pbwcw):

| File | Subject (after style block / reference chain) | Ref | Status |
| --- | --- | --- | --- |
| `assets/sprites/tile-pumpkin.webp` | cute jack-o'-lantern tile: plump round orange pumpkin, curled green stem, simple happy carved face glowing candle-lit yellow | — | done |
| `assets/sprites/tile-ghost.webp` | chubby pale icy-blue ghost, wavy bottom edge, big dark eyes, stubby raised arms, soft moonlit glow | tile-pumpkin | done |
| `assets/sprites/tile-skull.webp` | rounded bone-white skull, big dark eye sockets lit warm from inside, friendly toothy grin | tile-pumpkin | done |
| `assets/sprites/tile-bat.webp` | chubby purple bat (shadow plum body, lavender wing membranes), big round ears, rounded spread wings, tiny fangs | tile-pumpkin | done |
| `assets/sprites/tile-candy.webp` | wrapped pink bonbon, darker pink swirl stripes, twisted wrapper ends, strong glossy sheen | tile-pumpkin | done |
| `assets/sprites/tile-potion.webp` | round glass potion bottle, cork stopper, glowing green bubbling witch's brew, rising bubbles | tile-pumpkin | done |

Power-ups:

| File | Subject (after style block / reference chain) | Ref | Status |
| --- | --- | --- | --- |
| `assets/sprites/power-broom.webp` | witch's broom placed diagonally, carved spiral handle tip, glowing candy-corn yellow straw bound with plum band, golden sparkles | tile-pumpkin | done |
| `assets/sprites/power-pumpkin-bomb.webp` | angry carved pumpkin (same family as tile-pumpkin), plum bomb collar, lit sparking fuse | tile-pumpkin | done |
| `assets/sprites/power-cauldron.webp` | round plum cauldron on three legs, bubbling iridescent rainbow brew overflowing, steam wisps, yellow glow | tile-pumpkin | done |
| `assets/sprites/power-little-ghost.webp` | smaller, rounder ghost helper wearing a tiny plum wizard hat with a candy-corn star, holding up a glowing sparkle | tile-ghost | done |

Combo FX: code-drawn per `docs/assets.md` (AI sprite sheets don't hold grid
alignment; motion stays procedural and tiny). No FX sprites generated or needed:

| Effect | Treatment (canvas primitives + particles) |
| --- | --- |
| Broom activation | bright streak + sparkle trail across the row/column |
| Pumpkin bomb (3×3 / 5×5) | radial shockwave ring, orange flash, ember particles, screen shake |
| Cauldron color clear | per-tile pop in rainbow hues + brief rainbow flash |
| Little ghost flight | tween the ghost sprite to the objective + pop ring on arrival |
| All combos | same primitives at larger radius/duration — no extra art |

Obstacles:

| File | Subject (after style block / reference chain) | Ref | Status |
| --- | --- | --- | --- |
| `assets/sprites/obstacle-cobweb-1.webp` | light single-layer square web overlay: thin pale silk spokes + 2–3 rings, open gaps, dew sparkles | tile-pumpkin | done |
| `assets/sprites/obstacle-cobweb-2.webp` | same web + second layer: more threads, extra rings, thicker silk, corner wisps | cobweb-1 | done |
| `assets/sprites/obstacle-cobweb-3.webp` | heavy three-layer web: dense rings, puffy strands, tangled corner cocoon wisps, few gaps left | cobweb-2 | done |
| `assets/sprites/obstacle-gravestone.webp` | rounded-top grey gravestone, engraved crescent moon (no text), small crack, dark grass tufts at base | tile-pumpkin | done |
| `assets/sprites/obstacle-ice.webp` | translucent pale-blue cursed ice cube, frosted edges, glowing cracks, frozen sparkles inside | tile-pumpkin | done |
| `assets/sprites/obstacle-lock.webp` | openwork plum birdcage dome with see-through bar gaps, shiny golden padlock with keyhole at the front | tile-pumpkin | done |
| `assets/sprites/obstacle-slime.webp` | glossy yellow-green goo mound, drippy rounded drips, surface bubbles, sickly glow | tile-potion | done |

How the meta art was made (ToTS-0w0fyr): same pipeline as the board set.
`alley-ch1` (Maple Lane) is the anchor — generated fresh at 1152×2048 with the
style block, quality `high`; the model returned its own 9:16 (941×1672), which
is kept (≤ 2048 px wide, well under the 250 KB budget after WebP q85). The other
five strips were edit-chained off it with *"Match the art style of the reference
image exactly — same palette, same soft shadows, same rendering, same vertical
composition with scenery on the left and right edges and a calm dark center
column"* plus the per-chapter scene (quality `medium`). Character sprites chain
off the board anchor `tile-pumpkin` (`kid-idle`, `boss-vampire`) or `tile-candy`
(`treat-bag`), the rest off their set sibling. All sprites generated at
`1024x1024` transparent, then the board pipeline: `-resize 256x256 -background
none -gravity center -extent 256x256 -define webp:alpha-quality=100 -quality 88`.
The fake-baked-background failure hit harder here than on the board set:
`door-closed`, `door-open`, `kid-walk` and `kid-win` all came back with a
*painted* checkerboard (100 % opaque). The recorded fix edit ("keep this subject
exactly unchanged, only replace the background with real alpha-0 transparency")
cleared `door-closed`, `door-open` and `kid-walk`; `kid-win` resisted two fix
passes and a `gpt-image-1.5` retry, and was finally keyed deterministically from
its flat-white version: corner flood-fills (`-alpha set -fuzz 12% -fill none
-draw "alpha 10,10 floodfill" ×4 corners`) — background white is one connected
region, enclosed whites (eye glints, teeth) survive. Verify every sprite with
`-alpha extract -format '%[fx:100*mean]'` (< 100 = real alpha).

Meta art — map strips, one per chapter (`src/meta/chapters.ts` order):

| File | Subject (after style block / reference chain) | Ref | Status |
| --- | --- | --- | --- |
| `assets/meta/alley-ch1.webp` | Maple Lane: cozy suburban Halloween street at night, cute houses with lit windows and picket fences lining both edges, orange maple trees, big full moon, thin mist, calm dark center column | — | done |
| `assets/meta/alley-ch2.webp` | Graveyard Path: leaning gravestones and stone crosses along both edges, bare twisted trees, wrought-iron fence sections, cold pale-blue moonlight, ground mist | alley-ch1 | done |
| `assets/meta/alley-ch3.webp` | Witch's Hollow: cursed forest of gnarled leafless trees crowding both edges, glowing green witch-fire wisps, hanging moss, toadstools, moody green darkness | alley-ch1 | done |
| `assets/meta/alley-ch4.webp` | Pumpkin Patch: rows of plump pumpkins and carved glowing jack-o'-lanterns along both edges, crooked wooden fence, distant barn silhouette, warm orange glow | alley-ch1 | done |
| `assets/meta/alley-ch5.webp` | Cemetery Hill: hilltop cemetery seen from below, abandoned chapel silhouette on the crest, scattered gravestones and crosses on the slope, huge low moon | alley-ch1 | done |
| `assets/meta/alley-ch6.webp` | Castle Dracula Alley: gothic vampire castle with red-lit windows filling the top, iron gates, gargoyles and dead bushes along both edges, bats, red moon | alley-ch1 | done |

House/door nodes (map-screen `#drawHouse` swap-ins; boss houses scale the same
art + keep the code-drawn flag):

| File | Subject (after style block / reference chain) | Ref | Status |
| --- | --- | --- | --- |
| `assets/meta/door-closed.webp` | small cute suburban Halloween house straight-on: steep dark indigo roof, two warm-lit windows, closed brown door, doorstep pumpkin, lantern, ground shadow | alley-ch1 | done |
| `assets/meta/door-open.webp` | same house exactly, only the door swung open onto a warm candle-lit interior with a candy bowl, glow spilling over the doorstep | door-closed | done |

Kid avatar — the swap-3 hero in his pumpkin costume (bob/walk frames + win
moment; walking/bobbing stays procedural in code):

| File | Subject (after style block / reference chain) | Ref | Status |
| --- | --- | --- | --- |
| `assets/meta/kid-idle.webp` | kid in a chubby round pumpkin costume (tile-pumpkin family) with green stem cap, happy face, striped socks, waving, brown treat bag in hand | tile-pumpkin | done |
| `assets/meta/kid-walk.webp` | same kid exactly, mid-stride walking step, arms swinging, treat bag in hand | kid-idle | done |
| `assets/meta/kid-win.webp` | same kid exactly, victory cheer — both arms up, treat bag held high, sparkles and floating candies | kid-idle | done |

Boss portraits — head-and-shoulder busts clutching a candy sack, one per
chapter finale (chapter order = `src/meta/chapters.ts`):

| File | Chapter · boss | Subject (after reference chain) | Ref | Status |
| --- | --- | --- | --- | --- |
| `assets/meta/boss-werewolf.webp` | 1 · Maple Lane | grumpy werewolf, grey-brown fur, fanged snout, torn plum shirt, greedy narrowed eyes | boss-vampire | done |
| `assets/meta/boss-skeleton.webp` | 2 · Graveyard Path | bony skeleton in a tattered purple hood shroud, warm glow in the eye sockets, toothy grin | boss-vampire | done |
| `assets/meta/boss-witch.webp` | 3 · Witch's Hollow | green-skinned witch, crooked plum hat with candy-corn buckle, round spectacles, gap-toothed grin | boss-vampire | done |
| `assets/meta/boss-scarecrow.webp` | 4 · Pumpkin Patch | stitched burlap-sack scarecrow, button eyes, straw tufts, crow on the shoulder, patchwork shirt | boss-vampire | done |
| `assets/meta/boss-mummy.webp` | 5 · Cemetery Hill | grumpy mummy in sage bandages, one loose end drifting, golden eye glaring through the wrappings | boss-vampire | done |
| `assets/meta/boss-vampire.webp` | 6 · Castle Dracula Alley | greedy vampire count, widow's peak, smug one-fang grin, red-lined high collar | tile-pumpkin | done |

Goal & reward icon:

| File | Subject (after style block / reference chain) | Ref | Status |
| --- | --- | --- | --- |
| `assets/meta/treat-bag.webp` | brown paper trick-or-treat bag with rolled rim, overflowing with candy corn, wrapped bonbons (tile-candy family) and a lollipop, yellow glow, sparkles | tile-candy | done |

Fixed literal paths (not fingerprinted): `public/og-image.webp` (1200×640),
PWA icon `1024x1024` — todo.

Code-drawn (no imagegen): HUD buttons, moves/treat-bag counter chrome, star
icons, lampposts, fog, particles, board grid — unchanged from the board ticket;
the map screen keeps animating its own lampposts/fog over the strips, so the
backdrops deliberately contain no path, doors or characters.
