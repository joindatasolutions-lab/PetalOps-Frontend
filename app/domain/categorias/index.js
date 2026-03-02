import { normalizarTexto } from "../../shared/utils.js";

export function construirCategorias(catalogo) {
  return [...new Set(catalogo.map(item => String(item.nombreCategoria || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

export function filtrarCatalogo(catalogo, query, categoria) {
  const queryNorm = normalizarTexto(query);
  const categoriaNorm = normalizarTexto(categoria);

  return catalogo.filter(producto => {
    const nombre = normalizarTexto(producto.nombreProducto);
    const categoriaProducto = normalizarTexto(producto.nombreCategoria);

    const coincideTexto = !queryNorm || nombre.includes(queryNorm);
    const coincideCategoria = !categoriaNorm || categoriaProducto === categoriaNorm;
    return coincideTexto && coincideCategoria;
  });
}
