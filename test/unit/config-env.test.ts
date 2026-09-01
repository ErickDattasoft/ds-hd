import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/env.js';

describe('loadConfig', () => {
  it('aplica defaults y deriva flags', () => {
    const cfg = loadConfig({ FIREBASE_PROJECT_ID: 'x', NODE_ENV: 'test' });
    expect(cfg.port).toBe(3000);
    expect(cfg.isTest).toBe(true);
    expect(cfg.isProduction).toBe(false);
  });

  it('falla si falta FIREBASE_PROJECT_ID', () => {
    expect(() => loadConfig({})).toThrow(/Configuración de entorno inválida/);
  });

  it('rechaza un SESSION_COOKIE_SECRET demasiado corto', () => {
    expect(() => loadConfig({ FIREBASE_PROJECT_ID: 'x', SESSION_COOKIE_SECRET: 'corto' })).toThrow();
  });
});
