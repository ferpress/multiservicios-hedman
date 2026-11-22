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
- `js/cotizador.js`: formulario por pasos, vista previa SVG, estimado local,
  solicitud del PDF oficial y flujo de WhatsApp.
- `js/quote-engine.js`: conversiones de medidas, precios, impuestos y folios.
- `js/pricing-config.js`: precios demostrativos, recargos logísticos e ITBMS.
- `backend-python/app.py`: API FastAPI independiente con CORS restringido a los
  dos orígenes públicos.
- `backend-python/pricing_engine.py`: recálculo y validación de tarifas del lado
  del servidor.
- `backend-python/template_renderer.py`: actualización de valores en la copia
  saneada de la hoja XLSX y conversión PDF con LibreOffice.
- `backend-python/quote_store.py`: consecutivo anual SQLite; requiere disco
  persistente en Render para sobrevivir reinicios.

## Flujo de cotización

1. El usuario abre `cotizacion.html` o selecciona un servicio.
2. `main.js` carga el formulario y el catálogo.
3. `cotizador.js` calcula el estimado local y envía al API los campos del
   proyecto, no el total calculado por el cliente.
4. FastAPI valida y recalcula los precios, asigna un folio, rellena una copia
   saneada de la plantilla XLSX y usa LibreOffice para generar el PDF.
5. El navegador recibe el PDF binario y lo comparte mediante Web Share en
   móviles compatibles o lo descarga y prepara WhatsApp en escritorio.

## Evolución

Las tarifas de demostración se mantienen en `js/pricing-config.js` para la
estimación instantánea y en `backend-python/pricing_engine.py` para el cálculo
oficial. Deben mantenerse sincronizadas y ser aprobadas comercialmente. El
ITBMS de 7 % se calcula en ambos lados.

El alojamiento de `index.html`, `cotizacion.html`, CSS/JS y el dominio continúa
en GitHub Pages; Render aloja solamente el microservicio Python.
