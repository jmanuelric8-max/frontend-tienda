const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

export function imagenUrl(nombreArchivo) {
  if (typeof nombreArchivo !== "string" || !nombreArchivo.trim()) {
    return "";
  }

  const nombre = nombreArchivo.trim().split(/[\\/]/).pop();
  return `${API_URL}/uploads/${encodeURIComponent(nombre)}`;
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.mensaje || data.error || `La API respondió con ${response.status}.`
    );
  }

  return data;
}
