[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Usuario](../README.md) / PerfilAgente

# Interface: PerfilAgente

Defined in: core/entities/Usuario.ts:5

Datos de perfil de agente técnico (solo relevantes cuando `rol === 'agente'`).

## Properties

### grupo

> **grupo**: `string` \| `null`

Defined in: core/entities/Usuario.ts:7

Grupo/cola al que pertenece (Soporte, Ventas…).

***

### capacidadMax

> **capacidadMax**: `number`

Defined in: core/entities/Usuario.ts:9

Máximo de tickets abiertos que se le pueden asignar (0 = sin límite).

***

### disponibleAsignacion

> **disponibleAsignacion**: `boolean`

Defined in: core/entities/Usuario.ts:11

Si está disponible para recibir asignaciones nuevas.
