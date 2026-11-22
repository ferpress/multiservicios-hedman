export function calculateSalesTotals({
  quantity,
  unitPrice,
  freight,
  installation,
  taxRate,
}) {
  const round = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;
  const product = round(quantity * unitPrice);
  const subtotal = round(product + freight + installation);
  const tax = round((subtotal * taxRate) / 100);
  return { product, subtotal, tax, total: round(subtotal + tax) };
}
