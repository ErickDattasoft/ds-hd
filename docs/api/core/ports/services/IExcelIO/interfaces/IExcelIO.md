[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/IExcelIO](../README.md) / IExcelIO

# Interface: IExcelIO

Lectura/escritura de archivos `.xlsx`, de una sola hoja o de varias (un archivo unificado).

## Methods

### escribir()

> **escribir**(`hoja`, `columnas`, `filas`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

#### Parameters

##### hoja

`string`

##### columnas

[`ColumnaExcel`](ColumnaExcel.md)[]

##### filas

`Record`\<`string`, `string`\>[]

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

***

### leer()

> **leer**(`buffer`): `Promise`\<`Record`\<`string`, `string`\>[]\>

#### Parameters

##### buffer

`Buffer`

#### Returns

`Promise`\<`Record`\<`string`, `string`\>[]\>

***

### escribirVarias()

> **escribirVarias**(`hojas`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Varias hojas en un solo archivo `.xlsx` — para el export/import unificado.

#### Parameters

##### hojas

[`HojaExcel`](HojaExcel.md)[]

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

***

### leerVarias()

> **leerVarias**(`buffer`): `Promise`\<`Record`\<`string`, `Record`\<`string`, `string`\>[]\>\>

Todas las hojas del archivo, indexadas por nombre.

#### Parameters

##### buffer

`Buffer`

#### Returns

`Promise`\<`Record`\<`string`, `Record`\<`string`, `string`\>[]\>\>
