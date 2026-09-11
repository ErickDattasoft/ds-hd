import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeTestApp, cookieValor } from '../helpers/app.js';

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
  it('edita los precios de un sistema y del complemento SQL', async () => {
    const t = makeTestApp({ usuarios: [ADMIN] });
    const { agent, csrf } = await login(t.app, ADMIN.email, ADMIN.password);

    const antes = await agent.get('/app/configuracion/calculadora');
    expect(antes.text).toContain('Contabilidad');

    const res = await agent.post('/app/configuracion/calculadora').type('form').send({
      _csrf: csrf,
      precioPrimero_CONTABILIDAD: '11000',
      precioAdicional_CONTABILIDAD: '5500',
      sqlPrecioServidor: '7500',
      sqlPrecioTerminal: '100',
      ivaTasa: '0.16',
      moneda: 'MXN',
    });
    expect(res.status).toBe(200);
    expect(res.text).toContain('Configuración guardada');

    const config = await t.configuracionRepo.obtenerCalculadora();
    expect(config.sistemas.find((s) => s.clave === 'CONTABILIDAD')).toMatchObject({
      precioPrimero: 11000,
      precioAdicional: 5500,
    });
    expect(config.sql).toMatchObject({ precioServidor: 7500, precioTerminal: 100 });
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
