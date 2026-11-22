import unittest

from pricing_engine import calculate_quote


def project(**overrides):
    values = {
        "name": "Cliente de prueba",
        "client_phone": "",
        "address": "Prueba",
        "service": "windows",
        "location": "center",
        "width_m": 0.5,
        "height_m": 0.5,
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
    values.update(overrides)
    return values


class PricingEngineTests(unittest.TestCase):
    def test_windows_apply_minimum_area_and_itbms(self):
        quote = calculate_quote(project())

        self.assertEqual(quote["measure"], 1.0)
        self.assertEqual(quote["product_total"], 110.0)
        self.assertEqual(quote["transport"], 21.0)
        self.assertEqual(quote["installation"], 20.0)
        self.assertEqual(quote["itbms"], 10.57)
        self.assertEqual(quote["total"], 161.57)

    def test_black_window_finish_and_location_are_included(self):
        quote = calculate_quote(
            project(
                width_m=1.5,
                height_m=1.2,
                frame="black",
                glass="bronze",
                location="west",
                installation_included=False,
            )
        )

        self.assertEqual(quote["product_total"], 262.8)
        self.assertEqual(quote["transport"], 61.6)
        self.assertEqual(quote["installation"], 0.0)
        self.assertEqual(quote["items"][1]["detail"], "Panamá Oeste / Arraiján - Chorrera")

    def test_kitchen_includes_soft_close_rate(self):
        quote = calculate_quote(
            project(
                service="kitchen",
                height_m=None,
                width_m=2,
                cabinet_material="melamine",
            )
        )

        self.assertEqual(quote["product_total"], 510.0)
        self.assertIn("cierre lento", quote["description"])

    def test_oversized_projects_require_personalized_quote(self):
        with self.assertRaisesRegex(ValueError, "cotización personalizada"):
            calculate_quote(project(width_m=3.1))

    def test_bathroom_hardware_and_welding_finish_rates(self):
        bathroom = calculate_quote(
            project(
                service="bathroom",
                width_m=1,
                height_m=2,
                glass="tempered",
                glass_thickness_mm=10,
                hardware_finish="black",
            )
        )
        welding = calculate_quote(
            project(
                service="welding",
                width_m=1,
                height_m=1,
                welding_type="gate",
                welding_finish="enamel",
            )
        )

        self.assertGreater(bathroom["product_total"], 165.0)
        self.assertEqual(welding["product_total"], 148.0)


if __name__ == "__main__":
    unittest.main()
