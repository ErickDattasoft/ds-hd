[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/ArticuloKB](../README.md) / ArticuloKB

# Class: ArticuloKB

Artículo de la base de conocimiento: un archivo indexado de una de las dos carpetas.

## Constructors

### Constructor

> **new ArticuloKB**(`props`): `ArticuloKB`

#### Parameters

##### props

[`ArticuloKBProps`](../interfaces/ArticuloKBProps.md)

#### Returns

`ArticuloKB`

## Properties

### id

> `readonly` **id**: `string`

***

### titulo

> **titulo**: `string`

***

### slug

> **slug**: `string`

***

### carpeta

> **carpeta**: `"soporte"` \| `"empresas"`

***

### categoria

> **categoria**: `string` \| `null`

***

### cuerpoMarkdown

> **cuerpoMarkdown**: `string`

***

### tags

> **tags**: `string`[]

***

### rutaDestino

> **rutaDestino**: `string` \| `null`

***

### autorUid

> `readonly` **autorUid**: `string` \| `null`

***

### autorNombre

> **autorNombre**: `string` \| `null`

***

### createdAt

> `readonly` **createdAt**: `Date`

***

### updatedAt

> **updatedAt**: `Date`

## Accessors

### esScript

#### Get Signature

> **get** **esScript**(): `boolean`

¿Es un script (por categoría)?

##### Returns

`boolean`

***

### esMarkdown

#### Get Signature

> **get** **esMarkdown**(): `boolean`

¿Se muestra como Markdown? Los `.ps1`, `.sql`, `.txt`… se muestran tal cual (texto plano).

##### Returns

`boolean`

***

### subcarpeta

#### Get Signature

> **get** **subcarpeta**(): `string`

Subcarpeta dentro de la carpeta indexada (sin la raíz ni el archivo), p. ej. `ACME/Nóminas`.

##### Returns

`string`
