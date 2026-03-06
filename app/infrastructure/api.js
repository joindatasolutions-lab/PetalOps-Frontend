export function createApiClient(config) {
  const baseUrl = config.tenant.apiBaseUrl;

  return {
    async getCatalogo(empresaId) {
      const response = await fetch(`${baseUrl}/catalogo/${empresaId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },

    async buscarCliente(empresaId, identificacion) {
      const response = await fetch(`${baseUrl}/cliente/buscar/${empresaId}/${identificacion}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },

    async buscarBarrios(query, empresaId, sucursalId) {
      const url = `${baseUrl}/barrios/search?q=${encodeURIComponent(query)}&empresa_id=${empresaId}&sucursal_id=${sucursalId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },

    async crearPedidoCheckout(payload) {
      const response = await fetch(`${baseUrl}/pedido/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      return response.json();
    },

    async iniciarPagoPedido(pedidoId, payload) {
      const response = await fetch(`${baseUrl}/pedido/${pedidoId}/pago/iniciar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload || {})
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      return response.json();
    },

    async simularPagoPedido(pedidoId, payload) {
      const response = await fetch(`${baseUrl}/pedido/${pedidoId}/pago/simular`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload || { aprobar: true, estadoPago: "APPROVED", moneda: "COP" })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      return response.json();
    },

    async getPagosPedido(pedidoId) {
      const response = await fetch(`${baseUrl}/pedido/${pedidoId}/pagos`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }
      return response.json();
    }
  };
}
