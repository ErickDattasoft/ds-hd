[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/errors/DomainError](../README.md) / DomainError

# Abstract Class: DomainError

Error base del dominio. Toda la capa `core` y `application` lanza subtipos de este error;
la capa de entrega (interfaces/http/middlewares/errorHandler) los traduce a códigos HTTP.
Nunca se lanza un error de framework desde `core`/`application`.

## Extends

- `Error`

## Extended by

- [`NotFoundError`](NotFoundError.md)
- [`ValidationError`](ValidationError.md)
- [`ForbiddenError`](ForbiddenError.md)
- [`ConflictError`](ConflictError.md)
- [`UnauthorizedError`](UnauthorizedError.md)

## Constructors

### Constructor

> **new DomainError**(`message`, `options?`): `DomainError`

#### Parameters

##### message

`string`

##### options?

###### cause?

`unknown`

#### Returns

`DomainError`

#### Overrides

`Error.constructor`

## Properties

### code

> `abstract` `readonly` **code**: `string`

Código estable, legible por máquina (p. ej. `TICKET_NO_ENCONTRADO`).

***

### httpStatus

> `abstract` `readonly` **httpStatus**: `number`

Código HTTP sugerido para la capa de entrega.
