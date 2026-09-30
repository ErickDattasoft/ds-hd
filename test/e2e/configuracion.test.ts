import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';
import { Empresa } from '../../src/core/entities/Empresa.js';
import { unzipSync } from 'fflate';
import { ExceljsExcelIO } from '../../src/infrastructure/excel/ExceljsExcelIO.js';

const ADMIN = { uid: 'u-a', email: 'admin@dattasoft.mx', password: 'admin12345', nombre: 'Admin', rol: 'admin' as const };
const LECTURA = { uid: 'u-l', email: 'l@d.com', password: 'lectura1234', nombre: 'Lec', rol: 'lectura' as const };

// PNG 1x1 transparente, el fixture mínimo de siempre para probar subida de imágenes.
const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function login(app: ReturnType<typeof makeTestApp>['app'], email: string, password: string) {
  const agent = request.agent(app);
  const page = await agent.get('/login');
  const csrf = cookieValor(page.headers['set-cookie'] as unknown as string[], 'x-csrf-token')!;
  await agent.post('/login').type('form').send({ email, password, _csrf: csrf });
  return { agent, csrf };
}

describe('configuración → calculadora', () => {
  it('edita catálogo de sistemas, tipos de equipo con sus precios y el precio de SQL', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const antes = await agent.get('/app/configuracion/calculadora');
    expect(antes.text).toContain('Componentes');
    expect(antes.text).toContain('Terminal');

    const res = await agent.post('/app/configuracion/calculadora').type('form').send({
      _csrf: csrf,
      sistema: ['Contabilidad', 'Xelcron', ''],
      equipoNombre: ['Servidor', 'Terminal', 'Laptop'],
      equipoPrimer: ['900', '250', '300'],
      equipoAdicional: ['450', '120', '150'],
      precioSQL: '1000',
    });
    expect(res.status).toBe(200);
    expect(res.text).toContain('Configuración guardada');

    const config = await t.configuracionRepo.obtenerCalculadora();
    expect(config.catalogoSistemas).toEqual(['Contabilidad', 'Xelcron']);
    expect(config.catalogoEquipos[2]).toEqual({ nombre: 'Laptop', precioPrimerSistema: 300, precioAdicional: 150 });
    expect(config.precioSQL).toBe(1000);
  });

  it('un rol sin permiso de configuración no puede entrar', async () => {
    const t = makeTestApp({ usuarios: [LECTURA] });
    const { agent } = await login(t.app, LECTURA.email, LECTURA.password);
    const res = await agent.get('/app/configuracion/calculadora');
    expect(res.status).toBe(403);
  });
});

describe('configuración → apariencia (logo)', () => {
  it('sin logo, /logo responde 404; tras subirlo, se ve y se puede quitar', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const antes = await agent.get('/app/configuracion/apariencia');
    expect(antes.text).toContain('Sin logo configurado');
    expect((await request(t.app).get('/logo')).status).toBe(404);

    const subir = await agent
      .post('/app/configuracion/apariencia/logo')
      .set('x-csrf-token', csrf)
      .send({ contentType: 'image/png', base64: PNG_1X1 });
    expect(subir.body).toEqual({ ok: true });

    const archivo = await request(t.app).get('/logo');
    expect(archivo.status).toBe(200);
    expect(archivo.headers['content-type']).toContain('image/png');

    const despues = await agent.get('/app/configuracion/apariencia');
    expect(despues.text).toContain('src="/logo');

    const eliminar = await agent
      .post('/app/configuracion/apariencia/logo/eliminar')
      .type('form')
      .send({ _csrf: csrf });
    expect(eliminar.status).toBe(302);
    expect((await request(t.app).get('/logo')).status).toBe(404);
  });

  it('rechaza un tipo de archivo no permitido', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const res = await agent
      .post('/app/configuracion/apariencia/logo')
      .set('x-csrf-token', csrf)
      .send({ contentType: 'image/svg+xml', base64: PNG_1X1 });
    expect(res.body.ok).toBe(false);
  });
});

describe('configuración → resumen diario', () => {
  it('guarda destinatarios/hora y el botón "Enviar ahora" manda el correo', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const guardar = await agent.post('/app/configuracion/resumen').type('form').send({
      _csrf: csrf,
      habilitado: 'on',
      destinatarios: 'erick.casas@dattasoft.mx',
      horaEnvio: '7',
    });
    expect(guardar.text).toContain('Configuración guardada');

    const config = await t.configuracionRepo.obtenerResumen();
    expect(config).toMatchObject({ habilitado: true, destinatarios: ['erick.casas@dattasoft.mx'], horaEnvio: 7 });

    const enviar = await agent.post('/app/configuracion/resumen/enviar').type('form').send({ _csrf: csrf });
    expect(enviar.text).toContain('Resumen enviado a');
    expect(t.emailSender.enviados).toHaveLength(1);
    expect(t.emailSender.ultimo?.para).toEqual([{ email: 'erick.casas@dattasoft.mx' }]);
    expect(t.emailSender.ultimo?.html).toContain('Resumen diario');
  });

  it('no envía si no hay destinatarios configurados', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const res = await agent.post('/app/configuracion/resumen/enviar').type('form').send({ _csrf: csrf });
    expect(res.status).toBe(422);
    expect(t.emailSender.enviados).toHaveLength(0);
  });
});

describe('configuración → backup: aviso de cuota de adjuntos', () => {
  it('sin adjuntos grandes, no muestra el aviso', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);
    const res = await agent.get('/app/configuracion/backup');
    expect(res.text).not.toContain('cuota gratis de Firestore');
  });

  it('con adjuntos que suman ≥80% de 1 GB (estimado), muestra el aviso', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.adjuntoTicketRepo.docs.set('a1', {
      id: 'a1', ticketId: 'tk1', nombre: 'grande.pdf', contentType: 'application/pdf',
      tamano: 700_000_000, data: 'data:application/pdf;base64,ZmFrZQ==',
      subidoPorUid: null, subidoPorNombre: null, createdAt: new Date(),
    });
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);
    const res = await agent.get('/app/configuracion/backup');
    expect(res.text).toContain('cuota gratis de Firestore');
  });
});

describe('configuración → Excel unificado', () => {
  it('exporta un .xlsx con content-type y tamaño de archivo real', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'Unificada SA' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const vista = await agent.get('/app/configuracion/excel');
    expect(vista.status).toBe(200);
    expect(vista.text).toContain('Excel unificado');

    const exportar = await agent.post('/app/configuracion/excel').type('form').send({
      _csrf: csrf, empresas: 'on', contactos: 'on', tickets: 'on',
    });
    expect(exportar.status).toBe(200);
    expect(exportar.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(exportar.headers['content-disposition']).toContain('ds-hd-excel-');
    expect(Number(exportar.headers['content-length'])).toBeGreaterThan(1000);
  });

  it('importa un .xlsx unificado subido por multipart (Empresas + Contactos)', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    t.empresaRepo.items.set('e1', new Empresa({ id: 'e1', nombre: 'Unificada SA' }));
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const buffer = await new ExceljsExcelIO().escribirVarias([
      { nombre: 'Empresas', columnas: [{ header: 'Nombre', key: 'nombre' }], filas: [{ nombre: 'Unificada SA' }] },
      {
        nombre: 'Contactos',
        columnas: [{ header: 'Nombre', key: 'nombre' }, { header: 'Empresa', key: 'empresa' }],
        filas: [{ nombre: 'Laura', empresa: 'Unificada SA' }],
      },
    ]);

    const importar = await agent
      .post('/app/configuracion/excel/importar')
      .set('x-csrf-token', csrf)
      .attach('archivo', buffer, 'ds-hd-excel.xlsx');
    expect(importar.status).toBe(200);
    expect(importar.body.ok).toBe(true);
    expect(importar.body.resultado.empresas).toMatchObject({ total: 1, actualizadas: 1 });
    expect(importar.body.resultado.contactos).toMatchObject({ total: 1, creadas: 1 });
    expect(importar.body.resultado.tickets).toBeUndefined();
    expect([...t.contactoRepo.items.values()].some((c) => c.nombre === 'Laura')).toBe(true);
  });

  it('sin nada marcado, no exporta nada (422)', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const res = await agent.post('/app/configuracion/excel').type('form').send({ _csrf: csrf });
    expect(res.status).toBe(422);
  });

  it('un rol sin configuracion:integraciones no puede ver ni exportar', async () => {
    const t = makeTestApp({ usuarios: [LECTURA] });
    const { agent, csrf } = await login(t.app, LECTURA.email, LECTURA.password);
    expect((await agent.get('/app/configuracion/excel')).status).toBe(403);
    expect(
      (await agent.post('/app/configuracion/excel').type('form').send({ _csrf: csrf, empresas: 'on' })).status,
    ).toBe(403);
  });
});

describe('configuración → backup: último backup y alerta de 7 días', () => {
  it('sin backup avisa en Backup y Dashboard; al descargar se registra y el aviso desaparece', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent } = await login(t.app, ADMIN.email, ADMIN.password);

    expect((await agent.get('/app/configuracion/backup')).text).toContain('Nunca se ha descargado un backup');
    expect((await agent.get('/app')).text).toContain('Nunca se ha descargado un backup');

    expect((await agent.get('/app/configuracion/backup/descargar')).status).toBe(200);
    expect(t.configuracionRepo.estadoBackup).toMatchObject({ ultimoBackupPor: 'Admin' });
    expect(t.configuracionRepo.estadoBackup.ultimoBackup).toBeTruthy();

    const pagina = await agent.get('/app/configuracion/backup');
    expect(pagina.text).toContain('Último backup');
    expect(pagina.text).not.toContain('se recomienda hacer backup cada semana');
    expect((await agent.get('/app')).text).not.toContain('Nunca se ha descargado un backup');
  });

  it('el cron avisa «backup no realizado» una sola vez al día', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const hace10 = new Date(Date.now() - 10 * 86_400_000).toISOString();
    t.configuracionRepo.estadoBackup = { ultimoBackup: hace10, ultimoBackupPor: 'Admin', ultimoAvisoNoRealizado: '' };
    const llamar = () =>
      request(t.app).post('/jobs/backup-pendiente').set('authorization', 'Bearer dev-jobs-secret');

    expect((await llamar()).body).toMatchObject({ ok: true, avisado: true, dias: 10 });
    expect((await llamar()).body).toMatchObject({ ok: true, avisado: false });
    const avisos = t.webhookPublisher.publicados.filter((e) => e.evento === 'backup.no_realizado');
    expect(avisos).toHaveLength(1);
    expect(avisos[0]!.payload).toMatchObject({ diasSinBackup: 10 });
  });
});

describe('configuración → mantenimiento de adjuntos (paridad con «Archivar y eliminar» del viejo)', () => {
  it('📌 protege un adjunto; la limpieza archiva en ZIP y elimina solo los no permanentes de tickets cerrados', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Con adjuntos', descripcion: 'descripción larga', tipo: 'General', prioridad: 'Baja',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    const subir = async (nombre: string) =>
      (await agent.post(`/app/tickets/${id}/adjuntos`).set('x-csrf-token', csrf)
        .send({ nombre, contentType: 'image/png', base64: Buffer.alloc(30, 5).toString('base64') })).body.adjunto.id as string;
    const fijo = await subir('contrato.png');
    const suelto = await subir('captura.png');

    // 📌 permanente: no se puede quitar
    await agent.post(`/app/tickets/${id}/adjuntos/${fijo}/permanente`).type('form').send({ _csrf: csrf, permanente: '1' });
    expect((await t.adjuntoTicketRepo.obtener(fijo))!.permanente).toBe(true);
    expect((await agent.get(`/app/tickets/${id}`)).text).toContain('📌');
    const quitar = await agent.post(`/app/tickets/${id}/adjuntos/${fijo}/eliminar`).type('form').send({ _csrf: csrf });
    expect(quitar.status).toBe(422);

    // Abierto → no es candidato
    expect((await agent.get('/app/configuracion/backup/limpieza?dias=0')).text).toContain('No hay adjuntos no permanentes');

    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Cerrado' });
    const pagina = await agent.get('/app/configuracion/backup/limpieza?dias=0');
    expect(pagina.text).toContain('captura.png');
    expect(pagina.text).not.toContain('contrato.png');
    // cerrado hoy → con 30 días aún no toca
    expect((await agent.get('/app/configuracion/backup/limpieza?dias=30')).text).toContain('No hay adjuntos no permanentes');

    const zip = await agent
      .get(`/app/configuracion/backup/limpieza.zip?dias=0&ids=${suelto},${fijo}`)
      .buffer(true)
      .parse((res, cb) => {
        const partes: Buffer[] = [];
        res.on('data', (c: Buffer) => partes.push(c));
        res.on('end', () => cb(null, Buffer.concat(partes)));
      });
    const nombres = Object.keys(unzipSync(new Uint8Array(zip.body as Buffer)));
    expect(nombres).toHaveLength(1); // el 📌 no entra aunque se pida
    expect(nombres[0]).toMatch(/^\d+_sin-empresa_\d{4}-\d{2}-\d{2}_captura\.png$/);

    // sin confirmar no borra; confirmado borra solo el no permanente
    await agent.post('/app/configuracion/backup/limpieza/eliminar').type('form').send({ _csrf: csrf, dias: '0', ids: [suelto, fijo] });
    expect(await t.adjuntoTicketRepo.listarPorTicket(id)).toHaveLength(2);
    const borrar = await agent.post('/app/configuracion/backup/limpieza/eliminar').type('form')
      .send({ _csrf: csrf, dias: '0', ids: [suelto, fijo], confirmo: 'on' });
    expect(borrar.headers.location).toContain('eliminados=1');
    expect((await t.adjuntoTicketRepo.listarPorTicket(id)).map((a) => a.id)).toEqual([fijo]);
  });

  it('no toca las imágenes pegadas en la descripción del ticket', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Imagen en texto', descripcion: 'descripción larga', tipo: 'General', prioridad: 'Baja',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    const adj = (await agent.post(`/app/tickets/${id}/adjuntos`).set('x-csrf-token', csrf)
      .send({ nombre: 'pegada.png', contentType: 'image/png', base64: Buffer.alloc(30, 5).toString('base64') })).body.adjunto.id as string;
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Cerrado' });
    const ticket = t.ticketStore.tickets.get(id)!;
    ticket.descripcion = `<p>ver</p><img data-adj-id="${adj}">`;
    expect((await agent.get('/app/configuracion/backup/limpieza?dias=0')).text).toContain('No hay adjuntos no permanentes');
  });
});

describe('Bitácora transversal (como logBitacora del viejo)', () => {
  it('registra sesión, tickets, usuarios, configuración y backup', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);
    const crear = await agent.post('/app/tickets').type('form').send({
      _csrf: csrf, asunto: 'Bitácora', descripcion: 'Probar la bitácora general', tipo: 'General', prioridad: 'Baja',
    });
    const id = String(crear.headers.location).split('/').pop()!;
    await agent.post(`/app/tickets/${id}/estado`).type('form').send({ _csrf: csrf, estado: 'Cerrado' });
    await agent.post('/app/usuarios').type('form').send({ _csrf: csrf, nombre: 'Nueva', email: 'nueva@dattasoft.mx', roles: 'agente' });
    await agent.post('/app/configuracion/calculadora').type('form').send({
      _csrf: csrf, sistema: ['Contabilidad'], equipoNombre: ['Servidor'], equipoPrimer: ['800'], equipoAdicional: ['400'], precioSQL: '800',
    });
    await agent.get('/app/configuracion/backup/descargar');

    const resumenes = (await t.bitacoraRepo.listar()).map((e) => `${e.modulo}|${e.resumen}`);
    expect(resumenes).toEqual(expect.arrayContaining([
      'sesion|Sesión iniciada',
      'usuarios|Nuevo usuario creado: Nueva (agente)',
      'configuracion|Calculadora Compac: catálogos y precios actualizados',
      'backup|Backup completo descargado',
    ]));
    expect(resumenes.some((r) => /^tickets\|Ticket #\d+ creado/.test(r))).toBe(true);
    expect(resumenes.some((r) => /^tickets\|Ticket #\d+: Estado: .* → Cerrado/.test(r))).toBe(true);
  });
});
