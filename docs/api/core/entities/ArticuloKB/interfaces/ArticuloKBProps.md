[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/ArticuloKB](../README.md) / ArticuloKBProps

# Interface: ArticuloKBProps

Props para construir un [ArticuloKB](../classes/ArticuloKB.md); `slug` se autogenera del título si se omite.

## Properties

### id

> **id**: `string`

***

### titulo

> **titulo**: `string`

***

### slug?

> `optional` **slug?**: `string`

***

### carpeta?

> `optional` **carpeta?**: `"soporte"` \| `"empresas"`

***

### categoria?

> `optional` **categoria?**: `string` \| `null`

***

### cuerpoMarkdown

> **cuerpoMarkdown**: `string`

***

### tags?

> `optional` **tags?**: `string`[]

***

### rutaDestino?

> `optional` **rutaDestino?**: `string` \| `null`

Ruta del archivo dentro de la carpeta indexada (con la carpeta raíz, como `EMPRESAS/x.md`).

***

### autorUid?

> `optional` **autorUid?**: `string` \| `null`

***

### autorNombre?

> `optional` **autorNombre?**: `string` \| `null`

***

### createdAt?

> `optional` **createdAt?**: `Date`

***

### updatedAt?

> `optional` **updatedAt?**: `Date`
