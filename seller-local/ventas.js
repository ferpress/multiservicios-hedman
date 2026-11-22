import { calculateSalesTotals } from "./sales-engine.js";

const form = document.querySelector("#seller-form");
const printContainer = document.querySelector("#seller-print");
const status = document.querySelector("#seller-status");

function readForm() {
  const data = new FormData(form);
  const number = (name) => Number(data.get(name));
  return {
    reference: String(data.get("reference") || "").trim() || "Por asignar",
    name: String(data.get("name") || "").trim(),
    ruc: String(data.get("ruc") || "").trim(),
    dv: String(data.get("dv") || "").trim(),
    phone: String(data.get("phone") || "").trim() || "No indicado",
    email: String(data.get("email") || "").trim() || "No indicado",
    address: String(data.get("address") || "").trim(),
    description: String(data.get("description") || "").trim(),
    quantity: number("quantity"),
    unit: String(data.get("unit")),
    unitPrice: number("unitPrice"),
    freight: number("freight"),
    installation: number("installation"),
    taxRate: number("taxRate"),
  };
}

function formatCurrency(amount) {
  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function updateTotals() {
  const values = readForm();
  const totals = calculateSalesTotals(values);
  document.querySelector("#product-total").textContent = formatCurrency(
    totals.product,
  );
  document.querySelector("#freight-total").textContent = formatCurrency(
    values.freight,
  );
  document.querySelector("#installation-total").textContent = formatCurrency(
    values.installation,
  );
  document.querySelector("#subtotal").textContent = formatCurrency(
    totals.subtotal,
  );
  document.querySelector("#tax-total").textContent = formatCurrency(
    totals.tax,
  );
  document.querySelector("#grand-total").textContent = formatCurrency(
    totals.total,
  );
  return { values, totals };
}

function appendLine(parent, label, value) {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value;
  row.append(term, description);
  parent.append(row);
}

function appendTableRow(body, cells) {
  const row = document.createElement("tr");
  for (const value of cells) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(cell);
  }
  body.append(row);
}

function buildPrintQuote(values, totals) {
  const article = document.createElement("article");
  const title = document.createElement("h1");
  title.textContent = `COTIZACIÓN ${values.reference}`;
  article.append(title);

  const clientHeading = document.createElement("h2");
  clientHeading.textContent = "Datos del cliente";
  article.append(clientHeading);

  const clientDetails = document.createElement("dl");
  appendLine(clientDetails, "Nombre", values.name);
  appendLine(clientDetails, "RUC / DV", `${values.ruc} / ${values.dv}`);
  appendLine(clientDetails, "WhatsApp", values.phone);
  appendLine(clientDetails, "Correo", values.email);
  appendLine(clientDetails, "Referencia", values.address);
  article.append(clientDetails);

  const projectHeading = document.createElement("h2");
  projectHeading.textContent = "Proyecto";
  article.append(projectHeading);

  const projectDetails = document.createElement("dl");
  appendLine(projectDetails, "Descripción", values.description);
  appendLine(
    projectDetails,
    "Cantidad",
    `${values.quantity} ${values.unit}`,
  );
  article.append(projectDetails);

  const priceHeading = document.createElement("h2");
  priceHeading.textContent = "Desglose";
  article.append(priceHeading);

  const table = document.createElement("table");
  const tableHead = document.createElement("thead");
  const headingRow = document.createElement("tr");
  for (const label of ["Concepto", "Cantidad", "Precio unitario", "Total"]) {
    const cell = document.createElement("th");
    cell.textContent = label;
    headingRow.append(cell);
  }
  tableHead.append(headingRow);
  const tableBody = document.createElement("tbody");
  appendTableRow(tableBody, [
    values.description,
    `${values.quantity} ${values.unit}`,
    formatCurrency(values.unitPrice),
    formatCurrency(totals.product),
  ]);
  appendTableRow(tableBody, [
    "Transporte / flete",
    "1 servicio",
    formatCurrency(values.freight),
    formatCurrency(values.freight),
  ]);
  appendTableRow(tableBody, [
    "Instalación",
    "1 servicio",
    formatCurrency(values.installation),
    formatCurrency(values.installation),
  ]);
  table.append(tableHead, tableBody);
  article.append(table);

  const totalsList = document.createElement("dl");
  totalsList.className = "seller-print-totals";
  appendLine(totalsList, "Subtotal", formatCurrency(totals.subtotal));
  appendLine(
    totalsList,
    `ITBMS (${values.taxRate} %)`,
    formatCurrency(totals.tax),
  );
  const totalLine = document.createElement("div");
  totalLine.className = "seller-print-total";
  const totalLabel = document.createElement("dt");
  const totalAmount = document.createElement("dd");
  totalLabel.textContent = "TOTAL";
  totalAmount.textContent = formatCurrency(totals.total);
  totalLine.append(totalLabel, totalAmount);
  totalsList.append(totalLine);
  article.append(totalsList);

  const thanks = document.createElement("p");
  thanks.textContent = "Multiservicios Hedman";
  article.append(thanks);
  printContainer.replaceChildren(article);
}

form.addEventListener("input", () => {
  status.textContent = "";
  updateTotals();
});
document.querySelector("#print-quote").addEventListener("click", () => {
  status.textContent = "";
  if (!form.reportValidity()) return;

  try {
    const { values, totals } = updateTotals();
    buildPrintQuote(values, totals);
    status.textContent =
      "Cotización preparada. En el diálogo de impresión, elige «Guardar como PDF».";
    window.print();
  } catch (error) {
    status.textContent =
      error instanceof Error
        ? `No se pudo preparar el PDF: ${error.message}`
        : "No se pudo preparar el PDF.";
  }
});

updateTotals();
