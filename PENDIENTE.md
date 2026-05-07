# Tareas Pendientes / Notas Técnicas

## Artiverse API — Distinción de tipo de usuario

**Problema:** La API de Artiverse no expone un campo `userType` o similar que distinga entre:
- **Promotores / Salas** (organizaciones que publicitan eventos)
- **Artistas / Grupos** (músicos, compañías de danza, etc.)

**Inferencia actual en el Pipeline:**
- Si `agencies.length > 0` → se considera una entidad con agencia (promotor/sala)
- Si `agencies.length === 0` → usuario sin agencia (artista individual o registro incompleto)
- `hasAgency: agencies.length > 0` se expone en `PipelineContact.artiverseUser`

**Solución propuesta:**
Pedir al equipo de backend que añada un campo `userType: 'promoter' | 'artist' | 'agency'` al endpoint
`GET /admin/marketing/users` para poder segmentar correctamente en el Pipeline y en el Dashboard.

**Workaround temporal:**
- En la vista Pipeline, el segmento "Inbound" agrupa todos los usuarios registrados directamente
- La distinción promotor/artista se puede inferir parcialmente por `hasAgency`
- Los leads de Instantly tienen segmento inferido por nombre de campaña (`inferSegment()`)

---

## Límite de leads por campaña

La API de Instantly v2 (`POST /api/v2/leads/list`) acepta máximo `limit: 100` por llamada.
Campañas con más de 100 leads (ej. Teatros ~2500) solo muestran los primeros 100 en el pipeline.

**Pendiente:** Implementar paginación con `cursor` para obtener todos los leads de campañas grandes.
El campo `nextCursor` está disponible en la respuesta de Instantly v2.

---

## Clasificación manual (contestado)

Los leads en fase `contestado` se clasifican manualmente como:
- `interesado` → verde, requiere follow-up comercial
- `no_interesado` → gris, pasar a descartados
- `pendiente` → por clasificar (default)

Esta clasificación se guarda en `localStorage['pipeline_cls']` (cliente).
**Pendiente:** Sincronizar con backend o Notion para persistir entre dispositivos.
