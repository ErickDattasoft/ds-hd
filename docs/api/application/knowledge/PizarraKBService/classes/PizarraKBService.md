[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/knowledge/PizarraKBService](../README.md) / PizarraKBService

# Class: PizarraKBService

Pizarra temporal: bloc de notas personal con autoguardado, una por usuario.

## Constructors

### Constructor

> **new PizarraKBService**(`repo`, `clock`): `PizarraKBService`

#### Parameters

##### repo

[`IPizarraKBRepository`](../../../../core/ports/repositories/IPizarraKBRepository/interfaces/IPizarraKBRepository.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

#### Returns

`PizarraKBService`

## Methods

### obtener()

> **obtener**(`actor`): `Promise`\<`string`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<`string`\>

***

### guardar()

> **guardar**(`actor`, `contenido`): `Promise`\<`Date`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### contenido

`string`

#### Returns

`Promise`\<`Date`\>
