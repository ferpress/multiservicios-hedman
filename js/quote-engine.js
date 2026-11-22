export const serviceLabels = {
  windows: "Ventanas a Medida",
  bathroom: "Puerta de Baño Templada",
  kitchen: "Muebles de Cocina",
  welding: "Soldadura General",
};

export const locationLabels = {
  center: "Panamá Centro",
  sanMiguelito: "San Miguelito / Brisas del Golf",
  east: "Panamá Este / Tocumen",
  west: "Panamá Oeste / Arraiján - Chorrera",
  interior: "Interior / Otros",
};

export const frameColors = {
  natural: {
    label: "Aluminio Natural",
    color: "#b7c1ca",
    impact: "Base",
    subtitle: "+0% estándar",
  },
  white: {
    label: "Blanco Arquitect.",
    color: "#f8fafc",
    impact: "+10%",
    subtitle: "Acabado limpio",
  },
  black: {
    label: "Negro Mate",
    color: "#27313f",
    impact: "+20%",
    subtitle: "Estilo moderno",
  },
  bronze: {
    label: "Bronce / Madera",
    color: "#815438",
    impact: "+25%",
    subtitle: "Acabado premium",
  },
};

export const glassColors = {
  clear: { label: 'Claro 1/4"', color: "#dcebf0" },
  bronze: { label: 'Bronce 1/4"', color: "#b89370" },
  laminated: { label: "Laminado", color: "#9da8ad" },
  tempered: { label: "Templado", color: "#a9c5d6" },
};

const legacyServiceKeys = {
  "Ventanas de aluminio y vidrio": "windows",
  "Puertas y divisiones de baño": "bathroom",
  "Muebles de cocina": "kitchen",
  "Puertas de aluminio y vidrio": "bathroom",
  "Muebles personalizados": "kitchen",
  "Mantenimiento y reparaciones": "welding",
};

export function normalizePhone(phone) {
  return String(phone ?? "").replace(/\D/g, "");
}

export function buildWhatsAppUrl(phone, name, service, details) {
  const cleanPhone = normalizePhone(phone);
  if (!/^507\d{8}$/.test(cleanPhone)) return null;

  const message = [
    `Solicitud de cotización para ${service}`,
    `Cliente: ${name}`,
    details,
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function createQuoteWhatsAppMessage(project, reference) {
  const money = (amount) =>
    `$${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  const estimate = project.estimate;

  return [
    `Folio: ${reference}`,
    `RUC/DV: ${project.ruc}-${project.rucDv}`,
    `WhatsApp: ${project.clientPhone || "No indicado"}`,
    `Correo: ${project.email || "No indicado"}`,
    `Dirección / referencia: ${project.address || "Por confirmar"}`,
    `Proyecto: ${project.description}`,
    project.measurementText
      ? `Medidas: ${project.measurementText}`
      : "",
    `Zona: ${project.locationLabel}`,
    `Instalación: ${project.installationIncluded ? "Incluida" : "No incluida"}`,
    "Desglose estimado (USD):",
    `Material / fabricación: ${money(estimate.base)}`,
    `Acabados y opciones: ${money(estimate.finish)}`,
    `Transporte / flete: ${money(estimate.transport)}`,
    `Instalación: ${money(estimate.installation)}`,
    `Subtotal: ${money(estimate.subtotal)}`,
    `ITBMS (7 %): ${money(estimate.itbms)}`,
    `Total estimado: ${money(estimate.total)}`,
    "Descarga el PDF desde el cotizador y adjúntalo a este chat.",
    "Cotización estimada sujeta a rectificación técnica de medidas en sitio antes de fabricación.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function getRequestedService(search, availableServices = []) {
  const requestedService = new URLSearchParams(search).get("servicio");
  if (!requestedService) return "";
  if (Object.hasOwn(serviceLabels, requestedService)) return requestedService;
  if (Object.hasOwn(legacyServiceKeys, requestedService)) {
    return legacyServiceKeys[requestedService];
  }

  const availableNames = availableServices.map((service) =>
    typeof service === "string" ? service : service.name,
  );
  if (availableNames.includes(requestedService)) {
    return legacyServiceKeys[requestedService] ?? requestedService;
  }
  return "";
}

export function toPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function calculateAreaSquareMeters(widthMeters, heightMeters) {
  const width = toPositiveNumber(widthMeters);
  const height = toPositiveNumber(heightMeters);
  if (width === null || height === null) return null;
  return width * height;
}

export function calculateWindowArea(widthMeters, heightMeters, quantity = 1) {
  const areaPerWindow = calculateAreaSquareMeters(widthMeters, heightMeters);
  const count = toPositiveNumber(quantity);
  if (areaPerWindow === null || count === null) return null;

  return {
    netAreaPerWindow: areaPerWindow,
    billableAreaPerWindow: Math.max(areaPerWindow, 1),
    quantity: count,
    netArea: areaPerWindow * count,
    billableArea: Math.max(areaPerWindow, 1) * count,
  };
}

export function calculateKitchenLinearMeters(baseMeters, upperMeters) {
  const base = Number(baseMeters);
  const upper = Number(upperMeters);
  if (
    !Number.isFinite(base) ||
    !Number.isFinite(upper) ||
    base < 0 ||
    upper < 0 ||
    base + upper <= 0
  ) {
    return null;
  }
  return { base, upper, total: base + upper };
}

export function calculateWeldingArea(widthMeters, heightMeters, quantity = 1) {
  const width = toPositiveNumber(widthMeters);
  const height = toPositiveNumber(heightMeters);
  const count = toPositiveNumber(quantity);
  if (width === null || height === null || count === null) return null;
  return width * height * count;
}

export function getPendingEstimateBreakdown() {
  return {
    ready: false,
    base: null,
    finish: null,
    transport: null,
    installation: null,
    productTotal: null,
    unitPrice: null,
    subtotal: null,
    itbms: null,
    total: null,
  };
}

function isRate(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateEstimate(project, config) {
  const pending = getPendingEstimateBreakdown();
  const input = project.rateInputs;
  const locationRates = config.logistics?.[project.location];
  if (
    !input ||
    !locationRates ||
    !isRate(config.itbmsRate) ||
    !isRate(locationRates.transportBase) ||
    !isRate(locationRates.transportPerUnit) ||
    !isRate(locationRates.installPerUnit)
  ) {
    return pending;
  }

  const frameRate = config.frameMultipliers?.[input.frame];
  let base;
  let finish;
  let measure;

  if (project.service === "windows") {
    const rates = config.windows;
    const openingRate = rates?.openingMultipliers?.[input.opening];
    const glassRate = rates?.glassPerSquareMeter?.[input.glass];
    if (
      !isRate(rates?.basePerSquareMeter) ||
      !isRate(openingRate) ||
      !isRate(glassRate) ||
      !isRate(frameRate)
    ) {
      return pending;
    }
    measure = input.area;
    base = measure * rates.basePerSquareMeter;
    finish =
      base * (openingRate - 1) + base * (frameRate - 1) + measure * glassRate;
  } else if (project.service === "bathroom") {
    const rates = config.bathroom;
    const thicknessRate = rates?.thicknessMultipliers?.[input.thickness];
    const doorRate = rates?.doorMultipliers?.[input.door];
    const hardwareRate = rates?.hardwarePerDoor?.[input.hardware];
    const glassRate = rates?.glassPerSquareMeter?.[input.glass];
    if (
      !isRate(rates?.basePerSquareMeter) ||
      !isRate(thicknessRate) ||
      !isRate(doorRate) ||
      !isRate(hardwareRate) ||
      !isRate(glassRate) ||
      !isRate(frameRate)
    ) {
      return pending;
    }
    measure = input.area;
    base = measure * rates.basePerSquareMeter;
    finish =
      base * (thicknessRate - 1) +
      base * (doorRate - 1) +
      base * (frameRate - 1) +
      measure * glassRate +
      input.quantity * hardwareRate;
  } else if (project.service === "kitchen") {
    const rates = config.kitchen;
    const materialRate = rates?.materialMultipliers?.[input.material];
    const countertopRate = rates?.countertopPerLinearMeter?.[input.countertop];
    const softCloseRate = input.softClose ? rates?.softClosePerLinearMeter : 0;
    if (
      !isRate(rates?.baseCabinetPerLinearMeter) ||
      !isRate(rates?.upperCabinetPerLinearMeter) ||
      !isRate(materialRate) ||
      !isRate(countertopRate) ||
      !isRate(softCloseRate) ||
      !isRate(frameRate)
    ) {
      return pending;
    }
    measure = input.baseMeters + input.upperMeters;
    base =
      input.baseMeters * rates.baseCabinetPerLinearMeter +
      input.upperMeters * rates.upperCabinetPerLinearMeter;
    finish =
      base * (materialRate - 1) +
      base * (frameRate - 1) +
      input.baseMeters * countertopRate +
      input.baseMeters * softCloseRate;
  } else if (project.service === "welding") {
    const rates = config.welding;
    const baseRate = rates?.perSquareMeter?.[input.projectType];
    const finishRate = rates?.finishPerSquareMeter?.[input.finish];
    if (!isRate(baseRate) || !isRate(finishRate) || !isRate(frameRate)) {
      return pending;
    }
    measure = input.measure;
    base = measure * baseRate;
    finish = measure * (finishRate + baseRate * (frameRate - 1));
  } else {
    return pending;
  }

  if (!Number.isFinite(measure) || measure <= 0) return pending;
  const unitCount = input.unitCount ?? measure;
  if (!Number.isFinite(unitCount) || unitCount <= 0) return pending;

  const productTotal = roundCurrency(base + finish);
  const transport = roundCurrency(
    locationRates.transportBase + locationRates.transportPerUnit * measure,
  );
  const installation = project.installationIncluded
    ? roundCurrency(locationRates.installPerUnit * measure)
    : 0;
  const subtotal = roundCurrency(productTotal + transport + installation);
  const itbms = roundCurrency(subtotal * config.itbmsRate);

  return {
    ready: true,
    base: roundCurrency(base),
    finish: roundCurrency(finish),
    transport,
    installation,
    productTotal,
    unitPrice: roundCurrency(productTotal / unitCount),
    subtotal,
    itbms,
    total: roundCurrency(subtotal + itbms),
  };
}

export function createQuoteReference(storage, date = new Date()) {
  const year = date.getFullYear();
  const key = `hedman-quote-counter-${year}`;
  try {
    const storedCount = Number(storage.getItem(key));
    const nextCount =
      Number.isSafeInteger(storedCount) && storedCount > 0
        ? storedCount + 1
        : 1;
    storage.setItem(key, String(nextCount));
    return {
      reference: `COT-${year}-${String(nextCount).padStart(4, "0")}`,
      persistent: true,
    };
  } catch {
    return {
      reference: `COT-${year}-${date.getTime()}`,
      persistent: false,
    };
  }
}
