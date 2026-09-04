[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/shared/BusquedaGlobalService](../README.md) / BusquedaGlobalService

# Class: BusquedaGlobalService

Búsqueda global (Ctrl+K): empresas, contactos, tickets y KB, acotada a lo que el usuario
puede ver — nunca busca en un módulo para el que no tiene permiso de lectura.

## Constructors

### Constructor

> **new BusquedaGlobalService**(`empresas`, `contactos`, `tickets`, `kb`): `BusquedaGlobalService`

#### Parameters

##### empresas

[`IEmpresaRepository`](../../../../core/ports/repositories/IEmpresaRepository/interfaces/IEmpresaRepository.md)

##### contactos

[`IContactoRepository`](../../../../core/ports/repositories/IContactoRepository/interfaces/IContactoRepository.md)

##### tickets

[`ITicketQueries`](../../../../core/ports/repositories/ITicketQueries/interfaces/ITicketQueries.md)

##### kb

[`IKnowledgeRepository`](../../../../core/ports/repositories/IKnowledgeRepository/interfaces/IKnowledgeRepository.md)

#### Returns

`BusquedaGlobalService`

## Methods

### buscar()

> **buscar**(`user`, `textoCrudo`): `Promise`\<[`ResultadoBusqueda`](../interfaces/ResultadoBusqueda.md)[]\>

#### Parameters

##### user

[`SessionUser`](../../SessionUser/interfaces/SessionUser.md)

##### textoCrudo

`string`

#### Returns

`Promise`\<[`ResultadoBusqueda`](../interfaces/ResultadoBusqueda.md)[]\>
