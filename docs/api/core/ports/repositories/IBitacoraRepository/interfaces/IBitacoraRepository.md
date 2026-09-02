[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IBitacoraRepository](../README.md) / IBitacoraRepository

# Interface: IBitacoraRepository

Defined in: core/ports/repositories/IBitacoraRepository.ts:12

Registro de auditoría global (`bitacora/{id}`), solo escritura vía append.

## Methods

### registrar()

> **registrar**(`entrada`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IBitacoraRepository.ts:13

#### Parameters

##### entrada

[`EntradaBitacora`](../../../../entities/EntradaBitacora/interfaces/EntradaBitacora.md)

#### Returns

`Promise`\<`void`\>

***

### listar()

> **listar**(`filtro?`): `Promise`\<[`EntradaBitacora`](../../../../entities/EntradaBitacora/interfaces/EntradaBitacora.md)[]\>

Defined in: core/ports/repositories/IBitacoraRepository.ts:14

#### Parameters

##### filtro?

[`FiltroBitacora`](FiltroBitacora.md)

#### Returns

`Promise`\<[`EntradaBitacora`](../../../../entities/EntradaBitacora/interfaces/EntradaBitacora.md)[]\>
