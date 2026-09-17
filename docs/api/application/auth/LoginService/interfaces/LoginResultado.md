[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/auth/LoginService](../README.md) / LoginResultado

# Interface: LoginResultado

Resultado de un login exitoso: sesión emitida más el usuario autenticado.

## Properties

### token

> **token**: `string` \| `null`

Valor para la cookie de sesión; `null` si falta el segundo paso.

***

### usuario

> **usuario**: [`Usuario`](../../../../core/entities/Usuario/classes/Usuario.md)

***

### pendienteDosPasos?

> `optional` **pendienteDosPasos?**: `string`

Token corto del paso intermedio cuando el usuario tiene verificación en dos pasos.
