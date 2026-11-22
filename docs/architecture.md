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
- `js/cotizador.js`: formulario por pasos, vista previa técnica y solicitud de
  WhatsApp; no calcula ni carga precios.
- `js/quote-engine.js`: conversiones geométricas y formato de la solicitud.
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
4. El cliente pulsa enviar y revisa la solicitud prellenada en WhatsApp.
5. Ventas copia los datos en `seller-local/ventas.html`, asigna los importes y
   genera el documento final con la impresión del navegador.

## Evolución

La herramienta local no incluye precios predeterminados ni persiste información.
No está protegida por autenticación y no debe publicarse: solo se ejecuta en el
equipo de ventas mediante un servidor local. GitHub Pages recibe una lista
permitida de archivos en lugar de la raíz completa del repositorio.
