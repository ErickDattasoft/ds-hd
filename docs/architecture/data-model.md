# Modelo de datos (Firestore)

El CRM de referencia guarda todo en un único documento `agenda/datos`. ds-hd usa
**una colección por entidad** con subcolecciones donde aplica.

Colecciones previstas: `usuarios`, `solicitudes_acceso`, `empresas`, `contactos`,
`versiones_sistemas`, `cotizaciones`, `tickets` (+ subcolecciones `notas`, `eventos`,
`adjuntos`), `tickets_publicos`, `contadores`, `eventos` (+ `inscripciones`),
`lista_negra_eventos`, `knowledge_base`, `bitacora`, `configuracion`, `plantillas_correo`.

### Tickets (Fase 2)

- `tickets/{id}` — campos en `core/entities/Ticket.ts`: `numero` (folio consecutivo vía
  `contadores/tickets`), `estado`, `prioridad`, `canal` (`interno|publico|portal|correo`),
  `agenteAsignadoUid`, `sla` (`horasResolucion`, `pausadoDesde`, `msPausadoTotal`),
  `tiempoTrabajadoMs`, `facturacion`, `abiertoEn/resueltoEn/cerradoEn`, `historialEstados[]`,
  y `abierto`/`estadoSlug` desnormalizados para las queries.
  - subcolección `notas/` (`publica|interna`)
  - subcolección `eventos/` (bitácora local append-only)
- `tickets_publicos/{id}` — buzón entrante del formulario público; el staff acepta (crea un
  `tickets/*`) o rechaza.
- `contadores/{nombre}` — `{ valor }`, incrementado en transacción.
- `configuracion/tickets` — catálogos (tipos, sistemas, grupos, estados, SLA por prioridad,
  tipos facturables, estado inicial, correos de notificación del portal).

Índices en `firestore.indexes.json`. Semántica del ciclo de vida: estados de espera
(`abierto`/`pendiente`) no suman tiempo trabajado; solo `pendiente` pausa el reloj del SLA.

**Reglas**: `firestore.rules` es deny-all — todo acceso es server-side vía Admin SDK.
