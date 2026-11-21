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
- `js/cotizador.js`: opciones, validación y URL de WhatsApp.

## Flujo de cotización

1. El usuario abre `cotizacion.html` o selecciona un servicio.
2. `main.js` carga el formulario y el catálogo.
3. `cotizador.js` valida el número y construye el mensaje.
4. El navegador abre WhatsApp para revisión y envío.

## Evolución

Cualquier funcionalidad nueva debe incluir especificación, plan, pruebas y
documentación actualizada. No introducir backend, autenticación o secretos
sin un plan de seguridad y despliegue.
