[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/configuracion/ConfiguracionCalculadoraService](../README.md) / ConfiguracionCalculadoraService

# Class: ConfiguracionCalculadoraService

Casos de uso: leer y actualizar los precios de la calculadora Compac/CONTPAQi.

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

`precios` viene indexado por `clave` de sistema; solo se tocan los precios, no el catálogo.

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### precios

`Record`\<`string`, \{ `precioPrimero?`: `unknown`; `precioAdicional?`: `unknown`; \}\>

###### sqlPrecioServidor

`unknown`

###### sqlPrecioTerminal

`unknown`

###### ivaTasa

`unknown`

###### moneda

`string`

#### Returns

`Promise`\<`void`\>
