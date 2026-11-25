/** Lecturas de Firestore de un día de cuota, contadas por el propio CRM. */
export interface ConsumoDia {
  /** «AAAA-MM-DD» del día de cuota (medianoche del Pacífico). */
  dia: string;
  lecturas: number;
  /** Lecturas por hora de México («08» → 1234). */
  porHora: Record<string, number>;
}

/** Lee el medidor de consumo que el Worker va llenando (`consumo_firestore/{dia}`). */
export interface IConsumoFirestoreRepository {
  /** El consumo del día (1 lectura); null si todavía no hay nada anotado. */
  delDia(dia: string): Promise<ConsumoDia | null>;
}
