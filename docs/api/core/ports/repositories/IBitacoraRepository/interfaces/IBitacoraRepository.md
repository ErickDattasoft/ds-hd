[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IBitacoraRepository](../README.md) / IBitacoraRepository

# Interface: IBitacoraRepository

Registro de auditoría global (`bitacora/{id}`), solo escritura vía append.

## Methods

### registrar()

> **registrar**(`entrada`): `Promise`\<`void`\>

#### Parameters

##### entrada

[`EntradaBitacora`](../../../../entities/EntradaBitacora/interfaces/EntradaBitacora.md)

#### Returns

`Promise`\<`void`\>

***

### listar()

> **listar**(`filtro?`): `Promise`\<[`EntradaBitacora`](../../../../entities/EntradaBitacora/interfaces/EntradaBitacora.md)[]\>

#### Parameters

##### filtro?

[`FiltroBitacora`](FiltroBitacora.md)

#### Returns

`Promise`\<[`EntradaBitacora`](../../../../entities/EntradaBitacora/interfaces/EntradaBitacora.md)[]\>
