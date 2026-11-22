import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWhatsAppUrl,
  calculateAreaSquareMeters,
  calculateKitchenLinearMeters,
  calculateWeldingArea,
  calculateWindowArea,
  createQuoteWhatsAppMessage,
  getRequestedService,
  normalizePhone,
} from "../js/quote-engine.js";
import {
  createAppsScriptPayload,
  requestQuoteDocument,
} from "../js/apps-script-client.js";

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

test("WhatsApp request includes technical and contact details but no prices", () => {
  const message = createQuoteWhatsAppMessage(
    {
      service: "windows",
      serviceLabel: "Ventanas a Medida",
      ruc: "8-123-456",
      rucDv: "12",
      clientPhone: "+507 6000-0000",
      email: "ana@example.com",
      address: "San Miguelito",
      description: "Ventana corrediza, vidrio templado",
      width: 1.5,
      height: 1.2,
      quantity: 2,
      measurementText: "Área neta: 1.80 m²",
      locationLabel: "San Miguelito",
      installationIncluded: true,
    },
  );

  assert.match(message, /RUC: 8-123-456/);
  assert.match(message, /DV: 12/);
  assert.match(message, /Área neta: 1\.80 m²/);
  assert.match(message, /Cantidad: 2/);
  assert.match(message, /Zona del proyecto: San Miguelito/);
  assert.doesNotMatch(message, /\$|ITBMS|Subtotal|Total estimado|precio/i);
});

test("Apps Script payload contains customer and technical data, but no prices", () => {
  const payload = createAppsScriptPayload(
    {
      serviceLabel: "Ventanas a Medida",
      width: 1.5,
      height: 1.2,
      quantity: 2,
      colorLabel: "Negro Mate",
      description: "Ventana corrediza, vidrio templado",
      measurementText: "Área neta: 1.80 m²",
      name: "Ana",
      ruc: "8-123-456",
      rucDv: "12",
      clientPhone: "+507 6000-0000",
      email: "ana@example.com",
      address: "San Miguelito",
      locationLabel: "San Miguelito",
      installationIncluded: true,
    },
    "whatsapp",
  );

  assert.equal(payload.cliente, "Ana");
  assert.equal(payload.ruc, "8-123-456");
  assert.equal(payload.dv, "12");
  assert.equal(payload.enviarCorreo, true);
  assert.equal(payload.modo, "whatsapp");
  assert.equal("precio" in payload, false);
  assert.equal("total" in payload, false);
});

test("Apps Script request sends JSON as a simple POST and checks the response", async () => {
  let request;
  const result = await requestQuoteDocument(
    { cliente: "Ana" },
    async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, consecutivo: "COT-2026-0001" }),
      };
    },
  );

  assert.match(request.url, /^https:\/\/script\.google\.com\/macros\/s\//);
  assert.equal(request.options.method, "POST");
  assert.match(request.options.headers["Content-Type"], /^text\/plain/);
  assert.deepEqual(JSON.parse(request.options.body), { cliente: "Ana" });
  assert.equal(result.consecutivo, "COT-2026-0001");
});

test("Apps Script errors are surfaced to the customer flow", async () => {
  await assert.rejects(
    requestQuoteDocument({}, async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: false, error: "Solicitud inválida" }),
    })),
    /Solicitud inválida/,
  );
});

test("Apps Script HTTP errors include the service response", async () => {
  await assert.rejects(
    requestQuoteDocument({}, async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: "Servicio no disponible" }),
    })),
    /Servicio no disponible/,
  );
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

test("kitchen linear measurements include base and upper cabinets", () => {
  assert.deepEqual(calculateKitchenLinearMeters(2.5, 3), {
    base: 2.5,
    upper: 3,
    total: 5.5,
  });
  assert.equal(calculateKitchenLinearMeters(0, 0), null);
});

test("welding area accounts for dimensions and quantity", () => {
  assert.equal(calculateWeldingArea(2, 1.5, 3), 9);
  assert.equal(calculateWeldingArea(0, 1.5, 3), null);
});
