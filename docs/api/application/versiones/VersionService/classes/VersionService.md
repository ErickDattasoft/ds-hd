[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/versiones/VersionService](../README.md) / VersionService

# Class: VersionService

Catálogo de versiones vigentes de sistemas.

## Constructors

### Constructor

> **new VersionService**(`repo`, `ids`, `clock`, `bitacora`): `VersionService`

#### Parameters

##### repo

[`IVersionRepository`](../../../../core/ports/repositories/IVersionRepository/interfaces/IVersionRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### bitacora

[`BitacoraService`](../../../shared/BitacoraService/classes/BitacoraService.md)

#### Returns

`VersionService`

## Methods

### listar()

> **listar**(): `Promise`\<[`VersionSistema`](../../../../core/entities/VersionSistema/classes/VersionSistema.md)[]\>

#### Returns

`Promise`\<[`VersionSistema`](../../../../core/entities/VersionSistema/classes/VersionSistema.md)[]\>

***

### obtener()

> **obtener**(`id`): `Promise`\<[`VersionSistema`](../../../../core/entities/VersionSistema/classes/VersionSistema.md)\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`VersionSistema`](../../../../core/entities/VersionSistema/classes/VersionSistema.md)\>

***

### guardar()

> **guardar**(`actor`, `datos`, `id?`): `Promise`\<[`VersionSistema`](../../../../core/entities/VersionSistema/classes/VersionSistema.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### datos

[`DatosVersion`](../interfaces/DatosVersion.md)

##### id?

`string`

#### Returns

`Promise`\<[`VersionSistema`](../../../../core/entities/VersionSistema/classes/VersionSistema.md)\>

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
