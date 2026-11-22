export const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzZmN9yAqV79CCY0Ugjh9-uForm9F9mb6muOKBTi1ODpb0O9aEaKcp1_jMD2QKMHag/exec";

export function createAppsScriptPayload(project, mode) {
  return {
    modo: mode,
    servicio: project.serviceLabel,
    ancho: project.width,
    alto: project.height ?? "",
    cantidad: project.quantity,
    acabado: project.colorLabel,
    especificaciones: project.description,
    area: project.measurementText,
    cliente: project.name,
    ruc: project.ruc,
    dv: project.rucDv,
    telefono: project.clientPhone,
    correo: project.email,
    ubicacion: project.address,
    zona: project.locationLabel,
    instalacion: project.installationIncluded,
    enviarCorreo: mode === "enviar" || mode === "whatsapp",
  };
}

export async function requestQuoteDocument(payload, fetchImpl = fetch) {
  const response = await fetchImpl(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(payload),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Apps Script devolvió una respuesta que no es JSON válido.");
  }

  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : `Apps Script respondió con el código HTTP ${response.status}.`,
    );
  }
  if (data?.ok !== true) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "Apps Script no pudo procesar la solicitud.",
    );
  }

  return data;
}
