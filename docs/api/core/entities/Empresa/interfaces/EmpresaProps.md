[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Empresa](../README.md) / EmpresaProps

# Interface: EmpresaProps

Props para construir una [Empresa](../classes/Empresa.md).

## Properties

### id

> **id**: `string`

***

### nombre

> **nombre**: `string`

***

### rfc?

> `optional` **rfc?**: `string` \| `null`

***

### razonSocial?

> `optional` **razonSocial?**: `string` \| `null`

***

### direccion?

> `optional` **direccion?**: `string` \| `null`

***

### telefono?

> `optional` **telefono?**: `string` \| `null`

***

### email?

> `optional` **email?**: `string` \| `null`

***

### sistemasContratados?

> `optional` **sistemasContratados?**: `string`[]

***

### vigencias?

> `optional` **vigencias?**: `Record`\<`string`, `string`\>

Vigencia de licencia por sistema, formato ISO `YYYY-MM-DD`.

***

### versionesInstaladas?

> `optional` **versionesInstaladas?**: `Record`\<`string`, `string`\>

Versión instalada por sistema (texto libre, p. ej. `16.3.1 SP2`).

***

### contactoPrincipalId?

> `optional` **contactoPrincipalId?**: `string` \| `null`

***

### notas?

> `optional` **notas?**: `string` \| `null`

***

### activa?

> `optional` **activa?**: `boolean`

***

### favorita?

> `optional` **favorita?**: `boolean`

Marcada como favorita (⭐) por el equipo — atajo para la lista.

***

### camposExtra?

> `optional` **camposExtra?**: `object`[]

Campos personalizados libres de esta empresa.

#### etiqueta

> **etiqueta**: `string`

#### valor

> **valor**: `string`

***

### creadoPorUid?

> `optional` **creadoPorUid?**: `string` \| `null`

***

### createdAt?

> `optional` **createdAt?**: `Date`

***

### updatedAt?

> `optional` **updatedAt?**: `Date`

***

### ultimoAvisoVersionesEn?

> `optional` **ultimoAvisoVersionesEn?**: `Date` \| `null`

Último aviso masivo de versiones/licencias enviado (para el panel de pendientes).

***

### ultimoAvisoLicenciasEn?

> `optional` **ultimoAvisoLicenciasEn?**: `Date` \| `null`
