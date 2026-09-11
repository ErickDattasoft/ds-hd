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
| **CC / CCO al crear** | ✅ (`form.njk`, campos `cc`/`cco`) | — |
| Asunto* | ✅ | — |
| Tipo | ✅ | — |
| Sistema | ✅ (opción "Otro…" con `sistemaOtro`) | — |
| **Estado inicial** (elegir) | ✅ (`<select name="estado">`, precargado con `config.estadoInicial`) | — |
| Facturación | ✅ (`estadoFacturacion`) | — |
| Prioridad | ✅ | — |
| Grupo | ✅ | — |
| **Agente** (elegir cualquiera al crear) | ✅ (`<select name="agenteUid">` con todos los agentes) | — |
| **Solicitado por** | ✅ | — |
| **Canalizado a** | ✅ | — |
| Descripción* | ✅ | — |
| **Barra del editor: 📋 Encabezado / 🖊️ Firma / 🖼️ Imagen** | ✅ (`tk.editorToolbar`) | — |
| **Notas internas al crear** | ✅ (gateado por `puedeNotasInternas`) | — |
| **Adjuntar archivos al crear** | ✅ (`data-adjuntos-modo="crear"`) | — |
| Fecha / hora programada + recordatorio | ✅ | — |
| **"Guardar y crear nuevo"** | ✅ (`data-guardar-y-nuevo` / "Guardar y crear otro") | — |

## 2. Tickets — detalle (`/app/tickets/:id`)

| Viejo | ds-hd | Acción |
|---|---|---|
| Badges prioridad / estado / tipo | ✅ | — |
| Empresa / Contacto / Grupo / Agente / Sistema | ✅ | — |
| **Solicitado por** (editable) | ✅ (form "Gestión") | — |
| **Canalizado a** (editable) | ✅ (form "Gestión") | — |
| Descripción | ✅ | — |
| **🔒 Notas internas** (caja persistente editable) | ✅ (`ticket.notasInternas`, form "Gestión") | — |
| 📎 Adjuntos | ✅ (`096ec82`) | — |
| Tiempo trabajado + línea de tiempo | ✅ | — |
| Actividad del ticket | ✅ (`9414719`, visible) | — |
| Cambiar estado | ✅ | — |
| Cambiar facturación | ✅ | — |
| Asignar agente | ✅ | — |
| Programar atención | ✅ | — |
| Conversación pública (hilo con el cliente) | ✅ *(mejora sobre el viejo)* | — |
| **🖨️ Imprimir** (con/sin logo) | ✅ (`/imprimir?auto=1`, con el logo real si hay uno configurado) | — |
| **🧾 Cotizar** (crear cotización desde el ticket) | ✅ (botón 🧾 Cotizar, precarga concepto) | — |
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
| **Encabezado** (con `[fecha]`, default Síntoma/Problema/Solución) | ✅ (`Usuario.encabezado`) | — |

## 5. Empresas (`/app/empresas`)

| Viejo | ds-hd | Acción |
|---|---|---|
| Alta: nombre*/tel/correo/RFC/razón social/dirección/notas | ✅ | — |
| **Vigencia + versión por sistema** (en el alta) | ✅ (mismo `form.njk` para alta/edición, tabla JS desde el textarea) | — |
| **⚙️ Campos Extra** (campos personalizados por empresa) | ✅ (`Empresa.camposExtra`) | — |
| Favoritos ⭐ + filtro | ✅ (`378a26a`) | — |
| Filtros guardados 🔖 | ✅ (`b38224f`) | — |
| Filtro licencias por vencer / sistemas desactualizados | ✅ | — |
| Avisar versiones/licencias (correo masivo) | ✅ (`d34cfed`) | — |
| **Avisar por WhatsApp** (masivo) | ✅ (botones "Avisar versiones/licencias (WhatsApp)" en la lista; manda `empresa.avisar_whatsapp` al webhook `n8nWebhookEmpresas` configurable en Integraciones — CallMeBot no sirve para esto, solo manda al propio número dado de alta) | — |
| **"Abre WhatsApp una por una"** (wa.me por contacto) | ✅ (botón 💬 WhatsApp en el detalle) | — |
| Detalle: contactos / tickets recientes / seguimiento comercial | ✅ | — |
| Exportar / Importar (Excel; el viejo era CSV) | ✅ (`376275a`) | — |
| Papelera | ✅ | — |

## 6. Contactos (`/app/contactos`)

| Viejo | ds-hd | Acción |
|---|---|---|
| Alta: nombre*/empresa/correo/celular/tel oficina/RFC | ✅ (tiene RFC y "puesto") | — |
| **🏢 Nueva Empresa inline** (crear empresa desde el form) | ✅ (`empresaNueva`) | — |
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
| **Servidores / terminales esperados** (opcional) | ➖ (descartado — no se recuerda qué hacía, no se documentó en la auditoría de módulos original) | — |
| **⚙️ Editar precios** (por tipo de equipo + precio SQL) | ✅ (`/app/configuracion/calculadora`) | — |
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
| **📅 Calendario** (vista de calendario de agenda de tickets/eventos) | ✅ (`8795344`, `/app/calendario`) | — |
| **➕ Nueva Tarea** (rápida, desde el dashboard) | ✅ (`8795344`) | — |
| 👁️ Revisar tickets públicos (acceso rápido) | ✅ (`8795344`, aviso cuando hay pendientes) | — |

## 11. Seguimiento comercial (interacciones + tareas)

| Viejo | ds-hd | Acción |
|---|---|---|
| Interacciones (llamada/correo/reunión/WhatsApp/nota) | ✅ | — |
| Tareas asignables con fecha límite | ✅ (`/app/tareas`) | — |
| Nueva tarea con empresa (autocompletar) | ✅ (`<select>`, mismo patrón que el resto de la app; el backend ya la soportaba, faltaba solo en el form de `/app/tareas`) | — |

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
| **🏷️ Logo de empresa** (para correos / impresión / portal) | ✅ (`/app/configuracion/apariencia`, base64 en Firestore) | — |
| **🔖 GitHub PAT** + "ver puntos en GitHub" | ➖ (era para el roadmap del viejo — no aplica) | descartar |
| **🔄 Sincronizar contactos** (con fuente externa) | ➖ (el viejo sincronizaba con una hoja; ds-hd es la fuente) | descartar |
| **🎨 Apariencia** (tema en config) | ➖ (el toggle de la topbar ya cubre esto; `/app/configuracion/apariencia` lo explica, sin duplicar dato) | — |
| 👥 Usuarios (alta/edición) | ✅ (`/app/usuarios`) | — |
| Solicitudes de acceso pendientes | ✅ | — |
| **📊 "Enviar resumen ahora"** (resumen diario por correo) | ✅ (`/app/configuracion/resumen`, botón manual + job de cron una vez al día) | — |
| Contactos de soporte (Licencias / Versiones) | ✅ (dentro de avisos) | — |
| Calculadora Compac — precios | ✅ (`/app/configuracion/calculadora`) | — |
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
6. ✅ **HECHO** (`8795344`) — **Dashboard**: vista `/app/calendario` (tickets
   programados, eventos y tareas del mes, acotada al alcance del actor), aviso
   de buzón público pendiente y tarea rápida sin salir del dashboard.
7. ✅ **HECHO** — **Configuración**: logo de empresa (`/app/configuracion/apariencia`,
   base64 en Firestore — mismo patrón que los adjuntos de tickets, sin depender de
   Firebase Storage; se sirve en `GET /logo`, sin sesión, para correos/impresión/portal);
   resumen diario por correo (`/app/configuracion/resumen`, reusa las métricas del
   dashboard vía `ResumenDiarioService`, botón "Enviar ahora" + job `/jobs/resumen-diario`
   que corre cada hora pero solo envía una vez al día a la hora configurada,
   `America/Mexico_City`); precios de la calculadora Compac editables
   (`/app/configuracion/calculadora`, por sistema + complemento SQL + IVA/moneda).
   Apariencia (tema): se dejó como está — el toggle de la topbar ya cubre esto, la
   página solo lo explica, sin duplicar el dato en Firestore.
8. ✅ **HECHO** — **Repaso final**. La tabla estaba desactualizada desde los bloques 1-2
   (la narrativa decía "HECHO" pero las filas seguían en ❌/◐): confirmado en código y
   corregida la tabla para tickets (CC/CCO, sistema "otro", estado inicial, agente,
   solicitado/canalizado, notas internas como caja fija, editor toolbar, adjuntar al
   crear, guardar-y-nuevo, imprimir, cotizar), empresas (vigencia/versión al crear,
   campos extra, wa.me por contacto), contactos (RFC, empresa nueva inline) y Mi perfil
   (encabezado) — todo eso YA estaba implementado, solo faltaba marcarlo. De los `◐`
   reales que quedaban, se resolvieron los tres: **"Nueva tarea con empresa"** (el
   backend ya lo soportaba, se agregó el `<select>` en `/app/tareas` + columna Empresa
   en la lista); **"Avisar por WhatsApp" masivo** (CallMeBot no alcanza — nuevo webhook
   `n8nWebhookEmpresas` configurable en Integraciones, botones en Empresas que mandan
   `empresa.avisar_whatsapp` con teléfono+mensaje, a enrutar del lado de n8n a un
   proveedor real); **"Servidores/terminales esperados"** de la calculadora, descartado
   (➖, nadie recordaba qué hacía). De paso se cerró un hueco que dejó el bloque 7: el
   logo (guardado/servido desde entonces) no estaba conectado a ningún correo/impresión/
   portal — ahora un decorador `LogoEmailSender` lo agrega solo a **todo** correo
   saliente, y se agregó a los 3 PDFs imprimibles (tickets/cotizaciones/reporte de
   versiones) y al sidebar del portal.
   Pendiente de otra sesión (no se tocó, bajo impacto): eventos → "Ordenar por fecha"
   e ícono del evento (sección 12, sin decisión tomada).
