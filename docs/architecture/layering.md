# Capas y regla de dependencia

- `core/` no importa nada del proyecto salvo otros archivos de `core/`.
- `application/` importa `core/` (entidades + puertos). Nunca `infrastructure/` ni `interfaces/`.
- `infrastructure/` importa `core/` (para implementar los puertos). No importa `application/` ni `interfaces/`.
- `interfaces/` importa `application/` y `core/`. Construye respuestas HTTP.
- `config/` es el único lugar que conoce implementaciones concretas y las cablea (awilix).

ESLint (`eslint.config.js`) aplica `no-restricted-imports` sobre `core/**` y `application/**`.

Import en TypeScript NodeNext: rutas relativas **con extensión `.js`** (aunque el archivo sea `.ts`).
