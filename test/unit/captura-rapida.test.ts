import { describe, expect, it } from 'vitest';
import { descripcionDeNota, fechaDeTexto, interpretarNota, separarNotas } from '../../src/application/tickets/capturaRapida.js';

const CAT = {
  empresas: [
    { id: 'e1', nombre: 'CANUL Y ASOCIADOS' },
    { id: 'e2', nombre: 'GRUPO ROCASA PENINSULAR SA DE CV' },
    { id: 'e3', nombre: 'CEDIME' },
    { id: 'e4', nombre: 'TAMBS' },
  ],
  contactos: [
    { nombre: 'Lily Flores', email: 'lily@tambs.mx', empresaId: 'e4' },
    { nombre: 'Cintia Ruiz', email: null, empresaId: 'e3' },
  ],
  agentes: [{ uid: 'a1', nombre: 'Alfonso Pérez' }, { uid: 'a2', nombre: 'Erick Casas' }],
  sistemas: ['Contabilidad', 'Factura Electrónica', 'Nóminas'],
};

const NOTAS = `1/11/2026
CANUL Y ASOCIADOS - ALFONSO 28/10/2026

Canulyasociados.ddns.net
administrador

28/10/2026
Grupo Rocasa Peninsular - ALFONSO 21/10/2026

Contador Alberto
Se instaló el 22/10/2026 la actualización

GRUPO ROCASA PENINSULAR - ALFONSO 26/10/2026

Visor de documentos digitales - Dañado
DRA CINTIA RUIZ - CEDIME - ALFONSO - 21/10/2026 -  26/10/2026

FACTURA ELECTRONICA
Lily Flores - 19/10/2026  - Alfonso TRANSFORMADORES, ARRANCADORES, MOTORES Y BOMBAS - TAMBS
9992009706`;

describe('captura rápida de notas', () => {
  it('separa las notas por su encabezado con fecha, sin partir por fechas del cuerpo', () => {
    const notas = separarNotas(NOTAS);
    expect(notas).toHaveLength(5);
    expect(notas[0]).toMatch(/^CANUL/);
    expect(notas[1]).toContain('Se instaló el 22/10/2026');
    expect(notas[2]).toContain('Visor de documentos digitales - Dañado');
  });

  it('una línea --- también separa', () => {
    expect(separarNotas('Uno sin fecha\nalgo\n---\nDos\notra cosa')).toHaveLength(2);
  });

  it('reconoce empresa, agente, fecha, asunto y sistema', () => {
    const [canul, rocasa, rocasa2, cedime, tambs] = separarNotas(NOTAS).map((n) => interpretarNota(n, CAT));
    expect(canul).toMatchObject({ empresaId: 'e1', agenteUid: 'a1', fecha: '2026-10-28', asunto: 'Canulyasociados.ddns.net' });
    expect(rocasa).toMatchObject({ empresaId: 'e2', fecha: '2026-10-21', asunto: 'Contador Alberto' });
    expect(rocasa2).toMatchObject({ empresaId: 'e2', asunto: 'Visor de documentos digitales - Dañado' });
    expect(cedime).toMatchObject({ empresaId: 'e3', agenteUid: 'a1', fecha: '2026-10-21', sistema: 'Factura Electrónica' });
    expect(cedime!.solicitadoPor).toBe('DRA CINTIA RUIZ');
    expect(tambs).toMatchObject({ empresaId: 'e4', agenteUid: 'a1', contactoNombre: 'Lily Flores', contactoCorreo: 'lily@tambs.mx' });
  });

  it('empresa desconocida queda vacía (para elegirla en la revisión)', () => {
    const n = interpretarNota('FERRETERIA LUPITA - ERICK 03/11/2026\nNo timbra', CAT);
    expect(n.empresaId).toBeNull();
    expect(n.agenteUid).toBe('a2');
    expect(n.solicitadoPor).toBe('FERRETERIA LUPITA');
  });

  it('fechas y descripción', () => {
    expect(fechaDeTexto('5/1/26')).toBe('2026-01-05');
    expect(fechaDeTexto('31/02/2026')).toBeNull();
    expect(descripcionDeNota('a <b>\nb\n\nc')).toBe('<p>a &lt;b&gt;<br>b</p><p>c</p>');
  });
});
