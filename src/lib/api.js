
const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

/**
 * Construye la dirección de una imagen.
 *
 * - Cloudinary: utiliza directamente la URL recibida.
 * - Render: conserva compatibilidad con archivos antiguos de uploads.
 */
export function imagenUrl(nombreArchivo) {
  if (
    typeof nombreArchivo !== "string" ||
    !nombreArchivo.trim()
  ) {
    return "";
  }

  const valor = nombreArchivo.trim();

  // Si es una URL completa, por ejemplo Cloudinary.
  if (/^https?:\/\//i.test(valor)) {
    return valor;
  }

  // Si es un nombre antiguo, buscarlo en Render.
  const nombre = valor.split(/[\\/]/).pop();

  if (!nombre) {
    return "";
  }

  return `${API_URL}/uploads/${encodeURIComponent(nombre)}`;
}

/**
 * Realiza solicitudes al backend Node.js.
 */
export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  // Leer la respuesta como texto para controlar respuestas no JSON.
  const texto = await response.text();

  let data = {};

  if (texto) {
    try {
      data = JSON.parse(texto);
    } catch {
      throw new Error(
        `El servidor devolvió una respuesta que no es JSON. Código: ${response.status}`
      );
    }
  }

  if (!response.ok) {
    throw new Error(
      data.mensaje ||
      data.error ||
      `La API respondió con ${response.status}.`
    );
  }

  return data;
}
