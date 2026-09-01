// Punto de entrada del JS de cliente. htmx y Alpine se cargan como vendor aparte;
// aquí solo va configuración global y componentes Alpine propios (se irán agregando por fase).
document.addEventListener('alpine:init', () => {
  // Placeholder Fase 0. Ej. futuro: Alpine.data('modal', () => ({ open: false }))
});

document.body.addEventListener('htmx:configRequest', (event) => {
  // El token CSRF se inyectará aquí en Fase 1 (double-submit).
  void event;
});
