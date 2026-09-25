[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/empresas/avisos](../README.md) / claveAviso

# Function: claveAviso()

> **claveAviso**(`empresaId`, `tipo`, `sistema`, `referencia`): `string`

Clave con la que se reconoce que un pendiente ya se avisó, con la misma regla del CRM viejo:
un sistema cuenta como avisado si hubo aviso para esa empresa y ese sistema con la **misma
versión oficial** (si sale una versión nueva, vuelve a estar pendiente); una licencia, si fue
con la **misma fecha de vencimiento** (si se renovó y volvió a vencer, vuelve a estar pendiente).

## Parameters

### empresaId

`string`

### tipo

`"sistema"` \| `"licencia"`

### sistema

`string`

### referencia

`string` \| `null` \| `undefined`

## Returns

`string`
