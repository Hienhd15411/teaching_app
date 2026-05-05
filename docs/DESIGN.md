# DESIGN.md

Apple-style design system for this app. Photography-first, near-invisible UI,
edge-to-edge tile alternation, single Action Blue accent. Sourced from the
project's `DESIGN-apple.md` spec.

## Color tokens

```
primary           #0066cc   Action Blue — every link, every CTA
primary-focus     #0071e3   focus ring
primary-on-dark   #2997ff   inline links on dark tiles
ink               #1d1d1f   headlines, body on light surfaces
body-on-dark      #ffffff   body on dark tiles
body-muted        #cccccc   secondary copy on dark
ink-muted-80      #333333   body on Pearl
ink-muted-48      #7a7a7a   disabled, fine-print
divider-soft      #f0f0f0   button ring shadow
hairline          #e0e0e0   1px utility-card border
canvas            #ffffff   primary canvas
canvas-parchment  #f5f5f7   off-white canvas, footer
surface-pearl     #fafafc   ghost-button fill
surface-tile-1    #272729   primary dark tile
surface-tile-2    #2a2a2c   slightly lighter dark
surface-tile-3    #252527   slightly darker dark
surface-black     #000000   global nav, video
chip-translucent  #d2d2d7   ~64% alpha over imagery
```

No decorative gradients. Atmospheric depth comes from photography only.

## Typography

`SF Pro Display` for ≥19px, `SF Pro Text` otherwise. Stack:
`system-ui, -apple-system, BlinkMacSystemFont, sans-serif` (Inter as off-Apple fallback).

| Token         | Size | Weight | Line | Letter | Use |
|---|---|---|---|---|---|
| hero-display  | 56 | 600 | 1.07 | -0.28  | Hero h1 |
| display-lg    | 40 | 600 | 1.10 |  0     | Tile h1 |
| display-md    | 34 | 600 | 1.47 | -0.374 | Section head |
| lead          | 28 | 400 | 1.14 |  0.196 | Tile sub |
| lead-airy     | 24 | 300 | 1.50 |  0     | Editorial |
| tagline       | 21 | 600 | 1.19 |  0.231 | Sub-nav |
| body-strong   | 17 | 600 | 1.24 | -0.374 | Inline strong |
| body          | 17 | 400 | 1.47 | -0.374 | Default — note 17 not 16 |
| caption       | 14 | 400 | 1.43 | -0.224 | Buttons, captions |
| button-large  | 18 | 300 | 1.0  |  0     | Hero CTA — rare 300 weight |
| button-utility| 14 | 400 | 1.29 | -0.224 | Utility button |
| fine-print    | 12 | 400 | 1.0  | -0.12  | Footer |
| nav-link      | 12 | 400 | 1.0  | -0.12  | Global nav |

Negative letter-spacing on display sizes is the signature "Apple tight" cadence.
Weight 500 deliberately absent. Body is always 17px.

## Spacing (8px base)

`xxs 4 · xs 8 · sm 12 · md 17 · lg 24 · xl 32 · xxl 48 · section 80`

Section vertical padding 80px. Card padding 24px. Button padding 8–11px / 15–22px.

## Rounded radii

`none 0 · xs 5 · sm 8 · md 11 · lg 18 · pill 9999`

`pill` for primary CTAs and search input. `lg 18` for utility cards. `none` for full-bleed tiles.

## Elevation

| Level | Treatment | Use |
|---|---|---|
| Flat | none | tiles, nav, body |
| Hairline | 1px rgba(0,0,0,0.08) | utility cards |
| Backdrop blur | blur(20px) saturate(180%) | sub-nav, sticky bar |
| Product shadow | rgba(0,0,0,0.22) 3px 5px 30px | only on product imagery |

Single drop-shadow rule: applied to product photography only. Never to cards,
buttons, or text. UI elevation comes from surface-color change and backdrop-blur.

## Buttons

- **primary** — Action Blue fill, white text, body 17px, pill radius, 11×22 padding.
- **secondary-pill** — transparent fill, Action Blue text + border, pill radius.
- **dark-utility** — ink fill (#1d1d1f), white text, caption 14px, sm radius (8px), 8×15.
- **pearl-capsule** — Pearl (#fafafc) fill, ink-muted-80 text, md radius (11px).
- **store-hero** — primary at button-large 18px / weight 300, 14×28.
- **icon-circular** — 44×44, chip-translucent fill ~64% alpha, ink icon, full radius.

Active/press = `transform: scale(0.95)`. Focus = 2px primary-focus outline.
No hover styles documented.

## Cards & tiles

- **product-tile-light** — canvas fill, ink text, none radius, 80px section padding,
  edge-to-edge full-bleed. Color change between adjacent tiles is the divider.
- **product-tile-parchment** — same but parchment fill.
- **product-tile-dark** — surface-tile-1 fill, white text. Use Sky Link Blue
  for inline links (Action Blue would disappear on dark).
- **store-utility-card** — canvas fill, hairline border, lg 18px radius, 24px padding.
- **search-input** — canvas, hairline border, pill radius, 12×20, 44px tall.

## Responsive breakpoints

`419 / 640 / 735 / 833 / 1023 / 1068 / 1440`

Content max 1440px. Sub-nav collapses to hamburger at 833px. Utility grid
5→4→3→2→1 cols. Hero h1 56→40→34→28 across breakpoints.

## Do / Don't

**Do**
- Use Action Blue and only Action Blue for interactive.
- Body 17px not 16. Negative letter-spacing on display sizes.
- Alternate light tile / dark tile for section rhythm.
- Reserve product-shadow for product imagery only.
- `transform: scale(0.95)` press state on every button.

**Don't**
- No second accent color.
- No shadows on cards/buttons/text.
- No decorative gradients — atmosphere from photography.
- No font weight 500. Ladder is 300 / 400 / 600 / 700.
- Don't round full-bleed tiles. Color change is the divider.
- Don't tighten body line-height below 1.47.
