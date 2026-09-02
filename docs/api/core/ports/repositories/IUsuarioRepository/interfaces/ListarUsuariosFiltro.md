[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IUsuarioRepository](../README.md) / ListarUsuariosFiltro

# Interface: ListarUsuariosFiltro

Defined in: core/ports/repositories/IUsuarioRepository.ts:5

Filtros para listar usuarios.

## Properties

### rol?

> `optional` **rol?**: `"admin"` \| `"supervisor"` \| `"agente"` \| `"lectura"` \| `"cliente"`

Defined in: core/ports/repositories/IUsuarioRepository.ts:6

***

### activo?

> `optional` **activo?**: `boolean`

Defined in: core/ports/repositories/IUsuarioRepository.ts:7

***

### empresaId?

> `optional` **empresaId?**: `string`

Defined in: core/ports/repositories/IUsuarioRepository.ts:8

***

### texto?

> `optional` **texto?**: `string`

Defined in: core/ports/repositories/IUsuarioRepository.ts:10

Búsqueda simple por nombre/correo (contains, case-insensitive).
