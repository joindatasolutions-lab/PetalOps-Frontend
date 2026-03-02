import * as dom from "../../shared/dom.js";
import { formatearCOP, escaparHtml } from "../../shared/utils.js";

export function initCheckoutModule({ store, bus, api, config }) {
  registerCheckoutInputBindings({ store, bus });
  registerWizardBindings({ store, bus });

  bus.on("GO_TO_CHECKOUT", () => {
    console.log("EVENTO RECIBIDO EN CHECKOUT");

    const current = store.getState();
    if (!current.cart.items.length) return;

    store.update("ui.currentView", "checkout");
    store.update("ui.cartModalOpen", false);
    console.log("STATE ACTUAL:", store.getState());
  });

  bus.on("checkout:deliveryCostChanged", payload => {
    const current = store.getState();
    const delivery = {
      ...current.checkout.delivery,
      costoDomicilio: Number(payload.costoDomicilio) || 0
    };

    store.setState({ checkout: { delivery } }, ["checkout"]);
  });

  bus.on("checkout:prepareSummary", () => {
    const current = store.getState();
    const summary = buildSummaryState(current);

    store.setState({
      checkout: {
        summary
      }
    }, ["checkout"]);

    renderSummary(store.getState());
  });

  bus.on("checkout:lookupClient", async payload => {
    try {
      const data = await api.buscarCliente(config.tenant.empresaId, payload.identificacion);
      const cliente = extractCliente(data);

      if (!cliente) {
        setBadgeCliente("Nuevo cliente");
        return;
      }

      const current = store.getState();
      const nextClient = {
        ...current.checkout.client,
        nombreCompleto: construirNombreCliente(cliente),
        telefono: String(cliente.telefono || cliente.telefonoWhatsApp || "").trim(),
        email: String(cliente.email || "").trim()
      };

      store.setState({ checkout: { client: nextClient } }, ["checkout"]);
      setBadgeCliente("Cliente existente");

      applyClientAutofillToDom(nextClient);
      bus.emit("delivery:syncRecipientFromClient");
    } catch (error) {
      console.error("Error buscando cliente por identificación:", error);
    }
  });

  store.subscribe(next => {
    renderWizard(next.checkout.wizard);
    renderSummary(next);
  }, ["checkout", "cart"]);

  renderWizard(store.getState().checkout.wizard);
}

function extractCliente(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data.length ? data[0] : null;
  if (typeof data !== "object") return null;
  if (data.existe === false || data.found === false) return null;

  const detail = String(data.detail || data.mensaje || "").toLowerCase();
  if (detail.includes("no encontrado") || detail.includes("no existe")) return null;

  if (data.cliente && typeof data.cliente === "object") return data.cliente;
  return data;
}

function construirNombreCliente(cliente) {
  const nombreCompleto = String(cliente.nombreCompleto || "").trim();
  if (nombreCompleto) return nombreCompleto;

  const primerNombre = String(cliente.primerNombre || "").trim();
  const segundoNombre = String(cliente.segundoNombre || "").trim();
  const primerApellido = String(cliente.primerApellido || "").trim();
  const segundoApellido = String(cliente.segundoApellido || "").trim();
  return [primerNombre, segundoNombre, primerApellido, segundoApellido].filter(Boolean).join(" ");
}

function setBadgeCliente(text) {
  dom.setText(dom.getById("badgeCliente"), text);
}

function applyClientAutofillToDom(client) {
  const nombre = dom.getById("nombreCompletoVisible");
  const telefono = dom.getById("telefono");
  const email = dom.getById("email");

  dom.setValue(nombre, client.nombreCompleto);
  dom.setValue(telefono, client.telefono);
  dom.setValue(email, client.email);

  dom.setDatasetFlag(nombre, "autoFilled", "true");
  dom.setDatasetFlag(telefono, "autoFilled", "true");
  dom.setDatasetFlag(email, "autoFilled", "true");
}

function registerCheckoutInputBindings({ store, bus }) {
  const toCamelBindingKey = id => {
    const normalized = String(id || "")
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, "");

    if (!normalized) return "bound";
    return `bound${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
  };

  const mapping = [
    ["identificacion", ["client", "identificacion"]],
    ["nombreCompletoVisible", ["client", "nombreCompleto"]],
    ["telefono", ["client", "telefono"]],
    ["email", ["client", "email"]],
    ["destinatario", ["delivery", "destinatario"]],
    ["telefonoDestino", ["delivery", "telefonoDestino"]],
    ["direccionCompleta", ["delivery", "direccionCompleta"]],
    ["fechaEntrega", ["delivery", "fechaEntrega"]],
    ["rangoHora", ["delivery", "rangoHora"]],
    ["mensaje", ["extras", "mensaje"]],
    ["firma", ["extras", "firma"]],
    ["observacionGeneral", ["extras", "observacionGeneral"]]
  ];

  mapping.forEach(([id, path]) => {
    const input = dom.getById(id);
    dom.on(input, "input", event => {
      updateCheckoutField(store, path, dom.getValue(event.target));
      bus.emit("delivery:syncRecipientFromClient");
    }, toCamelBindingKey(id));
  });

  const identificacion = dom.getById("identificacion");
  dom.on(identificacion, "blur", async event => {
    const value = dom.getValue(event.target);
    if (value.length < 6) return;
    bus.emit("checkout:lookupClient", { identificacion: value });
  }, "boundIdentificacionBlur");
}

function registerWizardBindings({ store, bus }) {
  dom.queryAll("[data-wizard-next]").forEach(button => {
    dom.on(button, "click", () => goToNextStep({ store, bus }), "boundWizardNext");
  });

  dom.queryAll("[data-wizard-prev]").forEach(button => {
    dom.on(button, "click", () => goToPreviousStep(store), "boundWizardPrev");
  });
}

function goToNextStep({ store, bus }) {
  const current = store.getState();
  const currentStep = current.checkout.wizard.currentStep;

  const validation = validateStep(currentStep, current);
  if (!validation.valid) {
    validation.invalidIds.forEach(id => {
      const input = dom.getById(id);
      dom.markInvalid(input);
    });

    alert(validation.message);
    return;
  }

  const nextStep = Math.min(currentStep + 1, current.checkout.wizard.totalSteps);
  store.setState({ checkout: { wizard: { ...current.checkout.wizard, currentStep: nextStep } } }, ["checkout"]);

  if (nextStep === 4) {
    bus.emit("checkout:prepareSummary");
  }
}

function goToPreviousStep(store) {
  const current = store.getState();
  const prevStep = Math.max(1, current.checkout.wizard.currentStep - 1);

  store.setState({
    checkout: {
      wizard: {
        ...current.checkout.wizard,
        currentStep: prevStep
      }
    }
  }, ["checkout"]);
}

function validateStep(step, state) {
  if (step === 1) {
    return validateStepOne(state.checkout.client);
  }

  if (step === 2) {
    return validateStepTwo(state.checkout);
  }

  return { valid: true, invalidIds: [], message: "" };
}

export function validateStepOne(client, markDom = true) {
  const invalidIds = [];

  if (!String(client.identificacion || "").trim() || String(client.identificacion || "").trim().length < 6) {
    invalidIds.push("identificacion");
  }

  if (!String(client.nombreCompleto || "").trim()) {
    invalidIds.push("nombreCompletoVisible");
  }

  if (!String(client.telefono || "").trim() || String(client.telefono || "").trim().length < 7) {
    invalidIds.push("telefono");
  }

  if (markDom) {
    invalidIds.forEach(id => dom.markInvalid(dom.getById(id)));
  }

  return {
    valid: invalidIds.length === 0,
    invalidIds,
    message: invalidIds.length ? "Completa los campos obligatorios del Paso 1." : ""
  };
}

export function validateStepTwo(checkout, markDom = true) {
  const invalidIds = [];
  const { tipoEntrega, destinatario, telefonoDestino, direccionCompleta, barrio } = checkout.delivery;

  if (tipoEntrega === "DOMICILIO") {
    if (!String(destinatario || "").trim()) invalidIds.push("destinatario");
    if (!String(telefonoDestino || "").trim()) invalidIds.push("telefonoDestino");
    if (!String(direccionCompleta || "").trim()) invalidIds.push("direccionCompleta");
    if (!String(barrio || "").trim()) invalidIds.push("barrio");
  }

  if (tipoEntrega === "TIENDA") {
    if (!String(checkout.client.nombreCompleto || "").trim()) invalidIds.push("nombreCompletoVisible");
    if (!String(checkout.client.telefono || "").trim()) invalidIds.push("telefono");
  }

  if (markDom) {
    invalidIds.forEach(id => dom.markInvalid(dom.getById(id)));
  }

  return {
    valid: invalidIds.length === 0,
    invalidIds,
    message: invalidIds.length ? "Completa los campos obligatorios del Paso 2." : ""
  };
}

function updateCheckoutField(store, path, value) {
  const current = store.getState();
  const [group, field] = path;

  store.setState({
    checkout: {
      [group]: {
        ...current.checkout[group],
        [field]: value
      }
    }
  }, ["checkout"]);
}

function buildSummaryState(state) {
  const products = state.cart.items.map(item => ({
    ...item,
    subtotal: (Number(item.precio) || 0) * (Number(item.cantidad) || 0)
  }));

  const subtotal = products.reduce((sum, item) => sum + item.subtotal, 0);
  const domicilio = Number(state.checkout.delivery.costoDomicilio) || 0;
  const iva = 0;
  const total = subtotal + domicilio + iva;

  const missing = [];
  if (!state.checkout.client.identificacion) missing.push("identificación");
  if (!state.checkout.client.nombreCompleto) missing.push("nombre completo");
  if (!state.checkout.client.telefono) missing.push("teléfono");
  if (!products.length) missing.push("productos");

  if (state.checkout.delivery.tipoEntrega === "DOMICILIO") {
    if (!state.checkout.delivery.destinatario) missing.push("destinatario");
    if (!state.checkout.delivery.telefonoDestino) missing.push("teléfono destino");
    if (!state.checkout.delivery.direccionCompleta) missing.push("dirección");
    if (!state.checkout.delivery.barrio) missing.push("barrio");
  }

  return {
    products,
    totals: { subtotal, domicilio, iva, total },
    missing
  };
}

function renderWizard(wizard) {
  const steps = dom.queryAll(".wizard-step");
  steps.forEach(stepNode => {
    const stepNumber = Number(stepNode.dataset.step || 0);
    dom.toggleClass(stepNode, "active", stepNumber === wizard.currentStep);
  });

  const progress = dom.getById("wizardProgressFill");
  const stepText = dom.getById("wizardStepText");
  const stepLabel = dom.getById("wizardStepLabel");

  const width = (wizard.currentStep / wizard.totalSteps) * 100;
  if (progress) progress.style.width = `${width}%`;

  dom.setText(stepText, `Paso ${wizard.currentStep} de ${wizard.totalSteps}`);

  const activeStepNode = dom.query(`.wizard-step[data-step="${wizard.currentStep}"]`);
  dom.setText(stepLabel, activeStepNode?.dataset?.title || "");
}

function renderSummary(state) {
  if (state.checkout.wizard.currentStep !== 4) return;

  const container = dom.getById("confirmSummary");
  const submit = dom.getById("btnSubmit");
  if (!container) return;

  const summary = buildSummaryState(state);
  const warning = summary.missing.length
    ? `<div class="summary-warning" style="border:1px solid #f59e0b;background:#fff7ed;color:#92400e;padding:10px 12px;border-radius:10px;margin-bottom:12px;"><strong>Advertencia:</strong> faltan datos obligatorios: ${summary.missing.join(", ")}.</div>`
    : "";

  const productsHtml = summary.products.length
    ? summary.products.map(item => `
      <li style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #f4f4f4;">
        <span>${escaparHtml(item.nombreProducto)} x${item.cantidad}</span>
        <strong>$${formatearCOP(item.subtotal)}</strong>
      </li>
    `).join("")
    : '<li style="padding:6px 0;">Sin productos en carrito.</li>';

  dom.setHtml(container, `
    ${warning}
    <div class="summary-block" style="margin-bottom:14px;">
      <h4 style="margin-bottom:8px;">Cliente</h4>
      <p><strong>Identificación:</strong> ${escaparHtml(state.checkout.client.identificacion) || "-"}</p>
      <p><strong>Nombre:</strong> ${escaparHtml(state.checkout.client.nombreCompleto) || "-"}</p>
      <p><strong>Teléfono:</strong> ${escaparHtml(state.checkout.client.telefono) || "-"}</p>
      <p><strong>Email:</strong> ${escaparHtml(state.checkout.client.email) || "-"}</p>
    </div>
    <div class="summary-block" style="margin-bottom:14px;">
      <h4 style="margin-bottom:8px;">Entrega</h4>
      <p><strong>Tipo:</strong> ${escaparHtml(state.checkout.delivery.tipoEntrega) || "-"}</p>
      <p><strong>Destinatario:</strong> ${escaparHtml(state.checkout.delivery.destinatario) || "-"}</p>
      <p><strong>Teléfono destino:</strong> ${escaparHtml(state.checkout.delivery.telefonoDestino) || "-"}</p>
      <p><strong>Dirección:</strong> ${escaparHtml(state.checkout.delivery.direccionCompleta) || "-"}</p>
      <p><strong>Barrio:</strong> ${escaparHtml(state.checkout.delivery.barrio) || "-"}</p>
      <p><strong>Fecha:</strong> ${escaparHtml(state.checkout.delivery.fechaEntrega) || "-"}</p>
      <p><strong>Rango:</strong> ${escaparHtml(state.checkout.delivery.rangoHora) || "-"}</p>
    </div>
    <div class="summary-block" style="margin-bottom:14px;">
      <h4 style="margin-bottom:8px;">Productos</h4>
      <ul style="list-style:none;margin:0;padding:0;">${productsHtml}</ul>
    </div>
    <div class="summary-block">
      <h4 style="margin-bottom:8px;">Totales</h4>
      <p><strong>Subtotal:</strong> $${formatearCOP(summary.totals.subtotal)}</p>
      <p><strong>Domicilio:</strong> $${formatearCOP(summary.totals.domicilio)}</p>
      <p><strong>IVA:</strong> $${formatearCOP(summary.totals.iva)}</p>
      <p><strong>Total:</strong> $${formatearCOP(summary.totals.total)}</p>
    </div>
  `);

  dom.setDisabled(submit, summary.missing.length > 0);
}
