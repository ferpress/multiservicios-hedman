# Arquitectura

El proyecto es una web comercial estática compuesta por cuatro documentos HTML
y recursos comunes.

## Responsabilidades

- `index.html`: posicionamiento comercial y entrada al catálogo.
- `servicios.html`: catálogo completo.
- `nosotros.html`: confianza y propuesta de valor.
- `cotizacion.html`: captura de intención y contacto por WhatsApp.
- `css/styles.css`: diseño y componentes visuales comunes.
- `js/data.js`: nombre comercial, WhatsApp y catálogo.
- `js/main.js`: menú móvil, año dinámico y renderizado de servicios.
- `js/cotizador.js`: formulario, vista previa SVG, desglose, impresión y enlace WhatsApp.
- `js/quote-engine.js`: conversiones de medida, cálculos puros de tarifas y rango.
- `js/tarifas.js`: estructura de precios pendientes e ITBMS.

## Flujo de cotización

1. El usuario abre `cotizacion.html` o selecciona un servicio.
2. `main.js` carga el formulario y el catálogo.
3. `cotizador.js` obtiene el desglose de `quote-engine.js` con las tarifas de
   `tarifas.js`; si falta una tarifa, muestra importes pendientes.
4. El navegador prepara una cotización imprimible o abre WhatsApp para revisión
   y envío.

## Evolución

Cualquier funcionalidad nueva debe incluir especificación, plan, pruebas y
documentación actualizada. No introducir backend, autenticación o secretos
sin un plan de seguridad y despliegue.
