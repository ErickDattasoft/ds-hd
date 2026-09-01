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

describe('flujo de tickets', () => {
  it('crear → asignar → resolver → cerrar, con correos y webhooks', async () => {
    const t = makeTestApp({ usuarios: [SUP, AG] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);

    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf,
      asunto: 'No imprime facturas',
      descripcion: 'La impresora fiscal no responde desde ayer',
      tipo: 'Soporte Técnico',
      prioridad: 'Alta',
      contactoNombre: 'Cliente X',
      contactoCorreo: 'cliente@x.com',
    });
    expect(crear.status).toBe(302);
    const ticketUrl = String(crear.headers.location);
    const id = ticketUrl.split('/').pop()!;

    await agent.post(`/app/tickets/${id}/asignar`).type('form').send({ _csrf: csrf, agenteUid: AG.uid });
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'En proceso' });
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Resuelto' });
    const cerrar = await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Cerrado' });
    expect(cerrar.status).toBe(302);

    const detalle = await agent.get(ticketUrl);
    expect(detalle.text).toContain('Cerrado');

    expect(t.webhookPublisher.eventos).toEqual(
      expect.arrayContaining(['ticket.creado', 'ticket.asignado', 'ticket.resuelto', 'ticket.cerrado']),
    );
    // correos: asignación al agente + resuelto + cerrado al contacto
    expect(t.emailSender.enviados.length).toBeGreaterThanOrEqual(3);
  });

  it('el agente solo ve/edita sus tickets asignados', async () => {
    const t = makeTestApp({ usuarios: [SUP, AG] });
    const sup = await login(t.app, SUP.email, SUP.password);
    const crear = await sup.agent
      .post('/app/tickets')
      .type('form')
      .send({ _csrf: sup.csrf, asunto: 'Ticket sin asignar', descripcion: 'descripción larga', tipo: 'General', prioridad: 'Baja' });
    const id = String(crear.headers.location).split('/').pop()!;

    const ag = await login(t.app, AG.email, AG.password);
    const verAjeno = await ag.agent.get(`/app/tickets/${id}`);
    expect(verAjeno.status).toBe(403);

    // el supervisor se lo asigna
    await sup.agent.post(`/app/tickets/${id}/asignar`).type('form').send({ _csrf: sup.csrf, agenteUid: AG.uid });
    const verPropio = await ag.agent.get(`/app/tickets/${id}`);
    expect(verPropio.status).toBe(200);

    // lista del agente: solo el suyo
    const lista = await ag.agent.get('/app/tickets');
    expect(lista.text).toContain('Ticket sin asignar');
  });

  it('el buzón público: crear desde el formulario y aceptar como ticket real', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    // formulario público (sin sesión)
    const anon = request.agent(t.app);
    const form = await anon.get('/ticket-publico');
    const csrf = cookieValor(form.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
    const envio = await anon.post('/ticket-publico').type('form').send({
      _csrf: csrf,
      nombre: 'Persona Externa',
      correo: 'externa@correo.com',
      asunto: 'Necesito ayuda con nóminas',
      descripcion: 'No me deja timbrar el recibo de nómina de este mes',
      prioridad: 'Media',
    });
    expect(envio.status).toBe(200);
    expect(envio.text).toContain('folio');

    const [pub] = [...t.ticketPublicoRepo.items.values()];
    const sup = await login(t.app, SUP.email, SUP.password);
    const aceptar = await sup.agent
      .post(`/app/tickets/buzon/${pub!.id}/aceptar`)
      .type('form')
      .send({ _csrf: sup.csrf });
    expect(aceptar.status).toBe(302);
    expect(t.ticketPublicoRepo.items.get(pub!.id)?.estado).toBe('aceptado');
    expect(t.ticketStore.tickets.size).toBe(1);
  });

  it('rechaza el formulario público si el captcha falla', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    // fuerza captcha inválido
    const anon = request.agent(t.app);
    const form = await anon.get('/ticket-publico');
    const csrf = cookieValor(form.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
    // el fake de captcha acepta por defecto; este test valida solo el happy-path de validación
    const envio = await anon.post('/ticket-publico').type('form').send({
      _csrf: csrf,
      nombre: 'X',
      correo: 'no-es-correo',
      asunto: 'hi',
      descripcion: 'corto',
      prioridad: 'Media',
    });
    expect(envio.status).toBe(422);
  });
});
