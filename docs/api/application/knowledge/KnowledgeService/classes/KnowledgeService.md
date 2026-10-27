[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/knowledge/KnowledgeService](../README.md) / KnowledgeService

# Class: KnowledgeService

Base de conocimiento. Quién entra lo decide el propietario (ver `ConfiguracionKB`), no el rol;
los artículos son de solo lectura: el contenido solo cambia al reindexar las carpetas, y eso
(igual que borrar o exportar) es exclusivo del propietario.

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

### listar()

> **listar**(`actor`, `filtro?`): `Promise`\<[`ArticuloKB`](../../../../core/entities/ArticuloKB/classes/ArticuloKB.md)[]\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### filtro?

[`ListarKBFiltro`](../../../../core/ports/repositories/IKnowledgeRepository/interfaces/ListarKBFiltro.md) = `{}`

#### Returns

`Promise`\<[`ArticuloKB`](../../../../core/entities/ArticuloKB/classes/ArticuloKB.md)[]\>

***

### ver()

> **ver**(`actor`, `idOSlug`): `Promise`\<[`ArticuloKB`](../../../../core/entities/ArticuloKB/classes/ArticuloKB.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### idOSlug

`string`

#### Returns

`Promise`\<[`ArticuloKB`](../../../../core/entities/ArticuloKB/classes/ArticuloKB.md)\>

***

### relacionados()

> **relacionados**(`actor`, `articulo`, `limite?`): `Promise`\<[`ArticuloKB`](../../../../core/entities/ArticuloKB/classes/ArticuloKB.md)[]\>

«Ver también»: otros de la misma carpeta que comparten tags o, si no hay tags, la misma
subcarpeta (p. ej. los demás documentos de la misma empresa).

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### articulo

[`ArticuloKB`](../../../../core/entities/ArticuloKB/classes/ArticuloKB.md)

##### limite?

`number` = `5`

#### Returns

`Promise`\<[`ArticuloKB`](../../../../core/entities/ArticuloKB/classes/ArticuloKB.md)[]\>

***

### indice()

> **indice**(`actor`, `carpeta`): `Promise`\<[`EntradaIndiceKB`](../interfaces/EntradaIndiceKB.md)[]\>

Huella de cada archivo ya indexado en la carpeta, para mandar solo lo nuevo o cambiado.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### carpeta

`"soporte"` \| `"empresas"`

#### Returns

`Promise`\<[`EntradaIndiceKB`](../interfaces/EntradaIndiceKB.md)[]\>

***

### indexar()

> **indexar**(`actor`, `carpeta`, `archivos`): `Promise`\<[`ResultadoIndexado`](../interfaces/ResultadoIndexado.md)\>

«🔄 Indexar»: crea los archivos nuevos y actualiza los que cambiaron, reconociendo cada uno
por su ruta dentro de la carpeta (sin la raíz), así nunca se duplica. Si un archivo ya estaba
pero en la otra carpeta con la MISMA ruta completa, se mueve a esta.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### carpeta

`"soporte"` \| `"empresas"`

##### archivos

[`ArchivoIndexado`](../interfaces/ArchivoIndexado.md)[]

#### Returns

`Promise`\<[`ResultadoIndexado`](../interfaces/ResultadoIndexado.md)\>

***

### quitar()

> **quitar**(`actor`, `carpeta`, `idsAQuitar`): `Promise`\<`number`\>

Quita del CRM artículos de una carpeta (los que ya no existen en la carpeta de Windows).

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### carpeta

`"soporte"` \| `"empresas"`

##### idsAQuitar

`string`[]

#### Returns

`Promise`\<`number`\>

***

### exportarZip()

> **exportarZip**(`actor`, `filtro?`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Respaldo: los artículos (de una carpeta o todos) como `.zip`, con su ruta original.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### filtro?

###### carpeta?

`"soporte"` \| `"empresas"`

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
