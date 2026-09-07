[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/empresas/EmpresaService](../README.md) / EmpresaService

# Class: EmpresaService

Gestión de empresas (CRUD + archivar).

## Constructors

### Constructor

> **new EmpresaService**(`repo`, `ids`, `clock`, `bitacora`): `EmpresaService`

#### Parameters

##### repo

[`IEmpresaRepository`](../../../../core/ports/repositories/IEmpresaRepository/interfaces/IEmpresaRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### bitacora

[`BitacoraService`](../../../shared/BitacoraService/classes/BitacoraService.md)

#### Returns

`EmpresaService`

## Methods

### listar()

> **listar**(`filtro?`): `Promise`\<[`Empresa`](../../../../core/entities/Empresa/classes/Empresa.md)[]\>

#### Parameters

##### filtro?

[`ListarEmpresasFiltro`](../../../../core/ports/repositories/IEmpresaRepository/interfaces/ListarEmpresasFiltro.md)

#### Returns

`Promise`\<[`Empresa`](../../../../core/entities/Empresa/classes/Empresa.md)[]\>

***

### obtener()

> **obtener**(`id`): `Promise`\<[`Empresa`](../../../../core/entities/Empresa/classes/Empresa.md)\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Empresa`](../../../../core/entities/Empresa/classes/Empresa.md)\>

***

### crear()

> **crear**(`actor`, `datos`): `Promise`\<[`Empresa`](../../../../core/entities/Empresa/classes/Empresa.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### datos

[`DatosEmpresa`](../interfaces/DatosEmpresa.md)

#### Returns

`Promise`\<[`Empresa`](../../../../core/entities/Empresa/classes/Empresa.md)\>

***

### actualizar()

> **actualizar**(`actor`, `id`, `datos`): `Promise`\<[`Empresa`](../../../../core/entities/Empresa/classes/Empresa.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### id

`string`

##### datos

[`DatosEmpresa`](../interfaces/DatosEmpresa.md)

#### Returns

`Promise`\<[`Empresa`](../../../../core/entities/Empresa/classes/Empresa.md)\>

***

### alternarFavorita()

> **alternarFavorita**(`actor`, `id`, `favorita`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### id

`string`

##### favorita

`boolean`

#### Returns

`Promise`\<`void`\>

***

### archivar()

> **archivar**(`actor`, `id`, `archivar`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### id

`string`

##### archivar

`boolean`

#### Returns

`Promise`\<`void`\>
