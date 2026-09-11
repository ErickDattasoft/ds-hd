import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';

const SUP = { uid: 'u-sup', email: 'sup@dattasoft.mx', password: 'super12345', nombre: 'Sup', rol: 'supervisor' as const };
const AG = { uid: 'u-ag', email: 'ag@dattasoft.mx', password: 'agente12345', nombre: 'Agente', rol: 'agente' as const };
const CLI = { uid: 'u-cli', email: 'cli@empresa.com', password: 'cliente123', nombre: 'Cliente Uno', rol: 'cliente' as const, empresaId: 'emp-1' };
const CLI2 = { uid: 'u-cli2', email: 'otra@empresa.com', password: 'cliente123', nombre: 'Cliente Dos', rol: 'cliente' as const, empresaId: 'emp-2' };

async function login(app: ReturnType<typeof makeTestApp>['app'], email: string, password: string) {
  const agent = request.agent(app);
  const page = await agent.get('/login');
  const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
  await agent.post('/login').type('form').send({ email, password, _csrf: csrf });
  return { agent, csrf };
}

describe('portal de cliente', () => {
  it('el cliente crea un ticket y lo ve; queda como canal=portal ligado a su empresa', async () => {
    const t = makeTestApp({ usuarios: [CLI] });
    const { agent, csrf } = await login(t.app, CLI.email, CLI.password);

    const portal = await agent.get('/portal');
    expect(portal.status).toBe(200);
    expect(portal.text).toContain('data-logo-img'); // logo de empresa en el sidebar del portal
    expect((await agent.get('/portal/tickets/nuevo')).status).toBe(200);

    const crear = await agent.post('/portal/tickets').type('form').send({
      _csrf: csrf,
      asunto: 'No puedo entrar al sistema',
      descripcion: 'Me marca contraseña incorrecta desde la mañana',
      tipo: 'Soporte Técnico',
      prioridad: 'Alta',
    });
    expect(crear.status).toBe(302);
    const id = String(crear.headers.location).split('/').pop()!;

    const ticket = t.ticketStore.tickets.get(id)!;
    expect(ticket.canal).toBe('portal');
    expect(ticket.solicitanteUid).toBe(CLI.uid);
    expect(ticket.empresaId).toBe('emp-1');
    expect(ticket.contactoCorreo).toBe(CLI.email);

    const detalle = await agent.get(`/portal/tickets/${id}`);
    expect(detalle.status).toBe(200);
    expect(detalle.text).toContain('No puedo entrar al sistema');
  });

  it('el cliente ve las respuestas públicas del staff pero NUNCA las notas internas', async () => {
    const t = makeTestApp({ usuarios: [SUP, CLI] });
    const cli = await login(t.app, CLI.email, CLI.password);
    const crear = await cli.agent
      .post('/portal/tickets')
      .type('form')
      .send({ _csrf: cli.csrf, asunto: 'Duda de facturación', descripcion: 'No entiendo un cargo del recibo', tipo: 'General', prioridad: 'Media' });
    const id = String(crear.headers.location).split('/').pop()!;

    const sup = await login(t.app, SUP.email, SUP.password);
    await sup.agent
      .post(`/app/tickets/${id}/nota`)
      .type('form')
      .send({ _csrf: sup.csrf, cuerpo: 'RESPUESTA-PUBLICA-VISIBLE', tipo: 'publica' });
    await sup.agent
      .post(`/app/tickets/${id}/nota`)
      .type('form')
      .send({ _csrf: sup.csrf, cuerpo: 'NOTA-INTERNA-SECRETA', tipo: 'interna' });

    const detalle = await cli.agent.get(`/portal/tickets/${id}`);
    expect(detalle.text).toContain('RESPUESTA-PUBLICA-VISIBLE');
    expect(detalle.text).not.toContain('NOTA-INTERNA-SECRETA');
    // tampoco debe filtrarse en el seguimiento que existe una nota interna
    expect(detalle.text).not.toContain('interna');
  });

  it('un cliente no puede ver el ticket de otro cliente (404)', async () => {
    const t = makeTestApp({ usuarios: [CLI, CLI2] });
    const cli = await login(t.app, CLI.email, CLI.password);
    const crear = await cli.agent
      .post('/portal/tickets')
      .type('form')
      .send({ _csrf: cli.csrf, asunto: 'Privado de CLI', descripcion: 'contenido confidencial del cliente uno', tipo: 'General', prioridad: 'Baja' });
    const id = String(crear.headers.location).split('/').pop()!;

    const cli2 = await login(t.app, CLI2.email, CLI2.password);
    const intento = await cli2.agent.get(`/portal/tickets/${id}`);
    expect(intento.status).toBe(404);
    expect(intento.text).not.toContain('contenido confidencial');
  });

  it('al responder el cliente, se notifica al agente asignado', async () => {
    const t = makeTestApp({ usuarios: [SUP, AG, CLI] });
    const cli = await login(t.app, CLI.email, CLI.password);
    const crear = await cli.agent
      .post('/portal/tickets')
      .type('form')
      .send({ _csrf: cli.csrf, asunto: 'Seguimiento', descripcion: 'necesito una actualización del caso', tipo: 'General', prioridad: 'Media' });
    const id = String(crear.headers.location).split('/').pop()!;

    const sup = await login(t.app, SUP.email, SUP.password);
    await sup.agent.post(`/app/tickets/${id}/asignar`).type('form').send({ _csrf: sup.csrf, agenteUid: AG.uid });

    t.emailSender.enviados.length = 0;
    const resp = await cli.agent
      .post(`/portal/tickets/${id}/responder`)
      .type('form')
      .send({ _csrf: cli.csrf, cuerpo: 'Sigo esperando, por favor.' });
    expect(resp.status).toBe(302);
    expect(t.emailSender.ultimo?.para[0]?.email).toBe(AG.email);
  });

  it('el cliente no alcanza el back-office', async () => {
    const t = makeTestApp({ usuarios: [CLI] });
    const cli = await login(t.app, CLI.email, CLI.password);
    expect((await cli.agent.get('/app/tickets')).status).toBe(403);
  });
});
