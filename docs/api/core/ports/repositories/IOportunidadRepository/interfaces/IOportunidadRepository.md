[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IOportunidadRepository](../README.md) / IOportunidadRepository

# Interface: IOportunidadRepository

Persistencia del embudo de ventas (`oportunidades/{id}`).

## Methods

### findById()

> **findById**(`id`): `Promise`\<[`Oportunidad`](../../../../entities/Oportunidad/classes/Oportunidad.md) \| `null`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Oportunidad`](../../../../entities/Oportunidad/classes/Oportunidad.md) \| `null`\>

***

### list()

> **list**(): `Promise`\<[`Oportunidad`](../../../../entities/Oportunidad/classes/Oportunidad.md)[]\>

#### Returns

`Promise`\<[`Oportunidad`](../../../../entities/Oportunidad/classes/Oportunidad.md)[]\>

***

### save()

> **save**(`o`): `Promise`\<`void`\>

#### Parameters

##### o

[`Oportunidad`](../../../../entities/Oportunidad/classes/Oportunidad.md)

#### Returns

`Promise`\<`void`\>

***

### delete()

> **delete**(`id`): `Promise`\<`void`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>
