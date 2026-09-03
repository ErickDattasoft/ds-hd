[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IUsuarioRepository](../README.md) / ListarUsuariosFiltro

# Interface: ListarUsuariosFiltro

Filtros para listar usuarios.

## Properties

### rol?

> `optional` **rol?**: `"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`

***

### roles?

> `optional` **roles?**: readonly (`"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`)[]

Varios roles a la vez (OR). Se combina con `activo`/`empresaId`; ignora `rol` si viene.

***

### activo?

> `optional` **activo?**: `boolean`

***

### empresaId?

> `optional` **empresaId?**: `string`

***

### texto?

> `optional` **texto?**: `string`

Búsqueda simple por nombre/correo (contains, case-insensitive).
