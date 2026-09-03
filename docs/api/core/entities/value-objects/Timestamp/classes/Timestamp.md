[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/entities/value-objects/Timestamp](../README.md) / Timestamp

# Class: Timestamp

Marca de tiempo con precisión de milisegundo, sin depender de `firebase-admin` (ese import
arrastra todo el SDK de Firestore — gRPC incluido — a cualquier bundle que lo toque, lo
cual rompe el build para Cloudflare Workers). Los mappers de `infrastructure/firestore/`
usan esta clase en vez de `firebase-admin/firestore`'s `Timestamp`; cada adaptador de
Firestore (Admin SDK local, REST en Workers) la traduce a su propio formato en el borde.

## Methods

### fromDate()

> `static` **fromDate**(`d`): `Timestamp`

#### Parameters

##### d

`Date`

#### Returns

`Timestamp`

***

### fromMillis()

> `static` **fromMillis**(`millis`): `Timestamp`

#### Parameters

##### millis

`number`

#### Returns

`Timestamp`

***

### now()

> `static` **now**(): `Timestamp`

#### Returns

`Timestamp`

***

### toDate()

> **toDate**(): `Date`

#### Returns

`Date`

***

### toMillis()

> **toMillis**(): `number`

#### Returns

`number`
