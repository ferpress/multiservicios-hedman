import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWhatsAppUrl,
  calculateAreaSquareMeters,
  calculateEstimate,
  calculateKitchenLinearMeters,
  calculateWeldingArea,
  calculateWindowArea,
  getPendingEstimateBreakdown,
  getRequestedService,
  normalizePhone,
} from "../js/quote-engine.js";
import { quotePricing } from "../js/tarifas.js";

test("normalizePhone removes formatting and spaces", () => {
  assert.equal(normalizePhone("+507 6317-3442"), "50763173442");
});

test("buildWhatsAppUrl rejects phone numbers without Panama country code", () => {
  assert.equal(
    buildWhatsAppUrl("6317-3442", "Ana", "Ventanas", "Medidas"),
    null,
  );
});

test("buildWhatsAppUrl creates an encoded quotation request", () => {
  const url = buildWhatsAppUrl(
    "+507 6317-3442",
    "Ana",
    "Ventanas",
    "Medida 2 x 1",
  );
  assert.match(url, /^https:\/\/wa\.me\/50763173442\?text=/);
  assert.match(decodeURIComponent(url), /Ana/);
  assert.match(decodeURIComponent(url), /Medida 2 x 1/);
});

test("legacy service links resolve to the matching quote service", () => {
  assert.equal(
    getRequestedService("?servicio=Ventanas%20de%20aluminio%20y%20vidrio"),
    "windows",
  );
  assert.equal(
    getRequestedService("?servicio=Puertas%20y%20divisiones%20de%20ba%C3%B1o"),
    "bathroom",
  );
  assert.equal(
    getRequestedService("?servicio=Ventanas", [{ name: "Ventanas" }]),
    "Ventanas",
  );
  assert.equal(getRequestedService("?servicio=No%20existe"), "");
});

test("window area has a one square meter billing minimum per unit", () => {
  const area = calculateWindowArea(60, 60, 2);
  assert.deepEqual(area, {
    netAreaPerWindow: 0.36,
    billableAreaPerWindow: 1,
    quantity: 2,
    netArea: 0.72,
    billableArea: 2,
  });
});

test("bathroom glass dimensions convert centimeters to square meters", () => {
  assert.equal(calculateAreaSquareMeters(120, 190), 2.28);
  assert.equal(calculateAreaSquareMeters(0, 190), null);
});

test("kitchen measurement sums upper and base linear meters", () => {
  assert.deepEqual(calculateKitchenLinearMeters(2.5, 3), {
    base: 2.5,
    upper: 3,
    total: 5.5,
  });
  assert.equal(calculateKitchenLinearMeters(0, 0), null);
});

test("welding area accounts for quantity", () => {
  assert.equal(calculateWeldingArea(2, 1.5, 3), 9);
  assert.equal(calculateWeldingArea(0, 1.5, 3), null);
});

test("missing commercial tariffs never become a misleading zero estimate", () => {
  const pending = getPendingEstimateBreakdown();
  assert.equal(quotePricing.rangeVariance, null);
  assert.equal(quotePricing.itbmsRate, 0.07);
  assert.equal(pending.ready, false);
  assert.equal(pending.subtotal, null);
  assert.equal(pending.total, null);
  assert.equal(
    calculateEstimate(
      {
        service: "windows",
        location: "center",
        rateInputs: {
          area: 2,
          opening: "sliding",
          frame: "natural",
          glass: "clear",
        },
      },
      quotePricing,
    ).ready,
    false,
  );
});

test("configured rates calculate base, logistics, ITBMS, and an estimate range", () => {
  const config = JSON.parse(JSON.stringify(quotePricing));
  config.rangeVariance = 0.1;
  config.windows.basePerSquareMeter = 100;
  config.windows.glassPerSquareMeter.clear = 10;
  config.logistics.center = {
    transportBase: 20,
    transportPerUnit: 5,
    installPerUnit: 10,
  };
  const estimate = calculateEstimate(
    {
      service: "windows",
      location: "center",
      rateInputs: {
        area: 2,
        opening: "sliding",
        frame: "white",
        glass: "clear",
      },
    },
    config,
  );

  assert.deepEqual(estimate, {
    ready: true,
    base: 200,
    finish: 40,
    transport: 30,
    installation: 20,
    subtotal: 290,
    itbms: 20.3,
    total: 310.3,
    minimum: 279.27,
    maximum: 341.33,
  });
});
