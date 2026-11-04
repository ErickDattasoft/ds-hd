[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/versiones/VersionService](../README.md) / FilaMercado

# Interface: FilaMercado

Una fila del grid "versiones del mercado" (edición masiva).

## Properties

### sistema

> **sistema**: `string`

***

### versionActual

> **versionActual**: `string`

La versión sin SP ("12.1.0"); si traen "12.1.0 Sp 2" escrito, el SP se separa al guardar.

***

### servicePacks?

> `optional` **servicePacks?**: [`ServicePackVersion`](../../../../core/entities/VersionSistema/interfaces/ServicePackVersion.md)[]

Cada SP en su renglón. Sin la propiedad, se conservan los que ya tenía.

***

### fechaLiberacion?

> `optional` **fechaLiberacion?**: `string`

***

### linkDescarga?

> `optional` **linkDescarga?**: `string`

***

### linkCartaTecnica?

> `optional` **linkCartaTecnica?**: `string`
