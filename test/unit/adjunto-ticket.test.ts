import { beforeEach, describe, expect, it } from 'vitest';
import { CrearTicketService } from '../../src/application/tickets/CrearTicketService.js';
import { AdjuntoTicketService } from '../../src/application/tickets/AdjuntoTicketService.js';
import {
  MAX_ADJUNTO_BYTES,
  sanearNombreArchivo,
  validarAdjunto,
} from '../../src/core/entities/AdjuntoTicket.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import {
  InMemoryTicketStore,
  InMemoryTicketRepository,
  InMemoryContadorRepository,
  InMemoryConfiguracionRepository,
  FakeWebhookPublisher,
} from '../fakes/tickets.js';
import { InMemoryAdjuntoTicketRepository } from '../fakes/InMemoryAdjuntoTicketRepository.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

let seq = 0;
const ids = { newId: () => `id-${++seq}`, newToken: () => `tok-${++seq}` };

const actor = (over: Partial<SessionUser> = {}): SessionUser => ({
  uid: 'u-staff',
  nombre: 'Agente',
  email: 'a@d.com',
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

// 10 bytes de PNG (base64 de 10 bytes cualquiera).
const PNG_10B = Buffer.alloc(10, 1).toString('base64');

describe('validarAdjunto / sanearNombreArchivo', () => {
  it('rechaza tipos no permitidos', () => {
    expect(() => validarAdjunto('text/html', 100)).toThrow(ValidationError);
    expect(() => validarAdjunto('image/svg+xml', 100)).toThrow(ValidationError);
  });
  it('rechaza vacío y demasiado grande', () => {
    expect(() => validarAdjunto('image/png', 0)).toThrow(ValidationError);
    expect(() => validarAdjunto('image/png', MAX_ADJUNTO_BYTES + 1)).toThrow(ValidationError);
  });
  it('acepta png/pdf de tamaño válido', () => {
    expect(() => validarAdjunto('image/png', 5000)).not.toThrow();
    expect(() => validarAdjunto('application/pdf', MAX_ADJUNTO_BYTES)).not.toThrow();
  });
  it('sanea el nombre sin dejar rutas ni control', () => {
    expect(sanearNombreArchivo('../../etc/passwd')).toBe('....etcpasswd');
    expect(sanearNombreArchivo('  foto 1.png ')).toBe('foto 1.png');
    expect(sanearNombreArchivo('')).toBe('adjunto');
  });
});

describe('AdjuntoTicketService', () => {
  let repo: InMemoryTicketRepository;
  let adjRepo: InMemoryAdjuntoTicketRepository;
  let svc: AdjuntoTicketService;
  let ticketId: string;

  beforeEach(async () => {
    seq = 0;
    repo = new InMemoryTicketRepository(new InMemoryTicketStore());
    adjRepo = new InMemoryAdjuntoTicketRepository();
    const clock = new FixedClock(new Date('2026-09-01T09:00:00Z'));
    const crear = new CrearTicketService(
      repo,
      new InMemoryContadorRepository(),
      new InMemoryConfiguracionRepository(),
      ids,
      clock,
      new FakeWebhookPublisher(),
      silentLogger,
    );
    svc = new AdjuntoTicketService(repo, adjRepo, ids, clock, silentLogger);
    const t = await crear.ejecutar({
      actor: actor(),
      asunto: 'Con adjunto',
      descripcion: 'descripción larga',
      tipo: 'General',
      prioridad: 'Media',
      solicitanteUid: 'u-cli',
    });
    ticketId = t.id;
  });

  const subir = (over: Partial<Parameters<AdjuntoTicketService['subir']>[0]> = {}) =>
    svc.subir({
      actor: actor(),
      ticketId,
      nombre: 'captura.png',
      contentType: 'image/png',
      base64: PNG_10B,
      ...over,
    });

  it('sube, lista y sirve el contenido', async () => {
    const meta = await subir();
    expect(meta.nombre).toBe('captura.png');
    expect(meta.tamano).toBe(10);

    const lista = await svc.listar(actor(), ticketId);
    expect(lista).toHaveLength(1);

    const { buffer, contentType } = await svc.ver(actor(), ticketId, meta.id);
    expect(contentType).toBe('image/png');
    expect(buffer.length).toBe(10);
  });

  it('rechaza tipo y tamaño inválidos', async () => {
    await expect(subir({ contentType: 'application/zip' })).rejects.toThrow(ValidationError);
    const enorme = Buffer.alloc(MAX_ADJUNTO_BYTES + 100).toString('base64');
    await expect(subir({ base64: enorme })).rejects.toThrow(ValidationError);
  });

  it('sin permiso tickets:editar no puede subir', async () => {
    await expect(subir({ actor: actor({ permisos: ['tickets:leer_todos'] }) })).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('un cliente solo toca los adjuntos de su propio ticket', async () => {
    const cli = actor({ uid: 'u-cli', esStaff: false, esCliente: true, roles: ['cliente'], permisos: [] });
    const otro = actor({ uid: 'u-otro', esStaff: false, esCliente: true, roles: ['cliente'], permisos: [] });
    const meta = await svc.subir({
      actor: cli,
      ticketId,
      nombre: 'mia.png',
      contentType: 'image/png',
      base64: PNG_10B,
    });
    await expect(svc.ver(otro, ticketId, meta.id)).rejects.toThrow(NotFoundError);
    expect(await svc.listar(cli, ticketId)).toHaveLength(1);
  });

  it('elimina un adjunto', async () => {
    const meta = await subir();
    await svc.eliminar(actor(), ticketId, meta.id);
    expect(await svc.listar(actor(), ticketId)).toHaveLength(0);
  });
});
