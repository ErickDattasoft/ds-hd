import { describe, expect, it } from 'vitest';
import { leerOpciones, leerTips } from '../../src/infrastructure/ia/WorkersAIRedactor.js';

describe('leerOpciones (corrector IA)', () => {
  it('lee las 3 versiones en orden y les pone título', () => {
    const r = leerOpciones({ corregido: 'Hola.', profesional: 'Síntoma: x', breve: 'x' });
    expect(r.map((o) => o.titulo)).toEqual(['Solo corregido', 'Profesional', 'Breve']);
  });
  it('acepta JSON en texto, quita negritas de Markdown y descarta repetidas o vacías', () => {
    const r = leerOpciones('Aquí está: {"corregido":"**Hola**","profesional":"Hola","breve":""}');
    expect(r).toEqual([{ titulo: 'Solo corregido', texto: 'Hola' }]);
  });
  it('si la respuesta no trae nada útil devuelve lista vacía', () => {
    expect(leerOpciones('no es json')).toEqual([]);
    expect(leerOpciones(null)).toEqual([]);
  });
});

describe('leerTips (corrector IA)', () => {
  it('separa por renglón, quita viñetas y deja máximo 3', () => {
    expect(leerTips({ tips: '- Falta la versión\n2. Anota el error\n\n• Uno\n* Dos' })).toEqual([
      'Falta la versión',
      'Anota el error',
      'Uno',
    ]);
  });
  it('vacío o ausente = sin tips', () => {
    expect(leerTips({ tips: '' })).toEqual([]);
    expect(leerTips({})).toEqual([]);
  });
});
