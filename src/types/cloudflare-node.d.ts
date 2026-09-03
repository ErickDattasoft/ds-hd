/**
 * Módulo interno del runtime de Cloudflare Workers (`workerd`). No tiene `@types`
 * publicados; se declara aquí la superficie mínima que usa `main.worker.ts`.
 *
 * `httpServerHandler` conecta un servidor HTTP de Node (`app.listen(port)`) con el modelo
 * de request de Workers — el `port` actúa como clave de enrutado, no como puerto TCP real.
 * Requiere `compatibility_flags: ["nodejs_compat", "enable_nodejs_http_server_modules"]`
 * (el segundo se activa solo con compat date >= 2025-09-01).
 */
declare module 'cloudflare:node' {
  interface HttpServerHandlerOptions {
    readonly port: number;
  }

  interface WorkerEntrypointHandler {
    fetch(request: Request, env: unknown, ctx: unknown): Promise<Response>;
  }

  export function httpServerHandler(options: HttpServerHandlerOptions): WorkerEntrypointHandler;
}
