import type { ListarContactosFiltro } from '../../core/ports/repositories/IContactoRepository.js';
import type { SessionUser } from '../shared/SessionUser.js';
import type { ContactoService } from './ContactoService.js';
import type { EmpresaService } from '../empresas/EmpresaService.js';
import type { ColumnaExcel, IExcelIO } from '../../core/ports/services/IExcelIO.js';
import type { ResumenImportacionExcel } from '../empresas/EmpresaExcelService.js';
import { celda, columnasDe, correosDe } from '../excel/celdas.js';

export const COLUMNAS_CONTACTOS: ColumnaExcel[] = [
  { header: 'Nombre', key: 'nombre', width: 26 },
  { header: 'Empresa', key: 'empresa', width: 30 },
  { header: 'Puesto', key: 'puesto', width: 20 },
  { header: 'Correo', key: 'email', width: 26 },
  { header: 'Correo alternativo', key: 'emailAlternativo', width: 26 },
  { header: 'Teléfono', key: 'telefono' },
  { header: 'Teléfono alternativo', key: 'celular' },
  { header: 'Rol en la empresa', key: 'rol' },
  { header: 'Notas', key: 'notas', width: 30 },
  { header: 'Activo', key: 'activo' },
];

/** Import/export de Contactos en Excel (`.xlsx`). La empresa se referencia por nombre exacto. */
export class ContactoExcelService {
  constructor(
    private readonly contactos: ContactoService,
    private readonly empresas: EmpresaService,
    private readonly excel: IExcelIO,
  ) {}

  async exportar(filtro?: ListarContactosFiltro): Promise<Buffer> {
    const filas = await this.filasParaExportar(filtro);
    return this.excel.escribir('Contactos', COLUMNAS_CONTACTOS, filas);
  }

  /** Filas listas para una hoja "Contactos" — reutilizado por el export unificado. */
  async filasParaExportar(filtro?: ListarContactosFiltro): Promise<Record<string, string>[]> {
    const [lista, empresas] = await Promise.all([this.contactos.listar(filtro), this.empresas.listar()]);
    const nombreEmpresa = new Map(empresas.map((e) => [e.id, e.nombre]));
    const rol = new Map<string, string>();
    for (const e of empresas) {
      if (e.contactoAlternativoId) rol.set(e.contactoAlternativoId, 'Alternativo');
      if (e.contactoPrincipalId) rol.set(e.contactoPrincipalId, 'Principal');
    }
    return lista.map((c) => ({
      nombre: c.nombre,
      empresa: nombreEmpresa.get(c.empresaId) ?? '',
      puesto: c.puesto ?? '',
      email: c.email ?? '',
      emailAlternativo: c.emailAlternativo ?? '',
      telefono: c.telefono ?? '',
      celular: c.celular ?? '',
      rol: rol.get(c.id) ?? '',
      notas: c.notas ?? '',
      activo: c.activo ? 'Sí' : 'No',
    }));
  }

  async importar(actor: SessionUser, buffer: Buffer): Promise<ResumenImportacionExcel> {
    const filas = await this.excel.leer(buffer);
    return this.importarFilas(actor, filas);
  }

  /** Procesa filas ya leídas (de una hoja "Contactos") — reutilizado por el import unificado. */
  async importarFilas(actor: SessionUser, filas: Record<string, string>[]): Promise<ResumenImportacionExcel> {
    const [existentes, empresas] = await Promise.all([this.contactos.listar(), this.empresas.listar()]);
    const empresaPorNombre = new Map(empresas.map((e) => [e.nombre.toLowerCase(), e]));

    const columnas = columnasDe(filas);
    const resumen: ResumenImportacionExcel = { total: filas.length, creadas: 0, actualizadas: 0, errores: [] };
    for (const [i, fila] of filas.entries()) {
      const numeroFila = i + 2;
      const nombre = (fila.Nombre ?? '').trim();
      const nombreEmpresa = (fila.Empresa ?? '').trim();
      if (!nombre) {
        resumen.errores.push(`Fila ${numeroFila}: falta el nombre`);
        continue;
      }
      const empresa = empresaPorNombre.get(nombreEmpresa.toLowerCase());
      if (!empresa) {
        resumen.errores.push(`Fila ${numeroFila} (${nombre}): no existe la empresa "${nombreEmpresa}"`);
        continue;
      }
      // "Correo" puede traer varios (así los captura el CRM viejo): el primero es el principal,
      // el siguiente el alternativo si no viene su columna, y los demás se guardan en notas.
      const correoCelda = celda(fila, columnas, 'Correo');
      const correos = correosDe(correoCelda);
      const altCelda = celda(fila, columnas, 'Correo alternativo', 'Correo 2');
      const alternos = [...new Set([...correosDe(altCelda), ...correos.slice(1)])];
      const email = correos[0] ?? '';
      const sobrantes = [...correos.slice(1), ...alternos].filter((x) => x !== alternos[0] && x !== email);
      const existente =
        (email ? existentes.find((c) => c.empresaId === empresa.id && (c.email === email || c.emailAlternativo === email)) : undefined) ??
        existentes.find((c) => c.empresaId === empresa.id && c.nombre.toLowerCase() === nombre.toLowerCase());
      let notas = celda(fila, columnas, 'Notas') ?? existente?.notas ?? '';
      const faltan = [...new Set(sobrantes)].filter((x) => !notas.includes(x));
      if (faltan.length) notas = [notas, `Otros correos: ${faltan.join(', ')}`].filter(Boolean).join('\n');
      const datos = {
        nombre,
        empresaId: empresa.id,
        puesto: celda(fila, columnas, 'Puesto') ?? existente?.puesto ?? '',
        rfc: existente?.rfc ?? '',
        email: correoCelda === undefined ? (existente?.email ?? '') : email,
        emailAlternativo:
          altCelda === undefined && correos.length < 2 ? (existente?.emailAlternativo ?? '') : (alternos[0] ?? ''),
        telefono: celda(fila, columnas, 'Teléfono', 'Teléfono 1') ?? existente?.telefono ?? '',
        celular: celda(fila, columnas, 'Teléfono alternativo', 'Teléfono 2', 'Celular') ?? existente?.celular ?? '',
        notas,
      };
      try {
        const contacto = existente
          ? await this.contactos.actualizar(actor, existente.id, datos)
          : await this.contactos.crear(actor, datos);
        if (existente) resumen.actualizadas++;
        else {
          resumen.creadas++;
          existentes.push(contacto);
        }
        // "Rol en la empresa": Principal / Alternativo se marca en su empresa. Vacío solo
        // desmarca si este contacto era el marcado; así no se pisa a otro.
        const rol = celda(fila, columnas, 'Rol en la empresa')?.toLowerCase();
        if (rol !== undefined) {
          const e = await this.empresas.obtener(empresa.id);
          if (rol.startsWith('princ')) await this.empresas.marcarContactos(actor, e.id, { principal: contacto.id });
          else if (rol.startsWith('alter')) await this.empresas.marcarContactos(actor, e.id, { alternativo: contacto.id });
          else if (e.contactoPrincipalId === contacto.id) await this.empresas.marcarContactos(actor, e.id, { principal: null });
          else if (e.contactoAlternativoId === contacto.id) await this.empresas.marcarContactos(actor, e.id, { alternativo: null });
        }
      } catch (err) {
        resumen.errores.push(`Fila ${numeroFila} (${nombre}): ${err instanceof Error ? err.message : 'error desconocido'}`);
      }
    }
    return resumen;
  }
}
