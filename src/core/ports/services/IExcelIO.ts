/** Columna de una hoja de cálculo exportable/importable. */
export interface ColumnaExcel {
  header: string;
  key: string;
  width?: number;
}

/** Una hoja completa: nombre + columnas + filas. */
export interface HojaExcel {
  nombre: string;
  columnas: ColumnaExcel[];
  filas: Record<string, string>[];
}

/** Lectura/escritura de archivos `.xlsx`, de una sola hoja o de varias (un archivo unificado). */
export interface IExcelIO {
  escribir(hoja: string, columnas: ColumnaExcel[], filas: Record<string, string>[]): Promise<Buffer>;
  leer(buffer: Buffer): Promise<Record<string, string>[]>;
  /** Varias hojas en un solo archivo `.xlsx` — para el export/import unificado. */
  escribirVarias(hojas: HojaExcel[]): Promise<Buffer>;
  /** Todas las hojas del archivo, indexadas por nombre. */
  leerVarias(buffer: Buffer): Promise<Record<string, Record<string, string>[]>>;
}
