import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';

const SUP = { uid: 'u-sup', email: 'sup@dattasoft.mx', password: 'super12345', nombre: 'Sup', rol: 'supervisor' as const };
const CLI = { uid: 'u-cli', email: 'cli@empresa.com', password: 'cliente123', nombre: 'Cliente Uno', rol: 'cliente' as const, empresaId: 'emp-1' };

async function login(app: ReturnType<typeof makeTestApp>['app'], email: string, password: string) {
  const agent = request.agent(app);
  const page = await agent.get('/login');
  const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
  await agent.post('/login').type('form').send({ email, password, _csrf: csrf });
  return { agent, csrf };
}

describe('buzón 🔔 de respuestas de clientes', () => {
  it('la respuesta del cliente aparece en la campana y sale al abrir el ticket', async () => {
    const t = makeTestApp({ usuarios: [SUP, CLI] });
    const cli = await login(t.app, CLI.email, CLI.password);
    const crear = await cli.agent
      .post('/portal/tickets')
      .type('form')
      .send({ _csrf: cli.csrf, asunto: 'No timbra', descripcion: 'Falla al timbrar', tipo: 'General', prioridad: 'Media' });
    const id = String(crear.headers.location).split('/').pop()!;

    const sup = await login(t.app, SUP.email, SUP.password);
    expect((await sup.agent.get('/app/tickets/respuestas/contador')).body.n).toBe(0);

    await cli.agent.post(`/portal/tickets/${id}/responder`).type('form').send({ _csrf: cli.csrf, cuerpo: 'Sigue fallando' });

    const contador = await sup.agent.get('/app/tickets/respuestas/contador');
    expect(contador.body).toMatchObject({ n: 1, ultima: { ticketId: id, autorNombre: CLI.nombre, extracto: 'Sigue fallando' } });
    const lista = await sup.agent.get('/app/tickets/respuestas');
    expect(lista.text).toContain('Sigue fallando');
    expect(lista.text).toContain('data-campana-respuestas');

    // Precargar o pintar el detalle no lo marca: lo hace el navegador al mostrarlo.
    const detalle = await sup.agent.get(`/app/tickets/${id}`);
    expect(detalle.text).toContain('data-chat-hilo');
    expect(detalle.text).toContain('Sigue fallando');
    expect(t.respuestaSinLeerRepo.items.size).toBe(1);

    expect((await sup.agent.post(`/app/tickets/${id}/leida`).set('x-csrf-token', sup.csrf)).status).toBe(204);
    expect((await sup.agent.get('/app/tickets/respuestas/contador')).body.n).toBe(0);
  });

  it('contestarle al cliente también lo quita; «marcar todas» vacía el buzón', async () => {
    const t = makeTestApp({ usuarios: [SUP, CLI] });
    const cli = await login(t.app, CLI.email, CLI.password);
    const ids: string[] = [];
    for (const asunto of ['Uno', 'Dos']) {
      const crear = await cli.agent
        .post('/portal/tickets')
        .type('form')
        .send({ _csrf: cli.csrf, asunto, descripcion: 'Falla al timbrar', tipo: 'General', prioridad: 'Media' });
      const id = String(crear.headers.location).split('/').pop()!;
      ids.push(id);
      await cli.agent.post(`/portal/tickets/${id}/responder`).type('form').send({ _csrf: cli.csrf, cuerpo: `hola ${asunto}` });
    }
    const sup = await login(t.app, SUP.email, SUP.password);
    expect(t.respuestaSinLeerRepo.items.size).toBe(2);

    await sup.agent.post(`/app/tickets/${ids[0]}/nota`).type('form').send({ _csrf: sup.csrf, cuerpo: 'Ya lo revisamos', tipo: 'publica' });
    expect([...t.respuestaSinLeerRepo.items.keys()]).toEqual([ids[1]]);

    await sup.agent.post('/app/tickets/respuestas/leidas').type('form').send({ _csrf: sup.csrf });
    expect(t.respuestaSinLeerRepo.items.size).toBe(0);
  });
});
