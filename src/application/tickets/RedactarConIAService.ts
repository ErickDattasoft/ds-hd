import type { IRedactorIA, ResultadoRedaccion } from '../../core/ports/services/IRedactorIA.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import { ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

const MAX_CARACTERES = 6000;

/** «✨ Corregir» del editor de tickets: propone varias redacciones; el agente elige una. */
export class RedactarConIAService {
  constructor(
    private readonly redactor: IRedactorIA,
    private readonly logger: ILogger,
  ) {}

  async proponer(actor: SessionUser, texto: string, asunto = '', tips = false): Promise<ResultadoRedaccion> {
    const limpio = texto.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
    if (limpio.length < 5) throw new ValidationError('Escribe algo antes de corregir');
    if (limpio.length > MAX_CARACTERES) {
      throw new ValidationError(`El texto es muy largo para corregirlo (máximo ${MAX_CARACTERES} caracteres)`);
    }
    if (!this.redactor.disponible()) throw new ValidationError('El corrector solo funciona en el servidor publicado');
    let r: ResultadoRedaccion;
    try {
      r = await this.redactor.proponer({ texto: limpio, asunto: asunto.trim().slice(0, 200), tips });
    } catch (err) {
      this.logger.warn('Corrector IA falló', { por: actor.uid, err: err instanceof Error ? err.message : String(err) });
      throw new ValidationError('El corrector no respondió; intenta de nuevo en un momento');
    }
    if (!r.opciones.length) throw new ValidationError('El corrector no devolvió opciones; intenta de nuevo');
    this.logger.info('Corrector IA usado', { por: actor.uid, caracteres: limpio.length });
    return r;
  }
}
