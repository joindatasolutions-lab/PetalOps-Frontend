import * as dom from "../../shared/dom.js";
import { formatearCOP, escaparHtml } from "../../shared/utils.js";
import { construirCategorias, filtrarCatalogo } from "../categorias/index.js";

export async function initCatalogModule({ store, bus, api, config }) {
  const searchInput = dom.getById("searchInput");
  const categorySelect = dom.getById("filtroCategorias");
  const catalogContainer = dom.getById("catalogo");

  dom.on(searchInput, "input", event => {
    bus.emit("catalog:filtersChanged", { query: dom.getValue(event.target) });
  }, "boundCatalogSearch");

  dom.on(categorySelect, "change", event => {
    bus.emit("catalog:filtersChanged", { category: dom.getValue(event.target) });
  }, "boundCatalogCategory");

  dom.on(catalogContainer, "click", event => {
    const button = event.target.closest(".btn-add");
    if (!button) return;

    const idProducto = Number(button.dataset.id);
    if (!Number.isFinite(idProducto)) return;

    bus.emit("cart:addItem", { idProducto });
  }, "boundCatalogAddToCart");

  bus.on("catalog:filtersChanged", payload => {
    const current = store.getState();
    const nextFilters = {
      query: payload.query ?? current.catalog.filters.query,
      category: payload.category ?? current.catalog.filters.category
    };

    const filteredItems = filtrarCatalogo(current.catalog.items, nextFilters.query, nextFilters.category);
    store.setState({
      catalog: {
        filters: nextFilters,
        filteredItems
      }
    }, ["catalog"]);
  });

  store.subscribe(nextState => {
    renderCatalog(nextState.catalog.filteredItems);
    renderCategorias(nextState.catalog.categories);
  }, ["catalog"]);

  await cargarCatalogoInicial({ store, api, config });
}

async function cargarCatalogoInicial({ store, api, config }) {
  store.setState({ catalog: { loading: true, error: null } }, ["catalog"]);

  try {
    const items = await api.getCatalogo(config.tenant.empresaId);
    const categories = construirCategorias(items);
    const filteredItems = filtrarCatalogo(items, "", "");

    store.setState({
      catalog: {
        items,
        filteredItems,
        categories,
        filters: { query: "", category: "" },
        loading: false,
        error: null
      }
    }, ["catalog"]);
  } catch (error) {
    console.error("Error cargando catálogo:", error);
    store.setState({
      catalog: {
        items: [],
        filteredItems: [],
        categories: [],
        loading: false,
        error: "No se pudo cargar el catálogo"
      }
    }, ["catalog"]);
    renderErrorCatalogo();
  }
}

function renderCatalog(data) {
  const contenedor = dom.getById("catalogo");
  if (!contenedor) return;

  if (!Array.isArray(data) || data.length === 0) {
    dom.setHtml(contenedor, '<p style="text-align:center; color:#888; padding:40px 20px;">No hay productos disponibles.</p>');
    return;
  }

  const html = `
    <div class="catalogo-grid">
      ${data.map(producto => renderCard(producto)).join("")}
    </div>
  `;

  dom.setHtml(contenedor, html);
  registrarFallbackImagenes(contenedor);
}

function renderCard(producto) {
  const nombreProducto = escaparHtml(producto.nombreProducto || "Producto");
  const imagenUrl = escaparHtml(producto.imagenUrl || "");
  const precio = formatearCOP(producto.precio);

  return `
    <div class="card">
      <img src="${imagenUrl}" alt="${nombreProducto}" loading="lazy" referrerpolicy="no-referrer">
      <div class="body">
        <div class="name">${nombreProducto}</div>
        <div class="price">$${precio}</div>
        <button class="btn-add" type="button" data-id="${Number(producto.idProducto)}">Agregar al carrito</button>
      </div>
    </div>
  `;
}

function renderCategorias(categorias) {
  const select = dom.getById("filtroCategorias");
  if (!select) return;

  const options = ['<option value="">Todas las categorías</option>']
    .concat(categorias.map(c => `<option value="${escaparHtml(c)}">${escaparHtml(c)}</option>`));

  dom.setHtml(select, options.join(""));
}

function renderErrorCatalogo() {
  const contenedor = dom.getById("catalogo");
  if (!contenedor) return;
  dom.setHtml(contenedor, '<p style="text-align:center; color:#888; padding:40px 20px;">No se pudo cargar el catálogo.</p>');
}

function registrarFallbackImagenes(container) {
  const imagenes = container.querySelectorAll("img");
  imagenes.forEach(img => {
    img.addEventListener("error", () => {
      const actual = img.getAttribute("src") || "";
      if (actual.includes("+")) {
        img.src = actual.replaceAll("+", "%20");
        return;
      }

      if (!img.dataset.fallbackApplied) {
        img.dataset.fallbackApplied = "1";
        img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='900'%3E%3Crect width='100%25' height='100%25' fill='%23f8ecef'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23c97b94' font-family='Arial' font-size='34'%3EImagen no disponible%3C/text%3E%3C/svg%3E";
      }
    });
  });
}
