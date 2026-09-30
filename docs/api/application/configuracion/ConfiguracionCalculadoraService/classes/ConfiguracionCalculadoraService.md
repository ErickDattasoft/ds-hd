[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/configuracion/ConfiguracionCalculadoraService](../README.md) / ConfiguracionCalculadoraService

# Class: ConfiguracionCalculadoraService

Casos de uso: leer y actualizar catálogos y precios de la calculadora Compac/CONTPAQi.

## Constructors

### Constructor

> **new ConfiguracionCalculadoraService**(`repo`, `logger`): `ConfiguracionCalculadoraService`

#### Parameters

##### repo

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`ConfiguracionCalculadoraService`

## Methods

### obtener()

> **obtener**(): `Promise`\<[`ConfiguracionCalculadora`](../../../../core/entities/CalculadoraCompac/interfaces/ConfiguracionCalculadora.md)\>

#### Returns

`Promise`\<[`ConfiguracionCalculadora`](../../../../core/entities/CalculadoraCompac/interfaces/ConfiguracionCalculadora.md)\>

***

### actualizar()

> **actualizar**(`input`): `Promise`\<`void`\>

Reemplaza los catálogos completos (agregar, quitar, renombrar y reordenar, como el viejo).

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### catalogoSistemas

`string`[]

###### catalogoEquipos

`object`[]

###### precioSQL

`unknown`

#### Returns

`Promise`\<`void`\>
