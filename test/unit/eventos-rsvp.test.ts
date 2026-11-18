import { beforeEach, describe, expect, it } from 'vitest';
import { EventoService } from '../../src/application/eventos/EventoService.js';
import { BitacoraService } from '../../src/application/shared/BitacoraService.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { Evento, itinerarioATexto, itinerarioDeTexto } from '../../src/core/entities/Evento.js';
import { NotFoundError, ValidationError } from '../../src/core/errors/DomainError.js';
import {
  InMemoryEventoRepository,
  InMemoryInscripcionRepository,
  InMemoryListaNegraRepository,
} from '../fakes/eventos.js';
import { InMemoryBitacoraRepository, InMemoryEmpresaRepository } from '../fakes/crm.js';
import { FakeCaptchaVerifier } from '../fakes/tickets.js';
import { FakeEmailSender } from '../fakes/FakeEmailSender.js';
import { FixedClock, silentLogger } from '../fakes/support.js';
import { FflateExcelIO } from '../../src/infrastructure/excel/FflateExcelIO.js';

const AHORA = new Date('2026-11-18T15:00:00Z');

const nuevo = (extra: Partial<ConstructorParameters<typeof Evento>[0]> = {}) =>
  new Evento({
    id: 'ev1',
    titulo: 'Desayuno de clientes',
    tipo: 'presencial',
    fechaHora: new Date('2026-12-12T15:00:00Z'),
    estado: 'publicado',
    ...extra,
  });

describe('Evento — invitación personal con pases', () => {
  it('el invitado confirma cuántos van, hasta sus pases', () => {
    const ev = nuevo();
    ev.agregarInvitadoExterno({ id: 'x1', nombre: 'Juan', token: 'tok1', pases: 3 });
    ev.responderInvitacion('tok1', { asistira: true, personas: 2, mensaje: ' ¡Gracias! ' }, AHORA);
    const inv = ev.invitadosExternos[0]!;
    expect(inv.respuesta).toBe('asistira');
    expect(inv.personas).toBe(2);
    expect(inv.mensaje).toBe('¡Gracias!');
    expect(inv.contactado).toBe(true);
    expect(inv.respondioAt).toBe(AHORA.toISOString());
    expect(() => ev.responderInvitacion('tok1', { asistira: true, personas: 4 }, AHORA)).toThrow(ValidationError);
    expect(() => ev.responderInvitacion('tok1', { asistira: true, personas: 0 }, AHORA)).toThrow(ValidationError);
  });

  it('si no va, no cuenta personas (no queda el «N/A» que da total 0)', () => {
    const ev = nuevo();
    ev.agregarInvitadoExterno({ id: 'x1', nombre: 'Ana', token: 't1', pases: 2 });
    ev.agregarEmpresaInvitada({ id: 'e1', empresaNombre: 'ACME', token: 't2', pases: 4 });
    ev.responderInvitacion('t1', { asistira: true, personas: 2 }, AHORA);
    ev.responderInvitacion('t2', { asistira: false, personas: 3 }, AHORA);
    expect(ev.invitaciones[0]!.personas).toBeNull();
    const r = ev.resumenInvitaciones;
    expect(r.pases).toBe(6);
    expect(r.personas).toBe(2);
    expect(r.asistiran).toBe(1);
    expect(r.noAsistiran).toBe(1);
  });

  it('token desconocido → no encontrado; felicitación no pide confirmación', () => {
    const ev = nuevo();
    expect(() => ev.responderInvitacion('nada', { asistira: true }, AHORA)).toThrow(NotFoundError);
    const fel = nuevo({ tipo: 'felicitacion' });
    fel.agregarInvitadoExterno({ id: 'x1', nombre: 'Luis', token: 't' });
    expect(fel.pideConfirmacion).toBe(false);
    expect(() => fel.responderInvitacion('t', { asistira: true }, AHORA)).toThrow(ValidationError);
  });

  it('marca abierta solo la primera vez y da link a invitaciones viejas', () => {
    const ev = nuevo({
      invitadosExternos: [{ id: 'x1', nombre: 'Viejo', fuente: null, contactado: false, respuesta: 'pendiente', notas: null }],
    });
    expect(ev.invitadosExternos[0]!.token).toBeNull();
    expect(ev.invitadosExternos[0]!.pases).toBe(1);
    expect(ev.asignarTokensFaltantes(() => 'nuevo')).toBe(true);
    expect(ev.asignarTokensFaltantes(() => 'otro')).toBe(false);
    expect(ev.marcarAbierta('nuevo', AHORA)).toBe(true);
    expect(ev.marcarAbierta('nuevo', new Date())).toBe(false);
    expect(ev.invitadosExternos[0]!.abiertaAt).toBe(AHORA.toISOString());
  });

  it('valida el correo del invitado y recorta personas al bajar pases', () => {
    const ev = nuevo();
    expect(() => ev.agregarInvitadoExterno({ id: 'x1', nombre: 'Mal', correo: 'no-es-correo' })).toThrow(ValidationError);
    ev.agregarInvitadoExterno({ id: 'x2', nombre: 'Bien', correo: ' Juan@Empresa.MX ', token: 't', pases: 4 });
    expect(ev.invitadosExternos[0]!.correo).toBe('juan@empresa.mx');
    ev.responderInvitacion('t', { asistira: true, personas: 4 }, AHORA);
    ev.actualizarInvitadoExterno('x2', { pases: 2 });
    expect(ev.invitadosExternos[0]!.personas).toBe(2);
  });

  it('itinerario: texto «hora - actividad» ida y vuelta', () => {
    const it = itinerarioDeTexto('9:00 AM - Registro\n\n10:00 AM — Conferencia\nComida libre');
    expect(it).toEqual([
      { hora: '9:00 AM', actividad: 'Registro' },
      { hora: '10:00 AM', actividad: 'Conferencia' },
      { hora: '', actividad: 'Comida libre' },
    ]);
    expect(itinerarioATexto(it)).toBe('9:00 AM - Registro\n10:00 AM - Conferencia\nComida libre');
  });

  it('el link de Maps debe ser https', () => {
    expect(() => nuevo({ lugarMapsUrl: 'javascript:alert(1)' })).toThrow(ValidationError);
    expect(nuevo({ lugarMapsUrl: 'https://maps.app.goo.gl/x' }).lugarMapsUrl).toBe('https://maps.app.goo.gl/x');
  });
});

describe('EventoService — enviar invitaciones y contestar', () => {
  let seq = 0;
  const ids = { newId: () => `id-${++seq}`, newToken: () => `token-aleatorio-largo-${++seq}-xxxxxxxxxx` };
  const actor = { uid: 'u1', nombre: 'Erick', permisos: ['eventos:gestionar'] } as unknown as SessionUser;
  let eventos: InMemoryEventoRepository;
  let email: FakeEmailSender;
  let service: EventoService;

  beforeEach(() => {
    seq = 0;
    eventos = new InMemoryEventoRepository();
    email = new FakeEmailSender();
    const clock = new FixedClock(AHORA);
    service = new EventoService(
      eventos,
      new InMemoryInscripcionRepository(),
      new InMemoryListaNegraRepository(),
      new InMemoryEmpresaRepository(),
      new FakeCaptchaVerifier(),
      email,
      new FflateExcelIO(),
      ids,
      clock,
      silentLogger,
      new BitacoraService(new InMemoryBitacoraRepository(), ids, clock, silentLogger),
      'https://ds-hd.test',
    );
    eventos.items.set('ev1', nuevo({ lugarNombre: 'Hotel Centro' }));
  });

  it('manda a quien tiene correo, con su link personal, y no repite', async () => {
    await service.agregarInvitadoExterno(actor, 'ev1', { nombre: 'Juan', correo: 'juan@x.mx', pases: 2 });
    await service.agregarInvitadoExterno(actor, 'ev1', { nombre: 'Sin correo', telefono: '9991234567' });
    const r = await service.enviarInvitacionesPendientes(actor, 'ev1');
    expect(r).toEqual({ enviadas: 1, fallidas: 0, sinCorreo: 1, faltan: 0 });
    const ev = await service.obtener('ev1');
    const juan = ev.invitadosExternos[0]!;
    expect(email.ultimo?.para[0]?.email).toBe('juan@x.mx');
    expect(email.ultimo?.html).toContain(`https://ds-hd.test/eventos/ev1/i/${juan.token}`);
    expect(email.ultimo?.html).toContain('2 pases');
    expect(juan.enviadaAt).toBe(AHORA.toISOString());
    expect((await service.enviarInvitacionesPendientes(actor, 'ev1')).enviadas).toBe(0);
    const wa = service.mensajeWhatsAppInvitacion(ev, ev.invitadosExternos[1]!, 'Sin correo');
    expect(wa).toContain('Hotel Centro');
    expect(wa).toContain('/eventos/ev1/i/');
  });

  it('no manda si el evento está en borrador', async () => {
    eventos.items.set('ev1', nuevo({ estado: 'borrador' }));
    await service.agregarInvitadoExterno(actor, 'ev1', { nombre: 'Juan', correo: 'juan@x.mx' });
    await expect(service.enviarInvitacionesPendientes(actor, 'ev1')).rejects.toThrow(ValidationError);
  });

  it('el invitado abre y contesta por su link; el equipo puede ver sin marcar abierta', async () => {
    const ext = await service.agregarInvitadoExterno(actor, 'ev1', { nombre: 'Juan', pases: 3 });
    await service.abrirInvitacion('ev1', ext.token!, true);
    expect((await service.obtener('ev1')).invitadosExternos[0]!.abiertaAt).toBeNull();
    const { nombre } = await service.abrirInvitacion('ev1', ext.token!);
    expect(nombre).toBe('Juan');
    expect((await service.obtener('ev1')).invitadosExternos[0]!.abiertaAt).not.toBeNull();
    await service.responderInvitacion('ev1', ext.token!, { asistira: true, personas: 3 });
    expect((await service.obtener('ev1')).resumenInvitaciones.personas).toBe(3);
    await expect(service.abrirInvitacion('ev1', 'inventado')).rejects.toThrow(NotFoundError);
  });
});
