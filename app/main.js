import { appConfig, applyThemeVariables, isFeatureEnabled } from "./core/config.js";
import { initialState } from "./core/state.js";
import { createStore } from "./core/store.js";
import eventBus from "./core/eventBus.js";
import { createApiClient } from "./infrastructure/api.js";
import { registerServiceWorker } from "./infrastructure/sw.js";
import { initCatalogModule } from "./domain/catalog/index.js";
import { initCartModule } from "./domain/cart/index.js";
import { initDeliveryModule } from "./domain/delivery/index.js";
import { initCheckoutModule } from "./domain/checkout/index.js";
import * as dom from "./shared/dom.js";

export async function bootstrapApp() {
  applyThemeVariables();

  const store = createStore(initialState);
  const bus = eventBus;
  const api = createApiClient(appConfig);

  if (isFeatureEnabled("catalog")) {
    await initCatalogModule({ store, bus, api, config: appConfig });
  }

  if (isFeatureEnabled("cart")) {
    initCartModule({ store, bus, config: appConfig });
  }

  if (isFeatureEnabled("deliveryAutocomplete")) {
    initDeliveryModule({ store, bus, api, config: appConfig });
  }

  if (isFeatureEnabled("checkout")) {
    initCheckoutModule({ store, bus, api, config: appConfig });
  }

  store.subscribe(nextState => {
    console.log("RENDER TRIGGERED", nextState?.ui?.currentView);
    renderApp(nextState);
  }, ["ui"]);

  renderApp(store.getState());

  registerServiceWorker();
}

export function renderApp(state) {
  const views = dom.queryAll(".view");
  views.forEach(view => {
    dom.toggleClass(view, "active", false);
  });

  const currentView = state?.ui?.currentView || "viewCatalog";
  const fallbackMap = {
    catalog: "viewCatalog",
    checkout: "viewForm"
  };
  const targetId = fallbackMap[currentView] || currentView;
  const targetView = dom.getById(targetId);
  dom.toggleClass(targetView, "active", true);
}

document.addEventListener("DOMContentLoaded", () => {
  bootstrapApp().catch(error => {
    console.error("Error iniciando la app:", error);
  });
});
