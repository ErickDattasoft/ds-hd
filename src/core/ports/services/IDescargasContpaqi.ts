/** Trae el HTML de la página pública de descargas de CONTPAQi. */
export interface IDescargasContpaqi {
  /** Lanza un error con un mensaje para el usuario si la página no responde. */
  leerPagina(): Promise<string>;
}
