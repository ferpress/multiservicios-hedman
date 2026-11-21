import { business } from "./data.js";
import {
  calculateAreaSquareMeters,
  calculateEstimate,
  calculateKitchenLinearMeters,
  calculateWeldingArea,
  calculateWindowArea,
  frameColors,
  glassColors,
  getRequestedService,
  locationLabels,
  serviceLabels,
  buildWhatsAppUrl,
} from "./quote-engine.js";
import { quotePricing } from "./tarifas.js";

const form =
  typeof document === "undefined"
    ? null
    : document.querySelector("#quote-form");
const quoteService = form?.querySelector("#quote-service");
const quoteError = form?.querySelector("#quote-error");
const printSection =
  typeof document === "undefined"
    ? null
    : document.querySelector("#quote-print");

function getFormData() {
  return new FormData(form);
}

function formValue(formData, name) {
  return String(formData.get(name) ?? "").trim();
}

function setVisibleServiceFields() {
  const service = quoteService.value;
  for (const fieldset of form.querySelectorAll("[data-service-fields]")) {
    const active = fieldset.dataset.serviceFields === service;
    fieldset.hidden = !active;
    fieldset.disabled = !active;
  }

  const isArea = form.querySelector("#weld-measure-unit").value === "area";
  const areaFields = [
    form.querySelector("#weld-area-dimensions"),
    form.querySelector("#weld-area-height"),
  ];
  const linearField = form.querySelector("#weld-linear-dimension");
  for (const field of areaFields) {
    field.hidden = !isArea;
    field.querySelector("input").disabled = !isArea;
  }
  linearField.hidden = isArea;
  const linearInput = linearField.querySelector("input");
  linearInput.disabled = isArea;
  linearInput.required = !isArea;
}

function readProject(formData) {
  const service = formValue(formData, "service");
  const quantity = Number(formData.get("quantity") || 1);
  let quantityLabel = `${quantity} unidad${quantity === 1 ? "" : "es"}`;
  let description = serviceLabels[service] ?? "Proyecto a medida";
  let measurement = "";
  let widthCm = null;
  let heightCm = null;
  let frameColor = "natural";
  let glass = "clear";
  let rateInputs = null;
  let pricingQuantity = null;

  if (service === "windows") {
    widthCm = Number(formData.get("width"));
    heightCm = Number(formData.get("height"));
    const opening = formValue(formData, "windowType");
    const openingLabel = opening === "projecting" ? "proyectable" : "corrediza";
    const color = frameColors[formValue(formData, "frameColor")];
    const glassOption = formValue(formData, "glass");
    const glassOptionLabel = glassColors[glassOption]?.label ?? "Claro";
    const thickness = formValue(formData, "glassThickness");
    const area = calculateWindowArea(widthCm, heightCm, quantity);
    frameColor = formValue(formData, "frameColor") || "natural";
    glass = glassOption;
    rateInputs = {
      area: area?.billableArea,
      opening,
      frame: frameColor,
      glass: glassOption,
    };
    pricingQuantity = quantity;
    description = `Ventana ${openingLabel} de aluminio ${color?.label ?? "natural"}, vidrio ${glassOptionLabel} ${thickness} mm, ${widthCm} × ${heightCm} cm`;
    measurement = area
      ? `Área neta: ${area.netArea.toFixed(2)} m² · área facturable mínima: ${area.billableArea.toFixed(2)} m²`
      : "Ingresa ancho y alto válidos para mostrar el área.";
    quantityLabel = `${quantity} ventana${quantity === 1 ? "" : "s"}`;
  } else if (service === "bathroom") {
    widthCm = Number(formData.get("width"));
    heightCm = Number(formData.get("height"));
    const thickness = formValue(formData, "glassThickness");
    const doorType = formValue(formData, "doorType");
    const doorTypeLabel = doorType === "hinged" ? "batiente" : "corrediza";
    const hardware =
      formValue(formData, "hardware") === "black"
        ? "herrajes negros mate"
        : "herrajes cromados";
    const glassOption = formValue(formData, "glass");
    const glassOptionLabel = glassColors[glassOption]?.label ?? "Claro";
    const area = calculateAreaSquareMeters(widthCm, heightCm);
    rateInputs = {
      area: area ? area * quantity : null,
      quantity,
      thickness,
      door: doorType,
      hardware: formValue(formData, "hardware"),
      glass: glassOption,
    };
    pricingQuantity = quantity;
    glass = glassOption;
    frameColor =
      formValue(formData, "hardware") === "black" ? "black" : "natural";
    description = `Puerta de baño ${doorTypeLabel}, vidrio templado ${thickness} mm ${glassOptionLabel}, ${widthCm} × ${heightCm} cm, ${hardware}`;
    measurement = area
      ? `Área aproximada: ${(area * quantity).toFixed(2)} m² (${quantity} unidad${quantity === 1 ? "" : "es"})`
      : "Ingresa ancho y alto válidos para mostrar el área.";
    quantityLabel = `${quantity} puerta${quantity === 1 ? "" : "s"}`;
  } else if (service === "kitchen") {
    const lengths = calculateKitchenLinearMeters(
      formData.get("baseLinearMeters"),
      formData.get("upperLinearMeters"),
    );
    const materialLabels = {
      melamine: "melamina estándar",
      rh: "MDF hidrófugo / RH",
      pvc: "PVC",
    };
    const countertopLabels = {
      none: "sin sobrecubierta",
      laminate: "sobrecubierta laminada",
      granite: "sobrecubierta de granito",
      quartz: "sobrecubierta de cuarzo",
    };
    const color = frameColors[formValue(formData, "materialColor")];
    const material = materialLabels[formValue(formData, "cabinetMaterial")];
    const countertop = countertopLabels[formValue(formData, "countertop")];
    rateInputs = {
      baseMeters: lengths?.base,
      upperMeters: lengths?.upper,
      material: formValue(formData, "cabinetMaterial"),
      countertop: formValue(formData, "countertop"),
    };
    pricingQuantity = lengths?.total ?? null;
    description = `Muebles de cocina ${material}, acabado ${color?.label ?? "blanco"}, ${countertop}`;
    measurement = lengths
      ? `Inferiores: ${lengths.base.toFixed(2)} ml · superiores: ${lengths.upper.toFixed(2)} ml · total: ${lengths.total.toFixed(2)} ml`
      : "Indica al menos una longitud mayor que cero.";
    quantityLabel = lengths ? `${lengths.total.toFixed(2)} ml` : "Por definir";
    frameColor = formValue(formData, "materialColor") || "white";
  } else if (service === "welding") {
    const weldLabels = {
      securityBars: "verjas de seguridad",
      gate: "portón",
      roof: "techo / estructura de techo",
      custom: "estructura personalizada",
    };
    const finishLabels = {
      primer: "imprimación anticorrosiva",
      enamel: "esmalte / acabado electrostático",
    };
    const measureUnit = formValue(formData, "weldMeasureUnit");
    const width =
      measureUnit === "linear"
        ? Number(formData.get("weldLinearLength"))
        : Number(formData.get("weldWidth"));
    const height =
      measureUnit === "linear" ? 1 : Number(formData.get("weldHeight"));
    const measuredArea =
      measureUnit === "area"
        ? calculateWeldingArea(width, height, quantity)
        : null;
    const measuredLength =
      measureUnit === "linear" && width > 0 ? width * quantity : null;
    const weldType = formValue(formData, "weldProject");
    const finish = formValue(formData, "weldFinish");
    rateInputs = {
      measure: measuredArea ?? measuredLength,
      unit: measureUnit,
      projectType: weldType,
      finish,
    };
    pricingQuantity = measuredArea ?? measuredLength;
    const dimensions =
      measureUnit === "linear" ? `${width} ml` : `${width} × ${height} m`;
    description = `Soldadura: ${weldLabels[weldType] ?? "estructura"}, ${dimensions}, ${finishLabels[finish] ?? ""}`;
    measurement =
      measuredArea !== null
        ? `Área aproximada: ${measuredArea.toFixed(2)} m²`
        : measuredLength !== null
          ? `Longitud aproximada: ${measuredLength.toFixed(2)} ml`
          : "Ingresa medidas válidas para mostrar la cantidad.";
    quantityLabel =
      measuredArea !== null
        ? `${measuredArea.toFixed(2)} m²`
        : measuredLength !== null
          ? `${measuredLength.toFixed(2)} ml`
          : `${quantity} estructura${quantity === 1 ? "" : "s"}`;
    frameColor = finish === "enamel" ? "black" : "natural";
  } else if (service === "other") {
    description =
      formValue(formData, "otherDescription") || "Otro trabajo a medida";
    measurement = "Medidas y materiales por confirmar.";
    quantityLabel = "Por definir";
  }

  return {
    service,
    serviceLabel: serviceLabels[service] ?? "Proyecto a medida",
    description,
    measurement,
    quantityLabel,
    widthCm,
    heightCm,
    frameColor,
    glass,
    location: formValue(formData, "location"),
    address: formValue(formData, "address"),
    name: formValue(formData, "name"),
    clientPhone: formValue(formData, "clientPhone"),
    details: formValue(formData, "details"),
    rateInputs,
    pricingQuantity,
  };
}

function setSvgRect(element, x, y, width, height) {
  element.setAttribute("x", String(x));
  element.setAttribute("y", String(y));
  element.setAttribute("width", String(width));
  element.setAttribute("height", String(height));
}

function updateWindowDrawing(project) {
  const width = project.widthCm || 120;
  const height = project.heightCm || 120;
  const ratio = Math.min(Math.max(width / height, 0.35), 2.4);
  const drawWidth = Math.min(250, 166 * ratio);
  const drawHeight = drawWidth / ratio;
  const x = (360 - drawWidth) / 2;
  const y = (230 - drawHeight) / 2;
  const inset = Math.min(9, drawWidth / 10, drawHeight / 10);
  const innerX = x + inset;
  const innerY = y + inset;
  const innerWidth = drawWidth - inset * 2;
  const innerHeight = drawHeight - inset * 2;
  const frameColor = frameColors[project.frameColor]?.color ?? "#737d8b";
  const glassColor = glassColors[project.glass]?.color ?? "#dcebf0";
  const frame = document.querySelector("#preview-frame");
  const pane = document.querySelector("#preview-glass");
  const mullion = document.querySelector("#preview-mullion");
  const rail = document.querySelector("#preview-rail");
  const shadow = document.querySelector("#preview-shadow");

  setSvgRect(frame, x, y, drawWidth, drawHeight);
  setSvgRect(pane, innerX, innerY, innerWidth, innerHeight);
  frame.setAttribute("fill", frameColor);
  pane.setAttribute("fill", glassColor);
  pane.setAttribute("fill-opacity", "0.78");
  mullion.setAttribute("stroke", frameColor);
  mullion.setAttribute("x1", String(x + drawWidth / 2));
  mullion.setAttribute("x2", String(x + drawWidth / 2));
  mullion.setAttribute("y1", String(innerY));
  mullion.setAttribute("y2", String(innerY + innerHeight));
  rail.setAttribute("stroke", frameColor);
  rail.setAttribute("x1", String(innerX));
  rail.setAttribute("x2", String(innerX + innerWidth));
  rail.setAttribute("y1", String(y + drawHeight / 2));
  rail.setAttribute("y2", String(y + drawHeight / 2));
  shadow.setAttribute("x1", String(Math.max(28, x - 12)));
  shadow.setAttribute("x2", String(Math.min(332, x + drawWidth + 12)));
  shadow.setAttribute("y1", String(Math.min(210, y + drawHeight + 8)));
  shadow.setAttribute("y2", String(Math.min(210, y + drawHeight + 8)));
}

function updateSpecialDrawing(project, formData) {
  const kitchen = document.querySelector("#preview-kitchen");
  const welding = document.querySelector("#preview-welding");
  const window = document.querySelector("#preview-window");
  const isKitchen = project.service === "kitchen";
  const isWelding = project.service === "welding";
  kitchen.hidden = !isKitchen;
  welding.hidden = !isWelding;
  window.hidden = isKitchen || isWelding;

  if (isKitchen) {
    const color = frameColors[project.frameColor]?.color ?? "#f8fafc";
    const lengths = calculateKitchenLinearMeters(
      formData.get("baseLinearMeters"),
      formData.get("upperLinearMeters"),
    );
    const total = lengths?.total ?? 3;
    const drawWidth = Math.min(272, Math.max(100, total * 45));
    const x = (360 - drawWidth) / 2;
    const upperWidth = Math.max(60, drawWidth * 0.72);
    const upperX = (360 - upperWidth) / 2;
    setSvgRect(
      document.querySelector("#preview-counter"),
      x,
      85,
      drawWidth,
      14,
    );
    setSvgRect(
      document.querySelector("#preview-cabinet-base"),
      x,
      104,
      drawWidth,
      86,
    );
    setSvgRect(
      document.querySelector("#preview-cabinet-upper"),
      upperX,
      36,
      upperWidth,
      45,
    );
    document.querySelector("#preview-counter").setAttribute("fill", "#737d8b");
    document.querySelector("#preview-cabinet-base").setAttribute("fill", color);
    document
      .querySelector("#preview-cabinet-upper")
      .setAttribute("fill", color);
    for (const line of kitchen.querySelectorAll("line")) {
      line.setAttribute("stroke", "#647184");
    }
  } else if (isWelding) {
    const color = project.frameColor === "black" ? "#27313f" : "#737d8b";
    const isLinear = formValue(formData, "weldMeasureUnit") === "linear";
    const width =
      Number(formData.get(isLinear ? "weldLinearLength" : "weldWidth")) || 2;
    const height = isLinear ? 1 : Number(formData.get("weldHeight")) || 1;
    const ratio = Math.min(Math.max(width / height, 0.4), 2.2);
    const drawWidth = Math.min(238, 154 * ratio);
    const drawHeight = drawWidth / ratio;
    const x = (360 - drawWidth) / 2;
    const y = (230 - drawHeight) / 2;
    setSvgRect(
      document.querySelector("#preview-weld-frame"),
      x,
      y,
      drawWidth,
      drawHeight,
    );
    for (const line of welding.querySelectorAll("line, rect")) {
      line.setAttribute("stroke", color);
    }
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: quotePricing.currency,
  }).format(value);
}

function updatePriceStatus(estimate) {
  const status = estimate.ready
    ? "Rango estimado con tarifas configuradas"
    : "Tarifas comerciales pendientes";
  document.querySelector(".quote-price-status strong").textContent = status;
  document.querySelector(".quote-price-status span").textContent =
    estimate.ready
      ? "Importes de referencia, sujetos a validación de medidas y costos en sitio."
      : "No se mostrarán montos hasta configurar precios aprobados.";
  const breakdown = {
    base: estimate.base,
    finish: estimate.finish,
    transport: estimate.transport,
    install: estimate.installation,
    subtotal: estimate.subtotal,
    tax: estimate.itbms,
  };
  for (const [key, value] of Object.entries(breakdown)) {
    document.querySelector(`#breakdown-${key}`).textContent =
      value === null ? "Pendiente" : formatCurrency(value);
  }
  document.querySelector("#breakdown-total").textContent = estimate.ready
    ? `${formatCurrency(estimate.minimum)} – ${formatCurrency(estimate.maximum)}`
    : "Pendiente";
}

function updatePreview() {
  setVisibleServiceFields();
  const formData = getFormData();
  const project = readProject(formData);
  const kitchenLengths = calculateKitchenLinearMeters(
    formData.get("baseLinearMeters"),
    formData.get("upperLinearMeters"),
  );
  form
    .querySelector("#kitchen-upper")
    .setCustomValidity(
      project.service === "kitchen" && !kitchenLengths
        ? "Indica una longitud mayor que cero en los gabinetes inferiores o superiores."
        : "",
    );
  const selected = Boolean(project.service);
  const title = document.querySelector("#preview-title");
  const caption = document.querySelector("#preview-caption");
  const measure = document.querySelector("#preview-measure");

  title.textContent = selected ? project.serviceLabel : "Tu proyecto";
  caption.textContent = project.location
    ? locationLabels[project.location]
    : "Selecciona un servicio y una zona.";
  measure.textContent = selected ? project.measurement : "";
  updateWindowDrawing(project);
  updateSpecialDrawing(project, formData);
  const estimate = calculateEstimate(project, quotePricing);
  updatePriceStatus(estimate);

  const windowAreaNote = document.querySelector("#window-area-note");
  if (windowAreaNote && project.service === "windows") {
    const dimensions = calculateWindowArea(
      formData.get("width"),
      formData.get("height"),
      formData.get("quantity"),
    );
    windowAreaNote.textContent = dimensions
      ? `Mínimo facturable: 1.00 m² por ventana · total facturable: ${dimensions.billableArea.toFixed(2)} m²`
      : "";
  }
  const bathAreaNote = document.querySelector("#bath-area-note");
  if (bathAreaNote && project.service === "bathroom") {
    const area = calculateAreaSquareMeters(
      formData.get("width"),
      formData.get("height"),
    );
    bathAreaNote.textContent = area
      ? `Área por puerta: ${area.toFixed(2)} m²`
      : "";
  }

  return { ...project, estimate };
}

function updatePrintQuote(project = updatePreview()) {
  const today = new Intl.DateTimeFormat("es-PA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
  document.querySelector("#print-date").textContent = today;
  document.querySelector("#print-location").textContent =
    locationLabels[project.location] ?? "Por confirmar";
  document.querySelector("#print-name").textContent =
    project.name || "Por confirmar";
  document.querySelector("#print-phone").textContent =
    project.clientPhone || "No indicado";
  document.querySelector("#print-address").textContent =
    project.address || "Por confirmar";
  document.querySelector("#print-description").textContent =
    `${project.description}. ${project.measurement}`;
  document.querySelector("#print-quantity").textContent = project.quantityLabel;
  document.querySelector("#print-unit-price").textContent = project.estimate
    .ready
    ? formatCurrency(project.estimate.subtotal / project.pricingQuantity)
    : "Pendiente";
  document.querySelector("#print-line-total").textContent = project.estimate
    .ready
    ? formatCurrency(project.estimate.subtotal)
    : "Pendiente";
  document.querySelector("#print-subtotal").textContent = project.estimate.ready
    ? formatCurrency(project.estimate.subtotal)
    : "Pendiente de tarifas aprobadas";
  document.querySelector("#print-tax").textContent = project.estimate.ready
    ? formatCurrency(project.estimate.itbms)
    : `Pendiente · ${Math.round(quotePricing.itbmsRate * 100)} %`;
  document.querySelector("#print-total").textContent = project.estimate.ready
    ? `${formatCurrency(project.estimate.minimum)} – ${formatCurrency(project.estimate.maximum)}`
    : "Pendiente de tarifas aprobadas";
  document.querySelector("#print-notes").textContent = project.details
    ? `Notas: ${project.details}`
    : "";
  return project;
}

function handleSubmit(event) {
  event.preventDefault();
  const project = updatePrintQuote();
  const detailLines = [
    project.description,
    project.measurement,
    `Zona: ${locationLabels[project.location] ?? "Por confirmar"}`,
    project.address ? `Referencia: ${project.address}` : "",
    project.clientPhone ? `Teléfono del cliente: ${project.clientPhone}` : "",
    project.details ? `Notas: ${project.details}` : "",
    "Cotización estimada sujeta a rectificación de medidas en sitio; no constituye una oferta final.",
    `ITBMS aplicable: ${Math.round(quotePricing.itbmsRate * 100)} %.`,
    project.estimate.ready
      ? `Subtotal: ${formatCurrency(project.estimate.subtotal)} · ITBMS: ${formatCurrency(project.estimate.itbms)} · rango total: ${formatCurrency(project.estimate.minimum)}–${formatCurrency(project.estimate.maximum)}.`
      : "Montos pendientes de tarifas comerciales aprobadas; no es una oferta final.",
  ].filter(Boolean);
  const whatsappUrl = buildWhatsAppUrl(
    business.whatsapp,
    project.name,
    project.serviceLabel,
    detailLines.join("\n"),
  );
  if (!whatsappUrl) {
    quoteError.textContent =
      "El número de WhatsApp comercial no está configurado correctamente.";
    quoteError.hidden = false;
    return;
  }
  quoteError.hidden = true;
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
}

function handlePrint() {
  if (!form.reportValidity()) return;
  updatePrintQuote();
  printSection.hidden = false;
  const resetPrint = () => {
    printSection.hidden = true;
    window.removeEventListener("afterprint", resetPrint);
  };
  window.addEventListener("afterprint", resetPrint);
  window.print();
}

if (form && quoteService && quoteError && printSection) {
  const requestedService = getRequestedService(window.location.search, []);
  if (requestedService) quoteService.value = requestedService;

  form.addEventListener("input", updatePreview);
  form.addEventListener("change", updatePreview);
  form.addEventListener("submit", handleSubmit);
  document.querySelector("#print-quote").addEventListener("click", handlePrint);
  updatePreview();
}
