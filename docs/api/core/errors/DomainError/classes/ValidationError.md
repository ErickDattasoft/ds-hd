[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/errors/DomainError](../README.md) / ValidationError

# Class: ValidationError

Los datos de entrada no cumplen una regla del dominio. → HTTP 422.

## Extends

- [`DomainError`](DomainError.md)

## Constructors

### Constructor

> **new ValidationError**(`message`, `campos?`): `ValidationError`

#### Parameters

##### message

`string`

##### campos?

`Record`\<`string`, `string`\> = `{}`

#### Returns

`ValidationError`

#### Overrides

[`DomainError`](DomainError.md).[`constructor`](DomainError.md#constructor)

## Properties

### code

> `readonly` **code**: `"VALIDACION"` = `'VALIDACION'`

Código estable, legible por máquina (p. ej. `TICKET_NO_ENCONTRADO`).

#### Overrides

[`DomainError`](DomainError.md).[`code`](DomainError.md#code)

***

### httpStatus

> `readonly` **httpStatus**: `422` = `422`

Código HTTP sugerido para la capa de entrega.

#### Overrides

[`DomainError`](DomainError.md).[`httpStatus`](DomainError.md#httpstatus)

***

### campos

> `readonly` **campos**: `Readonly`\<`Record`\<`string`, `string`\>\>

Errores por campo, para pintarlos junto a cada input del formulario.
