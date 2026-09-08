import { beforeEach, describe, expect, it } from 'vitest';
import { CrearTicketService } from '../../src/application/tickets/CrearTicketService.js';
import { ReenviarCorreoTicketService } from '../../src/application/tickets/ReenviarCorreoTicketService.js';
import { destinatariosTicket } from '../../src/application/tickets/notificacionTicket.js';
import { ForbiddenError, ValidationError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import {
  InMemoryTicketStore,
  InMemoryTicketRepository,
  InMemoryContadorRepository,
  InMemoryConfiguracionRepository,
  FakeWebhookPublisher,
} from '../fakes/tickets.js';
import { InMemoryUsuarioRepository } from '../fakes/InMemoryUsuarioRepository.js';
import { InMemoryAdjuntoTicketRepository } from '../fakes/InMemoryAdjuntoTicketRepository.js';
import { FakeEmailSender } from '../fakes/FakeEmailSender.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

let seq = 0;
const ids = { newId: () => `id-${++seq}`, newToken: () => `tok-${++seq}` };

const actor = (over: Partial<SessionUser> = {}): SessionUser => ({
  uid: 'sup',
  nombre: 'Supervisor',
  email: 'sup@dattasoft.mx',
  roles: ['supervisor'],
  rol: 'supervisor',
  esTecnico: false,
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  permisos: ['tickets:crear', 'tickets:editar', 'tickets:leer_todos'],
  ...over,
});

describe('destinatariosTicket', () => {
  const conCorreo = { contactoCorreo: 'cliente@empresa.com', contactoNombre: 'Cliente' };
  const sinCorreo = { contactoCorreo: null, contactoNombre: null };

  it('con contacto: va al contacto, copia a la config + interna, sin duplicar', () => {
    const d = destinatariosTicket(conCorreo, ['sop@d.com', 'jefe@d.com', 'cliente@empresa.com'], 'sop@d.com');
    expect(d.para).toEqual([{ email: 'cliente@empresa.com', nombre: 'Cliente' }]);
    expect(d.cc.map((c) => c.email)).toEqual(['sop@d.com', 'jefe@d.com']);
    expect(d.responderA).toEqual({ email: 'sop@d.com' });
    expect(d.sinContacto).toBe(false);
  });

  it('sin contacto: va directo a la lista (config + interna) para que no se pierda', () => {
    const d = destinatariosTicket(sinCorreo, ['sop@d.com'], 'agente@d.com');
    expect(d.para.map((p) => p.email)).toEqual(['sop@d.com', 'agente@d.com']);
    expect(d.cc).toEqual([]);
    expect(d.sinContacto).toBe(true);
  });

  it('sin contacto y sin nadie configurado: no hay destinatarios', () => {
    expect(destinatariosTicket(sinCorreo, [], null).para).toEqual([]);
  });

  it('ignora entradas sin "@"', () => {
    const d = destinatariosTicket(conCorreo, ['   ', 'x', 'ok@d.com'], null);
    expect(d.cc.map((c) => c.email)).toEqual(['ok@d.com']);
  });
});

describe('ReenviarCorreoTicketService', () => {
  let store: InMemoryTicketStore;
  let repo: InMemoryTicketRepository;
  let cfg: InMemoryConfiguracionRepository;
  let email: FakeEmailSender;
  let crear: CrearTicketService;
  let reenviar: ReenviarCorreoTicketService;

  beforeEach(() => {
    seq = 0;
    store = new InMemoryTicketStore();
    repo = new InMemoryTicketRepository(store);
    cfg = new InMemoryConfiguracionRepository();
    cfg.config = { ...cfg.config, correosNotificacion: ['soporte@dattasoft.mx'] };
    email = new FakeEmailSender();
    const clock = new FixedClock(new Date('2026-09-01T09:00:00Z'));
    crear = new CrearTicketService(
      repo,
      new InMemoryContadorRepository(),
      cfg,
      ids,
      clock,
      new FakeWebhookPublisher(),
      silentLogger,
    );
    reenviar = new ReenviarCorreoTicketService(
      repo,
      cfg,
      new InMemoryUsuarioRepository(),
      new InMemoryAdjuntoTicketRepository(),
      ids,
      clock,
      email,
      silentLogger,
    );
  });

  const nuevoTicket = (over: Record<string, unknown> = {}) =>
    crear.ejecutar({
      actor: actor(),
      asunto: 'Cliente con problema',
      descripcion: 'descripción larga del problema',
      tipo: 'General',
      prioridad: 'Media',
      contactoCorreo: 'cliente@empresa.com',
      contactoNombre: 'Cliente',
      ...over,
    });

  it('reenvía el resumen al contacto con copia al equipo y marca el aviso de reenvío', async () => {
    const t = await nuevoTicket();
    const { enviadoA } = await reenviar.ejecutar({ actor: actor(), ticketId: t.id });

    expect(enviadoA).toEqual(['cliente@empresa.com']);
    expect(email.ultimo?.cc?.map((c) => c.email)).toContain('soporte@dattasoft.mx');
    expect(email.ultimo?.responderA?.email).toBe('soporte@dattasoft.mx');
    expect(email.ultimo?.html).toContain('reenvío');
    expect(email.ultimo?.html).toContain('descripción larga del problema');
    expect(email.ultimo?.html).toContain('Actividad del ticket');
    const eventos = await repo.listarEventos(t.id);
    expect(eventos.some((e) => e.tipo === 'correo' && e.resumen.includes('Reenvío'))).toBe(true);
  });

  it('sin permiso tickets:editar no deja reenviar', async () => {
    const t = await nuevoTicket();
    await expect(
      reenviar.ejecutar({ actor: actor({ permisos: [] }), ticketId: t.id }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('si no hay contacto ni correos configurados, falla con ValidationError', async () => {
    cfg.config = { ...cfg.config, correosNotificacion: [] };
    const t = await nuevoTicket({ contactoCorreo: undefined, contactoNombre: undefined });
    await expect(reenviar.ejecutar({ actor: actor(), ticketId: t.id })).rejects.toThrow(ValidationError);
  });
});
