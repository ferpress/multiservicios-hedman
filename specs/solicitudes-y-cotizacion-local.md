# Solicitud pública y cotización local

## Alcance

La página de cotización es estática y compatible con GitHub Pages. El precio y
la generación de la cotización final son responsabilidades internas de ventas.

## Comportamiento

- El cliente configura el proyecto y sus datos de contacto; no se muestran
  precios, tasas ni totales.
- El resumen técnico incluye medidas, área o longitud, cantidad,
  especificaciones, ubicación e instalación.
- «Enviar solicitud automática» envía el payload técnico y de contacto a la
  implementación de Google Apps Script configurada; no incluye campos de
  precios, RUC ni DV. El JSON contiene exclusivamente `cliente`, `telefono`,
  `ubicacion`, `correo`, `items: [{ descripcion, cantidad }]` y
  `enviarCorreo`.
- La acción automática envía `enviarCorreo: true` y solo confirma el envío al
  correo del vendedor cuando la respuesta indica `correoEnviado: true`.
- Las acciones de descarga y WhatsApp usan `enviarCorreo: false`.
- «Descargar PDF sin precios» descarga `pdfBase64` de la respuesta JSON.
- «Enviar por WhatsApp» genera y descarga el PDF, luego abre WhatsApp con el
  consecutivo y los datos técnicos. El cliente debe adjuntar el archivo.
- La solicitud HTTP `POST` usa `text/plain` para evitar una preflight CORS y
  requiere que el servicio responda JSON con `ok` y `consecutivo`; las acciones
  de PDF requieren además `pdfBase64` y `filename`.
- Ventas copia los datos en `seller-local/ventas.html`, introduce precio
  unitario, flete, instalación e ITBMS y puede imprimir o guardar la propuesta
  final como PDF.
- La herramienta local no guarda datos ni viene preconfigurada con tarifas.
  GitHub Pages debe publicar solo una lista explícita de archivos públicos que
  excluya `seller-local/`, `backend-python/`, la plantilla y la configuración
  interna.

## Validación

Probar las acciones con respuestas simuladas, verificar que el payload no
incluya precios y que el resumen público no los muestre. Confirmar por separado
que el Apps Script publicado acepta la solicitud y devuelve un PDF válido; no
enviar datos personales reales durante pruebas automatizadas.
En ventas, comprobar los cálculos editables y usar el diálogo de impresión para
guardar el PDF. Ejecutar pruebas, lint, formato y validación de enlaces.
