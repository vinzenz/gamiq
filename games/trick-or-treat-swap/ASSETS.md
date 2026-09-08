# Assets — Trick or Treat Swap

## House and road refresh, 2026-09-08

Generated with the built-in imagegen tool. The map uses these WebP files.
The house images are 320 × 320 pixels. The road texture is 256 × 256 pixels,
shown at 42% scale in a repeating canvas pattern. Chapter scenes overlap by
200 pixels and fade into the next scene. Each scene is drawn once per chapter;
chapter names have no wooden panel.

### Final prompts

- `assets/meta/house-cottage-closed.webp`: Use case: stylized-concept. Asset type: transparent game map house sprite. Chunky cartoon Halloween game art, flat 2D vector-style illustration with soft shadows and thick rounded outlines, big readable silhouettes. Deep night palette: midnight indigo #1a1033, shadow plum #3b1f5e, moonlit lavender #8b7cc4; warm accents: pumpkin orange #ff8a2a, candy corn yellow #ffd23f, candle-lit warm glow highlights. Slight glossy sheen on candy-like objects. No photorealism, no harsh black outlines, no text baked into images. Primary request: Reimagine the level houses as a premium polished storybook Halloween cottage. One complete charming cottage, front-facing with a little visible roof depth, sweeping curved violet shingle roof, chimney, carved timber porch, rounded plum stone walls, glowing amber windows, CLOSED arched oak front door centered, small pumpkin lanterns and tiny mossy doorstep. Rich hand-painted material shading within clean rounded outlines, readable at 120 pixels. Square canvas, house fills 90 percent, fully framed. Truly transparent background, no backdrop, no text, no border, no floor tile.
- `assets/meta/house-cottage-open.webp`: Use case: precise-object-edit. Asset type: transparent game map house sprite. Chunky cartoon Halloween game art, flat 2D vector-style illustration with soft shadows and thick rounded outlines, big readable silhouettes. Deep night palette: midnight indigo #1a1033, shadow plum #3b1f5e, moonlit lavender #8b7cc4; warm accents: pumpkin orange #ff8a2a, candy corn yellow #ffd23f, candle-lit warm glow highlights. Slight glossy sheen on candy-like objects. No photorealism, no harsh black outlines, no text baked into images. Edit target: reference cottage. Change only the central front door: open the wooden door inward to reveal warm golden light inside. Keep the entire house, roof, windows, pumpkins, steps, camera, proportions and exact framing unchanged. Preserve real transparent alpha background. No extra objects or text. Reference: the generated closed cottage. The edit returned a painted checkerboard. During WebP export, the original closed cottage alpha channel was copied to this image and inset by 8 source pixels to remove checkerboard edge pixels. Two further transparency edits failed and were discarded.
- `assets/meta/road-cobblestone.webp`: Use case: stylized-concept. Asset type: seamless tileable road surface texture for a winding game map path. Chunky cartoon Halloween game art, flat 2D vector-style illustration with soft shadows and thick rounded outlines, big readable silhouettes. Deep night palette: midnight indigo #1a1033, shadow plum #3b1f5e, moonlit lavender #8b7cc4; warm accents: pumpkin orange #ff8a2a, candy corn yellow #ffd23f, candle-lit warm glow highlights. Slight glossy sheen on candy-like objects. No photorealism, no harsh black outlines, no text baked into images. Primary request: premium storybook cobblestone paving, top-down orthographic, edge-to-edge evenly sized irregular rounded lavender-grey stones, subtle violet crevices, softly bevelled worn surfaces, a few tiny moss flecks. Quiet restrained contrast so small characters remain readable. Uniform diffuse moonlight, no directional perspective, no road edges, no lane markings, no objects, no text, no vignette, no border. Seamless on all four sides. Square image.

Validation: inspected the generated art and optimized house cutout. Live browser
review was unavailable in this session.


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

## Reimagine pack: smooth mobile-first road + map strip pass (v2)

Use this pack when generating a visual refresh. Keep the style block above plus these
constraints for every call:

- Same 16-bit cartoon feel, thick rounded shapes, glossy candy material, no extra text.
- Use vertical/portrait framing for path scenes.
- Keep subject fully framed with ~10% safe margin.
- Export with transparent alpha for character/sprite rows.

### Board and road scene renders

Use case: `stylized-concept`

| File | Primary request (new prompt) | Reference |
| --- | --- | --- |
| `assets/sprites/tile-pumpkin.webp` | `Prompt: Cute jack-o-lantern tile icon, centered, round pumpkin body, curled green stem, carved happy face lit warm yellow, soft glossy finish, thick rounded outlines, gentle curved bevel, clean 2D game-art style. High local contrast, smooth shading, no hard shadows.` | Use current file as style anchor |
| `assets/sprites/tile-ghost.webp` | `Prompt: Friendly ghost tile icon, chubby, round head, wavy bottom silhouette, two dark pupil eyes, small playful fangs, subtle blue candy-light aura, thick rounded outlines. Keep palette dark indigo/candle glow only, smooth and cute.` | tile-pumpkin |
| `assets/sprites/tile-skull.webp` | `Prompt: Cute skull tile icon, soft bone-white with dark-cavity eyes, small warm-yellow smile glow, rounded cheek lines, thick rounded outlines, candy-game style, glossy finish, center-framed, no gore.` | tile-pumpkin |
| `assets/sprites/tile-bat.webp` | `Prompt: Friendly purple bat tile icon, broad rounded wings, compact and chubby body, cute face with tiny rounded fangs, strong color contrast and clean edges, halloween candy palette, glossy paper-like surface, centered.` | tile-pumpkin |
| `assets/sprites/tile-candy.webp` | `Prompt: Wrapped pink candy bonbon tile icon, twisted wrapper ends, glossy candy skin, small sugar sparkles, warm highlight, thick rounded outline, playful, centered character, no text.` | tile-pumpkin |
| `assets/sprites/tile-potion.webp` | `Prompt: Round potion tile icon, clear glass bottle, cork stopper, glowing green brew with tiny bubbles, tiny candy bubbles around rim, thick outlines, soft highlights, cute spooky cartoon, centered.` | tile-pumpkin |
| `assets/sprites/power-broom.webp` | `Prompt: Cartoon witch broom power tile icon, diagonal composition, sweet carved spiral handle cap, candy-corn yellow straw tied with plum ribbon, gentle sparkle trail, glossy wood texture, thick outlines, clean edges.` | tile-pumpkin |
| `assets/sprites/power-pumpkin-bomb.webp` | `Prompt: Angry pumpkin bomb tile icon, bold round jack-o-lantern face, candy-plum fuse collar, lit spark core, warning glow aura, glossy candy-shell, centered object, thick line art and soft shading.` | tile-pumpkin |
| `assets/sprites/power-cauldron.webp` | `Prompt: Round round-plum cauldron power icon, three curved legs, iridescent brew spilling from rim, bright steam wisps, candy spark particles, cute rounded edges, polished 2D cartoon finish.` | tile-pumpkin |
| `assets/sprites/power-little-ghost.webp` | `Prompt: Tiny round ghost helper icon, plum wizard hat with candy-corn star, tiny hand holding candy sparkle, cute smile, smooth candy-gloss surfaces, thick rounded outlines, centered for sprite use.` | tile-ghost |
| `assets/sprites/obstacle-cobweb-1.webp` | `Prompt: Subtle spooky cobweb sprite, single-layer square web overlay, pale silk threads, open gaps, soft dew sparkle points, no hard edges, thick rounded frame, centered.` | tile-pumpkin |
| `assets/sprites/obstacle-cobweb-2.webp` | `Prompt: Cobweb sprite, layer 2 variant, denser thread network, extra rings, corner wisps, open gaps kept for readability, soft white glow, same style and line width as cobweb-1.` | obstacle-cobweb-1 |
| `assets/sprites/obstacle-cobweb-3.webp` | `Prompt: Cobweb sprite, layer 3 dense and tangled variant, three-thread complexity, puffy strands, few gaps only, corner cocoons, same style, color and contrast as cobweb-2.` | obstacle-cobweb-2 |
| `assets/sprites/obstacle-gravestone.webp` | `Prompt: Cute gravestone obstacle icon, rounded-top stone, engraved crescent moon, tiny base grass tufts, soft cracks and chips, no texture noise, thick clean outlines, centered object, candy game art.` | tile-pumpkin |
| `assets/sprites/obstacle-ice.webp` | `Prompt: Translucent cursed ice cube obstacle icon, frost borders, glowing internal cracks, suspended sparkle ice shards, soft blue lighting, glossy edge, thick rounded edges, centered sprite. Keep transparent background.` | tile-pumpkin |
| `assets/sprites/obstacle-lock.webp` | `Prompt: Birdcage lock obstacle icon, openwork dome, bar gaps visible, shiny golden padlock with front keyhole, magical lock bolts, clean 2D cartoon style, rounded geometry, centered.` | tile-pumpkin |
| `assets/sprites/obstacle-slime.webp` | `Prompt: Gooey yellow-green cursed slime obstacle icon, rounded drips, bubbly surface, sickly glow, glossy wet texture, rounded edges, centered, thick outline style.` | tile-potion |

### World strip and character prompts

Use case: `illustration-story`

| File | Primary request (new prompt) | Reference |
| --- | --- | --- |
| `assets/meta/alley-ch1.webp` | `Prompt: Smooth flowing alley scene, cozy suburban Halloween street at night, path in center with soft perspective, cute houses both sides, picket fences, full moon, thin mist, dark rounded shapes, calm atmosphere, clean candy-game style.` | Style block |
| `assets/meta/alley-ch2.webp` | `Prompt: Smooth flowing graveyard street scene, grave tops and mossy crosses hugging road edges, gentle curved path center, cool blue moonlight, drifting fog ribbons, low contrast textures, rounded cartoon look.` | alley-ch1 |
| `assets/meta/alley-ch3.webp` | `Prompt: Smooth flowing witch forest alley, dark trees and hanging moss on both sides, glowing green witch-fire wisps near corners, path in calm center column, gentle perspective curve, cute spooky cartoon style, no harsh contrast.` | alley-ch1 |
| `assets/meta/alley-ch4.webp` | `Prompt: Smooth flowing pumpkin patch road, low fence lines and carved lantern pumpkins along edges, warm orange ambient glow, gentle hills in path background, no hard perspective jumps, rounded playful silhouette forms, halloween candy palette.` | alley-ch1 |
| `assets/meta/alley-ch5.webp` | `Prompt: Smooth flowing cemetery path, grave mounds on side edges, chapel top in distance, huge low moon, mist in lower valley, path center calm and curved, child-friendly spooky cartoon style.` | alley-ch1 |
| `assets/meta/alley-ch6.webp` | `Prompt: Smooth flowing castle alley, gothic gates and roof silhouettes on edges, dead bushes, bats above edge path, red-moon hue accents, calm central road lane, rounded cartoon proportions, premium 2D art, no noise artifacts.` | alley-ch1 |
| `assets/meta/door-closed.webp` | `Prompt: Cute suburban Halloween house front, closed front door, pumpkin doorstep, warm lit windows, dark slate roof, soft ground shadow, clean rounded corners. Keep same style and color system.` | alley-ch1 |
| `assets/meta/door-open.webp` | `Prompt: Same house as closed door asset, exactly same framing and materials, front door open wide with candle-lit interior glow spilling outward, warm candy-gold spill, same proportions and palette, only change is open door state.` | door-closed |
| `assets/meta/treat-bag.webp` | `Prompt: Friendly brown paper candy bag icon, rolled rim, top tied, overflowing with wrapped candy and candy-corn, warm glow and floating sparkles, cute rounded paper folds, transparent background.` | tile-candy |
| `assets/meta/kid-idle.webp` | `Prompt: Chubby kid character in pumpkin costume, friendly wide face, green stem cap, striped socks, brown treat bag in one hand, full-body framed at chest-to-feet, soft shading, rounded cartoon style, transparent background.` | tile-pumpkin |
| `assets/meta/kid-walk.webp` | `Prompt: Same kid as kid-idle, exact face, stem and costume same, mid-stride step pose, one hand raised with candy bag, smooth motion bounce, transparent background, keep style exactly identical.` | kid-idle |
| `assets/meta/kid-win.webp` | `Prompt: Same kid as kid-idle, exact proportions and costume, victory cheer pose, both arms up, candy bag lifted high, sparkles and candy bits around, transparent background.` | kid-idle |
| `assets/meta/boss-vampire.webp` | `Prompt: Friendly spooky vampire boss portrait in pumpkin district, purple cloak and red-lined collar, greedy but cute smile, dark purple skin tone, glowing eyes, head-and-shoulder framing, centered bust, thick rounded line style.` | tile-pumpkin |
| `assets/meta/boss-werewolf.webp` | `Prompt: Cute gremlin-like werewolf boss portrait, grey-brown fur, fanged snout, torn plum shirt, greedy narrowed eyes, same painterly cartoon treatment as boss-vampire, centered bust.` | boss-vampire |
| `assets/meta/boss-skeleton.webp` | `Prompt: Cute stitched skeleton boss portrait, tattered purple hood, warm eye-glow, strong jawline and toothy grin, clean vector-cartoon edges, same lighting and palette as boss-werewolf.` | boss-vampire |
| `assets/meta/boss-witch.webp` | `Prompt: Friendly witch boss portrait, green skin, crooked plum hat, candy-corn buckle, spectacles with reflections, soft grin and gap teeth, same composition as other boss portraits.` | boss-vampire |
| `assets/meta/boss-scarecrow.webp` | `Prompt: Cute stitched scarecrow boss portrait, ragged burlap body, straw tufts, crow on shoulder, warm scarf, same format as other boss portraits, rounded corners, no photorealism.` | boss-vampire |
| `assets/meta/boss-mummy.webp` | `Prompt: Friendly mummy boss portrait, sage bandages with loose edge, glowing gold eye, same head-and-shoulder style and warm candle contrast as other bosses, clean cartoon look.` | boss-vampire |

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
