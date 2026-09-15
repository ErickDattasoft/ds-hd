[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/excel/ExcelUnificadoService](../README.md) / ExcelUnificadoService

# Class: ExcelUnificadoService

Export/import unificado: un solo `.xlsx` con una hoja por tipo (Empresas/Contactos/Tickets),
como el modal del CRM viejo — en vez de tres archivos sueltos, uno por módulo. Reutiliza la
lógica de cada `XxxExcelService` (columnas + mapeo de filas), solo compone el archivo.
Tickets es de solo exportación, igual que en `TicketExcelService` (paridad con el viejo).

## Constructors

### Constructor

> **new ExcelUnificadoService**(`empresaExcel`, `contactoExcel`, `ticketExcel`, `excel`): `ExcelUnificadoService`

#### Parameters

##### empresaExcel

[`EmpresaExcelService`](../../../empresas/EmpresaExcelService/classes/EmpresaExcelService.md)

##### contactoExcel

[`ContactoExcelService`](../../../contactos/ContactoExcelService/classes/ContactoExcelService.md)

##### ticketExcel

[`TicketExcelService`](../../../tickets/TicketExcelService/classes/TicketExcelService.md)

##### excel

[`IExcelIO`](../../../../core/ports/services/IExcelIO/interfaces/IExcelIO.md)

#### Returns

`ExcelUnificadoService`

## Methods

### exportar()

> **exportar**(`actor`, `incluir`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### incluir

[`SeleccionExcelUnificado`](../interfaces/SeleccionExcelUnificado.md)

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

***

### importar()

> **importar**(`actor`, `buffer`): `Promise`\<[`ResumenImportUnificado`](../interfaces/ResumenImportUnificado.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### buffer

`Buffer`

#### Returns

`Promise`\<[`ResumenImportUnificado`](../interfaces/ResumenImportUnificado.md)\>
