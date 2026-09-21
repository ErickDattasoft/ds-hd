import { describe, expect, it } from 'vitest';
import { InvitarClienteService } from '../../src/application/usuarios/InvitarClienteService.js';
import { CrearTicketPortalService } from '../../src/application/portal/CrearTicketPortalService.js';
import type { CrearTicketService } from '../../src/application/tickets/CrearTicketService.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { can } from '../../src/interfaces/http/rbac/policy.js';
import { InMemoryUsuarioRepository } from '../fakes/InMemoryUsuarioRepository.js';
import { InMemoryInvitacionRepository } from '../fakes/InMemoryRepos.js';
import { FakeAuthProvider } from '../fakes/FakeAuthProvider.js';
import { FakeEmailSender } from '../fakes/FakeEmailSender.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

let seq = 0;
const ids = { newId: () => `id-${++seq}`, newToken: () => `tok-${++seq}` };
const staff = { uid: 'admin', permisos: [] } as unknown as SessionUser;

const cliente = (empresaIds: string[]): SessionUser =>
  ({
    uid: 'kenny', nombre: 'Kenny Mex', email: 'kmex@ilco.com.mx', roles: ['cliente'], rol: 'cliente',
    empresaId: empresaIds[0] ?? null, empresaIds, activo: true, esStaff: false, esCliente: true,
    esTecnico: false, permisos: ['portal:tickets_crear', 'portal:tickets_leer'],
  }) as unknown as SessionUser;

describe('portal: un cliente que administra varias empresas', () => {
  it('invitarlo desde otra empresa le suma la empresa en vez de fallar', async () => {
    const usuarios = new InMemoryUsuarioRepository();
    const svc = new InvitarClienteService(
      usuarios, new InMemoryInvitacionRepository(), new FakeAuthProvider(), new FakeEmailSender(),
      ids, new FixedClock(new Date()), silentLogger, 'https://x', 72,
    );
    const r1 = await svc.ejecutar({ actor: staff, email: 'kmex@ilco.com.mx', nombre: 'Kenny Mex', empresaId: 'ilco' });
    expect(r1.urlInvitacion).toBeTruthy();
    const r2 = await svc.ejecutar({ actor: staff, email: 'KMEX@ilco.com.mx', nombre: 'Kenny Mex', empresaId: 'gasolineras' });
    expect(r2.urlInvitacion).toBeNull();
    expect(r2.usuario.uid).toBe(r1.usuario.uid);
    const u = await usuarios.findByEmail('kmex@ilco.com.mx');
    expect(u!.empresaIds).toEqual(['ilco', 'gasolineras']);
    await expect(
      svc.ejecutar({ actor: staff, email: 'kmex@ilco.com.mx', nombre: 'Kenny Mex', empresaId: 'ilco' }),
    ).rejects.toThrow(/ya tiene acceso/);
  });

  it('crea el ticket para la empresa que elige, solo entre las suyas', async () => {
    let recibido: Record<string, unknown> = {};
    const crear = { ejecutar: async (i: Record<string, unknown>) => ((recibido = i), { id: 't1' }) } as unknown as CrearTicketService;
    const svc = new CrearTicketPortalService(crear);
    const base = { asunto: 'No abre', descripcion: 'x', tipo: 'Soporte', prioridad: 'Media' };
    const kenny = cliente(['ilco', 'gasolineras', 'condominio']);

    await svc.ejecutar({ ...base, actor: kenny });
    expect(recibido.empresaId).toBe('ilco');
    await svc.ejecutar({ ...base, actor: kenny, empresaId: 'gasolineras', empresaNombre: 'GASOLINERAS' });
    expect(recibido).toMatchObject({ empresaId: 'gasolineras', empresaNombre: 'GASOLINERAS' });
    await expect(svc.ejecutar({ ...base, actor: kenny, empresaId: 'otra' })).rejects.toThrow(/Elige una de tus empresas/);
  });

  it('el permiso del portal vale para cualquiera de sus empresas y ninguna más', () => {
    const kenny = cliente(['ilco', 'gasolineras']);
    expect(can(kenny, 'portal:tickets_leer' as never, { empresaId: 'gasolineras' })).toBe(true);
    expect(can(kenny, 'portal:tickets_leer' as never, { empresaId: 'otra' })).toBe(false);
  });
});
