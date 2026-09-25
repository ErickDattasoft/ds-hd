[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/migracion/lib](../README.md) / pareceRespaldoViejo

# Function: pareceRespaldoViejo()

> **pareceRespaldoViejo**(`raw`): `boolean`

¿Este JSON tiene pinta de respaldo del CRM viejo? (para rechazar archivos equivocados).

Se mira solo por claves EXCLUSIVAS del formato viejo: `contactos`, `tickets` y `usuarios`
existen igual en el backup propio de ds-hd, así que aceptarlas dejaría pasar un archivo del
sistema nuevo — que es justo el error que hay que atajar, porque el importador no encuentra
nada dentro y termina en un "OK" con todos los contadores en cero.

## Parameters

### raw

`Record`\<`string`, `unknown`\>

## Returns

`boolean`
