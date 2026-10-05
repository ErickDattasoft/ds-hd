[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/ArticuloKB](../README.md) / fragmentoKB

# Function: fragmentoKB()

> **fragmentoKB**(`articulo`, `texto`, `radio?`): [`FragmentoKB`](../interfaces/FragmentoKB.md) \| `null`

Primer pedazo del contenido donde aparece la búsqueda (la frase o, si no, su primera palabra
que sí esté), para que el resultado muestre POR QUÉ salió. `null` si solo coincidió el nombre.

## Parameters

### articulo

[`ArticuloKB`](../classes/ArticuloKB.md)

### texto

`string`

### radio?

`number` = `70`

## Returns

[`FragmentoKB`](../interfaces/FragmentoKB.md) \| `null`
