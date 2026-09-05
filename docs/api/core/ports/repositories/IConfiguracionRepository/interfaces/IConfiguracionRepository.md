[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IConfiguracionRepository](../README.md) / IConfiguracionRepository

# Interface: IConfiguracionRepository

Documentos singleton de configuración (`configuracion/{seccion}`).

## Methods

### obtenerTickets()

> **obtenerTickets**(): `Promise`\<[`ConfiguracionTickets`](../../../../entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md)\>

#### Returns

`Promise`\<[`ConfiguracionTickets`](../../../../entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md)\>

***

### guardarTickets()

> **guardarTickets**(`config`): `Promise`\<`void`\>

#### Parameters

##### config

[`ConfiguracionTickets`](../../../../entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md)

#### Returns

`Promise`\<`void`\>

***

### obtenerCalculadora()

> **obtenerCalculadora**(): `Promise`\<[`ConfiguracionCalculadora`](../../../../entities/CalculadoraCompac/interfaces/ConfiguracionCalculadora.md)\>

#### Returns

`Promise`\<[`ConfiguracionCalculadora`](../../../../entities/CalculadoraCompac/interfaces/ConfiguracionCalculadora.md)\>

***

### guardarCalculadora()

> **guardarCalculadora**(`config`): `Promise`\<`void`\>

#### Parameters

##### config

[`ConfiguracionCalculadora`](../../../../entities/CalculadoraCompac/interfaces/ConfiguracionCalculadora.md)

#### Returns

`Promise`\<`void`\>

***

### obtenerAvisos()

> **obtenerAvisos**(): `Promise`\<[`ConfiguracionAvisos`](../../../../entities/ConfiguracionAvisos/interfaces/ConfiguracionAvisos.md)\>

#### Returns

`Promise`\<[`ConfiguracionAvisos`](../../../../entities/ConfiguracionAvisos/interfaces/ConfiguracionAvisos.md)\>

***

### guardarAvisos()

> **guardarAvisos**(`config`): `Promise`\<`void`\>

#### Parameters

##### config

[`ConfiguracionAvisos`](../../../../entities/ConfiguracionAvisos/interfaces/ConfiguracionAvisos.md)

#### Returns

`Promise`\<`void`\>

***

### obtenerIntegraciones()

> **obtenerIntegraciones**(): `Promise`\<[`ConfiguracionIntegraciones`](../../../../entities/ConfiguracionIntegraciones/interfaces/ConfiguracionIntegraciones.md)\>

#### Returns

`Promise`\<[`ConfiguracionIntegraciones`](../../../../entities/ConfiguracionIntegraciones/interfaces/ConfiguracionIntegraciones.md)\>

***

### guardarIntegraciones()

> **guardarIntegraciones**(`config`): `Promise`\<`void`\>

#### Parameters

##### config

[`ConfiguracionIntegraciones`](../../../../entities/ConfiguracionIntegraciones/interfaces/ConfiguracionIntegraciones.md)

#### Returns

`Promise`\<`void`\>

***

### obtenerAcercaDe()

> **obtenerAcercaDe**(): `Promise`\<[`AcercaDe`](../../../../entities/AcercaDe/interfaces/AcercaDe.md)\>

#### Returns

`Promise`\<[`AcercaDe`](../../../../entities/AcercaDe/interfaces/AcercaDe.md)\>

***

### guardarAcercaDe()

> **guardarAcercaDe**(`config`): `Promise`\<`void`\>

#### Parameters

##### config

[`AcercaDe`](../../../../entities/AcercaDe/interfaces/AcercaDe.md)

#### Returns

`Promise`\<`void`\>
