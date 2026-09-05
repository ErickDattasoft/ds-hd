[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/cotizaciones/CotizacionService](../README.md) / CotizacionService

# Class: CotizacionService

Gestión de cotizaciones: folio consecutivo, conceptos, ciclo de estado.

## Constructors

### Constructor

> **new CotizacionService**(`repo`, `contadores`, `empresas`, `ids`, `clock`, `bitacora`, `webhooks`): `CotizacionService`

#### Parameters

##### repo

[`ICotizacionRepository`](../../../../core/ports/repositories/ICotizacionRepository/interfaces/ICotizacionRepository.md)

##### contadores

[`IContadorRepository`](../../../../core/ports/repositories/IContadorRepository/interfaces/IContadorRepository.md)

##### empresas

[`IEmpresaRepository`](../../../../core/ports/repositories/IEmpresaRepository/interfaces/IEmpresaRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### bitacora

[`BitacoraService`](../../../shared/BitacoraService/classes/BitacoraService.md)

##### webhooks

[`IWebhookPublisher`](../../../../core/ports/services/IWebhookPublisher/interfaces/IWebhookPublisher.md)

#### Returns

`CotizacionService`

## Methods

### listar()

> **listar**(`filtro?`): `Promise`\<[`Cotizacion`](../../../../core/entities/Cotizacion/classes/Cotizacion.md)[]\>

#### Parameters

##### filtro?

[`ListarCotizacionesFiltro`](../../../../core/ports/repositories/ICotizacionRepository/interfaces/ListarCotizacionesFiltro.md)

#### Returns

`Promise`\<[`Cotizacion`](../../../../core/entities/Cotizacion/classes/Cotizacion.md)[]\>

***

### obtener()

> **obtener**(`id`): `Promise`\<[`Cotizacion`](../../../../core/entities/Cotizacion/classes/Cotizacion.md)\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Cotizacion`](../../../../core/entities/Cotizacion/classes/Cotizacion.md)\>

***

### crear()

> **crear**(`actor`, `datos`): `Promise`\<[`Cotizacion`](../../../../core/entities/Cotizacion/classes/Cotizacion.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### datos

[`DatosCotizacion`](../interfaces/DatosCotizacion.md)

#### Returns

`Promise`\<[`Cotizacion`](../../../../core/entities/Cotizacion/classes/Cotizacion.md)\>

***

### actualizarConceptos()

> **actualizarConceptos**(`actor`, `id`, `conceptos`, `notas?`): `Promise`\<[`Cotizacion`](../../../../core/entities/Cotizacion/classes/Cotizacion.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### id

`string`

##### conceptos

[`ConceptoCotizacion`](../../../../core/entities/Cotizacion/interfaces/ConceptoCotizacion.md)[]

##### notas?

`string`

#### Returns

`Promise`\<[`Cotizacion`](../../../../core/entities/Cotizacion/classes/Cotizacion.md)\>

***

### cambiarEstado()

> **cambiarEstado**(`actor`, `id`, `estado`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### id

`string`

##### estado

[`EstadoCotizacion`](../../../../core/entities/Cotizacion/type-aliases/EstadoCotizacion.md)

#### Returns

`Promise`\<`void`\>

***

### contarPorEstado()

> **contarPorEstado**(): `Promise`\<`Record`\<`string`, `number`\>\>

#### Returns

`Promise`\<`Record`\<`string`, `number`\>\>
