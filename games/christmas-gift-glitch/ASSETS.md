# The Great Gift Glitch assets

## Style block

Whimsical 2D storybook game art. Gouache-painted paper cutouts with soft navy outlines,
rounded silhouettes, subtle handmade texture, and warm golden winter light. Palette:
cranberry `#C83E4D`, pine `#2B8A6E`, gold `#F5C451`, ice blue `#7CC9E8`, cream `#FFF5DB`.
Joyful, funny, and child-safe. No text, logos, watermarks, photorealism, horror, or cropped edges.

All new images used the built-in imagegen tool. Transparent sprites were generated on transparent
backgrounds. Where imagegen drew a checkerboard, ImageMagick removed only the edge-connected gray
background before WebP conversion. Runtime sprites are 384 px. Character and boss art are 512 px.

| File | Final prompt summary | Reference | Status |
| --- | --- | --- | --- |
| `assets/sprites/tile-bell.webp` | Single plump red and gold jingle bell with holly, centered mobile match-3 token, transparent background, style block. | none | shipped |
| `assets/sprites/tile-snowflake.webp` | Single chunky ice-blue six-point snowflake with cream sparkle, transparent background, style block. | `tile-bell.webp` | shipped |
| `assets/sprites/tile-cookie.webp` | Single round smiling gingerbread cookie with cream icing and red cheeks, transparent background, style block. | `tile-bell.webp` | shipped |
| `assets/sprites/tile-mitten.webp` | Single plump purple knitted mitten with cream zigzag and gold star patch, transparent background, style block. | `tile-bell.webp` | shipped |
| `assets/sprites/tile-candy-cane.webp` | Single chunky pink and cream candy cane with a small ribbon, transparent background, style block. | `tile-bell.webp` | shipped |
| `assets/sprites/tile-present.webp` | Single pine-green present with cream ribbon and gold star tag, transparent background, style block. | `tile-bell.webp` | shipped |
| `assets/sprites/power-rocket-sleigh.webp` | Toy rocket-sleigh with cranberry body, gold runners, and ice-blue speed stripe, transparent background, style block. | `tile-bell.webp` | shipped |
| `assets/sprites/power-cracker.webp` | Chunky cranberry-and-gold Christmas cracker with cream starburst, transparent background, style block. | `tile-bell.webp` | shipped |
| `assets/sprites/power-snow-globe.webp` | Aurora snow globe with a gold clockwork Christmas tree and pine base, transparent background, style block. | `tile-bell.webp` | shipped |
| `assets/sprites/power-crumb-drone.webp` | Friendly round gingerbread delivery drone with gold propeller and teal satchel, transparent background, style block. | `tile-bell.webp` | shipped |
| `assets/sprites/obstacle-tinsel.webp` | Square tangle of pine garland, cranberry ribbon, and gold tinsel with an open center, transparent background, style block. | `tile-bell.webp` | shipped |
| `assets/sprites/obstacle-parcels.webp` | Compact pile of dented mis-sorted parcels with unreadable crossed tags, transparent background, style block. | `tile-bell.webp` | shipped |
| `assets/sprites/obstacle-wrapping-paper.webp` | Mischievous teal wrapping-paper blob with ribbon curls and silly eyes, transparent background, style block. | `tile-bell.webp` | shipped |
| `assets/meta/juni-and-crumb.webp` | Child inventor Juni and gingerbread robot Crumb waving from a toy bubble sleigh, transparent background, style block. | `tile-bell.webp` | shipped |
| `assets/meta/boss-wrap-9000.webp` | Malfunctioning teal wrapping robot with ribbon-spool arms, caught wrapping the moon, transparent background, style block. | `tile-bell.webp` | shipped |
| `assets/meta/sky-islands-map.webp` | Portrait North Pole sky islands with workshop roofs, cocoa cups, clockwork clouds, aurora, and open center for a route, style block. | `tile-bell.webp` | shipped |
| `assets/meta/sky-islands-map-v2.webp` | High-depth portrait North Pole sky islands with brighter edge details, deeper midnight shadows, and a calm central route corridor, style block. | `sky-islands-map.webp` | shipped |

`obstacle-ice.webp` and `obstacle-lock.webp` come from the original TOTS rule adapter. Their neutral
frost and lock shapes fit both themes. Text, map paths, level buttons, stars, snow, and all HUD art
are code-drawn for sharp scaling.

### Map background refresh

Generated with the built-in imagegen tool. The final WebP is 941 by 1672 pixels.

Final prompt:

> Use case: precise-object-edit. Asset type: portrait background for a vertical scrolling
> Christmas game map. Image 1 is the edit target and style anchor. Improve the background's
> game-map readability and visual depth while preserving its whimsical North Pole sky-island
> identity. Keep the same premium 2D storybook gouache illustration, soft navy outlines, rounded
> silhouettes, handmade texture, and warm golden winter light. Preserve the tall portrait layout
> and the large open central corridor for the game's winding level route. Move visual weight
> toward both side edges. Add more layered depth with small distant floating islands, clockwork
> clouds, snowy workshop roofs, gift parcels, cocoa details, and aurora light near the edges only.
> Deepen midnight blue shadows, brighten warm windows and gold details, and add clearer cool-to-warm
> depth separation. Use cranberry #C83E4D, pine #2B8A6E, gold #F5C451, ice blue #7CC9E8, and cream
> #FFF5DB. Keep the central 40 percent calm, low contrast, and free of focal objects because live
> path nodes and labels appear there. Keep all content inside the canvas. No text, letters,
> numbers, UI, route, path, level markers, characters, logos, watermark, photorealism, horror,
> black bands, or hard border.
