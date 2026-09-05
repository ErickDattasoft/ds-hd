[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/configuracion/AcercaDeService](../README.md) / AcercaDeService

# Class: AcercaDeService

Casos de uso: leer y editar la parte configurable de "Acerca de".

## Constructors

### Constructor

> **new AcercaDeService**(`repo`, `logger`): `AcercaDeService`

#### Parameters

##### repo

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`AcercaDeService`

## Methods

### obtener()

> **obtener**(): `Promise`\<[`AcercaDe`](../../../../core/entities/AcercaDe/interfaces/AcercaDe.md)\>

#### Returns

`Promise`\<[`AcercaDe`](../../../../core/entities/AcercaDe/interfaces/AcercaDe.md)\>

***

### actualizar()

> **actualizar**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### version

`string`

###### ultimaActualizacion

`string`

###### notas

`string`

#### Returns

`Promise`\<`void`\>
