[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IInvitacionRepository](../README.md) / Invitacion

# Interface: Invitacion

Defined in: core/ports/repositories/IInvitacionRepository.ts:2

Invitación de un solo uso para fijar contraseña (staff nuevo o cliente del portal).

## Properties

### token

> **token**: `string`

Defined in: core/ports/repositories/IInvitacionRepository.ts:4

Token opaco que viaja en la URL del correo de invitación.

***

### uid

> **uid**: `string`

Defined in: core/ports/repositories/IInvitacionRepository.ts:5

***

### email

> **email**: `string`

Defined in: core/ports/repositories/IInvitacionRepository.ts:6

***

### invitadoPor

> **invitadoPor**: `string`

Defined in: core/ports/repositories/IInvitacionRepository.ts:8

Quién la generó (uid del staff).

***

### createdAt

> **createdAt**: `Date`

Defined in: core/ports/repositories/IInvitacionRepository.ts:9

***

### expiresAt

> **expiresAt**: `Date`

Defined in: core/ports/repositories/IInvitacionRepository.ts:10

***

### usadaEn

> **usadaEn**: `Date` \| `null`

Defined in: core/ports/repositories/IInvitacionRepository.ts:11
