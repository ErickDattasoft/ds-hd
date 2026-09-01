# Modelo de datos (Firestore)

El CRM de referencia guarda todo en un único documento `agenda/datos`. ds-hd usa
**una colección por entidad** con subcolecciones donde aplica.

Colecciones previstas: `usuarios`, `solicitudes_acceso`, `empresas`, `contactos`,
`versiones_sistemas`, `cotizaciones`, `tickets` (+ subcolecciones `notas`, `eventos`,
`adjuntos`), `tickets_publicos`, `contadores`, `eventos` (+ `inscripciones`),
`lista_negra_eventos`, `knowledge_base`, `bitacora`, `configuracion`, `plantillas_correo`.

Detalle de campos e índices: ver el plan por fases. Esta página se completará con la tabla
generada desde `core/entities` + `firestore.indexes.json` cuando existan (Fase 4/6).

**Reglas**: `firestore.rules` es deny-all — todo acceso es server-side vía Admin SDK.
