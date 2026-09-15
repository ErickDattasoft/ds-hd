[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/descripcionImagenes](../README.md) / quitarImagenesDescripcion

# Function: quitarImagenesDescripcion()

> **quitarImagenesDescripcion**(`html`): `string`

Quita las imágenes de una descripción (ya saneada) — para correos: `data-adj-id` no significa
 nada fuera de la app, e incrustar el `data:` URI infla el correo sin garantía de que el
 cliente de correo lo muestre. El ticket sigue listando sus adjuntos aparte.

## Parameters

### html

`string`

## Returns

`string`
