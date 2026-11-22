from __future__ import annotations

import posixpath
import zipfile
from datetime import date
from pathlib import Path
from xml.etree import ElementTree as ET

from openpyxl import load_workbook


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
DOC_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"m": MAIN_NS, "r": DOC_REL_NS, "p": PKG_REL_NS}
DISCLAIMER = (
    "Cotización estimada sujeta a rectificación técnica de medidas en sitio "
    "antes de fabricación."
)

ITEM_ROWS = (18, 21, 24, 27, 30, 33, 36)


def _worksheet_path(archive: zipfile.ZipFile) -> str:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    target_by_id = {
        relationship.attrib["Id"]: relationship.attrib["Target"]
        for relationship in relationships.findall("p:Relationship", NS)
    }
    sheets = workbook.findall("m:sheets/m:sheet", NS)
    if not sheets:
        raise ValueError("La plantilla XLSX no contiene hojas.")
    sheet = next(
        (
            item
            for item in sheets
            if item.attrib.get("name", "").strip().casefold()
            == "cotización".casefold()
        ),
        sheets[0],
    )
    relationship_id = sheet.attrib[f"{{{DOC_REL_NS}}}id"]
    target = target_by_id[relationship_id]
    if target.startswith("/"):
        return target.lstrip("/")
    return posixpath.normpath(posixpath.join("xl", target))


def populate_quote_template(
    template_path: Path,
    output_path: Path,
    quote: dict,
) -> None:
    if not template_path.is_file():
        raise FileNotFoundError(template_path)

    workbook = load_workbook(template_path)
    sheet = next(
        (
            candidate
            for candidate in workbook.worksheets
            if candidate.title.strip().casefold() == "cotización".casefold()
        ),
        workbook.active,
    )

    number = str(quote["reference"]).rsplit("-", 1)[-1]
    sheet["G2"] = f"COTIZACIÓN {number}"
    sheet["J3"] = quote["date"]
    sheet["B12"] = quote["customer_name"]
    sheet["B13"] = quote["ruc"]
    sheet["H13"] = quote["ruc_dv"]
    sheet["B14"] = quote["client_phone"] or "No indicado"
    sheet["B15"] = f'{quote["location_label"]} · {quote["address"]}'
    sheet["B16"] = quote["email"] or "No indicado"

    for title_row in ITEM_ROWS:
        for reference in (
            f"A{title_row}",
            f"A{title_row + 1}",
            f"F{title_row + 1}",
            f"G{title_row + 1}",
            f"I{title_row + 1}",
        ):
            sheet[reference] = None

    items = quote.get("items", [])
    if len(items) > len(ITEM_ROWS):
        raise ValueError("La plantilla no tiene espacio para todos los conceptos.")

    for title_row, item in zip(ITEM_ROWS, items):
        detail_row = title_row + 1
        sheet[f"A{title_row}"] = item["title"]
        sheet[f"A{detail_row}"] = item["detail"]
        sheet[f"F{detail_row}"] = item["quantity"]
        sheet[f"G{detail_row}"] = "Pendiente"
        sheet[f"I{detail_row}"] = "Pendiente"

    sheet["I41"] = "Pendiente"
    sheet["I42"] = "Pendiente"
    sheet["I43"] = "Pendiente"
    sheet["A52"] = (
        f'Válida por 15 días, hasta el {quote["valid_until"]:%d/%m/%Y}. '
        f"{DISCLAIMER}"
    )

    sheet.page_setup.fitToWidth = 1
    sheet.page_setup.fitToHeight = 0

    output_path.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(output_path)


def create_sanitized_template(source_path: Path, output_path: Path) -> None:
    workbook = load_workbook(source_path)
    sheet = next(
        (
            candidate
            for candidate in workbook.worksheets
            if candidate.title.strip().casefold() == "cotización".casefold()
        ),
        workbook.active,
    )

    for reference in (
        "G2",
        "J3",
        "B12",
        "B13",
        "H13",
        "B14",
        "B15",
        "B16",
        "I41",
        "I42",
        "I43",
        "A52",
    ):
        sheet[reference] = None

    for title_row in ITEM_ROWS:
        for reference in (
            f"A{title_row}",
            f"A{title_row + 1}",
            f"F{title_row + 1}",
            f"G{title_row + 1}",
            f"I{title_row + 1}",
        ):
            sheet[reference] = None

    output_path.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(output_path)
