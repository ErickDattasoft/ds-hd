[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/knowledge/KnowledgeService](../README.md) / KnowledgeService

# Class: KnowledgeService

Defined in: application/knowledge/KnowledgeService.ts:22

Base de conocimiento: gestión (staff) y consulta (staff / portal / público).

## Constructors

### Constructor

> **new KnowledgeService**(`repo`, `ids`, `clock`, `bitacora`): `KnowledgeService`

Defined in: application/knowledge/KnowledgeService.ts:23

#### Parameters

##### repo

[`IKnowledgeRepository`](../../../../core/ports/repositories/IKnowledgeRepository/interfaces/IKnowledgeRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### bitacora

[`BitacoraService`](../../../shared/BitacoraService/classes/BitacoraService.md)

#### Returns

`KnowledgeService`

## Methods

### listarVisibles()

> **listarVisibles**(`ctx`, `filtro?`): `Promise`\<[`ArticuloKB`](../../../../core/entities/ArticuloKB/classes/ArticuloKB.md)[]\>

Defined in: application/knowledge/KnowledgeService.ts:31

Lista visible para un contexto dado (aplica publicado + visibilidad).

#### Parameters

##### ctx

[`Contexto`](../type-aliases/Contexto.md)

##### filtro?

[`ListarKBFiltro`](../../../../core/ports/repositories/IKnowledgeRepository/interfaces/ListarKBFiltro.md) = `{}`

#### Returns

`Promise`\<[`ArticuloKB`](../../../../core/entities/ArticuloKB/classes/ArticuloKB.md)[]\>

***

### verVisible()

> **verVisible**(`ctx`, `idOSlug`): `Promise`\<[`ArticuloKB`](../../../../core/entities/ArticuloKB/classes/ArticuloKB.md)\>

Defined in: application/knowledge/KnowledgeService.ts:36

#### Parameters

##### ctx

[`Contexto`](../type-aliases/Contexto.md)

##### idOSlug

`string`

#### Returns

`Promise`\<[`ArticuloKB`](../../../../core/entities/ArticuloKB/classes/ArticuloKB.md)\>

***

### obtenerParaEditar()

> **obtenerParaEditar**(`actor`, `id`): `Promise`\<[`ArticuloKB`](../../../../core/entities/ArticuloKB/classes/ArticuloKB.md)\>

Defined in: application/knowledge/KnowledgeService.ts:43

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### id

`string`

#### Returns

`Promise`\<[`ArticuloKB`](../../../../core/entities/ArticuloKB/classes/ArticuloKB.md)\>

***

### guardar()

> **guardar**(`actor`, `datos`, `id?`): `Promise`\<[`ArticuloKB`](../../../../core/entities/ArticuloKB/classes/ArticuloKB.md)\>

Defined in: application/knowledge/KnowledgeService.ts:50

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### datos

[`DatosArticulo`](../interfaces/DatosArticulo.md)

##### id?

`string`

#### Returns

`Promise`\<[`ArticuloKB`](../../../../core/entities/ArticuloKB/classes/ArticuloKB.md)\>

***

### eliminar()

> **eliminar**(`actor`, `id`): `Promise`\<`void`\>

Defined in: application/knowledge/KnowledgeService.ts:84

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### id

`string`

#### Returns

`Promise`\<`void`\>
