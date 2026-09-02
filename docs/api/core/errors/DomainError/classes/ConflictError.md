[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/errors/DomainError](../README.md) / ConflictError

# Class: ConflictError

Defined in: core/errors/DomainError.ts:52

La operación choca con el estado actual del recurso (p. ej. nombre duplicado). → HTTP 409.

## Extends

- [`DomainError`](DomainError.md)

## Constructors

### Constructor

> **new ConflictError**(`message`, `options?`): `ConflictError`

Defined in: core/errors/DomainError.ts:12

#### Parameters

##### message

`string`

##### options?

###### cause?

`unknown`

#### Returns

`ConflictError`

#### Inherited from

[`DomainError`](DomainError.md).[`constructor`](DomainError.md#constructor)

## Properties

### code

> `readonly` **code**: `"CONFLICTO"` = `'CONFLICTO'`

Defined in: core/errors/DomainError.ts:53

Código estable, legible por máquina (p. ej. `TICKET_NO_ENCONTRADO`).

#### Overrides

[`DomainError`](DomainError.md).[`code`](DomainError.md#code)

***

### httpStatus

> `readonly` **httpStatus**: `409` = `409`

Defined in: core/errors/DomainError.ts:54

Código HTTP sugerido para la capa de entrega.

#### Overrides

[`DomainError`](DomainError.md).[`httpStatus`](DomainError.md#httpstatus)
