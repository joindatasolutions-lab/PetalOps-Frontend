export function formatearCOP(valor) {
  return Number(valor || 0).toLocaleString("es-CO");
}

export function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function debounce(handler, delay = 300) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => handler(...args), delay);
  };
}

export function escaparHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
