---
titulo: Tickets y agentes técnicos
audiencia: [staff]
rol_minimo: lectura
orden: 30
---

El módulo de tickets (`/app/tickets`) es el corazón del sistema de soporte.

![Lista de tickets](../screenshots/tickets-lista.png)

## Vistas disponibles

| Vista | Ruta | Para qué |
| --- | --- | --- |
| Lista | `/app/tickets` | filtrar/ordenar todos los tickets que puedes ver |
| Tablero (kanban) | `/app/tickets/tablero` | arrastrar un ticket entre columnas para cambiar su estado |
| Mis asignados | `/app/tickets/mis-asignados` | los tickets asignados a ti (agente) |
| Carga de agentes | `/app/tickets/carga-agentes` | cuántos tickets abiertos tiene cada agente frente a su capacidad máxima (requiere permiso de asignar) |
| Solicitudes de ticket | `/app/tickets/buzon` | solicitudes del formulario público o de un correo sin número de ticket, pendientes de convertir o descartar |

![Tablero kanban](../screenshots/tickets-tablero.png)

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

En el detalle del ticket, **📝 Descripción** muestra la solicitud original y todo lo que se ha
escrito: en verde lo que llegó por correo, en azul lo que se mandó desde el CRM y en amarillo las
notas internas. Abajo hay **dos recuadros separados**:

- **💬 Respuesta al cliente** (verde): lo que escribas ahí **se le manda por correo al cliente**
  (con *Con copia* opcional y hasta 5 capturas, que también puedes pegar con Ctrl+V).
- **🔒 Notas internas** (amarillo): solo para el equipo — folio de factura, avances, pendientes.
  **No la ve el cliente ni manda correo.** También acepta capturas. Todos los correos de un ticket llevan `[Ticket #N]` en el asunto: cuando el cliente o un
agente en copia contesta, su respuesta (con sus capturas) aparece sola en la conversación y queda
en la actividad del ticket y en la Bitácora. Se configura en *Configuración → Correo entrante*.

## 🧾 Folio de factura

En el recuadro **🧾 Factura** del ticket (junto a «💬 Respuesta al cliente» y «🔒 Notas internas»), además del estado, va el **🧾 Folio de
factura** (p. ej. «SER 1445»). Se guarda **sin mandar correo** y se ve en el ticket, en la lista,
en el Excel, en el portal del cliente, en todos los correos del ticket y al imprimir. Si el cliente lo pide, marca **«✉️ Mandárselo al cliente»**:
le llega un solo correo corto con el folio, sin copias al equipo. Al cerrar el ticket, el folio va
también en el correo de cierre al cliente y en el aviso interno «[FACTURADO]».

## 🔔 Respuestas sin leer (cada quien la suya)

Cuando un cliente contesta (por correo o desde su portal), el ticket aparece en la **🔔 campana**
de arriba y en el **💬** junto a *Tickets* en el menú — los dos muestran el mismo número: las
respuestas que **tú** no has leído.

- Al **abrir el ticket**, baja a cero **solo para ti**; tus compañeros lo siguen viendo hasta que
  lo abran ellos. En la lista de la campana se ve **«👁 Leído por: …»** para no contestar dos veces.
- Cuando **alguien le contesta al cliente**, sale de la lista de todos.
- Si el cliente vuelve a escribir, queda pendiente otra vez para todos.
- Los avisos de más de 15 días se quitan solos.
- **👥 Avisos de compañeros:** si alguien del equipo escribe (respuesta o nota interna) en un ticket
  **asignado a otra persona**, a esa persona le llega el aviso en su campana (con la etiqueta
  «👥 de …»). Se quita cuando ella abre el ticket. Quien escribe en su propio ticket no genera aviso.

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
