from __future__ import annotations

import logging
import os
import subprocess
import tempfile
import zipfile
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Literal
from zoneinfo import ZoneInfo

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field
from starlette.responses import Response

from pricing_engine import calculate_quote
from quote_store import next_quote_reference
from template_renderer import DISCLAIMER, populate_quote_template


logger = logging.getLogger("hedman.quote_api")
PANAMA_TZ = ZoneInfo("America/Panama")
BASE_DIR = Path(__file__).resolve().parent
TEMPLATE_PATH = BASE_DIR.parent / "Plantilla_Cotización" / "cotizacion_plantilla.xlsx"
GENERATED_DIR = BASE_DIR / "cotizaciones_generadas"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)
LIBREOFFICE_BIN = os.getenv("LIBREOFFICE_BIN", "")
ALLOWED_ORIGINS = [
    "https://multiservicioshedman.com",
    "https://ferpress.github.io",
]
LOCAL_ORIGIN_REGEX = r"^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?$"

app = FastAPI(
    title="Cotizador Multiservicios Hedman",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=LOCAL_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
    expose_headers=[
        "Content-Disposition",
        "X-Quote-Reference",
        "X-PDF-URL",
        "X-XLSX-URL",
    ],
)

app.mount(
    "/cotizaciones_generadas",
    StaticFiles(directory=GENERATED_DIR),
    name="cotizaciones",
)


class QuoteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=80)
    ruc: str = Field(min_length=1, max_length=30)
    ruc_dv: str = Field(min_length=1, max_length=10)
    client_phone: str = Field(default="", max_length=24)
    email: str = Field(default="", max_length=120)
    address: str = Field(min_length=1, max_length=120)
    service: Literal["windows", "bathroom", "kitchen", "welding"]
    location: Literal["center", "sanMiguelito", "east", "west", "interior"]
    width_m: float = Field(gt=0, le=6)
    height_m: float | None = Field(default=None, gt=0, le=3.5)
    quantity: int = Field(default=1, ge=1, le=100)
    installation_included: bool = True
    frame: Literal["natural", "white", "black", "bronze"] = "natural"
    glass: Literal["clear", "bronze", "laminated", "tempered"] = "clear"
    glass_thickness_mm: Literal[8, 10] = 8
    window_opening: Literal["sliding", "hinged"] = "sliding"
    door_type: Literal["sliding", "hinged"] = "sliding"
    hardware_finish: Literal["chrome", "black"] = "chrome"
    cabinet_material: Literal["melamine", "rh", "pvc"] = "melamine"
    countertop: Literal["none", "laminate", "granite", "quartz"] = "none"
    soft_close: bool = True
    kitchen_l_shape: bool = False
    welding_type: Literal["securityBars", "gate", "roof", "custom"] = (
        "securityBars"
    )
    welding_finish: Literal["primer", "enamel"] = "primer"


def _convert_to_pdf(workbook_path: Path, output_directory: Path) -> Path:
    libreoffice = LIBREOFFICE_BIN or shutil.which("soffice") or shutil.which("libreoffice")
    if not libreoffice:
        raise HTTPException(
            status_code=503,
            detail="El servicio de PDF no está listo: falta LibreOffice.",
        )
    profile = (output_directory / "lo-profile").as_uri()
    try:
        result = subprocess.run(
            [
                libreoffice,
                f"-env:UserInstallation={profile}",
                "--headless",
                "--convert-to",
                "pdf:calc_pdf_Export",
                "--outdir",
                str(output_directory),
                str(workbook_path),
            ],
            capture_output=True,
            text=True,
            timeout=90,
            check=False,
        )
    except FileNotFoundError as error:
        logger.exception("No se encontró LibreOffice para convertir la plantilla.")
        raise HTTPException(
            status_code=503,
            detail="El servicio de PDF no está listo: falta LibreOffice.",
        ) from error
    except subprocess.TimeoutExpired as error:
        logger.exception("La conversión de la cotización excedió el tiempo límite.")
        raise HTTPException(
            status_code=504,
            detail="La conversión del PDF tardó demasiado. Intenta nuevamente.",
        ) from error

    pdf_path = output_directory / f"{workbook_path.stem}.pdf"
    if result.returncode != 0 or not pdf_path.is_file():
        logger.error(
            "LibreOffice no generó el PDF (código %s): %s",
            result.returncode,
            result.stderr[-2000:],
        )
        raise HTTPException(
            status_code=500,
            detail="No se pudo convertir la plantilla oficial a PDF.",
        )
    return pdf_path


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/quotes/pdf")
def create_official_quote_pdf(request: QuoteRequest) -> Response:
    if not TEMPLATE_PATH.is_file():
        logger.error("No se encontró la plantilla de cotización: %s", TEMPLATE_PATH)
        raise HTTPException(
            status_code=503,
            detail="La plantilla oficial no está disponible en este momento.",
        )

    payload = request.model_dump()
    try:
        quote = calculate_quote(payload)
    except (KeyError, ValueError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    now = datetime.now(PANAMA_TZ)
    valid_until = now.date() + timedelta(days=15)
    try:
        reference = next_quote_reference(now)
    except (OSError, RuntimeError) as error:
        logger.exception("No se pudo reservar el consecutivo de cotización.")
        raise HTTPException(
            status_code=503,
            detail="No se pudo asignar el número de cotización.",
        ) from error

    quote_document = {
        **quote,
        "reference": reference,
        "date": now.date(),
        "valid_until": valid_until,
        "customer_name": request.name.strip(),
        "ruc": request.ruc.strip(),
        "ruc_dv": request.ruc_dv.strip(),
        "client_phone": request.client_phone.strip(),
        "email": request.email.strip(),
        "address": request.address.strip(),
        "location_label": quote["location_label"],
        "disclaimer": DISCLAIMER,
    }

    try:
        working_directory = GENERATED_DIR / reference
        working_directory.mkdir(parents=True, exist_ok=True)
        workbook_path = working_directory / f"Cotizacion-HEDMAN-{reference}.xlsx"
        populate_quote_template(TEMPLATE_PATH, workbook_path, quote_document)
        pdf_path = _convert_to_pdf(workbook_path, working_directory)
        pdf_bytes = pdf_path.read_bytes()
    except HTTPException:
        raise
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        logger.exception("No se pudo completar la plantilla de cotización.")
        raise HTTPException(
            status_code=500,
            detail="No se pudo preparar la plantilla oficial de cotización.",
        ) from error

    filename = f"Cotizacion-HEDMAN-{reference}.pdf"
    pdf_url = f"/cotizaciones_generadas/{reference}/{filename}"
    xlsx_url = (
        f"/cotizaciones_generadas/{reference}/"
        f"Cotizacion-HEDMAN-{reference}.xlsx"
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Quote-Reference": reference,
            "X-PDF-URL": pdf_url,
            "X-XLSX-URL": xlsx_url,
            "Cache-Control": "no-store",
        },
    )


FRONTEND_DIR = BASE_DIR.parent
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
