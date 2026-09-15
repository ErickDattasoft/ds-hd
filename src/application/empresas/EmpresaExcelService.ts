import type { ListarEmpresasFiltro } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { SessionUser } from '../shared/SessionUser.js';
import type { EmpresaService } from './EmpresaService.js';
import type { ColumnaExcel, IExcelIO } from '../../core/ports/services/IExcelIO.js';

export const COLUMNAS_EMPRESAS: ColumnaExcel[] = [
  { header: 'Nombre', key: 'nombre', width: 30 },
  { header: 'RFC', key: 'rfc' },
  { header: 'Razón social', key: 'razonSocial', width: 30 },
  { header: 'Dirección', key: 'direccion', width: 30 },
  { header: 'Teléfono', key: 'telefono' },
  { header: 'Correo', key: 'email', width: 26 },
  { header: 'Sistemas contratados', key: 'sistemasContratados', width: 30 },
  { header: 'Activa', key: 'activa' },
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
      email: e.email ?? '',
      sistemasContratados: e.sistemasContratados.join(', '),
      activa: e.activa ? 'Sí' : 'No',
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

    const resumen: ResumenImportacionExcel = { total: filas.length, creadas: 0, actualizadas: 0, errores: [] };
    for (const [i, fila] of filas.entries()) {
      const numeroFila = i + 2;
      const nombre = (fila.Nombre ?? '').trim();
      if (!nombre) {
        resumen.errores.push(`Fila ${numeroFila}: falta el nombre`);
        continue;
      }
      const datos = {
        nombre,
        rfc: fila.RFC ?? '',
        razonSocial: fila['Razón social'] ?? '',
        direccion: fila['Dirección'] ?? '',
        telefono: fila['Teléfono'] ?? '',
        email: fila.Correo ?? '',
        sistemasContratados: (fila['Sistemas contratados'] ?? '')
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean),
      };
      try {
        const existente = porNombre.get(nombre.toLowerCase());
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
