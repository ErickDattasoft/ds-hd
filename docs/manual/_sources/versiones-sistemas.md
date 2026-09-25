---
titulo: Versiones de sistemas
audiencia: [staff]
rol_minimo: lectura
orden: 60
---

`/app/versiones` lleva el catálogo de versiones disponibles de cada sistema CONTPAQi
(Contabilidad, Nóminas, Bancos, etc.): versión actual, fecha de liberación, notas de la
versión y el link de descarga.

![Catálogo de versiones](../screenshots/versiones-sistemas-lista.png)

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

## Reporte de desactualizadas

*Versiones → Reporte de desactualizadas* lista las empresas con sistemas por actualizar o
licencias vencidas/por vencer, con su contacto. Se puede filtrar por empresa, imprimir,
exportar a Excel y **enviar por correo**: al enviarlo puedes marcar con casillas a la gente
del equipo, o escribir otros correos a mano.
