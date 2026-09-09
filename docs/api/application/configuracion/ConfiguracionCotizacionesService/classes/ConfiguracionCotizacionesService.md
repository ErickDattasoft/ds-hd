[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/configuracion/ConfiguracionCotizacionesService](../README.md) / ConfiguracionCotizacionesService

# Class: ConfiguracionCotizacionesService

Casos de uso: leer y actualizar la config del módulo de cotizaciones.

## Constructors

### Constructor

> **new ConfiguracionCotizacionesService**(`repo`, `logger`): `ConfiguracionCotizacionesService`

#### Parameters

##### repo

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`ConfiguracionCotizacionesService`

## Methods

### obtener()

> **obtener**(): `Promise`\<[`ConfiguracionCotizaciones`](../../../../core/entities/ConfiguracionCotizaciones/interfaces/ConfiguracionCotizaciones.md)\>

#### Returns

`Promise`\<[`ConfiguracionCotizaciones`](../../../../core/entities/ConfiguracionCotizaciones/interfaces/ConfiguracionCotizaciones.md)\>

***

### actualizar()

> **actualizar**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### condicionesPorDefecto

`string`

###### emisorCargoPorDefecto

`string`

###### emisorTelefonoPorDefecto

`string`

#### Returns

`Promise`\<`void`\>
