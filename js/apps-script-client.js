export const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzZmN9yAqV79CCY0Ugjh9-uForm9F9mb6muOKBTi1ODpb0O9aEaKcp1_jMD2QKMHag/exec";

export function createAppsScriptPayload(project, mode) {
  return {
    cliente: project.name,
    telefono: project.clientPhone,
    ubicacion: [...new Set([project.address, project.locationLabel])]
      .filter(Boolean)
      .join(" — "),
    correo: project.email,
    items: [
      {
        descripcion: project.description,
        cantidad: project.quantity,
      },
    ],
    enviarCorreo: mode === "enviar",
  };
}

export async function requestQuoteDocument(payload, fetchImpl = fetch) {
  const response = await fetchImpl(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
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
  if (typeof data.correoEnviado !== "boolean") {
    throw new Error("Apps Script no indicó si envió el correo al vendedor.");
  }

  return data;
}
