const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('core/store', () => {
  it('setState debe mezclar estado y notificar suscriptores por keys', async () => {
    const { createStore } = await import('../app/core/store.js');

    const store = createStore({
      cart: { count: 0 },
      checkout: { step: 1 }
    });

    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    }, ['cart']);

    store.setState({ cart: { count: 1 } }, ['cart']);
    assert.strictEqual(store.getState().cart.count, 1);
    assert.strictEqual(notifications, 1);

    store.setState({ checkout: { step: 2 } }, ['checkout']);
    assert.strictEqual(notifications, 1);
  });
});

describe('core/eventBus', () => {
  it('debe emitir y escuchar eventos desacoplados', async () => {
    const { default: bus } = await import('../app/core/eventBus.js');

    let payloadSaved = null;
    bus.on('test:event', payload => {
      payloadSaved = payload;
    });

    bus.emit('test:event', { ok: true });
    assert.deepStrictEqual(payloadSaved, { ok: true });
  });
});

describe('shared/utils', () => {
  it('formatearCOP debe formatear moneda en es-CO', async () => {
    const { formatearCOP } = await import('../app/shared/utils.js');
    assert.strictEqual(formatearCOP(1000), '1.000');
  });

  it('normalizarTexto debe remover acentos y normalizar casing', async () => {
    const { normalizarTexto } = await import('../app/shared/utils.js');
    assert.strictEqual(normalizarTexto('  Colección  '), 'coleccion');
  });
});
