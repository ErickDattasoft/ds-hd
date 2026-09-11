[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/ConfiguracionLogo](../README.md) / ConfiguracionLogo

# Interface: ConfiguracionLogo

Logo de la empresa (documento `configuracion/logo`), usado en el encabezado de correos,
vistas de impresión y el portal de cliente. Vive como data URL en el propio doc de
configuración — igual que los adjuntos de tickets, sin depender de Firebase Storage.

## Properties

### contentType

> **contentType**: `string`

***

### tamano

> **tamano**: `number`

Tamaño del archivo original en bytes (antes de base64).

***

### data

> **data**: `string`

`data:<contentType>;base64,<...>`.
