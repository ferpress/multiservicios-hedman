import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWhatsAppUrl,
  getRequestedService,
  normalizePhone,
} from "../js/cotizador.js";

test("normalizePhone removes formatting and spaces", () => {
  assert.equal(normalizePhone("+507 6317-3442"), "50763173442");
});

test("buildWhatsAppUrl rejects phones without a valid country code", () => {
  assert.equal(
    buildWhatsAppUrl("6317-3442", "Ana", "Ventanas", "Medidas"),
    null,
  );
});

test("buildWhatsAppUrl creates an encoded WhatsApp message", () => {
  const url = buildWhatsAppUrl(
    "+507 6317-3442",
    "Ana",
    "Ventanas",
    "Medida 2 x 1",
  );
  assert.match(url, /^https:\/\/wa\.me\/50763173442\?text=/);
  assert.match(url, /Hola/);
  assert.match(url, /Ana/);
});

test("getRequestedService accepts only known services", () => {
  const services = [{ name: "Ventanas" }, { name: "Puertas" }];
  assert.equal(getRequestedService("?servicio=Ventanas", services), "Ventanas");
  assert.equal(getRequestedService("?servicio=Techos", services), "");
});
