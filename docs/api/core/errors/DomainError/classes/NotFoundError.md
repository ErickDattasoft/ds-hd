[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/errors/DomainError](../README.md) / NotFoundError

# Class: NotFoundError

Defined in: core/errors/DomainError.ts:19

El recurso pedido no existe (o no es visible para el actor). → HTTP 404.

## Extends

- [`DomainError`](DomainError.md)

## Constructors

### Constructor

> **new NotFoundError**(`recurso`, `id?`): `NotFoundError`

Defined in: core/errors/DomainError.ts:23

#### Parameters

##### recurso

`string`

##### id?

`string`

#### Returns

`NotFoundError`

#### Overrides

[`DomainError`](DomainError.md).[`constructor`](DomainError.md#constructor)

## Properties

### code

> `readonly` **code**: `"NO_ENCONTRADO"` = `'NO_ENCONTRADO'`

Defined in: core/errors/DomainError.ts:20

Código estable, legible por máquina (p. ej. `TICKET_NO_ENCONTRADO`).

#### Overrides

[`DomainError`](DomainError.md).[`code`](DomainError.md#code)

***

### httpStatus

> `readonly` **httpStatus**: `404` = `404`

Defined in: core/errors/DomainError.ts:21

Código HTTP sugerido para la capa de entrega.

#### Overrides

[`DomainError`](DomainError.md).[`httpStatus`](DomainError.md#httpstatus)
