import type { HojaExcel, IExcelIO } from '../../core/ports/services/IExcelIO.js';
import { COLUMNAS_EMPRESAS, type EmpresaExcelService, type ResumenImportacionExcel } from '../empresas/EmpresaExcelService.js';
import { COLUMNAS_CONTACTOS, type ContactoExcelService } from '../contactos/ContactoExcelService.js';
import { COLUMNAS_TICKETS, type TicketExcelService } from '../tickets/TicketExcelService.js';
import { ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Qué hojas incluir al exportar el `.xlsx` unificado. */
export interface SeleccionExcelUnificado {
  empresas: boolean;
  contactos: boolean;
  tickets: boolean;
}

/** Resultado de importar un `.xlsx` unificado, por hoja procesada. */
export interface ResumenImportUnificado {
  empresas?: ResumenImportacionExcel;
  contactos?: ResumenImportacionExcel;
}

const buscarHoja = (
  hojas: Record<string, Record<string, string>[]>,
  nombre: string,
): Record<string, string>[] | undefined => {
  const clave = Object.keys(hojas).find((k) => k.trim().toLowerCase() === nombre);
  return clave ? hojas[clave] : undefined;
};

/**
 * Export/import unificado: un solo `.xlsx` con una hoja por tipo (Empresas/Contactos/Tickets),
 * como el modal del CRM viejo — en vez de tres archivos sueltos, uno por módulo. Reutiliza la
 * lógica de cada `XxxExcelService` (columnas + mapeo de filas), solo compone el archivo.
 * Tickets es de solo exportación, igual que en `TicketExcelService` (paridad con el viejo).
 */
export class ExcelUnificadoService {
  constructor(
    private readonly empresaExcel: EmpresaExcelService,
    private readonly contactoExcel: ContactoExcelService,
    private readonly ticketExcel: TicketExcelService,
    private readonly excel: IExcelIO,
  ) {}

  async exportar(actor: SessionUser, incluir: SeleccionExcelUnificado): Promise<Buffer> {
    const hojas: HojaExcel[] = [];
    if (incluir.empresas && actor.permisos.includes('empresas:leer')) {
      hojas.push({ nombre: 'Empresas', columnas: COLUMNAS_EMPRESAS, filas: await this.empresaExcel.filasParaExportar() });
    }
    if (incluir.contactos && actor.permisos.includes('contactos:leer')) {
      hojas.push({ nombre: 'Contactos', columnas: COLUMNAS_CONTACTOS, filas: await this.contactoExcel.filasParaExportar() });
    }
    if (incluir.tickets && actor.permisos.includes('tickets:leer')) {
      hojas.push({
        nombre: 'Tickets',
        columnas: COLUMNAS_TICKETS,
        filas: await this.ticketExcel.filasParaExportar({ archivado: false }),
      });
    }
    if (hojas.length === 0) {
      throw new ValidationError('Selecciona al menos un tipo de dato (y ten permiso para verlo)');
    }
    return this.excel.escribirVarias(hojas);
  }

  async importar(actor: SessionUser, buffer: Buffer): Promise<ResumenImportUnificado> {
    const hojas = await this.excel.leerVarias(buffer);
    const resumen: ResumenImportUnificado = {};

    const filasEmpresas = buscarHoja(hojas, 'empresas');
    if (filasEmpresas && actor.permisos.includes('empresas:crear')) {
      resumen.empresas = await this.empresaExcel.importarFilas(actor, filasEmpresas);
    }
    const filasContactos = buscarHoja(hojas, 'contactos');
    if (filasContactos && actor.permisos.includes('contactos:crear')) {
      resumen.contactos = await this.contactoExcel.importarFilas(actor, filasContactos);
    }
    if (!resumen.empresas && !resumen.contactos) {
      throw new ValidationError('El archivo no trae hojas "Empresas"/"Contactos" reconocibles (o no tienes permiso)');
    }
    return resumen;
  }
}
