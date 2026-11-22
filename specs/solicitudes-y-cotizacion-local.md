# Solicitud pública y cotización local

## Alcance

La página de cotización es estática y compatible con GitHub Pages. El precio y
la generación de la cotización final son responsabilidades internas de ventas.

## Comportamiento

- El cliente configura el proyecto y sus datos de contacto; no se muestran
  precios, tasas ni totales.
- El resumen técnico incluye medidas, área o longitud, cantidad,
  especificaciones, ubicación e instalación.
- Enviar solicitud abre WhatsApp con el resumen técnico y datos de contacto
  prellenados. El cliente confirma el envío desde WhatsApp.
- La página pública no envía peticiones HTTP `POST` ni genera PDF.
- Ventas copia los datos en `seller-local/ventas.html`, introduce precio
  unitario, flete, instalación e ITBMS y puede imprimir o guardar la propuesta
  final como PDF.
- La herramienta local no guarda datos ni viene preconfigurada con tarifas.
  GitHub Pages debe publicar solo una lista explícita de archivos públicos que
  excluya `seller-local/`, `backend-python/`, la plantilla y la configuración
  interna.

## Validación

Verificar el mensaje de WhatsApp y que el resumen público no incluya precios.
En ventas, comprobar los cálculos editables y usar el diálogo de impresión para
guardar el PDF. Ejecutar pruebas, lint, formato y validación de enlaces.
