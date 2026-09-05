import { describe, expect, it } from 'vitest';
import { FflateExcelIO } from '../../src/infrastructure/excel/FflateExcelIO.js';
import { ExceljsExcelIO } from '../../src/infrastructure/excel/ExceljsExcelIO.js';

const COLUMNAS = [
  { header: 'Nombre', key: 'nombre' },
  { header: 'Correo', key: 'email' },
];

describe('FflateExcelIO', () => {
  it('escribe y relee sus propios archivos (roundtrip)', async () => {
    const io = new FflateExcelIO();
    const buffer = await io.escribir('Datos', COLUMNAS, [
      { nombre: 'Empresa & Cía', email: 'a@b.com' },
      { nombre: 'Con <etiqueta>', email: '' },
    ]);
    const filas = await io.leer(buffer);
    expect(filas).toEqual([
      { Nombre: 'Empresa & Cía', Correo: 'a@b.com' },
      { Nombre: 'Con <etiqueta>', Correo: '' },
    ]);
  });

  it('salta filas totalmente vacías', async () => {
    const io = new FflateExcelIO();
    const buffer = await io.escribir('Datos', COLUMNAS, [{ nombre: '', email: '' }, { nombre: 'X', email: '' }]);
    const filas = await io.leer(buffer);
    expect(filas).toEqual([{ Nombre: 'X', Correo: '' }]);
  });

  it('lee un .xlsx real generado por exceljs (shared strings, no inline)', async () => {
    const escrito = await new ExceljsExcelIO().escribir('Datos', COLUMNAS, [
      { nombre: 'Desde exceljs', email: 'x@y.com' },
    ]);
    const filas = await new FflateExcelIO().leer(escrito);
    expect(filas).toEqual([{ Nombre: 'Desde exceljs', Correo: 'x@y.com' }]);
  });

  it('un archivo escrito por FflateExcelIO también lo puede leer ExceljsExcelIO', async () => {
    const escrito = await new FflateExcelIO().escribir('Datos', COLUMNAS, [
      { nombre: 'Desde fflate', email: 'z@w.com' },
    ]);
    const filas = await new ExceljsExcelIO().leer(escrito);
    expect(filas).toEqual([{ Nombre: 'Desde fflate', Correo: 'z@w.com' }]);
  });
});
