# Auditoría de paridad · CRM DATTASOFT (producción) → ds-hd

**Fecha:** 2026-09-03
**Comparación:** `PROYECTO CRM DATTASOFT` @ `bf861c3` (SPA Astro, `index.astro` ~18 830 líneas)
contra `ds-hd` @ `82a9e2a` + WIP de Cloudflare.
**Método:** revisión de código (rutas, servicios, entidades y plantillas del nuevo) contra el
manual embebido y el código del viejo. **No es prueba en ejecución** — las filas `◐` conviene
confirmarlas a mano.

Leyenda: `✓` presente (igual o mejor) · `◐` parcial · `✗` falta · `≠` modelo distinto a propósito.

---

## Veredicto

El núcleo está y varias cosas son **mejores** que el viejo: RBAC real desde el inicio, SLA con
pausa, capacidad máxima de agentes, buzón de tickets públicos, kanban, roles por área
(soporte/ventas), rediseño + dark mode + accesibilidad, manuales autogenerados, y la base de
conocimiento (que el viejo retiró en ago-2026).

Los huecos se concentran en tres frentes, ninguno estructural:

1. **Circuito comercial "avisar a clientes"** (Empresas + Versiones): vigencias por sistema,
   versión instalada vs. oficial, plantillas con comodines, envío masivo por correo/WhatsApp,
   licencias por vencer. Hoy no existe.
2. **Herramientas de administración de Configuración**: backup/restore JSON, webhook de n8n y
   reglas de notificación por evento configurables desde la UI, logo, import/export Excel.
3. **Detalles de tickets y eventos**: agenda con recordatorio, adjuntos inline, total facturable,
   límite por IP, asistencia con historial.

---

## Tus dos pedidos concretos

### 1. Apartados de facturación en el alta de tickets (NO APLICA FACTURACIÓN / FACTURA MENSUAL / CONSULTA SIN COSTO)

- **Viejo:** `Facturación` es un catálogo libre (hoy `NO FACTURADO` / `FACTURADO`) editable en
  Configuración → Tickets y elegible como `<select>` al crear el ticket. Agregar esos 3 valores
  es dar de alta 3 entradas en el catálogo.
- **Nuevo:** *no existe ese modelo*. La facturación es un booleano
  (`facturacion.facturado`) que se marca solo desde el detalle, más `facturacion.requiere` que se
  deriva automáticamente de *Tipos facturables*. No hay estado multi-valor ni selección en el alta.
- **Acción:** cambio de código chico — añadir un catálogo `estadosFacturacion` a
  `ConfiguracionTickets`, exponerlo en `tickets/form.njk` y `tickets/detail.njk`, y ajustar la
  condición del correo/evento "cerrado y facturado" en `MarcarFacturacionService`.

### 2. No se pueden borrar los tipos "General" y "Correo Electrónico"

- Es un **bug del viejo**, introducido en su commit `168ce82` (jul 2026): "Guardar Configuración"
  hace *unión* con lo que ya hay en Firestore antes de guardar, así que cualquier valor ya
  persistido reaparece aunque lo borres.
- **En el nuevo ese bug no existe.** El editor de catálogos (`configuracion/tickets.njk`) es un
  textarea que reemplaza la lista completa; `guardarTickets` hace `set(..., {merge:true})`, que
  reemplaza el arreglo. Único guardrail: si dejas la lista *totalmente vacía* se vuelven a sembrar
  los valores por defecto (`FirestoreConfiguracionRepository`). Ni el viejo ni el nuevo validan
  "tipo en uso".

---

## Detalle por módulo

### 01 · Autenticación y acceso — 5✓ 2◐ 2✗ 1≠

| Estado | Funcionalidad | Detalle |
|---|---|---|
| ✓ | Login usuario / contraseña | Token firmado en cookie (`SignedCookieSessionManager`). |
| ✓ | Roles y perfiles | Mejor: admin / supervisor / agente / soporte / ventas / lectura / cliente + overrides. |
| ✓ | Portal de cliente por invitación | Un solo uso, TTL 72 h. |
| ✓ | RBAC a nivel de datos | Motor de políticas + reglas Firestore. |
| ✓ | Fijar contraseña por enlace | Reemplaza el "reset" manual. |
| ≠ | "Cuenta segura" (doble login) | No aplica: el nuevo nace con cuentas de correo reales. |
| ◐ | Solicitar acceso + aprobación | Servicio y ruta existen; falta confirmar UI de aprobar/rechazar. |
| ◐ | Cierre por inactividad | Hay TTL absoluto de cookie; el viejo cerraba a las 8 h sin actividad. |
| ✗ | Bloqueo tras 5 intentos fallidos (15 min) | No encontrado en `LoginService`. |
| ✗ | Aviso Bloq Mayús / ver contraseña | Menor. |

### 02 · Dashboard — 6✓ 4✗

| Estado | Funcionalidad | Detalle |
|---|---|---|
| ✓ | Conteos de tickets | Abiertos, vencidos, sin asignar, creados esta semana. |
| ✓ | Tickets por estado / prioridad | Barras CSS. |
| ✓ | Cotizaciones por estado | Nuevo respecto del viejo. |
| ✓ | Mis tareas pendientes | |
| ✓ | Próximos eventos | |
| ✓ | Actividad reciente | Desde la bitácora. |
| ✗ | Gráfica de tickets por mes (6 meses) | Solo muestra el estado actual. |
| ✗ | Banner de licencias por vencer (≤30 días) | Depende de que Empresas capture vigencias. |
| ✗ | "Avisos pendientes" con click-through | Empresas con sistemas desactualizados no notificadas. |
| ✗ | Total de empresas | Menor. |

### 03 · Empresas — 4✓ 4◐ 10✗

El módulo con más distancia — en el viejo es el centro del circuito comercial.

| Estado | Funcionalidad | Detalle |
|---|---|---|
| ✓ | CRUD + archivar (papelera) | |
| ✓ | Búsqueda por nombre / RFC | |
| ✓ | RFC, razón social, dirección, teléfono, correo, notas | |
| ✓ | Bitácora transversal de cambios | |
| ◐ | Sistemas contratados + vigencias por sistema | La entidad tiene `vigencias`, pero el formulario **no las captura**. Sin vigencias, toda la lógica de licencias queda muerta. |
| ◐ | WhatsApp / correo por empresa | Hay enlace `wa.me` en el detalle; sin plantilla. |
| ◐ | Historial de interacciones | Se listan en el detalle; sin panel con filtro por fecha/tipo ni tickets embebidos. |
| ◐ | Tareas por empresa | Existen a nivel global (Seguimiento); falta el panel por empresa. |
| ✗ | Filtro por sistema | |
| ✗ | Favoritos ⭐ + filtro | |
| ✗ | Importar / exportar Excel | |
| ✗ | Versión CONTPAQi instalada vs. oficial (colores) | Fila expandible actualizado/desactualizado/sin dato. |
| ✗ | Alertas de licencia en la fila | Vencida / por vencer. |
| ✗ | Avisar versiones (correo + WhatsApp masivo) | Selección múltiple → plantilla con comodines. |
| ✗ | Avisar licencias (correo + WhatsApp masivo) | Flujo separado, plantilla e historial propios. |
| ✗ | Panel "pendientes de aviso" preseleccionado | |
| ✗ | Alta de empresa + primer contacto en un paso | El form de empresa del nuevo no crea contactos. |
| ✗ | Filtros guardados | Búsquedas frecuentes aplicables con un clic. |

### 04 · Contactos — 3✓ 1◐ 3✗

| Estado | Funcionalidad | Detalle |
|---|---|---|
| ✓ | CRUD + archivar | |
| ✓ | Vínculo a empresa | |
| ✓ | Contacto principal de la empresa | `contactoPrincipalId`. |
| ◐ | Buscar por nombre / empresa / correo · cargo | Por confirmar en la vista. |
| ✗ | "Nueva empresa rápida" desde el form de contacto | |
| ✗ | Importar / exportar Excel | |
| ✗ | Sincronizar contactos principal/alternativo → directorio | Herramienta de Configuración. |

### 05 · Cotizaciones + Calculadora Compac — 6✓ 1◐ 5✗

| Estado | Funcionalidad | Detalle |
|---|---|---|
| ✓ | CRUD + folio `COT-AAAA-####` | Contador transaccional. |
| ✓ | Conceptos, totales, IVA, moneda | |
| ✓ | Ciclo de estado + aprobación | Permiso `cotizaciones:aprobar`. |
| ✓ | Calculadora Compac | Config de sistemas/precios/SQL/IVA editable; cálculo por grupos. |
| ✓ | Enviar al cotizador desde la calculadora | Ruta `/cotizaciones/calcular`. |
| ✓ | Bitácora de cambios | |
| ◐ | Editar precios de la calculadora "sin salir" | Se editan en Configuración, no en modal. |
| ✗ | Generar PDF de la cotización | |
| ✗ | Enviar cotización por correo | |
| ✗ | Crear ticket desde una cotización | |
| ✗ | Catálogo de conceptos reutilizable | |
| ✗ | Términos y condiciones configurables | |

### 06 · Tickets — 12✓ 4◐ 9✗ 1≠

La base es más sólida que en el viejo; lo que falta son extras alrededor del ticket.

| Estado | Funcionalidad | Detalle |
|---|---|---|
| ✓ | CRUD + estados configurables + transiciones validadas | El viejo no validaba transiciones. |
| ✓ | SLA por prioridad con pausa | Solo "Pendiente" pausa el reloj. |
| ✓ | Folios transaccionales | |
| ✓ | Asignar agente + capacidad máxima (forzar) | El viejo no tenía tope de carga. |
| ✓ | Notas públicas / internas | El portal nunca ve las internas. |
| ✓ | Portal público + buzón aceptar / rechazar | |
| ✓ | Turnstile en el formulario público | |
| ✓ | Kanban con arrastrar y soltar | |
| ✓ | Mis asignados / carga de agentes | |
| ✓ | Tiempo trabajado (no cuenta Abierto/Pendiente) | |
| ✓ | Trazabilidad (creación, cambio de estado/agente) | Subcolección de eventos. |
| ✓ | Evento n8n al facturar | `ticket.facturado`. |
| ◐ | Badge de SLA en la lista | Lógica `estaVencido` existe; confirmar el badge en `list.njk`. |
| ◐ | Línea de tiempo del ticket | El detalle muestra un log de eventos, no la línea con duración por tramo. |
| ◐ | Total facturable con color por tipo | `requiere` se deriva; falta la vista del total. |
| ◐ | Correo "cerrado y facturado" | Confirmar que dispara con la combinación en cualquier orden, una sola vez. |
| ≠ | Facturación en el alta | Ver arriba: hoy es booleano en el detalle. |
| ✗ | Programar atención (Agenda) + recordatorio WhatsApp 30 min antes | Badge 📅, vista Agenda, aviso vía n8n. |
| ✗ | Editar tiempo manual (con el automático como referencia) | |
| ✗ | "Incluir tiempo trabajado en la descripción" | |
| ✗ | Adjuntos: imágenes pegadas inline, redimensionar, float | Firebase Storage no implementado. |
| ✗ | Gestión de espacio de adjuntos | |
| ✗ | Editor de descripción con "Encabezado" / "Imagen" | |
| ✗ | PDF del ticket | |
| ✗ | Exportar tickets a Excel | |
| ✗ | "Guardar y crear nuevo" / columnas ajustables | Menor. |

### 07 · Eventos — 7✓ 1◐ 6✗ 1≠

| Estado | Funcionalidad | Detalle |
|---|---|---|
| ✓ | CRUD de eventos | |
| ✓ | Registro público + Turnstile + cupo | |
| ✓ | Panel de inscritos | |
| ✓ | Semáforo de entrega de correo (webhook Brevo) | `correoEstado`: pendiente/entregado/rebotado. |
| ✓ | Lista negra de inscritos | |
| ✓ | Recordatorios automáticos por correo | `enviarRecordatorios()` + cron. |
| ✓ | Reenviar confirmación / link real | |
| ◐ | Asistencia | Hay estado de inscripción; falta el historial cruzado entre eventos. |
| ≠ | Empresas invitadas + "invitado por" + respuesta | El viejo combinaba invitación dirigida + registro público; el nuevo es solo registro público. |
| ✗ | Registrar IP + límite configurable por IP | Antiabuso. |
| ✗ | Marcar correos de dominios desechables (🚩) | |
| ✗ | WhatsApp de seguimiento (a pendientes / no asistió) | |
| ✗ | Contacto por evento (nombre + WhatsApp) editable | |
| ✗ | Plantilla de correo por evento | |
| ✗ | Campo "¿cómo se enteró?" | |

### 08 · Versiones CONTPAQi — 1✓ 1◐ 4✗

| Estado | Funcionalidad | Detalle |
|---|---|---|
| ✓ | CRUD de versión vigente por sistema | Versión actual, fecha, notas, link de descarga. |
| ◐ | Carta técnica (link PDF) | `linkDescarga` puede cubrirlo; sin campo dedicado. |
| ✗ | Comparación con la versión instalada por cliente | Depende de Empresas (ver 03). |
| ✗ | Plantilla de mensaje "Versiones" con comodines | `[contacto]`, `[empresa]`, `[sistemas_pendientes]`, `[contacto_soporte]`. |
| ✗ | Plantilla de mensaje "Licencias" con comodines | Flujo y comodines propios. |
| ✗ | Contactos de soporte (Versiones / Licencias) | Listas para el comodín `[contacto_soporte]`. |

### 09 · Base de conocimiento — 4✓

El viejo **retiró** este módulo en ago-2026 (commit `a944605`); el nuevo lo mantiene y lo mejora.

| Estado | Funcionalidad | Detalle |
|---|---|---|
| ✓ | CRUD de artículos | |
| ✓ | Visibilidad staff / portal / público | |
| ✓ | Publicado / borrador | |
| ✓ | Slug + Markdown | `marked`. |

### 10 · Seguimiento comercial — 2✓ 1◐

| Estado | Funcionalidad | Detalle |
|---|---|---|
| ✓ | Interacciones (llamada / correo / reunión / WhatsApp / nota) | |
| ✓ | Tareas asignables + fecha de vencimiento + completar | |
| ◐ | Estados de tarea con color (vencida / hoy / próxima) | Confirmar en `seguimiento/tareas.njk`. |

### 11 · Configuración — 3✓ 3◐ 12✗

Segundo módulo con más distancia.

| Estado | Funcionalidad | Detalle |
|---|---|---|
| ✓ | Catálogos de tickets | Tipos, sistemas, grupos, estados, estado inicial, prioridades, SLA, tipos facturables, correos. **Sin el bug de no poder borrar tipos.** |
| ✓ | Config de la calculadora Compac | |
| ✓ | Usuarios: CRUD + activar/desactivar + rol | |
| ◐ | Tema claro / oscuro | Por cookie. Falta "encabezado / apariencia personalizable". |
| ◐ | Fijar contraseña de un usuario | Vía invitación de un solo uso; sin "activar cuenta segura" con contraseña temporal. |
| ◐ | Solicitudes de acceso pendientes | Servicio y ruta existen; confirmar UI. |
| ✗ | Logo de empresa (sidebar + página pública) | |
| ✗ | Correo de soporte configurable desde la UI | Hoy es config general / env. |
| ✗ | n8n: webhook configurable + "probar conexión" | Hoy es env (`N8N_WEBHOOK_TICKETS` / `_COTIZACIONES`). |
| ✗ | n8n: destinatarios WhatsApp (CallMeBot) + probar | |
| ✗ | n8n: reglas de notificación por evento (ON/OFF + a quién) | El viejo tiene una matriz configurable. |
| ✗ | Descargar backup JSON completo | |
| ✗ | Restaurar backup (con modo de reemplazo total) | Hay scripts de migración, no herramienta en la UI. |
| ✗ | Sincronizar contactos de empresas → directorio | |
| ✗ | GitHub: puntos de restauración | |
| ✗ | Config de cotizaciones (términos, catálogo de conceptos) | |
| ✗ | Mantenimiento de adjuntos (migrar / archivar / eliminar) | Sin adjuntos en el nuevo. |
| ✗ | Buscador dentro de Configuración | Menor. |

### 12 · Bitácora + Papelera — 3✓ 6✗

| Estado | Funcionalidad | Detalle |
|---|---|---|
| ✓ | Registro de acciones transversal | `BitacoraService` best-effort. |
| ✓ | Filtro por módulo | |
| ✓ | Papelera: archivar / restaurar empresas, contactos, tickets | |
| ✗ | Bitácora: filtro por rango de fechas | |
| ✗ | Bitácora: filtro por usuario | |
| ✗ | Bitácora: "Limpiar" + retención automática de 60 días | |
| ✗ | Bitácora: exportar a Excel | |
| ✗ | Papelera: restaurar múltiple / selección | |
| ✗ | Papelera: vaciar / eliminar definitivo | |

### 13 · Utilidades transversales — 3✓ 2✗ 2≠

| Estado | Funcionalidad | Detalle |
|---|---|---|
| ✓ | Responsive + dark mode + accesibilidad | Mejor: skip links, focus-visible, aria-current, reduced-motion. |
| ✓ | Toasts de guardado + confirmaciones | |
| ✓ | htmx + JS vanilla (sin SPA, CSP en 'self') | |
| ≠ | Manual de uso embebido | Reemplazado por manuales autogenerados + referencia de API. |
| ≠ | Modo local sin Firebase | No aplica a la arquitectura server-side. |
| ✗ | Búsqueda global Ctrl+K | Empresa / contacto / ticket / KB desde cualquier pantalla. |
| ✗ | Importar / exportar Excel unificado | Empresas / Contactos / Tickets en un solo flujo. |

---

## Plan de implementación

Ver la sección de fases más abajo, que se irá actualizando conforme se avance.

### Fase P1 — Datos y circuito comercial (bloqueante para operar)
1. **Vigencias de licencia por sistema en Empresas** — capturar `vigencias` en el form + mostrarlas
   en lista/detalle con badge vencida/por vencer. Desbloquea el banner del dashboard y el flujo de
   Licencias.
2. **Versión instalada por sistema en Empresas** + comparación con `VersionSistema` (badge
   actualizado/desactualizado). Desbloquea "avisos pendientes".
3. **Plantillas de mensaje (Versiones y Licencias) con comodines** + contactos de soporte, en
   Versiones/Configuración.
4. **Envío masivo desde Empresas** (selección múltiple → correo y/o WhatsApp con plantilla),
   con historial de aviso por empresa y panel de pendientes.

### Fase P2 — Administración (bloqueante para operar)
5. **Backup/restore JSON desde la UI** (descargar respaldo completo; restaurar con confirmación).
6. **Import/export Excel** de Empresas, Contactos y Tickets (necesario para la carga inicial).
7. **n8n configurable desde la UI**: webhook + "probar conexión", destinatarios WhatsApp
   (CallMeBot), y matriz de reglas de notificación por evento.

### Fase P3 — Tu pedido + tickets
8. **Facturación como catálogo de estados** en el alta y el detalle del ticket
   (NO FACTURADO / FACTURADO / NO APLICA / FACTURA MENSUAL / CONSULTA SIN COSTO).
9. **Agenda del ticket**: programar fecha/hora/agente + recordatorio WhatsApp 30 min antes +
   badge 📅 + vista Agenda.
10. **Línea de tiempo visual** con duración por tramo + total facturable coloreado + editar
    tiempo manual + "incluir en la descripción".

### Fase P4 — Seguridad y pulido
11. **Endurecer login**: bloqueo tras 5 intentos fallidos, cierre por inactividad real.
12. **Dashboard**: gráfica de tickets por mes + banner de licencias por vencer + "avisos pendientes".
13. **Bitácora**: filtros por fecha y usuario, "Limpiar", retención de 60 días, export.
14. **Papelera**: vaciar / eliminar definitivo, restaurar múltiple.
15. **Eventos antiabuso**: límite por IP + registrar IP, marcar correos desechables.
16. **Cotizaciones**: PDF, enviar por correo, crear ticket desde cotización.
17. **Búsqueda global Ctrl+K**.

### Fase P5 — Diferido / requiere decisión
- **Adjuntos de tickets** (imágenes inline, gestión de espacio) — requiere implementar Firebase
  Storage; decidir si entra o se difiere.
- **Favoritos de empresa, filtros guardados, filtro por sistema** — productividad, no bloqueante.
- **Sincronizar contactos, puntos de restauración de GitHub, buscador en Configuración** — menores.
- **Eventos con invitación dirigida a empresas** (modelo del viejo) — decidir si se recupera o el
  registro público basta.
