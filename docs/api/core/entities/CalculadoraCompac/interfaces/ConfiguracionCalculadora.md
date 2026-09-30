[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/CalculadoraCompac](../README.md) / ConfiguracionCalculadora

# Interface: ConfiguracionCalculadora

Catálogos y precios de la calculadora Compac (paridad con `configCompac` del CRM viejo): el
precio depende del TIPO DE EQUIPO y de cuántos sistemas lleva, no de qué sistema es.

## Properties

### catalogoSistemas

> **catalogoSistemas**: `string`[]

Sistemas que se pueden marcar en un grupo — cada uno es independiente, incluido "Componentes".

***

### catalogoEquipos

> **catalogoEquipos**: [`TipoEquipoCompac`](TipoEquipoCompac.md)[]

***

### precioSQL

> **precioSQL**: `number`

Precio de SQL por equipo; solo aplica a equipos "Servidor".
