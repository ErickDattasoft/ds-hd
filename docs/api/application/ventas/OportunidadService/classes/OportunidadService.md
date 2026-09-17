[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/ventas/OportunidadService](../README.md) / OportunidadService

# Class: OportunidadService

Embudo de ventas: oportunidades que avanzan de prospecto a ganada/perdida.

## Constructors

### Constructor

> **new OportunidadService**(`repo`, `empresas`, `usuarios`, `ids`, `clock`, `bitacora`): `OportunidadService`

#### Parameters

##### repo

[`IOportunidadRepository`](../../../../core/ports/repositories/IOportunidadRepository/interfaces/IOportunidadRepository.md)

##### empresas

[`IEmpresaRepository`](../../../../core/ports/repositories/IEmpresaRepository/interfaces/IEmpresaRepository.md)

##### usuarios

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### bitacora

[`BitacoraService`](../../../shared/BitacoraService/classes/BitacoraService.md)

#### Returns

`OportunidadService`

## Methods

### obtener()

> **obtener**(`id`): `Promise`\<[`Oportunidad`](../../../../core/entities/Oportunidad/classes/Oportunidad.md)\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Oportunidad`](../../../../core/entities/Oportunidad/classes/Oportunidad.md)\>

***

### embudo()

> **embudo**(`actor`, `filtro?`): `Promise`\<[`Embudo`](../interfaces/Embudo.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### filtro?

###### responsableUid?

`string`

#### Returns

`Promise`\<[`Embudo`](../interfaces/Embudo.md)\>

***

### crear()

> **crear**(`actor`, `d`): `Promise`\<[`Oportunidad`](../../../../core/entities/Oportunidad/classes/Oportunidad.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### d

[`DatosOportunidad`](../interfaces/DatosOportunidad.md)

#### Returns

`Promise`\<[`Oportunidad`](../../../../core/entities/Oportunidad/classes/Oportunidad.md)\>

***

### actualizar()

> **actualizar**(`actor`, `id`, `d`): `Promise`\<[`Oportunidad`](../../../../core/entities/Oportunidad/classes/Oportunidad.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### id

`string`

##### d

[`DatosOportunidad`](../interfaces/DatosOportunidad.md)

#### Returns

`Promise`\<[`Oportunidad`](../../../../core/entities/Oportunidad/classes/Oportunidad.md)\>

***

### mover()

> **mover**(`actor`, `id`, `etapa`, `motivoPerdida?`): `Promise`\<[`Oportunidad`](../../../../core/entities/Oportunidad/classes/Oportunidad.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### id

`string`

##### etapa

`string`

##### motivoPerdida?

`string`

#### Returns

`Promise`\<[`Oportunidad`](../../../../core/entities/Oportunidad/classes/Oportunidad.md)\>

***

### eliminar()

> **eliminar**(`actor`, `id`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### id

`string`

#### Returns

`Promise`\<`void`\>
