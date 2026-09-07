[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Evento](../README.md) / Evento

# Class: Evento

Evento / webinar con registro público.

## Constructors

### Constructor

> **new Evento**(`props`): `Evento`

#### Parameters

##### props

[`EventoProps`](../interfaces/EventoProps.md)

#### Returns

`Evento`

## Properties

### id

> `readonly` **id**: `string`

***

### titulo

> **titulo**: `string`

***

### descripcion

> **descripcion**: `string` \| `null`

***

### fechaHora

> **fechaHora**: `Date`

***

### cupo

> **cupo**: `number`

***

### estado

> **estado**: [`EstadoEvento`](../type-aliases/EstadoEvento.md)

***

### urlWebinar

> **urlWebinar**: `string` \| `null`

***

### horasRecordatorio

> **horasRecordatorio**: `number`

***

### limiteRegistrosPorIp

> **limiteRegistrosPorIp**: `number` \| `null`

***

### invitaciones

> **invitaciones**: [`InvitacionEmpresa`](../interfaces/InvitacionEmpresa.md)[]

***

### invitadosExternos

> **invitadosExternos**: [`InvitadoExterno`](../interfaces/InvitadoExterno.md)[]

***

### creadoPorUid

> `readonly` **creadoPorUid**: `string` \| `null`

***

### createdAt

> `readonly` **createdAt**: `Date`

***

### updatedAt

> **updatedAt**: `Date`

## Accessors

### abiertoARegistro

#### Get Signature

> **get** **abiertoARegistro**(): `boolean`

##### Returns

`boolean`

***

### sinCupo

#### Get Signature

> **get** **sinCupo**(): `boolean`

##### Returns

`boolean`

***

### limiteIpEfectivo

#### Get Signature

> **get** **limiteIpEfectivo**(): `number`

El tope de inscripciones por IP que aplica de verdad (el propio o el de por defecto).

##### Returns

`number`

***

### resumenInvitaciones

#### Get Signature

> **get** **resumenInvitaciones**(): [`ResumenInvitaciones`](../interfaces/ResumenInvitaciones.md)

Conteos combinados de empresas invitadas + invitados externos.

##### Returns

[`ResumenInvitaciones`](../interfaces/ResumenInvitaciones.md)

## Methods

### agregarEmpresaInvitada()

> **agregarEmpresaInvitada**(`entrada`): [`InvitacionEmpresa`](../interfaces/InvitacionEmpresa.md)

#### Parameters

##### entrada

###### id

`string`

###### empresaId?

`string` \| `null`

###### empresaNombre

`string`

###### sistemas?

`string`[]

###### invitadoPor?

`string` \| `null`

#### Returns

[`InvitacionEmpresa`](../interfaces/InvitacionEmpresa.md)

***

### actualizarEmpresaInvitada()

> **actualizarEmpresaInvitada**(`id`, `cambios`): `void`

#### Parameters

##### id

`string`

##### cambios

`Partial`\<`Pick`\<[`InvitacionEmpresa`](../interfaces/InvitacionEmpresa.md), `"invitadoPor"` \| `"contactado"` \| `"respuesta"` \| `"notas"`\>\>

#### Returns

`void`

***

### quitarEmpresaInvitada()

> **quitarEmpresaInvitada**(`id`): `void`

#### Parameters

##### id

`string`

#### Returns

`void`

***

### agregarInvitadoExterno()

> **agregarInvitadoExterno**(`entrada`): [`InvitadoExterno`](../interfaces/InvitadoExterno.md)

#### Parameters

##### entrada

###### id

`string`

###### nombre?

`string`

###### fuente?

`string` \| `null`

#### Returns

[`InvitadoExterno`](../interfaces/InvitadoExterno.md)

***

### actualizarInvitadoExterno()

> **actualizarInvitadoExterno**(`id`, `cambios`): `void`

#### Parameters

##### id

`string`

##### cambios

`Partial`\<`Pick`\<[`InvitadoExterno`](../interfaces/InvitadoExterno.md), `"nombre"` \| `"fuente"` \| `"contactado"` \| `"respuesta"` \| `"notas"`\>\>

#### Returns

`void`

***

### quitarInvitadoExterno()

> **quitarInvitadoExterno**(`id`): `void`

#### Parameters

##### id

`string`

#### Returns

`void`
