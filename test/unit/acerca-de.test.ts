import { beforeEach, describe, expect, it } from 'vitest';
import { AcercaDeService } from '../../src/application/configuracion/AcercaDeService.js';
import { ForbiddenError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { InMemoryConfiguracionRepository } from '../fakes/tickets.js';
import { silentLogger } from '../fakes/support.js';

const actor = (permisos: string[]): SessionUser => ({
  uid: 'u1',
  nombre: 'Admin',
  email: 'a@d.com',
  rol: 'admin',
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  permisos,
});

describe('AcercaDeService', () => {
  let repo: InMemoryConfiguracionRepository;
  let service: AcercaDeService;

  beforeEach(() => {
    repo = new InMemoryConfiguracionRepository();
    service = new AcercaDeService(repo, silentLogger);
  });

  it('devuelve el valor por defecto cuando no hay nada guardado', async () => {
    expect(await service.obtener()).toEqual({ version: '', ultimaActualizacion: '', notas: '' });
  });

  it('un admin guarda y recorta los campos', async () => {
    await service.actualizar({
      actor: actor(['configuracion:catalogos']),
      version: '  v1.2.0 ',
      ultimaActualizacion: ' Septiembre 2026 ',
      notas: 'Se agregó "Acerca de".',
    });
    expect(await service.obtener()).toEqual({
      version: 'v1.2.0',
      ultimaActualizacion: 'Septiembre 2026',
      notas: 'Se agregó "Acerca de".',
    });
  });

  it('rechaza a quien no tiene configuracion:catalogos', async () => {
    await expect(
      service.actualizar({ actor: actor(['tickets:leer']), version: 'x', ultimaActualizacion: '', notas: '' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
