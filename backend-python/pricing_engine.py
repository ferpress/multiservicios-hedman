from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Mapping


CENT = Decimal("0.01")
DEMO_RATES = {
    "itbms_rate": Decimal("0.07"),
    "frames": {
        "natural": Decimal("1.00"),
        "white": Decimal("1.10"),
        "black": Decimal("1.20"),
        "bronze": Decimal("1.25"),
    },
    "windows": {
        "base_per_square_meter": Decimal("110.00"),
        "opening_multipliers": {
            "sliding": Decimal("1.00"),
            "hinged": Decimal("1.05"),
        },
        "glass_per_square_meter": {
            "clear": Decimal("0.00"),
            "bronze": Decimal("14.00"),
            "laminated": Decimal("35.00"),
            "tempered": Decimal("50.00"),
        },
    },
    "bathroom": {
        "base_per_square_meter": Decimal("165.00"),
        "thickness_multipliers": {
            8: Decimal("1.00"),
            10: Decimal("1.15"),
        },
        "door_multipliers": {
            "sliding": Decimal("1.15"),
            "hinged": Decimal("1.00"),
        },
        "hardware_per_unit": {
            "chrome": Decimal("40.00"),
            "black": Decimal("65.00"),
        },
        "glass_per_square_meter": {
            "clear": Decimal("0.00"),
            "bronze": Decimal("14.00"),
            "laminated": Decimal("35.00"),
            "tempered": Decimal("50.00"),
        },
    },
    "kitchen": {
        "base_per_linear_meter": Decimal("240.00"),
        "material_multipliers": {
            "melamine": Decimal("1.00"),
            "rh": Decimal("1.15"),
            "pvc": Decimal("1.30"),
        },
        "countertop_per_linear_meter": {
            "none": Decimal("0.00"),
            "laminate": Decimal("35.00"),
            "granite": Decimal("95.00"),
            "quartz": Decimal("145.00"),
        },
        "soft_close_per_linear_meter": Decimal("15.00"),
    },
    "welding": {
        "per_square_meter": {
            "securityBars": Decimal("95.00"),
            "gate": Decimal("130.00"),
            "roof": Decimal("110.00"),
            "custom": Decimal("125.00"),
        },
        "finish_per_square_meter": {
            "primer": Decimal("8.00"),
            "enamel": Decimal("18.00"),
        },
    },
    "logistics": {
        "center": {
            "transport_base": Decimal("15.00"),
            "transport_per_unit": Decimal("6.00"),
            "install_per_unit": Decimal("20.00"),
        },
        "sanMiguelito": {
            "transport_base": Decimal("22.00"),
            "transport_per_unit": Decimal("7.00"),
            "install_per_unit": Decimal("24.00"),
        },
        "east": {
            "transport_base": Decimal("30.00"),
            "transport_per_unit": Decimal("9.00"),
            "install_per_unit": Decimal("30.00"),
        },
        "west": {
            "transport_base": Decimal("40.00"),
            "transport_per_unit": Decimal("12.00"),
            "install_per_unit": Decimal("35.00"),
        },
        "interior": {
            "transport_base": Decimal("80.00"),
            "transport_per_unit": Decimal("15.00"),
            "install_per_unit": Decimal("50.00"),
        },
    },
}

SERVICE_LABELS = {
    "windows": "Ventanas a Medida",
    "bathroom": "Puerta de Baño Templada",
    "kitchen": "Muebles de Cocina",
    "welding": "Soldadura General",
}
LOCATION_LABELS = {
    "center": "Panamá Centro",
    "sanMiguelito": "San Miguelito / Brisas del Golf",
    "east": "Panamá Este / Tocumen",
    "west": "Panamá Oeste / Arraiján - Chorrera",
    "interior": "Interior / Otros",
}
FRAME_LABELS = {
    "natural": "Aluminio Natural",
    "white": "Blanco Arquitect.",
    "black": "Negro Mate",
    "bronze": "Bronce / Madera",
}
GLASS_LABELS = {
    "clear": 'Claro 1/4"',
    "bronze": 'Bronce 1/4"',
    "laminated": "Laminado",
    "tempered": "Templado",
}


def _decimal(value: Any) -> Decimal:
    try:
        result = Decimal(str(value))
    except (ArithmeticError, ValueError):
        raise ValueError("Las medidas del proyecto no son válidas.") from None
    if not result.is_finite():
        raise ValueError("Las medidas del proyecto no son válidas.")
    return result


def _money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def _format_measure(value: Decimal) -> str:
    return f"{value:.2f}"


def calculate_quote(project: Mapping[str, Any]) -> dict[str, Any]:
    """Calcula una cotización de demostración en el servidor."""
    service = project["service"]
    location = project["location"]
    width = _decimal(project["width_m"])
    height_value = project.get("height_m")
    height = _decimal(height_value) if height_value is not None else None
    quantity = int(project["quantity"])
    frame = project["frame"]

    if width <= 0 or quantity < 1:
        raise ValueError("Ingresa medidas y una cantidad válidas.")
    if width > Decimal("3.00") or (
        height is not None and height > Decimal("2.60")
    ):
        raise ValueError(
            "Este proyecto requiere una cotización personalizada. "
            "Nuestro equipo técnico se comunicará contigo para brindarte la mejor solución."
        )
    if service == "kitchen" and project.get("kitchen_l_shape"):
        raise ValueError(
            "Este proyecto requiere una cotización personalizada. "
            "Nuestro equipo técnico se comunicará contigo para brindarte la mejor solución."
        )
    if service != "kitchen" and (height is None or height <= 0):
        raise ValueError("Ingresa una altura válida para este servicio.")

    frame_multiplier = DEMO_RATES["frames"][frame]
    product_details = ""

    if service == "windows":
        assert height is not None
        opening_label = (
            "Batiente" if project["window_opening"] == "hinged" else "Corrediza"
        )
        area_per_unit = width * height
        measure = max(area_per_unit, Decimal("1.00")) * quantity
        rates = DEMO_RATES["windows"]
        base = measure * rates["base_per_square_meter"]
        finish = (
            base * (rates["opening_multipliers"][project["window_opening"]] - 1)
            + base * (frame_multiplier - 1)
            + measure * rates["glass_per_square_meter"][project["glass"]]
        )
        unit = "m²"
        product_details = (
            f"{opening_label}; {FRAME_LABELS[frame]}; "
            f'{GLASS_LABELS[project["glass"]]} {project["glass_thickness_mm"]} mm; '
            f'{_format_measure(width)} × {_format_measure(height)} m; '
            f"{_format_measure(measure)} m² facturables; {quantity} un."
        )
    elif service == "bathroom":
        assert height is not None
        door_label = "Batiente" if project["door_type"] == "hinged" else "Corrediza"
        area_per_unit = width * height
        measure = max(area_per_unit, Decimal("1.00")) * quantity
        rates = DEMO_RATES["bathroom"]
        base = measure * rates["base_per_square_meter"]
        finish = (
            base * (rates["thickness_multipliers"][project["glass_thickness_mm"]] - 1)
            + base * (rates["door_multipliers"][project["door_type"]] - 1)
            + base * (frame_multiplier - 1)
            + measure * rates["glass_per_square_meter"][project["glass"]]
            + quantity * rates["hardware_per_unit"][project["hardware_finish"]]
        )
        unit = "m²"
        hardware_label = (
            "inox. negro mate"
            if project["hardware_finish"] == "black"
            else "inox. cromado"
        )
        product_details = (
            f"{door_label}; "
            f'{GLASS_LABELS[project["glass"]]} {project["glass_thickness_mm"]} mm, '
            f"herrajes {hardware_label}; {FRAME_LABELS[frame]}; "
            f'{_format_measure(width)} × {_format_measure(height)} m; '
            f"{_format_measure(measure)} m²; {quantity} un."
        )
    elif service == "kitchen":
        measure = width * quantity
        rates = DEMO_RATES["kitchen"]
        material_multiplier = rates["material_multipliers"][
            project["cabinet_material"]
        ]
        countertop_rate = rates["countertop_per_linear_meter"][
            project["countertop"]
        ]
        base = measure * rates["base_per_linear_meter"]
        finish = (
            base * (material_multiplier - 1)
            + base * (frame_multiplier - 1)
            + measure * countertop_rate
            + (
                measure * rates["soft_close_per_linear_meter"]
                if project["soft_close"]
                else Decimal("0.00")
            )
        )
        unit = "ml"
        material_label = {
            "melamine": "melamina estándar",
            "rh": "MDF hidrófugo / RH",
            "pvc": "PVC",
        }[project["cabinet_material"]]
        countertop_label = {
            "none": "sin sobrecubierta",
            "laminate": "sobrecubierta laminada",
            "granite": "sobrecubierta de granito",
            "quartz": "sobrecubierta de cuarzo",
        }[project["countertop"]]
        product_details = (
            f"{material_label}, {countertop_label}, "
            f'{"con" if project["soft_close"] else "sin"} cierre lento, '
            f"{FRAME_LABELS[frame]}; {_format_measure(measure)} m lineales"
        )
    elif service == "welding":
        assert height is not None
        measure = width * height * quantity
        rates = DEMO_RATES["welding"]
        base_rate = rates["per_square_meter"][project["welding_type"]]
        finish_rate = rates["finish_per_square_meter"][project["welding_finish"]]
        base = measure * base_rate
        finish = measure * (
            finish_rate + base_rate * (frame_multiplier - 1)
        )
        unit = "m²"
        welding_label = {
            "securityBars": "verjas de seguridad",
            "gate": "portones",
            "roof": "techos",
            "custom": "estructura personalizada",
        }[project["welding_type"]]
        paint_label = (
            "esmalte / acabado electrostático"
            if project["welding_finish"] == "enamel"
            else "imprimación anticorrosiva"
        )
        product_details = (
            f"{welding_label}, {paint_label}, {FRAME_LABELS[frame]}; "
            f'{_format_measure(width)} × {_format_measure(height)} m; '
            f"{_format_measure(measure)} m²; {quantity} un."
        )
    else:
        raise ValueError("El servicio seleccionado no es válido.")

    product_total = _money(base + finish)
    unit_price = _money(product_total / measure)
    logistics = DEMO_RATES["logistics"][location]
    transport = _money(
        logistics["transport_base"] + logistics["transport_per_unit"] * measure
    )
    installation = (
        _money(logistics["install_per_unit"] * measure)
        if project["installation_included"]
        else Decimal("0.00")
    )
    subtotal = _money(product_total + transport + installation)
    itbms = _money(subtotal * DEMO_RATES["itbms_rate"])
    total = _money(subtotal + itbms)

    items = [
        {
            "title": SERVICE_LABELS[service],
            "detail": product_details,
            "quantity": float(measure),
            "unit": unit,
            "unit_price": float(unit_price),
            "total": float(product_total),
        },
        {
            "title": "Transporte y flete",
            "detail": LOCATION_LABELS[location],
            "quantity": 1.0,
            "unit": "servicio",
            "unit_price": float(transport),
            "total": float(transport),
        },
    ]
    if project["installation_included"]:
        items.append(
            {
                "title": "Instalación en sitio",
                "detail": LOCATION_LABELS[location],
                "quantity": 1.0,
                "unit": "servicio",
                "unit_price": float(installation),
                "total": float(installation),
            }
        )

    return {
        "service": service,
        "location": location,
        "location_label": LOCATION_LABELS[location],
        "measure": float(measure),
        "unit": unit,
        "description": product_details,
        "items": items,
        "base": float(_money(base)),
        "finish": float(_money(finish)),
        "product_total": float(product_total),
        "transport": float(transport),
        "installation": float(installation),
        "subtotal": float(subtotal),
        "itbms": float(itbms),
        "total": float(total),
    }
