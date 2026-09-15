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

  const HOJAS = [
    { nombre: 'Empresas', columnas: COLUMNAS, filas: [{ nombre: 'ACME', email: 'a@acme.com' }] },
    {
      nombre: 'Contactos',
      columnas: [{ header: 'Nombre', key: 'nombre' }, { header: 'Empresa', key: 'empresa' }],
      filas: [{ nombre: 'Juan', empresa: 'ACME' }, { nombre: 'Ana & Cía', empresa: '<ACME>' }],
    },
    { nombre: 'Tickets', columnas: [{ header: 'Folio', key: 'folio' }], filas: [] },
  ];

  it('escribirVarias/leerVarias: roundtrip con varias hojas, cada una con su nombre y filas', async () => {
    const io = new FflateExcelIO();
    const buffer = await io.escribirVarias(HOJAS);
    const leidas = await io.leerVarias(buffer);
    expect(Object.keys(leidas)).toEqual(['Empresas', 'Contactos', 'Tickets']);
    expect(leidas.Empresas).toEqual([{ Nombre: 'ACME', Correo: 'a@acme.com' }]);
    expect(leidas.Contactos).toEqual([
      { Nombre: 'Juan', Empresa: 'ACME' },
      { Nombre: 'Ana & Cía', Empresa: '<ACME>' },
    ]);
    expect(leidas.Tickets).toEqual([]);
  });

  it('leer() de un archivo multi-hoja regresa solo la primera hoja (compatibilidad hacia atrás)', async () => {
    const io = new FflateExcelIO();
    const buffer = await io.escribirVarias(HOJAS);
    expect(await io.leer(buffer)).toEqual([{ Nombre: 'ACME', Correo: 'a@acme.com' }]);
  });

  it('multi-hoja: un archivo de FflateExcelIO lo lee ExceljsExcelIO y viceversa', async () => {
    const deFflate = await new FflateExcelIO().escribirVarias(HOJAS);
    const leidoPorExceljs = await new ExceljsExcelIO().leerVarias(deFflate);
    expect(Object.keys(leidoPorExceljs)).toEqual(['Empresas', 'Contactos', 'Tickets']);
    expect(leidoPorExceljs.Contactos).toEqual([
      { Nombre: 'Juan', Empresa: 'ACME' },
      { Nombre: 'Ana & Cía', Empresa: '<ACME>' },
    ]);

    const deExceljs = await new ExceljsExcelIO().escribirVarias(HOJAS);
    const leidoPorFflate = await new FflateExcelIO().leerVarias(deExceljs);
    expect(Object.keys(leidoPorFflate)).toEqual(['Empresas', 'Contactos', 'Tickets']);
    expect(leidoPorFflate.Empresas).toEqual([{ Nombre: 'ACME', Correo: 'a@acme.com' }]);
  });
});
