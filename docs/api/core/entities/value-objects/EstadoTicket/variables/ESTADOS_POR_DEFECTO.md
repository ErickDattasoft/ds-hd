[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/entities/value-objects/EstadoTicket](../README.md) / ESTADOS\_POR\_DEFECTO

# Variable: ESTADOS\_POR\_DEFECTO

> `const` **ESTADOS\_POR\_DEFECTO**: readonly \[`"Abierto"`, `"En proceso"`, `"Pendiente"`, `"Resuelto"`, `"Cerrado"`\]

Estados por defecto del ciclo de vida de un ticket. La lista es configurable en
Configuración → Tickets, pero estos son la semántica base:
 - `abierto` / `pendiente`  → cuentan como ESPERA (no suman tiempo trabajado, pausan SLA)
 - `en proceso`             → trabajo activo (suma tiempo trabajado, corre el SLA)
 - `resuelto` / `cerrado`   → finales (detienen el SLA)
