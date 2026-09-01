# Autenticación y RBAC

**Sesión**: session cookie de Firebase Admin (`createSessionCookie` / `verifySessionCookie`),
`__session` httpOnly + Secure + SameSite=Lax. CSRF double-submit en formularios.
Todo detrás del puerto `IAuthProvider`.

**Roles**: `admin`, `supervisor`, `agente`, `lectura`, `cliente`.
Overrides por usuario: `permisosExtra[]` / `permisosRevocados[]`.

**Permisos**: formato `modulo:accion` en `interfaces/http/rbac/permissions.ts`.
`roles.ts` mapea rol → permisos; `policy.ts` expone `can(user, permiso, recurso?)`.

**Áreas**: `/` público · `/app/*` staff · `/portal/*` clientes (aislados: cada consulta se
fuerza a `solicitanteUid` / `empresaId` del cliente en la capa de aplicación).

Implementación en Fase 1. Esta página se completará con la matriz generada desde `roles.ts`.
