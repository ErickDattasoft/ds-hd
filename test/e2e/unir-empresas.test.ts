import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';
import { Empresa } from '../../src/core/entities/Empresa.js';
import { Contacto } from '../../src/core/entities/Contacto.js';
import { Tarea } from '../../src/core/entities/Tarea.js';

const ADMIN = { uid: 'u-a', email: 'admin@dattasoft.mx', password: 'admin12345', nombre: 'Admin', rol: 'admin' as const };
const AGENTE = { uid: 'u-g', email: 'ag@dattasoft.mx', password: 'agente12345', nombre: 'Agente', rol: 'agente' as const };

async function login(app: ReturnType<typeof makeTestApp>['app'], email: string, password: string) {
  const agent = request.agent(app);
  const page = await agent.get('/login');
  const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
  await agent.post('/login').type('form').send({ email, password, _csrf: csrf });
  return { agent, csrf };
}

function sembrar(t: ReturnType<typeof makeTestApp>) {
  t.empresaRepo.items.set(
    'buena',
    new Empresa({ id: 'buena', nombre: 'ACME SA de CV', telefono: '5551234', sistemasContratados: ['Contabilidad'] }),
  );
  t.empresaRepo.items.set(
    'dup',
    new Empresa({
      id: 'dup',
      nombre: 'Acme',
      rfc: 'ACM010101ABC',
      telefono: '999',
      sistemasContratados: ['Nóminas'],
      vigencias: { Nóminas: '2027-01-31' },
      contactoPrincipalId: 'c1',
      notas: 'Paga en efectivo',
    }),
  );
  t.empresaRepo.items.set('otra', new Empresa({ id: 'otra', nombre: 'Zeta Industrial' }));
  t.contactoRepo.items.set('c1', new Contacto({ id: 'c1', nombre: 'Ana Pérez', empresaId: 'dup', email: 'ana@acme.mx' }));
}

describe('unir empresas duplicadas', () => {
  it('la pantalla enseña lo que tiene la duplicada y propone primero las parecidas', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    sembrar(t);
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);

    const ficha = await agent.get('/app/empresas/dup');
    expect(ficha.text).toContain('/app/empresas/dup/unir');

    const res = await agent.get('/app/empresas/dup/unir');
    expect(res.status).toBe(200);
    expect(res.text).toContain('1 contacto(s)');
    expect(res.text).toContain('Se parecen');
    const parecidas = res.text.slice(res.text.indexOf('Se parecen'), res.text.indexOf('Todas las empresas'));
    expect(parecidas).toContain('ACME SA DE CV');
    expect(parecidas).not.toContain('ZETA INDUSTRIAL');
  });

  it('pasa contactos y datos faltantes a la buena y archiva la duplicada', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    sembrar(t);
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const res = await agent.post('/app/empresas/dup/unir').type('form').send({ _csrf: csrf, destinoId: 'buena' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/^\/app\/empresas\/buena\?aviso=/);

    expect(t.contactoRepo.items.get('c1')!.empresaId).toBe('buena');
    const buena = t.empresaRepo.items.get('buena')!;
    expect(buena.rfc).toBe('ACM010101ABC'); // le faltaba: se toma de la duplicada
    expect(buena.telefono).toBe('5551234'); // ya tenía: no se cambia
    expect(buena.sistemasContratados).toEqual(['Contabilidad', 'Nóminas']);
    expect(buena.vigencias).toEqual({ Nóminas: '2027-01-31' });
    expect(buena.contactoPrincipalId).toBe('c1');
    expect(buena.notas).toContain('Paga en efectivo');

    const dup = t.empresaRepo.items.get('dup')!;
    expect(dup.activa).toBe(false);
    expect(dup.contactoPrincipalId).toBeNull();
    expect(dup.notas).toContain('Unida con ACME SA DE CV');
    expect(t.bitacoraRepo.entradas.some((e) => e.accion === 'unir')).toBe(true);

    const ficha = await agent.get(res.headers.location as string);
    expect(ficha.text).toContain('Empresas unidas');
    expect(ficha.text).toContain('1 contacto(s)');
  });

  it('no deja unir una empresa consigo misma ni a quien no puede eliminar empresas', async () => {
    const t = makeTestApp({ usuarios: [ADMIN, AGENTE] });
    sembrar(t);
    const admin = await login(t.app, ADMIN.email, ADMIN.password);
    const misma = await admin.agent.post('/app/empresas/dup/unir').type('form').send({ _csrf: admin.csrf, destinoId: 'dup' });
    expect(misma.status).toBe(422);
    expect(misma.text).toContain('no se puede unir consigo misma');
    expect(t.empresaRepo.items.get('dup')!.activa).toBe(true);

    const agente = await login(t.app, AGENTE.email, AGENTE.password);
    const res = await agente.agent.post('/app/empresas/dup/unir').type('form').send({ _csrf: agente.csrf, destinoId: 'buena' });
    expect(res.status).toBe(403);
    expect(t.contactoRepo.items.get('c1')!.empresaId).toBe('dup');
  });

  it('si la misma persona estaba en las dos, al unir queda un solo contacto (el principal) con lo que le faltaba', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    sembrar(t);
    t.empresaRepo.items.get('buena')!.contactoPrincipalId = 'c0';
    t.contactoRepo.items.set('c0', new Contacto({ id: 'c0', nombre: 'ANA PEREZ', empresaId: 'buena', email: 'ana@acme.mx' }));
    t.contactoRepo.items.get('c1')!.telefono = '9991112233';
    await t.tareaRepo.save(new Tarea({ id: 't1', titulo: 'Llamar', empresaId: 'dup', contactoId: 'c1', asignadoAUid: ADMIN.uid }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const res = await agent.post('/app/empresas/dup/unir').type('form').send({ _csrf: csrf, destinoId: 'buena' });
    expect(decodeURIComponent(String(res.headers.location))).toContain('1 contacto(s) que estaban en las dos se juntaron en uno');

    const activos = [...t.contactoRepo.items.values()].filter((c) => c.activo);
    expect(activos.map((c) => c.id)).toEqual(['c0']);
    expect(activos[0]!.telefono).toBe('9991112233');
    expect(t.contactoRepo.items.get('c1')!.activo).toBe(false);
    expect(t.empresaRepo.items.get('buena')!.contactoPrincipalId).toBe('c0');
    expect(t.empresaRepo.items.get('buena')!.contactoAlternativoId).toBeNull();
    expect(t.tareaRepo.items.get('t1')!.contactoId).toBe('c0');
  });

  it('la ficha avisa de contactos repetidos y los junta con un clic', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'ACME', contactoPrincipalId: 'b' }));
    t.contactoRepo.items.set('a', new Contacto({ id: 'a', nombre: 'Laura Méndez', empresaId: 'e1', email: 'laura@acme.mx', celular: '555' }));
    t.contactoRepo.items.set('b', new Contacto({ id: 'b', nombre: 'Lau M.', empresaId: 'e1', email: 'LAURA@acme.mx' }));
    t.contactoRepo.items.set('c', new Contacto({ id: 'c', nombre: 'Pedro Ruiz', empresaId: 'e1' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const ficha = await agent.get('/app/empresas/e1');
    expect(ficha.text).toContain('Contactos repetidos');
    expect(ficha.text).toContain('Juntar repetidos');

    const res = await agent.post('/app/empresas/e1/contactos/juntar').type('form').send({ _csrf: csrf });
    expect(res.status).toBe(302);
    expect(t.contactoRepo.items.get('b')!.activo).toBe(true); // el Principal se queda
    expect(t.contactoRepo.items.get('b')!.celular).toBe('555');
    expect(t.contactoRepo.items.get('a')!.activo).toBe(false);
    expect(t.contactoRepo.items.get('c')!.activo).toBe(true);

    const despues = await agent.get(res.headers.location as string);
    expect(despues.text).toContain('1 contacto(s) repetido(s) se juntaron');
    expect(despues.text).not.toContain('Juntar repetidos');
    expect(despues.text).not.toContain('Laura Méndez');
  });
});
