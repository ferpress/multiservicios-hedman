from __future__ import annotations

import tempfile
import unittest
import zipfile
from datetime import date
from pathlib import Path
from xml.etree import ElementTree as ET

from pricing_engine import calculate_quote
from template_renderer import (
    DISCLAIMER,
    NS,
    _worksheet_path,
    create_sanitized_template,
    populate_quote_template,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE_TEMPLATE = ROOT / "Plantilla_Cotización" / "cotizacion_plantilla.xlsx"
SANITIZED_TEMPLATE = Path(__file__).parent / "templates" / "cotizacion_plantilla.xlsx"


def _read_text(archive: zipfile.ZipFile, worksheet_path: str, reference: str) -> str:
    worksheet = ET.fromstring(archive.read(worksheet_path))
    cell = worksheet.find(f".//m:c[@r='{reference}']", NS)
    if cell is None:
        return ""
    if cell.attrib.get("t") == "inlineStr":
        return "".join(node.text or "" for node in cell.findall(".//m:t", NS))
    value = cell.find("m:v", NS)
    if value is None:
        return ""
    if cell.attrib.get("t") == "s":
        shared_strings = ET.fromstring(archive.read("xl/sharedStrings.xml"))
        strings = [
            "".join(node.text or "" for node in item.findall(".//m:t", NS))
            for item in shared_strings.findall("m:si", NS)
        ]
        return strings[int(value.text or "0")]
    return value.text or ""


def _project():
    return {
        "name": "Cliente de prueba",
        "ruc": "8-123-456",
        "ruc_dv": "12",
        "client_phone": "6000-0000",
        "email": "cliente@example.com",
        "address": "Referencia de prueba",
        "service": "windows",
        "location": "center",
        "width_m": 1.5,
        "height_m": 1.2,
        "quantity": 1,
        "installation_included": True,
        "frame": "natural",
        "glass": "clear",
        "glass_thickness_mm": 8,
        "window_opening": "sliding",
        "door_type": "sliding",
        "hardware_finish": "chrome",
        "cabinet_material": "melamine",
        "countertop": "none",
        "soft_close": True,
        "kitchen_l_shape": False,
        "welding_type": "securityBars",
        "welding_finish": "primer",
    }


class TemplateRendererTests(unittest.TestCase):
    def test_sanitized_workbook_removes_historical_customer_strings(self):
        from openpyxl import load_workbook

        original = load_workbook(SOURCE_TEMPLATE)
        original_sheet = original.active
        private_values = [
            original_sheet[cell].value
            for cell in ("B12", "B13", "B14", "B15", "B16")
        ]

        with tempfile.TemporaryDirectory() as directory:
            sanitized_path = Path(directory) / "template.xlsx"
            create_sanitized_template(SOURCE_TEMPLATE, sanitized_path)
            for candidate in (sanitized_path, SANITIZED_TEMPLATE):
                sanitized = load_workbook(candidate)
                sanitized_sheet = next(
                    (
                        item
                        for item in sanitized.worksheets
                        if item.title.strip().casefold() == "cotización".casefold()
                    ),
                    sanitized.active,
                )
                for cell in ("B12", "B13", "H13", "B14", "B15", "B16", "G2"):
                    self.assertIsNone(sanitized_sheet[cell].value)
                self.assertFalse(
                    any(
                        value
                        and sanitized_sheet
                        and any(
                            row_cell.value == value
                            for row in sanitized_sheet.iter_rows()
                            for row_cell in row
                        )
                        for value in private_values
                    ),
                    "La copia saneada conserva datos históricos del cliente.",
                )

    def test_population_changes_values_without_changing_template_structure(self):
        with tempfile.TemporaryDirectory() as directory:
            output_path = Path(directory) / "COT-2026-0001.xlsx"
            quote = calculate_quote(_project())
            quote.update(
                {
                    "reference": "COT-2026-0001",
                    "date": date(2026, 4, 1),
                    "valid_until": date(2026, 4, 16),
                    "customer_name": "Cliente de prueba",
                    "ruc": "8-123-456",
                    "ruc_dv": "12",
                    "client_phone": "6000-0000",
                    "email": "cliente@example.com",
                    "address": "Referencia de prueba",
                }
            )
            populate_quote_template(SANITIZED_TEMPLATE, output_path, quote)

            with (
                zipfile.ZipFile(SANITIZED_TEMPLATE) as template,
                zipfile.ZipFile(output_path) as result,
            ):
                template_sheet_path = _worksheet_path(template)
                result_sheet_path = _worksheet_path(result)
                template_sheet = ET.fromstring(template.read(template_sheet_path))
                result_sheet = ET.fromstring(result.read(result_sheet_path))
                template_merges = template_sheet.find("m:mergeCells", NS)
                result_merges = result_sheet.find("m:mergeCells", NS)

                self.assertEqual(
                    sorted(
                        item.attrib["ref"]
                        for item in template_merges.findall("m:mergeCell", NS)
                    ),
                    sorted(
                        item.attrib["ref"]
                        for item in result_merges.findall("m:mergeCell", NS)
                    ),
                )

                for reference, expected in (
                    ("G2", "COTIZACIÓN 0001"),
                    ("B12", "Cliente de prueba"),
                    ("B13", "8-123-456"),
                    ("H13", "12"),
                    ("B14", "6000-0000"),
                    ("B16", "cliente@example.com"),
                    ("B15", "Panamá Centro · Referencia de prueba"),
                    ("A18", "Ventanas a Medida"),
                    ("A52", f"Válida por 15 días, hasta el 16/04/2026. {DISCLAIMER}"),
                ):
                    self.assertEqual(
                        _read_text(result, result_sheet_path, reference), expected
                    )

                first_detail = [
                    _read_text(result, result_sheet_path, reference)
                    for reference in ("A19", "A20")
                ]
                self.assertEqual(
                    " ".join(filter(None, first_detail)),
                    quote["items"][0]["detail"],
                )
                total_cell = result_sheet.find(".//m:c[@r='I43']", NS)
                self.assertEqual(
                    "".join(
                        node.text or ""
                        for node in total_cell.findall(".//m:t", NS)
                    ),
                    "Pendiente",
                )
                self.assertEqual(
                    result_sheet.find(".//m:c[@r='G2']", NS).attrib.get("s"),
                    template_sheet.find(".//m:c[@r='G2']", NS).attrib.get("s"),
                )

    def test_all_service_details_fit_template_and_remain_in_spanish(self):
        service_options = (
            ("windows", {}),
            ("bathroom", {"glass": "tempered"}),
            ("kitchen", {"height_m": None}),
            ("welding", {}),
        )
        with tempfile.TemporaryDirectory() as directory:
            for index, (service, options) in enumerate(service_options):
                payload = {**_project(), "service": service, **options}
                quote = calculate_quote(payload)
                quote.update(
                    {
                        "reference": f"COT-2026-{index + 1:04d}",
                        "date": date(2026, 4, 1),
                        "valid_until": date(2026, 4, 16),
                        "customer_name": "Cliente de prueba",
                        "ruc": "8-123-456",
                        "ruc_dv": "12",
                        "client_phone": "6000-0000",
                        "email": "cliente@example.com",
                        "address": "Referencia de prueba",
                    }
                )
                output_path = Path(directory) / f"{service}.xlsx"
                populate_quote_template(
                    SANITIZED_TEMPLATE,
                    output_path,
                    quote,
                )
                with zipfile.ZipFile(output_path) as result:
                    worksheet_path = _worksheet_path(result)
                    details = [
                        _read_text(result, worksheet_path, reference)
                        for reference in ("A19", "A20")
                    ]
                self.assertEqual(
                    " ".join(filter(None, details)),
                    quote["items"][0]["detail"],
                )
                self.assertNotIn("Sliding", quote["items"][0]["detail"])
                self.assertNotIn("Hinged", quote["items"][0]["detail"])


if __name__ == "__main__":
    unittest.main()
