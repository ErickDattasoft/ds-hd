---
titulo: Mis notas y Captura rápida
audiencia: [staff]
rol_minimo: lectura
orden: 35
---

## 🗒️ Mis notas

`/app/notas` es tu borrador personal, como las notas adhesivas (Sticky Notes) de Windows:
**solo tú ves tus notas** y se guardan solas mientras escribes (el ✓ de arriba de la nota dice
que ya quedó guardada).

- **＋ Nota** crea una nota nueva; los círculos de colores le cambian el color.
- **📌** la fija hasta arriba (otra vez 📌 la desfija).
- **⏰** le pone un recordatorio: ese día la nota sale marcada en rojo y aparece en tu
  **Dashboard** en «⏰ Recordatorios de tus notas». Para quitarlo, borra la fecha.
- **🔍 Buscar** filtra tus notas por lo que escribiste.
- **🗑** la manda a la **🗑️ Papelera** (abajo de la página). Durante unos segundos aparece
  **↩ Deshacer** por si fue sin querer. Desde la papelera puedes **↩ Restaurar** o **❌ borrarla
  para siempre**; las notas que llevan **30 días** en la papelera se borran solas.

### Nota rápida desde cualquier pantalla

Con **Alt + N** (o el botón **🗒️** de la barra de arriba) se abre una nota sin salir de donde
estás. Escribe y dale **💾 Guardar** (o **Ctrl + Enter**): queda en *Mis notas*. **Esc** cierra.

### De nota a ticket

El botón **🎫 Ticket** de una nota la manda a **⚡ Captura rápida**. Al crear los tickets, la nota
queda marcada con su número (**🎫 #1129**, con enlace al ticket) y pasa a la sección
**«🎫 Ya convertidas en ticket»**, para que no se capture dos veces.

## ⚡ Captura rápida

`/app/tickets/captura` convierte varias notas en tickets de una vez (útil para el trabajo que
se hizo por teléfono y se anotó a la carrera).

1. **Pega tus notas**, todas juntas. Cada una empieza con un renglón de encabezado, por ejemplo
   **«CANUL Y ASOCIADOS - ALFONSO 28/10/2026»**, y abajo lo que pasó. Si alguna no se separa
   bien, pon una línea con `---` entre notas.
2. Dale **🔍 Separar y revisar**. Todavía **no se crea nada**: sale una tabla con lo que el CRM
   reconoció (empresa, contacto, agente, fecha y sistema). Corrige lo que haga falta.
   - El **agente** es el que dice la nota; si no dice, quien inició sesión (o el que elijas en
     «Agente si la nota no dice»).
   - La **fecha** del ticket es la de la nota (nunca en el futuro).
   - La casilla **✉️** de cada renglón manda el correo del ticket al cliente. Viene **sin marcar**
     y solo se puede marcar si hay correo de contacto.
3. **✅ Crear tickets marcados**. Se crean uno por uno como **📝 Pre-tickets**, en estado
   *Resuelto*, con tu **firma** (la del agente asignado) al final de la descripción.

Los pre-tickets se ven en *Tickets* con el filtro **📝 Pre-tickets**. Ábrelos con **✏️ Editar**,
revisa tipo, sistema y contacto, y al guardar quedan como ticket normal. Confirmarlo **no manda
ningún correo**; si quieres avisarle al cliente, usa **✉️ Reenviar correo** en el ticket.
