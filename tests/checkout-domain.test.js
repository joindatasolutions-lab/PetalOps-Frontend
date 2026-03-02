const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('domain/checkout validation rules', () => {
  it('validateStepOne debe invalidar identificación corta, nombre vacío y teléfono corto', async () => {
    const { validateStepOne } = await import('../app/domain/checkout/index.js');

    const result = validateStepOne({
      identificacion: '123',
      nombreCompleto: '',
      telefono: '1234'
    }, false);

    assert.strictEqual(result.valid, false);
    assert.ok(result.invalidIds.includes('identificacion'));
    assert.ok(result.invalidIds.includes('nombreCompletoVisible'));
    assert.ok(result.invalidIds.includes('telefono'));
  });

  it('validateStepOne debe validar datos correctos', async () => {
    const { validateStepOne } = await import('../app/domain/checkout/index.js');

    const result = validateStepOne({
      identificacion: '123456',
      nombreCompleto: 'Juan Perez',
      telefono: '3001234567'
    }, false);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.invalidIds.length, 0);
  });

  it('validateStepTwo en DOMICILIO exige destinatario, teléfono destino, dirección y barrio', async () => {
    const { validateStepTwo } = await import('../app/domain/checkout/index.js');

    const result = validateStepTwo({
      client: { nombreCompleto: '', telefono: '' },
      delivery: {
        tipoEntrega: 'DOMICILIO',
        destinatario: '',
        telefonoDestino: '',
        direccionCompleta: '',
        barrio: ''
      }
    }, false);

    assert.strictEqual(result.valid, false);
    assert.ok(result.invalidIds.includes('destinatario'));
    assert.ok(result.invalidIds.includes('telefonoDestino'));
    assert.ok(result.invalidIds.includes('direccionCompleta'));
    assert.ok(result.invalidIds.includes('barrio'));
  });

  it('validateStepTwo en TIENDA exige datos del cliente', async () => {
    const { validateStepTwo } = await import('../app/domain/checkout/index.js');

    const result = validateStepTwo({
      client: { nombreCompleto: '', telefono: '' },
      delivery: { tipoEntrega: 'TIENDA' }
    }, false);

    assert.strictEqual(result.valid, false);
    assert.ok(result.invalidIds.includes('nombreCompletoVisible'));
    assert.ok(result.invalidIds.includes('telefono'));
  });
});
