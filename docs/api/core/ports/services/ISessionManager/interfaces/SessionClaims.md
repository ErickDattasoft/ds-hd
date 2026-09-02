[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/ISessionManager](../README.md) / SessionClaims

# Interface: SessionClaims

Defined in: core/ports/services/ISessionManager.ts:2

Datos mínimos que viajan dentro de la cookie de sesión.

## Properties

### uid

> **uid**: `string`

Defined in: core/ports/services/ISessionManager.ts:3

***

### issuedAt

> **issuedAt**: `number`

Defined in: core/ports/services/ISessionManager.ts:5

Marca de tiempo (ms) en que se emitió; permite invalidar sesiones anteriores a X.
