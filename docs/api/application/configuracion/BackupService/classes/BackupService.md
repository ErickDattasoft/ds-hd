[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/configuracion/BackupService](../README.md) / BackupService

# Class: BackupService

Backup/restauración completa de ds-hd, en el propio formato del sistema (no el del CRM
viejo — ese lo maneja `scripts/migrate/`). Pensado para respaldo manual y recuperación
ante desastres, no para migrar entre sistemas distintos.

## Constructors

### Constructor

> **new BackupService**(`empresas`, `contactos`, `tickets`, `cotizaciones`, `versiones`, `kb`, `usuarios`, `configuracion`, `clock`): `BackupService`

#### Parameters

##### empresas

[`IEmpresaRepository`](../../../../core/ports/repositories/IEmpresaRepository/interfaces/IEmpresaRepository.md)

##### contactos

[`IContactoRepository`](../../../../core/ports/repositories/IContactoRepository/interfaces/IContactoRepository.md)

##### tickets

[`ITicketQueries`](../../../../core/ports/repositories/ITicketQueries/interfaces/ITicketQueries.md)

##### cotizaciones

[`ICotizacionRepository`](../../../../core/ports/repositories/ICotizacionRepository/interfaces/ICotizacionRepository.md)

##### versiones

[`IVersionRepository`](../../../../core/ports/repositories/IVersionRepository/interfaces/IVersionRepository.md)

##### kb

[`IKnowledgeRepository`](../../../../core/ports/repositories/IKnowledgeRepository/interfaces/IKnowledgeRepository.md)

##### usuarios

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

##### configuracion

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

#### Returns

`BackupService`

## Methods

### exportar()

> **exportar**(): `Promise`\<`Record`\<`string`, `unknown`\>\>

Vuelca todas las colecciones principales a un solo objeto serializable a JSON.

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>
