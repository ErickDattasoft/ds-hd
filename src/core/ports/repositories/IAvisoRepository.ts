import type { AvisoEnviado, FiltroAvisos } from '../../entities/AvisoEnviado.js';

/** Historial de avisos de versiones/licencias ya enviados (`avisos_versiones/{id}`). */
export interface IAvisoRepository {
  /** Registra varios de golpe: un envío a una empresa genera un aviso por sistema. */
  registrar(avisos: AvisoEnviado[]): Promise<void>;
  /** Los avisos que cumplen el filtro, del más reciente al más antiguo. */
  list(filtro?: FiltroAvisos): Promise<AvisoEnviado[]>;
}
