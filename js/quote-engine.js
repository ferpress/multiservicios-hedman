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
  },
  white: {
    label: "Blanco Arquitect.",
    color: "#f8fafc",
  },
  black: {
    label: "Negro Mate",
    color: "#27313f",
  },
  bronze: {
    label: "Bronce / Madera",
    color: "#815438",
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

export function createQuoteWhatsAppMessage(project) {
  return [
    "Solicitud de cotización — datos del proyecto",
    `WhatsApp: ${project.clientPhone || "No indicado"}`,
    `Correo: ${project.email || "No indicado"}`,
    `Corregimiento / referencia: ${project.address}`,
    `Servicio: ${project.serviceLabel}`,
    `Medidas: ${project.service === "kitchen" ? `${project.width.toFixed(2)} m lineales` : `${project.width.toFixed(2)} × ${project.height.toFixed(2)} m`}`,
    `Cantidad: ${project.quantity}`,
    project.measurementText
      ? `Área / longitud: ${project.measurementText}`
      : "",
    `Especificaciones: ${project.description}`,
    `Zona del proyecto: ${project.locationLabel}`,
    `Instalación solicitada: ${project.installationIncluded ? "Sí" : "No"}`,
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
