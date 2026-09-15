import { describe, expect, it } from 'vitest';
import { desinflarImagenesDescripcion } from '../../src/application/tickets/desinflarImagenesDescripcion.js';
import { resolverImagenesDescripcion, quitarImagenesDescripcion } from '../../src/application/tickets/descripcionImagenes.js';
import { InMemoryAdjuntoTicketRepository } from '../fakes/InMemoryAdjuntoTicketRepository.js';

let seq = 0;
const ids = { newId: () => `adj-${++seq}`, newToken: () => `tok-${++seq}` };
const actor = { uid: 'u1', nombre: 'Erick' };
const ahora = new Date('2026-09-15T10:00:00Z');

// PNG 1x1 real en base64 (el mismo fixture usado en otros tests de subida de imágenes).
const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('desinflarImagenesDescripcion', () => {
  it('sube la imagen como adjunto y reemplaza src por data-adj-id, conservando alt/style', () => {
    seq = 0;
    const repo = new InMemoryAdjuntoTicketRepository();
    return desinflarImagenesDescripcion(
      `<p>Mira</p><img src="data:image/png;base64,${PNG_1X1}" alt="captura" style="max-width: 100%">`,
      'tk1',
      actor,
      repo,
      ids,
      ahora,
    ).then((salida) => {
      expect(salida).not.toContain('data:image');
      expect(salida).not.toContain('base64');
      // El resultado de desinflar es intermedio — vuelve a pasar por sanitizarDescripcionHtml
      // dentro de Ticket.crear, que normaliza espacios/orden; aquí solo importa que sobrevivan
      // los atributos, sin importar espacios sueltos entre ellos.
      expect(salida).toContain('data-adj-id="adj-1"');
      expect(salida).toContain('alt="captura"');
      expect(salida).toContain('style="max-width: 100%"');
      expect(repo.docs.size).toBe(1);
      const adj = [...repo.docs.values()][0]!;
      expect(adj.ticketId).toBe('tk1');
      expect(adj.contentType).toBe('image/png');
      expect(adj.subidoPorUid).toBe('u1');
      expect(adj.data).toContain('data:image/png;base64,');
    });
  });

  it('sin imágenes, no toca el html ni crea adjuntos', async () => {
    seq = 0;
    const repo = new InMemoryAdjuntoTicketRepository();
    const html = '<p>Solo texto, sin imágenes</p>';
    const salida = await desinflarImagenesDescripcion(html, 'tk1', actor, repo, ids, ahora);
    expect(salida).toBe(html);
    expect(repo.docs.size).toBe(0);
  });

  it('varias imágenes en la misma descripción se procesan todas, en orden', async () => {
    seq = 0;
    const repo = new InMemoryAdjuntoTicketRepository();
    const html =
      `<img src="data:image/png;base64,${PNG_1X1}">texto` +
      `<img src="data:image/jpeg;base64,${PNG_1X1}">`;
    const salida = await desinflarImagenesDescripcion(html, 'tk1', actor, repo, ids, ahora);
    expect(salida.replace(/\s+>/g, '>')).toBe('<img data-adj-id="adj-1">texto<img data-adj-id="adj-2">');
    expect(repo.docs.size).toBe(2);
    expect([...repo.docs.values()].map((a) => a.contentType)).toEqual(['image/png', 'image/jpeg']);
  });

  it('una imagen demasiado grande se quita (no se guarda rota, no revienta la creación)', async () => {
    seq = 0;
    const repo = new InMemoryAdjuntoTicketRepository();
    const enorme = 'A'.repeat(1_000_000); // >700KB tras decodificar base64
    const html = `<p>antes</p><img src="data:image/png;base64,${enorme}"><p>después</p>`;
    const salida = await desinflarImagenesDescripcion(html, 'tk1', actor, repo, ids, ahora);
    expect(salida).toBe('<p>antes</p><p>después</p>');
    expect(repo.docs.size).toBe(0);
  });

  it('un tipo no permitido (p. ej. svg) se quita igual', async () => {
    seq = 0;
    const repo = new InMemoryAdjuntoTicketRepository();
    const html = `<img src="data:image/svg+xml;base64,${PNG_1X1}">`;
    const salida = await desinflarImagenesDescripcion(html, 'tk1', actor, repo, ids, ahora);
    expect(salida).toBe('');
    expect(repo.docs.size).toBe(0);
  });
});

describe('resolverImagenesDescripcion + quitarImagenesDescripcion — integración con desinflar', () => {
  it('el ciclo completo: desinflar al crear, resolver al mostrar', async () => {
    seq = 0;
    const repo = new InMemoryAdjuntoTicketRepository();
    const desinflada = await desinflarImagenesDescripcion(
      `<p>Mira esto</p><img src="data:image/png;base64,${PNG_1X1}" alt="x">`,
      'tk1',
      actor,
      repo,
      ids,
      ahora,
    );
    const resuelta = await resolverImagenesDescripcion(desinflada, 'tk1', repo);
    expect(resuelta).toContain(`src="data:image/png;base64,${PNG_1X1}"`);
    expect(resuelta).toContain('alt="x"');
  });

  it('resolverImagenesDescripcion nunca resuelve un adjunto de OTRO ticket', async () => {
    seq = 0;
    const repo = new InMemoryAdjuntoTicketRepository();
    const desinflada = await desinflarImagenesDescripcion(
      `<img src="data:image/png;base64,${PNG_1X1}">`,
      'tk-ajeno',
      actor,
      repo,
      ids,
      ahora,
    );
    // Se intenta resolver como si fuera OTRO ticket (tk1, no tk-ajeno).
    const resuelta = await resolverImagenesDescripcion(desinflada, 'tk1', repo);
    expect(resuelta).not.toContain('base64');
    expect(resuelta).toContain('imagen no disponible');
  });

  it('quitarImagenesDescripcion deja el resto del formato intacto para el correo', () => {
    const html = '<p>Hola</p><img data-adj-id="x1" alt="y"><p>Mundo</p>';
    expect(quitarImagenesDescripcion(html)).toBe('<p>Hola</p><p>Mundo</p>');
  });
});
