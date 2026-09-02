[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/EntradaBitacora](../README.md) / EntradaBitacora

# Interface: EntradaBitacora

Defined in: core/entities/EntradaBitacora.ts:2

Entrada del registro de auditoría global del CRM (append-only, `bitacora/{id}`).

## Properties

### id

> **id**: `string`

Defined in: core/entities/EntradaBitacora.ts:3

***

### at

> **at**: `Date`

Defined in: core/entities/EntradaBitacora.ts:4

***

### actorUid

> **actorUid**: `string` \| `null`

Defined in: core/entities/EntradaBitacora.ts:5

***

### actorNombre

> **actorNombre**: `string` \| `null`

Defined in: core/entities/EntradaBitacora.ts:6

***

### accion

> **accion**: `string`

Defined in: core/entities/EntradaBitacora.ts:8

Acción, p. ej. `crear`, `editar`, `archivar`, `cambiar_estado`.

***

### modulo

> **modulo**: `string`

Defined in: core/entities/EntradaBitacora.ts:10

Módulo afectado: `empresas`, `contactos`, `tickets`, `cotizaciones`…

***

### entidadTipo

> **entidadTipo**: `string`

Defined in: core/entities/EntradaBitacora.ts:11

***

### entidadId

> **entidadId**: `string`

Defined in: core/entities/EntradaBitacora.ts:12

***

### resumen

> **resumen**: `string`

Defined in: core/entities/EntradaBitacora.ts:13
