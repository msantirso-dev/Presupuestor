/**
 * Lee el cuerpo como texto y parsea JSON. Evita SyntaxError cuando la respuesta está vacía
 * (p. ej. errores de proxy, 502 sin body, o fallos de DB sin JSON).
 */
export async function parseFetchJson<T>(response: Response): Promise<{
  ok: boolean;
  status: number;
  data: T | null;
  emptyBody: boolean;
  jsonError: boolean;
}> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: response.ok, status: response.status, data: null, emptyBody: true, jsonError: false };
  }
  try {
    return {
      ok: response.ok,
      status: response.status,
      data: JSON.parse(text) as T,
      emptyBody: false,
      jsonError: false,
    };
  } catch {
    return { ok: response.ok, status: response.status, data: null, emptyBody: false, jsonError: true };
  }
}

export function fetchErrorMessage(
  result: Awaited<ReturnType<typeof parseFetchJson>>,
  fallback = "Error de red o del servidor",
) {
  if (result.status === 413) {
    return "Archivo o datos demasiado grandes para una sola petición (HTTP 413). Probá dividir el archivo o importar por lotes más chicos.";
  }
  if (result.emptyBody) {
    return `Respuesta vacía (HTTP ${result.status}). ¿Base de datos conectada?`;
  }
  if (result.jsonError) {
    return `Respuesta no JSON (HTTP ${result.status}).`;
  }
  if (!result.ok && result.data && typeof result.data === "object" && "error" in result.data) {
    const e = (result.data as { error?: unknown }).error;
    return typeof e === "string" ? e : JSON.stringify(e);
  }
  if (!result.ok) {
    return `${fallback} (HTTP ${result.status})`;
  }
  return null;
}
