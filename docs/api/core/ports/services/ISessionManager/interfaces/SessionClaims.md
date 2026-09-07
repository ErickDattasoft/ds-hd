[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/ISessionManager](../README.md) / SessionClaims

# Interface: SessionClaims

Datos mínimos que viajan dentro de la cookie de sesión.

## Properties

### uid

> **uid**: `string`

***

### issuedAt

> **issuedAt**: `number`

Marca de tiempo (ms) en que se emitió; fija el tope absoluto de vida de la sesión.

***

### lastSeenAt

> **lastSeenAt**: `number`

Última actividad observada (ms); alimenta el cierre por inactividad.
