/** Solicitud de acceso al back-office hecha desde la pantalla de login. */
export interface SolicitudAcceso {
  id: string;
  email: string;
  nombre: string;
  mensaje: string | null;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  createdAt: Date;
}

/** Solicitudes de acceso al back-office ("Solicitar acceso" desde el login). */
export interface ISolicitudAccesoRepository {
  create(data: Omit<SolicitudAcceso, 'id' | 'estado' | 'createdAt'>): Promise<SolicitudAcceso>;
  findByEmail(email: string): Promise<SolicitudAcceso | null>;
  listPendientes(): Promise<SolicitudAcceso[]>;
  updateEstado(id: string, estado: SolicitudAcceso['estado']): Promise<void>;
}
