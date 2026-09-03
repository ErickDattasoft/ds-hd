[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IInvitacionRepository](../README.md) / Invitacion

# Interface: Invitacion

Invitación de un solo uso para fijar contraseña (staff nuevo o cliente del portal).

## Properties

### token

> **token**: `string`

Token opaco que viaja en la URL del correo de invitación.

***

### uid

> **uid**: `string`

***

### email

> **email**: `string`

***

### invitadoPor

> **invitadoPor**: `string`

Quién la generó (uid del staff).

***

### createdAt

> **createdAt**: `Date`

***

### expiresAt

> **expiresAt**: `Date`

***

### usadaEn

> **usadaEn**: `Date` \| `null`
