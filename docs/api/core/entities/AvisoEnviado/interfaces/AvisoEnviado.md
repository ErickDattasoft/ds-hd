[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/AvisoEnviado](../README.md) / AvisoEnviado

# Interface: AvisoEnviado

Un aviso ya enviado, **una fila por empresa y sistema** — no por envío. Así el historial
puede responder "¿de qué versión a cuál le avisamos a esta empresa, y cuándo?", que es lo
que se perdía al guardar solo la fecha del último aviso en la empresa.

Se guarda en la colección `avisos_versiones`.

## Properties

### id

> **id**: `string`

***

### empresaId

> **empresaId**: `string`

***

### empresaNombre

> **empresaNombre**: `string`

Copia del nombre al momento del envío: el historial no debe cambiar si la empresa se renombra.

***

### sistema

> **sistema**: `string`

***

### tipo

> **tipo**: [`TipoAvisoEnviado`](../type-aliases/TipoAvisoEnviado.md)

***

### versionInstalada

> **versionInstalada**: `string` \| `null`

Solo para `tipo: 'sistema'`.

***

### versionOficial

> **versionOficial**: `string` \| `null`

Solo para `tipo: 'sistema'`.

***

### fechaVencimiento

> **fechaVencimiento**: `string` \| `null`

Solo para `tipo: 'licencia'` (ISO `YYYY-MM-DD`).

***

### canal

> **canal**: [`CanalAvisoEnviado`](../type-aliases/CanalAvisoEnviado.md)

***

### destino

> **destino**: `string` \| `null`

Correo o teléfono al que se mandó, según el canal.

***

### enviadoPorUid

> **enviadoPorUid**: `string`

***

### enviadoPorNombre

> **enviadoPorNombre**: `string`

***

### createdAt

> **createdAt**: `Date`
