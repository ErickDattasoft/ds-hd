[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Usuario](../README.md) / PerfilAgente

# Interface: PerfilAgente

Datos de perfil de agente técnico (solo relevantes cuando `rol === 'agente'`).

## Properties

### grupo

> **grupo**: `string` \| `null`

Grupo/cola al que pertenece (Soporte, Ventas…).

***

### capacidadMax

> **capacidadMax**: `number`

Máximo de tickets abiertos que se le pueden asignar (0 = sin límite).

***

### disponibleAsignacion

> **disponibleAsignacion**: `boolean`

Si está disponible para recibir asignaciones nuevas.
