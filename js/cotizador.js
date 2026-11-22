import { business } from "./data.js";
import {
  createAppsScriptPayload,
  requestQuoteDocument,
} from "./apps-script-client.js";
import {
  buildWhatsAppUrl,
  calculateAreaSquareMeters,
  calculateWindowArea,
  createQuoteWhatsAppMessage,
  frameColors,
  getRequestedService,
  glassColors,
  locationLabels,
  serviceLabels,
} from "./quote-engine.js";

const form = document.querySelector("#quote-form");
const quoteError = document.querySelector("#quote-error");
const quoteStatus = document.querySelector("#quote-status");
const quoteActions = document.querySelector("#quote-actions");
const actionButtons = quoteActions
  ? [...quoteActions.querySelectorAll("[data-quote-action]")]
  : [];

function formData() {
  return new FormData(form);
}

function formValue(data, name) {
  return String(data.get(name) ?? "").trim();
}

function checkedValue(name) {
  return form.querySelector(`input[name="${name}"]:checked`)?.value ?? "";
}

function formatMeters(value) {
  return Number.isFinite(value) ? `${value.toFixed(2)} m` : "—";
}

function setServiceFields(service) {
  for (const fieldset of form.querySelectorAll("[data-service-fields]")) {
    const active = fieldset.dataset.serviceFields === service;
    fieldset.hidden = !active;
    fieldset.disabled = !active;
  }

  const isKitchen = service === "kitchen";
  form.querySelector("#height-card").hidden = isKitchen;
  form.querySelector("#height-m").disabled = isKitchen;
  form.querySelector("#height-range").disabled = isKitchen;
  form.querySelector("#height-m").required = !isKitchen;
  form.querySelector("#width-label").textContent = isKitchen
    ? "LONGITUD (M LINEAL)"
    : "ANCHO (METROS)";

  const captions = {
    windows: "Selecciona el acabado del perfil de aluminio.",
    bathroom: "Selecciona el acabado de la estructura y los herrajes.",
    kitchen: "Selecciona el acabado visible de los muebles.",
    welding: "Selecciona el acabado de la estructura metálica.",
  };
  document.querySelector("#color-step-caption").textContent =
    captions[service] ?? "Selecciona un acabado.";

  for (const card of form.querySelectorAll(".service-card")) {
    card.classList.toggle(
      "is-selected",
      card.querySelector('input[name="service"]').value === service,
    );
  }
}

function readProject() {
  const data = formData();
  const service = checkedValue("service");
  const width = Number(formValue(data, "width"));
  const height =
    service === "kitchen" ? null : Number(formValue(data, "height"));
  const quantity = Number(formValue(data, "quantity"));
  const frame = checkedValue("frameColor") || "natural";
  const location = formValue(data, "location");
  const installationIncluded = data.has("installationIncluded");
  const widthValid = width >= 0.4 && width <= 6;
  const heightValid = service === "kitchen" || (height >= 0.4 && height <= 3.5);
  const quantityValid = Number.isInteger(quantity) && quantity >= 1;
  const dimensionsValid = widthValid && heightValid && quantityValid;
  const colorLabel = frameColors[frame]?.label ?? frameColors.natural.label;
  const lShape = data.has("kitchenLShape");
  const softClose = data.has("softClose");
  let measure = null;
  let quantityLabel = "";
  let description = serviceLabels[service] ?? "Proyecto a medida";
  let measurementText = "";

  if (service === "windows" && dimensionsValid) {
    const area = calculateWindowArea(width, height, quantity);
    if (area) {
      measure = area.billableArea;
      quantityLabel = `${measure.toFixed(2)} m²`;
      const glass = formValue(data, "glass");
      const glassLabel = glassColors[glass]?.label ?? glassColors.clear.label;
      const opening = formValue(data, "windowType");
      const openingLabel = opening === "hinged" ? "batiente" : "corrediza";
      description = `Ventana ${openingLabel} de aluminio ${colorLabel}, vidrio ${glassLabel} ${formValue(data, "glassThickness")} mm, ${formatMeters(width)} × ${formatMeters(height)} · ${quantity} unidad${quantity === 1 ? "" : "es"}`;
      measurementText = `Área neta: ${area.netArea.toFixed(2)} m² · facturable: ${measure.toFixed(2)} m² (mínimo 1.00 m² por unidad)`;
    }
  } else if (service === "bathroom" && dimensionsValid) {
    const netArea = calculateAreaSquareMeters(width, height);
    const glass = formValue(data, "glass");
    const glassLabel = glassColors[glass]?.label ?? glassColors.tempered.label;
    const door = formValue(data, "doorType");
    const doorLabel = door === "hinged" ? "batiente" : "corrediza";
    measure = Math.max(netArea, 1) * quantity;
    quantityLabel = `${measure.toFixed(2)} m²`;
    description = `Puerta de baño ${doorLabel}, vidrio ${glassLabel} ${formValue(data, "glassThickness")} mm, herrajes ${formValue(data, "hardware") === "black" ? "negro mate" : "cromados"}, acabado ${colorLabel}, ${formatMeters(width)} × ${formatMeters(height)} · ${quantity} unidad${quantity === 1 ? "" : "es"}`;
    measurementText = `Área por unidad: ${netArea.toFixed(2)} m² · área facturable mínima: 1.00 m² por unidad`;
  } else if (service === "kitchen" && dimensionsValid) {
    measure = width * quantity;
    quantityLabel = `${measure.toFixed(2)} ml`;
    const material = formValue(data, "cabinetMaterial");
    const materialLabels = {
      melamine: "melamina estándar",
      rh: "MDF hidrófugo / RH",
      pvc: "PVC",
    };
    const countertop = formValue(data, "countertop");
    const countertopLabels = {
      none: "sin sobrecubierta",
      laminate: "sobrecubierta laminada",
      granite: "sobrecubierta de granito",
      quartz: "sobrecubierta de cuarzo",
    };
    const softCloseLabel = softClose ? "cierre lento" : "cierre estándar";
    description = `Muebles de cocina ${materialLabels[material]}, acabado ${colorLabel}, ${countertopLabels[countertop]} · ${measure.toFixed(2)} ml${lShape ? " · diseño en L (personalizado)" : ""}`;
    description = `${description} · ${softCloseLabel}`;
    measurementText = `${measure.toFixed(2)} m lineales aproximados`;
  } else if (service === "welding" && dimensionsValid) {
    measure = width * height * quantity;
    quantityLabel = `${measure.toFixed(2)} m²`;
    const projectType = formValue(data, "weldProject");
    const projectLabels = {
      securityBars: "verjas de seguridad",
      gate: "portón",
      roof: "techo / estructura de techo",
      custom: "estructura personalizada",
    };
    const finish = formValue(data, "weldFinish");
    const finishLabel =
      finish === "enamel"
        ? "esmalte / acabado electrostático"
        : "imprimación anticorrosiva";
    description = `Soldadura: ${projectLabels[projectType]}, ${formatMeters(width)} × ${formatMeters(height)}, ${finishLabel}, color ${colorLabel} · ${quantity} unidad${quantity === 1 ? "" : "es"}`;
    measurementText = `Área aproximada: ${measure.toFixed(2)} m²`;
  } else if (service === "kitchen") {
    description = "Muebles de cocina a medida";
    measurementText = "Completa una longitud válida para mostrar el área.";
  } else if (service) {
    measurementText = "Completa las dimensiones para mostrar el área.";
  }

  return {
    service,
    serviceLabel: serviceLabels[service] ?? "Proyecto a medida",
    width,
    height,
    quantity,
    measure,
    quantityLabel,
    description,
    measurementText,
    colorLabel,
    frame,
    glass: formValue(data, "glass") || "clear",
    location,
    locationLabel: locationLabels[location] ?? "Por confirmar",
    installationIncluded,
    name: formValue(data, "name"),
    ruc: formValue(data, "ruc"),
    rucDv: formValue(data, "rucDv"),
    clientPhone: formValue(data, "clientPhone"),
    email: formValue(data, "email"),
    address: formValue(data, "address"),
    lShape,
    dimensionsValid,
  };
}

function setSvgRect(element, x, y, width, height) {
  element.setAttribute("x", String(x));
  element.setAttribute("y", String(y));
  element.setAttribute("width", String(width));
  element.setAttribute("height", String(height));
}

function updatePreviewDrawing(project) {
  document.querySelector("#preview-window").hidden = ![
    "windows",
    "bathroom",
  ].includes(project.service);
  document.querySelector("#preview-kitchen").hidden =
    project.service !== "kitchen";
  document.querySelector("#preview-welding").hidden =
    project.service !== "welding";

  const gradientStops = document.querySelectorAll("#frame-gradient stop");
  const gradientColors = {
    natural: ["#eef2f5", "#7d8994", "#dce2e7"],
    white: ["#ffffff", "#dce3e9", "#f8fafc"],
    black: ["#56616e", "#171d25", "#3b4653"],
    bronze: ["#d9b891", "#754b2f", "#b6875d"],
  };
  const [start, middle, end] =
    gradientColors[project.frame] ?? gradientColors.natural;
  gradientStops[0].setAttribute("stop-color", start);
  gradientStops[1].setAttribute("stop-color", middle);
  gradientStops[2].setAttribute("stop-color", end);

  const glassColor =
    glassColors[project.glass]?.color ?? glassColors.clear.color;
  document.querySelector("#preview-glass").setAttribute("fill", glassColor);
  const color = frameColors[project.frame]?.color ?? "#64748b";
  document.querySelector("#preview-mullion").setAttribute("stroke", color);
  document.querySelector("#preview-rail").setAttribute("stroke", color);
  document.querySelector("#preview-handle").setAttribute("fill", "#f59e0b");

  const width = project.width || 1.5;
  const height = project.service === "kitchen" ? 1.2 : project.height || 1.2;
  const ratio = Math.min(Math.max(width / height, 0.58), 2.3);
  const drawWidth = Math.min(256, 200 * ratio);
  const drawHeight = drawWidth / ratio;
  const x = 250 - drawWidth / 2;
  const y = 164 - drawHeight / 2;
  const inset = Math.min(10, drawWidth / 10, drawHeight / 10);
  setSvgRect(
    document.querySelector("#preview-frame"),
    x,
    y,
    drawWidth,
    drawHeight,
  );
  setSvgRect(
    document.querySelector("#preview-glass"),
    x + inset,
    y + inset,
    drawWidth - inset * 2,
    drawHeight - inset * 2,
  );
  const mullion = document.querySelector("#preview-mullion");
  mullion.setAttribute("x1", String(x + drawWidth / 2));
  mullion.setAttribute("x2", String(x + drawWidth / 2));
  mullion.setAttribute("y1", String(y + inset));
  mullion.setAttribute("y2", String(y + drawHeight - inset));
  const rail = document.querySelector("#preview-rail");
  rail.setAttribute("x1", String(x + inset));
  rail.setAttribute("x2", String(x + drawWidth - inset));
  rail.setAttribute("y1", String(y + drawHeight / 2));
  rail.setAttribute("y2", String(y + drawHeight / 2));
  document
    .querySelector("#preview-handle")
    .setAttribute("x", String(x + drawWidth / 2 + 13));
  document
    .querySelector("#preview-handle")
    .setAttribute("y", String(y + drawHeight / 2 - 11));

  const widthLine = document.querySelector("#dimension-width-line");
  widthLine.setAttribute("x1", String(x));
  widthLine.setAttribute("x2", String(x + drawWidth));
  const heightLine = document.querySelector("#dimension-height-line");
  const heightX = Math.max(34, x - 25);
  heightLine.setAttribute("x1", String(heightX));
  heightLine.setAttribute("x2", String(heightX));
  heightLine.setAttribute("y1", String(y));
  heightLine.setAttribute("y2", String(y + drawHeight));
  const widthText = document.querySelector("#preview-width-label");
  widthText.setAttribute("x", String(x + drawWidth / 2));
  widthText.textContent =
    project.service === "kitchen"
      ? `${width.toFixed(2)} ml`
      : formatMeters(width);
  const heightText = document.querySelector("#preview-height-label");
  heightText.hidden = project.service === "kitchen";
  heightText.setAttribute("x", String(heightX - 13));
  heightText.setAttribute("y", String(y + drawHeight / 2));
  heightText.setAttribute(
    "transform",
    `rotate(-90 ${heightX - 13} ${y + drawHeight / 2})`,
  );
  heightText.textContent = formatMeters(project.height);

  const kitchenColor = frameColors[project.frame]?.color ?? "#dce3e9";
  document
    .querySelector("#preview-upper-cabinets")
    .setAttribute("fill", kitchenColor);
  document
    .querySelector("#preview-base-cabinets")
    .setAttribute("fill", kitchenColor);
  const weldColor = frameColors[project.frame]?.color ?? "#334155";
  document
    .querySelector("#preview-weld-frame")
    .setAttribute("stroke", weldColor);
  document
    .querySelector("#preview-weld-bars")
    .setAttribute("stroke", weldColor);
}

function updateRequestSummary(project) {
  const values = {
    dimensions:
      project.service === "kitchen"
        ? `${formatMeters(project.width)} lineales`
        : `${formatMeters(project.width)} × ${formatMeters(project.height)}`,
    quantity: String(project.quantity || "—"),
    measurement:
      project.measurementText || "Completa las medidas del proyecto",
    description: project.description,
    location: project.locationLabel,
    installation: project.installationIncluded ? "Solicitada" : "No solicitada",
    customer: project.name || "Por completar",
    ruc: project.ruc
      ? `${project.ruc}${project.rucDv ? ` / ${project.rucDv}` : ""}`
      : "Por completar",
    phone: project.clientPhone || "No indicado",
    email: project.email || "No indicado",
    address: project.address || "Por completar",
  };

  for (const [key, value] of Object.entries(values)) {
    document.querySelector(`#summary-${key}`).textContent = value;
  }
}

function validateProject() {
  quoteError.hidden = true;
  quoteError.textContent = "";
  if (!form.reportValidity()) return null;

  const project = updatePreview();
  if (!project.dimensionsValid) {
    quoteError.textContent =
      "Revisa las medidas y la cantidad para continuar con la solicitud.";
    quoteError.hidden = false;
    return null;
  }
  return project;
}

function downloadPdf(pdfBase64, filename) {
  if (typeof pdfBase64 !== "string" || !pdfBase64.trim()) {
    throw new Error("Apps Script no devolvió el PDF solicitado.");
  }

  const base64 = pdfBase64
    .replace(/^data:application\/pdf;base64,/i, "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  if (!binary.startsWith("%PDF-")) {
    throw new Error("El archivo recibido no parece ser un PDF válido.");
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  let safeFilename = String(filename || "cotizacion.pdf")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .slice(0, 120);
  if (!safeFilename) safeFilename = "cotizacion.pdf";
  if (!safeFilename.toLowerCase().endsWith(".pdf")) {
    safeFilename = `${safeFilename}.pdf`;
  }

  const pdfUrl = URL.createObjectURL(
    new Blob([bytes], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = pdfUrl;
  link.download = safeFilename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
}

async function processQuoteAction(mode) {
  const project = validateProject();
  if (!project) return;

  const fallbackLink = document.querySelector("#whatsapp-fallback-link");
  fallbackLink.hidden = true;
  const whatsappWindow =
    mode === "whatsapp" ? window.open("about:blank", "_blank") : null;

  actionButtons.forEach((button) => {
    button.disabled = true;
  });
  quoteActions.setAttribute("aria-busy", "true");
  quoteStatus.textContent = "Generando consecutivo y documento PDF...";

  try {
    const data = await requestQuoteDocument(
      createAppsScriptPayload(project, mode),
    );
    const consecutivo = String(data.consecutivo ?? "").trim();
    if (!consecutivo) {
      throw new Error("Apps Script no devolvió el consecutivo de la solicitud.");
    }

    if (mode === "descargar" || mode === "whatsapp") {
      downloadPdf(data.pdfBase64, data.filename || `cotizacion-${consecutivo}.pdf`);
    }

    if (mode === "whatsapp") {
      const details = [
        `Consecutivo: ${consecutivo}`,
        createQuoteWhatsAppMessage(project),
        "Adjunta el PDF técnico que acabas de descargar.",
      ].join("\n\n");
      const whatsappUrl = buildWhatsAppUrl(
        business.whatsapp,
        project.name,
        project.serviceLabel,
        details,
      );
      if (!whatsappUrl) {
        throw new Error(
          "El número comercial de WhatsApp no está configurado correctamente.",
        );
      }

      if (whatsappWindow) {
        whatsappWindow.opener = null;
        whatsappWindow.location.href = whatsappUrl;
      } else {
        fallbackLink.href = whatsappUrl;
        fallbackLink.hidden = false;
      }
    }

    const messages = {
      enviar: `¡Listo! La solicitud ${consecutivo} se procesó correctamente.`,
      descargar: `PDF sin precios ${consecutivo} descargado correctamente.`,
      whatsapp: whatsappWindow
        ? `PDF ${consecutivo} descargado. Revisa WhatsApp y adjunta el archivo.`
        : `PDF ${consecutivo} descargado. Usa el enlace para abrir WhatsApp y adjunta el archivo.`,
    };
    quoteStatus.textContent = messages[mode];
  } catch (error) {
    if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
    quoteError.textContent =
      error instanceof Error
        ? `No se pudo procesar la solicitud: ${error.message}`
        : "No se pudo procesar la solicitud.";
    quoteError.hidden = false;
    quoteStatus.textContent = "";
  } finally {
    actionButtons.forEach((button) => {
      button.disabled = false;
    });
    quoteActions.setAttribute("aria-busy", "false");
  }
}

function updatePreview() {
  quoteError.hidden = true;
  quoteError.textContent = "";
  quoteStatus.textContent = "";
  setServiceFields(checkedValue("service"));
  const project = readProject();
  document.querySelector("#preview-title").textContent = project.serviceLabel;
  document.querySelector("#preview-caption").textContent = project.location
    ? project.locationLabel
    : "Completa los datos para enviar tu solicitud.";
  document.querySelector("#preview-measure").textContent =
    project.measurementText;
  document.querySelector("#measure-badge").textContent =
    project.service === "kitchen"
      ? `Longitud: ${project.measure?.toFixed(2) ?? "—"} ml`
      : `Área: ${project.measure?.toFixed(2) ?? "—"} m²`;
  updateRequestSummary(project);
  updatePreviewDrawing(project);
  return project;
}

function syncDimensions(event) {
  const pairs = [
    ["#width-m", "#width-range"],
    ["#height-m", "#height-range"],
  ];
  for (const [numberSelector, rangeSelector] of pairs) {
    const numberInput = form.querySelector(numberSelector);
    const rangeInput = form.querySelector(rangeSelector);
    if (event.target === rangeInput) {
      numberInput.value = Number(rangeInput.value).toFixed(2);
    } else if (event.target === numberInput) {
      const value = Number(numberInput.value);
      if (Number.isFinite(value)) rangeInput.value = String(value);
    }
  }
  updatePreview();
}

function normalizeDimension(event) {
  const input = event.target;
  const minimum = Number(input.min);
  const maximum = Number(input.max);
  const value = Number(input.value);
  if (!Number.isFinite(value)) return;
  const normalized = Math.min(Math.max(value, minimum), maximum);
  input.value = normalized.toFixed(2);
  const pairedRange = form.querySelector(
    input.id === "width-m" ? "#width-range" : "#height-range",
  );
  pairedRange.value = input.value;
  updatePreview();
}

function updateQuantity(event) {
  const button = event.target.closest("[data-quantity-step]");
  if (!button) return;
  const input = form.querySelector("#unit-quantity");
  const next = Number(input.value) + Number(button.dataset.quantityStep);
  input.value = String(Math.min(Math.max(next, 1), 100));
  updatePreview();
}

function initialize() {
  if (!form) return;
  const requestedService = getRequestedService(window.location.search, []);
  if (requestedService) {
    const serviceRadio = form.querySelector(
      `input[name="service"][value="${requestedService}"]`,
    );
    if (serviceRadio) serviceRadio.checked = true;
  }
  setServiceFields(checkedValue("service"));
  form.addEventListener("input", (event) => {
    if (
      event.target.matches("#width-m, #height-m, #width-range, #height-range")
    ) {
      syncDimensions(event);
    } else {
      updatePreview();
    }
  });
  form.addEventListener("change", updatePreview);
  form.addEventListener("click", updateQuantity);
  for (const selector of ["#width-m", "#height-m"]) {
    form.querySelector(selector).addEventListener("change", normalizeDimension);
  }

  for (const button of actionButtons) {
    button.addEventListener("click", () => {
      void processQuoteAction(button.dataset.quoteAction);
    });
  }
  updatePreview();
}

initialize();
