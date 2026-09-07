[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/FiltroGuardado](../README.md) / FiltroGuardado

# Interface: FiltroGuardado

Búsqueda frecuente que un usuario guarda para re-aplicar con un clic
(`filtros_guardados/{id}`). Es personal: cada quien ve y gestiona los suyos.

## Properties

### id

> **id**: `string`

***

### uid

> **uid**: `string`

Dueño del filtro.

***

### nombre

> **nombre**: `string`

Nombre visible, p. ej. "Favoritas CONTPAQi".

***

### modulo

> **modulo**: `string`

Módulo al que aplica: `empresas`, `tickets`, `cotizaciones`…

***

### query

> **query**: `string`

Query string sin el `?` inicial, p. ej. `favoritas=1&sistema=Contpaqi`.

***

### creadoEn

> **creadoEn**: `Date`
