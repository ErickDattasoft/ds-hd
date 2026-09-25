[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/migracion/MigracionCrmViejoService](../README.md) / ResultadoImportacion

# Interface: ResultadoImportacion

Qué se importó (o qué se importaría, en simulacro), para pintarlo en la pantalla.

## Properties

### modo

> **modo**: [`ModoImportacion`](../type-aliases/ModoImportacion.md)

***

### simulacro

> **simulacro**: `boolean`

***

### secciones

> **secciones**: [`SeccionImportacion`](../type-aliases/SeccionImportacion.md)[]

Las secciones que se pidieron, tal cual se ejecutaron.

***

### empresas

> **empresas**: `number`

***

### contactos

> **contactos**: `number`

***

### tickets

> **tickets**: `number`

***

### ticketsEnArchivo

> **ticketsEnArchivo**: `number`

Cuántos tickets traía el archivo (si no coincide con `tickets`, algunos no entraron).

***

### eventos

> **eventos**: `number`

***

### cotizaciones

> **cotizaciones**: `number`

***

### versiones

> **versiones**: `number`

***

### kb

> **kb**: `number`

***

### bitacora

> **bitacora**: `number`

***

### usuariosFaltantes

> **usuariosFaltantes**: `number`

***

### contactosSinEmpresa

> **contactosSinEmpresa**: `string`[]

***

### cotizacionesSinEmpresa

> **cotizacionesSinEmpresa**: `string`[]

***

### empresasSobrantes

> **empresasSobrantes**: `string`[]

Lo que está en ds-hd y no viene en el respaldo (restos o altas hechas solo aquí).

***

### contactosSobrantes

> **contactosSobrantes**: `string`[]

***

### borrado

> **borrado**: `Record`\<`string`, `number`\> \| `null`

***

### lineas

> **lineas**: `string`[]

Bitácora de la corrida, línea por línea, tal como la imprime el script por terminal.
