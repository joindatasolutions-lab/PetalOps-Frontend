const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('domain/cart rules', () => {
  it('addOrIncreaseItem debe agregar y luego incrementar cantidad', async () => {
    const { addOrIncreaseItem } = await import('../app/domain/cart/index.js');

    const product = { idProducto: 10, nombreProducto: 'Rosa', precio: 15000 };
    const first = addOrIncreaseItem([], product);
    assert.strictEqual(first.length, 1);
    assert.strictEqual(first[0].cantidad, 1);

    const second = addOrIncreaseItem(first, product);
    assert.strictEqual(second.length, 1);
    assert.strictEqual(second[0].cantidad, 2);
  });

  it('handleItemAction decrease respeta mínimo 1 y remove elimina', async () => {
    const { handleItemAction } = await import('../app/domain/cart/index.js');

    const items = [{ idProducto: 1, nombreProducto: 'A', precio: 1000, cantidad: 1 }];
    const decreased = handleItemAction(items, { action: 'decrease', idProducto: 1 });
    assert.strictEqual(decreased[0].cantidad, 1);

    const removed = handleItemAction(items, { action: 'remove', idProducto: 1 });
    assert.strictEqual(removed.length, 0);
  });

  it('calcularTotales debe calcular subtotal, domicilio y total', async () => {
    const { calcularTotales } = await import('../app/domain/cart/index.js');

    const totals = calcularTotales([
      { idProducto: 1, precio: 10000, cantidad: 2 },
      { idProducto: 2, precio: 5000, cantidad: 1 }
    ], 3000);

    assert.strictEqual(totals.quantity, 3);
    assert.strictEqual(totals.subtotal, 25000);
    assert.strictEqual(totals.domicilio, 3000);
    assert.strictEqual(totals.iva, 0);
    assert.strictEqual(totals.total, 28000);
  });
});
