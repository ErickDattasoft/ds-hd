[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/entities/value-objects/dominiosDesechables](../README.md) / DOMINIOS\_DESECHABLES

# Variable: DOMINIOS\_DESECHABLES

> `const` **DOMINIOS\_DESECHABLES**: `ReadonlySet`\<`string`\>

Lista curada de dominios de correo temporal/desechable conocidos. El CRM viejo usaba la
lista completa de github.com/disposable/disposable-email-domains (~100k dominios, ~1.2 MB),
demasiado pesada para el bundle del Worker. Aquí va solo un subconjunto de los proveedores
más comunes: basta para el propósito (MARCAR con 🚩, nunca bloquear).
