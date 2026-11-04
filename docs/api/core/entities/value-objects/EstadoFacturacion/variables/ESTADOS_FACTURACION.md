[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/entities/value-objects/EstadoFacturacion](../README.md) / ESTADOS\_FACTURACION

# Variable: ESTADOS\_FACTURACION

> `const` **ESTADOS\_FACTURACION**: readonly \[`"no_facturado"`, `"en_proceso"`, `"facturado"`, `"garantia"`, `"no_aplica"`, `"factura_mensual"`, `"consulta_sin_costo"`\]

Estados de facturación «de fábrica». Tienen clave fija porque el sistema los reconoce
(p. ej. `facturado`/`factura_mensual` cuentan como factura emitida). El catálogo que se ve en
pantalla es editable en Configuración → Tickets (como en el CRM viejo): lo que se agregue ahí
se guarda en el ticket con su propio texto como valor.
