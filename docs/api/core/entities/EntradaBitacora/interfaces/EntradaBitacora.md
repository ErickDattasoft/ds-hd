[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/EntradaBitacora](../README.md) / EntradaBitacora

# Interface: EntradaBitacora

Entrada del registro de auditoría global del CRM (append-only, `bitacora/{id}`).

## Properties

### id

> **id**: `string`

***

### at

> **at**: `Date`

***

### actorUid

> **actorUid**: `string` \| `null`

***

### actorNombre

> **actorNombre**: `string` \| `null`

***

### accion

> **accion**: `string`

Acción, p. ej. `crear`, `editar`, `archivar`, `cambiar_estado`.

***

### modulo

> **modulo**: `string`

Módulo afectado: `empresas`, `contactos`, `tickets`, `cotizaciones`…

***

### entidadTipo

> **entidadTipo**: `string`

***

### entidadId

> **entidadId**: `string`

***

### resumen

> **resumen**: `string`
