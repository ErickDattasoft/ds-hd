/** Entrada del registro de auditoría global del CRM (append-only, `bitacora/{id}`). */
export interface EntradaBitacora {
  id: string;
  at: Date;
  actorUid: string | null;
  actorNombre: string | null;
  /** Acción, p. ej. `crear`, `editar`, `archivar`, `cambiar_estado`. */
  accion: string;
  /** Módulo afectado: `empresas`, `contactos`, `tickets`, `cotizaciones`… */
  modulo: string;
  entidadTipo: string;
  entidadId: string;
  resumen: string;
}
