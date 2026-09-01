# Arquitectura — visión general

ds-hd es una app **MVC del lado del servidor** (Node + Express + TypeScript) con vistas
Nunjucks y realce progresivo (htmx + Alpine). Persiste en **Firestore** a través de
`firebase-admin`, sin que ningún navegador toque la base de datos.

## Capas

| Capa | Carpeta | Responsabilidad | Depende de |
| --- | --- | --- | --- |
| Dominio | `src/core` | Entidades, value objects, errores, **puertos** (interfaces). Sin I/O. | — |
| Aplicación | `src/application` | Casos de uso (1 clase = 1 caso de uso). Orquesta dominio + puertos. | `core` |
| Infraestructura | `src/infrastructure` | Adaptadores que implementan los puertos (Firestore, Brevo, n8n, Firebase Auth, Storage, Turnstile, reloj, ids, logger). | `core` |
| Entrega | `src/interfaces` | HTTP: controllers, routers, middlewares, RBAC, presenters, validación, vistas. | `application`, `core` |
| Composición | `src/config` | Carga de entorno, init de Firebase, **composition root** (awilix). | todas |

La **regla de dependencia** apunta siempre hacia el dominio. ESLint bloquea que `core` o
`application` importen frameworks o capas externas.

## Flujo de una petición

```
HTTP → middleware (sesión, RBAC, CSRF) → Controller → Caso de uso (application)
     → Puerto (core/ports) ── implementado por ──> Adaptador (infrastructure) → Firestore/Brevo/…
     ← Presenter → Vista Nunjucks (o fragmento htmx) → HTTP
```

## Módulos implementados

| Módulo | Ruta base | Notas |
| --- | --- | --- |
| Auth + RBAC + Usuarios/Perfiles | `/login`, `/app/usuarios` | 5 roles + overrides por usuario |
| Tickets + Agentes técnicos | `/app/tickets` | SLA con pausa, kanban, carga de agentes, buzón público |
| Portal de cliente | `/portal` | crea y da seguimiento a sus tickets; aislado por `solicitanteUid` |
| Empresas / Contactos | `/app/empresas`, `/app/contactos` | + Bitácora de auditoría global (`/app/bitacora`) |
| Versiones de sistemas | `/app/versiones` | catálogo CONTPAQi |
| Base de conocimiento | `/kb`, `/portal/kb`, `/app/kb` | visibilidad staff/portal/público, Markdown |
| Cotizaciones + Calculadora Compac | `/app/cotizaciones` | folio consecutivo, regla 1º+adicionales |
| Seguimiento comercial | `/app/tareas`, interacciones en empresa | tareas asignables + log de contacto |
| Papelera | `/app/papelera` | empresas/contactos archivados con restaurar |
| Eventos / webinars | `/eventos`, `/app/eventos` | registro público (Turnstile), lista negra, recordatorios |
| Dashboard | `/app` | métricas acotadas al rol |
| Jobs (cron) | `/jobs/*` | recordatorios de eventos, recálculo de SLA (bearer `JOBS_SECRET`) |

Migración desde el CRM viejo: `scripts/migrate/` (ver su README).
