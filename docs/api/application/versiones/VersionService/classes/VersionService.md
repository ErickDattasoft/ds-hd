[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/versiones/VersionService](../README.md) / VersionService

# Class: VersionService

Defined in: application/versiones/VersionService.ts:19

Catálogo de versiones vigentes de sistemas.

## Constructors

### Constructor

> **new VersionService**(`repo`, `ids`, `clock`, `bitacora`): `VersionService`

Defined in: application/versiones/VersionService.ts:20

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

Defined in: application/versiones/VersionService.ts:27

#### Returns

`Promise`\<[`VersionSistema`](../../../../core/entities/VersionSistema/classes/VersionSistema.md)[]\>

***

### obtener()

> **obtener**(`id`): `Promise`\<[`VersionSistema`](../../../../core/entities/VersionSistema/classes/VersionSistema.md)\>

Defined in: application/versiones/VersionService.ts:31

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`VersionSistema`](../../../../core/entities/VersionSistema/classes/VersionSistema.md)\>

***

### guardar()

> **guardar**(`actor`, `datos`, `id?`): `Promise`\<[`VersionSistema`](../../../../core/entities/VersionSistema/classes/VersionSistema.md)\>

Defined in: application/versiones/VersionService.ts:41

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

Defined in: application/versiones/VersionService.ts:62

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### id

`string`

#### Returns

`Promise`\<`void`\>
