# Arquitectura

El proyecto es una web comercial estática compuesta por cuatro documentos HTML
y recursos comunes.

## Responsabilidades

- `index.html`: posicionamiento comercial y entrada al catálogo.
- `servicios.html`: catálogo completo.
- `nosotros.html`: confianza y propuesta de valor.
- `cotizacion.html`: captura de datos y acciones de envío/PDF.
- `css/styles.css`: diseño y componentes visuales comunes.
- `js/data.js`: nombre comercial, WhatsApp y catálogo.
- `js/main.js`: menú móvil, año dinámico y renderizado de servicios.
- `js/cotizador.js`: formulario por pasos, vista previa técnica, descarga de
  PDF sin precios y apertura de WhatsApp; no calcula ni carga precios.
- `js/quote-engine.js`: conversiones geométricas y formato de la solicitud.
- `js/apps-script-client.js`: payload técnico, envío al Apps Script configurado
  y validación de la respuesta JSON.
- `seller-local/ventas.html`: herramienta local separada para que ventas
  introduzca los precios y genere el PDF final.
- `seller-local/sales-engine.js`: cálculo de totales internos a partir de los
  precios digitados por ventas.
- `.github/workflows/deploy-pages.yml`: publica explícitamente solo los
  archivos del sitio; excluye la herramienta local, el backend y los archivos
  internos.

## Flujo de cotización

1. El usuario abre `cotizacion.html` o selecciona un servicio.
2. `main.js` carga el formulario y el catálogo.
3. `cotizador.js` muestra un resumen técnico sin importes.
4. El cliente elige enviar la solicitud, descargar el PDF sin precios o
   descargarlo y abrir WhatsApp para adjuntarlo.
5. El navegador envía únicamente datos técnicos y de contacto a
   `apps-script-client.js`; no comparte archivos PDF automáticamente por
   WhatsApp.
6. Ventas puede usar `seller-local/ventas.html` para generar una cotización con
   precios editables, de manera independiente.

## Evolución

La herramienta local no incluye precios predeterminados ni persiste información.
No está protegida por autenticación y no debe publicarse: solo se ejecuta en el
equipo de ventas mediante un servidor local. GitHub Pages recibe una lista
permitida de archivos en lugar de la raíz completa del repositorio.
