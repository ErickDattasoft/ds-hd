[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/PanelCargaAgentesService](../README.md) / PanelCargaAgentesService

# Class: PanelCargaAgentesService

Caso de uso: panel de carga de trabajo por agente (para decidir asignaciones).

## Constructors

### Constructor

> **new PanelCargaAgentesService**(`queries`, `usuarios`, `clock`): `PanelCargaAgentesService`

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

#### Returns

`Promise`\<[`CargaAgente`](../../../../core/ports/repositories/ITicketQueries/interfaces/CargaAgente.md)[]\>
