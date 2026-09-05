import ExcelJS from 'exceljs';
import type { ColumnaExcel, IExcelIO } from '../../core/ports/services/IExcelIO.js';

/** Implementación de {@link IExcelIO} sobre la librería `exceljs`. */
export class ExceljsExcelIO implements IExcelIO {
  async escribir(hoja: string, columnas: ColumnaExcel[], filas: Record<string, string>[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(hoja);
    ws.columns = columnas.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 22 }));
    for (const fila of filas) ws.addRow(fila);
    ws.getRow(1).font = { bold: true };
    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async leer(buffer: Buffer): Promise<Record<string, string>[]> {
    const wb = new ExcelJS.Workbook();
    // exceljs declara `interface Buffer extends ArrayBuffer` en su .d.ts, que choca por fusión
    // de declaraciones con el Buffer real de Node (extiende Uint8Array) — cast documentado.
    await wb.xlsx.load(buffer as unknown as never);
    const ws = wb.worksheets[0];
    if (!ws) return [];

    const headers: string[] = [];
    ws.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
      headers[col] = String(cell.value ?? '').trim();
    });

    const filas: Record<string, string>[] = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj: Record<string, string> = {};
      let tieneAlgo = false;
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const header = headers[col];
        if (!header) return;
        const v = celdaATexto(cell.value);
        obj[header] = v;
        if (v) tieneAlgo = true;
      });
      if (tieneAlgo) filas.push(obj);
    });
    return filas;
  }
}

function celdaATexto(v: ExcelJS.CellValue): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if ('text' in v) return String((v as { text: unknown }).text ?? '');
    if ('result' in v) return String((v as { result: unknown }).result ?? '');
    if ('richText' in v) {
      return (v as { richText: { text: string }[] }).richText.map((r) => r.text).join('');
    }
  }
  return String(v);
}
