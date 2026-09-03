# Manual de usuario final — Portal de cliente

> Generado automáticamente por `npm run docs:manuals` desde `docs/manual/_sources/`. No editar a mano.

## Contenido

1. [Iniciar sesión y solicitar acceso](#iniciar-sesion-y-solicitar-acceso)
2. [Levantar un ticket sin cuenta](#levantar-un-ticket-sin-cuenta)
3. [Mis tickets (portal de cliente)](#mis-tickets-portal-de-cliente)
4. [Mi perfil (portal de cliente)](#mi-perfil-portal-de-cliente)
5. [Eventos y webinars — registro público](#eventos-y-webinars-registro-publico)
6. [Base de conocimiento](#base-de-conocimiento)

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

## Levantar un ticket sin cuenta

Si todavía no tienes una cuenta de portal, puedes reportar un problema sin iniciar sesión
desde `/ticket-publico`.

*(captura pendiente: ticket-publico-form.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## Qué necesitas llenar

Nombre, empresa, correo, teléfono (opcional), asunto, sistema afectado, tipo, prioridad y
una descripción del problema. El formulario incluye una verificación anti-robots.

## Qué pasa después de enviarlo

Tu solicitud no se convierte en ticket de inmediato: llega primero al buzón interno del
equipo de soporte, quien la revisa y **acepta** (creando el ticket formal, con folio y
seguimiento de tiempos) o la **rechaza** si no procede. Te avisan por correo en cuanto se
acepta.

Si prefieres poder ver el estado de tus tickets y su historial en cualquier momento, pide
al equipo de soporte que te invite al portal de clientes (ver
[Iniciar sesión y solicitar acceso](login-y-acceso.md)).

---

## Mis tickets (portal de cliente)

Al entrar con tu cuenta de cliente llegas a `/portal`, tu panel personal.

*(captura pendiente: portal-tickets-dashboard.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## Ver tus tickets

*Mis tickets* (`/portal/tickets`) lista únicamente los tickets que tú (o alguien de tu
empresa a través tuyo) ha abierto — nunca ves tickets de otros clientes.

*(captura pendiente: portal-tickets-lista.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

Abre uno para ver su estado, su historial de cambios de estado y las notas **públicas** que
el equipo de soporte haya dejado. Las notas internas del staff nunca aparecen aquí.

## Crear un ticket nuevo

*Mis tickets → Nuevo ticket* (`/portal/tickets/nuevo`).

*(captura pendiente: portal-tickets-nuevo.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

Describe tu problema (asunto, descripción, tipo). El ticket queda ligado automáticamente a
tu cuenta y a tu empresa; no necesitas indicar datos de contacto porque ya se conocen de tu
perfil.

## Responder un ticket

Desde el detalle del ticket, el cuadro de **Responder** agrega un mensaje tuyo al hilo; el
equipo de soporte lo ve y puede contestarte por ahí mismo o por correo, según cómo esté
configurada la notificación.

---

## Mi perfil (portal de cliente)

`/portal/perfil` muestra tus datos de cuenta: nombre, correo y la empresa a la que estás
vinculado.

*(captura pendiente: portal-perfil-ver.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

Hoy puedes editar tu **nombre** desde aquí. Si necesitas cambiar el correo con el que
inicias sesión, tu contraseña o la empresa a la que estás vinculado, pide a tu contacto de
soporte que lo haga desde el módulo de Usuarios — no es autoservicio todavía.

---

## Eventos y webinars — registro público

`/eventos` lista los próximos webinars y eventos abiertos al público, sin necesidad de
cuenta.

*(captura pendiente: eventos-publico-lista.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## Registrarte

Entra al evento que te interesa y llena el formulario: nombre, correo, teléfono (opcional)
y empresa (opcional). Incluye una verificación anti-robots. Si el evento ya llegó a su
cupo máximo, el formulario de registro no estará disponible.

## Después de registrarte

Recibes un correo de confirmación con los detalles del evento, y otro de recordatorio
cerca de la fecha. Si necesitas cancelar tu registro o cambiar tus datos, responde a ese
correo para que el equipo lo ajuste manualmente.

---

## Base de conocimiento

Artículos de ayuda escritos en Markdown, con tres niveles de visibilidad por artículo:
**staff** (solo equipo interno), **portal** (staff + clientes con cuenta) y **público**
(cualquiera, sin sesión, en `/kb`).

*(captura pendiente: base-conocimiento-staff.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

## Staff: escribir y publicar artículos

En `/app/kb` ves todos los artículos sin importar su visibilidad. *Nuevo artículo* pide
título (genera el slug automáticamente), categoría, cuerpo en Markdown, etiquetas y la
visibilidad. Un artículo no aparece fuera del back-office hasta que lo marcas **publicado**.

## Consultar artículos (staff, portal y público)

*(captura pendiente: base-conocimiento-portal.png — corre `npm run docs:screenshots` contra la app corriendo y con datos de `npm run seed:demo`)*

- Staff los ve en `/app/kb`.
- Un cliente logueado los ve en `/portal/kb` (solo los de visibilidad *portal* o *público*).
- Cualquier visitante los ve en `/kb`, sin sesión (solo los de visibilidad *público*).

En los tres casos el artículo se abre por su slug: `/kb/<slug>` (o el equivalente bajo
`/app` o `/portal`).
