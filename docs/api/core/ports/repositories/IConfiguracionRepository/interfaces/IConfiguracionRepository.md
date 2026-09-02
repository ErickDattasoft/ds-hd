[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IConfiguracionRepository](../README.md) / IConfiguracionRepository

# Interface: IConfiguracionRepository

Defined in: core/ports/repositories/IConfiguracionRepository.ts:5

Documentos singleton de configuración (`configuracion/{seccion}`).

## Methods

### obtenerTickets()

> **obtenerTickets**(): `Promise`\<[`ConfiguracionTickets`](../../../../entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md)\>

Defined in: core/ports/repositories/IConfiguracionRepository.ts:6

#### Returns

`Promise`\<[`ConfiguracionTickets`](../../../../entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md)\>

***

### guardarTickets()

> **guardarTickets**(`config`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IConfiguracionRepository.ts:7

#### Parameters

##### config

[`ConfiguracionTickets`](../../../../entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md)

#### Returns

`Promise`\<`void`\>

***

### obtenerCalculadora()

> **obtenerCalculadora**(): `Promise`\<[`ConfiguracionCalculadora`](../../../../entities/CalculadoraCompac/interfaces/ConfiguracionCalculadora.md)\>

Defined in: core/ports/repositories/IConfiguracionRepository.ts:8

#### Returns

`Promise`\<[`ConfiguracionCalculadora`](../../../../entities/CalculadoraCompac/interfaces/ConfiguracionCalculadora.md)\>

***

### guardarCalculadora()

> **guardarCalculadora**(`config`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IConfiguracionRepository.ts:9

#### Parameters

##### config

[`ConfiguracionCalculadora`](../../../../entities/CalculadoraCompac/interfaces/ConfiguracionCalculadora.md)

#### Returns

`Promise`\<`void`\>
