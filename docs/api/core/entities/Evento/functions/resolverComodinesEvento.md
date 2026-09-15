[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Evento](../README.md) / resolverComodinesEvento

# Function: resolverComodinesEvento()

> **resolverComodinesEvento**(`texto`, `evento`, `inscrito`): `string`

Resuelve los comodines `[nombre] [evento] [fecha] [hora] [sistema] [link] [contacto_nombre]
[contacto_whatsapp]` de un texto cualquiera (plantilla de confirmación o mensaje de
seguimiento) contra los datos del evento y de un inscrito.

## Parameters

### texto

`string`

### evento

`Pick`\<[`Evento`](../classes/Evento.md), `"titulo"` \| `"fechaHora"` \| `"sistema"` \| `"urlWebinar"` \| `"contactoNombre"` \| `"contactoWhatsapp"`\>

### inscrito

#### nombre

`string`

## Returns

`string`
