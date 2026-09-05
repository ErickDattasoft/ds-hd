/** Columna de una hoja de cálculo exportable/importable. */
export interface ColumnaExcel {
  header: string;
  key: string;
  width?: number;
}

/** Lectura/escritura de hojas `.xlsx` planas (fila = objeto `{ encabezado: texto }`). */
export interface IExcelIO {
  escribir(hoja: string, columnas: ColumnaExcel[], filas: Record<string, string>[]): Promise<Buffer>;
  leer(buffer: Buffer): Promise<Record<string, string>[]>;
}
