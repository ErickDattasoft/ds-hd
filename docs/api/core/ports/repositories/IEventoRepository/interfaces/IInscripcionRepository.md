[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IEventoRepository](../README.md) / IInscripcionRepository

# Interface: IInscripcionRepository

Defined in: core/ports/repositories/IEventoRepository.ts:14

Persistencia de inscripciones a eventos (subcolección de cada evento).

## Methods

### create()

> **create**(`inscripcion`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IEventoRepository.ts:15

#### Parameters

##### inscripcion

[`Inscripcion`](../../../../entities/Inscripcion/interfaces/Inscripcion.md)

#### Returns

`Promise`\<`void`\>

***

### findByEmail()

> **findByEmail**(`eventoId`, `email`): `Promise`\<[`Inscripcion`](../../../../entities/Inscripcion/interfaces/Inscripcion.md) \| `null`\>

Defined in: core/ports/repositories/IEventoRepository.ts:16

#### Parameters

##### eventoId

`string`

##### email

`string`

#### Returns

`Promise`\<[`Inscripcion`](../../../../entities/Inscripcion/interfaces/Inscripcion.md) \| `null`\>

***

### findGlobal()

> **findGlobal**(`inscripcionId`): `Promise`\<[`Inscripcion`](../../../../entities/Inscripcion/interfaces/Inscripcion.md) \| `null`\>

Defined in: core/ports/repositories/IEventoRepository.ts:18

Busca una inscripción por id en cualquier evento (collection-group). Para el webhook de Brevo.

#### Parameters

##### inscripcionId

`string`

#### Returns

`Promise`\<[`Inscripcion`](../../../../entities/Inscripcion/interfaces/Inscripcion.md) \| `null`\>

***

### listPorEvento()

> **listPorEvento**(`eventoId`): `Promise`\<[`Inscripcion`](../../../../entities/Inscripcion/interfaces/Inscripcion.md)[]\>

Defined in: core/ports/repositories/IEventoRepository.ts:19

#### Parameters

##### eventoId

`string`

#### Returns

`Promise`\<[`Inscripcion`](../../../../entities/Inscripcion/interfaces/Inscripcion.md)[]\>

***

### contar()

> **contar**(`eventoId`): `Promise`\<`number`\>

Defined in: core/ports/repositories/IEventoRepository.ts:20

#### Parameters

##### eventoId

`string`

#### Returns

`Promise`\<`number`\>

***

### save()

> **save**(`inscripcion`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IEventoRepository.ts:21

#### Parameters

##### inscripcion

[`Inscripcion`](../../../../entities/Inscripcion/interfaces/Inscripcion.md)

#### Returns

`Promise`\<`void`\>
