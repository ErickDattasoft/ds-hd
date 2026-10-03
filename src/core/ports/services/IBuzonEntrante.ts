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
  /** Imágenes adjuntas (solo las que alguien adjuntó a propósito, no las incrustadas). */
  adjuntos?: { nombre: string; contentType: string; base64: string }[];
}

/**
 * Buzón de correo entrante (hoy: Zoho Mail por API OAuth). Se lee cada hora desde el cron para
 * convertir las respuestas de los clientes en notas de su ticket.
 */
export interface IBuzonEntrante {
  /** Correos sin leer de la carpeta configurada, del más viejo al más nuevo. */
  listarNoLeidos(cfg: ConfiguracionCorreoEntrante, limite: number): Promise<CorreoRecibido[]>;
  /** Marca uno como leído para no volver a procesarlo. */
  marcarLeido(cfg: ConfiguracionCorreoEntrante, correo: CorreoRecibido): Promise<void>;
  /** Comprueba credenciales y devuelve el `accountId` y la dirección del buzón. */
  verificar(cfg: ConfiguracionCorreoEntrante): Promise<{ accountId: string; correo: string }>;
}
