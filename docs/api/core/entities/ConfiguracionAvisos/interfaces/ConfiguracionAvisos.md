[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/ConfiguracionAvisos](../README.md) / ConfiguracionAvisos

# Interface: ConfiguracionAvisos

Config de los avisos masivos de Versiones/Licencias a empresas (documento `configuracion/avisos`).

## Properties

### plantillaVersiones

> **plantillaVersiones**: `string`

Comodines: `[contacto]`, `[empresa]`, `[sistemas_pendientes]`, `[contacto_soporte]`.

***

### plantillaLicencias

> **plantillaLicencias**: `string`

Comodines: `[contacto]`, `[empresa]`, `[licencias_pendientes]`, `[contacto_soporte]`.

***

### contactosSoporteVersiones

> **contactosSoporteVersiones**: [`ContactoSoporte`](ContactoSoporte.md)[]

***

### contactosSoporteLicencias

> **contactosSoporteLicencias**: [`ContactoSoporte`](ContactoSoporte.md)[]
