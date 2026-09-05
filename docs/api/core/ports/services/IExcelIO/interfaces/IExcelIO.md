[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/IExcelIO](../README.md) / IExcelIO

# Interface: IExcelIO

Lectura/escritura de hojas `.xlsx` planas (fila = objeto `{ encabezado: texto }`).

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
