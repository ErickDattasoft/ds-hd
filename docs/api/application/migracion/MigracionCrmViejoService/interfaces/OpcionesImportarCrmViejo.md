[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/migracion/MigracionCrmViejoService](../README.md) / OpcionesImportarCrmViejo

# Interface: OpcionesImportarCrmViejo

Cómo correr la importación.

## Properties

### modo

> **modo**: [`ModoImportacion`](../type-aliases/ModoImportacion.md)

***

### simulacro

> **simulacro**: `boolean`

`true` = simulacro: recorre y valida todo pero no escribe (ni borra) nada.

***

### secciones

> **secciones**: [`SeccionImportacion`](../type-aliases/SeccionImportacion.md)[]

Qué secciones traer. Solo estas se leen, se escriben y — en "sustituir" — se borran.
