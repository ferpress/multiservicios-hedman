import test from "node:test";
import assert from "node:assert/strict";
import { calculateSalesTotals } from "../seller-local/sales-engine.js";

test("seller totals use editable unit price, fees, and tax rate", () => {
  assert.deepEqual(
    calculateSalesTotals({
      quantity: 2.5,
      unitPrice: 120,
      freight: 35,
      installation: 50,
      taxRate: 7,
    }),
    {
      product: 300,
      subtotal: 385,
      tax: 26.95,
      total: 411.95,
    },
  );
});
