# AGENTS.md - Multiservicios Hedman

Sitio comercial estático en español para presentar servicios y generar cotizaciones por WhatsApp.

## Stack y estructura
- HTML, CSS y JavaScript puros; no añadir framework sin aprobación.
- `index.html`, `servicios.html`, `nosotros.html` y `cotizacion.html` son las páginas públicas.
- `js/data.js` contiene datos comerciales; `js/main.js` controla UI común; `js/cotizador.js` gestiona WhatsApp.
- Mantener la página funcional desde un servidor local.

## Convenciones
- Interfaz y documentación en español; identificadores de código legibles en inglés.
- Preservar responsive, navegación por teclado y etiquetas ARIA.
- No usar datos o afirmaciones comerciales no verificadas.
- Preferir cambios pequeños y seguir patrones existentes.

## Comandos
- Ejecutar: `python -m http.server 8080`
- Pruebas: `npm test`
- Lint: `npm run lint`
- Formato: `npm run format:check`
- Enlaces: `npm run validate:links`

## Límites
- Siempre: validar cambios y no exponer secretos.
- Preguntar antes: dependencias, migración de arquitectura, datos comerciales y formato de datos.
- Nunca: guardar tokens, credenciales o códigos de recuperación; eliminar archivos sensibles sin revocarlos antes.

## Verificación
- Comprobar las cuatro páginas y el flujo de cotización.
- Ejecutar tests, lint, formato y enlaces.
- Revisar consola, móvil y Lighthouse.
