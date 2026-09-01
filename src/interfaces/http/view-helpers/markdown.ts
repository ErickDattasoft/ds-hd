import { marked } from 'marked';

/**
 * Renderiza Markdown a HTML seguro para las vistas de la base de conocimiento.
 * Se escapa el HTML de la fuente ANTES de parsear, así cualquier etiqueta escrita por el
 * autor queda como texto literal y solo la sintaxis Markdown produce elementos.
 */
export function renderMarkdown(md: string): string {
  const escapado = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const html = marked.parse(escapado, { async: false, gfm: true, breaks: true });
  return typeof html === 'string' ? html : '';
}
