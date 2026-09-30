---
titulo: Bitácora de auditoría
audiencia: [staff]
rol_minimo: lectura
orden: 100
---

`/app/bitacora` es el registro de auditoría transversal del sistema: cada acción relevante
(crear/editar/archivar una empresa, aprobar una cotización, cambiar el estado de un ticket,
etc.) queda anotada aquí de forma automática — no se edita a mano.

![Bitácora](../screenshots/bitacora-lista.png)

## Qué muestra cada entrada

Se registra, entre otros: los inicios de sesión; toda la actividad de los tickets (creación,
cambios de estado, notas, adjuntos, correos, facturación y papelera); el alta y los cambios de
usuarios y contraseñas; cada guardado de Configuración; backups descargados o restaurados;
exportaciones e importaciones de Excel; y la limpieza de adjuntos.



Fecha, quién hizo la acción, en qué módulo, sobre qué entidad y un resumen en texto plano.
Es de solo lectura: sirve para reconstruir "quién tocó qué y cuándo" ante una duda o un
reclamo, y para todos los roles con acceso es visible sin importar si tienen permiso de
edición en el módulo original.
