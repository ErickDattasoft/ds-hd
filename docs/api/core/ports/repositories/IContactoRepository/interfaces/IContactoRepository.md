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
