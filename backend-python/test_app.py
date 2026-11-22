from __future__ import annotations

import os
import re
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import app as quote_app


TEMPLATE = Path(__file__).parent / "templates" / "cotizacion_plantilla.xlsx"


class QuoteApiTests(unittest.TestCase):
    def test_cors_allows_production_sites_and_local_development(self):
        self.assertIn(
            "https://multiservicioshedman.com",
            quote_app.ALLOWED_ORIGINS,
        )
        self.assertIn(
            "https://ferpress.github.io",
            quote_app.ALLOWED_ORIGINS,
        )
        self.assertRegex(
            "http://127.0.0.1:8765",
            re.compile(quote_app.LOCAL_ORIGIN_REGEX),
        )
        self.assertRegex(
            "http://localhost:8080",
            re.compile(quote_app.LOCAL_ORIGIN_REGEX),
        )
        self.assertNotRegex(
            "https://localhost.example.com",
            re.compile(quote_app.LOCAL_ORIGIN_REGEX),
        )

    def test_pdf_endpoint_returns_generated_pdf_with_official_reference(self):
        request = quote_app.QuoteRequest(
            name="Cliente de prueba",
            client_phone="6000-0000",
            address="Referencia de prueba",
            service="windows",
            location="center",
            width_m=1.5,
            height_m=1.2,
        )

        def fake_converter(workbook_path: Path, output_directory: Path) -> Path:
            pdf_path = output_directory / f"{workbook_path.stem}.pdf"
            pdf_path.write_bytes(b"%PDF-1.4\n%%EOF")
            return pdf_path

        with tempfile.TemporaryDirectory() as directory:
            database_path = Path(directory) / "quotes.sqlite3"
            with (
                patch.object(quote_app, "TEMPLATE_PATH", TEMPLATE),
                patch.object(
                    quote_app,
                    "_convert_to_pdf",
                    side_effect=fake_converter,
                ),
                patch.dict(os.environ, {"QUOTE_DB_PATH": str(database_path)}),
            ):
                response = quote_app.create_official_quote_pdf(request)

        self.assertEqual(response.media_type, "application/pdf")
        self.assertTrue(response.body.startswith(b"%PDF-"))
        self.assertRegex(
            response.headers["X-Quote-Reference"],
            r"^COT-\d{4}-0001$",
        )
        self.assertIn(
            response.headers["X-Quote-Reference"],
            response.headers["Content-Disposition"],
        )


if __name__ == "__main__":
    unittest.main()
