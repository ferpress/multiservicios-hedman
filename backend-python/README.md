# API de cotización oficial

Microservicio FastAPI independiente para GitHub Pages. Recibe los datos del
cotizador, recalcula las tarifas en el servidor, rellena una copia saneada de la
plantilla XLSX original y convierte esa copia a PDF con LibreOffice.

## Plantilla

`templates/cotizacion_plantilla.xlsx` conserva la hoja, el diseño, los formatos,
las celdas combinadas y el logo del archivo original. La copia de este servicio
solo elimina datos variables de la cotización histórica; el archivo original en
`Plantilla_Cotización/cotizacion_plantilla.xlsx` no se altera.

La API modifica exclusivamente valores de celdas de referencia, fecha, cliente,
conceptos, totales y vigencia. No agrega ni elimina filas o celdas combinadas.

## Ejecución local o en servidor estándar

El API puede ejecutarse con Uvicorn detrás de un servidor estándar. Para conservar
los consecutivos, define `QUOTE_DB_PATH` con una ruta persistente.

La configuración CORS acepta únicamente:

- `https://multiservicioshedman.com`
- `https://ferpress.github.io`
- `http://localhost` y `http://127.0.0.1` para desarrollo local.

## API

- `GET /health`
- `POST /api/quotes/pdf` — JSON de cliente, servicio, medidas, opciones y zona;
  responde `application/pdf`, `Content-Disposition` y `X-Quote-Reference`.

Las tarifas en `pricing_engine.py` son valores demostrativos en USD y deben ser
revisadas por el responsable comercial antes de usarse como oferta.

## Desarrollo local

Se requiere Python 3.12+, LibreOffice Calc y las dependencias de
`requirements.txt`.

```powershell
python -m pip install -r requirements.txt
$env:QUOTE_DB_PATH = "$PWD\quotes.sqlite3"
uvicorn app:app --reload --port 10000
```

Pruebas de lógica:

```powershell
python -m unittest discover -s . -p "test_*.py"
```

## Privacidad y folios

El servicio no escribe datos del cliente en una base de cotizaciones: la base
SQLite guarda únicamente el consecutivo anual. Los datos del cliente se usan
solo durante la generación y los archivos se conservan en
`cotizaciones_generadas/`. La base local debe estar en una ruta persistente
para que el consecutivo se mantenga después de reinicios.
