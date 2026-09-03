[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IVersionRepository](../README.md) / IVersionRepository

# Interface: IVersionRepository

Persistencia de versiones de sistemas (`versiones_sistemas/{id}`).

## Methods

### findById()

> **findById**(`id`): `Promise`\<[`VersionSistema`](../../../../entities/VersionSistema/classes/VersionSistema.md) \| `null`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`VersionSistema`](../../../../entities/VersionSistema/classes/VersionSistema.md) \| `null`\>

***

### list()

> **list**(): `Promise`\<[`VersionSistema`](../../../../entities/VersionSistema/classes/VersionSistema.md)[]\>

#### Returns

`Promise`\<[`VersionSistema`](../../../../entities/VersionSistema/classes/VersionSistema.md)[]\>

***

### save()

> **save**(`version`): `Promise`\<`void`\>

#### Parameters

##### version

[`VersionSistema`](../../../../entities/VersionSistema/classes/VersionSistema.md)

#### Returns

`Promise`\<`void`\>

***

### eliminar()

> **eliminar**(`id`): `Promise`\<`void`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>
