import * as dom from "../../shared/dom.js";
import { formatearCOP, escaparHtml } from "../../shared/utils.js";

export function initCartModule({ store, bus }) {
  console.log("Cart module loaded");

  const cartItemsDrawer = dom.getById("cartItemsDrawer");
  const vaciarCarritoBtn = dom.getById("vaciarCarrito");
  const btnDrawer = dom.getById("btnDrawer");
  const btnCheckoutSticky = dom.getById("btnCheckoutSticky");
  const btnPedidoDrawer = dom.getById("btnPedidoDrawer");
  const cerrarDrawer = dom.getById("cerrarDrawer");

  console.log("Cart button selector check", {
    btnCheckoutStickyExists: Boolean(btnCheckoutSticky),
    btnPedidoDrawerExists: Boolean(btnPedidoDrawer)
  });

  dom.on(cartItemsDrawer, "click", event => {
    const button = event.target.closest("button[data-action][data-id]");
    if (!button) return;
    bus.emit("cart:itemAction", {
      action: button.dataset.action,
      idProducto: Number(button.dataset.id)
    });
  }, "boundCartActions");

  dom.on(vaciarCarritoBtn, "click", () => bus.emit("cart:clear"), "boundCartClear");
  dom.on(btnDrawer, "click", () => bus.emit("cart:openModal"), "boundCartOpenModal");
  dom.on(btnCheckoutSticky, "click", event => {
    event.stopPropagation();
    console.log("CLICK CONTINUAR");
    bus.emit("GO_TO_CHECKOUT");
    console.log("EVENT EMITIDO");
  }, "boundCartGoCheckout");
  dom.on(btnPedidoDrawer, "click", () => {
    console.log("CLICK CONTINUAR");
    bus.emit("GO_TO_CHECKOUT");
    console.log("EVENT EMITIDO");
  }, "boundCartGoCheckoutDrawer");
  dom.on(cerrarDrawer, "click", () => bus.emit("cart:closeModal"), "boundCartCloseModal");

  bus.on("cart:addItem", payload => {
    const current = store.getState();
    const product = current.catalog.items.find(item => Number(item.idProducto) === Number(payload.idProducto));
    if (!product) return;

    const items = addOrIncreaseItem(current.cart.items, product);
    commitCart(store, items, current.checkout.delivery.costoDomicilio);
  });

  bus.on("cart:itemAction", payload => {
    const current = store.getState();
    const items = handleItemAction(current.cart.items, payload);
    commitCart(store, items, current.checkout.delivery.costoDomicilio);
  });

  bus.on("cart:clear", () => {
    const current = store.getState();
    commitCart(store, [], current.checkout.delivery.costoDomicilio);
  });

  bus.on("cart:openModal", () => {
    store.setState({ ui: { cartModalOpen: true } }, ["ui"]);
  });

  bus.on("cart:closeModal", () => {
    store.setState({ ui: { cartModalOpen: false } }, ["ui"]);
  });

  bus.on("checkout:deliveryCostChanged", payload => {
    const current = store.getState();
    commitCart(store, current.cart.items, Number(payload.costoDomicilio) || 0);
  });

  store.subscribe(nextState => {
    renderCart(nextState);
  }, ["cart", "ui"]);

  renderCart(store.getState());
}

function commitCart(store, items, domicilio) {
  const totals = calcularTotales(items, domicilio);
  store.setState({ cart: { items, totals } }, ["cart"]);
}

export function addOrIncreaseItem(items, product) {
  const idProducto = Number(product.idProducto);
  const next = items.map(item => ({ ...item }));
  const existing = next.find(item => item.idProducto === idProducto);

  if (existing) {
    existing.cantidad += 1;
    return next;
  }

  next.push({
    idProducto,
    nombreProducto: String(product.nombreProducto || "Producto"),
    precio: Number(product.precio) || 0,
    cantidad: 1
  });
  return next;
}

export function handleItemAction(items, payload) {
  const idProducto = Number(payload.idProducto);
  if (!Number.isFinite(idProducto)) return items;

  if (payload.action === "remove") {
    return items.filter(item => item.idProducto !== idProducto);
  }

  return items.map(item => {
    if (item.idProducto !== idProducto) return { ...item };

    if (payload.action === "increase") {
      return { ...item, cantidad: item.cantidad + 1 };
    }

    if (payload.action === "decrease") {
      return { ...item, cantidad: Math.max(1, item.cantidad - 1) };
    }

    return { ...item };
  });
}

export function calcularTotales(items, domicilio) {
  const quantity = items.reduce((sum, item) => sum + item.cantidad, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const iva = 0;
  const total = subtotal + iva + domicilio;

  return { quantity, subtotal, iva, domicilio, total };
}

function renderCart(state) {
  renderSticky(state.cart.totals);
  renderDrawer(state.cart);
  toggleModal(state.ui.cartModalOpen);
}

function renderSticky(totals) {
  const cartCount = dom.getById("cartCount");
  const cartTotal = dom.getById("cartTotal");
  dom.setText(cartCount, `${totals.quantity} ${totals.quantity === 1 ? "producto" : "productos"}`);
  dom.setText(cartTotal, `$${formatearCOP(totals.subtotal)}`);
}

function renderDrawer(cart) {
  const subtotalDrawer = dom.getById("subtotalDrawer");
  const ivaDrawer = dom.getById("ivaDrawer");
  const domicilioDrawer = dom.getById("domicilioDrawer");
  const totalDrawer = dom.getById("totalDrawer");
  const cartItemsDrawer = dom.getById("cartItemsDrawer");

  dom.setText(subtotalDrawer, formatearCOP(cart.totals.subtotal));
  dom.setText(ivaDrawer, formatearCOP(cart.totals.iva));
  dom.setText(domicilioDrawer, formatearCOP(cart.totals.domicilio));
  dom.setText(totalDrawer, formatearCOP(cart.totals.total));

  if (!Array.isArray(cart.items) || cart.items.length === 0) {
    dom.setHtml(cartItemsDrawer, '<li class="cart-item-empty">Carrito vacío</li>');
    return;
  }

  dom.setHtml(cartItemsDrawer, cart.items.map(item => `
    <li class="cart-item" data-id="${item.idProducto}">
      <div class="cart-item-main">
        <strong>${escaparHtml(item.nombreProducto)}</strong>
        <small>$${formatearCOP(item.precio)} c/u</small>
      </div>
      <div class="cart-item-actions">
        <button type="button" class="icon-btn" data-action="decrease" data-id="${item.idProducto}">−</button>
        <span>${item.cantidad}</span>
        <button type="button" class="icon-btn" data-action="increase" data-id="${item.idProducto}">+</button>
        <button type="button" class="icon-btn" data-action="remove" data-id="${item.idProducto}">🗑</button>
      </div>
    </li>
  `).join(""));
}

function toggleModal(open) {
  const modal = dom.getById("cartModal");
  dom.toggleClass(modal, "hidden", !open);
}
