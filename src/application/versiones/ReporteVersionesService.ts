import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IContactoRepository } from '../../core/ports/repositories/IContactoRepository.js';
import type { IVersionRepository } from '../../core/ports/repositories/IVersionRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { ColumnaExcel, IExcelIO } from '../../core/ports/services/IExcelIO.js';
import { estadoActualizacion } from '../../core/entities/value-objects/version.js';
import { ForbiddenError, ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';
import type { BitacoraService } from '../shared/BitacoraService.js';

/** Un sistema con la versión instalada por debajo de la oficial. */
export interface SistemaDesactualizado {
  sistema: string;
  instalada: string;
  oficial: string;
  cartaTecnica: string | null;
}

/** Una licencia vencida o por vencer. */
export interface LicenciaPendiente {
  sistema: string;
  fecha: string;
  dias: number;
  estado: 'vencida' | 'por_vencer';
}

/** Fila del reporte: una empresa con sus pendientes de versiones y/o licencias. */
export interface FilaReporteVersiones {
  empresaId: string;
  empresa: string;
  rfc: string;
  contacto: string;
  correo: string;
  telefono: string;
  sistemasDesactualizados: SistemaDesactualizado[];
  licencias: LicenciaPendiente[];
}

const COLUMNAS: ColumnaExcel[] = [
  { header: 'Empresa', key: 'empresa', width: 30 },
  { header: 'RFC', key: 'rfc', width: 16 },
  { header: 'Contacto', key: 'contacto', width: 22 },
  { header: 'Correo', key: 'correo', width: 26 },
  { header: 'Teléfono', key: 'telefono', width: 16 },
  { header: 'Sistemas desactualizados', key: 'sistemas', width: 44 },
  { header: 'Licencias', key: 'licencias', width: 36 },
];

/**
 * Reporte de empresas con sistemas desactualizados y/o licencias vencidas o por vencer.
 * Se puede ver en pantalla, exportar a Excel, imprimir y enviar por correo (paridad con el CRM viejo).
 */
export class ReporteVersionesService {
  constructor(
    private readonly empresas: IEmpresaRepository,
    private readonly contactos: IContactoRepository,
    private readonly versiones: IVersionRepository,
    private readonly excel: IExcelIO,
    private readonly email: IEmailSender,
    private readonly bitacora: BitacoraService,
    private readonly clock: IClock,
  ) {}

  /** Calcula el reporte. `empresaId` lo acota a una sola empresa. */
  async generar(opts: { empresaId?: string } = {}): Promise<FilaReporteVersiones[]> {
    const [empresas, listaVersiones] = await Promise.all([this.empresas.list({}), this.versiones.list()]);
    const oficial = new Map(listaVersiones.map((v) => [v.sistema, v]));
    const hoy = this.clock.now();

    const filas: FilaReporteVersiones[] = [];
    for (const empresa of empresas) {
      if (opts.empresaId && empresa.id !== opts.empresaId) continue;

      const sistemasDesactualizados: SistemaDesactualizado[] = empresa.sistemasContratados
        .filter(
          (s) =>
            estadoActualizacion(empresa.versionesInstaladas[s], oficial.get(s)?.versionActual) === 'desactualizada',
        )
        .map((s) => ({
          sistema: s,
          instalada: empresa.versionesInstaladas[s] || 'sin dato',
          oficial: oficial.get(s)?.versionActual ?? '',
          cartaTecnica: oficial.get(s)?.linkCartaTecnica ?? null,
        }));

      const licencias: LicenciaPendiente[] = empresa
        .licenciasEnRiesgo(hoy)
        .map((l) => ({ sistema: l.sistema, fecha: l.fecha, dias: l.dias, estado: l.estado as 'vencida' | 'por_vencer' }));

      if (!sistemasDesactualizados.length && !licencias.length) continue;

      const contactosEmpresa = await this.contactos.list({ empresaId: empresa.id, activo: true });
      const contacto =
        contactosEmpresa.find((c) => c.id === empresa.contactoPrincipalId) ??
        contactosEmpresa.find((c) => c.email) ??
        contactosEmpresa[0];

      filas.push({
        empresaId: empresa.id,
        empresa: empresa.nombre,
        rfc: empresa.rfc ?? '',
        contacto: contacto?.nombre ?? '',
        correo: contacto?.email ?? empresa.email ?? '',
        telefono: contacto?.celular ?? contacto?.telefono ?? empresa.telefono ?? '',
        sistemasDesactualizados,
        licencias,
      });
    }
    filas.sort((a, b) => a.empresa.localeCompare(b.empresa, 'es'));
    return filas;
  }

  /** El reporte como `.xlsx`. */
  async exportarExcel(opts: { empresaId?: string } = {}): Promise<Buffer> {
    const filas = await this.generar(opts);
    return this.excel.escribir(
      'Desactualizadas',
      COLUMNAS,
      filas.map((f) => ({
        empresa: f.empresa,
        rfc: f.rfc,
        contacto: f.contacto,
        correo: f.correo,
        telefono: f.telefono,
        sistemas: f.sistemasDesactualizados
          .map((s) => `${s.sistema}: ${s.instalada} → ${s.oficial}`)
          .join('\n'),
        licencias: f.licencias
          .map((l) => `${l.sistema}: ${l.estado === 'vencida' ? 'vencida' : 'por vencer'} (${l.fecha})`)
          .join('\n'),
      })),
    );
  }

  /** Envía el reporte por correo a los destinatarios indicados. */
  async enviarPorCorreo(
    actor: SessionUser,
    opts: { destinatarios: string[]; empresaId?: string },
  ): Promise<{ enviadoA: string[] }> {
    if (!actor.permisos.includes('versiones:editar')) {
      throw new ForbiddenError('No puedes enviar el reporte');
    }
    const destinatarios = [...new Set(opts.destinatarios.map((d) => d.trim().toLowerCase()).filter(Boolean))];
    if (!destinatarios.length) {
      throw new ValidationError('Indica al menos un correo destinatario', { destinatarios: 'Requerido' });
    }
    const filas = await this.generar(opts.empresaId ? { empresaId: opts.empresaId } : {});

    await this.email.enviar({
      para: destinatarios.map((email) => ({ email })),
      asunto: 'Reporte de versiones y licencias desactualizadas',
      html: this.html(filas),
      tags: ['reporte-versiones'],
    });
    await this.bitacora.registrar({
      actor,
      accion: 'enviar',
      modulo: 'versiones',
      entidadTipo: 'VersionSistema',
      entidadId: 'reporte',
      resumen: `Reporte de desactualizadas enviado a ${destinatarios.join(', ')}`,
    });
    return { enviadoA: destinatarios };
  }

  private html(filas: FilaReporteVersiones[]): string {
    if (!filas.length) return '<p>No hay empresas con sistemas o licencias desactualizadas. 🎉</p>';
    const esc = (s: string): string =>
      s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
    const filasHtml = filas
      .map(
        (f) =>
          `<tr><td>${esc(f.empresa)}</td><td>${esc(f.rfc)}</td><td>${esc(f.contacto)}</td>` +
          `<td>${esc(f.correo)}</td><td>${esc(f.telefono)}</td>` +
          `<td>${f.sistemasDesactualizados.map((s) => esc(`${s.sistema}: ${s.instalada} → ${s.oficial}`)).join('<br>') || '—'}</td>` +
          `<td>${f.licencias.map((l) => esc(`${l.sistema}: ${l.estado === 'vencida' ? 'vencida' : 'por vencer'} (${l.fecha})`)).join('<br>') || '—'}</td></tr>`,
      )
      .join('');
    return `
      <p>Reporte de empresas con sistemas desactualizados y/o licencias vencidas o por vencer (${filas.length}).</p>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
        <thead><tr><th>Empresa</th><th>RFC</th><th>Contacto</th><th>Correo</th><th>Teléfono</th><th>Sistemas desactualizados</th><th>Licencias</th></tr></thead>
        <tbody>${filasHtml}</tbody>
      </table>`;
  }
}
