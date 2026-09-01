import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { buildContainer } from '../../src/config/container.js';
import { loadConfig } from '../../src/config/env.js';

describe('smoke: app HTTP', () => {
  const container = buildContainer(loadConfig());
  const app = createApp(container);

  it('GET /healthz devuelve 200 y estado ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.firestore).toBe('desactivado'); // DISABLE_FIREBASE=true en tests
  });

  it('GET / renderiza la landing', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('ds-hd');
  });

  it('ruta desconocida devuelve 404', async () => {
    const res = await request(app).get('/no-existe').set('Accept', 'application/json');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NO_ENCONTRADO');
  });
});
