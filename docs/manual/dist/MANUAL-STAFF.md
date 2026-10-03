# Manual de staff — ds-hd

> Generado automáticamente por `npm run docs:manuals` desde `docs/manual/_sources/`. No editar a mano.

## Contenido

1. [Iniciar sesión y solicitar acceso](#iniciar-sesion-y-solicitar-acceso)
2. [Panel principal (dashboard)](#panel-principal-dashboard)
3. [Tickets y agentes técnicos](#tickets-y-agentes-tecnicos)
4. [Empresas y contactos](#empresas-y-contactos)
5. [Cotizaciones y Calculadora Compac](#cotizaciones-y-calculadora-compac)
6. [Versiones de sistemas](#versiones-de-sistemas)
7. [Base de conocimiento](#base-de-conocimiento)
8. [Seguimiento comercial (tareas e interacciones)](#seguimiento-comercial-tareas-e-interacciones)
9. [Papelera de reciclaje](#papelera-de-reciclaje)
10. [Bitácora de auditoría](#bitacora-de-auditoria)
11. [Eventos y webinars (gestión)](#eventos-y-webinars-gestion)
12. [Usuarios, roles y permisos](#usuarios-roles-y-permisos)
13. [Mi perfil, firma y Acerca de](#mi-perfil-firma-y-acerca-de)
14. [Configuración](#configuracion)

---

## Iniciar sesión y solicitar acceso

Todo el sistema vive detrás de una sola pantalla de inicio de sesión en `/login`.

*(captura pendiente: login-y-acceso-login.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## Iniciar sesión

1. Entra a la URL de la app (por ejemplo `https://soporte.dattasoft.mx`); si no tienes
   sesión, te redirige a `/login`.
2. Escribe tu correo y contraseña y pulsa **Entrar**.
3. Según tu rol, caerás en el back-office (`/app`) si eres staff (admin, supervisor, agente
   o lectura), o en tu portal (`/portal`) si eres cliente.

Si tu cuenta está desactivada o la contraseña es incorrecta, verás un aviso en rojo arriba
del formulario y podrás intentarlo de nuevo.

## No tengo cuenta todavía

- **Staff nuevo**: pide a un administrador que te dé de alta desde
  *Usuarios → Nuevo usuario* (ver [Usuarios y permisos](usuarios-y-permisos.md)), o entra a
  `/solicitar-acceso` y llena el formulario; un administrador recibirá tu solicitud por
  correo y decidirá si te da de alta.
- **Cliente nuevo**: no te registras tú mismo. El equipo de soporte te invita desde el
  módulo de Usuarios (*Invitar cliente*); recibirás un correo con un enlace de un solo uso
  para fijar tu contraseña. El enlace vence a las 72 horas; si expira, pide que te reenvíen
  la invitación.

## Cerrar sesión

Usa el enlace **Salir** del menú superior en cualquier pantalla, o entra a `/logout`.

---

## Panel principal (dashboard)

Al entrar al back-office (`/app`) llegas al panel principal, con métricas acotadas a lo que
tu rol puede ver (un agente solo ve lo suyo; admin/supervisor/lectura ven el global).

*(captura pendiente: dashboard-panel.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## Qué muestra

- **Tickets**: abiertos, pendientes, resueltos en el periodo, y los que están por vencer o
  vencidos de SLA.
- **Cotizaciones**: cuántas están en borrador, enviadas y aprobadas.
- **Eventos**: próximos webinars y su cupo/inscritos.
- **Actividad reciente**: últimas entradas de la bitácora relevantes a tu rol.

Las barras y totales se recalculan en cada carga de la página; no hay botón de "actualizar"
porque no cachea nada.

## Para qué sirve

Es el punto de partida del día: de un vistazo ves si hay tickets urgentes sin atender o
vencidos, y saltas a *Tickets* o a tu panel de *Mis asignados* desde el menú lateral.

---

## Tickets y agentes técnicos

El módulo de tickets (`/app/tickets`) es el corazón del sistema de soporte.

*(captura pendiente: tickets-lista.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## Vistas disponibles

| Vista | Ruta | Para qué |
| --- | --- | --- |
| Lista | `/app/tickets` | filtrar/ordenar todos los tickets que puedes ver |
| Tablero (kanban) | `/app/tickets/tablero` | arrastrar un ticket entre columnas para cambiar su estado |
| Mis asignados | `/app/tickets/mis-asignados` | los tickets asignados a ti (agente) |
| Carga de agentes | `/app/tickets/carga-agentes` | cuántos tickets abiertos tiene cada agente frente a su capacidad máxima (requiere permiso de asignar) |
| Solicitudes de ticket | `/app/tickets/buzon` | solicitudes del formulario público o de un correo sin número de ticket, pendientes de convertir o descartar |

*(captura pendiente: tickets-tablero.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## Ciclo de vida de un ticket

Estados, en orden: **Abierto → En proceso → Pendiente → Resuelto → Cerrado**. El tiempo
trabajado solo corre mientras el ticket está en un estado que no sea "Pendiente"; el SLA se
pausa exactamente en ese mismo estado. Cambiar el estado se hace desde el detalle del
ticket o arrastrando su tarjeta en el tablero.

## Crear un ticket (interno)

*Tickets → Nuevo* (`/app/tickets/nuevo`). Requiere asunto, descripción, tipo y prioridad;
opcionalmente lo ligas a una empresa/contacto existentes. Al guardar, el sistema le asigna
un folio consecutivo y calcula su fecha de vencimiento de SLA según la prioridad.

## Solicitudes de ticket (formulario público y correo)

Cuando alguien externo crea un ticket desde `/ticket-publico` (sin cuenta), o manda un correo
que no trae número de ticket en el asunto, cae primero en *Solicitudes de ticket*
(`/app/tickets/buzon`) y **no** es un ticket real todavía. Arriba de la lista de tickets sale un
aviso con cuántas esperan. Desde ahí:

- **🎫 Convertir a ticket**: lo vuelve un ticket normal (folio, SLA, todo); las imágenes pasan a adjuntos.
- **🗑️ Descartar**: lo quita sin crear ticket.

## Conversación por correo

En el detalle del ticket, **💬 Conversación** muestra lo más reciente arriba: en verde lo que
llegó por correo y en azul lo que se mandó desde el CRM. La caja de respuesta manda el mensaje
por correo al cliente (con *Con copia* opcional y hasta 5 capturas, que también puedes pegar con
Ctrl+V). Todos los correos de un ticket llevan `[Ticket #N]` en el asunto: cuando el cliente o un
agente en copia contesta, su respuesta (con sus capturas) aparece sola en la conversación y queda
en la actividad del ticket y en la Bitácora. Se configura en *Configuración → Correo entrante*.

## Quién ve qué ticket

Administradores, supervisores y lectura ven todos. Un agente (o soporte) ve los suyos —por
**Agente** o por **Canalizado a**, aunque el nombre esté corto ("DIEGO") o completo— más los que
nadie tiene asignados todavía, para que no queden invisibles. El filtro *Agente* de la lista busca
igual, en los dos campos.

## Asignar y trabajar un ticket

Desde el detalle: **Asignar** elige un agente (respeta su `capacidadMax`, salvo que fuerces
la asignación); **Cambiar estado** avanza el ciclo de vida; **Agregar nota** deja constancia
del trabajo — marca la nota como **pública** (la ve el cliente en su portal) o **interna**
(solo staff). Al cerrar puedes marcarlo para **facturar**.

## Adjuntos

En el detalle del ticket se suben imágenes, PDF y XML (o se pega una imagen con Ctrl+V). El
botón 📍/📌 marca un adjunto como **permanente**: mientras lo esté no se puede quitar y el
mantenimiento de adjuntos de *Configuración → Backup* no lo toca.

## Panel de carga de agentes

Muestra, por agente, cuántos tickets abiertos tiene contra su capacidad máxima configurada
en su perfil (*Usuarios*) — útil para decidir a quién asignar el siguiente ticket sin
saturar a nadie.

---

## Empresas y contactos

Empresas (`/app/empresas`) y contactos (`/app/contactos`) son el directorio de clientes del
CRM; casi todo lo demás (tickets, cotizaciones, seguimiento) se liga a una empresa.

*(captura pendiente: empresas-contactos-empresas.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## Empresas

Una empresa guarda RFC, razón social, datos de contacto, los **sistemas contratados**
(p. ej. CONTPAQi Contabilidad, Nóminas) y sus **vigencias** de licencia por sistema.

- **Nueva empresa** (`/app/empresas/nueva`): el nombre debe ser único.
- **Ver / Editar**: desde el detalle también ves sus contactos, tickets e interacciones
  comerciales ligadas.
- **Archivar**: no borra la empresa; la manda a la [Papelera](papelera.md), de donde se
  puede restaurar.

## Contactos

*(captura pendiente: empresas-contactos-contactos.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

Cada contacto pertenece a una empresa (`empresaId` obligatorio). Un contacto marcado como
**de portal** (`esPortal`) es el que tiene o puede tener una cuenta de cliente vinculada —
eso se configura al invitarlo desde [Usuarios y permisos](usuarios-y-permisos.md), no desde
aquí directamente.

- **Nuevo contacto** (`/app/contactos/nuevo`): elige la empresa a la que pertenece.
- **Archivar**: igual que empresas, va a la papelera y es reversible.

## 🔖 Filtros guardados

En Empresas, arma la búsqueda que usas seguido (texto, sistema, filtros de pendientes…),
escríbele un nombre en «Guardar esta búsqueda como…» y da **Guardar filtro**. Queda como una
etiqueta arriba de la tabla: un clic la vuelve a aplicar y la ✕ la borra. Cada usuario tiene
los suyos.

---

## Cotizaciones y Calculadora Compac

`/app/cotizaciones` administra cotizaciones formales para una empresa, con folio
consecutivo `COT-{año}-{n}`.

*(captura pendiente: cotizaciones-lista.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## Crear una cotización

*Cotizaciones → Nueva* (`/app/cotizaciones/nueva`): elige empresa y contacto, agrega
conceptos (uno o varios, cada uno con cantidad y precio) y el sistema calcula subtotal e
IVA. Cada cotización tiene una vigencia y un estado (borrador → enviada → aprobada/rechazada).

## Calculadora Compac

*(captura pendiente: cotizaciones-calculadora.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

`/app/cotizaciones/calculadora` arma el licenciamiento CONTPAQi por **grupos de equipos
iguales**: tipo de equipo (Servidor, Terminal…), cantidad, los sistemas que llevan y, en
Servidor, si incluyen SQL. Cada equipo cobra el precio del *1er sistema* de su tipo más el
*adicional* por cada sistema extra; SQL va en un renglón aparte. El desglose se calcula en
vivo, con el conteo de servidores/terminales y un aviso si no coincide con lo que esperabas.

Al terminar, **Enviar a una cotización nueva** abre el formulario con los renglones ya
capturados (se pueden editar antes de guardar). Los precios se cambian en
*Configuración → Calculadora* (botón ⚙️ Editar precios).

## Editar y cambiar estado

Desde el detalle de una cotización puedes editarla mientras siga en borrador, y cambiar su
estado a medida que avanza con el cliente (enviada, aprobada, rechazada). Aprobar una
cotización queda registrado en la [Bitácora](bitacora.md).

---

## Versiones de sistemas

`/app/versiones` lleva el catálogo de versiones disponibles de cada sistema CONTPAQi
(Contabilidad, Nóminas, Bancos, etc.): versión actual, fecha de liberación, notas de la
versión y el link de descarga.

*(captura pendiente: versiones-sistemas-lista.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## Para qué sirve

Es la referencia que usa soporte para confirmar si un cliente está desactualizado (comparando
contra `sistemasContratados` de su empresa) y para dirigirlo al instalador correcto. Se edita
desde *Versiones → Nueva* o abriendo un sistema existente; **Eliminar** quita la entrada del
catálogo (no afecta empresas que ya tengan ese sistema contratado).

## Historial de avisos enviados

*Versiones → Historial de avisos* lleva el registro de todos los avisos de versiones y
licencias que se han mandado, **una fila por empresa y por sistema** — no una por envío. Cada
fila dice de qué versión a cuál se avisó (o la fecha de vencimiento, si fue de licencia), por
qué canal salió (correo o WhatsApp), a qué correo o teléfono, cuándo y quién lo mandó.

Se llena solo: cada vez que alguien manda avisos desde *Empresas*, quedan ahí registrados.

Sirve para responder cosas que la ficha de la empresa no puede, porque ahí solo se guarda la
fecha del último aviso: *"¿ya le avisamos a esta empresa de Nóminas, o solo de Contabilidad?"*,
*"¿de qué versión venía cuando le escribimos?"*, *"¿quién del equipo la contactó?"*.

Se filtra por empresa y por rango de fechas, y se exporta a Excel con las mismas columnas.

### Qué cuenta como "ya avisado"

El historial también decide qué sigue pendiente en *Empresas*. Un sistema cuenta como avisado
si ya se le mandó aviso a esa empresa **con la misma versión oficial**; si sale una versión
nueva, vuelve a aparecer como pendiente. Una licencia cuenta como avisada si fue **con la misma
fecha de vencimiento**; si se renueva y vuelve a vencer, vuelve a aparecer.

En *Empresas*, los contadores **🔔 sistemas desactualizados sin avisar** y **⏰ licencias por
vencer sin avisar** (y las opciones del mismo nombre en el filtro *Pendientes*) muestran solo
las empresas que tienen algo aún sin avisar. La opción *Con pendientes (licencia o versión)*
muestra todas, avisadas o no. Al elegir qué avisar, lo ya avisado aparece **desmarcado** y con
la fecha del aviso; se puede volver a marcar si hace falta reenviarlo.

## Reporte de desactualizadas

*Versiones → Reporte de desactualizadas* lista las empresas con sistemas por actualizar o
licencias vencidas/por vencer, con su contacto. Se puede filtrar por empresa, imprimir,
exportar a Excel y **enviar por correo**: al enviarlo puedes marcar con casillas a la gente
del equipo, o escribir otros correos a mano.

---

## Base de conocimiento

Documentos de soporte del equipo (soluciones, datos de empresas, scripts), escritos en
Markdown. Es solo del equipo: los clientes del portal y el público ya no la ven.

*(captura pendiente: base-conocimiento-staff.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## Quién ve cada documento

Cada documento tiene una **visibilidad**:

| Visibilidad | La ven |
| --- | --- |
| **Soporte** | los usuarios con el rol *Administrador* o *Soporte técnico* marcado |
| **Administrador** | solo los usuarios con el rol *Administrador* |

Los demás roles (Supervisor, Comercial, Agente técnico mixto, Solo lectura) no ven los
documentos. Si alguien de esos roles necesita verlos, márcale también *Soporte técnico* en
*Usuarios*.

## Buscar

En `/app/kb`, el buscador encuentra por título o contenido. Con **frase exacta** exige la
frase completa; sin ella basta con que aparezca cada palabra. Tus búsquedas recientes quedan
abajo del buscador y se pueden borrar. También filtras por categoría, etiqueta, fecha de
modificación y orden (A→Z, Z→A, más recientes).

## Escribir y subir documentos

- *Nuevo artículo*: título, contenido en Markdown, categoría, etiquetas y visibilidad.
- *Subir archivos*: varios archivos sueltos o **una carpeta completa**. Eliges la categoría
  (los `.ps1`, `.bat`, `.cmd` y `.sql` siempre quedan como Script) y, si marcas
  **actualizar**, un archivo con la misma ruta reemplaza al que ya existe en vez de
  duplicarse. Las carpetas grandes se suben en tandas con barra de avance; los archivos que
  no son de texto (imágenes, ejecutables) se omiten.
- 🗑️ elimina un documento (desde la lista o al editarlo).

## Exportar

**Exportar ZIP** baja los documentos con sus rutas originales (descomprímelo sobre la carpeta
raíz de tus scripts y cada archivo cae en su lugar). Respeta los filtros de la lista: categoría
y «Modificados» — hoy, últimos 7 días o **desde mi última exportación** (la fecha se recuerda
en ese navegador al exportar). **Exportar JSON** baja lo mismo como datos.

---

## Seguimiento comercial (tareas e interacciones)

`/app/tareas` lleva el seguimiento comercial: **tareas** asignables (llamar al cliente,
enviar propuesta, dar seguimiento a una cotización) e **interacciones** (bitácora de
contacto con una empresa: llamada, correo, visita).

*(captura pendiente: seguimiento-comercial-tareas.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## Tareas

Cada tarea tiene un responsable, una fecha límite y una empresa (opcional). Se crean desde
*Tareas → Nueva* o desde el detalle de una empresa. **Marcar** una tarea la da por
completada; sigue visible en el historial pero deja de contar como pendiente.

## Interacciones

Se registran desde el detalle de una empresa (*Registrar interacción*): tipo de contacto,
fecha y una nota libre. Sirven como bitácora comercial — quién habló con quién y cuándo —
independiente de los tickets de soporte.

---

## Papelera de reciclaje

`/app/papelera` reúne las empresas y contactos que alguien archivó desde su pantalla de
detalle (botón **Archivar**), en vez de borrarlos.

*(captura pendiente: papelera-lista.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## Restaurar

Cada elemento archivado tiene un botón **Restaurar** que lo regresa a su listado normal
(*Empresas* o *Contactos*) tal cual estaba, sin perder su historial ni sus relaciones (una
empresa restaurada conserva sus contactos, tickets y cotizaciones).

No hay borrado permanente desde la UI — es una papelera, no una eliminación irreversible.

---

## Bitácora de auditoría

`/app/bitacora` es el registro de auditoría transversal del sistema: cada acción relevante
(crear/editar/archivar una empresa, aprobar una cotización, cambiar el estado de un ticket,
etc.) queda anotada aquí de forma automática — no se edita a mano.

*(captura pendiente: bitacora-lista.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## Qué muestra cada entrada

Se registra, entre otros: los inicios de sesión; toda la actividad de los tickets (creación,
cambios de estado, notas, adjuntos, correos, facturación y papelera); el alta y los cambios de
usuarios y contraseñas; cada guardado de Configuración; backups descargados o restaurados;
exportaciones e importaciones de Excel; y la limpieza de adjuntos.



Fecha, quién hizo la acción, en qué módulo, sobre qué entidad y un resumen en texto plano.
Es de solo lectura: sirve para reconstruir "quién tocó qué y cuándo" ante una duda o un
reclamo, y para todos los roles con acceso es visible sin importar si tienen permiso de
edición en el módulo original.

---

## Eventos y webinars (gestión)

`/app/eventos` administra los webinars/eventos que se publican en `/eventos` para registro
público (ver [Eventos — registro público](eventos-publico.md) para el lado del visitante).

*(captura pendiente: eventos-staff-lista.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## Crear y publicar un evento

*Eventos → Nuevo*: título, descripción, fecha/hora, cupo y el link del webinar. Mientras el
evento existe, cualquiera puede registrarse en `/eventos/<id>` (protegido con Turnstile
anti-bot) hasta llenar el cupo.

## Gestionar inscritos

Desde el detalle de un evento ves la lista de inscritos. Los datos los captura el propio
interesado en el formulario público, así que la tabla es **editable**: corrige nombre,
empresa, correo y teléfono en la misma fila y dale **Guardar**. Si cambias el correo, el
semáforo de entrega se reinicia (el del correo anterior ya no dice nada del nuevo) y no se
permite dejar dos inscritos del mismo evento con el mismo correo.

Cada fila trae además:

| Columna | Qué significa |
| --- | --- |
| 📧 | Semáforo de entrega del correo: 🟢 entregado · 🟡 aún sin confirmar (Brevo tarda unos minutos) · 🔴 rebotó, probablemente un correo falso |
| 🚩 | Dominio de correo temporal/desechable conocido — probablemente no es un prospecto real |
| 🚫 | Marcado como problemático. Pasa el mouse encima para ver el motivo y quién lo marcó; si está apagado, haz clic para marcar a esa persona |
| 🔁 Antes | Ya asistió **de verdad** a otro evento. Útil para no reinvitar a quien ya fue si un webinar se repite |
| ✅ Asistió | Asistencia real confirmada, distinta de lo que declaró al registrarse. Es la que alimenta el 🔁 de los eventos siguientes |
| 💬 (Contactado) | Ya se le mandó el mensaje por WhatsApp. Se marca solo al usar el botón 💬 |

Y estas acciones:

- **💬 WhatsApp** — abre WhatsApp con la plantilla del evento ya resuelta para esa persona, y
  la marca como contactada.
- **💬 WhatsApp a pendientes** — hace lo mismo en tanda, para todos los que tengan teléfono y
  no estén marcados como contactados. Se abre una pestaña por persona, espaciadas para que el
  navegador no las bloquee: **todavía hay que darle Enviar en cada una**.
- **✉️** — reenvía el correo de confirmación a un inscrito puntual.
- **🚫** — manda a la lista negra. Pide un motivo (opcional) y guarda también su teléfono y
  quién lo marcó, para que quede señalado si se vuelve a registrar en cualquier evento futuro.
- **🗑️** — elimina ese registro. No se puede deshacer.
- **📥 Exportar Excel** — baja la lista completa con todas las columnas de arriba.
- **Estado** — marca la inscripción (registrado / confirmado / asistió / no asistió).

La **lista negra** es global a todos los eventos: quien esté ahí, por correo o por teléfono,
no puede volver a registrarse en ninguno. Se puede agregar a mano o quitar si fue un error.

## Compartir el link de registro

En el detalle del evento, **🔗 Link Registro** copia al portapapeles la URL pública para
pegarla en redes, WhatsApp o un correo. *Ver página pública* abre esa misma página en otra
pestaña para revisarla antes de compartirla.

El registro público pide nombre y **al menos un dato de contacto: correo o teléfono**. Quien
se registre solo con teléfono no recibe confirmación ni recordatorio por correo — aparece en
Inscritos con el 💬 para contactarlo por WhatsApp. El duplicado se detecta por correo **o**
por teléfono. El formulario exige la verificación anti-bots de Cloudflare: sin ella no se
guarda ningún registro.

## Recordatorios automáticos

Un job programado (`/jobs/recordatorios-eventos`, protegido por `JOBS_SECRET`) envía
recordatorios a los inscritos antes del evento; no requiere acción manual del staff salvo
reenviar un correo puntual que se haya perdido.

---

## Usuarios, roles y permisos

`/app/usuarios` administra las cuentas de staff y las invitaciones a clientes. Solo quien
tiene el permiso `usuarios:gestionar` (admin, y supervisor salvo por defecto sobre
`roles:gestionar`) ve este módulo.

*(captura pendiente: usuarios-y-permisos-lista.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## Roles disponibles

| Rol | Alcance |
| --- | --- |
| `admin` | todo el sistema, sin restricciones |
| `supervisor` | todo el back-office salvo integraciones de configuración y gestión de roles |
| `agente` | tickets (según configuración: todos o solo su grupo), KB de escritura, lectura de empresas/contactos/cotizaciones/versiones |
| `lectura` | auditor: solo lectura en todo el back-office, sin poder editar nada |
| `cliente` | solo su portal (`/portal`), acotado a sus propios tickets y a su empresa |

## Crear un usuario de staff

*Usuarios → Nuevo usuario* (`/app/usuarios/nuevo`): correo, nombre y rol. Si el rol es
`agente`, además defines su **grupo** (p. ej. Soporte, Sistemas) y su **capacidad máxima**
de tickets abiertos simultáneos (0 = sin límite) — eso es lo que usa el panel de carga de
agentes en [Tickets](tickets.md).

## Invitar a un cliente al portal

*Usuarios → Invitar cliente* (`/app/usuarios/invitar-cliente`): correo, nombre y la empresa
a la que pertenece. El sistema envía un correo con un enlace de invitación de un solo uso
(vence a las 72 h); cuando el cliente lo abre y fija su contraseña, su cuenta de portal
queda activa y vinculada a esa empresa.

## Permisos por usuario

Además del rol, cada usuario puede tener **permisos extra** (por encima de su rol) o
**permisos revocados** (por debajo) desde su pantalla de edición — así puedes darle a un
agente en particular, por ejemplo, acceso a Cotizaciones sin subirlo a supervisor. El motor
de permisos combina rol base + extras − revocados; el cambio tarda hasta un minuto en
reflejarse (la sesión cachea el perfil brevemente) y no requiere que el usuario vuelva a
iniciar sesión.

## Secciones visibles

En la ficha de un usuario que no es administrador aparece **👁️ Secciones visibles**, con una
casilla por sección que su rol le permite (Empresas, Contactos, Cotizaciones y embudo, Tickets,
Eventos, Versiones, Base de conocimiento, Tareas, Configuración). Desmarcar una la quita de su
menú y le impide entrar; todas marcadas = sin restricción. Por dentro revoca el permiso de
lectura de esa sección, así que también se ve en *Permisos avanzados*.

## Desactivar una cuenta

Editar el usuario y desmarcar **Activo**. No borra su historial (tickets asignados, notas,
bitácora); solo le impide iniciar sesión de nuevo.

---

## Mi perfil, firma y Acerca de

`/app/mi-perfil` (clic en tu nombre, arriba a la derecha) reúne lo que cada quien configura
para sí mismo. Nadie más lo ve ni lo cambia.

## ✍️ Firma y encabezado

- **Firma**: se agrega al final de tus respuestas públicas en tickets y se inserta con el
  botón 🖊️ Firma al redactar.
- **Encabezado**: plantilla que se inserta con el botón 📋 Encabezado al redactar un ticket.
  Escribe `[fecha]` y se cambia por la fecha de hoy.

## 📞 Mis contactos para avisos

Uno por línea (`Nombre, teléfono`). Salen como contacto (`[contacto_soporte]`) en los avisos de
versiones y licencias que **tú** mandas por correo o WhatsApp. Si lo dejas vacío se usa la
lista general de Configuración.

## Valores predeterminados de tickets

Tipo, prioridad, sistema, grupo y facturación con los que arranca tu formulario de ticket
nuevo, y si los tickets que creas se te asignan a ti.

## 📱 WhatsApp en esta computadora

Si los botones 💬 abren **WhatsApp Web** o la **app instalada**. Se guarda en ese navegador:
en otra computadora eliges de nuevo.

En la misma tarjeta, **✉️ Correo en esta computadora**: con *Zoho Mail (web)* (lo de siempre)
los botones ✉️ abren la redacción de Zoho y copian el correo del destinatario para pegarlo en
«Para:»; con *Programa de correo* abren Outlook u otro programa instalado.

## 🔔 Avisos del navegador

Con **Activar avisos**, el navegador te avisa cuando llega un ticket nuevo del portal público
(se revisa al navegar por el CRM). La pestaña del navegador muestra además «(N sin leer)»
cuando hay tickets de correo abiertos.

## 🔐 Seguridad

- **Verificación en dos pasos**: actívala con una app de autenticación (Google
  Authenticator, Microsoft Authenticator…); al entrar te pedirá el código de 6 dígitos.
- **Cambiar mi contraseña**: con tu contraseña actual; mínimo 6 caracteres.

## ℹ️ Acerca de

`/app/acerca-de` (menú lateral, abajo) muestra la versión del sistema, la fecha de la última
actualización y las notas de cambios. Quien tiene permiso de Configuración puede editar la
versión, la fecha y las notas.

---

## Configuración

`/app/configuracion` reúne los catálogos y parámetros del sistema, repartidos en subpáginas
con botones arriba para saltar entre ellas.

*(captura pendiente: configuracion-tickets.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## 🎫 Tickets

- **Catálogos**: tipos, sistemas, grupos, estados (y cuál es el inicial) y prioridades.
- **SLA**: horas máximas por prioridad; lo que las pase se marca en rojo.
- **Facturación y avisos**: tipos facturables, correos del equipo que reciben las
  notificaciones de tickets y en qué estados se le avisa al cliente del avance.
- **Respuestas rápidas** y **valores predeterminados** del formulario de ticket nuevo.

## 💰 Cotizaciones y 🧮 Calculadora

- **Cotizaciones**: condiciones por defecto, cargo/teléfono del emisor y el catálogo de
  conceptos rápidos que aparecen como sugerencia al capturar una cotización.
- **Calculadora Compac**: el catálogo de sistemas que se pueden marcar (agregar, quitar,
  reordenar), los **tipos de equipo** con su precio del *1er sistema* y del *adicional*, y el
  **precio de SQL**, que solo aplica a Servidor. Ver [Cotizaciones](cotizaciones.md).

## 🔌 Integraciones

Webhooks de n8n, WhatsApp del equipo (CallMeBot), WhatsApp a clientes y prueba de correo. La
**matriz de reglas** dice, evento por evento, si se manda al webhook, por WhatsApp y **a
quién del equipo** (sin nadie marcado le llega a todos). Eventos disponibles: ticket creado
por el equipo, ticket creado por el cliente, cambio de estado, nota interna, asignado,
resuelto, cerrado, facturado, cerrado y facturado, recordatorio de ticket programado,
cotización creada, empresa nueva, usuario nuevo y backup no realizado.

## 💾 Backup

- **Descargar backup completo (JSON)**; también desde el botón 🛡️ Respaldar de la barra
  superior. La página muestra la fecha del último backup y quién lo hizo.
- Si pasan **7 días o más** sin backup (o nunca se ha hecho), aparece un aviso aquí y en el
  Dashboard, y el cron manda el evento *backup no realizado* una vez al día.
- **🧹 Mantenimiento de adjuntos**: busca los adjuntos de tickets *Cerrados* hace más de N
  días que no estén marcados 📌 permanentes; los descargas en un ZIP (nombrados
  `ticket_empresa_fecha_nombre`) y, ya guardado, los eliminas de Firestore para liberar la
  cuota. Va por tandas de hasta 25 archivos. Nunca toca las imágenes pegadas en la descripción.
- Restaurar un backup de ds-hd, importar el respaldo del CRM viejo y crear puntos de
  restauración en GitHub.

## Otras

- **🎨 Apariencia**: logo de la empresa y tema.
- **📰 Resumen diario**: correo automático con lo pendiente, a la hora indicada.
- **📥 Correo entrante**: buzón de Zoho del que se leen las respuestas de clientes.
- **📊 Excel unificado**: exportar/importar empresas, contactos y tickets.

La preferencia de **WhatsApp Web o app instalada** para los botones 💬 es de cada quien y se
elige en *Mi perfil* (se guarda en ese navegador).
