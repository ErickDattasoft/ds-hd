import { describe, expect, it } from 'vitest';
import { leerListaInvitados } from '../../src/application/eventos/listaInvitados.js';

describe('leerListaInvitados («📄 Cargar lista» de Otros invitados)', () => {
  it('CSV con encabezado en otro orden y comillas', () => {
    const r = leerListaInvitados('Correo,Nombre,Personas,Celular\nana@x.mx,"López, Ana",2,999 123 4567\n,Luis Mena,1,9997654321\n');
    expect(r.errores).toEqual([]);
    expect(r.renglones).toEqual([
      { nombre: 'López, Ana', correo: 'ana@x.mx', telefono: '999 123 4567', personas: 2 },
      { nombre: 'Luis Mena', correo: null, telefono: '9997654321', personas: 1 },
    ]);
  });

  it('celdas pegadas de Excel (tabuladores) sin encabezado: adivina cada columna', () => {
    const r = leerListaInvitados('Familia Canul\tcanul@x.mx\t4\nPedro Uc\t+52 999 111 2233\n');
    expect(r.renglones).toEqual([
      { nombre: 'Familia Canul', correo: 'canul@x.mx', telefono: null, personas: 4 },
      { nombre: 'Pedro Uc', correo: null, telefono: '+52 999 111 2233', personas: null },
    ]);
  });

  it('punto y coma (Excel en español) y avisa los renglones malos', () => {
    const r = leerListaInvitados('nombre;correo;celular\nAna;ana@x.mx;\nSin datos;;\nMal;no-es-correo;\n;;\n');
    expect(r.renglones.map((x) => x.nombre)).toEqual(['Ana']);
    expect(r.errores).toEqual(['Renglón 3: «Sin datos» no trae correo ni celular', 'Renglón 4: «no-es-correo» no es un correo válido']);
  });
});
