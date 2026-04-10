# ARTIVERSE CONTROL — Context & State Log

> **Para continuar desde otro sitio:** clona este repo, lee este archivo, y continúa.
> Último update: 2026-04-10

---

## ¿Qué es esto?

**Artiverse Control** es un micro-CRM / panel de control de outreach para Artiverse (artiverse.es) — una plataforma B2B que conecta compañías de artes escénicas con programadores de teatros, auditorios y festivales en España.

El dashboard muestra campañas de email (Instantly), leads, funnel de ventas y estado de calentamiento de dominios. Está construido en **Next.js 14 App Router + Tailwind CSS**, tema oscuro, y se conecta en vivo a la API de Instantly.

**URL local:** `http://localhost:3002`
**Repo:** `https://github.com/victortorresa94-del/Artiverse.git`
**Path local:** `C:/Users/Usuario/.gemini/antigravity/scratch/aether-control`

---

## Stack técnico

| Capa | Tech |
|------|------|
| Frontend | Next.js 14 App Router, React, Tailwind CSS |
| Datos en vivo | Instantly.ai API v2 (Bearer token) |
| Fallback / stats | `data/mock.ts` + `data/stats.json` |
| CRM externo | HubSpot (portal 148220932 — Aether Labs) |
| Deploy | Vercel (pendiente) |

---

## Credenciales y API Keys

### Instantly API
- **Key (Bearer):** `NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ==`
- **Scopes:** all:all ✅
- **Nota crítica:** El endpoint `GET /api/v2/analytics/campaign/summary` devuelve 401 con TODOS los métodos de auth. Es un bug/limitación de Instantly. Workaround: importar CSV desde la UI de Instantly.
- **Modelo de datos v2:** Lead → Lead List → Campaign. Los leads deben crearse con `list_id` (NO `campaign_id`). Las listas se asocian a campañas en la creación via `lead_list_ids[]`.

### HubSpot
- Portal activo: **148220932** (Aether Labs / app-eu1.hubspot.com)
- Portal anterior (desconectado): 148144911 (Artiverse)
- MCP conectado al 148220932 — si se necesita el de Artiverse, crear nuevo Private App token con scopes `crm.objects.contacts.write`, `crm.lists.write`

### Dominios de envío
- `victor@artiversemail.es` — warmup 87%, estado: **READY**
- `victor@artiverse.online` — warmup 71%, estado: **WARMING**

---

## Campañas en Instantly (estado 2026-04-10)

| Nombre | ID Instantly | Lead List ID | Leads | Enviados | Open % | Reply % | Estado |
|--------|-------------|--------------|-------|----------|--------|---------|--------|
| Teatros - Artiverse | *(NO_LIST — leads sin list_id)* | — | ~159 | 75 | 18.7% | 2.7% | Activa |
| Calentamiento - Dance from Spain | *(NO_LIST — leads sin list_id)* | — | ~50 | 6 | 0% | 0% | Activa |
| Salas 1 | `93040742-10ba-4e56-849a-df1832e95a4e` | `d66e3e25-6aeb-45aa-9538-7d982a9037ce` | 57 | 0 | — | — | Pendiente |
| Teatro Danza 2 | `3c2152d7-687d-439d-9221-2f6b3644355c` | `252a990b-2802-47f5-bc55-61b15fd897c4` | 96 | 0 | — | — | Pendiente |
| Socios ARTE 1 | *(no fijado)* | — | ~80 | 0 | — | — | Pausada |

**Nota sobre Teatros y Dance:** Los leads de estas campañas fueron creados antes de entender el modelo v2 (con `campaign_id` en vez de `list_id`). Por eso aparecen como `NO_LIST` en la API — no se pueden mapear programáticamente a una campaña. Los stats reales vienen del CSV.

---

## Estructura del proyecto

```
aether-control/
├── app/
│   ├── page.tsx                    # Dashboard principal — stats globales + tabla campañas
│   ├── campaigns/page.tsx          # Detalle de campañas + secuencias email + Import CSV
│   ├── funnel/page.tsx             # Kanban 11 columnas por etapa
│   ├── leads/page.tsx              # Tabla CRM con filtros, etapa, prioridad
│   ├── warmup/page.tsx             # Gauge warmup + reputación por dominio
│   └── api/
│       ├── instantly/route.ts      # Fetches Instantly live: campañas + leads + merge stats
│       ├── stats/route.ts          # GET/POST stats desde CSV exports de Instantly
│       ├── campaigns/route.ts      # (legacy)
│       ├── leads/route.ts          # (legacy)
│       ├── summary/route.ts        # (legacy)
│       └── sync-to-hubspot/route.ts
├── components/
│   └── Sidebar.tsx                 # Nav: Dashboard / Campañas / Funnel / Leads / Warm-up
├── data/
│   ├── mock.ts                     # Tipos + datos mock completos (fallback)
│   └── stats.json                  # Stats persistidas desde CSV imports (truth source)
├── scripts/                        # Scripts de migración Instantly (fix_salas_1.js, etc.)
├── next.config.mjs                 # ESLint + TS errors ignorados en build
├── vercel.json
└── CONTEXT.md                      # Este archivo
```

---

## Cómo funciona el flujo de datos

```
Instantly API v2
    ↓ /api/instantly/route.ts
    → GET /api/v2/campaigns          → lista de campañas
    → GET /api/v2/lead-lists         → listas de leads
    → POST /api/v2/leads/list        → todos los leads (paginado, cursor)
    → cruza list_id para calcular stats por campaña
    → lee data/stats.json            → sobreescribe stats con datos de CSV si existen
    ↓
Frontend (polling cada 5min + botón refresh)
    → fallback a data/mock.ts si la API falla
```

### Actualizar stats desde CSV
1. En Instantly: Analytics → selecciona campaña → Export CSV
2. En el dashboard: Campañas → selecciona campaña → "Importar CSV"
3. Sube el archivo o pega el contenido
4. Se guarda en `data/stats.json` y se usa como fuente de verdad

---

## Estado actual (2026-04-10)

### ✅ Hecho
- Dashboard completo: 5 páginas (Home, Campañas, Funnel, Leads, Warm-up)
- Conexión live a Instantly API v2
- Campañas Salas 1 y Teatro Danza 2 correctamente creadas con lead lists
- Secuencia de emails para Dance from Spain (3 pasos, adaptada a compañías de danza)
- Stats reales de Teatros (CSV) y Dance from Spain (CSV) en `data/stats.json`
- Sistema de import CSV con modal en página de campañas
- Build pasa sin errores
- Repo subido a GitHub

### 🔄 En progreso / pendiente
- **Deploy a Vercel:** El proyecto tiene `vercel.json` pero no se ha hecho el deploy final. Hacer `vercel --prod` desde el directorio del proyecto.
- **HubSpot Salas segment:** No se ha creado la lista "Salas" en HubSpot portal 148220932. Requiere Private App token del portal correcto con scope `crm.lists.write`.
- **Custom properties HubSpot:** `artiverse_segment`, `instantly_status`, `instantly_campaign` no están aplicadas a los 56 contactos de Salas en HubSpot.
- **Campaña Teatros + Dance analytics live:** Estos leads son NO_LIST (creados antes de entender el modelo v2). Para tener stats live habría que recrear las campañas con lead lists, pero eso interrumpiría los envíos en curso. Recomendado: seguir con CSV import hasta que terminen las campañas.
- **Más leads en mock:** El mock tiene 20 leads de muestra. Cuando se necesite más fidelidad, importar los leads reales de Instantly.

### 🐛 Issues conocidos
- **Analytics API 401:** `GET /api/v2/analytics/campaign/summary` siempre retorna 401 con cualquier método de auth. No es un problema de la API key — parece requerir un tipo de key diferente ("workspace key") que no es accesible via API. Workaround: CSV import.
- **NO_LIST leads:** Los leads de Teatros y Dance from Spain no tienen `list_id`. La API de Instantly v2 no expone `campaign_id` en el objeto lead. Por eso no se pueden mapear a campañas programáticamente. La única solución limpia sería recrear esas campañas desde cero con lead lists.

---

## Cómo arrancar localmente

```bash
git clone https://github.com/victortorresa94-del/Artiverse.git
cd Artiverse
npm install
npx next dev -p 3002
# Abre http://localhost:3002
```

## Cómo hacer deploy a Vercel

```bash
# Desde el directorio del proyecto:
npx vercel --prod
# O conectar el repo en vercel.com → Import Project
# Variable de entorno a añadir: INSTANTLY_API_KEY=NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ==
```

---

## Páginas del dashboard

### `/` — Dashboard
- 6 tarjetas de stats globales (enviados, open rate, reply rate, contactos, en plataforma, pendientes)
- Tabla de campañas con estado y métricas
- Mini chart del pipeline
- Hot leads (alta prioridad)
- Badge "Live" cuando los datos vienen de la API / "Mock" como fallback

### `/campaigns` — Campañas
- Lista de campañas en sidebar izquierdo
- Stats grid de la campaña seleccionada
- Secuencia de emails expandible (paso a paso)
- Botón "Importar CSV" → modal para subir export de Instantly
- Badge "CSV" cuando los stats vienen de un import

### `/funnel` — Funnel (Kanban)
- 11 columnas: Sin contactar → Email 1 → Email 2 → Email 3 → Instagram → WhatsApp → Teléfono → Interesado → Reunión → En plataforma → Descartado
- Mover leads entre columnas con dropdown

### `/leads` — Leads (CRM Table)
- Búsqueda por empresa/contacto/email
- Filtros: etapa, segmento, prioridad, "hot leads"
- Cambiar etapa inline, marcar prioridad, toggle "dentro de plataforma"
- Filas de alta prioridad resaltadas en lime

### `/warmup` — Warm-up de dominios
- Gauge SVG de porcentaje de warmup
- Barra de reputación
- Volumen diario vs objetivo

---

## Historial de acciones recientes

| Fecha | Acción |
|-------|--------|
| 2026-04-10 | Sistema CSV import implementado (`/api/stats`, modal en campañas) |
| 2026-04-10 | `data/stats.json` pre-seeded con datos reales de CSV exports |
| 2026-04-10 | `/api/instantly` actualizado para mergear stats de stats.json |
| 2026-04-09 | Secuencia emails Dance from Spain actualizada (3 pasos, danza-specific) |
| 2026-04-09 | Mock.ts actualizado con stats reales: Teatros 75 enviados 18.7% open, Dance 6 enviados |
| 2026-04-09 | Dashboard lanzado: 5 páginas completas, conexión live Instantly |
| 2026-04-08 | Campaña Teatro Danza 2 recreada con lead list (ID: `3c2152d7`) — 96 leads ✅ |
| 2026-04-08 | Campaña Salas 1 recreada con lead list (ID: `93040742`) — 57 leads ✅ |
| 2026-04-08 | Eliminadas 4 campañas duplicadas "Teatro Danza 2" |
| 2026-04-07 | Descubierto bug: leads creados con `campaign_id` son huérfanos en Instantly v2 |
| 2026-04-06 | Descubierto portal HubSpot incorrecto (148144911 vs 148220932) |

---

*Proyecto de Victor Torres para Artiverse. Continuación con Claude Code — leer este archivo y continuar.*
