[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IContactoRepository](../README.md) / IContactoRepository

# Interface: IContactoRepository

Defined in: core/ports/repositories/IContactoRepository.ts:12

Persistencia de contactos (`contactos/{id}`).

## Methods

### findById()

> **findById**(`id`): `Promise`\<[`Contacto`](../../../../entities/Contacto/classes/Contacto.md) \| `null`\>

Defined in: core/ports/repositories/IContactoRepository.ts:13

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Contacto`](../../../../entities/Contacto/classes/Contacto.md) \| `null`\>

***

### findByUid()

> **findByUid**(`uid`): `Promise`\<[`Contacto`](../../../../entities/Contacto/classes/Contacto.md) \| `null`\>

Defined in: core/ports/repositories/IContactoRepository.ts:14

#### Parameters

##### uid

`string`

#### Returns

`Promise`\<[`Contacto`](../../../../entities/Contacto/classes/Contacto.md) \| `null`\>

***

### findByEmail()

> **findByEmail**(`email`): `Promise`\<[`Contacto`](../../../../entities/Contacto/classes/Contacto.md) \| `null`\>

Defined in: core/ports/repositories/IContactoRepository.ts:15

#### Parameters

##### email

`string`

#### Returns

`Promise`\<[`Contacto`](../../../../entities/Contacto/classes/Contacto.md) \| `null`\>

***

### list()

> **list**(`filtro?`): `Promise`\<[`Contacto`](../../../../entities/Contacto/classes/Contacto.md)[]\>

Defined in: core/ports/repositories/IContactoRepository.ts:16

#### Parameters

##### filtro?

[`ListarContactosFiltro`](ListarContactosFiltro.md)

#### Returns

`Promise`\<[`Contacto`](../../../../entities/Contacto/classes/Contacto.md)[]\>

***

### save()

> **save**(`contacto`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IContactoRepository.ts:17

#### Parameters

##### contacto

[`Contacto`](../../../../entities/Contacto/classes/Contacto.md)

#### Returns

`Promise`\<`void`\>

***

### contarPorEmpresa()

> **contarPorEmpresa**(`empresaId`): `Promise`\<`number`\>

Defined in: core/ports/repositories/IContactoRepository.ts:18

#### Parameters

##### empresaId

`string`

#### Returns

`Promise`\<`number`\>
