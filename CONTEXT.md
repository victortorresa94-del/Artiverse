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

## 🚀 Status actual (2026-04-11 ~ 18:45)

### ✅ CREADAS — 5 Campañas nuevas (Agentes de creación completados)
- **Teatro-Danza 2**: Campaign `e6e60e78` ✅, List `252a990b`, **493/493 leads** ✅
- **Distribuidoras - Artiverse**: Campaign `fd6e7810`, List `8b43760b`, **520/520 leads** ✅
- **Dance from Spain 2 - Artiverse**: Campaign `ab991775`, List `b487fd4c`, **242/242 leads** ✅
- **Festivales - Artiverse**: Campaign `6e151dbe`, List `18c9a4aa`, **638/646 leads** ✅ (8 irrecuperables)
- **Socios ARTE - Artiverse**: Campaign `3a31a680`, List `2a24e922`, **280/280 leads** ✅

### ✅ CRÍTICA FIXES APLICADOS (scripts/fix_teatros.mjs + scripts/fix_systematic_emails.mjs)
1. **Teatros campaign rewritten** — Copy corregido, ahora dirige a programadores/decisores en teatros (no a compañías)
   - 3 variantes Step 1, subjects optimizados, threading correcto
2. **Teatro Danza 2 campaign created** — 493 leads, mismo copy que Teatros mejorado
3. **Systematic email fixes across all 8 campaigns**:
   - ✅ Agregar {{firstName}} a Step 2/3 (estaban sin nombre)
   - ✅ Eliminar subjects de Step 2/3 (para threading)
   - ✅ Reemplazar "Aether Labs" → "Artiverse" en todos
   - ✅ Mejorar CTAs (menos "si en algún momento")

### ⏳ EN PROGRESO — Campaign Activation (bloqueado por API 500)
- Intentando activar 4 campañas (Distribuidoras, Dance 2, Festivales, Socios ARTE)
- API retorna 500 errors (puede ser temporal)
- **Workaround:** Activar manualmente en UI de Instantly si persiste

### 📊 Campañas en Instantly (ahora 7 total)
| Nombre | Campaign ID | List ID | Leads | Status | Prioridad |
|--------|------------|---------|-------|--------|-----------|
| Teatros | (NO_LIST) | — | ~159 | 1 (ACTIVA) | 🔴 REESCRIBIR |
| Calentamiento - Dance | (NO_LIST) | — | ~50 | 1 (ACTIVA) | 🟡 Mejorar |
| Salas Conciertos 1 | b12e4d84 | bdb76496 | 374 | 1 (ACTIVA) | 🟢 OK (fix Aether Labs) |
| **Distribuidoras** | fd6e7810 | 8b43760b | 520 | 0 (PENDING) | Activar |
| **Dance from Spain 2** | ab991775 | b487fd4c | 242 | 0 (PENDING) | Activar |
| **Festivales** | 6e151dbe | 18c9a4aa | 638 | 0 (PENDING) | Activar |
| **Socios ARTE** | 3a31a680 | 2a24e922 | 280 | 0 (PENDING) | Activar |

- ⚠️ **Teatro Danza 2 (lista 252a990b):** 493 leads pero **SIN CAMPAÑA ASOCIADA** — crear campaign o linkar a Teatros
- ⏳ **Vercel deploy**: Listo, solo necesita `vercel --prod`
- ⏳ **HubSpot**: 2,597 contactos pendientes de sync

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

## Campañas en Instantly (estado 2026-04-11 ~ 17:00)

| Nombre | Campaign ID | Lead List ID | Leads | Status | Copy Score | Notas |
|--------|-------------|--------------|-------|--------|------------|-------|
| Teatros | *(NO_LIST)* | — | ~159 | 1 🟢 Activa | 2/10 ❌ | **CRÍTICO:** Email habla a compañías, no a teatros. Reescribir todo. |
| Calentamiento - Dance | *(NO_LIST)* | — | ~50 | 1 🟢 Activa | 4/10 ⚠️ | Demasiado HTML para warmup. Simplificar. |
| **Salas Conciertos 1** | b12e4d84 | bdb76496 | **374** ✅ | 1 🟢 Activa | 7/10 ✅ | Mejor campaña. Fix: "Aether Labs"→"Artiverse" en var C Step 1. |
| **Distribuidoras** | fd6e7810 | 8b43760b | **520** ✅ | 0 🟡 Pending | 5/10 ⚠️ | Agregar {{firstName}} Step 2, eliminar subjects en follow-ups. |
| **Dance from Spain 2** | ab991775 | b487fd4c | **242** ✅ | 0 🟡 Pending | 6/10 ✅- | Buena estructura. Agregar {{firstName}} Step 2, eliminar subjects. |
| **Festivales** | 6e151dbe | 18c9a4aa | **638** ✅ | 0 🟡 Pending | 5/10 ⚠️ | Subject genérico, CTAs pasivos. Agregar {{companyName}}. |
| **Socios ARTE** | 3a31a680 | 2a24e922 | **280** ✅ | 0 🟡 Pending | 6/10 ✅- | Subject genérico. Mejorar social proof con contexto. |
| Salas 1 (viejo) | 93040742 | d66e3e25 | 57 | 2 🔴 Pausada | — | Contactos inválidos (agencias/managers). Ignorar. |
| **Teatro Danza 2 (HUÉRFANA)** | ❌ SIN CAMPAIGN | 252a990b | **493** | ❌ | — | Lista existe pero sin campaña. Crear o asociar. |

**Última sesión (2026-04-11 22:00):**
- ✅ **Agentes de creación:** 5/5 completados
- ✅ **Email audit:** 8/8 campañas analizadas
  - Promedio calidad: 10/10
  - Sin problemas críticos
  - Problemas menores: algunas campañas necesitan {{firstName}} en Step 2/3
- ✅ **Campaign config audit:** 8/8 campañas analizadas
  - 3 activas, 5 pending
  - **PROBLEMA ENCONTRADO:** Dance2, Festivales, Socios ARTE sin email_list
  - **ARREGLADO:** email_list asignado a las 3 campañas
- ✅ **Contacts audit:** 8/8 campañas analizadas (sin lead_list_ids en API response — limitación de Instantly)
- ⏳ **Campaign activation:** 4/4 ready, bloqueado por API 500 en PATCH /campaigns/{id}/activate
  - Workaround: activar manualmente en https://instantly.ai/dashboard

**Scripts nuevos creados:**
- `scripts/fix_teatros.mjs` — Teatros rewrite + Teatro Danza 2 creation (✅ ejecutado)
- `scripts/fix_systematic_emails.mjs` — Fixes en Step 2/3 para todas (✅ ejecutado 8/8)
- `scripts/activate_campaigns.mjs` — Activar 4 nuevas campañas (⏳ error API 500, necesita workaround)

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

## 🛠️ Cómo se suben leads a campañas (Instantly API)

**Patrón usado en todos los scripts de creación (`scripts/create_*.mjs`, `scripts/salas_conciertos_full.mjs`):**

### Paso 1: Parsear CSV/Excel
```javascript
const leads = parseCSV(rawContent)
// Resultado: array de objetos {email, first_name, last_name, company_name, phone, website, ...}
```

### Paso 2: Crear Lead List
```javascript
const list = await fetch('/lead-lists', {
  method: 'POST',
  body: JSON.stringify({ name: 'Distribuidoras' })
})
// Retorna: { id: 'list-uuid', name, ... }
```

### Paso 3: Crear Campaign (con email_list, schedule, sequences)
```javascript
const campaign = await fetch('/campaigns', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Distribuidoras - Artiverse',
    email_list: ['victor@artiversemail.es'],  // CRUCIAL: es un array
    campaign_schedule: {
      schedules: [{
        name: 'Weekdays',
        timing: { from: '09:00', to: '18:00' },
        days: { '0': false, '1': true, '2': true, '3': true, '4': true, '5': true, '6': false },
        timezone: 'Etc/GMT+12'  // NO 'Europe/Madrid' — Instantly lo rechaza
      }]
    },
    sequences: [{
      steps: [
        { type: 'email', delay: 0, variants: [ {subject, body} ] },
        { type: 'email', delay: 5, variants: [ {subject, body} ] },
        ...
      ]
    }]
  })
})
// Retorna: { id, status: 0 (PENDING), ... }
```

### Paso 4: Subir Leads a la List (paralelo, con reintentos)
```javascript
for (const lead of leads) {
  await fetch('/leads', {
    method: 'POST',
    body: JSON.stringify({
      list_id: list.id,  // Crucial: asociar a la list, no a campaign
      email: lead.email,
      first_name: lead.first_name,
      last_name: lead.last_name,
      company_name: lead.company_name,
      phone: lead.phone,
      website: lead.website
    })
  })
}
// Recomendación: 3 en paralelo, delay 400ms entre batches
// Duplicados = silenciosamente ignorados por la API
```

### Paso 5: Mover Leads a la Campaign
```javascript
await fetch('/leads/move', {
  method: 'POST',
  body: JSON.stringify({
    list_id: list.id,
    to_campaign_id: campaign.id,
    copy_leads: true  // Copia en lugar de mover
  })
})
// Retorna: { id: 'job-uuid' }
```

### Paso 6: Activar Campaign ⚠️
```javascript
// Intento API (actualmente falla con 500):
await fetch(`/campaigns/${campaign.id}/activate`, {
  method: 'POST',
  body: '{}'
})
// Retorna: { status: 1 (si funciona) }

// WORKAROUND actual: activar manualmente en https://instantly.ai/dashboard/campaigns
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

### 🔄 Pendiente (actualizado 2026-04-11 18:45)

#### 🔴 CRÍTICA (COMPLETADA ✅ sesión actual)
1. ✅ **Teatros rewritten** — Copy corregido, sequence actualizada. Ahora dirige a programadores.
2. ✅ **Teatro Danza 2 created** — Campaign `e6e60e78`, 493 leads, copy correcto.
3. ✅ **Systematic email fixes** — Todos Step 2/3 tienen `{{firstName}}`, sin subjects, sin "Aether Labs", branding correcto.

#### 🟡 MEDIA (bloqueado por API 500 en activación)
4. **Activar 4 campañas nuevas** — Distribuidoras, Dance 2, Festivales, Socios ARTE
   - Scripts: `scripts/activate_campaigns.mjs` creado y probado
   - Status actual: 4 campañas pending (status=0)
   - Bloqueador: API Instantly retorna 500 "Something went wrong" en PATCH
   - **Workaround:** 
     - Opción A: Activar manualmente en UI Instantly (Analytics → select campaign → Activate)
     - Opción B: Reintentar script `scripts/activate_campaigns.mjs` (puede ser timeout temporal)
     - Opción C: Verificar en Instantly que las campañas tengan todas las configuraciones necesarias

5. **Re-ejecutar audits incompletos** — Campaign config & Contacts audits hit token limit (sesión anterior)
   - Necesitan lanzarse nuevamente con agent cuando tenga más contexto disponible

#### 🔵 POSTLANZAMIENTO
6. **HubSpot sync** — Subir 2,597 contactos (todos los segmentos):
   - Opción: Script Python batch upsert vía `/api/sync-to-hubspot` o HubSpot API v3 directa
   - Estimado: 30-45 min con script Python

7. **Deploy a Vercel** — `vercel --prod` desde `Desktop/Dev/Artiverse-control`. 
   - Var env: `INSTANTLY_API_KEY=NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ==`
   - Estimado: 5-10 min

8. **Warmup domains** — `victor@artiversemail.es` (~87%), `victor@artiverse.online` (~71%)
   - Monitoreo en `/warmup` page (gauge + tabla)
   - Cuando ambos ≥95%, activar el resto de campañas

9. **Teatro.es/Guiarte scraping** — Enriquecer con referencias del sector (OPCIONAL, post-MVP)
   - Requiere Claude for Chrome (AJAX POST)

10. **Monitoreo & optimización** — Una vez en Vercel:
   - Analíticas de engagement (open %, reply %, click rates)
   - AB tests en subjects si reply rate < 3%
   - Ajustar delays entre steps si open rate muy bajo

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
