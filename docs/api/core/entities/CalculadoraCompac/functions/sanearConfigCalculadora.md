[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/CalculadoraCompac](../README.md) / sanearConfigCalculadora

# Function: sanearConfigCalculadora()

> **sanearConfigCalculadora**(`v`): [`ConfiguracionCalculadora`](../interfaces/ConfiguracionCalculadora.md)

Normaliza lo que venga de Firestore o de un respaldo. Un documento con la forma anterior de
ds-hd (`sistemas`/`sql`, precio por sistema) no trae estos campos y cae a los defaults.

## Parameters

### v

`unknown`

## Returns

[`ConfiguracionCalculadora`](../interfaces/ConfiguracionCalculadora.md)
