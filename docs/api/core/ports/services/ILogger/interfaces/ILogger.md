[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/ILogger](../README.md) / ILogger

# Interface: ILogger

Puerto de logging. La capa de aplicación depende de esta interfaz, nunca de pino
directamente (DIP). El adaptador vive en infrastructure/system/PinoLogger.ts.

## Methods

### debug()

> **debug**(`msg`, `fields?`): `void`

#### Parameters

##### msg

`string`

##### fields?

[`LogFields`](../type-aliases/LogFields.md)

#### Returns

`void`

***

### info()

> **info**(`msg`, `fields?`): `void`

#### Parameters

##### msg

`string`

##### fields?

[`LogFields`](../type-aliases/LogFields.md)

#### Returns

`void`

***

### warn()

> **warn**(`msg`, `fields?`): `void`

#### Parameters

##### msg

`string`

##### fields?

[`LogFields`](../type-aliases/LogFields.md)

#### Returns

`void`

***

### error()

> **error**(`msg`, `fields?`): `void`

#### Parameters

##### msg

`string`

##### fields?

[`LogFields`](../type-aliases/LogFields.md)

#### Returns

`void`

***

### child()

> **child**(`fields`): `ILogger`

Devuelve un logger hijo con campos fijos (p. ej. `{ requestId }`).

#### Parameters

##### fields

[`LogFields`](../type-aliases/LogFields.md)

#### Returns

`ILogger`
