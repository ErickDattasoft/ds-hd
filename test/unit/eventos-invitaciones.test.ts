import { describe, expect, it } from 'vitest';
import { Evento } from '../../src/core/entities/Evento.js';
import { ConflictError, NotFoundError, ValidationError } from '../../src/core/errors/DomainError.js';

const nuevo = () =>
  new Evento({ id: 'ev1', titulo: 'Webinar', fechaHora: new Date('2026-12-01T10:00:00Z') });

describe('Evento — invitación dirigida a empresas', () => {
  it('agrega una empresa con sus datos y valores por defecto', () => {
    const ev = nuevo();
    const inv = ev.agregarEmpresaInvitada({
      id: 'i1',
      empresaId: 'e1',
      empresaNombre: 'INFOXPERT',
      sistemas: ['CONTPAQi Contabilidad', 'CONTPAQi Contabilidad'],
      invitadoPor: 'Erick',
    });
    expect(inv.contactado).toBe(false);
    expect(inv.respuesta).toBe('pendiente');
    expect(inv.sistemas).toEqual(['CONTPAQi Contabilidad']);
    expect(ev.invitaciones).toHaveLength(1);
  });

  it('rechaza invitar dos veces a la misma empresa (case-insensitive)', () => {
    const ev = nuevo();
    ev.agregarEmpresaInvitada({ id: 'i1', empresaNombre: 'ACME SA' });
    expect(() => ev.agregarEmpresaInvitada({ id: 'i2', empresaNombre: 'acme sa' })).toThrow(ConflictError);
  });

  it('rechaza un nombre de empresa vacío', () => {
    expect(() => nuevo().agregarEmpresaInvitada({ id: 'i1', empresaNombre: ' ' })).toThrow(ValidationError);
  });

  it('actualiza contactado / respuesta / notas y valida la respuesta', () => {
    const ev = nuevo();
    ev.agregarEmpresaInvitada({ id: 'i1', empresaNombre: 'ACME' });
    ev.actualizarEmpresaInvitada('i1', { contactado: true, respuesta: 'asistira', notas: '  vía correo  ' });
    expect(ev.invitaciones[0]!.contactado).toBe(true);
    expect(ev.invitaciones[0]!.respuesta).toBe('asistira');
    expect(ev.invitaciones[0]!.notas).toBe('vía correo');
    expect(() =>
      ev.actualizarEmpresaInvitada('i1', { respuesta: 'quizas' as never }),
    ).toThrow(ValidationError);
    expect(() => ev.actualizarEmpresaInvitada('nope', { contactado: true })).toThrow(NotFoundError);
  });

  it('quita una empresa invitada', () => {
    const ev = nuevo();
    ev.agregarEmpresaInvitada({ id: 'i1', empresaNombre: 'ACME' });
    ev.quitarEmpresaInvitada('i1');
    expect(ev.invitaciones).toHaveLength(0);
    expect(() => ev.quitarEmpresaInvitada('i1')).toThrow(NotFoundError);
  });

  it('el resumen cuenta empresas + externos juntos', () => {
    const ev = nuevo();
    ev.agregarEmpresaInvitada({ id: 'i1', empresaNombre: 'Empresa A' });
    ev.agregarEmpresaInvitada({ id: 'i2', empresaNombre: 'Empresa B' });
    ev.agregarInvitadoExterno({ id: 'x1', nombre: 'Juan' });
    ev.actualizarEmpresaInvitada('i1', { contactado: true, respuesta: 'asistira' });
    ev.actualizarInvitadoExterno('x1', { contactado: true, respuesta: 'no_asistira' });

    const r = ev.resumenInvitaciones;
    expect(r).toMatchObject({ invitados: 3, contactados: 2, asistiran: 1, noAsistiran: 1, pendientes: 1 });
  });

  it('conserva las invitaciones al reconstruir la entidad desde props (round-trip)', () => {
    const ev = nuevo();
    ev.agregarEmpresaInvitada({ id: 'i1', empresaNombre: 'ACME', invitadoPor: 'Erick' });
    ev.agregarInvitadoExterno({ id: 'x1', nombre: 'Juan', fuente: 'LinkedIn' });

    const copia = new Evento({
      id: ev.id,
      titulo: ev.titulo,
      fechaHora: ev.fechaHora,
      invitaciones: ev.invitaciones,
      invitadosExternos: ev.invitadosExternos,
    });
    expect(copia.invitaciones[0]!.empresaNombre).toBe('ACME');
    expect(copia.invitadosExternos[0]!.nombre).toBe('Juan');
  });
});
