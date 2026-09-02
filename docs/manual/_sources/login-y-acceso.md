---
titulo: Iniciar sesión y solicitar acceso
audiencia: [staff, cliente]
rol_minimo: —
orden: 10
---

Todo el sistema vive detrás de una sola pantalla de inicio de sesión en `/login`.

![Pantalla de login](../screenshots/login-y-acceso-login.png)

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
