export const serviceLabels = {
  windows: "Ventanas corredizas / proyectables",
  bathroom: "Puertas de baño en vidrio templado",
  kitchen: "Muebles de cocina a medida",
  welding: "Soldadura general",
  other: "Puertas, muebles y otros trabajos",
};

export const locationLabels = {
  center: "Panamá Centro",
  sanMiguelito: "San Miguelito / Brisas del Golf",
  east: "Panamá Este / Tocumen",
  west: "Panamá Oeste / Arraiján - La Chorrera",
  interior: "Interior / Otros",
};

export const frameColors = {
  natural: { label: "Aluminio natural", color: "#737d8b" },
  white: { label: "Blanco", color: "#f8fafc" },
  black: { label: "Negro", color: "#27313f" },
  bronze: { label: "Bronce", color: "#8a5a35" },
  wood: { label: "Veta de madera", color: "#815438" },
};

export const glassColors = {
  clear: { label: "Claro", color: "#dcebf0" },
  bronze: { label: "Bronce", color: "#b89370" },
  gray: { label: "Gris", color: "#9da8ad" },
  reflective: { label: "Reflectivo", color: "#a9c5d6" },
  tempered: { label: "Templado claro", color: "#dcebf0" },
};

const legacyServiceKeys = {
  "Ventanas de aluminio y vidrio": "windows",
  "Puertas y divisiones de baño": "bathroom",
  "Muebles de cocina": "kitchen",
  "Puertas de aluminio y vidrio": "other",
  "Muebles personalizados": "other",
  "Mantenimiento y reparaciones": "other",
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

export function calculateAreaSquareMeters(widthCm, heightCm) {
  const width = toPositiveNumber(widthCm);
  const height = toPositiveNumber(heightCm);
  if (width === null || height === null) return null;
  return (width * height) / 10000;
}

export function calculateWindowArea(widthCm, heightCm, quantity = 1) {
  const areaPerWindow = calculateAreaSquareMeters(widthCm, heightCm);
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
    subtotal: null,
    itbms: null,
    total: null,
  };
}

function isRate(value) {
  return Number.isFinite(value) && value >= 0;
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateEstimate(project, config) {
  const pending = getPendingEstimateBreakdown();
  const locationRates = config.logistics[project.location];
  if (
    !project.rateInputs ||
    !locationRates ||
    !isRate(config.rangeVariance) ||
    !isRate(config.itbmsRate) ||
    !isRate(locationRates.transportBase) ||
    !isRate(locationRates.transportPerUnit) ||
    !isRate(locationRates.installPerUnit)
  ) {
    return pending;
  }

  const input = project.rateInputs;
  let base;
  let finish;
  let measure;

  if (project.service === "windows") {
    const rates = config.windows;
    const openingRate = rates.openingMultipliers[input.opening];
    const frameRate = rates.frameMultipliers[input.frame];
    const glassRate = rates.glassPerSquareMeter[input.glass];
    if (
      !isRate(rates.basePerSquareMeter) ||
      !isRate(openingRate) ||
      !isRate(frameRate) ||
      !isRate(glassRate)
    ) {
      return pending;
    }
    measure = input.area;
    base = measure * rates.basePerSquareMeter;
    finish =
      base * (openingRate - 1) + base * (frameRate - 1) + measure * glassRate;
  } else if (project.service === "bathroom") {
    const rates = config.bathroom;
    const thicknessRate = rates.thicknessMultipliers[input.thickness];
    const doorRate = rates.doorMultipliers[input.door];
    const hardwareRate = rates.hardwarePerDoor[input.hardware];
    const glassRate = rates.glassPerSquareMeter[input.glass];
    if (
      !isRate(rates.basePerSquareMeter) ||
      !isRate(thicknessRate) ||
      !isRate(doorRate) ||
      !isRate(hardwareRate) ||
      !isRate(glassRate)
    ) {
      return pending;
    }
    measure = input.area;
    base = measure * rates.basePerSquareMeter;
    finish =
      base * (thicknessRate - 1) +
      base * (doorRate - 1) +
      measure * glassRate +
      input.quantity * hardwareRate;
  } else if (project.service === "kitchen") {
    const rates = config.kitchen;
    const materialRate = rates.materialMultipliers[input.material];
    const countertopRate = rates.countertopPerLinearMeter[input.countertop];
    if (
      !isRate(rates.baseCabinetPerLinearMeter) ||
      !isRate(rates.upperCabinetPerLinearMeter) ||
      !isRate(materialRate) ||
      !isRate(countertopRate)
    ) {
      return pending;
    }
    measure = input.baseMeters + input.upperMeters;
    base =
      input.baseMeters * rates.baseCabinetPerLinearMeter +
      input.upperMeters * rates.upperCabinetPerLinearMeter;
    finish = base * (materialRate - 1) + input.baseMeters * countertopRate;
  } else if (project.service === "welding") {
    const rates = config.welding;
    const unitRates =
      input.unit === "linear" ? rates.perLinearMeter : rates.perSquareMeter;
    const finishRates =
      input.unit === "linear"
        ? rates.finishPerLinearMeter
        : rates.finishPerSquareMeter;
    const baseRate = unitRates[input.projectType];
    const finishRate = finishRates[input.finish];
    if (!isRate(baseRate) || !isRate(finishRate)) return pending;
    measure = input.measure;
    base = measure * baseRate;
    finish = measure * finishRate;
  } else {
    return pending;
  }

  if (!Number.isFinite(measure) || measure <= 0) return pending;

  const transport =
    locationRates.transportBase + locationRates.transportPerUnit * measure;
  const installation = locationRates.installPerUnit * measure;
  const subtotal = roundCurrency(base + finish + transport + installation);
  const itbms = roundCurrency(subtotal * config.itbmsRate);
  const total = roundCurrency(subtotal + itbms);
  const minimum = roundCurrency(total * (1 - config.rangeVariance));
  const maximum = roundCurrency(total * (1 + config.rangeVariance));

  return {
    ready: true,
    base: roundCurrency(base),
    finish: roundCurrency(finish),
    transport: roundCurrency(transport),
    installation: roundCurrency(installation),
    subtotal,
    itbms,
    total,
    minimum,
    maximum,
  };
}
