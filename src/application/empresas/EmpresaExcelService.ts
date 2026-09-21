import type { ListarEmpresasFiltro } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { SessionUser } from '../shared/SessionUser.js';
import type { EmpresaService } from './EmpresaService.js';
import type { ColumnaExcel, IExcelIO } from '../../core/ports/services/IExcelIO.js';
import { celda, columnasDe, correosDe } from '../excel/celdas.js';

export const COLUMNAS_EMPRESAS: ColumnaExcel[] = [
  { header: 'Nombre', key: 'nombre', width: 30 },
  { header: 'RFC', key: 'rfc' },
  { header: 'Razón social', key: 'razonSocial', width: 30 },
  { header: 'Dirección', key: 'direccion', width: 30 },
  { header: 'Teléfono', key: 'telefono' },
  { header: 'Teléfono alternativo', key: 'telefonoAlternativo' },
  { header: 'Correo', key: 'email', width: 26 },
  { header: 'Correo alternativo', key: 'emailAlternativo', width: 26 },
  { header: 'Sistemas contratados', key: 'sistemasContratados', width: 30 },
  { header: 'Activa', key: 'activa' },
  { header: 'Notas', key: 'notas', width: 30 },
];

/** Resumen de una importación de Excel. */
export interface ResumenImportacionExcel {
  total: number;
  creadas: number;
  actualizadas: number;
  errores: string[];
}

/** Import/export de Empresas en Excel (`.xlsx`). */
export class EmpresaExcelService {
  constructor(
    private readonly empresas: EmpresaService,
    private readonly excel: IExcelIO,
  ) {}

  async exportar(filtro?: ListarEmpresasFiltro): Promise<Buffer> {
    const filas = await this.filasParaExportar(filtro);
    return this.excel.escribir('Empresas', COLUMNAS_EMPRESAS, filas);
  }

  /** Filas listas para una hoja "Empresas" — reutilizado por el export unificado. */
  async filasParaExportar(filtro?: ListarEmpresasFiltro): Promise<Record<string, string>[]> {
    const lista = await this.empresas.listar(filtro);
    return lista.map((e) => ({
      nombre: e.nombre,
      rfc: e.rfc ?? '',
      razonSocial: e.razonSocial ?? '',
      direccion: e.direccion ?? '',
      telefono: e.telefono ?? '',
      telefonoAlternativo: e.telefonoAlternativo ?? '',
      email: e.email ?? '',
      emailAlternativo: e.emailAlternativo ?? '',
      sistemasContratados: e.sistemasContratados.join(', '),
      activa: e.activa ? 'Sí' : 'No',
      notas: e.notas ?? '',
    }));
  }

  async importar(actor: SessionUser, buffer: Buffer): Promise<ResumenImportacionExcel> {
    const filas = await this.excel.leer(buffer);
    return this.importarFilas(actor, filas);
  }

  /** Procesa filas ya leídas (de una hoja "Empresas") — reutilizado por el import unificado. */
  async importarFilas(actor: SessionUser, filas: Record<string, string>[]): Promise<ResumenImportacionExcel> {
    const existentes = await this.empresas.listar();
    const porNombre = new Map(existentes.map((e) => [e.nombre.toLowerCase(), e]));

    const columnas = columnasDe(filas);
    const resumen: ResumenImportacionExcel = { total: filas.length, creadas: 0, actualizadas: 0, errores: [] };
    for (const [i, fila] of filas.entries()) {
      const numeroFila = i + 2;
      // "Empresa", "Teléfono 1/2" y "Correo 2" son los encabezados del Excel del CRM viejo.
      const nombre = celda(fila, columnas, 'Nombre', 'Empresa') ?? '';
      if (!nombre) {
        resumen.errores.push(`Fila ${numeroFila}: falta el nombre`);
        continue;
      }
      const existente = porNombre.get(nombre.toLowerCase());
      // Varios correos en una celda: primero principal, luego alternativo, el resto a notas.
      const correoCelda = celda(fila, columnas, 'Correo');
      const altCelda = celda(fila, columnas, 'Correo alternativo', 'Correo 2');
      const correos = [...new Set([...correosDe(correoCelda), ...correosDe(altCelda)])];
      const hayCorreos = correoCelda !== undefined || altCelda !== undefined;
      let notas = celda(fila, columnas, 'Notas') ?? existente?.notas ?? '';
      const faltan = correos.slice(2).filter((x) => !notas.includes(x));
      if (faltan.length) notas = [notas, `Otros correos: ${faltan.join(', ')}`].filter(Boolean).join('\n');
      const sistemas = celda(fila, columnas, 'Sistemas contratados');
      const datos = {
        nombre,
        rfc: celda(fila, columnas, 'RFC') ?? existente?.rfc ?? '',
        razonSocial: celda(fila, columnas, 'Razón social') ?? existente?.razonSocial ?? '',
        direccion: celda(fila, columnas, 'Dirección') ?? existente?.direccion ?? '',
        telefono: celda(fila, columnas, 'Teléfono', 'Teléfono 1') ?? existente?.telefono ?? '',
        telefonoAlternativo: celda(fila, columnas, 'Teléfono alternativo', 'Teléfono 2') ?? existente?.telefonoAlternativo ?? '',
        email: hayCorreos ? (correos[0] ?? '') : (existente?.email ?? ''),
        emailAlternativo: hayCorreos ? (correos[1] ?? '') : (existente?.emailAlternativo ?? ''),
        sistemasContratados:
          sistemas === undefined
            ? (existente?.sistemasContratados ?? [])
            : sistemas
                .split(/[,;]/)
                .map((s) => s.trim())
                .filter(Boolean),
        // Lo que este Excel no maneja se conserva tal cual al actualizar.
        vigencias: existente?.vigencias,
        versionesInstaladas: existente?.versionesInstaladas,
        camposExtra: existente?.camposExtra,
        notas,
      };
      try {
        if (existente) {
          await this.empresas.actualizar(actor, existente.id, datos);
          resumen.actualizadas++;
        } else {
          const creada = await this.empresas.crear(actor, datos);
          porNombre.set(nombre.toLowerCase(), creada);
          resumen.creadas++;
        }
      } catch (err) {
        resumen.errores.push(`Fila ${numeroFila} (${nombre}): ${err instanceof Error ? err.message : 'error desconocido'}`);
      }
    }
    return resumen;
  }
}
