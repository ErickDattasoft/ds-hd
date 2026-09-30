[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/EstadoBackup](../README.md) / EstadoBackup

# Interface: EstadoBackup

Cuándo se descargó el último backup (documento `configuracion/backup`).

## Properties

### ultimoBackup

> **ultimoBackup**: `string` \| `null`

ISO de la última descarga; null = nunca.

***

### ultimoBackupPor

> **ultimoBackupPor**: `string`

***

### ultimoAvisoNoRealizado

> **ultimoAvisoNoRealizado**: `string`

Día (AAAA-MM-DD) del último aviso «backup no realizado», para mandarlo una vez al día.
