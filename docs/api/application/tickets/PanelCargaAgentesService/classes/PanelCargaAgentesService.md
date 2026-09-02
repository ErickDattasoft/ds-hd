[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/PanelCargaAgentesService](../README.md) / PanelCargaAgentesService

# Class: PanelCargaAgentesService

Defined in: application/tickets/PanelCargaAgentesService.ts:6

Caso de uso: panel de carga de trabajo por agente (para decidir asignaciones).

## Constructors

### Constructor

> **new PanelCargaAgentesService**(`queries`, `usuarios`, `clock`): `PanelCargaAgentesService`

Defined in: application/tickets/PanelCargaAgentesService.ts:7

#### Parameters

##### queries

[`ITicketQueries`](../../../../core/ports/repositories/ITicketQueries/interfaces/ITicketQueries.md)

##### usuarios

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

#### Returns

`PanelCargaAgentesService`

## Methods

### ejecutar()

> **ejecutar**(): `Promise`\<[`CargaAgente`](../../../../core/ports/repositories/ITicketQueries/interfaces/CargaAgente.md)[]\>

Defined in: application/tickets/PanelCargaAgentesService.ts:13

#### Returns

`Promise`\<[`CargaAgente`](../../../../core/ports/repositories/ITicketQueries/interfaces/CargaAgente.md)[]\>
