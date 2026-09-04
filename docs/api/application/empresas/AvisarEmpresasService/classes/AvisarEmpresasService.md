[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/empresas/AvisarEmpresasService](../README.md) / AvisarEmpresasService

# Class: AvisarEmpresasService

Caso de uso: avisar por correo a un lote de empresas sobre versiones desactualizadas o
licencias por vencer/vencidas, con la plantilla y contactos de soporte configurados.

## Constructors

### Constructor

> **new AvisarEmpresasService**(`empresas`, `contactos`, `versiones`, `configuracion`, `email`, `bitacora`, `clock`): `AvisarEmpresasService`

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

##### bitacora

[`BitacoraService`](../../../shared/BitacoraService/classes/BitacoraService.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

#### Returns

`AvisarEmpresasService`

## Methods

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

#### Returns

`Promise`\<[`ResultadoAviso`](../interfaces/ResultadoAviso.md)[]\>
