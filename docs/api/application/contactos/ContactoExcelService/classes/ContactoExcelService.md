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

### filasParaExportar()

> **filasParaExportar**(`filtro?`): `Promise`\<`Record`\<`string`, `string`\>[]\>

Filas listas para una hoja "Contactos" — reutilizado por el export unificado.

#### Parameters

##### filtro?

[`ListarContactosFiltro`](../../../../core/ports/repositories/IContactoRepository/interfaces/ListarContactosFiltro.md)

#### Returns

`Promise`\<`Record`\<`string`, `string`\>[]\>

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

***

### importarFilas()

> **importarFilas**(`actor`, `filas`): `Promise`\<[`ResumenImportacionExcel`](../../../empresas/EmpresaExcelService/interfaces/ResumenImportacionExcel.md)\>

Procesa filas ya leídas (de una hoja "Contactos") — reutilizado por el import unificado.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### filas

`Record`\<`string`, `string`\>[]

#### Returns

`Promise`\<[`ResumenImportacionExcel`](../../../empresas/EmpresaExcelService/interfaces/ResumenImportacionExcel.md)\>
