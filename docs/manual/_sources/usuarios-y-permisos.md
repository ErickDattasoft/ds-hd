---
titulo: Usuarios, roles y permisos
audiencia: [staff]
rol_minimo: admin
orden: 120
---

`/app/usuarios` administra las cuentas de staff y las invitaciones a clientes. Solo quien
tiene el permiso `usuarios:gestionar` (admin, y supervisor salvo por defecto sobre
`roles:gestionar`) ve este módulo.

![Usuarios](../screenshots/usuarios-y-permisos-lista.png)

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

## Desactivar una cuenta

Editar el usuario y desmarcar **Activo**. No borra su historial (tickets asignados, notas,
bitácora); solo le impide iniciar sesión de nuevo.
