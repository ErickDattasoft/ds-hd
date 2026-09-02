---
titulo: Empresas y contactos
audiencia: [staff]
rol_minimo: lectura
orden: 40
---

Empresas (`/app/empresas`) y contactos (`/app/contactos`) son el directorio de clientes del
CRM; casi todo lo demás (tickets, cotizaciones, seguimiento) se liga a una empresa.

![Lista de empresas](../screenshots/empresas-contactos-empresas.png)

## Empresas

Una empresa guarda RFC, razón social, datos de contacto, los **sistemas contratados**
(p. ej. CONTPAQi Contabilidad, Nóminas) y sus **vigencias** de licencia por sistema.

- **Nueva empresa** (`/app/empresas/nueva`): el nombre debe ser único.
- **Ver / Editar**: desde el detalle también ves sus contactos, tickets e interacciones
  comerciales ligadas.
- **Archivar**: no borra la empresa; la manda a la [Papelera](papelera.md), de donde se
  puede restaurar.

## Contactos

![Lista de contactos](../screenshots/empresas-contactos-contactos.png)

Cada contacto pertenece a una empresa (`empresaId` obligatorio). Un contacto marcado como
**de portal** (`esPortal`) es el que tiene o puede tener una cuenta de cliente vinculada —
eso se configura al invitarlo desde [Usuarios y permisos](usuarios-y-permisos.md), no desde
aquí directamente.

- **Nuevo contacto** (`/app/contactos/nuevo`): elige la empresa a la que pertenece.
- **Archivar**: igual que empresas, va a la papelera y es reversible.
