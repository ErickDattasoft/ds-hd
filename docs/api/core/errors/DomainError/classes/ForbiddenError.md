[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/errors/DomainError](../README.md) / ForbiddenError

# Class: ForbiddenError

El actor está autenticado pero no autorizado para esta acción. → HTTP 403.

## Extends

- [`DomainError`](DomainError.md)

## Constructors

### Constructor

> **new ForbiddenError**(`message?`): `ForbiddenError`

#### Parameters

##### message?

`string` = `'No tienes permiso para realizar esta acción'`

#### Returns

`ForbiddenError`

#### Overrides

[`DomainError`](DomainError.md).[`constructor`](DomainError.md#constructor)

## Properties

### code

> `readonly` **code**: `"PROHIBIDO"` = `'PROHIBIDO'`

Código estable, legible por máquina (p. ej. `TICKET_NO_ENCONTRADO`).

#### Overrides

[`DomainError`](DomainError.md).[`code`](DomainError.md#code)

***

### httpStatus

> `readonly` **httpStatus**: `403` = `403`

Código HTTP sugerido para la capa de entrega.

#### Overrides

[`DomainError`](DomainError.md).[`httpStatus`](DomainError.md#httpstatus)
