[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/IClock](../README.md) / IClock

# Interface: IClock

Puerto de reloj. Los casos de uso obtienen "ahora" de aquí, nunca de `new Date()`
directamente, para que los tests puedan fijar el tiempo (cálculo de SLA, vencimientos).

## Methods

### now()

> **now**(): `Date`

#### Returns

`Date`
