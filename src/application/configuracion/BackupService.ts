import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IContactoRepository } from '../../core/ports/repositories/IContactoRepository.js';
import type { ITicketQueries } from '../../core/ports/repositories/ITicketQueries.js';
import type { ICotizacionRepository } from '../../core/ports/repositories/ICotizacionRepository.js';
import type { IVersionRepository } from '../../core/ports/repositories/IVersionRepository.js';
import type { IKnowledgeRepository } from '../../core/ports/repositories/IKnowledgeRepository.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';

/** Versión del formato de backup — súbela si cambia la forma de alguna sección. */
export const VERSION_BACKUP = 1;

/**
 * Backup/restauración completa de ds-hd, en el propio formato del sistema (no el del CRM
 * viejo — ese lo maneja `scripts/migrate/`). Pensado para respaldo manual y recuperación
 * ante desastres, no para migrar entre sistemas distintos.
 */
export class BackupService {
  constructor(
    private readonly empresas: IEmpresaRepository,
    private readonly contactos: IContactoRepository,
    private readonly tickets: ITicketQueries,
    private readonly cotizaciones: ICotizacionRepository,
    private readonly versiones: IVersionRepository,
    private readonly kb: IKnowledgeRepository,
    private readonly usuarios: IUsuarioRepository,
    private readonly configuracion: IConfiguracionRepository,
    private readonly clock: IClock,
  ) {}

  /** Vuelca todas las colecciones principales a un solo objeto serializable a JSON. */
  async exportar(): Promise<Record<string, unknown>> {
    const [empresas, contactos, tickets, cotizaciones, versiones, kb, usuarios, tickets_cfg, calculadora, avisos] =
      await Promise.all([
        this.empresas.list({}),
        this.contactos.list({}),
        this.tickets.listar({}),
        this.cotizaciones.list({}),
        this.versiones.list(),
        this.kb.list({}),
        this.usuarios.list({}),
        this.configuracion.obtenerTickets(),
        this.configuracion.obtenerCalculadora(),
        this.configuracion.obtenerAvisos(),
      ]);

    return {
      version: VERSION_BACKUP,
      generadoEn: this.clock.now().toISOString(),
      empresas,
      contactos,
      tickets,
      cotizaciones,
      versiones,
      kb,
      // Las cuentas se listan sin nada sensible de Auth (no hay contraseñas que respaldar
      // aquí — eso vive en Firebase Auth, fuera de Firestore).
      usuarios: usuarios.map((u) => ({ ...u, email: u.email.value })),
      configuracion: { tickets: tickets_cfg, calculadora, avisos },
    };
  }
}
