[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/contactos/ContactoExcelService](../README.md) / ContactoExcelService

# Class: ContactoExcelService

Import/export de Contactos en Excel (`.xlsx`). La empresa se referencia por nombre exacto.

## Constructors

### Constructor

> **new ContactoExcelService**(`contactos`, `empresas`, `excel`): `ContactoExcelService`

#### Parameters

##### contactos

[`ContactoService`](../../ContactoService/classes/ContactoService.md)

##### empresas

[`EmpresaService`](../../../empresas/EmpresaService/classes/EmpresaService.md)

##### excel

[`IExcelIO`](../../../../core/ports/services/IExcelIO/interfaces/IExcelIO.md)

#### Returns

`ContactoExcelService`

## Methods

### exportar()

> **exportar**(`filtro?`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

#### Parameters

##### filtro?

[`ListarContactosFiltro`](../../../../core/ports/repositories/IContactoRepository/interfaces/ListarContactosFiltro.md)

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

***

### importar()

> **importar**(`actor`, `buffer`): `Promise`\<[`ResumenImportacionExcel`](../../../empresas/EmpresaExcelService/interfaces/ResumenImportacionExcel.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### buffer

`Buffer`

#### Returns

`Promise`\<[`ResumenImportacionExcel`](../../../empresas/EmpresaExcelService/interfaces/ResumenImportacionExcel.md)\>
