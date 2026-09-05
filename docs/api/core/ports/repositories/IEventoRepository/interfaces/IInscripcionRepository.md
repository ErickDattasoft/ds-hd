[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IEventoRepository](../README.md) / IInscripcionRepository

# Interface: IInscripcionRepository

Persistencia de inscripciones a eventos (subcolección de cada evento).

## Methods

### create()

> **create**(`inscripcion`): `Promise`\<`void`\>

#### Parameters

##### inscripcion

[`Inscripcion`](../../../../entities/Inscripcion/interfaces/Inscripcion.md)

#### Returns

`Promise`\<`void`\>

***

### findByEmail()

> **findByEmail**(`eventoId`, `email`): `Promise`\<[`Inscripcion`](../../../../entities/Inscripcion/interfaces/Inscripcion.md) \| `null`\>

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

Busca una inscripción por id en cualquier evento (collection-group). Para el webhook de Brevo.

#### Parameters

##### inscripcionId

`string`

#### Returns

`Promise`\<[`Inscripcion`](../../../../entities/Inscripcion/interfaces/Inscripcion.md) \| `null`\>

***

### listPorEvento()

> **listPorEvento**(`eventoId`): `Promise`\<[`Inscripcion`](../../../../entities/Inscripcion/interfaces/Inscripcion.md)[]\>

#### Parameters

##### eventoId

`string`

#### Returns

`Promise`\<[`Inscripcion`](../../../../entities/Inscripcion/interfaces/Inscripcion.md)[]\>

***

### contar()

> **contar**(`eventoId`): `Promise`\<`number`\>

#### Parameters

##### eventoId

`string`

#### Returns

`Promise`\<`number`\>

***

### contarPorIp()

> **contarPorIp**(`eventoId`, `ip`): `Promise`\<`number`\>

Cuántas inscripciones a este evento vienen de una IP dada (para el límite antiabuso).

#### Parameters

##### eventoId

`string`

##### ip

`string`

#### Returns

`Promise`\<`number`\>

***

### save()

> **save**(`inscripcion`): `Promise`\<`void`\>

#### Parameters

##### inscripcion

[`Inscripcion`](../../../../entities/Inscripcion/interfaces/Inscripcion.md)

#### Returns

`Promise`\<`void`\>
