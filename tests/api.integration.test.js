const { describe, it } = require('node:test');
const assert = require('node:assert');

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:8001';
const EMPRESA_ID = Number(process.env.EMPRESA_ID || 1);
const SUCURSAL_ID = Number(process.env.SUCURSAL_ID || 1);
const IDENTIFICACION = process.env.IDENTIFICACION_TEST || '123456';
const BARRIO_QUERY = process.env.BARRIO_QUERY_TEST || 'centro';

async function withTimeout(task, timeoutMs = 8000) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout de ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([task(), timeoutPromise]);
}

describe('API integration (backend real)', () => {
  it('getCatalogo responde un array', async () => {
    const { createApiClient } = await import('../app/infrastructure/api.js');
    const client = createApiClient({ tenant: { apiBaseUrl: API_BASE_URL } });

    const catalogo = await withTimeout(() => client.getCatalogo(EMPRESA_ID));
    assert.ok(Array.isArray(catalogo), 'El catálogo debe ser un array');
  });

  it('buscarCliente responde objeto o null sin error de red', async () => {
    const { createApiClient } = await import('../app/infrastructure/api.js');
    const client = createApiClient({ tenant: { apiBaseUrl: API_BASE_URL } });

    const cliente = await withTimeout(() => client.buscarCliente(EMPRESA_ID, IDENTIFICACION));
    const isObject = cliente !== null && typeof cliente === 'object';
    assert.ok(isObject || cliente === null, 'La respuesta de cliente debe ser objeto o null');
  });

  it('buscarBarrios responde un array', async () => {
    const { createApiClient } = await import('../app/infrastructure/api.js');
    const client = createApiClient({ tenant: { apiBaseUrl: API_BASE_URL } });

    const barrios = await withTimeout(() => client.buscarBarrios(BARRIO_QUERY, EMPRESA_ID, SUCURSAL_ID));
    assert.ok(Array.isArray(barrios), 'La búsqueda de barrios debe devolver un array');
  });
});
