# DISPATCH BRIEF — Artiverse Control
> Para Claude cualquier dispositivo. ACTUALIZADO: 2026-04-11 22:45 UTC.
> Proyecto: Next.js CRM/outreach dashboard. Instantly.ai API v2, HubSpot CRM.
> Repo: `https://github.com/victortorresa94-del/Artiverse.git`
> Path local: `C:/Users/Usuario/Desktop/Dev/Artiverse-control`

---

## 🧠 CONTEXTO: QUIÉN SOY Y QUÉ ES ARTIVERSE

Soy **Víctor Torres**, fundador de **Aether Labs** (aetherlabs.es), una agencia de IA en Barcelona.

Tengo un cliente llamado **Dani** (Daniel Boada, Bonito Sound), con quien se cerró un contrato de €1.550 para:
- Web Bonito Sound (rediseño)
- Materiales de outreach (vídeos, pitch deck)
- Estrategia y ejecución de campaña de lanzamiento para **Artiverse**

**Artiverse (artiverse.es)** es una plataforma B2B SaaS para las artes en vivo en España. Conecta agencias de booking, managers, promotores, salas de conciertos e instituciones culturales con artistas. Funciona como LinkedIn del sector escénico español. Tiene ya ~130 usuarios. Las primeras agencias dentro son MPC Management, Meteórica, Darlalata, Calaverita Records, Subterfuge Events, Surtribe.

La plataforma está construida en Framer (15€/mes, pendiente migrar a Vercel gratis).

---

## 📚 PARA ENTENDER EL CONTEXTO COMPLETO

**Lee las siguientes fuentes antes de continuar:**

1. **Este repo, archivo `CONTEXT.md`** — Estado técnico completo del proyecto, credenciales, campañas, historial.

2. **Este repo, archivo `CONTEXTO.md`** — Contexto de negocio: quién es Víctor, quién es Dani, qué es Artiverse, stack de herramientas, CRM, HubSpot, WhatsApp, Instagram, todo el plan de outreach.

3. **Notion de Víctor** — Busca la página `HOME > Proyectos > Artiverse`. Ahí hay:
   - Plan de trabajo por fases
   - Stack de outreach (decisiones de herramientas)
   - Los emails de cada secuencia (6 segmentos × 3 emails)
   - Contexto Claude (actualizaciones entre conversaciones)
   Si tienes acceso MCP a Notion, úsalo. Si no, pide a Víctor que te comparta el contenido relevante.

4. **Conversaciones previas de Claude Code** — Ha habido múltiples sesiones largas construyendo este dashboard. Las sesiones más relevantes son las del 2026-04-09 al 2026-04-11 donde se construyó todo el frontend y se corrigieron los bugs de Instantly. Si tienes acceso al historial de proyectos de Claude, léelo.

---

## 🏗️ QUÉ ES ESTE PROYECTO (técnico)

**Artiverse Control** es un micro-CRM / dashboard de outreach construido con:
- **Next.js 14 App Router** + Tailwind CSS
- Conexión live a **Instantly.ai API v2** (campañas de email)
- **HubSpot** como CRM externo (portal 148220932)
- 5 páginas: Dashboard / Campañas / Funnel / Leads CRM / Warm-up dominios

**URL local:** `http://localhost:3002`
**Para arrancar:**
```bash
cd "C:/Users/Usuario/Desktop/Dev/Artiverse-control"
npx next dev -p 3002
```

---

## ✅ LO QUE YA ESTÁ HECHO

### Dashboard
- 5 páginas completas funcionando
- Tema blanco profesional (se migró de oscuro a claro el 2026-04-11)
- Logo Artiverse en sidebar (`public/artiverse-logo.jpg`)
- Layout mobile-responsive con hamburger menu
- Conexión live a Instantly (con fallback a mock data)

### Campañas activas en Instantly
| Campaña | Leads | Estado |
|---------|-------|--------|
| Teatros - Artiverse | ~159 | Activa, 75 enviados, 18.7% open |
| Calentamiento - Dance from Spain | ~50 | Activa, 6 enviados |
| Salas 1 | 57 ✅ | **ACTIVA** — 3 pasos, 2 variantes, desde artiversemail.es |
| Teatro Danza 2 | 96 | Pendiente activar |
| Socios ARTE 1 | ~80 | Pausada |

### Fixes aplicados
- **Bug "333 mails"** corregido: las campañas `[AI SDR]` de Aether Labs que estaban mezcladas en el mismo workspace de Instantly ya no aparecen en este dashboard.
- Las stats de Teatros y Dance from Spain vienen de CSV imports (`data/stats.json`), no de cálculos falsos de la API.

### CRM /leads
- Filtros: Todos / Calientes / Con teléfono / Con Instagram / Email abierto / Respondidos / En plataforma
- Filtros avanzados: fase del funnel, segmento, email status, prioridad
- Datos mock actualizados con campos `instagram` y `emailStatus`

---

## 🔄 PRÓXIMOS PASOS (por orden)

### 🔴 HOY / MAÑANA

**1. ✅ Salas Conciertos 1 — LISTA (2026-04-11)**
   - 374 leads activa, copy para programadores (COMPRADORES), 3+2+2 variantes
   - Vieja "Salas 1" (57 leads con agencias) → pausada
   - `scripts/salas_conciertos_full.mjs` — reproducible para futuras campañas

**2. Deploy a Vercel** (5 min)
   ```bash
   cd "C:/Users/Usuario/Desktop/Dev/Artiverse-control"
   npx vercel --prod
   # ENV: INSTANTLY_API_KEY=NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ==
   ```

**3. HubSpot sync** (2-3 horas)
   - 374 leads Salas Conciertos 1 + históricos (Teatros, Dance) → HubSpot 148220932
   - Endpoint: `POST /crm/v3/objects/contacts/batch/upsert`
   - Properties custom: `artiverse_segment`, `instantly_status`, `instantly_campaign`

### 🟡 ESTA SEMANA

**4. Nuevas campañas** (USA `scripts/create_campaign.mjs`)
   ```bash
   # Festivales
   node scripts/create_campaign.mjs --csv "CSV_festivales" --name "Festivales 1" --segment "Festivales"
   
   # Distribuidoras (524 leads en Google Drive)
   node scripts/create_campaign.mjs --csv "CSV_distribuidoras" --name "Distribuidoras 1" --segment "Distribuidoras"
   ```

**5. Teatro Danza 2** — 96 leads ya en Instantly, lead list creada. Solo falta:
   - Revisar/crear secuencias
   - Activar campaña

### 🟢 CUANDO HAYA TIEMPO

- **Scraping teatro.es/guiarte** (10 especialidades, requiere Claude for Chrome)
- **Landing Artiverse** (Framer → Vercel, ahorra 15€/mes)
- **Web Bonito Sound** (rediseño + WordPress migration, €1.550 con Dani)

---

## 🔑 CREDENCIALES CLAVE

```
Instantly API Key: NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ==
HubSpot Portal: 148220932 (app-eu1.hubspot.com)
Dominio envío 1: victor@artiversemail.es (warmup ~87%, READY)
Dominio envío 2: victor@artiverse.online (warmup ~71%, WARMING)
Salas 1 Campaign ID: 93040742-10ba-4e56-849a-df1832e95a4e
Salas 1 List ID: d66e3e25-6aeb-45aa-9538-7d982a9037ce
```

---

## 📁 ARCHIVOS CLAVE DEL PROYECTO

```
CONTEXT.md              ← Estado técnico completo (leer primero)
CONTEXTO.md             ← Contexto de negocio (leer segundo)
data/mock.ts            ← Tipos TypeScript + datos de leads y campañas
data/stats.json         ← Stats reales de Instantly (CSV imports)
app/api/instantly/route.ts  ← API principal (conexión Instantly)
app/leads/page.tsx      ← CRM con filtros avanzados
scripts/upload_salas1.mjs   ← Script que subió los 57 leads de Salas
```

---

## 💬 ESTILO DE COMUNICACIÓN DE VÍCTOR

- Comunica principalmente por **voz** (mensajes transcritos) — puede haber errores tipográficos
- Es **directo y técnico** — no explicar lo básico, ir al grano
- Cuando algo falla, quiere **entender POR QUÉ** antes del fix
- Prefiere pocos cambios bien hechos a muchos cambios a medias
- Usa **español** en todo momento

---

*Brief generado el 2026-04-11. Para actualizar: editar este archivo al final de cada sesión de trabajo.*
