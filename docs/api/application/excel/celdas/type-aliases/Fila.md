[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/excel/celdas](../README.md) / Fila

# Type Alias: Fila

> **Fila** = `Record`\<`string`, `string`\>

Lectura de celdas de un Excel importado, compartida por empresas y contactos.

Una columna que el archivo NO trae deja el dato como está (`undefined`); una que sí trae
pero vacía lo borra (`''`). Sin esa distinción, actualizar desde un Excel con menos
columnas borraba notas, vigencias y demás datos que el archivo ni mencionaba.
