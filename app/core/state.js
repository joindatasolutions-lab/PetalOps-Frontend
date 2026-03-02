export const initialState = {
  catalog: {
    items: [],
    filteredItems: [],
    categories: [],
    filters: {
      query: "",
      category: ""
    },
    loading: false,
    error: null
  },
  cart: {
    items: [],
    totals: {
      quantity: 0,
      subtotal: 0,
      iva: 0,
      domicilio: 0,
      total: 0
    }
  },
  checkout: {
    client: {
      identificacion: "",
      nombreCompleto: "",
      telefono: "",
      email: ""
    },
    delivery: {
      tipoEntrega: "DOMICILIO",
      destinatario: "",
      telefonoDestino: "",
      direccionCompleta: "",
      barrio: "",
      barrioId: null,
      costoDomicilio: 0,
      fechaEntrega: "",
      rangoHora: ""
    },
    extras: {
      mensaje: "",
      firma: "",
      observacionGeneral: ""
    },
    wizard: {
      currentStep: 1,
      totalSteps: 4
    },
    summary: {
      missing: []
    }
  },
  ui: {
    currentView: "viewCatalog",
    cartModalOpen: false,
    barrioAutocomplete: {
      query: "",
      items: [],
      visible: false,
      selectedId: null,
      selectedLabel: "",
      usePortal: false,
      position: {
        top: 0,
        left: 0,
        width: 0
      }
    }
  }
};
