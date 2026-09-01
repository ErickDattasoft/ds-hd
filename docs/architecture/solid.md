# SOLID en ds-hd

- **SRP** — cada `application/**/*Service.ts` = un caso de uso. Controllers solo traducen
  HTTP ↔ caso de uso. Mappers solo entidad ↔ documento. Presenters solo forma del view model.
- **OCP** — nuevos proveedores (correo, persistencia) = nuevo adaptador que implementa el
  puerto; `application/` no cambia. Nuevo rol/permiso = dato en `rbac/`, el motor no cambia.
- **LSP** — los fakes en memoria (`test/fakes/`) y los adaptadores reales cumplen el mismo
  contrato; `test/contract/` corre la misma suite contra ambos.
- **ISP** — puertos finos: repositorios de comando separados de los de query; `IEmailSender`
  separado de `IWebhookPublisher`. Sin `IRepository<T>` genérico.
- **DIP** — `application/` depende de `core/ports`. El composition root (`config/container.ts`)
  es el único que instancia adaptadores concretos.
