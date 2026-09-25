[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IAvisoRepository](../README.md) / IAvisoRepository

# Interface: IAvisoRepository

Historial de avisos de versiones/licencias ya enviados (`avisos_versiones/{id}`).

## Methods

### registrar()

> **registrar**(`avisos`): `Promise`\<`void`\>

Registra varios de golpe: un envío a una empresa genera un aviso por sistema.

#### Parameters

##### avisos

[`AvisoEnviado`](../../../../entities/AvisoEnviado/interfaces/AvisoEnviado.md)[]

#### Returns

`Promise`\<`void`\>

***

### list()

> **list**(`filtro?`): `Promise`\<[`AvisoEnviado`](../../../../entities/AvisoEnviado/interfaces/AvisoEnviado.md)[]\>

Los avisos que cumplen el filtro, del más reciente al más antiguo.

#### Parameters

##### filtro?

[`FiltroAvisos`](../../../../entities/AvisoEnviado/interfaces/FiltroAvisos.md)

#### Returns

`Promise`\<[`AvisoEnviado`](../../../../entities/AvisoEnviado/interfaces/AvisoEnviado.md)[]\>
