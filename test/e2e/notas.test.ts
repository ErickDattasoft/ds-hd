import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';

const SUP = { uid: 'u-sup', email: 'sup@dattasoft.mx', password: 'super12345', nombre: 'Sup', rol: 'supervisor' as const };
const AG = { uid: 'u-ag', email: 'ag@dattasoft.mx', password: 'agente12345', nombre: 'Agente', rol: 'agente' as const };

async function login(app: ReturnType<typeof makeTestApp>['app'], email: string, password: string) {
  const agent = request.agent(app);
  const page = await agent.get('/login');
  const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
  await agent.post('/login').type('form').send({ email, password, _csrf: csrf });
  return { agent, csrf };
}

describe('🗒️ Mis notas', () => {
  it('crear, escribir, cambiar color, ver, borrar; cada quien ve solo las suyas', async () => {
    const t = makeTestApp({ usuarios: [SUP, AG] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const post = (url: string, body: object) => agent.post(url).set('x-csrf-token', csrf).send(body);

    const nueva = await post('/app/notas', { texto: '' });
    expect(nueva.body.ok).toBe(true);
    const id = nueva.body.nota.id as string;
    const esc = await post('/app/notas', { id, texto: 'CANUL Y ASOCIADOS - ALFONSO 28/10/2026\nNo abre' });
    expect(esc.body.nota.texto).toContain('CANUL');
    await post('/app/notas', { id, color: 'morado' });
    await post('/app/notas', { id, color: 'no-existe' });
    expect(t.notaPersonalRepo.porUid.get(SUP.uid)).toEqual([
      expect.objectContaining({ id, color: 'morado', texto: 'CANUL Y ASOCIADOS - ALFONSO 28/10/2026\nNo abre' }),
    ]);

    const vista = await agent.get('/app/notas');
    expect(vista.status).toBe(200);
    expect(vista.text).toContain('nota--morado');
    expect(vista.text).toContain('CANUL Y ASOCIADOS');
    expect(vista.text).toContain('action="/app/tickets/captura"');

    const ag = await login(t.app, AG.email, AG.password);
    const suya = await ag.agent.get('/app/notas');
    expect(suya.text).not.toContain('CANUL Y ASOCIADOS');
    const ajena = await ag.agent.post('/app/notas').set('x-csrf-token', ag.csrf).send({ id, texto: 'hackeo' });
    expect(ajena.status).toBe(422);

    await post(`/app/notas/${id}/eliminar`, {});
    expect(t.notaPersonalRepo.porUid.get(SUP.uid)).toEqual([]);
  });

  it('una nota demasiado larga se rechaza', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const r = await agent.post('/app/notas').set('x-csrf-token', csrf).send({ texto: 'x'.repeat(10_001) });
    expect(r.status).toBe(422);
  });
});

describe('🗒️ Mis notas en el respaldo', () => {
  it('el respaldo las lleva y al restaurar regresan', async () => {
    const ADMIN = { uid: 'u-adm', email: 'adm@dattasoft.mx', password: 'admin12345', nombre: 'Admin', rol: 'admin' as const };
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent.post('/app/notas').set('x-csrf-token', csrf).send({ texto: 'EXAMEN FE', color: 'azul' });

    const res = await agent.get('/app/configuracion/backup/descargar');
    const datos = JSON.parse(res.text);
    expect(datos.notasPersonales).toEqual([
      { uid: ADMIN.uid, notas: [expect.objectContaining({ texto: 'EXAMEN FE', color: 'azul' })] },
    ]);

    t.notaPersonalRepo.porUid.clear();
    const r = await agent.post('/app/configuracion/backup/restaurar').set('x-csrf-token', csrf).send(datos);
    expect(r.body.ok).toBe(true);
    expect(t.notaPersonalRepo.porUid.get(ADMIN.uid)?.[0]).toMatchObject({ texto: 'EXAMEN FE', color: 'azul' });
  });
});
