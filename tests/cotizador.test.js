import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWhatsAppUrl,
  calculateAreaSquareMeters,
  calculateEstimate,
  calculateKitchenLinearMeters,
  calculateWeldingArea,
  calculateWindowArea,
  createQuoteReference,
  createQuoteWhatsAppMessage,
  getPendingEstimateBreakdown,
  getRequestedService,
  normalizePhone,
} from "../js/quote-engine.js";
import { quotePricing } from "../js/pricing-config.js";

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

test("WhatsApp quote message includes customer details and estimate breakdown", () => {
  const message = createQuoteWhatsAppMessage(
    {
      ruc: "8-123-456",
      rucDv: "12",
      clientPhone: "+507 6000-0000",
      email: "ana@example.com",
      address: "San Miguelito",
      description: "Ventana corrediza 1.50 × 1.20 m",
      measurementText: "Área neta: 1.80 m²",
      locationLabel: "San Miguelito",
      installationIncluded: true,
      estimate: {
        base: 165,
        finish: 20,
        transport: 30,
        installation: 40,
        subtotal: 255,
        itbms: 17.85,
        total: 272.85,
      },
    },
    "COT-2026-0001",
  );

  assert.match(message, /RUC\/DV: 8-123-456-12/);
  assert.match(message, /Área neta: 1\.80 m²/);
  assert.match(message, /ITBMS \(7 %\): \$17\.85/);
  assert.match(message, /Total estimado: \$272\.85/);
  assert.match(message, /adjúntalo a este chat/);
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
    getRequestedService("?servicio=Muebles%20de%20cocina"),
    "kitchen",
  );
  assert.equal(getRequestedService("?servicio=No%20existe"), "");
});

test("windows apply a one square meter minimum to each unit", () => {
  const area = calculateWindowArea(0.6, 0.6, 2);
  assert.deepEqual(area, {
    netAreaPerWindow: 0.36,
    billableAreaPerWindow: 1,
    quantity: 2,
    netArea: 0.72,
    billableArea: 2,
  });
  assert.equal(calculateAreaSquareMeters(1.2, 1.9), 2.28);
  assert.equal(calculateAreaSquareMeters(0, 1.9), null);
});

test("bathroom glass applies the minimum billable area and hardware costs", () => {
  const project = {
    service: "bathroom",
    location: "center",
    installationIncluded: true,
    rateInputs: {
      area: Math.max(calculateAreaSquareMeters(0.6, 0.6), 1) * 2,
      unitCount: 2,
      quantity: 2,
      thickness: "10",
      door: "hinged",
      hardware: "black",
      glass: "tempered",
      frame: "black",
    },
  };
  const estimate = calculateEstimate(project, quotePricing);
  assert.equal(estimate.ready, true);
  assert.equal(estimate.base, 330);
  assert.equal(estimate.finish, 345.5);
  assert.equal(estimate.transport, 27);
  assert.equal(estimate.installation, 40);
  assert.equal(estimate.total, 794.48);
});

test("kitchen linear prices include material, finish, and countertop upgrades", () => {
  assert.deepEqual(calculateKitchenLinearMeters(2.5, 3), {
    base: 2.5,
    upper: 3,
    total: 5.5,
  });
  assert.equal(calculateKitchenLinearMeters(0, 0), null);
  const estimate = calculateEstimate(
    {
      service: "kitchen",
      location: "center",
      installationIncluded: true,
      rateInputs: {
        baseMeters: 1.5,
        upperMeters: 0,
        unitCount: 1.5,
        material: "rh",
        countertop: "laminate",
        softClose: true,
        frame: "white",
      },
    },
    quotePricing,
  );
  assert.equal(estimate.ready, true);
  assert.equal(estimate.productTotal, 525);
  assert.equal(estimate.installation, 30);
});

test("welding estimates vary by project, paint, color, and location", () => {
  assert.equal(calculateWeldingArea(2, 1.5, 3), 9);
  assert.equal(calculateWeldingArea(0, 1.5, 3), null);
  const estimate = calculateEstimate(
    {
      service: "welding",
      location: "center",
      installationIncluded: false,
      rateInputs: {
        measure: 1.44,
        unitCount: 1.44,
        projectType: "securityBars",
        finish: "primer",
        frame: "black",
      },
    },
    quotePricing,
  );
  assert.equal(estimate.ready, true);
  assert.equal(estimate.productTotal, 175.68);
  assert.equal(estimate.installation, 0);
  assert.equal(estimate.total, 213.27);
});

test("an incomplete location never produces a zero-looking estimate", () => {
  const pending = getPendingEstimateBreakdown();
  assert.equal(pending.ready, false);
  assert.equal(pending.subtotal, null);
  assert.equal(
    calculateEstimate(
      {
        service: "windows",
        location: "",
        rateInputs: {
          area: 2,
          unitCount: 2,
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

test("quote references increment per year in local storage", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const date = new Date("2026-11-21T12:00:00");
  assert.deepEqual(createQuoteReference(storage, date), {
    reference: "COT-2026-0001",
    persistent: true,
  });
  assert.deepEqual(createQuoteReference(storage, date), {
    reference: "COT-2026-0002",
    persistent: true,
  });
});

test("quote references fall back to a timestamp when storage is unavailable", () => {
  const blockedStorage = {
    getItem() {
      throw new Error("storage blocked");
    },
    setItem() {},
  };
  const date = new Date("2026-11-21T12:00:00");
  assert.deepEqual(createQuoteReference(blockedStorage, date), {
    reference: `COT-2026-${date.getTime()}`,
    persistent: false,
  });
});
