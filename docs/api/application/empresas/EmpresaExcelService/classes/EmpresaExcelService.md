[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/empresas/EmpresaExcelService](../README.md) / EmpresaExcelService

# Class: EmpresaExcelService

Import/export de Empresas en Excel (`.xlsx`).

## Constructors

### Constructor

> **new EmpresaExcelService**(`empresas`, `excel`): `EmpresaExcelService`

#### Parameters

##### empresas

[`EmpresaService`](../../EmpresaService/classes/EmpresaService.md)

##### excel

[`IExcelIO`](../../../../core/ports/services/IExcelIO/interfaces/IExcelIO.md)

#### Returns

`EmpresaExcelService`

## Methods

### exportar()

> **exportar**(`filtro?`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

#### Parameters

##### filtro?

[`ListarEmpresasFiltro`](../../../../core/ports/repositories/IEmpresaRepository/interfaces/ListarEmpresasFiltro.md)

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

***

### importar()

> **importar**(`actor`, `buffer`): `Promise`\<[`ResumenImportacionExcel`](../interfaces/ResumenImportacionExcel.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### buffer

`Buffer`

#### Returns

`Promise`\<[`ResumenImportacionExcel`](../interfaces/ResumenImportacionExcel.md)\>
