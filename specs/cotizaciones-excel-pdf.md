# Cotizaciones Excel y PDF

## Objetivo

Generar una cotización oficial reutilizando la plantilla XLSX original, sin
modificar su estructura, estilos ni diseño.

## Datos obligatorios

- Nombre o razón social.
- RUC.
- Dígito verificador/DV.
- Teléfono.
- Correo electrónico.
- Dirección o referencia.
- Ítems solicitados y cantidades.

## Plantilla

- Archivo fuente: `Plantilla_Cotización/cotizacion_plantilla.xlsx`.
- Hoja activa: `COTIZACIÓN`.
- Consecutivo: `G2`.
- Fecha: `J3`.
- Cliente:
  - Nombre: `B12`.
  - RUC: `B13`.
  - DV: `H13`.
  - Teléfono: `B14`.
  - Dirección: `B15`.
  - Correo: `B16`.
- Ítems: filas de descripción `A18/A19`, `A21/A22`, `A24/A25`, `A27/A28`,
  `A30/A31`, `A33/A34` y `A36/A37`; cantidades en `F19`, `F22`, `F25`,
  `F28`, `F31`, `F34` y `F37`.
- Precios unitarios, subtotales, ITBMS y total se escriben como `Pendiente`.
- Subtotal: `I41`; ITBMS: `I42`; total: `I43`.

## Archivos

Cada generación crea un XLSX editable y un PDF espejo en
`backend-python/cotizaciones_generadas/` y conserva únicamente el consecutivo
en SQLite.

## Entrega

La respuesta incluye el PDF para descarga directa y las URLs públicas locales
de ambos archivos. El mensaje de WhatsApp incluye folio, cliente, RUC/DV,
resumen de ítems y enlace al PDF.
