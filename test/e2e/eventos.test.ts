import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';
import { Evento } from '../../src/core/entities/Evento.js';
import { Empresa } from '../../src/core/entities/Empresa.js';

const ADMIN = { uid: 'u-a', email: 'admin@dattasoft.mx', password: 'admin12345', nombre: 'Admin', rol: 'admin' as const };

async function login(app: ReturnType<typeof makeTestApp>['app'], email: string, password: string) {
  const agent = request.agent(app);
  const page = await agent.get('/login');
  const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
  await agent.post('/login').type('form').send({ email, password, _csrf: csrf });
  return { agent, csrf };
}

const enUnaSemana = () => new Date(Date.now() + 7 * 86_400_000);

// PNG 1x1 transparente, el fixture mínimo de siempre para probar subida de imágenes.
const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('eventos / webinars', () => {
  it('registro público: crea inscripción, envía confirmación y bloquea duplicados', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set(
      'ev1',
      new Evento({ id: 'ev1', titulo: 'Webinar CFDI 4.0', fechaHora: enUnaSemana(), estado: 'publicado' }),
    );

    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
    expect(page.text).toContain('Webinar CFDI 4.0');

    const reg = await anon.post('/eventos/ev1').type('form').send({
      _csrf: csrf, nombre: 'Laura Méndez', email: 'laura@empresa.com', empresa: 'Empresa X',
    });
    expect(reg.status).toBe(200);
    expect(reg.text).toContain('Registro confirmado');
    expect(t.inscripcionRepo.items).toHaveLength(1);
    expect(t.emailSender.enviados.some((c) => c.asunto.includes('Registro confirmado'))).toBe(true);

    // duplicado
    const dup = await anon.post('/eventos/ev1').type('form').send({
      _csrf: csrf, nombre: 'Laura Méndez', email: 'laura@empresa.com',
    });
    expect(dup.status).toBe(422);
    expect(dup.text).toContain('Ya estás registrado');
  });

  it('la lista negra bloquea el registro', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Evento', fechaHora: enUnaSemana(), estado: 'publicado' }));
    const admin = await login(t.app, ADMIN.email, ADMIN.password);
    await admin.agent.post('/app/eventos/ev1/lista-negra').type('form').send({ _csrf: admin.csrf, email: 'spam@bot.com', motivo: 'spam' });

    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
    const reg = await anon.post('/eventos/ev1').type('form').send({ _csrf: csrf, nombre: 'Bot', email: 'spam@bot.com' });
    expect(reg.status).toBe(422);
    expect(t.inscripcionRepo.items).toHaveLength(0);
  });

  it('el job de recordatorios requiere el bearer JOBS_SECRET y envía a los inscritos', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const enUnaHora = new Date(Date.now() + 60 * 60 * 1000);
    t.eventoRepo.items.set(
      'ev1',
      new Evento({ id: 'ev1', titulo: 'Mañana', fechaHora: enUnaHora, estado: 'publicado', horasRecordatorio: 24 }),
    );
    await t.inscripcionRepo.create({
      id: 'i1', eventoId: 'ev1', nombre: 'A', email: 'a@a.com', telefono: null, empresa: null,
      estado: 'registrado', origen: 'publico', correoEstado: null, recordatoriosEnviados: [], ip: null, correoSospechoso: false, asistira: null, usaSistema: null, fuente: null, deseaCanalWhatsapp: false, contactadoWsp: false, asistioReal: false, createdAt: new Date(),
    });

    const sinAuth = await request(t.app).post('/jobs/recordatorios-eventos');
    expect(sinAuth.status).toBe(401);

    const conAuth = await request(t.app)
      .post('/jobs/recordatorios-eventos')
      .set('authorization', 'Bearer dev-jobs-secret');
    expect(conAuth.status).toBe(200);
    expect(conAuth.body.correos).toBe(1);
    expect(t.emailSender.enviados.some((c) => c.asunto.startsWith('Recordatorio'))).toBe(true);
  });

  it('el webhook de Brevo actualiza el correoEstado de la inscripción', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Evento webhook', fechaHora: enUnaSemana(), estado: 'publicado' }));
    await t.inscripcionRepo.create({
      id: 'i1', eventoId: 'ev1', nombre: 'A', email: 'a@a.com', telefono: null, empresa: null,
      estado: 'registrado', origen: 'publico', correoEstado: 'pendiente', recordatoriosEnviados: [], ip: null, correoSospechoso: false, asistira: null, usaSistema: null, fuente: null, deseaCanalWhatsapp: false, contactadoWsp: false, asistioReal: false, createdAt: new Date(),
    });

    const noAuth = await request(t.app).post('/webhooks/brevo').send({ event: 'delivered', tag: 'insc_i1' });
    expect(noAuth.status).toBe(401);

    const ok = await request(t.app)
      .post('/webhooks/brevo?key=dev-jobs-secret')
      .send({ event: 'hard_bounce', email: 'a@a.com', tag: 'insc_i1' });
    expect(ok.status).toBe(200);
    expect(ok.body.actualizada).toBe(true);
    expect(t.inscripcionRepo.items[0]?.correoEstado).toBe('rebotado');
  });

  it('admin crea un evento desde el back-office', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const res = await agent.post('/app/eventos').type('form').send({
      _csrf: csrf, titulo: 'Nuevo Webinar', fechaHora: '2026-12-01T10:00', estado: 'publicado', cupo: '100',
    });
    expect(res.status).toBe(302);
    expect([...t.eventoRepo.items.values()][0]?.titulo).toBe('Nuevo Webinar');
  });

  it('invitación dirigida: agrega una empresa, marca su respuesta y la muestra en el detalle', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Webinar dirigido', fechaHora: enUnaSemana(), estado: 'publicado' }));
    await t.empresaRepo.save(
      new Empresa({ id: 'e1', nombre: 'INFOXPERT', sistemasContratados: ['CONTPAQi Contabilidad'] }),
    );
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const add = await agent.post('/app/eventos/ev1/empresas').type('form')
      .send({ _csrf: csrf, empresaNombre: 'INFOXPERT', invitadoPor: 'Erick' });
    expect(add.status).toBe(302);
    let ev = await t.eventoRepo.findById('ev1');
    expect(ev!.invitaciones).toHaveLength(1);
    expect(ev!.invitaciones[0]!.empresaId).toBe('e1');
    expect(ev!.invitaciones[0]!.sistemas).toEqual(['CONTPAQi Contabilidad']);

    const invId = ev!.invitaciones[0]!.id;
    const upd = await agent.post(`/app/eventos/ev1/empresas/${invId}`).type('form')
      .send({ _csrf: csrf, invitadoPor: 'Erick', contactado: 'on', respuesta: 'asistira', notas: 'confirmó por teléfono' });
    expect(upd.status).toBe(302);
    ev = await t.eventoRepo.findById('ev1');
    expect(ev!.invitaciones[0]!.contactado).toBe(true);
    expect(ev!.invitaciones[0]!.respuesta).toBe('asistira');
    expect(ev!.resumenInvitaciones.asistiran).toBe(1);

    const detalle = await agent.get('/app/eventos/ev1');
    expect(detalle.text).toContain('INFOXPERT');
    expect(detalle.text).toContain('Invitación dirigida');

    const del = await agent.post(`/app/eventos/ev1/empresas/${invId}/quitar`).type('form').send({ _csrf: csrf });
    expect(del.status).toBe(302);
    expect((await t.eventoRepo.findById('ev1'))!.invitaciones).toHaveLength(0);
  });

  it('rechaza invitar dos veces a la misma empresa', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Dup', fechaHora: enUnaSemana(), estado: 'publicado' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent.post('/app/eventos/ev1/empresas').type('form').send({ _csrf: csrf, empresaNombre: 'ACME SA' });
    const dup = await agent.post('/app/eventos/ev1/empresas').type('form').send({ _csrf: csrf, empresaNombre: 'acme sa' });
    expect(dup.status).toBe(409);
    expect((await t.eventoRepo.findById('ev1'))!.invitaciones).toHaveLength(1);
  });

  it('editar los datos del evento no borra la invitación dirigida', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Antes', fechaHora: enUnaSemana(), estado: 'borrador' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent.post('/app/eventos/ev1/empresas').type('form').send({ _csrf: csrf, empresaNombre: 'ACME SA' });
    await agent.post('/app/eventos/ev1/externos').type('form').send({ _csrf: csrf, nombre: 'Juan' });

    const res = await agent.post('/app/eventos/ev1').type('form')
      .send({ _csrf: csrf, titulo: 'Después', fechaHora: '2026-12-05T10:00', estado: 'publicado' });
    expect(res.status).toBe(302);

    const ev = await t.eventoRepo.findById('ev1');
    expect(ev!.titulo).toBe('Después');
    expect(ev!.invitaciones).toHaveLength(1);
    expect(ev!.invitadosExternos).toHaveLength(1);
  });

  it('eliminar un evento lo borra junto con sus inscritos', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'A borrar', fechaHora: enUnaSemana(), estado: 'publicado' }));
    await t.inscripcionRepo.create({
      id: 'i1', eventoId: 'ev1', nombre: 'A', email: 'a@a.com', telefono: null, empresa: null,
      estado: 'registrado', origen: 'publico', correoEstado: null, recordatoriosEnviados: [], ip: null, correoSospechoso: false, asistira: null, usaSistema: null, fuente: null, deseaCanalWhatsapp: false, contactadoWsp: false, asistioReal: false, createdAt: new Date(),
    });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const res = await agent.post('/app/eventos/ev1/eliminar').type('form').send({ _csrf: csrf });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/app/eventos');
    expect(await t.eventoRepo.findById('ev1')).toBeNull();
    expect(t.inscripcionRepo.items).toHaveLength(0);
  });

  it('un rol sin eventos:gestionar no puede eliminar', async () => {
    const LECTURA = { uid: 'u-l', email: 'lec@dattasoft.mx', password: 'lectura12345', nombre: 'Lec', rol: 'lectura' as const };
    const t = makeTestApp({ usuarios: [LECTURA] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Evento X', fechaHora: enUnaSemana(), estado: 'publicado' }));
    const { agent, csrf } = await login(t.app, LECTURA.email, LECTURA.password);
    const res = await agent.post('/app/eventos/ev1/eliminar').type('form').send({ _csrf: csrf });
    expect(res.status).toBe(403);
    expect(await t.eventoRepo.findById('ev1')).not.toBeNull();
  });

  it('invitados externos: agregar y editar', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Ext', fechaHora: enUnaSemana(), estado: 'publicado' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    await agent.post('/app/eventos/ev1/externos').type('form').send({ _csrf: csrf, nombre: 'Juan de LinkedIn', fuente: 'Redes sociales' });
    const ev = await t.eventoRepo.findById('ev1');
    expect(ev!.invitadosExternos).toHaveLength(1);
    const extId = ev!.invitadosExternos[0]!.id;
    const upd = await agent.post(`/app/eventos/ev1/externos/${extId}`).type('form')
      .send({ _csrf: csrf, nombre: 'Juan Pérez', fuente: 'Referido', contactado: 'on', respuesta: 'no_asistira' });
    expect(upd.status).toBe(302);
    expect((await t.eventoRepo.findById('ev1'))!.invitadosExternos[0]!.nombre).toBe('Juan Pérez');
  });

  it('flayer: sin flayer da 404, tras subirlo se sirve público y aparece en el registro; se puede quitar', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Con flayer', fechaHora: enUnaSemana(), estado: 'publicado' }));
    expect((await request(t.app).get('/eventos/ev1/flayer')).status).toBe(404);

    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const subir = await agent
      .post('/app/eventos/ev1/flayer')
      .set('x-csrf-token', csrf)
      .send({ contentType: 'image/png', base64: PNG_1X1 });
    expect(subir.body).toEqual({ ok: true });

    const archivo = await request(t.app).get('/eventos/ev1/flayer');
    expect(archivo.status).toBe(200);
    expect(archivo.headers['content-type']).toContain('image/png');

    const pagina = await request(t.app).get('/eventos/ev1');
    expect(pagina.text).toContain('/eventos/ev1/flayer');

    const eliminar = await agent
      .post('/app/eventos/ev1/flayer/eliminar')
      .type('form')
      .send({ _csrf: csrf });
    expect(eliminar.status).toBe(302);
    expect((await request(t.app).get('/eventos/ev1/flayer')).status).toBe(404);
  });

  it('flayer: rechaza un tipo de archivo no permitido y un rol sin eventos:gestionar no puede subirlo', async () => {
    const LECTURA = { uid: 'u-l2', email: 'lec2@dattasoft.mx', password: 'lectura12345', nombre: 'Lec', rol: 'lectura' as const };
    const t = makeTestApp({ usuarios: [ADMIN, LECTURA] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Evento', fechaHora: enUnaSemana(), estado: 'publicado' }));
    const admin = await login(t.app, ADMIN.email, ADMIN.password);
    const tipoInvalido = await admin.agent
      .post('/app/eventos/ev1/flayer')
      .set('x-csrf-token', admin.csrf)
      .send({ contentType: 'image/svg+xml', base64: PNG_1X1 });
    expect(tipoInvalido.body.ok).toBe(false);

    const lectura = await login(t.app, LECTURA.email, LECTURA.password);
    const sinPermiso = await lectura.agent
      .post('/app/eventos/ev1/flayer')
      .set('x-csrf-token', lectura.csrf)
      .send({ contentType: 'image/png', base64: PNG_1X1 });
    expect(sinPermiso.status).toBe(403);
  });
});

describe('eventos — contacto, plantilla y seguimiento por evento', () => {
  it('guarda sistema/contacto/plantilla/mensaje de seguimiento desde el form de staff', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const crear = await agent.post('/app/eventos').type('form').send({
      _csrf: csrf, titulo: 'Webinar CFDI', fechaHora: '2026-12-01T10:00', estado: 'publicado',
      sistema: 'Contabilidad', contactoNombre: 'Erick', contactoWhatsapp: '5215512345678',
      plantilla: 'Hola [nombre], nos vemos en [evento] el [fecha]. — [contacto_nombre]',
      mensajeSeguimiento: 'Gracias por venir a [evento]', horasSeguimiento: '48',
    });
    expect(crear.status).toBe(302);
    const id = String(crear.headers.location).split('/').pop()!;
    const evento = await t.eventoRepo.findById(id);
    expect(evento).toMatchObject({
      sistema: 'Contabilidad', contactoNombre: 'Erick', contactoWhatsapp: '5215512345678',
      mensajeSeguimiento: 'Gracias por venir a [evento]', horasSeguimiento: 48,
    });
    expect(evento!.plantilla).toContain('[contacto_nombre]');

    // el form de edición precarga todos los campos (valores: {...evento}), así que un
    // reenvío normal desde el navegador los manda de vuelta tal cual — solo cambia el título.
    const editar = await agent.post(`/app/eventos/${id}`).type('form').send({
      _csrf: csrf, titulo: 'Webinar CFDI 4.0', fechaHora: '2026-12-01T10:00', estado: 'publicado',
      sistema: evento!.sistema, contactoNombre: evento!.contactoNombre, contactoWhatsapp: evento!.contactoWhatsapp,
      plantilla: evento!.plantilla, mensajeSeguimiento: evento!.mensajeSeguimiento, horasSeguimiento: String(evento!.horasSeguimiento),
    });
    expect(editar.status).toBe(302);
    const editado = await t.eventoRepo.findById(id);
    expect(editado!.titulo).toBe('Webinar CFDI 4.0');
    expect(editado!.sistema).toBe('Contabilidad');
    expect(editado!.contactoNombre).toBe('Erick');
    expect(editado!.plantilla).toContain('[contacto_nombre]');
  });

  it('editar solo el título (sin mandar los campos nuevos) sí los borra — coherente con el resto de campos opcionales del form', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const crear = await agent.post('/app/eventos').type('form').send({
      _csrf: csrf, titulo: 'Webinar', fechaHora: '2026-12-01T10:00', estado: 'publicado', sistema: 'Nóminas',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    await agent.post(`/app/eventos/${id}`).type('form').send({
      _csrf: csrf, titulo: 'Webinar renombrado', fechaHora: '2026-12-01T10:00', estado: 'publicado',
    });
    const editado = await t.eventoRepo.findById(id);
    expect(editado!.titulo).toBe('Webinar renombrado');
    expect(editado!.sistema).toBeNull();
  });

  it('el detalle de staff arma el link de WhatsApp con la plantilla resuelta por inscrito', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Webinar', fechaHora: enUnaSemana(), estado: 'publicado',
      contactoNombre: 'Erick', contactoWhatsapp: '5215500000000',
      plantilla: 'Hola [nombre], te esperamos en [evento].',
    }));
    await t.inscripcionRepo.create({
      id: 'i1', eventoId: 'ev1', nombre: 'Laura', email: 'laura@x.com', telefono: '5551234567', empresa: null,
      estado: 'registrado', origen: 'publico', correoEstado: null, recordatoriosEnviados: [], ip: null,
      correoSospechoso: false, asistira: 'Sí', usaSistema: null, fuente: '💼 LinkedIn', deseaCanalWhatsapp: true, contactadoWsp: false, asistioReal: false, createdAt: new Date(),
    });
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);
    const detalle = await agent.get('/app/eventos/ev1');
    expect(detalle.status).toBe(200);
    expect(detalle.text).toContain('https://wa.me/525551234567');
    expect(detalle.text).toContain(encodeURIComponent('Hola Laura, te esperamos en Webinar.'));
    // "¿Asistirá?" es su propia columna (como en el CRM anterior), el valor va en la celda.
    expect(detalle.text).toContain('<span class="muted" title="Lo que declaró al registrarse">Sí</span>');
    expect(detalle.text).toContain('Se enteró: 💼 LinkedIn');
    expect(detalle.text).toContain('quiere el canal de WhatsApp');
  });
});

describe('registro público — asistira/usaSistema/fuente/canal WhatsApp', () => {
  it('captura los campos nuevos; "¿usas el sistema?" solo aparece si el evento tiene sistema', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Con sistema', fechaHora: enUnaSemana(), estado: 'publicado', sistema: 'Nóminas',
    }));
    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    expect(page.text).toContain('¿Actualmente utilizas Nóminas?');
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;

    const reg = await anon.post('/eventos/ev1').type('form').send({
      _csrf: csrf, nombre: 'Pedro', email: 'pedro@x.com', asistira: 'Sí', usaSistema: 'No',
      fuente: '📘 Facebook', deseaCanalWhatsapp: 'on',
    });
    expect(reg.status).toBe(200);
    const ins = t.inscripcionRepo.items[0]!;
    expect(ins).toMatchObject({ asistira: 'Sí', usaSistema: 'No', fuente: '📘 Facebook', deseaCanalWhatsapp: true });
  });

  it('sin sistema en el evento, usaSistema se ignora aunque venga en el body', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Sin sistema', fechaHora: enUnaSemana(), estado: 'publicado' }));
    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    expect(page.text).not.toContain('¿Actualmente utilizas');
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
    await anon.post('/eventos/ev1').type('form').send({
      _csrf: csrf, nombre: 'Ana', email: 'ana@x.com', asistira: 'Tal vez', usaSistema: 'No',
    });
    expect(t.inscripcionRepo.items[0]!.usaSistema).toBeNull();
  });

  it('duplicado: ofrece reenviar el link, sin revelar si el correo existe o no', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({ id: 'ev1', titulo: 'Reenviar', fechaHora: enUnaSemana(), estado: 'publicado' }));
    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
    await anon.post('/eventos/ev1').type('form').send({ _csrf: csrf, nombre: 'Laura', email: 'laura@x.com', asistira: 'Sí' });

    const dup = await anon.post('/eventos/ev1').type('form').send({ _csrf: csrf, nombre: 'Laura', email: 'laura@x.com', asistira: 'Sí' });
    expect(dup.status).toBe(422);
    expect(dup.text).toContain('reenviármelo');

    expect(t.emailSender.enviados.filter((c) => c.asunto.includes('Registro confirmado'))).toHaveLength(1);
    const reenviar = await request(t.app)
      .post('/eventos/ev1/reenviar-link')
      .set('x-csrf-token', csrf)
      .set('Cookie', `x-csrf-token=${csrf}`)
      .send({ correo: 'laura@x.com' });
    expect(reenviar.status).toBe(200);
    expect(reenviar.body.mensaje).toContain('Si el correo está registrado');
    expect(t.emailSender.enviados.filter((c) => c.asunto.includes('Registro confirmado'))).toHaveLength(2);

    // correo inexistente: misma respuesta genérica, sin mandar nada
    const reenviarInexistente = await request(t.app)
      .post('/eventos/ev1/reenviar-link')
      .set('x-csrf-token', csrf)
      .set('Cookie', `x-csrf-token=${csrf}`)
      .send({ correo: 'nadie@x.com' });
    expect(reenviarInexistente.status).toBe(200);
    expect(reenviarInexistente.body.mensaje).toBe(reenviar.body.mensaje);
    expect(t.emailSender.enviados.filter((c) => c.asunto.includes('Registro confirmado'))).toHaveLength(2);
  });
});

describe('seguimiento post-evento (job)', () => {
  it('manda el mensaje de seguimiento solo si el evento lo tiene, ya pasaron las horas configuradas, y no lo repite', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const haceDosDias = new Date(Date.now() - 48 * 3_600_000);
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Ya pasó', fechaHora: haceDosDias, estado: 'publicado',
      mensajeSeguimiento: 'Gracias por venir a [evento], [nombre]', horasSeguimiento: 24,
    }));
    t.eventoRepo.items.set('ev2', new Evento({
      id: 'ev2', titulo: 'Sin mensaje', fechaHora: haceDosDias, estado: 'publicado',
    }));
    await t.inscripcionRepo.create({
      id: 'i1', eventoId: 'ev1', nombre: 'Laura', email: 'laura@x.com', telefono: null, empresa: null,
      estado: 'asistio', origen: 'publico', correoEstado: null, recordatoriosEnviados: [], ip: null,
      correoSospechoso: false, asistira: 'Sí', usaSistema: null, fuente: null, deseaCanalWhatsapp: false, contactadoWsp: false, asistioReal: false, createdAt: new Date(),
    });
    await t.inscripcionRepo.create({
      id: 'i2', eventoId: 'ev2', nombre: 'Ana', email: 'ana@x.com', telefono: null, empresa: null,
      estado: 'asistio', origen: 'publico', correoEstado: null, recordatoriosEnviados: [], ip: null,
      correoSospechoso: false, asistira: 'Sí', usaSistema: null, fuente: null, deseaCanalWhatsapp: false, contactadoWsp: false, asistioReal: false, createdAt: new Date(),
    });

    const conAuth = await request(t.app).post('/jobs/seguimiento-eventos').set('authorization', 'Bearer dev-jobs-secret');
    expect(conAuth.status).toBe(200);
    expect(conAuth.body.eventos).toBe(1);
    expect(conAuth.body.correos).toBe(1);
    const enviados = t.emailSender.enviados.filter((c) => c.asunto.startsWith('Seguimiento'));
    expect(enviados).toHaveLength(1);
    expect(enviados[0]!.html).toContain('Gracias por venir a Ya pasó, Laura');

    // segunda corrida: no repite
    const segunda = await request(t.app).post('/jobs/seguimiento-eventos').set('authorization', 'Bearer dev-jobs-secret');
    expect(segunda.body.correos).toBe(0);
  });

  it('no manda seguimiento si todavía no pasan las horas configuradas', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const haceUnaHora = new Date(Date.now() - 3_600_000);
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Reciente', fechaHora: haceUnaHora, estado: 'publicado',
      mensajeSeguimiento: 'Gracias', horasSeguimiento: 24,
    }));
    await t.inscripcionRepo.create({
      id: 'i1', eventoId: 'ev1', nombre: 'Laura', email: 'laura@x.com', telefono: null, empresa: null,
      estado: 'asistio', origen: 'publico', correoEstado: null, recordatoriosEnviados: [], ip: null,
      correoSospechoso: false, asistira: 'Sí', usaSistema: null, fuente: null, deseaCanalWhatsapp: false, contactadoWsp: false, asistioReal: false, createdAt: new Date(),
    });
    const res = await request(t.app).post('/jobs/seguimiento-eventos').set('authorization', 'Bearer dev-jobs-secret');
    expect(res.body.correos).toBe(0);
  });
});

describe('eventos → inscritos: edición, borrado, lista negra y export', () => {
  const inscrito = (over: Record<string, unknown> = {}) => ({
    id: 'i1', eventoId: 'ev1', nombre: 'Laura', email: 'laura@x.com', telefono: '5551234567',
    empresa: 'Empresa X', estado: 'registrado' as const, origen: 'publico' as const,
    correoEstado: 'entregado' as const, recordatoriosEnviados: [], ip: '1.2.3.4',
    correoSospechoso: false, asistira: 'Sí', usaSistema: null, fuente: null,
    deseaCanalWhatsapp: false, contactadoWsp: false, asistioReal: false, createdAt: new Date(),
    ...over,
  });

  const conEvento = async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Webinar', fechaHora: enUnaSemana(), estado: 'publicado', sistema: 'Nóminas',
    }));
    return t;
  };

  it('corrige los datos de un inscrito y guarda las marcas de asistencia real y WhatsApp', async () => {
    const t = await conEvento();
    await t.inscripcionRepo.create(inscrito());
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const res = await agent.post('/app/eventos/ev1/inscritos/i1').type('form').send({
      _csrf: csrf, marcasPresentes: '1', nombre: 'Laura Méndez', empresa: 'Empresa Y',
      email: 'LAURA@X.COM', telefono: '5559999999', asistioReal: 'on', contactadoWsp: 'on',
    });
    expect(res.status).toBe(302);

    const i = t.inscripcionRepo.items[0]!;
    expect(i.nombre).toBe('Laura Méndez');
    expect(i.empresa).toBe('Empresa Y');
    expect(i.telefono).toBe('5559999999');
    expect(i.asistioReal).toBe(true);
    expect(i.contactadoWsp).toBe(true);
    // El correo solo cambió de mayúsculas: se normaliza y el semáforo no se reinicia.
    expect(i.email).toBe('laura@x.com');
    expect(i.correoEstado).toBe('entregado');
  });

  it('al cambiar el correo reinicia el semáforo de entrega y rechaza duplicados del mismo evento', async () => {
    const t = await conEvento();
    await t.inscripcionRepo.create(inscrito());
    await t.inscripcionRepo.create(inscrito({ id: 'i2', email: 'otro@x.com', telefono: null }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const dup = await agent.post('/app/eventos/ev1/inscritos/i1').type('form')
      .send({ _csrf: csrf, email: 'otro@x.com' });
    expect(dup.headers.location).toContain('error=');
    expect(t.inscripcionRepo.items[0]!.email).toBe('laura@x.com');

    await agent.post('/app/eventos/ev1/inscritos/i1').type('form')
      .send({ _csrf: csrf, email: 'nuevo@mailinator.com' });
    const i = t.inscripcionRepo.items[0]!;
    expect(i.email).toBe('nuevo@mailinator.com');
    expect(i.correoEstado).toBe('pendiente');
    expect(i.correoSospechoso).toBe(true); // dominio desechable conocido → 🚩
  });

  it('marca contactadoWsp sin recargar y elimina un inscrito', async () => {
    const t = await conEvento();
    await t.inscripcionRepo.create(inscrito());
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const marcar = await agent.post('/app/eventos/ev1/inscritos/i1/contactado').set('x-csrf-token', csrf).send();
    expect(marcar.status).toBe(200);
    expect(t.inscripcionRepo.items[0]!.contactadoWsp).toBe(true);

    await agent.post('/app/eventos/ev1/inscritos/i1/eliminar').type('form').send({ _csrf: csrf });
    expect(t.inscripcionRepo.items).toHaveLength(0);
  });

  it('manda a la lista negra desde la fila guardando teléfono y quién lo marcó, y lo cruza en el detalle', async () => {
    const t = await conEvento();
    await t.inscripcionRepo.create(inscrito());
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    await agent.post('/app/eventos/ev1/inscritos/i1/lista-negra').type('form')
      .send({ _csrf: csrf, motivo: 'conducta indebida en cámara' });

    const entrada = [...t.listaNegraRepo.items.values()][0]!;
    expect(entrada.email).toBe('laura@x.com');
    expect(entrada.telefono).toBe('5551234567');
    expect(entrada.motivo).toBe('conducta indebida en cámara');
    expect(entrada.marcadoPor).toBe('Admin');

    const detalle = await agent.get('/app/eventos/ev1');
    expect(detalle.text).toContain('conducta indebida en cámara — por Admin');
  });

  it('el 🔁 cruza a quien ya asistió de verdad a otro evento', async () => {
    const t = await conEvento();
    t.eventoRepo.items.set('ev0', new Evento({
      id: 'ev0', titulo: 'Webinar anterior', fechaHora: new Date(Date.now() - 30 * 86_400_000), estado: 'finalizado',
    }));
    await t.inscripcionRepo.create(inscrito({ id: 'i0', eventoId: 'ev0', asistioReal: true }));
    await t.inscripcionRepo.create(inscrito());
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);

    const detalle = await agent.get('/app/eventos/ev1');
    expect(detalle.text).toContain('Ya asistió a: Webinar anterior');
  });

  it('exporta los inscritos a .xlsx', async () => {
    const t = await conEvento();
    await t.inscripcionRepo.create(inscrito());
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);

    const res = await agent.get('/app/eventos/ev1/inscritos.xlsx').responseType('blob');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('inscritos-webinar.xlsx');
    // Un .xlsx es un zip: empieza con la firma "PK".
    expect(res.body.subarray(0, 2).toString()).toBe('PK');
  });

  it('el registro público también bloquea por teléfono en lista negra', async () => {
    const t = await conEvento();
    await t.listaNegraRepo.agregar({
      email: 'viejo@x.com', telefono: '5551234567', motivo: 'spam', marcadoPor: 'Admin', createdAt: new Date(),
    });
    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;

    const reg = await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Otro Nombre', email: 'nuevo@x.com', telefono: '5551234567' });
    expect(reg.status).toBe(422);
    expect(t.inscripcionRepo.items).toHaveLength(0);
  });
});

describe('registro público — correo o teléfono, y captcha obligatorio', () => {
  const publicar = (t: ReturnType<typeof makeTestApp>) =>
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Webinar', fechaHora: enUnaSemana(), estado: 'publicado',
    }));

  const abrir = async (t: ReturnType<typeof makeTestApp>) => {
    const anon = request.agent(t.app);
    const page = await anon.get('/eventos/ev1');
    return { anon, csrf: cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')! };
  };

  it('acepta registrarse solo con teléfono, sin correo', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    publicar(t);
    const { anon, csrf } = await abrir(t);

    const reg = await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Laura Méndez', telefono: '5551234567', asistira: 'Sí' });
    expect(reg.status).toBe(200);
    const i = t.inscripcionRepo.items[0]!;
    expect(i.email).toBeNull();
    expect(i.telefono).toBe('5551234567');
    // Sin correo no se le manda nada: se le contacta por WhatsApp.
    expect(t.emailSender.enviados).toHaveLength(0);
    expect(i.correoEstado).toBeNull();
  });

  it('rechaza si no viene ni correo ni teléfono', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    publicar(t);
    const { anon, csrf } = await abrir(t);

    const reg = await anon.post('/eventos/ev1').type('form').send({ _csrf: csrf, nombre: 'Laura' });
    expect(reg.status).toBe(422);
    expect(reg.text).toContain('Ingresa al menos un correo o un teléfono');
    expect(t.inscripcionRepo.items).toHaveLength(0);
  });

  it('rechaza un teléfono de relleno', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    publicar(t);
    const { anon, csrf } = await abrir(t);

    const reg = await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Bot', telefono: '5555555555' });
    expect(reg.status).toBe(422);
    expect(t.inscripcionRepo.items).toHaveLength(0);
  });

  it('detecta el duplicado por teléfono aunque el correo sea otro', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    publicar(t);
    const { anon, csrf } = await abrir(t);

    await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Laura', email: 'laura@x.com', telefono: '5551234567' });
    expect(t.inscripcionRepo.items).toHaveLength(1);

    const dup = await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Laura', email: 'otro@x.com', telefono: '5551234567' });
    expect(dup.status).toBe(422);
    expect(dup.text).toContain('Ya estás registrado');
    expect(t.inscripcionRepo.items).toHaveLength(1);
  });

  it('con Turnstile activo, sin token no registra y lo dice claro', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.captchaVerifier.activo = true;
    publicar(t);
    const { anon, csrf } = await abrir(t);

    const sinToken = await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Laura', email: 'laura@x.com' });
    expect(sinToken.status).toBe(422);
    expect(sinToken.text).toContain('Falta la verificación anti-bots');
    expect(t.inscripcionRepo.items).toHaveLength(0);

    // Con token, pero que Turnstile rechaza.
    t.captchaVerifier.respuesta = false;
    const tokenMalo = await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Laura', email: 'laura@x.com', 'cf-turnstile-response': 'xxx' });
    expect(tokenMalo.status).toBe(422);
    expect(tokenMalo.text).toContain('No pudimos verificar que eres una persona real');
    expect(t.inscripcionRepo.items).toHaveLength(0);

    // Con token válido sí pasa.
    t.captchaVerifier.respuesta = true;
    const ok = await anon.post('/eventos/ev1').type('form')
      .send({ _csrf: csrf, nombre: 'Laura', email: 'laura@x.com', 'cf-turnstile-response': 'ok' });
    expect(ok.status).toBe(200);
    expect(t.inscripcionRepo.items).toHaveLength(1);
  });
});

describe('página pública de un evento — es una landing, no el sitio navegable', () => {
  it('no ofrece los enlaces públicos (el link se comparte en redes y no debe desviar al prospecto)', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Webinar', fechaHora: enUnaSemana(), estado: 'publicado',
    }));

    const pagina = await request(t.app).get('/eventos/ev1');
    expect(pagina.status).toBe(200);
    expect(pagina.text).not.toContain('Base de conocimiento');
    expect(pagina.text).not.toContain('Levantar ticket');

    // Pero el resto del sitio público sí se navega entre sí.
    const kb = await request(t.app).get('/kb');
    expect(kb.text).toContain('Levantar ticket');
  });

  it('"Volver al CRM" solo aparece con sesión, nunca para un visitante', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.eventoRepo.items.set('ev1', new Evento({
      id: 'ev1', titulo: 'Webinar', fechaHora: enUnaSemana(), estado: 'publicado',
    }));

    const anonimo = await request(t.app).get('/eventos/ev1');
    expect(anonimo.text).not.toContain('Volver al CRM');

    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);
    const conSesion = await agent.get('/eventos/ev1');
    expect(conSesion.text).toContain('Volver al CRM');
    // Regresa al evento del que saliste, no al inicio del CRM.
    expect(conSesion.text).toContain('href="/app/eventos/ev1"');
  });
});
