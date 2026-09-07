[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/papelera/PapeleraService](../README.md) / PapeleraService

# Class: PapeleraService

Acciones masivas sobre la papelera: restaurar varios, eliminar definitivamente y vaciar.
El borrado permanente exige `papelera:gestionar`; restaurar delega en cada servicio de
módulo (que ya valida `<modulo>:eliminar` y registra en bitácora).

## Constructors

### Constructor

> **new PapeleraService**(`empresasSvc`, `contactosSvc`, `archivarTicket`, `empresaRepo`, `contactoRepo`, `ticketRepo`, `ticketQueries`, `bitacora`, `logger`): `PapeleraService`

#### Parameters

##### empresasSvc

[`EmpresaService`](../../../empresas/EmpresaService/classes/EmpresaService.md)

##### contactosSvc

[`ContactoService`](../../../contactos/ContactoService/classes/ContactoService.md)

##### archivarTicket

[`ArchivarTicketService`](../../../tickets/ArchivarTicketService/classes/ArchivarTicketService.md)

##### empresaRepo

[`IEmpresaRepository`](../../../../core/ports/repositories/IEmpresaRepository/interfaces/IEmpresaRepository.md)

##### contactoRepo

[`IContactoRepository`](../../../../core/ports/repositories/IContactoRepository/interfaces/IContactoRepository.md)

##### ticketRepo

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### ticketQueries

[`ITicketQueries`](../../../../core/ports/repositories/ITicketQueries/interfaces/ITicketQueries.md)

##### bitacora

[`BitacoraService`](../../../shared/BitacoraService/classes/BitacoraService.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`PapeleraService`

## Methods

### esTipo()

> `static` **esTipo**(`v`): `v is TipoPapelera`

#### Parameters

##### v

`unknown`

#### Returns

`v is TipoPapelera`

***

### restaurar()

> **restaurar**(`actor`, `tipo`, `ids`): `Promise`\<[`ResultadoLote`](../interfaces/ResultadoLote.md)\>

Restaura (saca de la papelera) los elementos indicados.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### tipo

[`TipoPapelera`](../type-aliases/TipoPapelera.md)

##### ids

`string`[]

#### Returns

`Promise`\<[`ResultadoLote`](../interfaces/ResultadoLote.md)\>

***

### eliminar()

> **eliminar**(`actor`, `tipo`, `ids`): `Promise`\<[`ResultadoLote`](../interfaces/ResultadoLote.md)\>

Borra definitivamente los elementos indicados (deben estar archivados).

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### tipo

[`TipoPapelera`](../type-aliases/TipoPapelera.md)

##### ids

`string`[]

#### Returns

`Promise`\<[`ResultadoLote`](../interfaces/ResultadoLote.md)\>

***

### vaciar()

> **vaciar**(`actor`, `tipo`): `Promise`\<[`ResultadoLote`](../interfaces/ResultadoLote.md)\>

Vacía la papelera de un tipo: borra definitivamente todo lo archivado.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### tipo

[`TipoPapelera`](../type-aliases/TipoPapelera.md)

#### Returns

`Promise`\<[`ResultadoLote`](../interfaces/ResultadoLote.md)\>
