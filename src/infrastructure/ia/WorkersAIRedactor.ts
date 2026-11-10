import type { IRedactorIA, OpcionRedaccion, ResultadoRedaccion, SolicitudRedaccion } from '../../core/ports/services/IRedactorIA.js';

/**
 * Binding `AI` de Cloudflare (Workers AI). `main.worker.ts` lo guarda aquí en cada petición;
 * en Node (dev local / Docker) se queda en `null` y el corrector se muestra como no disponible.
 */
interface BindingAI {
  run(modelo: string, entrada: Record<string, unknown>): Promise<unknown>;
}

let binding: BindingAI | null = null;

/** Lo llama `main.worker.ts` con el `env` del Worker. */
export function registrarBindingIA(env: unknown): void {
  const ai = (env as { AI?: BindingAI } | null)?.AI;
  if (ai && typeof ai.run === 'function') binding = ai;
}

/**
 * Llama 3.3 70B: buen español y gratis dentro de la cuota diaria de Workers AI
 * (10,000 «neuronas» al día; cada corrección gasta ~50, o sea ~200 al día).
 */
const MODELO = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const INSTRUCCIONES = `Eres el corrector de estilo del equipo de soporte de DATTASOFT, distribuidor de CONTPAQi en México.
Un agente escribió una nota o descripción de ticket a la carrera. Responde SOLO con un JSON con 3 versiones del mismo texto, en español de México:

- "corregido": corrige ortografía, acentos, mayúsculas y puntuación. Conserva las mismas palabras y el mismo orden; no cambies el estilo.
- "profesional": redáctalo claro, formal e impersonal ("Se revisó…", "Se actualizó…"), entendible para un cliente. Si es un caso de soporte, ordénalo en renglones "Síntoma:", "Problema:" y "Solución:" (cada etiqueta al inicio de su renglón). Síntoma = lo que ve o reporta el cliente. Problema = la causa que encontró el agente (p. ej. "el CSD estaba vencido" es el problema). Solución = lo que se hizo. Solo si el texto de verdad no dice alguna de esas partes, escribe "[pendiente]" en lugar de suponerla. Al final agrega los datos que no quepan ahí (tiempo trabajado, observaciones).
- "breve": la versión más corta y clara posible, sin perder ningún dato.

Reglas para las 3 versiones:
- NO inventes nada: ni causas, ni pasos, ni resultados, ni datos que el agente no escribió.
- Conserva exactos números, versiones, folios, RFC, rutas, nombres de personas y empresas, y mensajes de error.
- Ninguna versión puede perder un dato: si el agente anotó fecha o tiempo trabajado, debe aparecer en las 3 versiones (en "profesional": "Fecha: …" como primer renglón y "Tiempo trabajado: …" al final).
- Escribe bien los términos: CONTPAQi, CFDI, timbrado, SAT, RFC, certificado de sello digital (CSD), XML, PDF, SQL Server.
- Texto plano, sin Markdown (nada de asteriscos ni #). Usa saltos de línea entre renglones.`;

const INSTRUCCIONES_TIPS = `

Además, en "tips" da de 1 a 3 consejos cortos (uno por renglón, sin viñetas) para que el agente mejore este ticket: qué dato importante le falta para que otro compañero lo entienda o lo repita (por ejemplo: sistema y versión de CONTPAQi, mensaje de error exacto, causa, pasos realizados, si el cliente confirmó que quedó). No repitas lo que ya está en el texto. Si no le falta nada, deja "tips" vacío.`;

/** Tres campos fijos: con un arreglo, Llama en modo JSON a veces devuelve la lista vacía. */
const OPCIONES: { clave: string; titulo: string }[] = [
  { clave: 'corregido', titulo: 'Solo corregido' },
  { clave: 'profesional', titulo: 'Profesional' },
  { clave: 'breve', titulo: 'Breve' },
];

function esquema(conTips: boolean) {
  const claves = [...OPCIONES.map((o) => o.clave), ...(conTips ? ['tips'] : [])];
  return {
    type: 'object',
    properties: Object.fromEntries(claves.map((c) => [c, { type: 'string' }])),
    required: claves,
  };
}

export class WorkersAIRedactor implements IRedactorIA {
  disponible(): boolean {
    return binding !== null;
  }

  async proponer(s: SolicitudRedaccion): Promise<ResultadoRedaccion> {
    if (!binding) throw new Error('El corrector solo funciona en el servidor (Workers AI)');
    const contexto = s.asunto ? `Asunto del ticket (solo contexto, no lo reescribas): ${s.asunto}\n\n` : '';
    const r = (await binding.run(MODELO, {
      messages: [
        { role: 'system', content: INSTRUCCIONES + (s.tips ? INSTRUCCIONES_TIPS : '') },
        { role: 'user', content: `${contexto}Texto del agente:\n"""\n${s.texto}\n"""` },
      ],
      response_format: { type: 'json_schema', json_schema: esquema(Boolean(s.tips)) },
      max_tokens: 2500,
      temperature: 0.3,
    })) as { response?: unknown };
    return { opciones: leerOpciones(r?.response), tips: s.tips ? leerTips(r?.response) : [] };
  }
}

/** La respuesta llega como objeto (modo JSON) o como texto con JSON adentro, según el modelo. */
function aObjeto(respuesta: unknown): Record<string, unknown> {
  let datos = respuesta;
  if (typeof datos === 'string') {
    const m = datos.match(/\{[\s\S]*\}/);
    try {
      datos = m ? JSON.parse(m[0]) : null;
    } catch {
      datos = null;
    }
  }
  return (datos && typeof datos === 'object' ? datos : {}) as Record<string, unknown>;
}

/** Consejos del campo `tips`: uno por renglón, sin viñetas ni numeración, máximo 3. */
export function leerTips(respuesta: unknown): string[] {
  const t = aObjeto(respuesta).tips;
  const lista = Array.isArray(t) ? t.map(String) : String(t ?? '').split('\n');
  return lista
    .map((x) => x.replace(/^\s*(?:[-•*·]|\d+[.)])\s*/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function leerOpciones(respuesta: unknown): OpcionRedaccion[] {
  const o = aObjeto(respuesta);
  const vistos = new Set<string>();
  return OPCIONES.map(({ clave, titulo }) => ({
    titulo,
    texto: String(o[clave] ?? '')
      .replace(/\*\*/g, '')
      .trim(),
  })).filter((x) => x.texto && !vistos.has(x.texto) && vistos.add(x.texto));
}
