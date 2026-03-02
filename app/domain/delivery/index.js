import * as dom from "../../shared/dom.js";
import { debounce, formatearCOP, escaparHtml } from "../../shared/utils.js";

export function initDeliveryModule({ store, bus, api, config }) {
  const barrioInput = dom.getById("buscarBarrio");
  const barrioSuggestions = dom.getById("barrioSuggestions");
  const tipoEntregaRadios = dom.queryAll('input[name="tipoEntrega"]');
  const nombreClienteInput = dom.getById("nombreCompletoVisible");
  const telefonoClienteInput = dom.getById("telefono");

  const onSearch = debounce(async value => {
    if (!value) {
      bus.emit("delivery:clearBarrioSelection");
      return;
    }

    try {
      const items = await api.buscarBarrios(value, config.tenant.empresaId, config.tenant.sucursalId);
      bus.emit("delivery:barrioResults", { query: value, items });
    } catch (error) {
      console.error("Error buscando barrios:", error);
      bus.emit("delivery:barrioResults", { query: value, items: [] });
    }
  }, 300);

  dom.on(barrioInput, "input", event => {
    const value = dom.getValue(event.target);
    bus.emit("delivery:barrioQueryChanged", { value });
    onSearch(value);
  }, "boundBarrioInput");

  dom.on(barrioInput, "focus", () => {
    bus.emit("delivery:barrioFocus");
  }, "boundBarrioFocus");

  dom.on(barrioSuggestions, "click", event => {
    const option = event.target.closest("button[data-id][data-nombre][data-costo]");
    if (!option) return;

    bus.emit("delivery:barrioSelected", {
      barrioId: Number(option.dataset.id),
      barrio: String(option.dataset.nombre || "").trim(),
      costoDomicilio: Number(option.dataset.costo || 0)
    });
  }, "boundBarrioSelect");

  dom.on(document, "click", event => {
    const target = event?.target;
    if (!target) return;

    const inAutocomplete = target.closest("#buscarBarrio") || target.closest("#barrioSuggestions");
    if (!inAutocomplete) {
      bus.emit("delivery:barrioCloseDropdown");
    }
  }, "boundBarrioOutside");

  dom.on(globalThis, "resize", () => bus.emit("delivery:repositionDropdown"), "boundBarrioResize");
  dom.on(globalThis, "scroll", () => bus.emit("delivery:repositionDropdown"), "boundBarrioScroll");

  tipoEntregaRadios.forEach(radio => {
    dom.on(radio, "change", () => {
      bus.emit("delivery:tipoEntregaChanged", { tipoEntrega: radio.value });
    }, `boundTipoEntrega-${radio.value}`);
  });

  dom.on(nombreClienteInput, "input", () => bus.emit("delivery:syncRecipientFromClient"), "boundClientNameSync");
  dom.on(telefonoClienteInput, "input", () => bus.emit("delivery:syncRecipientFromClient"), "boundClientPhoneSync");

  wireBus({ store, bus });
  store.subscribe(next => renderDelivery(next), ["checkout", "ui"]);
  renderDelivery(store.getState());
}

function wireBus({ store, bus }) {
  bus.on("delivery:tipoEntregaChanged", payload => {
    const current = store.getState();
    const tipoEntrega = payload.tipoEntrega;

    const nextDelivery = {
      ...current.checkout.delivery,
      tipoEntrega
    };

    store.setState({ checkout: { delivery: nextDelivery } }, ["checkout"]);
    bus.emit("delivery:syncRecipientFromClient");
  });

  bus.on("delivery:syncRecipientFromClient", () => {
    const current = store.getState();
    if (current.checkout.delivery.tipoEntrega !== "TIENDA") return;

    store.setState({
      checkout: {
        delivery: {
          ...current.checkout.delivery,
          destinatario: current.checkout.client.nombreCompleto,
          telefonoDestino: current.checkout.client.telefono
        }
      }
    }, ["checkout"]);
  });

  bus.on("delivery:barrioQueryChanged", payload => {
    const current = store.getState();
    const value = String(payload.value || "").trim();

    const uiPatch = {
      ...current.ui.barrioAutocomplete,
      query: value,
      visible: false,
      selectedId: value ? current.ui.barrioAutocomplete.selectedId : null,
      selectedLabel: value ? current.ui.barrioAutocomplete.selectedLabel : "",
      items: value ? current.ui.barrioAutocomplete.items : []
    };

    const deliveryPatch = value
      ? current.checkout.delivery
      : {
          ...current.checkout.delivery,
          barrio: "",
          barrioId: null,
          costoDomicilio: 0
        };

    store.setState({
      ui: { barrioAutocomplete: uiPatch },
      checkout: { delivery: deliveryPatch }
    }, ["ui", "checkout"]);

    if (!value) {
      bus.emit("checkout:deliveryCostChanged", { costoDomicilio: 0 });
    }
  });

  bus.on("delivery:barrioResults", payload => {
    const current = store.getState();

    store.setState({
      ui: {
        barrioAutocomplete: {
          ...current.ui.barrioAutocomplete,
          items: Array.isArray(payload.items) ? payload.items : [],
          visible: true
        }
      }
    }, ["ui"]);
  });

  bus.on("delivery:barrioSelected", payload => {
    const current = store.getState();

    store.setState({
      checkout: {
        delivery: {
          ...current.checkout.delivery,
          barrio: payload.barrio,
          barrioId: Number.isFinite(payload.barrioId) ? payload.barrioId : null,
          costoDomicilio: Number(payload.costoDomicilio) || 0
        }
      },
      ui: {
        barrioAutocomplete: {
          ...current.ui.barrioAutocomplete,
          query: payload.barrio,
          selectedId: payload.barrioId,
          selectedLabel: payload.barrio,
          visible: false,
          items: []
        }
      }
    }, ["checkout", "ui"]);

    bus.emit("checkout:deliveryCostChanged", { costoDomicilio: payload.costoDomicilio });
  });

  bus.on("delivery:clearBarrioSelection", () => {
    const current = store.getState();

    store.setState({
      checkout: {
        delivery: {
          ...current.checkout.delivery,
          barrio: "",
          barrioId: null,
          costoDomicilio: 0
        }
      },
      ui: {
        barrioAutocomplete: {
          ...current.ui.barrioAutocomplete,
          query: "",
          selectedId: null,
          selectedLabel: "",
          visible: false,
          items: []
        }
      }
    }, ["checkout", "ui"]);

    bus.emit("checkout:deliveryCostChanged", { costoDomicilio: 0 });
  });

  bus.on("delivery:barrioCloseDropdown", () => {
    const current = store.getState();
    store.setState({
      ui: {
        barrioAutocomplete: {
          ...current.ui.barrioAutocomplete,
          visible: false
        }
      }
    }, ["ui"]);
  });

  bus.on("delivery:barrioFocus", () => {
    const current = store.getState();
    if (!current.ui.barrioAutocomplete.items.length) return;

    store.setState({
      ui: {
        barrioAutocomplete: {
          ...current.ui.barrioAutocomplete,
          visible: true
        }
      }
    }, ["ui"]);
  });

  bus.on("delivery:repositionDropdown", () => {
    const current = store.getState();
    if (!current.ui.barrioAutocomplete.visible) return;
    renderBarrioDropdownPosition(current);
  });
}

function renderDelivery(state) {
  const delivery = state.checkout.delivery;
  const client = state.checkout.client;
  const auto = state.ui.barrioAutocomplete;

  const destinatario = dom.getById("destinatario");
  const telefonoDestino = dom.getById("telefonoDestino");
  const barrioHidden = dom.getById("barrio");
  const barrioInput = dom.getById("buscarBarrio");
  const barrioSuggestions = dom.getById("barrioSuggestions");
  const barrioCostoInfo = dom.getById("barrioCostoInfo");

  const tienda = delivery.tipoEntrega === "TIENDA";

  dom.setDisabled(destinatario, tienda);
  dom.setDisabled(telefonoDestino, tienda);

  dom.setValue(destinatario, tienda ? client.nombreCompleto : delivery.destinatario);
  dom.setValue(telefonoDestino, tienda ? client.telefono : delivery.telefonoDestino);

  if (tienda) {
    dom.setDatasetFlag(destinatario, "autoFilled", "true");
    dom.setDatasetFlag(telefonoDestino, "autoFilled", "true");
  } else {
    dom.removeDatasetFlag(destinatario, "autoFilled");
    dom.removeDatasetFlag(telefonoDestino, "autoFilled");
  }

  dom.setValue(barrioHidden, delivery.barrio);
  dom.setValue(barrioInput, auto.query || delivery.barrio);
  dom.setText(barrioCostoInfo, `Costo: $${formatearCOP(delivery.costoDomicilio)}`);

  if (!Array.isArray(auto.items) || auto.items.length === 0 || !auto.visible) {
    dom.setHtml(barrioSuggestions, "");
    barrioSuggestions.style.display = "none";
    barrioSuggestions.classList.remove("is-open");
    return;
  }

  dom.setHtml(barrioSuggestions, auto.items.map(item => {
    const id = Number(item.idBarrio ?? item.id ?? 0);
    const nombre = escaparHtml(item.nombreBarrio ?? item.nombre ?? "");
    const costo = Number(item.costoDomicilio ?? item.costo ?? 0);
    return `<button type="button" class="autocomplete-item" data-id="${id}" data-nombre="${nombre}" data-costo="${costo}">${nombre}</button>`;
  }).join(""));

  barrioSuggestions.style.display = "block";
  barrioSuggestions.classList.remove("is-open");
  globalThis.requestAnimationFrame(() => barrioSuggestions.classList.add("is-open"));

  renderBarrioDropdownPosition(state);
}

function renderBarrioDropdownPosition(state) {
  const input = dom.getById("buscarBarrio");
  const list = dom.getById("barrioSuggestions");
  if (!input || list?.style?.display !== "block") return;

  const wrapper = input.closest(".autocomplete-wrapper");
  if (!wrapper) return;

  const usePortal = hasOverflowHiddenAncestor(wrapper);

  if (usePortal) {
    if (list.parentElement !== document.body) {
      document.body.appendChild(list);
    }

    list.classList.add("autocomplete-list--portal");
    const rect = input.getBoundingClientRect();
    list.style.left = `${globalThis.scrollX + rect.left}px`;
    list.style.top = `${globalThis.scrollY + rect.bottom}px`;
    list.style.width = `${rect.width}px`;
  } else {
    if (list.parentElement !== wrapper) {
      wrapper.appendChild(list);
    }

    list.classList.remove("autocomplete-list--portal");
    list.style.left = "0";
    list.style.top = "100%";
    list.style.width = "100%";
  }

  state.ui.barrioAutocomplete.usePortal = usePortal;
}

function hasOverflowHiddenAncestor(element) {
  let current = element?.parentElement;
  while (current && current !== document.body) {
    const styles = globalThis.getComputedStyle(current);
    if ([styles.overflow, styles.overflowX, styles.overflowY].some(v => String(v).toLowerCase() === "hidden")) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}
