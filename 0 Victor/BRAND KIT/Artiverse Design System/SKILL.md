# Artiverse Design System — Skill

> Drop this file into any project to give Claude full context on the Artiverse brand.
> When asked to design anything for Artiverse, read this file first.

---

## Quick-start

You are working with the **Artiverse** brand. Artiverse is a B2B platform that connects artists, booking agencies, promoters, festivals, and cultural institutions in the Spanish live-performance market. The product has three surfaces: the marketing landing (artiverse.es), the Artiverse web/mobile app, and Artiverse Control (internal CRM).

**Source of truth for visual design: the live landing page `artiverse.es`.**
The brandbook is a reference, but the landing HTML is the final word on tokens.

---

## Design tokens (use these — no improvisation)

### Colors
```css
--av-blue:        #0248f7  /* PRIMARY — all CTAs, links, active states */
--av-blue-tint:   #e1eaf8  /* hover backgrounds, selected states */
--av-black:       #000000  /* hero type, brand surfaces */
--av-near-black:  #0c0c0c  /* dark app surfaces */
--av-bg:          #f8f8f8  /* page background */
--av-white:       #ffffff  /* card/section surfaces */
--av-border:      #ebebeb  /* default border */
--av-gray-body:   #575757  /* body/secondary text */
--av-lime:        #ccff00  /* GRAPHIC USE ONLY — stamps, brand moments */
```

### Typography (3 families — all from landing source)
| Family | Role | Weights |
|---|---|---|
| **Geist** | Display, H1–H3, nav logo | 600, 900 |
| **Outfit** | Accent subtitles, descriptors | 400, 500, 600, 700, 900 |
| **Inter** | Body, UI labels, eyebrows | 400, 500, 600, 700 |

```html
<!-- Load in every Artiverse HTML file -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;900&family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=outfit@400,500,600,700,900&display=swap">
```

Or simply:
```html
<link rel="stylesheet" href="/colors_and_type.css">
```

### Key type styles
| Role | Family | Size | Weight | Tracking |
|---|---|---|---|---|
| Hero | Geist | 64px | 900 | -0.03em |
| H1 | Geist | 36px | 900 | -0.02em |
| H2 | Geist | 24px | 600 | -0.01em |
| H3 | Geist | 18px | 600 | 0 |
| Accent subtitle | Outfit | 18px | 600 | -0.01em |
| Body | Inter | 15px | 400 | 0, lh 1.6 |
| Label | Inter | 13px | 500–600 | 0 |
| Eyebrow | Inter | 10px | 700 | 0.15em, CAPS |

### Spacing scale: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80
### Radii: 4 · 6 · 10 · 16 · 20 · 28 · 999(pill)
### Nav shadow: `rgba(0,0,0,0.03) 0px 1px 20px 0px`

---

## Animation — exact Framer spring values

```js
// Small entrance (y: 40, delay 0.1)
{ type: "spring", damping: 60, mass: 1, stiffness: 500 }
// Medium entrance (y: 60, delay 0.2)
{ type: "spring", damping: 60, mass: 1, stiffness: 500 }
// Hero entrance (y: 150, delay 0.6, perspective: 1200)
{ type: "spring", damping: 80, mass: 2, stiffness: 500 }
```

---

## Component patterns

### Primary button
```html
<button style="background:#0248f7;color:#fff;border:none;border-radius:999px;padding:11px 22px;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;cursor:pointer;">
  Entra a la plataforma
</button>
```

### Artist card
- Image area: 160px tall, dark gradient bg, top of card
- Border-radius: 10px card, image fills top edge
- Border: 1px `#ebebeb`
- Agency name: 11px, `#9ca3af`
- Title: Geist 700, 14px, -0.01em tracking
- Badges: pill, 10–11px (blue solid for genre, outline for secondary)
- CTA: full-width pill, blue, "Descubre el artista"

### Nav header
- Background: white, `box-shadow: rgba(0,0,0,0.03) 0px 1px 20px 0px`
- Logo: Geist 900, wordmark lowercase "artiverse", blue "arti" + black "verse" is fine
- Primary nav links: Inter 500, 13px, `#575757`
- Hamburger/mobile button: 1px `#ebebeb` border, 6px radius

---

## Content voice
- **Language:** Spanish. Tuteo (informal "tú").
- **CTAs:** verb + object — "Entra a la plataforma", "Descubre el artista", "Solicita acceso", "Únete a Artiverse"
- **Headlines:** direct, declarative — "El futuro de las artes en vivo está aquí."
- **No emoji in UI.** Use lucide-react icons instead. Map: 🎵→`music`, 💬→`message-circle`, 🔔→`bell`, 🔍→`search`, ❤️→`heart`, 📊→`bar-chart-3`, 📅→`calendar`
- **Tone:** confident, direct, professional but human. No corporate filler.

---

## What NOT to do
- ❌ Don't use `#2563EB` as primary blue — the real value is `#0248f7`
- ❌ Don't use gradients as primary backgrounds
- ❌ Don't use emoji in product UI
- ❌ Don't use lime (`#ccff00`) in body text or as a large flat background (except for stamps/stickers/graphics)
- ❌ Don't use Poppins — Geist + Outfit + Inter is the stack
- ❌ Don't use Inter alone for hero headlines — that's Geist

---

## Assets in this project
- `colors_and_type.css` — all CSS tokens
- `assets/logos/artiverse-logo.svg` — primary SVG logo
- `assets/logos/artiverse-white.png` — white variant (dark bg)
- `assets/logos/artiverse-icon.jpg` — isotipo only
- `preview/colors.html` — color palette card
- `preview/typography.html` — type scale card
- `preview/components.html` — buttons, badges, cards
- `ui_kits/landing/index.html` — full landing page kit
- `ui_kits/app/index.html` — mobile app UI kit
- `reference/brandbook.html` — original brand book (secondary source)
