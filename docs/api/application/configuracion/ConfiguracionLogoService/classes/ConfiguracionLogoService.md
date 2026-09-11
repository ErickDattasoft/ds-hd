[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/configuracion/ConfiguracionLogoService](../README.md) / ConfiguracionLogoService

# Class: ConfiguracionLogoService

Casos de uso: logo de empresa (encabezado de correos, impresión, portal).

## Constructors

### Constructor

> **new ConfiguracionLogoService**(`repo`, `logger`): `ConfiguracionLogoService`

#### Parameters

##### repo

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`ConfiguracionLogoService`

## Methods

### obtener()

> **obtener**(): `Promise`\<[`ConfiguracionLogo`](../../../../core/entities/ConfiguracionLogo/interfaces/ConfiguracionLogo.md) \| `null`\>

#### Returns

`Promise`\<[`ConfiguracionLogo`](../../../../core/entities/ConfiguracionLogo/interfaces/ConfiguracionLogo.md) \| `null`\>

***

### actualizar()

> **actualizar**(`actor`, `input`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### input

###### contentType

`string`

###### base64

`string`

#### Returns

`Promise`\<`void`\>

***

### eliminar()

> **eliminar**(`actor`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<`void`\>
