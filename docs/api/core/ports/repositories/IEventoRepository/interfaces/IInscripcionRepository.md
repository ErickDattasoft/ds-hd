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

### findByContacto()

> **findByContacto**(`eventoId`, `email`, `telefono`): `Promise`\<[`Inscripcion`](../../../../entities/Inscripcion/interfaces/Inscripcion.md) \| `null`\>

Duplicado por correo **o** por teléfono, como el CRM anterior.

#### Parameters

##### eventoId

`string`

##### email

`string` \| `null`

##### telefono

`string` \| `null`

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

***

### eliminar()

> **eliminar**(`eventoId`, `inscripcionId`): `Promise`\<`void`\>

Borra una sola inscripción (staff quitando un registro basura de la lista).

#### Parameters

##### eventoId

`string`

##### inscripcionId

`string`

#### Returns

`Promise`\<`void`\>

***

### eliminarPorEvento()

> **eliminarPorEvento**(`eventoId`): `Promise`\<`void`\>

Borra todas las inscripciones de un evento (al eliminar el evento).

#### Parameters

##### eventoId

`string`

#### Returns

`Promise`\<`void`\>

***

### listAsistenciasReales()

> **listAsistenciasReales**(): `Promise`\<[`Inscripcion`](../../../../entities/Inscripcion/interfaces/Inscripcion.md)[]\>

Inscripciones con `asistioReal` de TODOS los eventos (collection-group) — para cruzar el
🔁 "ya asistió antes" de una persona contra otros eventos.

#### Returns

`Promise`\<[`Inscripcion`](../../../../entities/Inscripcion/interfaces/Inscripcion.md)[]\>
