[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/configuracion/BackupService](../README.md) / BackupService

# Class: BackupService

Backup/restauración completa de ds-hd, en el propio formato del sistema (no el del CRM
viejo — ese lo maneja `scripts/migrate/`). Pensado para respaldo manual y recuperación
ante desastres, no para migrar entre sistemas distintos.

Restaurar es SIEMPRE upsert (agrega/actualiza por id) — nunca borra lo que ya existe en
ds-hd y no viene en el archivo. Un modo de reemplazo total (borrar lo que sobra) quedó
descartado a propósito: es mucho más arriesgado y el usuario pidió explícitamente la
opción segura.

## Constructors

### Constructor

> **new BackupService**(`empresas`, `contactos`, `ticketRepo`, `ticketQueries`, `cotizaciones`, `versiones`, `kb`, `usuarios`, `configuracion`, `contador`, `clock`, `oportunidades?`, `webhooks?`, `bitacora?`): `BackupService`

#### Parameters

##### empresas

[`IEmpresaRepository`](../../../../core/ports/repositories/IEmpresaRepository/interfaces/IEmpresaRepository.md)

##### contactos

[`IContactoRepository`](../../../../core/ports/repositories/IContactoRepository/interfaces/IContactoRepository.md)

##### ticketRepo

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### ticketQueries

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

##### contador

[`IContadorRepository`](../../../../core/ports/repositories/IContadorRepository/interfaces/IContadorRepository.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### oportunidades?

[`IOportunidadRepository`](../../../../core/ports/repositories/IOportunidadRepository/interfaces/IOportunidadRepository.md)

##### webhooks?

[`IWebhookPublisher`](../../../../core/ports/services/IWebhookPublisher/interfaces/IWebhookPublisher.md)

##### bitacora?

[`BitacoraService`](../../../shared/BitacoraService/classes/BitacoraService.md)

#### Returns

`BackupService`

## Methods

### registrarDescarga()

> **registrarDescarga**(`actor`): `Promise`\<`void`\>

Anota quién y cuándo descargó el backup (para la alerta de 7 días, como el viejo).

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<`void`\>

***

### estado()

> **estado**(): `Promise`\<[`EstadoBackup`](../../../../core/entities/EstadoBackup/interfaces/EstadoBackup.md) & `object`\>

Último backup y si ya toca alertar.

#### Returns

`Promise`\<[`EstadoBackup`](../../../../core/entities/EstadoBackup/interfaces/EstadoBackup.md) & `object`\>

***

### avisarSiAtrasado()

> **avisarSiAtrasado**(): `Promise`\<\{ `avisado`: `boolean`; `dias`: `number` \| `null`; \}\>

Evento `backup.no_realizado` (n8n/WhatsApp) cuando pasan 7 días o más sin backup — a lo
más una vez al día. Lo llama el cron.

#### Returns

`Promise`\<\{ `avisado`: `boolean`; `dias`: `number` \| `null`; \}\>

***

### exportar()

> **exportar**(): `Promise`\<`Record`\<`string`, `unknown`\>\>

Vuelca todas las colecciones principales a un solo objeto serializable a JSON.

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

***

### restaurar()

> **restaurar**(`actor`, `datosCrudos`): `Promise`\<[`ResumenRestauracion`](../interfaces/ResumenRestauracion.md)\>

Restaura un backup exportado por `exportar()` — upsert por id, nunca borra.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### datosCrudos

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<[`ResumenRestauracion`](../interfaces/ResumenRestauracion.md)\>
