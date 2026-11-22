# Configuración de precios

## Política de precios

El sitio público no carga ni calcula precios y no muestra importes al cliente.
El cliente envía únicamente datos técnicos y de contacto mediante WhatsApp.

Ventas captura las tarifas finales directamente en `seller-local/ventas.html`.
El precio unitario, flete, instalación e ITBMS son campos editables; no existe
una lista de tarifas predeterminada en la herramienta. El total se calcula
localmente y el PDF se genera usando la función de impresión del navegador.

La herramienta está excluida del artefacto de GitHub Pages, no tiene
autenticación y no almacena datos. Debe ejecutarse solo desde el equipo de
ventas; no debe publicarse ni compartirse por una URL pública. La exclusión de
Pages no oculta los archivos de un repositorio público, por lo que no deben
guardarse allí tarifas comerciales reales ni datos de clientes.
