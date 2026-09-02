[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IVersionRepository](../README.md) / IVersionRepository

# Interface: IVersionRepository

Defined in: core/ports/repositories/IVersionRepository.ts:4

Persistencia de versiones de sistemas (`versiones_sistemas/{id}`).

## Methods

### findById()

> **findById**(`id`): `Promise`\<[`VersionSistema`](../../../../entities/VersionSistema/classes/VersionSistema.md) \| `null`\>

Defined in: core/ports/repositories/IVersionRepository.ts:5

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`VersionSistema`](../../../../entities/VersionSistema/classes/VersionSistema.md) \| `null`\>

***

### list()

> **list**(): `Promise`\<[`VersionSistema`](../../../../entities/VersionSistema/classes/VersionSistema.md)[]\>

Defined in: core/ports/repositories/IVersionRepository.ts:6

#### Returns

`Promise`\<[`VersionSistema`](../../../../entities/VersionSistema/classes/VersionSistema.md)[]\>

***

### save()

> **save**(`version`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IVersionRepository.ts:7

#### Parameters

##### version

[`VersionSistema`](../../../../entities/VersionSistema/classes/VersionSistema.md)

#### Returns

`Promise`\<`void`\>

***

### eliminar()

> **eliminar**(`id`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IVersionRepository.ts:8

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>
