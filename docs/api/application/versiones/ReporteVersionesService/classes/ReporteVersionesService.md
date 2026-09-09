[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/versiones/ReporteVersionesService](../README.md) / ReporteVersionesService

# Class: ReporteVersionesService

Reporte de empresas con sistemas desactualizados y/o licencias vencidas o por vencer.
Se puede ver en pantalla, exportar a Excel, imprimir y enviar por correo (paridad con el CRM viejo).

## Constructors

### Constructor

> **new ReporteVersionesService**(`empresas`, `contactos`, `versiones`, `excel`, `email`, `bitacora`, `clock`): `ReporteVersionesService`

#### Parameters

##### empresas

[`IEmpresaRepository`](../../../../core/ports/repositories/IEmpresaRepository/interfaces/IEmpresaRepository.md)

##### contactos

[`IContactoRepository`](../../../../core/ports/repositories/IContactoRepository/interfaces/IContactoRepository.md)

##### versiones

[`IVersionRepository`](../../../../core/ports/repositories/IVersionRepository/interfaces/IVersionRepository.md)

##### excel

[`IExcelIO`](../../../../core/ports/services/IExcelIO/interfaces/IExcelIO.md)

##### email

[`IEmailSender`](../../../../core/ports/services/IEmailSender/interfaces/IEmailSender.md)

##### bitacora

[`BitacoraService`](../../../shared/BitacoraService/classes/BitacoraService.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

#### Returns

`ReporteVersionesService`

## Methods

### generar()

> **generar**(`opts?`): `Promise`\<[`FilaReporteVersiones`](../interfaces/FilaReporteVersiones.md)[]\>

Calcula el reporte. `empresaId` lo acota a una sola empresa.

#### Parameters

##### opts?

###### empresaId?

`string`

#### Returns

`Promise`\<[`FilaReporteVersiones`](../interfaces/FilaReporteVersiones.md)[]\>

***

### exportarExcel()

> **exportarExcel**(`opts?`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

El reporte como `.xlsx`.

#### Parameters

##### opts?

###### empresaId?

`string`

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

***

### enviarPorCorreo()

> **enviarPorCorreo**(`actor`, `opts`): `Promise`\<\{ `enviadoA`: `string`[]; \}\>

Envía el reporte por correo a los destinatarios indicados.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### opts

###### destinatarios

`string`[]

###### empresaId?

`string`

#### Returns

`Promise`\<\{ `enviadoA`: `string`[]; \}\>
