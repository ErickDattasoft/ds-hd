[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IUsuarioRepository](../README.md) / IUsuarioRepository

# Interface: IUsuarioRepository

Persistencia de cuentas de usuario (`usuarios/{uid}`).
Semántica compartida por la implementación Firestore y los fakes de test (LSP):
los `findBy*` devuelven `null` si no hay coincidencia; `save` hace upsert por `uid`.

## Methods

### findByUid()

> **findByUid**(`uid`): `Promise`\<[`Usuario`](../../../../entities/Usuario/classes/Usuario.md) \| `null`\>

#### Parameters

##### uid

`string`

#### Returns

`Promise`\<[`Usuario`](../../../../entities/Usuario/classes/Usuario.md) \| `null`\>

***

### findByEmail()

> **findByEmail**(`email`): `Promise`\<[`Usuario`](../../../../entities/Usuario/classes/Usuario.md) \| `null`\>

#### Parameters

##### email

`string`

#### Returns

`Promise`\<[`Usuario`](../../../../entities/Usuario/classes/Usuario.md) \| `null`\>

***

### list()

> **list**(`filtro?`): `Promise`\<[`Usuario`](../../../../entities/Usuario/classes/Usuario.md)[]\>

#### Parameters

##### filtro?

[`ListarUsuariosFiltro`](ListarUsuariosFiltro.md)

#### Returns

`Promise`\<[`Usuario`](../../../../entities/Usuario/classes/Usuario.md)[]\>

***

### listAgentesAsignables()

> **listAgentesAsignables**(): `Promise`\<[`Usuario`](../../../../entities/Usuario/classes/Usuario.md)[]\>

Agentes activos y disponibles para asignación (para dropdowns y panel de carga).

#### Returns

`Promise`\<[`Usuario`](../../../../entities/Usuario/classes/Usuario.md)[]\>

***

### save()

> **save**(`usuario`): `Promise`\<`void`\>

#### Parameters

##### usuario

[`Usuario`](../../../../entities/Usuario/classes/Usuario.md)

#### Returns

`Promise`\<`void`\>

***

### countByRol()

> **countByRol**(`rol`): `Promise`\<`number`\>

Cuántos usuarios hay con ese rol (para no dejar el sistema sin ningún admin).

#### Parameters

##### rol

`"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`

#### Returns

`Promise`\<`number`\>

***

### delete()

> **delete**(`uid`): `Promise`\<`void`\>

Borra el documento. Solo lo usa la migración, para eliminar el doc placeholder
(uid = correo) tras reasignarlo al uid real de Firebase Auth; el resto de la app nunca
borra cuentas, solo las desactiva (`activo: false`).

#### Parameters

##### uid

`string`

#### Returns

`Promise`\<`void`\>
