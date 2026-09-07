[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IIntentosLoginRepository](../README.md) / EstadoIntentosLogin

# Interface: EstadoIntentosLogin

Estado del control de intentos fallidos de un correo.

## Properties

### fallidos

> **fallidos**: `number`

Intentos fallidos dentro de la ventana vigente.

***

### bloqueadoHasta

> **bloqueadoHasta**: `Date` \| `null`

Si está bloqueado, hasta cuándo; `null` si puede intentar.
