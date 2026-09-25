[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/empresas/AvisarEmpresasService](../README.md) / AvisarEmpresasService

# Class: AvisarEmpresasService

Caso de uso: avisar (por correo o WhatsApp) a un lote de empresas sobre versiones
desactualizadas o licencias por vencer/vencidas, con la plantilla y contactos de soporte
configurados. WhatsApp no usa CallMeBot (solo manda al número propio dado de alta) — manda
el evento `empresa.avisar_whatsapp` al webhook n8n dedicado, para que se enrute ahí a un
proveedor real de WhatsApp Business. Si no hay webhook configurado, cae al mismo respaldo
que el CRM viejo: el cliente abre wa.me/WhatsApp Web con el mensaje ya redactado.

## Constructors

### Constructor

> **new AvisarEmpresasService**(`empresas`, `contactos`, `versiones`, `configuracion`, `email`, `gateway`, `bitacora`, `clock`, `usuarios?`): `AvisarEmpresasService`

#### Parameters

##### empresas

[`IEmpresaRepository`](../../../../core/ports/repositories/IEmpresaRepository/interfaces/IEmpresaRepository.md)

##### contactos

[`IContactoRepository`](../../../../core/ports/repositories/IContactoRepository/interfaces/IContactoRepository.md)

##### versiones

[`IVersionRepository`](../../../../core/ports/repositories/IVersionRepository/interfaces/IVersionRepository.md)

##### configuracion

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### email

[`IEmailSender`](../../../../core/ports/services/IEmailSender/interfaces/IEmailSender.md)

##### gateway

[`IIntegracionesGateway`](../../../../core/ports/services/IIntegracionesGateway/interfaces/IIntegracionesGateway.md)

##### bitacora

[`BitacoraService`](../../../shared/BitacoraService/classes/BitacoraService.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### usuarios?

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

#### Returns

`AvisarEmpresasService`

## Methods

### pendientes()

> **pendientes**(`actor`, `empresaIds`, `tipo`): `Promise`\<`object`[]\>

Los pendientes de cada empresa, para la pantalla donde se eligen antes de enviar.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### empresaIds

`string`[]

##### tipo

[`TipoAviso`](../type-aliases/TipoAviso.md)

#### Returns

`Promise`\<`object`[]\>

***

### ejecutar()

> **ejecutar**(`input`): `Promise`\<[`ResultadoAviso`](../interfaces/ResultadoAviso.md)[]\>

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### empresaIds

`string`[]

###### tipo

[`TipoAviso`](../type-aliases/TipoAviso.md)

###### canal?

[`CanalAviso`](../type-aliases/CanalAviso.md)

###### seleccion?

`Record`\<`string`, `string`[]\>

Qué sistemas mencionar por empresa (`empresaId` → sistemas). Sin esto van todos los pendientes.

#### Returns

`Promise`\<[`ResultadoAviso`](../interfaces/ResultadoAviso.md)[]\>
