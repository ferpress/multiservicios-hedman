# Configuración de tarifas del cotizador

`js/pricing-config.js` y `backend-python/pricing_engine.py` contienen importes de
demostración en USD, solicitados para activar el prototipo. No son una lista de
precios aprobada por Multiservicios Hedman. Mantener ambas configuraciones
sincronizadas y confirmar cada tarifa, costo por zona y condición fiscal con el
responsable comercial y contable antes de anunciarla como oferta.

## Tarifas base de demostración

- Ventanas: `$110.00 / m²`.
- Puertas de baño templadas: `$165.00 / m²`.
- Muebles de cocina: `$240.00 / m lineal`.
- Soldadura: desde `$95.00 / m²` para verjas; portones, techos y estructuras
  personalizadas usan valores de ejemplo distintos.

La configuración también define factores de acabado, tipo de vidrio, espesor,
herrajes, materiales, sobrecubiertas y logística por zona. Los valores se
centralizan en el objeto `quotePricing`; no se derivan de cotizaciones antiguas.

## Fórmula aplicada

- Área facturable de ventanas y vidrio: `max(ancho × alto, 1 m²) × cantidad`.
- Base de producto: tarifa del servicio × área o longitud facturable.
- Acabados: multiplicadores de color/material y suplementos de vidrio,
  herrajes, sobrecubierta o pintura.
- Transporte: cargo base de zona + tarifa variable × medida del proyecto.
- Instalación: tarifa de zona × medida, solo si se selecciona “Incluye
  instalación”.
- Subtotal: producto + transporte + instalación.
- ITBMS: subtotal × `itbmsRate` (7 %); total = subtotal + ITBMS.

Los valores unitarios son promedios del subtotal de producto entre el área o
longitud facturable. Transporte e instalación aparecen como líneas aparte en la
plantilla formal.

Los gabinetes con cierre lento agregan actualmente $15.00 por metro lineal en
ambos motores de cálculo.

## Vigencia, folios y PDF

El PDF oficial obtiene su folio `COT-AAAA-NNNN` de SQLite en el servicio
Python. Configura `QUOTE_DB_PATH` en una ruta persistente del servidor.

La salida PDF se genera con una copia saneada de la plantilla XLSX existente y
LibreOffice. El libro fuente no se modifica. CORS debe permitir únicamente los
orígenes públicos del sitio y de GitHub Pages.

**Texto obligatorio en cotizaciones:** “Cotización estimada sujeta a
rectificación técnica de medidas en sitio antes de fabricación.”
