/** Una propuesta de redacción para que el agente elija la que más le convenga. */
export interface OpcionRedaccion {
  /** Nombre corto de la opción («Solo corregido», «Profesional»…). */
  titulo: string;
  /** Texto propuesto, en texto plano con saltos de línea. */
  texto: string;
}

export interface SolicitudRedaccion {
  /** Lo que escribió el agente (texto plano). */
  texto: string;
  /** Asunto del ticket, solo como contexto. */
  asunto?: string;
  /** Pedir también consejos de qué le falta al texto (el agente los prende/apaga). */
  tips?: boolean;
}

export interface ResultadoRedaccion {
  opciones: OpcionRedaccion[];
  /** Consejos cortos («falta la versión del sistema»…); vacío si no se pidieron o no hay. */
  tips: string[];
}

/** Corrector con IA: devuelve varias versiones del texto sin inventar datos. */
export interface IRedactorIA {
  /** `false` si en este entorno no hay modelo disponible (p. ej. Node local sin Workers AI). */
  disponible(): boolean;
  proponer(solicitud: SolicitudRedaccion): Promise<ResultadoRedaccion>;
}
