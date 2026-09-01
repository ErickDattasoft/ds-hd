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

## Estado

Fase 0: scaffolding, servidor base, `/healthz`, Docker, CI, generación de README.
Ver el plan por fases para el resto.
