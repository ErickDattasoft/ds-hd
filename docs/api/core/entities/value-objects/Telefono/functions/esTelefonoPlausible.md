[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/entities/value-objects/Telefono](../README.md) / esTelefonoPlausible

# Function: esTelefonoPlausible()

> **esTelefonoPlausible**(`telefono`): `boolean`

Valida un teléfono capturado en un formulario público, con las mismas reglas que el CRM
anterior: 10 a 13 dígitos, ni todos iguales (5555555555) ni una secuencia corrida
(1234567890). No pretende verificar que el número exista, solo descartar relleno obvio.

## Parameters

### telefono

`string`

## Returns

`boolean`
