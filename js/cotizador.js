import { business } from "./data.js";
import { quotePricing } from "./pricing-config.js";
import {
  buildWhatsAppUrl,
  calculateAreaSquareMeters,
  calculateEstimate,
  calculateWindowArea,
  createQuoteReference,
  frameColors,
  getPendingEstimateBreakdown,
  getRequestedService,
  glassColors,
  locationLabels,
  serviceLabels,
} from "./quote-engine.js";

const API_URL = "https://multiservicios-hedman-api.onrender.com";
const form = document.querySelector("#quote-form");
const quoteError = document.querySelector("#quote-error");
const quoteStatus = document.querySelector("#quote-status");
const templateDialog = document.querySelector("#template-dialog");
const pdfLoading = document.querySelector("#pdf-loading");
const sharePdfButton = document.querySelector("#share-pdf");
const downloadPdfButton = document.querySelector("#download-pdf");
let activeQuoteReference;
let activeQuoteSignature = "";

const startingPrices = {
  windows: {
    amount: quotePricing.windows.basePerSquareMeter,
    unit: "m²",
  },
  bathroom: {
    amount: quotePricing.bathroom.basePerSquareMeter,
    unit: "m²",
  },
  kitchen: {
    amount: quotePricing.kitchen.baseCabinetPerLinearMeter,
    unit: "m lineal",
  },
  welding: {
    amount: quotePricing.welding.perSquareMeter.securityBars,
    unit: "m²",
  },
};

function formData() {
  return new FormData(form);
}

function formValue(data, name) {
  return String(data.get(name) ?? "").trim();
}

function checkedValue(name) {
  return form.querySelector(`input[name="${name}"]:checked`)?.value ?? "";
}

function formatCurrency(value) {
  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
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
  let unitLabel = "m²";
  let quantityLabel = "";
  let description = serviceLabels[service] ?? "Proyecto a medida";
  let rateInputs = null;
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
      rateInputs = {
        area: measure,
        unitCount: measure,
        opening,
        frame,
        glass,
      };
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
    unitLabel = "m²";
    quantityLabel = `${measure.toFixed(2)} m²`;
    rateInputs = {
      area: measure,
      unitCount: measure,
      quantity,
      thickness: formValue(data, "glassThickness"),
      door,
      hardware: formValue(data, "hardware"),
      glass,
      frame,
    };
    description = `Puerta de baño ${doorLabel}, vidrio ${glassLabel} ${formValue(data, "glassThickness")} mm, herrajes ${formValue(data, "hardware") === "black" ? "negro mate" : "cromados"}, acabado ${colorLabel}, ${formatMeters(width)} × ${formatMeters(height)} · ${quantity} unidad${quantity === 1 ? "" : "es"}`;
    measurementText = `Área por unidad: ${netArea.toFixed(2)} m² · área facturable mínima: 1.00 m² por unidad`;
  } else if (service === "kitchen" && dimensionsValid) {
    measure = width * quantity;
    unitLabel = "ml";
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
    rateInputs = {
      baseMeters: measure,
      upperMeters: 0,
      unitCount: measure,
      material,
      countertop,
      softClose,
      frame,
    };
    const softCloseLabel = softClose ? "cierre lento" : "cierre estándar";
    description = `Muebles de cocina ${materialLabels[material]}, acabado ${colorLabel}, ${countertopLabels[countertop]} · ${measure.toFixed(2)} ml${lShape ? " · diseño en L (personalizado)" : ""}`;
    description = `${description} · ${softCloseLabel}`;
    measurementText = `${measure.toFixed(2)} m lineales aproximados`;
  } else if (service === "welding" && dimensionsValid) {
    measure = width * height * quantity;
    unitLabel = "m²";
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
    rateInputs = {
      measure,
      unitCount: measure,
      projectType,
      finish,
      frame,
    };
    description = `Soldadura: ${projectLabels[projectType]}, ${formatMeters(width)} × ${formatMeters(height)}, ${finishLabel}, color ${colorLabel} · ${quantity} unidad${quantity === 1 ? "" : "es"}`;
    measurementText = `Área aproximada: ${measure.toFixed(2)} m²`;
  } else if (service === "kitchen") {
    description = "Muebles de cocina a medida";
    measurementText = "Ingresa una longitud válida para calcular el estimado.";
  } else if (service) {
    measurementText = "Ingresa dimensiones válidas para calcular el estimado.";
  }

  const customRequired =
    (service !== "kitchen" && (width > 3 || height > 2.6)) ||
    (service === "kitchen" && (width > 3 || lShape));
  const estimate =
    dimensionsValid && !customRequired && location && rateInputs
      ? calculateEstimate(
          { service, location, rateInputs, installationIncluded },
          quotePricing,
        )
      : getPendingEstimateBreakdown();

  return {
    service,
    serviceLabel: serviceLabels[service] ?? "Proyecto a medida",
    width,
    height,
    quantity,
    unitLabel,
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
    clientPhone: formValue(data, "clientPhone"),
    address: formValue(data, "address"),
    details: formValue(data, "details"),
    lShape,
    dimensionsValid,
    customRequired,
    estimate,
    rateInputs,
  };
}

function updateStartingPrices() {
  for (const tag of document.querySelectorAll("[data-starting-price]")) {
    const service = tag.dataset.startingPrice;
    const price = startingPrices[service];
    if (price) {
      tag.textContent = `Desde ${formatCurrency(price.amount)} / ${price.unit}`;
    }
  }
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

function setBreakdown(estimate, project) {
  const status = document.querySelector(".quote-price-status strong");
  const statusNote = document.querySelector(".quote-price-status span");
  if (project.customRequired) {
    status.textContent = "Cotización personalizada requerida";
    statusNote.textContent =
      "Un asesor técnico debe revisar este proyecto antes de calcular precios.";
  } else if (!project.dimensionsValid || !project.location) {
    status.textContent = "Completa medidas y zona";
    statusNote.textContent =
      "Los importes aparecerán al completar las opciones requeridas.";
  } else {
    status.textContent = "Estimado referencial en USD";
    statusNote.textContent =
      "Precios demostrativos sujetos a rectificación técnica y confirmación comercial.";
  }

  const breakdown = {
    base: estimate.base,
    finish: estimate.finish,
    transport: estimate.transport,
    install: estimate.installation,
    subtotal: estimate.subtotal,
    tax: estimate.itbms,
    total: estimate.total,
  };
  for (const [key, value] of Object.entries(breakdown)) {
    document.querySelector(`#breakdown-${key}`).textContent =
      value === null
        ? project.customRequired
          ? "Personalizada"
          : "—"
        : key === "install" && !project.installationIncluded
          ? "No incluida"
          : formatCurrency(value);
  }
}

function updatePreview() {
  setServiceFields(checkedValue("service"));
  const project = readProject();
  const service = project.service;
  document.querySelector("#preview-title").textContent = project.serviceLabel;
  document.querySelector("#preview-caption").textContent = project.location
    ? project.locationLabel
    : "Selecciona una zona para calcular transporte e instalación.";
  document.querySelector("#preview-measure").textContent =
    project.measurementText;
  document.querySelector("#measure-badge").textContent =
    service === "kitchen"
      ? `Longitud: ${project.measure?.toFixed(2) ?? "—"} ml`
      : `Área: ${project.measure?.toFixed(2) ?? "—"} m²`;
  document.querySelector("#custom-quote-alert").hidden =
    !project.customRequired;

  const estimate = project.estimate;
  setBreakdown(estimate, project);
  updatePreviewDrawing(project);
  return project;
}

function nextQuoteReference(project) {
  const signature = JSON.stringify(project);
  if (activeQuoteReference && activeQuoteSignature === signature) {
    return activeQuoteReference;
  }
  const storage = {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  };
  activeQuoteReference = createQuoteReference(storage);
  activeQuoteSignature = signature;
  if (!activeQuoteReference.persistent) {
    quoteStatus.textContent =
      "El navegador no permitió guardar el consecutivo; este folio es temporal.";
  }
  return activeQuoteReference;
}

function updateFormalQuote(project) {
  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 15);
  const quoteRef = nextQuoteReference(project);
  const dateFormatter = new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  document.querySelector("#formal-reference").textContent = quoteRef.reference;
  document.querySelector("#formal-date").textContent =
    dateFormatter.format(now);
  document.querySelector("#formal-validity").textContent =
    dateFormatter.format(validUntil);
  document.querySelector("#formal-name").textContent =
    project.name || "Por confirmar";
  document.querySelector("#formal-phone").textContent =
    project.clientPhone || "No indicado";
  document.querySelector("#formal-location").textContent =
    project.locationLabel;
  document.querySelector("#formal-address").textContent =
    project.address || "Por confirmar";
  document.querySelector("#formal-product-description").textContent =
    project.description;
  document.querySelector("#formal-product-quantity").textContent =
    project.quantityLabel;
  const estimate = project.estimate;
  document.querySelector("#formal-product-unit").textContent = formatCurrency(
    estimate.unitPrice,
  );
  document.querySelector("#formal-product-total").textContent = formatCurrency(
    estimate.productTotal,
  );
  document.querySelector("#formal-freight-location").textContent =
    project.locationLabel;
  document.querySelector("#formal-freight-unit").textContent = formatCurrency(
    estimate.transport,
  );
  document.querySelector("#formal-freight-total").textContent = formatCurrency(
    estimate.transport,
  );
  document.querySelector("#formal-install-row").hidden =
    !project.installationIncluded;
  document.querySelector("#formal-install-unit").textContent = formatCurrency(
    estimate.installation,
  );
  document.querySelector("#formal-install-total").textContent = formatCurrency(
    estimate.installation,
  );
  document.querySelector("#formal-subtotal").textContent = formatCurrency(
    estimate.subtotal,
  );
  document.querySelector("#formal-tax").textContent = formatCurrency(
    estimate.itbms,
  );
  document.querySelector("#formal-total").textContent = formatCurrency(
    estimate.total,
  );
  document.querySelector("#formal-validity-term").textContent =
    `Vigencia: 15 días calendario, hasta el ${dateFormatter.format(validUntil)}.`;
}

function validateProject() {
  quoteError.hidden = true;
  quoteError.textContent = "";
  if (!form.reportValidity()) return null;
  const project = updatePreview();
  if (project.customRequired) {
    quoteError.textContent =
      "Este proyecto requiere atención personalizada; usa el botón de WhatsApp para continuar.";
    quoteError.hidden = false;
    return null;
  }
  if (!project.estimate.ready) {
    quoteError.textContent =
      "Completa las dimensiones y selecciona una zona para generar la cotización.";
    quoteError.hidden = false;
    return null;
  }
  return project;
}

function buildPdfPayload(project) {
  const data = formData();
  return {
    name: project.name,
    client_phone: project.clientPhone,
    address: project.address,
    service: project.service,
    location: project.location,
    width_m: project.width,
    height_m: project.height,
    quantity: project.quantity,
    installation_included: project.installationIncluded,
    frame: project.frame,
    glass: project.glass,
    glass_thickness_mm: Number(formValue(data, "glassThickness") || 8),
    window_opening: formValue(data, "windowType") || "sliding",
    door_type: formValue(data, "doorType") || "sliding",
    hardware_finish: formValue(data, "hardware") || "chrome",
    cabinet_material: formValue(data, "cabinetMaterial") || "melamine",
    countertop: formValue(data, "countertop") || "none",
    soft_close: Boolean(project.rateInputs?.softClose),
    kitchen_l_shape: project.lShape,
    welding_type: formValue(data, "weldProject") || "securityBars",
    welding_finish: formValue(data, "weldFinish") || "primer",
  };
}

async function requestOfficialPdf(project) {
  let response;
  try {
    response = await fetch(`${API_URL}/api/quotes/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPdfPayload(project)),
    });
  } catch {
    throw new Error(
      `No se pudo conectar con el servicio de cotización. Verifica API_URL: ${API_URL}`,
    );
  }

  if (!response.ok) {
    let responseBody;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }
    const detail =
      typeof responseBody?.detail === "string"
        ? responseBody.detail
        : `El servicio respondió con el estado ${response.status}.`;
    throw new Error(detail);
  }

  const blob = await response.blob();
  const signature = await blob.slice(0, 5).text();
  if (blob.type !== "application/pdf" || signature !== "%PDF-") {
    throw new Error("El servicio no devolvió un archivo PDF válido.");
  }

  const reference = response.headers.get("X-Quote-Reference");
  if (!reference || !/^COT-\d{4}-\d{4,}$/.test(reference)) {
    throw new Error("El servicio no devolvió un folio oficial válido.");
  }
  return { blob, reference };
}

function setPdfLoading(isLoading) {
  sharePdfButton.disabled = isLoading;
  downloadPdfButton.disabled = isLoading;
  pdfLoading.hidden = !isLoading;
  if (isLoading) {
    quoteStatus.textContent = "Generando cotización oficial...";
  }
}

function getWhatsAppFallbackUrl(project, reference) {
  const details = [
    `Folio: ${reference}`,
    project.description,
    `Zona: ${project.locationLabel}`,
    "Descargué el PDF de la cotización; lo adjuntaré a este mensaje.",
    "Cotización estimada sujeta a rectificación técnica de medidas en sitio antes de fabricación.",
  ].join("\n");
  return buildWhatsAppUrl(
    business.whatsapp,
    project.name,
    project.serviceLabel,
    details,
  );
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

function openCustomWhatsApp() {
  const project = updatePreview();
  const message = [
    "Solicito asesoría para una cotización personalizada.",
    project.description,
    `Zona: ${project.locationLabel}`,
    `Referencia: ${project.address || "Por confirmar"}`,
    "Este proyecto requiere revisión técnica antes de definir el precio.",
  ].join("\n");
  const url = buildWhatsAppUrl(
    business.whatsapp,
    project.name || "Cliente",
    project.serviceLabel,
    message,
  );
  if (!url) {
    quoteError.textContent =
      "El número de WhatsApp comercial no está configurado correctamente.";
    quoteError.hidden = false;
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

async function handleDownloadPdf() {
  const project = validateProject();
  if (!project) return;
  setPdfLoading(true);
  try {
    const { blob, reference } = await requestOfficialPdf(project);
    downloadBlob(blob, `Cotizacion-HEDMAN-${reference}.pdf`);
    quoteStatus.textContent = `PDF oficial descargado: ${reference}.`;
  } catch (error) {
    quoteError.textContent =
      error instanceof Error
        ? error.message
        : "No se pudo generar la cotización oficial. Intenta nuevamente.";
    quoteError.hidden = false;
  } finally {
    setPdfLoading(false);
  }
}

async function handleSharePdf() {
  const project = validateProject();
  if (!project) return;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
  const preopenedWindow = isMobile
    ? null
    : window.open("about:blank", "_blank");
  if (preopenedWindow) preopenedWindow.opener = null;

  setPdfLoading(true);
  try {
    const { blob, reference } = await requestOfficialPdf(project);
    const filename = `Cotizacion-HEDMAN-${reference}.pdf`;
    const file = new window.File([blob], filename, {
      type: "application/pdf",
    });
    const canShareFile =
      isMobile &&
      typeof window.navigator.share === "function" &&
      typeof window.navigator.canShare === "function" &&
      window.navigator.canShare({ files: [file] });

    if (canShareFile) {
      try {
        await window.navigator.share({
          files: [file],
          title: `Cotización ${reference}`,
          text: "Cotización estimada de Multiservicios Hedman.",
        });
        quoteStatus.textContent =
          "Elige WhatsApp en el menú para compartir el PDF oficial.";
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          quoteStatus.textContent =
            "Se canceló el uso del menú para compartir.";
          return;
        }
      }
    }

    downloadBlob(blob, filename);
    const whatsappUrl = getWhatsAppFallbackUrl(project, reference);
    if (!whatsappUrl) {
      throw new Error(
        "El número de WhatsApp comercial no está configurado correctamente.",
      );
    }
    if (preopenedWindow && !preopenedWindow.closed) {
      preopenedWindow.location.replace(whatsappUrl);
      quoteStatus.textContent = `PDF oficial ${reference} descargado. Adjunta el archivo en WhatsApp.`;
    } else {
      const fallbackLink = document.querySelector("#whatsapp-fallback-link");
      fallbackLink.href = whatsappUrl;
      fallbackLink.hidden = false;
      quoteStatus.textContent = `PDF oficial ${reference} descargado. Abre WhatsApp y adjúntalo.`;
    }
  } catch (error) {
    if (preopenedWindow && !preopenedWindow.closed) preopenedWindow.close();
    if (error instanceof Error && error.name === "AbortError") {
      quoteStatus.textContent = "Se canceló la acción de compartir.";
      return;
    }
    quoteError.textContent =
      error instanceof Error
        ? error.message
        : "No se pudo compartir la cotización oficial. Intenta nuevamente.";
    quoteError.hidden = false;
  } finally {
    setPdfLoading(false);
  }
}

function openFormalPreview() {
  const project = validateProject();
  if (!project) return;
  updateFormalQuote(project);
  if (!templateDialog.open) templateDialog.showModal();
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
  updateStartingPrices();
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

  document
    .querySelector("#share-pdf")
    .addEventListener("click", handleSharePdf);
  document
    .querySelector("#download-pdf")
    .addEventListener("click", handleDownloadPdf);
  document
    .querySelector("#view-formal-template")
    .addEventListener("click", openFormalPreview);
  document
    .querySelector("#custom-whatsapp")
    .addEventListener("click", openCustomWhatsApp);
  document.querySelector("#close-template").addEventListener("click", () => {
    templateDialog.close();
  });
  templateDialog.addEventListener("click", (event) => {
    if (event.target === templateDialog) templateDialog.close();
  });
  updatePreview();
}

initialize();
