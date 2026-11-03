import type { IContactoRepository } from '../../core/ports/repositories/IContactoRepository.js';
import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { Empresa } from '../../core/entities/Empresa.js';
import type { SessionUser } from '../shared/SessionUser.js';
import { mesDiaDeFecha, proximosDias } from '../../core/entities/value-objects/fechasEspeciales.js';
import { ZONA_MEXICO } from '../../core/entities/value-objects/horaMexico.js';

/** Días hacia adelante que se avisan (además de hoy). */
export const DIAS_AVISO_CUMPLEANOS = 7;

/** Un cumpleaños (contacto) o aniversario de fundación (empresa) próximo, listo para felicitar. */
export interface FechaEspecial {
  tipo: 'cumpleanos' | 'aniversario';
  id: string;
  nombre: string;
  /** Empresa del contacto, o el contacto a quien se escribe en el caso de una empresa. */
  detalle: string | null;
  href: string;
  /** 0 = hoy. */
  dias: number;
  /** `MM-DD` de la fecha. */
  mesDia: string;
  /** Años que cumple la empresa (solo aniversarios). */
  anios: number | null;
  email: string | null;
  /** Número para wa.me (solo dígitos, con lada de país). */
  whatsapp: string | null;
  asunto: string;
  mensaje: string;
}

/** Deja solo los dígitos y antepone 52 a los números mexicanos de 10 dígitos (como en la ficha). */
function numeroWhatsapp(tel: string | null | undefined): string | null {
  const n = (tel ?? '').replace(/\D/g, '');
  if (!n) return null;
  return n.length === 10 ? `52${n}` : n;
}

/**
 * Cumpleaños de contactos y aniversarios de empresas de hoy y los próximos días, para el tablero.
 * Consulta solo los que caen en esas fechas (por su mes-día), no toda la cartera: cuida la cuota.
 */
export class CumpleanosService {
  constructor(
    private readonly contactos: IContactoRepository,
    private readonly empresas: IEmpresaRepository,
    private readonly clock: IClock,
  ) {}

  async proximos(actor: SessionUser): Promise<FechaEspecial[]> {
    const verContactos = actor.permisos.includes('contactos:leer');
    const verEmpresas = actor.permisos.includes('empresas:leer');
    if (!verContactos && !verEmpresas) return [];

    const hoy = this.clock.now().toLocaleDateString('en-CA', { timeZone: ZONA_MEXICO });
    const rango = proximosDias(hoy, DIAS_AVISO_CUMPLEANOS);
    const porMesDia = new Map(rango.map((r) => [r.mesDia, r]));
    const mesDias = [...porMesDia.keys()];

    const [contactos, empresas] = await Promise.all([
      verContactos ? this.contactos.cumpleanosEn(mesDias) : Promise.resolve([]),
      verEmpresas ? this.empresas.fundacionEn(mesDias) : Promise.resolve([]),
    ]);

    // Empresas de los contactos que cumplen (para mostrar de dónde son), sin repetir lecturas.
    const cacheEmpresas = new Map<string, Promise<Empresa | null>>(empresas.map((e) => [e.id, Promise.resolve(e)]));
    const empresaDe = (id: string) => {
      if (!cacheEmpresas.has(id)) cacheEmpresas.set(id, this.empresas.findById(id).catch(() => null));
      return cacheEmpresas.get(id)!;
    };

    const out: FechaEspecial[] = [];
    for (const c of contactos) {
      const r = porMesDia.get(c.cumpleanos!);
      if (!r) continue;
      const empresa = await empresaDe(c.empresaId);
      const primerNombre = c.nombre.split(/\s+/)[0] ?? c.nombre;
      out.push({
        tipo: 'cumpleanos',
        id: c.id,
        nombre: c.nombre,
        detalle: empresa?.nombre ?? null,
        href: `/app/contactos/${c.id}/editar`,
        dias: r.dias,
        mesDia: c.cumpleanos!,
        anios: null,
        email: c.email,
        whatsapp: numeroWhatsapp(c.telefono || c.celular),
        asunto: `¡Feliz cumpleaños, ${primerNombre}! 🎂`,
        mensaje:
          `¡Feliz cumpleaños, ${primerNombre}! 🎂\n\n` +
          'De parte de todo el equipo de DATTASOFT le deseamos un día excelente y un año lleno de éxitos.\n\n' +
          'Un saludo afectuoso.',
      });
    }

    for (const e of empresas) {
      const md = mesDiaDeFecha(e.fechaFundacion!);
      const r = porMesDia.get(md);
      if (!r) continue;
      const anios = r.anio - Number(e.fechaFundacion!.slice(0, 4));
      if (anios < 1) continue;
      // Sin correo o teléfono propios, se felicita a través del contacto principal.
      const principal =
        (!e.email || !e.telefono) && e.contactoPrincipalId
          ? await this.contactos.findById(e.contactoPrincipalId).catch(() => null)
          : null;
      out.push({
        tipo: 'aniversario',
        id: e.id,
        nombre: e.nombre,
        detalle: principal?.nombre ?? null,
        href: `/app/empresas/${e.id}`,
        dias: r.dias,
        mesDia: md,
        anios,
        email: e.email || principal?.email || null,
        whatsapp: numeroWhatsapp(e.telefono || principal?.telefono || principal?.celular),
        asunto: `¡Felicidades por sus ${anios} años! 🎉`,
        mensaje:
          `¡Muchas felicidades a todo el equipo de ${e.nombre} por sus ${anios} año${anios === 1 ? '' : 's'}! 🎉\n\n` +
          'En DATTASOFT nos da mucho gusto acompañarlos y les deseamos muchos años más de crecimiento.\n\n' +
          'Un saludo afectuoso.',
      });
    }

    return out.sort((a, b) => a.dias - b.dias || a.nombre.localeCompare(b.nombre, 'es'));
  }
}
