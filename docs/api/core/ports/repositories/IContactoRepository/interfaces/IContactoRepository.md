[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IContactoRepository](../README.md) / IContactoRepository

# Interface: IContactoRepository

Persistencia de contactos (`contactos/{id}`).

## Methods

### findById()

> **findById**(`id`): `Promise`\<[`Contacto`](../../../../entities/Contacto/classes/Contacto.md) \| `null`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Contacto`](../../../../entities/Contacto/classes/Contacto.md) \| `null`\>

***

### findByUid()

> **findByUid**(`uid`): `Promise`\<[`Contacto`](../../../../entities/Contacto/classes/Contacto.md) \| `null`\>

#### Parameters

##### uid

`string`

#### Returns

`Promise`\<[`Contacto`](../../../../entities/Contacto/classes/Contacto.md) \| `null`\>

***

### findByEmail()

> **findByEmail**(`email`): `Promise`\<[`Contacto`](../../../../entities/Contacto/classes/Contacto.md) \| `null`\>

#### Parameters

##### email

`string`

#### Returns

`Promise`\<[`Contacto`](../../../../entities/Contacto/classes/Contacto.md) \| `null`\>

***

### list()

> **list**(`filtro?`): `Promise`\<[`Contacto`](../../../../entities/Contacto/classes/Contacto.md)[]\>

#### Parameters

##### filtro?

[`ListarContactosFiltro`](ListarContactosFiltro.md)

#### Returns

`Promise`\<[`Contacto`](../../../../entities/Contacto/classes/Contacto.md)[]\>

***

### contar()

> **contar**(): `Promise`\<`number`\>

Cuántos hay, sin traerlos: lo resuelve el servidor con un conteo agregado.

#### Returns

`Promise`\<`number`\>

***

### guardarVarios()

> **guardarVarios**(`contactos`): `Promise`\<`void`\>

Guarda muchos de golpe (importaciones), agrupando las llamadas.

#### Parameters

##### contactos

[`Contacto`](../../../../entities/Contacto/classes/Contacto.md)[]

#### Returns

`Promise`\<`void`\>

***

### eliminarVarios()

> **eliminarVarios**(`ids`): `Promise`\<`void`\>

Borra muchos de golpe, agrupando las llamadas.

#### Parameters

##### ids

`string`[]

#### Returns

`Promise`\<`void`\>

***

### save()

> **save**(`contacto`): `Promise`\<`void`\>

#### Parameters

##### contacto

[`Contacto`](../../../../entities/Contacto/classes/Contacto.md)

#### Returns

`Promise`\<`void`\>

***

### eliminar()

> **eliminar**(`id`): `Promise`\<`void`\>

Borrado permanente (solo desde la papelera).

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### contarPorEmpresa()

> **contarPorEmpresa**(`empresaId`): `Promise`\<`number`\>

#### Parameters

##### empresaId

`string`

#### Returns

`Promise`\<`number`\>
