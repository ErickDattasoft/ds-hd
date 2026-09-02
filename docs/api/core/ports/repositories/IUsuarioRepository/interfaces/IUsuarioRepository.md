[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IUsuarioRepository](../README.md) / IUsuarioRepository

# Interface: IUsuarioRepository

Defined in: core/ports/repositories/IUsuarioRepository.ts:18

Persistencia de cuentas de usuario (`usuarios/{uid}`).
Semántica compartida por la implementación Firestore y los fakes de test (LSP):
los `findBy*` devuelven `null` si no hay coincidencia; `save` hace upsert por `uid`.

## Methods

### findByUid()

> **findByUid**(`uid`): `Promise`\<[`Usuario`](../../../../entities/Usuario/classes/Usuario.md) \| `null`\>

Defined in: core/ports/repositories/IUsuarioRepository.ts:19

#### Parameters

##### uid

`string`

#### Returns

`Promise`\<[`Usuario`](../../../../entities/Usuario/classes/Usuario.md) \| `null`\>

***

### findByEmail()

> **findByEmail**(`email`): `Promise`\<[`Usuario`](../../../../entities/Usuario/classes/Usuario.md) \| `null`\>

Defined in: core/ports/repositories/IUsuarioRepository.ts:20

#### Parameters

##### email

`string`

#### Returns

`Promise`\<[`Usuario`](../../../../entities/Usuario/classes/Usuario.md) \| `null`\>

***

### list()

> **list**(`filtro?`): `Promise`\<[`Usuario`](../../../../entities/Usuario/classes/Usuario.md)[]\>

Defined in: core/ports/repositories/IUsuarioRepository.ts:21

#### Parameters

##### filtro?

[`ListarUsuariosFiltro`](ListarUsuariosFiltro.md)

#### Returns

`Promise`\<[`Usuario`](../../../../entities/Usuario/classes/Usuario.md)[]\>

***

### listAgentesAsignables()

> **listAgentesAsignables**(): `Promise`\<[`Usuario`](../../../../entities/Usuario/classes/Usuario.md)[]\>

Defined in: core/ports/repositories/IUsuarioRepository.ts:23

Agentes activos y disponibles para asignación (para dropdowns y panel de carga).

#### Returns

`Promise`\<[`Usuario`](../../../../entities/Usuario/classes/Usuario.md)[]\>

***

### save()

> **save**(`usuario`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IUsuarioRepository.ts:24

#### Parameters

##### usuario

[`Usuario`](../../../../entities/Usuario/classes/Usuario.md)

#### Returns

`Promise`\<`void`\>

***

### countByRol()

> **countByRol**(`rol`): `Promise`\<`number`\>

Defined in: core/ports/repositories/IUsuarioRepository.ts:26

Cuántos usuarios hay con ese rol (para no dejar el sistema sin ningún admin).

#### Parameters

##### rol

`"admin"` \| `"supervisor"` \| `"agente"` \| `"lectura"` \| `"cliente"`

#### Returns

`Promise`\<`number`\>
