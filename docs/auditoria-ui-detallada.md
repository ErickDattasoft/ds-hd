# Auditoría UI detallada — CRM viejo vs ds-hd

Comparación **campo por campo / botón por botón** de cada apartado. Complementa
`auditoria-paridad.md` (que es a nivel de módulo). Objetivo del usuario: ds-hd
debe tener **TODAS** las funciones y botones del viejo, pero con la interfaz
**reorganizada** para que se vea acomodada y sea fácil de usar. Los únicos
cambios intencionales son el modelo de permisos (RBAC real) y esa reorganización
visual.

Leyenda: ✅ existe · ◐ parcial · ❌ falta · ➖ no aplica (decisión de diseño)

---

## 1. Tickets — alta (`/app/tickets/nuevo`)

| Viejo | ds-hd | Acción |
|---|---|---|
| Nombre del contacto | ✅ (`contactoNombre`) | — |
| Correo del contacto | ✅ (`contactoCorreo`) | — |
| Empresa | ✅ (`empresaNombre`) | — |
| **CC / CCO al crear** | ❌ | agregar campos `cc` / `cco` |
| Asunto* | ✅ | — |
| Tipo | ✅ | — |
| Sistema | ◐ (sin opción "otro" texto libre) | agregar "otro" |
| **Estado inicial** (elegir) | ❌ (nace en `estadoInicial`) | agregar select de estado |
| Facturación | ✅ (`estadoFacturacion`) | — |
| Prioridad | ✅ | — |
| Grupo | ✅ | — |
| **Agente** (elegir cualquiera al crear) | ◐ (solo "asignármelo") | agregar select de agente |
| **Solicitado por** | ❌ | agregar campo |
| **Canalizado a** | ❌ | agregar campo |
| Descripción* | ✅ | — |
| **Barra del editor: 📋 Encabezado / 🖊️ Firma / 🖼️ Imagen** | ❌ | agregar botones (insertan en el textarea) |
| **Notas internas al crear** | ❌ | agregar textarea (solo con permiso) |
| **Adjuntar archivos al crear** | ❌ (solo en el detalle) | agregar el widget de adjuntos |
| Fecha / hora programada + recordatorio | ✅ | — |
| **"Guardar y crear nuevo"** | ❌ | agregar botón |

## 2. Tickets — detalle (`/app/tickets/:id`)

| Viejo | ds-hd | Acción |
|---|---|---|
| Badges prioridad / estado / tipo | ✅ | — |
| Empresa / Contacto / Grupo / Agente / Sistema | ✅ | — |
| **Solicitado por** (editable) | ❌ | agregar |
| **Canalizado a** (editable) | ❌ | agregar |
| Descripción | ✅ | — |
| **🔒 Notas internas** (caja persistente editable) | ◐ (existen como notas del hilo, no como campo fijo) | agregar caja fija editable |
| 📎 Adjuntos | ✅ (`096ec82`) | — |
| Tiempo trabajado + línea de tiempo | ✅ | — |
| Actividad del ticket | ✅ (`9414719`, visible) | — |
| Cambiar estado | ✅ | — |
| Cambiar facturación | ✅ | — |
| Asignar agente | ✅ | — |
| Programar atención | ✅ | — |
| Conversación pública (hilo con el cliente) | ✅ *(mejora sobre el viejo)* | — |
| **🖨️ Imprimir** (con/sin logo) | ❌ | agregar vista de impresión |
| **🧾 Cotizar** (crear cotización desde el ticket) | ❌ | agregar acción |
| ✉️ Reenviar correo | ✅ (`c7d1d6d`) | — |
| Archivar / papelera | ✅ | — |
| Lista negra (buzón público) | ✅ | — |

## 3. Tickets — lista (`/app/tickets`)

| Viejo | ds-hd | Acción |
|---|---|---|
| Orden por folio ↓ por defecto | ✅ (este commit) | — |
| **Encabezados ordenables** (clic) | ✅ (este commit, `initTablas`) | — |
| **Scroll horizontal** cuando no cabe | ✅ (este commit) | — |
| **Columnas ajustables** (arrastrar borde) | ✅ (este commit, ancho recordado) | — |
| Filtros: texto / estado / prioridad / incluir cerrados | ✅ | — |
| Filtro 📅 Agenda | ✅ | — |
| Tablero (kanban) | ✅ | — |
| Mis asignados | ✅ | — |
| Carga de agentes | ✅ | — |
| Exportar Excel | ✅ | — |
| Buzón de tickets públicos | ✅ | — |
| Badge 📅 en filas con agenda | ✅ | — |

## 4. Mi firma → **"Mi perfil"** (`/app/mi-perfil`)

| Viejo | ds-hd | Acción |
|---|---|---|
| Firma | ✅ (`firma`) | — |
| **Encabezado** (con `[fecha]`, default Síntoma/Problema/Solución) | ❌ | agregar campo `encabezado` + default |

## 5. Empresas (`/app/empresas`)

| Viejo | ds-hd | Acción |
|---|---|---|
| Alta: nombre*/tel/correo/RFC/razón social/dirección/notas | ✅ | — |
| **Vigencia + versión por sistema** (en el alta) | ◐ (solo al editar — P1·1/P1·2) | permitir también al crear |
| **⚙️ Campos Extra** (campos personalizados por empresa) | ❌ | evaluar — agregar `camposExtra` libre |
| Favoritos ⭐ + filtro | ✅ (`378a26a`) | — |
| Filtros guardados 🔖 | ✅ (`b38224f`) | — |
| Filtro licencias por vencer / sistemas desactualizados | ✅ | — |
| Avisar versiones/licencias (correo masivo) | ✅ (`d34cfed`) | — |
| **Avisar por WhatsApp** (masivo) | ◐ (canal existe vía n8n, sin botón en Empresas) | agregar acción WhatsApp |
| **"Abre WhatsApp una por una"** (wa.me por contacto) | ❌ | agregar enlace `wa.me` en el detalle |
| Detalle: contactos / tickets recientes / seguimiento comercial | ✅ | — |
| Exportar / Importar (Excel; el viejo era CSV) | ✅ (`376275a`) | — |
| Papelera | ✅ | — |

## 6. Contactos (`/app/contactos`)

| Viejo | ds-hd | Acción |
|---|---|---|
| Alta: nombre*/empresa/correo/celular/tel oficina/RFC | ◐ (falta **RFC**; ds-hd tiene "puesto") | agregar RFC |
| **🏢 Nueva Empresa inline** (crear empresa desde el form) | ❌ | agregar "crear y asociar" |
| Importar / Exportar | ✅ | — |
| Papelera | ✅ | — |

## 7. Cotizaciones (`/app/cotizaciones`)

| Viejo | ds-hd | Acción |
|---|---|---|
| Alta: empresa / conceptos / vigencia / notas | ✅ | — |
| **Datos generales: contacto, RFC, teléfono, "quien cotiza"** | ✅ | — |
| **Condiciones / términos por defecto** (config) | ✅ (`configuracion/cotizaciones`) | — |
| Concepto: cant / precio unit / descuento % | ✅ | — |
| Subtotal / IVA 16% / Total | ✅ | — |
| Calculadora Compac → enviar al cotizador | ✅ | — |
| Guardar borrador / generar PDF | ✅ (imprimir) | — |
| Enviar por correo | ✅ (`6d28234`) | — |
| Crear ticket desde cotización / Ver ticket | ✅ (`6d28234`) | — |
| Estados: borrador/enviada/aceptada/rechazada/vencida | ✅ | — |

## 8. Calculadora Compac (`/app/cotizaciones/calculadora`)

| Viejo | ds-hd | Acción |
|---|---|---|
| Tipo de equipo + cantidad | ✅ | — |
| **Servidores / terminales esperados** (opcional) | ◐ verificar | revisar |
| **⚙️ Editar precios** (por tipo de equipo + precio SQL) | ◐ (config en `configuracion/calculadora`) | verificar que se pueda editar desde la UI |
| Enviar al cotizador | ✅ | — |

## 9. Versiones CONTPAQi (`/app/versiones`)

| Viejo | ds-hd | Acción |
|---|---|---|
| Lista de versiones instaladas por empresa | ✅ | — |
| **📊 "Versiones del Mercado"** (grid sistema → versión oficial editable) | ✅ (`/app/versiones/mercado`, edición masiva) | — |
| 🔗 Link carta técnica por sistema | ✅ (`VersionSistema.linkCartaTecnica`) | — |
| Plantilla de notificación de licencias | ✅ (`/app/versiones/avisos`) | — |
| **📋 Reporte de versiones/licencias desactualizadas** (modal: exportar Excel / imprimir / enviar por correo) | ✅ (`/app/versiones/reporte` + `.xlsx` + `/imprimir` + enviar) | — |
| Avisos a empresas (masivo) | ✅ | — |
| Filtrar por empresa | ✅ (en el reporte, `?empresa=`) | — |

## 10. Dashboard (`/app`)

| Viejo | ds-hd | Acción |
|---|---|---|
| Tickets por mes (gráfica) | ✅ (`662534d`) | — |
| Licencias por vencer (banner) | ✅ | — |
| Avisos pendientes (stat) | ✅ | — |
| Tickets por estado / prioridad, cotizaciones por estado | ✅ | — |
| Próximos eventos / actividad reciente | ✅ | — |
| **📅 Calendario** (vista de calendario de agenda de tickets/eventos) | ❌ | agregar vista calendario |
| **➕ Nueva Tarea** (rápida, desde el dashboard) | ◐ (existe `/app/tareas`, sin acceso rápido) | agregar botón |
| 👁️ Revisar tickets públicos (acceso rápido) | ◐ (existe el buzón) | agregar al dashboard si hay pendientes |

## 11. Seguimiento comercial (interacciones + tareas)

| Viejo | ds-hd | Acción |
|---|---|---|
| Interacciones (llamada/correo/reunión/WhatsApp/nota) | ✅ | — |
| Tareas asignables con fecha límite | ✅ (`/app/tareas`) | — |
| Nueva tarea con empresa (autocompletar) | ◐ verificar | revisar |

## 12. Eventos / webinars (`/app/eventos`)

Parece **completo** (`865421a`/`128e5a7`/`d7c37c3` + antiabuso `d774d51`):
invitación dirigida a empresas, invitados externos, respuesta/contactado/invitado
por, lista negra, límite por IP, dominios desechables 🚩, recordatorio + mensaje
de seguimiento, plantilla de confirmación, link registro/evento, badge historial
cruzado. **Revisar**: "Ordenar" (por fecha) en la lista, ícono del evento.

## 13. Base de conocimiento / SOPORTE (`/app/kb`)

| Viejo | ds-hd | Acción |
|---|---|---|
| Lista + editor de documentos (markdown) | ✅ | — |
| **Vista dividida (lista / split / panel derecho)** | ➖ (diferido — la lista + el detalle a página completa cubren el flujo) | — |
| **Tipos de archivo** (bat / ps1 / sql / md) + "⚡ Scripts" | ✅ (categoría `script`, se adivina al subir; tab en la lista) | — |
| **Carpeta destino en Windows** (para scripts) | ✅ (`ArticuloKB.rutaDestino`, en el form y el ZIP) | — |
| Filtros: modificados hoy / esta semana / con cambios | ✅ (`?desde=hoy|semana`) | — |
| Ordenar A→Z / Z→A | ✅ (`?orden=az|za|recientes`) | — |
| **Subir archivos** (batch) | ✅ (`/app/kb/subir`, un artículo por archivo) | — |
| **Exportar** (todos / con cambios) a .md/.zip | ✅ (`/app/kb/export.json` + `/export.zip`, con `?categoria=`/`?desde=`) | — |
| Visibilidad staff / portal / público | ✅ *(mejora)* | — |

## 14. Configuración (`/app/configuracion/*`)

| Viejo | ds-hd | Acción |
|---|---|---|
| Catálogos de tickets (tipos/estados/prioridades/grupos/sistemas/SLA/facturables) | ✅ | — |
| Correos de notificación de tickets | ✅ (`c7d1d6d`, ahora en todos los correos) | — |
| n8n webhook + WhatsApp CallMeBot + matriz de reglas + probar | ✅ (`930a313`) | — |
| Backup descargar / restaurar | ✅ (`3819213`/`97f2daa`) | — |
| Import/Export Excel | ✅ (`376275a`) | — |
| Prueba de envío de correo | ✅ (`3142db1`) | — |
| **🏷️ Logo de empresa** (para correos / impresión / portal) | ❌ | agregar config de logo |
| **🔖 GitHub PAT** + "ver puntos en GitHub" | ➖ (era para el roadmap del viejo — no aplica) | descartar |
| **🔄 Sincronizar contactos** (con fuente externa) | ➖ (el viejo sincronizaba con una hoja; ds-hd es la fuente) | descartar |
| **🎨 Apariencia** (tema en config) | ◐ (ds-hd tiene toggle en la topbar) | ok, quizá duplicar en config |
| 👥 Usuarios (alta/edición) | ✅ (`/app/usuarios`) | — |
| Solicitudes de acceso pendientes | ✅ | — |
| **📊 "Enviar resumen ahora"** (resumen diario por correo) | ❌ | evaluar — agregar job + botón |
| Contactos de soporte (Licencias / Versiones) | ✅ (dentro de avisos) | — |
| Calculadora Compac — precios | ◐ | ver punto 8 |
| Cotizaciones — datos generales / condiciones por defecto | ✅ (`/app/configuracion/cotizaciones`) | — |

## 15. Bitácora (`/app/bitacora`)

**Completo** (`ad97a91`): filtros desde/hasta + usuario, export CSV con BOM,
limpiar manual, retención 60 días.

## 16. Papelera

**Completo** (`d9a92ea`): tickets / empresas / contactos, restaurar múltiple,
eliminar definitivo, vaciar.

## 17. Cuenta segura

➖ **No aplica**: el viejo permitía "ascender" una cuenta anónima a una con
contraseña. ds-hd nace con cuentas reales de Firebase Auth por invitación.

## 18. Shell / navegación global

| Viejo | ds-hd | Acción |
|---|---|---|
| Búsqueda global Ctrl/Cmd+K | ✅ (`d03cdaf`) | — |
| Crear ticket global (topbar) | ✅ | — |
| Badges de conteo en el sidebar | ✅ | — |
| Toggle de tema | ✅ | — |
| **Tablas ordenables / redimensionables / con scroll** | ✅ (este commit — genérico para todas) | — |
| Nav por secciones según permisos | ✅ *(mejora RBAC)* | — |

---

## Plan de implementación (por bloques, cada uno "todas las funciones, mejor acomodadas")

1. ✅ **HECHO** (`0bb69a6`) — **Tickets — editor y detalle**: encabezado/firma
   configurables + botones 📋/🖊️/🖼️, notas internas (alta y detalle), CC/CCO,
   estado inicial, agente, solicitado/canalizado, sistema "otro", adjuntar al
   crear, guardar-y-nuevo, imprimir, cotizar.
2. ✅ **HECHO** — **Contactos + Empresas**: RFC en contacto, crear empresa inline
   desde el alta de contacto, licencias/versiones por sistema también al crear
   (tabla JS desde el textarea), enlace WhatsApp (wa.me) por contacto en el
   detalle de empresa, campos extra libres (`Empresa.camposExtra`).
3. ✅ **HECHO** — **Cotizaciones**: datos generales — emisor (nombre/cargo/tel/
   correo, "quien cotiza", precargado del usuario) + receptor (RFC heredado de la
   empresa, contacto/correo/tel); campo `condiciones`/términos aparte de `notas`,
   precargado de `configuracion/cotizaciones` (`ConfiguracionCotizaciones`,
   editable en `/app/configuracion/cotizaciones`). Todo visible en el detalle, el
   PDF y el correo. Backup exporta/restaura la nueva sección de config.
4. ✅ **HECHO** — **Versiones**: `VersionSistema.linkCartaTecnica`; grid de
   edición masiva `/app/versiones/mercado` (una fila por sistema del catálogo,
   upsert por nombre); `ReporteVersionesService` → `/app/versiones/reporte`
   (empresas con sistemas desactualizados y/o licencias vencidas/por vencer),
   con `?empresa=` para acotar, export `.xlsx`, vista `/imprimir` y envío por
   correo a destinatarios libres. La carta técnica sale en el reporte y el aviso.
5. ✅ **HECHO** — **KB**: `ArticuloKB.rutaDestino` + categoría `script` (se
   adivina de la extensión al subir, `esScript` getter). Subida en lote
   `/app/kb/subir` (el navegador lee los archivos y los manda como JSON, un
   artículo por archivo). Export `/app/kb/export.json` y `/app/kb/export.zip`
   (fflate, un archivo por artículo en su `rutaDestino`), ambos con `?categoria=`
   y `?desde=hoy|semana`. Filtros de categoría / recientes / orden A→Z en la
   lista y en gestión. Migración: mapea `sourcePath` → `rutaDestino`. Vista
   dividida: diferida (no aporta sobre lista + detalle a página completa).
6. **Dashboard**: calendario, nueva tarea rápida.
7. **Configuración**: logo de empresa, resumen diario, precios de calculadora
   editables, apariencia.
8. **Repaso final**: revisar cada `◐` de esta tabla contra el viejo.
