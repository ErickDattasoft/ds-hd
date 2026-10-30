import type { ConfiguracionCorreoEntrante } from '../../entities/ConfiguracionCorreoEntrante.js';

/** Un correo recibido en el buzón, ya normalizado. */
export interface CorreoRecibido {
  id: string;
  /** Carpeta a la que pertenece (Zoho la pide para leer y para marcar como leído). */
  carpetaId: string;
  /** Correo del remitente, en minúsculas. */
  de: string;
  /** Nombre visible del remitente ("Erick Casas"), si el correo lo trae. */
  nombreDe?: string;
  asunto: string;
  /** Texto plano ya sin HTML (la cita del hilo se recorta después, con `cuerpoSinCita`). */
  cuerpo: string;
  recibidoEn: Date;
  /**
   * Imágenes adjuntas (solo las que alguien adjuntó a propósito, no las incrustadas). Si el
   * proveedor no manda el contenido sino un enlace a su almacén, viene `url` y `base64` vacío.
   */
  adjuntos?: { nombre: string; contentType: string; base64: string; url?: string }[];
  /** Adjuntos que no se guardan (no son imagen), para avisarlo en la nota en vez de perderlos sin decir nada. */
  omitidos?: { nombre: string; motivo: string }[];
}

/**
 * Buzón de correo entrante (hoy: Zoho Mail por API OAuth). Se lee cada pocos minutos para
 * convertir las respuestas de los clientes en notas de su ticket. Es el buzón de una persona:
 * solo se lee, nunca se marca nada como leído ni se mueve.
 */
export interface IBuzonEntrante {
  /**
   * Correos que llegaron después de `desde` con número de ticket en el asunto, del más viejo al
   * más nuevo (con su contenido y sus imágenes). Con `soloConAdjuntos`, solo los que traen
   * archivos: los demás ya llegan al instante por CloudMailin.
   */
  listarRecientes(
    cfg: ConfiguracionCorreoEntrante,
    opts: { desde: Date; soloConAdjuntos: boolean; limite: number },
  ): Promise<CorreoRecibido[]>;
  /** Cambia el código de un solo uso de la consola de Zoho por un refresh token (no expira). */
  canjearCodigo(cfg: ConfiguracionCorreoEntrante, codigo: string): Promise<string>;
  /** Comprueba credenciales y devuelve el `accountId` y la dirección del buzón. */
  verificar(cfg: ConfiguracionCorreoEntrante): Promise<{ accountId: string; correo: string }>;
}
