[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/shared/BitacoraService](../README.md) / BitacoraService

# Class: BitacoraService

Servicio transversal de auditoría: los casos de uso lo invocan para dejar registro de una
acción relevante. Best-effort — si el registro falla, se loguea pero no rompe la operación.

## Constructors

### Constructor

> **new BitacoraService**(`repo`, `ids`, `clock`, `logger`): `BitacoraService`

#### Parameters

##### repo

[`IBitacoraRepository`](../../../../core/ports/repositories/IBitacoraRepository/interfaces/IBitacoraRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`BitacoraService`

## Methods

### registrar()

> **registrar**(`data`): `Promise`\<`void`\>

#### Parameters

##### data

###### actor

[`SessionUser`](../../SessionUser/interfaces/SessionUser.md) \| `null`

###### accion

`string`

###### modulo

`string`

###### entidadTipo

`string`

###### entidadId

`string`

###### resumen

`string`

#### Returns

`Promise`\<`void`\>

***

### listar()

> **listar**(`filtro?`): `Promise`\<[`EntradaBitacora`](../../../../core/entities/EntradaBitacora/interfaces/EntradaBitacora.md)[]\>

#### Parameters

##### filtro?

[`FiltroBitacora`](../../../../core/ports/repositories/IBitacoraRepository/interfaces/FiltroBitacora.md)

#### Returns

`Promise`\<[`EntradaBitacora`](../../../../core/entities/EntradaBitacora/interfaces/EntradaBitacora.md)[]\>

***

### purgar()

> **purgar**(`fecha`, `maxBorrar?`): `Promise`\<\{ `borradas`: `number`; `hayMas`: `boolean`; \}\>

Borra entradas anteriores a `fecha` (acción manual "Limpiar").

#### Parameters

##### fecha

`Date`

##### maxBorrar?

`number`

#### Returns

`Promise`\<\{ `borradas`: `number`; `hayMas`: `boolean`; \}\>

***

### aplicarRetencion()

> **aplicarRetencion**(): `Promise`\<\{ `borradas`: `number`; `hayMas`: `boolean`; `corte`: `Date`; \}\>

Retención automática: borra lo anterior a [BITACORA\_RETENCION\_DIAS](../variables/BITACORA_RETENCION_DIAS.md) días.

#### Returns

`Promise`\<\{ `borradas`: `number`; `hayMas`: `boolean`; `corte`: `Date`; \}\>

***

### exportarCsv()

> **exportarCsv**(`filtro?`): `Promise`\<`string`\>

Exporta la bitácora filtrada como CSV (UTF-8, separador coma).

#### Parameters

##### filtro?

[`FiltroBitacora`](../../../../core/ports/repositories/IBitacoraRepository/interfaces/FiltroBitacora.md)

#### Returns

`Promise`\<`string`\>
