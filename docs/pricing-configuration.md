# Configuración de tarifas del cotizador

El motor calcula importes cuando todas las tarifas requeridas para el servicio y
la zona están configuradas. No se deben convertir los valores de la plantilla
histórica en una lista de precios ni presentar tarifas inventadas como
cotización comercial.

## Archivo de tarifas

Completar `js/tarifas.js` únicamente con valores aprobados por Multiservicios
Hedman. Las cantidades deben especificarse en USD y con su unidad:

- Ventanas: precio base por m², factor de apertura, costo de vidrio por m² y
  multiplicador de acabado del marco.
- Puertas de baño: precio base por m², factor por espesor y tipo de puerta,
  costo de vidrio por m² y costo de herrajes por puerta.
- Cocinas: precio por ml inferior y superior, multiplicador de material y precio
  por ml de sobrecubierta.
- Soldadura: precio por m² para cada tipo de proyecto y tarifa por acabado.
- Logística por zona: cargo base de transporte, costo variable por unidad
  medible e instalación por unidad.
- Rango: `rangeVariance` como proporción (por ejemplo, `0.10` para ±10 %),
  aprobada por el responsable comercial.

Mientras falte alguna tarifa, debe mantenerse `null`; nunca reemplazarla por
cero. La única excepción intencional es una opción sin costo, como `none` para
la sobrecubierta. La interfaz debe mostrar “Pendiente” y no un subtotal ni un
total si falta cualquier tarifa necesaria, incluida la variación del rango.

## Fórmula aplicada

- Base y acabado se calculan según el servicio, las medidas facturables y las
  opciones elegidas.
- Transporte = cargo base de la zona + tarifa variable × medida del proyecto.
- Instalación = tarifa de instalación de la zona × medida del proyecto.
- Subtotal = base + acabado + transporte + instalación.
- ITBMS = subtotal × `itbmsRate`; total = subtotal + ITBMS.
- El rango mostrado aplica `rangeVariance` al total con ITBMS incluido.
- El precio unitario de la plantilla es un promedio del subtotal entre unidades
  (piezas, m² o ml); transporte e instalación se distribuyen en ese promedio.

Estas reglas son aproximaciones configurables, no sustituyen la inspección,
rectificación de medidas ni validación de desperdicio, fletes y alcance.

## Impuestos

La interfaz muestra ITBMS del 7 % como solicitado. El importe solo puede
calcularse cuando exista un subtotal con tarifas aprobadas. Confirmar con el
responsable contable que su aplicación corresponde a cada cotización y mantener
`itbmsRate` alineado con su aprobación.

## Rango estimado

Antes de habilitar `rangeVariance`, aprobar el margen de variación y qué
conceptos están incluidos (materiales, desperdicio, instalación, transporte,
flete y trabajos eléctricos/plomería de cocina, si aplican). El motor no calcula
el rango mientras el valor continúe en `null`.
