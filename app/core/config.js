export const appConfig = {
  tenant: {
    empresaId: 1,
    sucursalId: 1,
    apiBaseUrl: "http://127.0.0.1:8001"
  },
  featureFlags: {
    catalog: true,
    cart: true,
    checkout: true,
    deliveryAutocomplete: true,
    onlinePayment: true,
    adminDashboard: false,
    roleBasedAccess: false,
    multiSucursal: true
  },
  payments: {
    moneda: "COP"
  },
  theme: {
    name: "default",
    variables: {
      "--brand-primary": "#e6a5b6",
      "--brand-primary-strong": "#c97b94",
      "--surface": "#ffffff",
      "--text-primary": "#333333"
    }
  }
};

export function isFeatureEnabled(featureName) {
  return Boolean(appConfig.featureFlags[featureName]);
}

export function applyThemeVariables() {
  const root = document.documentElement;
  Object.entries(appConfig.theme.variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
