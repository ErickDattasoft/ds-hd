# Contribuir a ds-hd

## Antes de cada fase / iteración

1. **Lee `REQUERIMIENTOS.MD`** en la raíz. Es la fuente de verdad; puede haber cambiado.
2. Revisa el plan por fases y el estado actual.
3. Confirma decisiones abiertas pendientes que bloqueen la fase.

## Flujo de ramas

- `main` protegida; se trabaja en ramas `fase-N/...` o `feat/...`, `fix/...`.
- PR con CI en verde (lint + typecheck + tests + build de Docker + `docs:check`).
- Commits convencionales (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`).

## Reglas de arquitectura (MVC + SOLID)

- La regla de dependencia apunta al dominio: `interfaces → application → core`,
  `infrastructure → core`. `core` y `application` **no** importan Express, Nunjucks,
  `firebase-admin` ni nada de `infrastructure/` ni `interfaces/` (lo verifica ESLint).
- Un caso de uso = una clase en `application/<modulo>/`, una sola razón de cambio (SRP).
- Toda dependencia externa entra por una interfaz en `core/ports/` (DIP); su implementación
  concreta se registra **solo** en `src/config/container.ts`.
- Los controllers traducen HTTP ↔ caso de uso; no llevan reglas de negocio.
- Toda clase/interfaz exportada en `core/` o `application/` necesita un comentario JSDoc
  (lo exige ESLint: `jsdoc/require-jsdoc`) — es la fuente de `docs/api/` (TypeDoc).

## Añadir un módulo (vertical slice)

1. `core/entities/<Entidad>.ts` (+ value objects si aplica).
2. `core/ports/repositories/I<Entidad>Repository.ts` (separa comandos de queries si hace falta).
3. `infrastructure/firestore/Firestore<Entidad>Repository.ts` + `mappers/<Entidad>Mapper.ts`.
4. `application/<modulo>/<Accion><Entidad>Service.ts` + `dto/`.
5. `interfaces/http/controllers/.../<Entidad>Controller.ts` + `routes/` + `validators/` + `presenters/`.
6. Permisos en `interfaces/http/rbac/permissions.ts` + entrada de navegación en `view-helpers/nav.ts`.
7. Vistas en `views/pages/...`.
8. Registro en `config/container.ts` y `routes/index.ts`.
9. Tests: unit (con fakes), contrato (fake vs Firestore), e2e si hay flujo HTTP.
10. Importador de migración en `scripts/migrate/` si el módulo tiene datos históricos.
11. Fuente de manual en `docs/manual/_sources/<modulo>.md`.
