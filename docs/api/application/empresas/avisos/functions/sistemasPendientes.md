[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/empresas/avisos](../README.md) / sistemasPendientes

# Function: sistemasPendientes()

> **sistemasPendientes**(`empresa`, `oficialPorSistema`, `cartaPorSistema?`): [`PendienteAviso`](../interfaces/PendienteAviso.md)[]

Sistemas de `empresa` cuya versión instalada está por debajo de la oficial. Si el sistema
tiene carta técnica registrada, se incluye su enlace (igual que el CRM viejo).

## Parameters

### empresa

[`Empresa`](../../../../core/entities/Empresa/classes/Empresa.md)

### oficialPorSistema

`Record`\<`string`, `string`\>

### cartaPorSistema?

`Record`\<`string`, `string` \| `null`\> = `{}`

## Returns

[`PendienteAviso`](../interfaces/PendienteAviso.md)[]
