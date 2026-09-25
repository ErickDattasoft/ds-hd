[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/empresas/avisos](../README.md) / PendienteAviso

# Interface: PendienteAviso

Un pendiente que puede incluirse en el aviso (un sistema desactualizado o una licencia en riesgo).

## Properties

### sistema

> **sistema**: `string`

Sistema; es la clave con la que se selecciona el pendiente en el formulario.

***

### linea

> **linea**: `string`

Línea como aparece en el mensaje.

***

### versionInstalada?

> `optional` **versionInstalada?**: `string` \| `null`

Versión que tiene instalada la empresa (solo sistemas desactualizados).

***

### versionOficial?

> `optional` **versionOficial?**: `string` \| `null`

Versión oficial vigente (solo sistemas desactualizados).

***

### fechaVencimiento?

> `optional` **fechaVencimiento?**: `string` \| `null`

Fecha de vencimiento `YYYY-MM-DD` (solo licencias).

***

### avisadoEl?

> `optional` **avisadoEl?**: `Date` \| `null`

Cuándo se avisó ya este mismo pendiente (misma versión oficial o misma fecha de vencimiento).
