[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/entities/value-objects/Telefono](../README.md) / normalizarTelefonoMx

# Function: normalizarTelefonoMx()

> **normalizarTelefonoMx**(`telefono`): `string`

Teléfono en formato internacional sin "+" (el que piden wa.me, Meta y Twilio): deja solo
dígitos y a un número mexicano de 10 dígitos le antepone la lada 52. `''` si no es válido.

## Parameters

### telefono

`string`

## Returns

`string`
