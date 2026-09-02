[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/errors/DomainError](../README.md) / UnauthorizedError

# Class: UnauthorizedError

Defined in: core/errors/DomainError.ts:58

No hay sesión válida. → HTTP 401.

## Extends

- [`DomainError`](DomainError.md)

## Constructors

### Constructor

> **new UnauthorizedError**(`message?`): `UnauthorizedError`

Defined in: core/errors/DomainError.ts:62

#### Parameters

##### message?

`string` = `'Necesitas iniciar sesión'`

#### Returns

`UnauthorizedError`

#### Overrides

[`DomainError`](DomainError.md).[`constructor`](DomainError.md#constructor)

## Properties

### code

> `readonly` **code**: `"NO_AUTENTICADO"` = `'NO_AUTENTICADO'`

Defined in: core/errors/DomainError.ts:59

Código estable, legible por máquina (p. ej. `TICKET_NO_ENCONTRADO`).

#### Overrides

[`DomainError`](DomainError.md).[`code`](DomainError.md#code)

***

### httpStatus

> `readonly` **httpStatus**: `401` = `401`

Defined in: core/errors/DomainError.ts:60

Código HTTP sugerido para la capa de entrega.

#### Overrides

[`DomainError`](DomainError.md).[`httpStatus`](DomainError.md#httpstatus)
