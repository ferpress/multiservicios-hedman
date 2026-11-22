from __future__ import annotations

import io
import posixpath
import zipfile
from datetime import date
from pathlib import Path
from xml.etree import ElementTree as ET


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
DOC_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
XML_NS = "http://www.w3.org/XML/1998/namespace"
NS = {"m": MAIN_NS, "r": DOC_REL_NS, "p": PKG_REL_NS}
DISCLAIMER = (
    "Cotización estimada sujeta a rectificación técnica de medidas en sitio "
    "antes de fabricación."
)
ITEM_START_ROWS = (18, 21, 24, 27, 30, 33, 36, 39)
ITEM_DETAIL_LINE_LENGTH = 55


def _register_namespaces(xml_bytes: bytes) -> None:
    for _, (prefix, uri) in ET.iterparse(
        io.BytesIO(xml_bytes), events=("start-ns",)
    ):
        if not prefix.startswith("ns"):
            ET.register_namespace(prefix, uri)


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


def _excel_serial(value: date) -> int:
    return (value - date(1899, 12, 30)).days


def _get_or_create_cell(
    worksheet: ET.Element,
    cells: dict[str, ET.Element],
    reference: str,
) -> ET.Element:
    existing = cells.get(reference)
    if existing is not None:
        return existing
    row_number = "".join(character for character in reference if character.isdigit())
    row = worksheet.find(f".//m:sheetData/m:row[@r='{row_number}']", NS)
    if row is None:
        row = ET.Element(f"{{{MAIN_NS}}}row", {"r": row_number})
        worksheet.find("m:sheetData", NS).append(row)
    cell = ET.Element(f"{{{MAIN_NS}}}c", {"r": reference})
    row.append(cell)
    cells[reference] = cell
    return cell


def _clear_cell(cell: ET.Element) -> None:
    for child in list(cell):
        if child.tag in {
            f"{{{MAIN_NS}}}v",
            f"{{{MAIN_NS}}}f",
            f"{{{MAIN_NS}}}is",
        }:
            cell.remove(child)
    cell.attrib.pop("t", None)


def _set_text(
    worksheet: ET.Element,
    cells: dict[str, ET.Element],
    reference: str,
    value: str,
) -> None:
    cell = _get_or_create_cell(worksheet, cells, reference)
    _clear_cell(cell)
    cell.set("t", "inlineStr")
    inline = ET.SubElement(cell, f"{{{MAIN_NS}}}is")
    text = ET.SubElement(inline, f"{{{MAIN_NS}}}t")
    if value[:1].isspace() or value[-1:].isspace():
        text.set(f"{{{XML_NS}}}space", "preserve")
    text.text = value


def _set_number(
    worksheet: ET.Element,
    cells: dict[str, ET.Element],
    reference: str,
    value: float | int,
) -> None:
    cell = _get_or_create_cell(worksheet, cells, reference)
    _clear_cell(cell)
    cell.set("t", "n")
    number = ET.SubElement(cell, f"{{{MAIN_NS}}}v")
    number.text = format(value, ".2f") if isinstance(value, float) else str(value)


def _location_text(location: str, address: str) -> str:
    if address:
        return f"{location} · {address}"
    return location


def _wrap_item_detail(detail: str, max_lines: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in detail.split():
        candidate = f"{current} {word}".strip()
        if len(candidate) > ITEM_DETAIL_LINE_LENGTH and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    if len(lines) > max_lines:
        raise ValueError("El detalle del concepto excede el espacio de la plantilla.")
    return lines


def populate_quote_template(
    template_path: Path,
    output_path: Path,
    quote: dict,
) -> None:
    with zipfile.ZipFile(template_path, "r") as source:
        worksheet_path = _worksheet_path(source)
        worksheet_bytes = source.read(worksheet_path)
        _register_namespaces(worksheet_bytes)
        worksheet = ET.fromstring(worksheet_bytes)
        cells = {
            cell.attrib["r"]: cell
            for cell in worksheet.findall(".//m:sheetData/m:row/m:c", NS)
        }
        for reference in (
            "G2",
            "J3",
            "B12",
            "B13",
            "B14",
            "B15",
            "B16",
            "I41",
            "I42",
            "I43",
            "A52",
        ):
            _clear_cell(_get_or_create_cell(worksheet, cells, reference))
        for row_number in range(18, 41):
            for column in "ABCDEFGHIJKL":
                reference = f"{column}{row_number}"
                cell = cells.get(reference)
                if cell is not None:
                    _clear_cell(cell)

        _set_text(worksheet, cells, "G2", quote["reference"])
        _set_number(worksheet, cells, "J3", _excel_serial(quote["date"]))
        _set_text(worksheet, cells, "B12", quote["customer_name"])
        _set_text(worksheet, cells, "B13", "")
        _set_text(worksheet, cells, "B14", quote["client_phone"] or "No indicado")
        _set_text(
            worksheet,
            cells,
            "B15",
            _location_text(quote["location_label"], quote["address"]),
        )
        _set_text(worksheet, cells, "B16", "")

        for index, item in enumerate(quote["items"]):
            if index >= len(ITEM_START_ROWS):
                raise ValueError("La plantilla no tiene espacio para más conceptos.")
            title_row = ITEM_START_ROWS[index]
            amount_row = title_row + 1
            detail_rows_available = 1 if title_row + 2 == 41 else 2
            detail_lines = _wrap_item_detail(
                item["detail"],
                detail_rows_available,
            )
            _set_text(worksheet, cells, f"A{title_row}", item["title"])
            _set_text(worksheet, cells, f"A{amount_row}", detail_lines[0])
            if len(detail_lines) > 1:
                _set_text(
                    worksheet,
                    cells,
                    f"A{amount_row + 1}",
                    detail_lines[1],
                )
            _set_number(worksheet, cells, f"F{amount_row}", item["quantity"])
            _set_number(worksheet, cells, f"G{amount_row}", item["unit_price"])
            _set_number(worksheet, cells, f"I{amount_row}", item["total"])

        _set_number(worksheet, cells, "I41", quote["subtotal"])
        _set_number(worksheet, cells, "I42", quote["itbms"])
        _set_number(worksheet, cells, "I43", quote["total"])
        _set_text(
            worksheet,
            cells,
            "A52",
            f'Válida por 15 días, hasta el {quote["valid_until"]:%d/%m/%Y}. {DISCLAIMER}',
        )
        updated_worksheet = ET.tostring(
            worksheet,
            encoding="utf-8",
            xml_declaration=True,
        )

    with zipfile.ZipFile(template_path, "r") as source:
        with zipfile.ZipFile(output_path, "w") as destination:
            for entry in source.infolist():
                data = (
                    updated_worksheet
                    if entry.filename == worksheet_path
                    else source.read(entry.filename)
                )
                destination.writestr(entry, data)


def create_sanitized_template(source_path: Path, output_path: Path) -> None:
    """Copy the workbook while removing its previous quote's variable values."""
    with zipfile.ZipFile(source_path, "r") as source:
        worksheet_path = _worksheet_path(source)
        worksheet_bytes = source.read(worksheet_path)
        _register_namespaces(worksheet_bytes)
        worksheet = ET.fromstring(worksheet_bytes)
        cells = {
            cell.attrib["r"]: cell
            for cell in worksheet.findall(".//m:sheetData/m:row/m:c", NS)
        }
        for reference in (
            "G2",
            "J3",
            "B12",
            "B13",
            "B14",
            "B15",
            "B16",
            "I41",
            "I42",
            "I43",
            "A52",
        ):
            if reference in cells:
                _clear_cell(cells[reference])
        for row_number in range(18, 41):
            for column in "ABCDEFGHIJKL":
                cell = cells.get(f"{column}{row_number}")
                if cell is not None:
                    _clear_cell(cell)
        sanitized_worksheet = ET.tostring(
            worksheet,
            encoding="utf-8",
            xml_declaration=True,
        )
        shared_strings_path = "xl/sharedStrings.xml"
        sanitized_shared_strings = None
        if shared_strings_path in source.namelist():
            shared_bytes = source.read(shared_strings_path)
            _register_namespaces(shared_bytes)
            shared_strings = ET.fromstring(shared_bytes)
            referenced_indexes = {
                int(value.text)
                for cell in worksheet.findall(".//m:sheetData/m:row/m:c", NS)
                if cell.attrib.get("t") == "s"
                for value in [cell.find("m:v", NS)]
                if value is not None and value.text
            }
            for index, item in enumerate(shared_strings.findall("m:si", NS)):
                if index not in referenced_indexes:
                    item.clear()
                    ET.SubElement(item, f"{{{MAIN_NS}}}t").text = ""
            sanitized_shared_strings = ET.tostring(
                shared_strings,
                encoding="utf-8",
                xml_declaration=True,
            )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(source_path, "r") as source:
        with zipfile.ZipFile(output_path, "w") as destination:
            for entry in source.infolist():
                data = (
                    sanitized_worksheet
                    if entry.filename == worksheet_path
                    else sanitized_shared_strings
                    if entry.filename == shared_strings_path
                    and sanitized_shared_strings is not None
                    else source.read(entry.filename)
                )
                destination.writestr(entry, data)
