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
        "client_phone": "6000-0000",
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
        with zipfile.ZipFile(SOURCE_TEMPLATE) as original:
            original_sheet = _worksheet_path(original)
            private_values = [
                _read_text(original, original_sheet, cell)
                for cell in ("B12", "B14", "B15", "B16")
            ]

        with tempfile.TemporaryDirectory() as directory:
            sanitized_path = Path(directory) / "template.xlsx"
            create_sanitized_template(SOURCE_TEMPLATE, sanitized_path)
            for candidate in (sanitized_path, SANITIZED_TEMPLATE):
                with zipfile.ZipFile(candidate) as sanitized:
                    shared_strings = sanitized.read("xl/sharedStrings.xml").decode(
                        "utf-8"
                    )
                    sanitized_sheet = _worksheet_path(sanitized)
                    for cell in ("B12", "B13", "B14", "B15", "B16", "G2"):
                        self.assertEqual(
                            _read_text(sanitized, sanitized_sheet, cell),
                            "",
                        )
                    self.assertFalse(
                        any(
                            value and value in shared_strings
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
                    "client_phone": "6000-0000",
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

                self.assertEqual(template.namelist(), result.namelist())
                self.assertEqual(
                    [
                        item.attrib["ref"]
                        for item in template_merges.findall("m:mergeCell", NS)
                    ],
                    [
                        item.attrib["ref"]
                        for item in result_merges.findall("m:mergeCell", NS)
                    ],
                )
                for path in template.namelist():
                    if path != template_sheet_path:
                        self.assertEqual(template.read(path), result.read(path))

                for reference, expected in (
                    ("G2", "COT-2026-0001"),
                    ("B12", "Cliente de prueba"),
                    ("B14", "6000-0000"),
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
                self.assertTrue(
                    all(len(line) <= 55 for line in first_detail if line)
                )
                total_cell = result_sheet.find(".//m:c[@r='I43']", NS)
                total_value = total_cell.find("m:v", NS)
                self.assertAlmostEqual(float(total_value.text), quote["total"])
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
                        "client_phone": "6000-0000",
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
                self.assertTrue(all(len(line) <= 55 for line in details if line))
                self.assertNotIn("Sliding", quote["items"][0]["detail"])
                self.assertNotIn("Hinged", quote["items"][0]["detail"])


if __name__ == "__main__":
    unittest.main()
