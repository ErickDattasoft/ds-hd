---
titulo: Eventos, invitaciones y comunicados (gestión)
audiencia: [staff]
rol_minimo: lectura (gestionar: supervisor)
orden: 110
---

**Eventos** (`/app/eventos`) sirve para invitar a clientes y prospectos a webinars y eventos
presenciales, mandar felicitaciones y compartir comunicados de CONTPAQi. Todo se manda desde
el CRM por WhatsApp o por correo, y ves quién lo abrió y quién confirmó. El lado del
visitante está en [Eventos — registro público](eventos-publico.md).

## La página principal

- **Arriba, «➕ ¿Qué quieres hacer?»**: una tarjeta por tipo. Al darle clic se abre el
  formulario de nuevo evento con ese tipo ya elegido.

| Tipo | Para qué |
| --- | --- |
| 💻 Webinar | En línea, con la liga para entrar. Pide confirmar asistencia. |
| 📍 Presencial | En un lugar, con mapa, programa y vestimenta. Pide confirmar y cuántos van. |
| 🎉 Felicitación | Una tarjeta para leer (cumpleaños, Navidad…). No pide confirmar. |
| 📢 Comunicado | Pegas el link que pasa CONTPAQi y lo mandas. No pide confirmar. |

- **Abajo, un recuadro por tipo** (Webinars, Eventos presenciales, Felicitaciones,
  Comunicados) con sus eventos, la fecha y el estado. Clic en el título para abrirlo.
- **🧪 Crear eventos de ejemplo**: crea uno de cada estilo y te manda las invitaciones a tu
  correo, para probar. No salen en la lista pública y se borran con **🗑 Borrar ejemplos**.

## Crear un evento

El formulario va en pasos:

1. **¿Qué vas a hacer?** — el tipo (las mismas tarjetas de arriba).
2. **Lo básico** — nombre, fecha y hora, 🎟 personas por invitación (cuántos puede llevar cada
   invitado), mensaje para el invitado y, según el tipo, la liga del webinar o el lugar.
   En un **comunicado** solo se pide el nombre y el **🔗 link del comunicado**: pega el que
   pasó CONTPAQi (si lo pegas sin `https://`, se agrega solo). No lleva fecha.
3. **¿Cómo se ve?** — el estilo: Corporativo, Elegante, Fiesta, Cumpleaños o Navidad (colores,
   letra y adorno de la invitación y del correo).

**➕ Más detalles** (programa, vestimenta, mapa, a quién contactar) y **⚙️ Opciones
avanzadas** (cupo, recordatorio, correo de confirmación, seguimiento) son opcionales.

**¿Cómo está?** — *En preparación* (borrador: puedes probar todo, solo no sale en la lista
pública), *Publicado*, *Ya pasó* o *Cancelado*.

## La página del evento

### ① Revisa la invitación

- **👁 Ver cómo se ve**: la invitación con un nombre de ejemplo («Juan Pérez»).
- **✉️ Mandarme una prueba**: te llega el correo con asunto «[Prueba]». No te agrega a la lista.
- **🖼 Poner imagen**: el flayer (PNG, JPG o WebP, máx. 700 KB). Sale en la invitación, en el
  correo y en la vista previa al compartir el link.
- En un **comunicado** este paso muestra el link con **🔗 Abrir el comunicado**, para revisar
  que sea el correcto, y **✏️ Cambiar el link**.

### ② Elige cómo invitar

Hay dos pestañas:

**👥 Con nombre** — cada quien recibe su propio link («¡Hola, Ana!»).

- Agrega invitados con **🏢 De mis clientes** (casillas con buscador; usa el contacto
  principal de cada empresa), **👤 Otra persona** o **📄 Lista de Excel** (descarga la
  plantilla, llénala con Nombre, Correo, WhatsApp y Personas, y súbela).
- Manda con **💬 Mandar por WhatsApp uno por uno** (abre WhatsApp Web en la misma pestaña,
  persona por persona) o **✉️ Enviar por correo a los que faltan** (de 25 en 25 por clic).
  También hay 💬 y ✉️ en cada renglón.
- Cada renglón muestra cómo va: ⏳ Sin mandar · ✉️💬 Enviada · 👁 La abrió · ✅ Van N de M ·
  ❌ No va. Con ✏️ cambias sus datos o anotas su respuesta si te contestó por teléfono.

**🌐 Link abierto** — un solo link para todos (redes, grupos de WhatsApp). Quien entra pone
sus datos y cuántos van. Abajo aparecen los que se registraron.

- **📋 Copiar link** y **💬 Pegar en un grupo de WhatsApp**.
- **📨 Mandar el link a una lista**: agrega personas (📄 Lista de Excel o 👤 Una persona) y
  mándalo por WhatsApp uno por uno o por correo, igual que en «Con nombre».

**📤 Se envía desde / ⚙️ Configuración de envío** (en las dos pestañas): anota con qué
WhatsApp se mandan (el CRM no puede elegir el número: sale del WhatsApp abierto en esa
computadora) y a qué correo llegan las respuestas.

### 🔔 Avisos de registro y correo de confirmado

- **A ti**: cada vez que alguien se registra en el link abierto (no importa si el link se
  compartió desde el CRM, por WhatsApp a mano o en redes) o contesta su invitación con nombre,
  llega un correo «🎟 Nuevo registro», «✅ Confirmó» o «❌ No podrá ir» con sus datos y el
  **Total que van**. Los correos que lo reciben se anotan en **⚙️ Configuración de envío →
  🔔 Avisar de cada registro a** (varios, separados por coma). Si lo dejas vacío, llega al
  correo de envío o, si tampoco hay, a quien creó el evento.
- **A la persona**: si se registró en el link abierto con correo, le llega «Registro
  confirmado». Si confirmó con su link personal y tiene correo, le llega «Confirmado: …» con
  la fecha, el lugar, cuántos van y el botón para volver a su invitación. Quien dice que no
  va no recibe correo.

### Comunicados

En un comunicado el envío es el mismo, con estas diferencias:

- El mensaje dice «📢 Comunicado de DATTASOFT — Te compartimos este comunicado» y el botón
  del correo es «Ver el comunicado». El asunto es «Comunicado: …».
- **Con nombre**: al dar clic en su link, la persona llega directo al comunicado de
  CONTPAQi y en su renglón queda **👁 La abrió**.
- **Link abierto**: es el link de CONTPAQi tal cual.
- No sale en la lista pública de eventos.

### Total que van

En webinars y presenciales, arriba de la página: **👥 Total que van** (con nombre + link
abierto), cuántos dijeron que sí, que no, sin contestar y cuántos la abrieron.

## Registrados del link abierto

Los datos los captura el propio interesado, así que la tabla es **editable**: corrige
nombre, empresa, correo y teléfono en la misma fila y dale **Guardar**.

| Columna | Qué significa |
| --- | --- |
| 📧 | Entrega del correo: 🟢 entregado · 🟡 aún sin confirmar · 🔴 rebotó (probablemente un correo falso) |
| 🚩 | Correo temporal o desechable: probablemente no es un prospecto real |
| 🚫 | Marcado como problemático (pasa el mouse para ver el motivo y quién lo marcó) |
| 🔁 Antes | Ya asistió **de verdad** a otro evento |
| ✅ Asistió | Asistencia real confirmada (alimenta el 🔁 de los eventos siguientes) |
| 💬 | Ya se le mandó el mensaje por WhatsApp |

Acciones: 💬 WhatsApp con la plantilla del evento, ✉️ reenviar confirmación, 🚫 lista negra,
🗑️ eliminar y **📥 Exportar Excel**.

La **lista negra** vale para todos los eventos: quien esté ahí, por correo o teléfono, no
puede volver a registrarse en ninguno.

## Recordatorios y seguimiento automáticos

El CRM manda solo un recordatorio por correo a los registrados antes del evento (24 h por
defecto; 0 = no mandar) y, si el evento tiene **mensaje de seguimiento**, otro después.
Ambos se configuran en ⚙️ Opciones avanzadas.

## Dónde más aparece

- **Dashboard**: «Próximos eventos» de los siguientes 30 días.
- **Calendario**: los eventos en su fecha.
- **Bitácora**: módulo *eventos* (crear, editar, envíos, cambios de invitados).
- **Respaldo** (🛡️ Respaldar): incluye los eventos con sus invitados, links personales,
  confirmaciones, la lista del link abierto, los registrados y la lista negra.
