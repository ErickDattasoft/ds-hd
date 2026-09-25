[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/descripcionImagenes](../README.md) / imagenesParaCorreo

# Function: imagenesParaCorreo()

> **imagenesParaCorreo**(`html`, `baseUrl`): `object`

Descripción lista para un correo: cada `<img data-adj-id>` apunta a `/adjunto/<id>` (la ruta
pública que sirve solo imágenes), porque Gmail, Outlook y Zoho no muestran `data:` URI.
Devuelve también las URLs, para poner enlaces por si el programa de correo bloquea imágenes.

## Parameters

### html

`string`

### baseUrl

`string`

## Returns

`object`

### html

> **html**: `string`

### urls

> **urls**: `string`[]
