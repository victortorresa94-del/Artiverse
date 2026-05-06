# Artiverse Design System

> **Un universo de arte.** Design system for Artiverse — the B2B platform that connects the live-performance industry: artists, booking agencies, promoters, festivals, ayuntamientos, and cultural institutions.

This folder is the single source of truth for Artiverse's visual identity. Use it when designing landing pages, mobile app screens, admin dashboards, marketing materials, decks, or any asset that carries the Artiverse brand.

---

## 1 · Product context

Artiverse operates three surfaces. Each has its own role, but they all sit in the same visual system:

| Surface | What it is | Audience | Tone |
|---|---|---|---|
| **Landing (artiverse.es)** | Marketing site · Framer-built · the "bandera" of the brand | First-time visitors: promoters, agencies, institutions | Confident, bold, movement |
| **App Artiverse** (web + mobile) | The platform: discover artists, browse rosters, chat agency↔promoter, submit to licitaciones | Signed-up professionals | Clear, dense, efficient |
| **Artiverse Control** | Internal CRM / outreach dashboard (Next.js + Tailwind) | Team only | Minimal, data-dense, white |

**The landing is the reference** — if something conflicts, the landing wins. The app branding is being polished; use this system to bring it in line.

### Sources consulted

| Type | Path / URL | Notes |
|---|---|---|
| Brand book | `reference/brandbook.html` | v1.0 (2025). Primary source for colors, type, components, voice |
| Landing page | `artiverse.es` | Framer-built. HTML dump inspected; page runs on Inter + Geist + Outfit |
| App codebase | `Artiverse-control/` *(external)* | Next.js 14 + Tailwind admin CRM. Uses `#2563EB` primary, Inter, lucide-react icons |
| Mobile/web app | `Artiverse/` *(external)* | Asset archive only — no source code was provided. Ask the team for the mobile app repo to tighten the mobile UI kit |
| Logo | `uploads/Logo Artiverse.svg` | Official SVG, A-shape in blue + lime |
| Iconography ref | `uploads/One Pager Artiverse.png`, `reference/brandbook.html` | Line/rounded icon style (Phosphor-like) |
| One-pager | `assets/brand/one-pager.png` | Full marketing one-pager with copy + visual motifs |
| Social templates | `assets/brand/social-templates.png` | Reference grid for social post layouts |

> ⚠️ **Missing:** the Artiverse mobile app source code. The mobile UI kit in this system is **a high-fidelity recreation** derived from the one-pager, brand book, and landing — not a 1:1 copy of the live app. Ask Victor / Aether Labs to share the mobile repo so we can verify screen-by-screen.

---

## 2 · Index — what lives here

```
artiverse-design/
├── README.md                    ← you are here
├── SKILL.md                     ← Claude Skill wrapper (drop into any project)
├── colors_and_type.css          ← CSS custom properties for colors, type, spacing, radii, shadows, motion
│
├── assets/
│   ├── logos/                   ← SVG + PNG + JPG logo variants
│   │   ├── artiverse-logo.svg           (primary, vector, on light)
│   │   ├── artiverse-icon.jpg           (isotipo only)
│   │   ├── artiverse-icon-xl.png        (large icon for previews)
│   │   ├── artiverse-white.png          (for dark backgrounds)
│   │   └── …                             (additional color variants)
│   └── brand/
│       ├── one-pager.png                (product summary marketing doc)
│       ├── app-screens-hero.png         (3-phone hero composition)
│       ├── type-scale-ref.png           (type scale reference, shows Poppins too)
│       └── social-templates.png         (reference social grid)
│
├── reference/
│   └── brandbook.html           ← the official brand book (v1.0, 2025)
│
├── preview/                     ← small HTML cards for the Design System tab
│   ├── colors-primary.html
│   ├── type-display.html
│   ├── buttons.html
│   └── …
│
└── ui_kits/
    ├── landing/                 ← web landing kit (artiverse.es lookalike)
    │   ├── index.html
    │   └── *.jsx components
    ├── app-mobile/              ← mobile app kit (artist discovery + contracting)
    │   ├── index.html
    │   └── *.jsx components
    └── control/                 ← Artiverse Control admin CRM kit
        ├── index.html
        └── *.jsx components
```

---

## 3 · Content fundamentals

### 3.1 · Language & audience
- **Language:** Spanish (Castilian). No English, except for industry-standard terms that read naturally to Spanish-speaking pros: *booking, roster, match, insights, dashboard, licitación, festival*. **Never** translate those.
- **Audience:** B2B professionals. They know the industry. They don't need the basics explained — they need clarity and speed.

### 3.2 · Voice — three words
**Directo. Claro. Dinámico.**
- **Directo:** straight to the point. No preambles, no corporate filler. Every sentence has a purpose.
- **Claro:** any industry pro understands the message on the first read. No jargon beyond what the industry itself uses.
- **Dinámico:** conveys energy and motion. Live music has rhythm — the writing does too.

### 3.3 · Tone rules
- **Tuteo, never "usted".** Informal second-person singular ("descubre", "encuentra", "entra"). Professional but familiar.
- **Present tense + imperatives** for CTAs: *"Entra a la plataforma"*, *"Descubre el artista"*, *"Solicita acceso"*, *"Únete ahora"*.
- **Short sentences.** One idea per sentence. Headlines never wrap past two lines.
- **No exclamation points** except in social-media microcopy like *"¡Únete a la comunidad hoy!"* — and even there, sparingly.
- **Lowercase for the brand.** Always `artiverse` in the wordmark — never `Artiverse` in the logo itself, though *Artiverse* (capitalized) is correct in running body copy.
- **Numbers for proof.** Lean into specifics: *"+500 artistas"*, *"+100 usuarios activos"*, *"2,597 contactos"*. Don't say "many".
- **No emoji in product UI.** They appear in the brand book's iconography section as *placeholders for icon concepts*, not actual UI. Use real icons (lucide-react / Phosphor) instead.

### 3.4 · Copy patterns
**Headlines** — short, declarative, confident.
> ✓ "El futuro de las artes en vivo está aquí."
> ✓ "Conecta con los mejores artistas del sector."
> ✓ "Todo lo que necesitas, en un solo lugar."
> ✗ "Somos una solución integral para la gestión de recursos artísticos…" *(too corporate)*
> ✗ "¡Oye! ¿Buscas artistas mañana?" *(too informal)*

**Product descriptors** — colon-separated, two-beat.
> "Roster por agencia: Directorio completo de artistas por agencia."
> "Chat directo: Comunicación fácil entre agencias y promotores."
> "Insights de artistas: Escuchas en Spotify, visitas al perfil y actividad en tiempo real."

**CTAs** — verb + object, always lowercase except for the verb start.
> "Entra a la plataforma" · "Descubre el artista" · "Solicita acceso" · "Únete a Artiverse" · "Ver más"

**Section tags** (eyebrows) — ALL CAPS, tracked, short.
> `SOBRE ARTIVERSE` · `IDENTIDAD` · `COLORES` · `TIPOGRAFÍA` · `COMPONENTES UI`

---

## 4 · Visual foundations

### 4.1 · Color vibe
A **two-color brand** (blue + lime) on black-or-white stages. No gradients as primary backgrounds — the brand is confident in solid color. Contrast is the signature: `#0A0A0A` black paired with `#CCFF00` lime is the "sello de impacto" (impact seal).

| Role | Hex | When to use |
|---|---|---|
| **Primary** | `#2563EB` — *artiverse blue* | CTAs, links, primary buttons, category tags, active states |
| **Accent** | `#CCFF00` — *artiverse lime* | Signature moments: stamps on black, "+100 usuarios" pills, high-impact graphics |
| **Impact** | `#0A0A0A` — *artiverse black* | Headers, hero typography, full-bleed brand surfaces |
| **Surface** | `#FFFFFF` / `#F9FAFB` | Primary app background, section backgrounds |
| **Body text** | `#4B5563` (gray-600) | Long-form copy |
| **Heading text** | `#111827` (gray-900) | Titles |
| **Meta / captions** | `#9CA3AF` (gray-400) | Labels, timestamps, placeholders |

**Do:** lime stays an accent, ~5% of the pixel area. Never a body text color. Never a large flat background except in brand moments (newsletter CTA, stickers, stamps).
**Don't:** invent bluish-purple gradients, pastel palettes, or introduce additional brand hues.

### 4.2 · Typography
**Inter** is the single type family. Used across all surfaces.

| Role | Size | Weight | Tracking | Line-height |
|---|---|---|---|---|
| Hero / Display | 52–64px | 900 (Black) | -0.03em | 1.0 |
| H1 | 32–40px | 800 (ExtraBold) | -0.02em | 1.15 |
| H2 | 22–26px | 700 (Bold) | -0.01em | 1.2 |
| H3 | 18px | 600 (SemiBold) | 0 | 1.4 |
| Body | 14–16px | 400 (Regular) | 0 | 1.6 |
| UI label | 13–14px | 500–600 | 0 | 1.4 |
| Eyebrow / tag | 10–12px | 700 | 0.1–0.2em, UPPERCASE | 1.4 |

Tight negative tracking on display sizes is a brand signature. Don't go positive on headings.

> **⚠️ Font-file flag:** The brand book and Control app both use Inter from Google Fonts. The *type-scale reference image* (`assets/brand/type-scale-ref.png`) shows labels reading **"Poppins 40/150"**. This looks like an older / external asset that hasn't been updated — treat it as legacy. If the team does want Poppins in a specific surface, flag it and we'll add a secondary family. **Ask the user to confirm whether Poppins is still in play anywhere.** The Framer landing also loads Geist and Outfit for a couple of elements; these appear vestigial (Framer defaults). We're standardizing on **Inter**.

### 4.3 · Spacing & layout
- **4px base.** Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 80.
- **Container max-width:** 1200–1280px for landing, 1400–1600px for dashboards. Gutters 24px mobile / 32px desktop.
- **Card padding:** 20–24px standard; 32–40px for hero/feature blocks.
- **Layout mood:** generous vertical rhythm (section padding 56–80px); comfortable inline density. Never cramped, never airy-to-the-point-of-empty.

### 4.4 · Radii
`4 · 8 · 12 · 16 · 20 · 28 · pill` — used roughly like:
- `4–8px` — inputs, small chips, section eyebrows
- `8px` — primary/secondary buttons
- `12px` — swatches, small cards
- `16px` — product cards, content blocks
- `20–28px` — hero blocks, decorative brand shapes (the big rounded rectangles behind the cover art)
- `pill` — badges, "Descubre el artista" CTAs, user avatars

### 4.5 · Borders & shadows
- **Borders first, shadows second.** Default card: 1px `#E5E7EB` border, no shadow. Add shadow only for elevation moments.
- **Shadow scale:**
  - *Border:* `0 0 0 1px #E5E7EB` — equivalent of a hairline
  - *Sm:* `0 1px 2px rgba(17,24,39,.04), 0 1px 3px rgba(17,24,39,.06)` — resting cards in dashboards
  - *Md:* `0 4px 12px rgba(17,24,39,.08)` — elevated cards, popovers
  - *Lg:* `0 12px 32px rgba(17,24,39,.10)` — modals, focused states
  - *Focus:* `0 0 0 3px rgba(37,99,235,.25)` — keyboard focus ring, blue-tinted

### 4.6 · Backgrounds & imagery
- **No gradients** as primary backgrounds. Stick to solids: white, `#F9FAFB`, `#F3F4F6`, blue `#2563EB`, black `#0A0A0A`, lime `#CCFF00`.
- **Brand-moment backgrounds** are the exception: a full-bleed `#0A0A0A` with a single `#CCFF00` rounded-rectangle in the corner, or a blue panel with a translucent white 20px-radius rectangle rotating 15–20°. These are *sparingly* used for cover art, newsletter blocks, and campaign hero sections.
- **Photography:** real photos of real artists on stage or in studio portraits. **No stock, no generic "business people shaking hands", no AI-generated faces.** Crop 1:1 or 3:4 for artist cards. Prefer contrasting backgrounds that make the artist pop — stage lights, dark rooms, lit stages.
- **Illustrations/patterns:** not part of the core system. The only repeating visual element is the **geometric shape language** (see 4.9).

### 4.7 · Animation
The Framer landing is the reference: **spring-based entrance animations**, damping ~60–80, mass 1–2, small Y-offset (40–150px) with fade-in.

- **Entrance:** `opacity 0 → 1 + translateY(40–80px) → 0`, spring `{ damping: 60, mass: 1, stiffness: 500 }`, staggered `delay: 0.1 / 0.2 / 0.3` across siblings.
- **Hover on interactive surfaces:** 120–200ms, `ease-out` (`cubic-bezier(.22,1,.36,1)`). Either a darker shade (buttons: `#2563EB → #1D4ED8`) or a lift (`shadow-sm → shadow-md`, translate Y -2px).
- **Press states:** 80–100ms shrink (`scale(0.98)`) or darker shade; never both.
- **Loading:** lucide `RefreshCw` rotating at 800ms linear (see Control app `Sidebar`).
- **No bounces, no over-animation.** The brand reads as confident — animations should feel springy but settled, not playful.

### 4.8 · Hover / press / focus states
| State | Treatment |
|---|---|
| Hover (primary button) | bg `#2563EB → #1D4ED8`, no size change |
| Hover (secondary button) | bg `#FFFFFF → #F9FAFB`, border `#D1D5DB → #9CA3AF` |
| Hover (card) | border `#E5E7EB → #D1D5DB`, optional shadow lift sm → md |
| Hover (nav / icon button) | bg `transparent → #F3F4F6`, text `gray-500 → gray-900` |
| Press | `scale(0.98)` OR darker shade, 80–100ms |
| Focus-visible | 3px blue ring (`rgba(37,99,235,.25)`) + existing border |
| Active route (sidebar) | bg `#EFF6FF` (blue-50), text `#1D4ED8` (blue-700), 6px blue dot on the right |

### 4.9 · Brand shapes & graphic elements
This is the part of the system that's *Artiverse-specific* (vs. generic B2B SaaS):

1. **The A-isotipo** — a geometric "A" rendered as two interlocking triangles in blue + lime. Lives as a standalone mark at 32–48px in navigation and 120–240px in hero moments.
2. **Rounded-rectangle ambient shapes** — big chunky rounded rectangles (28–60px radius) in lime or blue, rotated 10–20°, placed off-canvas at corners. Used as decorative backdrops on hero sections and the one-pager.
3. **Negro + Lima stamps** — small `~140px` lime squares on black backgrounds function as "stamps" or stickers. Used on the one-pager as "+100 usuarios activos" and in social assets.
4. **Diagonal blue stripes** — `#2563EB` rectangles with a 15–20° rotation, used as newsletter/community CTA backdrops.
5. **Scattered dot network** — the one-pager shows a subtle node-and-line motif (small dots connected by thin lines) in the top right — represents the "connection" idea (agency↔promoter matching). Use **sparingly** as decorative.

Avoid: drop-shadow logos, embossed effects, gradient logos, skewed/distorted wordmarks, rotated type.

### 4.10 · Transparency & blur
- **Translucent overlays only on dark:** `rgba(255,255,255,0.08–0.2)` for faint decorative shapes over `#0A0A0A` or `#2563EB`.
- **No frosted glass / backdrop-blur** as a primary surface treatment. Used occasionally in the Framer landing for sticky headers (blur ~10–14px on scroll), but not elsewhere.

### 4.11 · Fixed / sticky elements
- **Landing header:** sticky, white background with 1px bottom border, blur-on-scroll optional.
- **App mobile bottom tab bar:** fixed bottom, white bg, 1px top border, 4–5 icon tabs.
- **Dashboard sidebar (Control):** fixed left, 224px wide (`w-56`), white with 1px right border, no blur.

### 4.12 · Card anatomy
Cards are the primary content unit in both landing and app.

```
┌─────────────────────────────────┐
│   [Image, 16:9 or 1:1, r-10px]  │  ← Artist photo / category image
├─────────────────────────────────┤
│  Subterfuge Events              │  ← 11px gray-400, agency/meta
│  NIÑA POLACA                    │  ← 15px bold, title
│  ┌──────┐ ┌──────┐              │  ← 12px badges: blue solid + outline
│  │Música│ │Indie │              │
│  └──────┘ └──────┘              │
│  ┌─────────────────────────┐    │  ← pill CTA, full-width, blue
│  │   Descubre el artista   │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
   padding: 20px   radius: 16px   border: 1px #E5E7EB
```

---

## 5 · Iconography

### 5.1 · System
**Line icons, rounded stroke, 1.5–2px stroke weight.** Both Phosphor-Regular and Lucide-react fit the brand. The Artiverse Control codebase uses **`lucide-react`** — that's what we standardize on.

- **Sizes:** `16px` (inline text / dense UI), `20px` (app, buttons), `24px` (landing, section headers), `32–48px` (feature illustrations).
- **Color:** icons inherit text color by default. In CTAs and active states they turn blue. On dark brand surfaces, white.
- **Never filled + line mixed in the same UI.** Stick to line.

### 5.2 · Source
We use **Lucide** from CDN (`https://unpkg.com/lucide@latest`). It's what the real Control codebase ships with, so designs stay 1:1 with prod.

```html
<!-- Lucide icon, CDN -->
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<i data-lucide="search"></i>
<script>lucide.createIcons();</script>
```

> **⚠️ Substitution flag:** The brand book's iconography section uses **emoji** (🎵 🎭 📊 💬 🔔 🔍 ❤️ 🏆 📋 🌍 ⚡ 📅) *as placeholders for icon concepts*. **These are NOT meant to ship in UI.** Production UIs (Artiverse Control, and by extension the app) use Lucide line icons. When you see emoji in the brand book, map to Lucide equivalents:
>
> | Brand-book emoji | Lucide name |
> |---|---|
> | 🎵 Música | `music` |
> | 🎭 Espectáculo | `drama` / `theater` |
> | 📊 Stats | `bar-chart-3` |
> | 💬 Chat | `message-circle` |
> | 🔔 Notif. | `bell` |
> | 🔍 Buscar | `search` |
> | ❤️ Favorito | `heart` |
> | 🏆 Destacado | `award` |
> | 📋 Roster | `list` / `clipboard-list` |
> | 🌍 Global | `globe` |
> | ⚡ Tendencia | `zap` |
> | 📅 Licitación | `calendar` |

### 5.3 · Custom icons
The **A-isotipo** is the only custom icon in the system. It's the brand mark, not a UI icon — use it in nav/logo slots only, never inline with text.

### 5.4 · Logos in this folder
- `assets/logos/artiverse-logo.svg` — official vector, A-mark + wordmark on transparent bg (use on light surfaces)
- `assets/logos/artiverse-icon.jpg` — isotipo only (avatar, favicon)
- `assets/logos/artiverse-icon-xl.png` — high-res icon (cover art, previews)
- `assets/logos/artiverse-white.png` — white lockup for dark backgrounds
- `assets/logos/artiverse-logo-full.jpg` — full lockup on light background (raster)
- `assets/logos/artiverse-logo-jpg.jpg` — alternate raster lockup

When in doubt, reach for the SVG.

---

## 6 · How to use this system

### In a one-off HTML prototype
```html
<link rel="stylesheet" href="colors_and_type.css">
<body>
  <h1 class="av-hero">El futuro de las artes en vivo está aquí.</h1>
  <button style="background: var(--av-blue); color: white; border-radius: var(--av-radius-sm); padding: 10px 22px; font-weight: 600;">
    Entra a la plataforma
  </button>
</body>
```

### In React (Tailwind or plain)
All tokens map to Tailwind equivalents if you extend the config:
```js
// tailwind.config.ts
theme.extend.colors = {
  brand: { blue: '#2563EB', lime: '#CCFF00', black: '#0A0A0A' },
  // ...
}
```
The existing `Artiverse-control` codebase already does this — mirror it.

### For quick mocks and decks
Start from the UI kits in `ui_kits/`. Copy an `index.html` and adapt.

---

## 7 · Caveats & open questions

1. **Mobile app source not available.** The `Artiverse/` archive contains assets and documents but no app code. The mobile UI kit here is a high-fidelity recreation, not a 1:1 from source. **Ask for the mobile repo to verify.**
2. **Poppins in type-scale reference image.** The reference image labels weights as "Poppins 40/150" while the brand book says Inter. **Confirm which is canonical — we've assumed Inter.**
3. **Icon set flag.** Brand book uses emoji as conceptual placeholders; production uses Lucide. The system here standardizes on Lucide. **Confirm OK.**
4. **Framer landing uses Geist + Outfit alongside Inter.** These may be decorative / Framer defaults. We standardize on Inter. **Flag** any places the team wants to keep Geist or Outfit (e.g. buttons, eyebrows).
5. **Shadows in the brand book are very subtle.** We've added a shadow scale that goes slightly further (`shadow-md`, `shadow-lg`) for app / dashboard elevation. If the team wants to stay flatter, trim `shadow-md` and `shadow-lg` from usage.

---

*Brand book v1.0 (2025) · Design system assembled from brand book + landing + Control codebase · For Artiverse (Victor Torres) · Produced with Aether Labs.*
