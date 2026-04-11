# ARTIVERSE CONTROL — Context & State Log

> **Para continuar desde otro sitio:** clona este repo, lee este archivo, y continúa.
> Último update: **2026-04-11**

---

## ¿Qué es esto?

**Artiverse Control** es un micro-CRM / panel de control de outreach para Artiverse (artiverse.es) — una plataforma B2B que conecta compañías de artes escénicas con programadores de teatros, auditorios y festivales en España.

El dashboard muestra campañas de email (Instantly), leads, funnel de ventas y estado de calentamiento de dominios. Está construido en **Next.js 14 App Router + Tailwind CSS**, **tema blanco/profesional**, y se conecta en vivo a la API de Instantly.

**URL local:** `http://localhost:3002`
**Repo:** `https://github.com/victortorresa94-del/Artiverse.git`
**Path local principal:** `C:/Users/Usuario/Desktop/Dev/Artiverse-control`
**Path legacy:** `C:/Users/Usuario/.gemini/antigravity/scratch/aether-control` *(copia, no usar)*

---

## 🚀 Status actual (2026-04-11 EOD)

- ✅ **Salas Conciertos 1**: 374 venues activa, copy adaptado, leads enriquecidos
- ✅ **Scripts universales**: `create_campaign.mjs` lista para nuevas campañas (CSV → completo)
- ✅ **CRM**: 20 salas top con research verificado (capacidades, géneros, contactos)
- ✅ **Campañas**: Teatros + Dance (activas), Salas Conciertos 1 (nueva), Teatro Danza 2 (pendiente)
- ⏳ **Vercel deploy**: Listo, solo necesita `vercel --prod`
- ⏳ **HubSpot**: 374 + históricos pendientes de sync

## Stack técnico

| Capa | Tech |
|------|------|
| Frontend | Next.js 14 App Router, React, Tailwind CSS |
| Datos en vivo | Instantly.ai API v2 (Bearer token) |
| Fallback / stats | `data/mock.ts` + `data/stats.json` |
| CRM externo | HubSpot (portal 148220932 — Aether Labs) |
| Deploy | Vercel (listo, pendiente `vercel --prod`) |

---

## Credenciales y API Keys

### Instantly API
- **Key (Bearer):** `NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ==`
- **Scopes:** all:all ✅
- **Nota crítica:** El endpoint `GET /api/v2/analytics/campaign/summary` devuelve 401 con TODOS los métodos de auth. Es un bug/limitación de Instantly. **Workaround:** importar CSV desde la UI de Instantly.
- **Modelo de datos v2:** Lead → Lead List → Campaign. Los leads deben crearse con `list_id` (NO `campaign_id`). Las listas se asocian a campañas en la creación via `lead_list_ids[]`.
- **Crear lead (single):** `POST /api/v2/leads` con `{list_id, email, first_name, last_name, company_name, phone, website}`
- **NO hay endpoint bulk** — hay que crear leads uno a uno o en paralelo con retry.

### HubSpot
- Portal activo: **148220932** (Aether Labs / app-eu1.hubspot.com)
- Portal anterior (desconectado): 148144911 (Artiverse)
- MCP conectado al 148220932 — si se necesita el de Artiverse, crear nuevo Private App token con scopes `crm.objects.contacts.write`, `crm.lists.write`

### Dominios de envío
- `victor@artiversemail.es` — warmup ~87%, estado: **READY**
- `victor@artiverse.online` — warmup ~71%, estado: **WARMING**

---

## Campañas en Instantly (estado 2026-04-11)

| Nombre | Campaign ID | Lead List ID | Leads | Enviados | Open % | Reply % | Estado |
|--------|-------------|--------------|-------|----------|--------|---------|--------|
| Teatros - Artiverse | *(NO_LIST)* | — | ~159 | 75 | 18.7% | 2.7% | Activa |
| Calentamiento - Dance from Spain | *(NO_LIST)* | — | ~50 | 6 | 0% | 0% | Activa |
| **Salas Conciertos 1** | `b12e4d84-12b6-4c1f-8d9e-5ed41e6ca2b8` | `bdb76496-621d-4655-b78b-b734578fb4ed` | **374** ✅ | 0 | — | — | **ACTIVA** |
| Salas 1 (viejo) | `93040742-10ba-4e56-849a-df1832e95a4e` | `d66e3e25-6aeb-45aa-9538-7d982a9037ce` | 57 | 0 | — | — | **PAUSADA** |
| Teatro Danza 2 | `3c2152d7-687d-439d-9221-2f6b3644355c` | `252a990b-2802-47f5-bc55-61b15fd897c4` | 96 | 0 | — | — | Pendiente |
| Socios ARTE 1 | *(no fijado)* | — | ~80 | 0 | — | — | Pausada |

**Salas Conciertos 1 (NUEVA):** Campaña limpia con 374 salas reales del CSV. Vieja "Salas 1" (57 leads con contactos incorrectos: agencias/managers) pausada. Copy completamente reescrito para programadores de salas (COMPRADORES de artistas). 3 variantes step 1, 2 variantes step 2, 2 variantes step 3.

---

## Estructura del proyecto

```
Artiverse-control/
├── app/
│   ├── page.tsx                    # Dashboard principal — stats globales + tabla campañas
│   ├── campaigns/page.tsx          # Detalle de campañas + secuencias email + Import CSV
│   ├── funnel/page.tsx             # Kanban 11 columnas por etapa (tema blanco)
│   ├── leads/page.tsx              # CRM profesional con tabs y filtros avanzados
│   ├── warmup/page.tsx             # Gauge warmup + reputación por dominio
│   └── api/
│       ├── instantly/route.ts      # Fetches live: campañas + leads + merge stats (filtra AI SDR)
│       ├── stats/route.ts          # GET/POST stats desde CSV exports
│       ├── campaigns/route.ts      # (legacy)
│       ├── leads/route.ts          # (legacy)
│       ├── summary/route.ts        # (legacy)
│       └── sync-to-hubspot/route.ts
├── components/
│   ├── Sidebar.tsx                 # Nav blanca con logo Artiverse (Icono.jpg)
│   └── MobileLayout.tsx            # Layout responsive con hamburger menu mobile
├── data/
│   ├── mock.ts                     # Tipos + datos mock (Lead ahora tiene instagram + emailStatus)
│   └── stats.json                  # Stats desde CSV (source of truth para Teatros y Dance)
├── public/
│   └── artiverse-logo.jpg          # Logo oficial Artiverse
├── scripts/
│   └── upload_salas1.mjs           # Script que subió 57 leads de Salas 1 a Instantly
├── next.config.mjs                 # ESLint + TS errors ignorados en build
├── vercel.json
├── CONTEXT.md                      # Este archivo
└── dispatch.md                     # Brief para Claude Dispatch (móvil)
```

---

## Flujo de datos

```
Instantly API v2
    ↓ /api/instantly/route.ts
    → Filtra campañas [AI SDR] (son de Aether Labs, no de Artiverse)
    → GET /api/v2/campaigns
    → GET /api/v2/lead-lists
    → POST /api/v2/leads/list (paginado, cursor)
    → Cruza list_id para stats por campaña
    → Lee data/stats.json → sobreescribe stats con CSV imports
    ↓
Frontend (polling 5min + botón refresh)
    → Fallback a data/mock.ts si la API falla
```

### Actualizar stats desde CSV
1. Instantly: Analytics → campaña → Export CSV
2. Dashboard: Campañas → selecciona campaña → "Importar CSV"
3. Se guarda en `data/stats.json` y se usa como fuente de verdad

---

## Estado actual (2026-04-11)

### ✅ Hecho (sesión 2026-04-11 con Claude Code)

**Bug fix crítico — los "333 mails":**
- El `getAllLeads()` traía TODOS los leads de Instantly incluyendo campañas `[AI SDR] aetherlabs.es` que están en el mismo workspace. Esos leads (sin `list_id`) inflaban el pool NO_LIST a 333/344. El código los distribuía a todas las campañas sin lista → Teatros y Dance from Spain mostraban 333 cuando en realidad Teatros tiene 75 y Dance 6.
- **Fix:** Filtrar campañas `[AI SDR]` del fetch. Eliminar la distribución ciega del NO_LIST pool. `stats.json` es ahora el único source of truth para esas campañas.

**Rediseño UI completo (dark → light/profesional):**
- Fondo blanco en todas las páginas + sidebar blanca
- Logo Artiverse real en sidebar (`public/artiverse-logo.jpg`)
- Tipografía y colores profesionales (azul #2563EB primario, grises neutros)
- Layout mobile-responsive: hamburger menu, cards en móvil para leads

**CRM /leads mejorado:**
- Nuevo tipo `EmailStatus: 'not_sent' | 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced'`
- Nuevo campo `instagram: string` en tipo Lead
- Tabs de vista rápida: Todos / Calientes / Con teléfono / Con Instagram / Email abierto / Respondidos / En plataforma
- Filtros avanzados: fase, segmento, email status, prioridad
- Columnas de canales con iconos (phone, instagram) activos/inactivos
- Vista mobile con cards en vez de tabla

**Campañas y otras páginas:**
- Campaigns, Funnel, Warmup migrados a tema blanco
- Mobile-friendly en todas las páginas

**Upload Salas 1:**
- Script `scripts/upload_salas1.mjs` creado y ejecutado
- **57 leads** del CSV "Salas 1 - 59 - Hoja 1.csv" subidos a Instantly ✅
- List ID: `d66e3e25-6aeb-45aa-9538-7d982a9037ce`

**Git:**
- Commit `cce2143` pusheado a master en GitHub

**Proyecto movido:**
- Path activo: `C:/Users/Usuario/Desktop/Dev/Artiverse-control/`

---

### 🔄 Pendiente

1. **Deploy a Vercel** — `vercel --prod` desde `Desktop/Dev/Artiverse-control`. Var env: `INSTANTLY_API_KEY=NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ==`

2. ~~**Salas 1**~~ ✅ → **Salas Conciertos 1 ACTIVA** (374 leads, vieja pausada)

3. **Campañas faltantes** — usar `scripts/create_campaign.mjs`:
   - Festivales (~XXX leads, copy predefinido)
   - Distribuidoras (~524 leads, CSV en Google Drive)
   - Managers/Agencias (si hay)

4. **HubSpot sync** — Subir 374 leads de Salas Conciertos 1 + completar leads históricos. Endpoint `/api/sync-to-hubspot` o script Python batch upsert.

5. **Teatro.es/Guiarte scraping** — 10 especialidades. Requiere Claude for Chrome (AJAX POST).

6. **Deploy + monitoreo** — Una vez en Vercel, configurar analytics y seguimiento de métricas.

---

### 🐛 Issues conocidos

- **Analytics API 401:** `GET /api/v2/analytics/campaign/summary` siempre 401. Workaround: CSV import.
- **NO_LIST leads:** Teatros y Dance no tienen `list_id`. Stats solo via CSV. No recrear esas campañas (están activas).
- **lucide-react:** La versión instalada no tiene `Instagram` icon. Se usa `Camera` como sustituto. Si se actualiza lucide-react a v2+, cambiar import.

---

## Arrancar localmente

```bash
# Desde la nueva ruta
cd "C:/Users/Usuario/Desktop/Dev/Artiverse-control"
npm install   # solo si no hay node_modules
npx next dev -p 3002
# → http://localhost:3002
```

## Deploy a Vercel

```bash
cd "C:/Users/Usuario/Desktop/Dev/Artiverse-control"
npx vercel --prod
# Variables de entorno en Vercel:
# INSTANTLY_API_KEY = NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ==
```

---

## Historial (2026-04-11 sesión Salas Conciertos)

| Fecha | Acción |
|-------|--------|
| 2026-04-11 | **Salas Conciertos 1 — 374 leads ACTIVA** ✅ via `scripts/salas_conciertos_full.mjs` |
| 2026-04-11 | CSV parse: 390 venues → 377 con email válido (13 sin email) |
| 2026-04-11 | Vieja "Salas 1" (57 leads con managers/agencias) → **PAUSADA** |
| 2026-04-11 | **Copy reescrito para programadores (COMPRADORES)** — 3+2+2 variantes, subjects adaptados |
| 2026-04-11 | **Research agent** — investigó 25 salas top (Apolo, Razzmatazz, WiZink, etc.) |
| 2026-04-11 | CRM enriquecido: 20 leads top con géneros, contactos, pitch personalizado |
| 2026-04-11 | `scripts/create_campaign.mjs` universal — CSV→campaña completa para cualquier segmento |
| 2026-04-11 | Build ✅, todos los commits pusheados a master |
| 2026-04-11 (ant) | Salas 1 (vieja) activada: 57 leads, 3 pasos, PAUSADA hoy |
| 2026-04-11 (ant) | script `create_campaign.mjs` + `salas_conciertos_full.mjs` creados |
| 2026-04-11 (ant) | Bug "333 mails" corregido + rediseño UI (blanco + logo Artiverse) |
| 2026-04-09 | Dashboard 5 páginas lanzado, conexión live Instantly |

---

*Proyecto de Victor Torres para Artiverse. Para continuar: leer este archivo + `dispatch.md`.*
