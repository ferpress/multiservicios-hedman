import { services } from "./data.js";
import "./cotizador.js";

function renderServices() {
  const container = document.querySelector("#services-grid");
  if (!container) return;

  const serviceLimit = Number.parseInt(container.dataset.serviceLimit, 10);
  const visibleServices =
    Number.isInteger(serviceLimit) && serviceLimit > 0
      ? services.slice(0, serviceLimit)
      : services;
  const cards = visibleServices.map((service, index) => {
    const article = document.createElement("article");
    article.className = "service-card";

    const number = document.createElement("span");
    number.className = "service-number";
    number.setAttribute("aria-hidden", "true");
    number.textContent = String(index + 1).padStart(2, "0");

    const title = document.createElement("h3");
    title.textContent = service.name;

    const description = document.createElement("p");
    description.textContent = service.description;

    const details = document.createElement("ul");
    for (const detail of service.details) {
      const item = document.createElement("li");
      item.textContent = detail;
      details.append(item);
    }

    const link = document.createElement("a");
    link.href = `cotizacion.html?servicio=${encodeURIComponent(service.name)}`;
    link.innerHTML = 'Solicitar cotización <span aria-hidden="true">→</span>';

    article.append(number, title, description, details, link);
    return article;
  });

  container.replaceChildren(...cards);
}

function setupMobileMenu() {
  const toggle = document.querySelector("#menu-toggle");
  const menu = document.querySelector("#primary-menu");
  if (!toggle || !menu) return;

  const closeMenu = () => {
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú");
  };

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Abrir menú" : "Cerrar menú");
    menu.classList.toggle("is-open", !isOpen);
  });

  menu
    .querySelectorAll("a")
    .forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 800px)").matches) closeMenu();
  });
}

function setupYear() {
  const year = document.querySelector("#current-year");
  if (year) year.textContent = String(new Date().getFullYear());
}

renderServices();
setupMobileMenu();
setupYear();
