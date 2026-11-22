# Multiservicios Hedman

Sitio web comercial estático para presentar servicios de aluminio, vidrio,
puertas, ventanas y muebles a medida en Panamá, y facilitar solicitudes de
cotización por WhatsApp.

## Tecnologías

- HTML5
- CSS
- JavaScript con módulos ES
- GitHub Pages
- WhatsApp Web
- Google Apps Script para procesar solicitudes y generar PDF sin precios

El sitio no requiere un servidor propio en producción. El formulario envía sus
datos técnicos a una implementación de Google Apps Script; no calcula ni
muestra precios en el sitio.

## Vista previa local

Con Python:

```bash
python -m http.server 8080
```

Abrir `http://localhost:8080`.

## Estructura

```text
index.html             Página principal
servicios.html         Catálogo de servicios
nosotros.html          Información empresarial
cotizacion.html        Formulario de cotización
css/styles.css         Estilos comunes
js/data.js             Datos comerciales y catálogo
js/main.js             Renderizado de servicios y menú
js/cotizador.js        Formulario, resumen técnico, PDF y WhatsApp
js/quote-engine.js     Conversión de medidas y mensajes de solicitud
js/apps-script-client.js Integración del endpoint y respuesta de PDF
seller-local/          Herramienta local de precios y PDF (no se publica)
tests/                 Pruebas automatizadas
scripts/               Validaciones locales
docs/                  Arquitectura y gobernanza
specs/                 Especificaciones vivas
Logo/                  Identidad visual
```

## Configuración comercial

Modificar `business` en `js/data.js`. El número de WhatsApp debe incluir el
código de país. Ejemplo: `"+507 6317-3442"`.

Los servicios se mantienen en el arreglo `services` de `js/data.js`. Deben
conservarse consistentes entre el catálogo y el formulario.

## Solicitudes de cotización

`cotizacion.html` ofrece cuatro pasos, medidas sincronizadas, acabados,
especificaciones por servicio y una vista SVG en vivo. El resumen y el mensaje
de WhatsApp contienen únicamente los datos técnicos y de contacto. El sitio no
carga tarifas, calcula importes ni genera una cotización con precios.

Las tres acciones usan el endpoint configurado en
`js/apps-script-client.js`. **Enviar solicitud automática** solicita el
procesamiento por Apps Script; **Descargar PDF sin precios** descarga el PDF
que devuelve el servicio; **Enviar por WhatsApp** descarga ese mismo archivo y
abre un mensaje con el consecutivo para que el cliente adjunte el PDF.

El endpoint debe aceptar `POST` CORS como `text/plain` y responder JSON con
`ok`, `consecutivo` y, para las acciones de PDF, `pdfBase64` y `filename`.
El payload contiene datos de contacto y técnicos, pero no precios. El URL del
endpoint es visible en el JavaScript público; el Apps Script debe validar las
solicitudes y proteger los datos recibidos. `wa.me` no adjunta archivos
automáticamente.

## Cotización final para ventas

`seller-local/ventas.html` es una herramienta interna de uso local. Ventas copia
la solicitud recibida, edita precio unitario, flete, instalación e ITBMS y usa
el diálogo del navegador para imprimir o guardar el PDF. La herramienta no
guarda los datos y no contiene tarifas predefinidas.

Para abrirla en el equipo de ventas, iniciar el servidor local desde la raíz:

```bash
python -m http.server 8080
```

Visitar `http://localhost:8080/seller-local/ventas.html`. El workflow de
GitHub Pages publica una lista explícita de archivos públicos y excluye
`seller-local/`, `backend-python/`, la plantilla y la configuración interna.
Esta exclusión no oculta el código fuente del repositorio si este es público;
no guardes tarifas comerciales reales ni datos de clientes en el repositorio.

## Instalación y desarrollo

```bash
npm install
npm test
npm run lint
npm run format:check
npm run validate:links
```

Para probar una página directamente durante el desarrollo:

```bash
npm install
python -m http.server 8080
```

## Despliegue

La rama `main` se publica mediante GitHub Pages usando una lista permitida de
archivos. La herramienta de ventas no se incluye en el artefacto público.
Antes de publicar:

1. Ejecutar todas las validaciones.
2. Revisar las páginas en móvil y escritorio.
3. Confirmar el número de WhatsApp.
4. Confirmar metadata, favicon y sitemap.
5. Validar el despliegue en la URL pública.
6. Volver a enviar el sitemap desde Google Search Console si cambia.

## Validaciones

- `npm test`: pruebas de lógica.
- `npm run lint`: calidad de JavaScript.
- `npm run format:check`: formato.
- `npm run validate:links`: enlaces locales.
- `python -m unittest discover -s backend-python -p "test_*.py"`: motor Python y
  manipulación de la plantilla.

## Convenciones

- Español en interfaz y documentación.
- Código JavaScript simple y legible.
- Cambios pequeños y enfocados.
- No guardar secretos en el repositorio.
- Actualizar documentación y especificaciones cuando cambie el comportamiento.

## Licencia

El propietario debe elegir y añadir una licencia antes de distribuir o reutilizar
el código públicamente.
