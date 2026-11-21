import { business, services } from "./data.js";

export function normalizePhone(phone) {
  return phone.replace(/\D/g, "");
}

export function buildWhatsAppUrl(phone, name, service, details) {
  const cleanPhone = normalizePhone(phone);
  if (!/^507\d{8}$/.test(cleanPhone)) return null;

  const message = [
    `Hola, soy ${name}. Quisiera solicitar una cotización.`,
    `Servicio: ${service}`,
    `Detalles: ${details}`,
  ].join("\n");

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function getRequestedService(search, availableServices) {
  const requestedService = new URLSearchParams(search).get("servicio");
  return availableServices.some((service) => service.name === requestedService)
    ? requestedService
    : "";
}

const form =
  typeof document === "undefined"
    ? null
    : document.querySelector("#quote-form");
const serviceSelect =
  typeof document === "undefined"
    ? null
    : document.querySelector("#quote-service");
const errorMessage =
  typeof document === "undefined"
    ? null
    : document.querySelector("#quote-error");

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.textContent = "";
  errorMessage.hidden = true;
}

function renderServiceOptions() {
  for (const service of services) {
    const option = document.createElement("option");
    option.value = service.name;
    option.textContent = service.name;
    serviceSelect.append(option);
  }

  const requestedService = getRequestedService(
    window.location.search,
    services,
  );
  if (requestedService) {
    serviceSelect.value = requestedService;
  }
}

function handleSubmit(event) {
  event.preventDefault();
  clearError();

  const formData = new FormData(form);
  const whatsappUrl = buildWhatsAppUrl(
    business.whatsapp,
    formData.get("name").trim(),
    formData.get("service"),
    formData.get("details").trim(),
  );
  if (!whatsappUrl) {
    showError(
      "El WhatsApp comercial aún no está configurado. Añade el número con código de país en js/data.js.",
    );
    return;
  }
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
}

if (form && serviceSelect && errorMessage) {
  renderServiceOptions();
  serviceSelect.addEventListener("change", clearError);
  form.addEventListener("input", clearError);
  form.addEventListener("submit", handleSubmit);
}
