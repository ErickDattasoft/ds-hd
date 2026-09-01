# Autenticación y RBAC

**Sesión**: session cookie de Firebase Admin (`createSessionCookie` / `verifySessionCookie`),
`__session` httpOnly + Secure + SameSite=Lax. CSRF double-submit en formularios.
Todo detrás del puerto `IAuthProvider`.

**Roles**: `admin`, `supervisor`, `agente`, `lectura`, `cliente`.
Overrides por usuario: `permisosExtra[]` / `permisosRevocados[]`.

**Permisos**: formato `modulo:accion` en `interfaces/http/rbac/permissions.ts`.
`roles.ts` mapea rol → permisos; `policy.ts` expone `can(user, permiso, recurso?)`.

**Áreas**: `/` público · `/app/*` staff (`requireStaff`) · `/portal/*` clientes
(`requireCliente`). El portal (Fase 3) acota TODA consulta a `solicitanteUid === actor.uid`
en `application/portal/*` (no solo en la UI): un cliente nunca ve tickets de otro, ni de otro
contacto de su empresa; el detalle filtra a notas públicas y a eventos de `cambio_estado`
(no revela que existan notas internas); intentar ver un ticket ajeno da 404 (no 403).

**Sesión (Fase 1)**: token propio firmado con `SESSION_COOKIE_SECRET`
(`SignedCookieSessionManager`), cookie `__session` httpOnly. El puerto `ISessionManager`
permite cambiar a las *session cookies* de Firebase Admin sin tocar el resto.
`IAuthProvider` (Firebase Auth: REST `signInWithPassword` + Admin SDK) cubre identidad,
alta, cambio de contraseña, inhabilitar y custom claims.

**Alta de cuentas**: el staff crea usuarios/invita clientes → se crea la identidad con
contraseña aleatoria + una invitación de un solo uso (`invitaciones/{token}`, TTL 72 h) →
el usuario fija su contraseña en `/invitacion/:token`.

Middlewares: `sessionAuth` (resuelve `req.user` con caché de 60 s), `requireAuth`,
`requireRole`, `requirePermission`, `requireStaff`, `requireCliente`, `csrf` (double-submit).
La navegación (`view-helpers/nav.ts`) y el `can()` de las vistas se derivan de los permisos
efectivos; el controller revalida siempre.

Esta página se completará con la matriz generada desde `roles.ts` (Fase 6).
