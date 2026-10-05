[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/alcance](../README.md) / alcanceTickets

# Function: alcanceTickets()

> **alcanceTickets**(`actor`): `Pick`\<[`FiltroTickets`](../../../../core/ports/repositories/ITicketQueries/interfaces/FiltroTickets.md), `"alcanceAgente"`\>

Filtro de alcance para listados/conteos: quien no ve todos ve los suyos (por uid o por nombre en
"Agente"/"Canalizado a") más los que nadie tiene todavía — si no, los sin asignar quedarían
invisibles para todo el equipo hasta que un admin los repartiera (igual que el CRM viejo). Un
ticket con un admin en "Agente" y sin canalizar también cuenta como «de nadie todavía».

## Parameters

### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

## Returns

`Pick`\<[`FiltroTickets`](../../../../core/ports/repositories/ITicketQueries/interfaces/FiltroTickets.md), `"alcanceAgente"`\>
