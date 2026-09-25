[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/migracion/MigracionCrmViejoService](../README.md) / SeccionImportacion

# Type Alias: SeccionImportacion

> **SeccionImportacion** = `"empresas"` \| `"contactos"` \| `"tickets"` \| `"eventos"` \| `"cotizaciones"` \| `"kb"` \| `"versiones"` \| `"bitacora"` \| `"configuracion"` \| `"usuarios"`

Qué parte del respaldo se trae. El CRM viejo sigue en uso por otras personas, así que casi
nunca se quiere el archivo entero: lo normal es traer solo tickets, o solo empresas y
contactos, sin tocar lo demás de ds-hd.
