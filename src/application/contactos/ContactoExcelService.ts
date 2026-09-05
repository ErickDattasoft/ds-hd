import type { ListarContactosFiltro } from '../../core/ports/repositories/IContactoRepository.js';
import type { SessionUser } from '../shared/SessionUser.js';
import type { ContactoService } from './ContactoService.js';
import type { EmpresaService } from '../empresas/EmpresaService.js';
import type { ColumnaExcel, IExcelIO } from '../../core/ports/services/IExcelIO.js';
import type { ResumenImportacionExcel } from '../empresas/EmpresaExcelService.js';

const COLUMNAS: ColumnaExcel[] = [
  { header: 'Nombre', key: 'nombre', width: 26 },
  { header: 'Empresa', key: 'empresa', width: 30 },
  { header: 'Puesto', key: 'puesto', width: 20 },
  { header: 'Correo', key: 'email', width: 26 },
  { header: 'Teléfono', key: 'telefono' },
  { header: 'Celular', key: 'celular' },
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
    const [lista, empresas] = await Promise.all([this.contactos.listar(filtro), this.empresas.listar()]);
    const nombreEmpresa = new Map(empresas.map((e) => [e.id, e.nombre]));
    const filas = lista.map((c) => ({
      nombre: c.nombre,
      empresa: nombreEmpresa.get(c.empresaId) ?? '',
      puesto: c.puesto ?? '',
      email: c.email ?? '',
      telefono: c.telefono ?? '',
      celular: c.celular ?? '',
      activo: c.activo ? 'Sí' : 'No',
    }));
    return this.excel.escribir('Contactos', COLUMNAS, filas);
  }

  async importar(actor: SessionUser, buffer: Buffer): Promise<ResumenImportacionExcel> {
    const filas = await this.excel.leer(buffer);
    const [existentes, empresas] = await Promise.all([this.contactos.listar(), this.empresas.listar()]);
    const empresaPorNombre = new Map(empresas.map((e) => [e.nombre.toLowerCase(), e]));

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
      const email = (fila.Correo ?? '').trim();
      const datos = {
        nombre,
        empresaId: empresa.id,
        puesto: fila.Puesto ?? '',
        email,
        telefono: fila['Teléfono'] ?? '',
        celular: fila.Celular ?? '',
      };
      try {
        const existente = email
          ? existentes.find((c) => c.email === email)
          : existentes.find((c) => c.empresaId === empresa.id && c.nombre.toLowerCase() === nombre.toLowerCase());
        if (existente) {
          await this.contactos.actualizar(actor, existente.id, datos);
          resumen.actualizadas++;
        } else {
          await this.contactos.crear(actor, datos);
          resumen.creadas++;
        }
      } catch (err) {
        resumen.errores.push(`Fila ${numeroFila} (${nombre}): ${err instanceof Error ? err.message : 'error desconocido'}`);
      }
    }
    return resumen;
  }
}
