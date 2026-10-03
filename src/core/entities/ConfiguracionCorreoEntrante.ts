/**
 * Correo entrante: el CRM revisa cada hora un buzón de Zoho Mail y mete las respuestas de los
 * clientes como nota en su ticket (documento `configuracion/correo_entrante`).
 *
 * Usa la API de Zoho Mail con OAuth, así que NO hace falta tocar el DNS del dominio: basta
 * autorizar una vez la aplicación en la consola de Zoho y pegar aquí el refresh token.
 */
export interface ConfiguracionCorreoEntrante {
  habilitado: boolean;
  /** Dominio de Zoho de la cuenta: `com`, `eu`, `in`, `com.au`, `jp`, `ca`. */
  region: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  /** Id de la cuenta de Zoho Mail (lo descubre el botón "Probar conexión"). */
  accountId: string;
  /** Carpeta a revisar; vacío = Inbox. */
  carpeta: string;
  /** Solo se aceptan respuestas del correo del contacto del ticket (recomendado). */
  soloContactoDelTicket: boolean;
  /** Resultado de la última revisión, para verlo en Configuración. */
  ultimaRevision: string | null;
  ultimoResultado: string | null;
}

export const CONFIG_CORREO_ENTRANTE_POR_DEFECTO: ConfiguracionCorreoEntrante = {
  habilitado: false,
  region: 'com',
  clientId: '',
  clientSecret: '',
  refreshToken: '',
  accountId: '',
  carpeta: '',
  soloContactoDelTicket: true,
  ultimaRevision: null,
  ultimoResultado: null,
};

/** Rellena una config parcial de Firestore con los valores por defecto. */
export function sanearConfigCorreoEntrante(d: unknown): ConfiguracionCorreoEntrante {
  const o = (d ?? {}) as Partial<ConfiguracionCorreoEntrante>;
  return {
    ...CONFIG_CORREO_ENTRANTE_POR_DEFECTO,
    ...o,
    habilitado: o.habilitado === true,
    soloContactoDelTicket: o.soloContactoDelTicket !== false,
    region: String(o.region ?? 'com'),
  };
}

/**
 * Número de ticket en un asunto (`[Ticket #123] …`, `Re: Ticket #123`, `#123`).
 * `null` si el asunto no trae ninguno: sin número no hay a qué ticket pegar la respuesta.
 */
export function numeroTicketDeAsunto(asunto: string): number | null {
  // Exige la palabra "ticket" antes del #: con un buzón que recibe de todo, un "Pedido #45" o
  // "Factura #120" no debe pegarse al ticket 45 o 120.
  const m = /ticket\s*#\s*(\d{1,9})/i.exec(asunto ?? '');
  return m ? Number(m[1]) : null;
}

/**
 * Deja solo lo que el cliente escribió: corta en la primera línea de cita ("El ... escribió:",
 * "-----Original Message-----", "> …") para no repetir el hilo completo en cada nota.
 */
export function cuerpoSinCita(texto: string): string {
  const lineas = (texto ?? '').replace(/\r\n/g, '\n').split('\n');
  const corte = lineas.findIndex((l) =>
    /^\s*(>|-{2,}\s*(mensaje|original)|de:|from:|el .+ escribió:|on .+ wrote:|_{5,})/i.test(l),
  );
  return (corte >= 0 ? lineas.slice(0, corte) : lineas).join('\n').trim();
}

/**
 * HTML de un correo a texto legible, **sin el hilo citado**: Gmail/Zoho/Outlook meten las
 * respuestas anteriores en `<blockquote>` o en un bloque de cita (`gmail_quote`, `zmail_extra`,
 * `divRplyFwdMsg`). Quitarlo aquí es más confiable que adivinarlo después en texto plano, sobre
 * todo cuando la línea "El … escribió:" viene partida en dos.
 */
export function textoDeHtmlCorreo(html: string): string {
  return (html ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<div[^>]*(gmail_quote|zmail_extra|divRplyFwdMsg|yahoo_quoted)[\s\S]*$/i, '')
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Correo de un remitente `"Nombre" <correo@x>` o ya plano, en minúsculas ('' si no trae). */
export function correoDeRemitente(valor: string): string {
  const m = /[\w.+-]+@[\w-]+(\.[\w-]+)+/.exec(valor ?? '');
  return m ? m[0].toLowerCase() : '';
}

/** Nombre visible de `"Erick Casas" <erick@x>`; si no trae nombre, el correo. */
export function nombreDeRemitente(valor: string): string {
  const texto = (valor ?? '').trim();
  const m = /^"?([^"<]+?)"?\s*<[^>]+>$/.exec(texto);
  return m ? m[1]!.trim() : correoDeRemitente(texto) || texto;
}
