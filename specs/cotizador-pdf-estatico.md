# Cotizador estático: PDF y WhatsApp

## Alcance

La página de cotización funciona sin API ni solicitudes HTTP `POST`, para ser
compatible con GitHub Pages.

## Comportamiento

- Descargar PDF prepara la cotización existente para impresión del navegador;
  el usuario elige “Guardar como PDF”.
- El documento imprimible incluye folio local, cliente/RUC-DV, proyecto,
  medidas, ubicación, desglose estimado, ITBMS y total.
- Compartir por WhatsApp abre un mensaje prellenado con los datos del cliente,
  proyecto y desglose, e indica que se descargue y adjunte el PDF.
- Un enlace `wa.me` no puede adjuntar un archivo binario desde el navegador.

## Validación

Verificar el flujo de impresión, el mensaje de WhatsApp, y ejecutar las pruebas,
lint, formato y validación de enlaces del proyecto.
