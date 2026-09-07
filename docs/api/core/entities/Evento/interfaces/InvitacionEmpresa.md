[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Evento](../README.md) / InvitacionEmpresa

# Interface: InvitacionEmpresa

Empresa de la cartera invitada de forma dirigida a un evento (paridad con el CRM viejo).

## Properties

### id

> **id**: `string`

Id estable de la entrada (para editar/quitar sin depender del índice del arreglo).

***

### empresaId

> **empresaId**: `string` \| `null`

Empresa de la cartera, si se eligió de ahí; `null` si es un nombre suelto.

***

### empresaNombre

> **empresaNombre**: `string`

***

### sistemas

> **sistemas**: `string`[]

Sistemas contratados de la empresa, copiados al invitar (referencia rápida).

***

### invitadoPor

> **invitadoPor**: `string` \| `null`

Quién de DATTASOFT se encarga de contactarla.

***

### contactado

> **contactado**: `boolean`

Ya se le contactó/invitó.

***

### respuesta

> **respuesta**: [`RespuestaInvitacion`](../type-aliases/RespuestaInvitacion.md)

***

### notas

> **notas**: `string` \| `null`
