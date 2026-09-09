[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/knowledge/KnowledgeService](../README.md) / KnowledgeService

# Class: KnowledgeService

Base de conocimiento: gestión (staff) y consulta (staff / portal / público).

## Constructors

### Constructor

> **new KnowledgeService**(`repo`, `ids`, `clock`, `bitacora`): `KnowledgeService`

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

### crearLote()

> **crearLote**(`actor`, `archivos`, `opts?`): `Promise`\<[`ArticuloKB`](../../../../core/entities/ArticuloKB/classes/ArticuloKB.md)[]\>

Alta en lote desde archivos (`.md`, `.ps1`, `.bat`, `.sql`, `.txt`…). Un artículo por
archivo: título = nombre sin extensión, cuerpo = contenido, categoría adivinada, y la
ruta relativa se guarda como `rutaDestino` (para volver a exportarlos a Windows).

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### archivos

[`ArchivoLote`](../interfaces/ArchivoLote.md)[]

##### opts?

###### visibilidad?

[`VisibilidadKB`](../../../../core/entities/ArticuloKB/type-aliases/VisibilidadKB.md)

###### publicado?

`boolean`

#### Returns

`Promise`\<[`ArticuloKB`](../../../../core/entities/ArticuloKB/classes/ArticuloKB.md)[]\>

***

### exportarZip()

> **exportarZip**(`ctx`, `filtro?`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Los artículos visibles que cumplen el filtro, como `.zip` (un archivo por artículo).

#### Parameters

##### ctx

[`Contexto`](../type-aliases/Contexto.md)

##### filtro?

###### categoria?

`string`

###### desde?

`Date`

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

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
