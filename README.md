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

No utiliza framework, compilador, base de datos ni backend.

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
js/cotizador.js        Formulario y enlace de WhatsApp
tests/                 Pruebas automatizadas
scripts/               Validaciones locales
docs/                  Arquitectura y gobernanza
specs/                 Especificaciones vivas
Apuntes/               Referencias del curso de IA
Plantilla_Cotización/  Plantilla XLSX
Logo/                  Identidad visual
```

## Configuración comercial

Modificar `business` en `js/data.js`. El número de WhatsApp debe incluir el
código de país. Ejemplo: `"+507 6317-3442"`.

Los servicios se mantienen en el arreglo `services` de `js/data.js`. Deben
conservarse consistentes entre el catálogo y el formulario.

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

La rama `main` se publica mediante GitHub Pages. Antes de publicar:

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

## Convenciones

- Español en interfaz y documentación.
- Código JavaScript simple y legible.
- Cambios pequeños y enfocados.
- No guardar secretos en el repositorio.
- Actualizar documentación y especificaciones cuando cambie el comportamiento.

## Licencia

El propietario debe elegir y añadir una licencia antes de distribuir o reutilizar
el código públicamente.
