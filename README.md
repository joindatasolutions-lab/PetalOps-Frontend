# PetalOps Frontend

Frontend web para gestión de catálogo, carrito y checkout de domicilios.

## Requisitos

- Node.js 18+
- Python 3 (opcional, para servidor estático)
- Backend disponible (por defecto en `http://127.0.0.1:8001`)

## Configuración del backend

La URL base del backend se define en:

- `app/core/config.js` → `tenant.apiBaseUrl`

Valor actual por defecto:

```js
apiBaseUrl: "http://127.0.0.1:8001"
```

## Ejecutar frontend local

Desde la raíz del proyecto:

```powershell
python -m http.server 5500
```

Abrir en navegador:

- `http://localhost:5500/`

## Pruebas

> Nota: los scripts npm están en `json/package.json`.

### Unitarias / estructura

```powershell
npm --prefix json run test
```

### Integración (contra backend real)

```powershell
npm --prefix json run test:integration
```

También puedes parametrizar:

```powershell
$env:API_BASE_URL="http://127.0.0.1:8001"
$env:EMPRESA_ID="1"
$env:SUCURSAL_ID="1"
$env:IDENTIFICACION_TEST="123456"
$env:BARRIO_QUERY_TEST="centro"
npm --prefix json run test:integration
```

## Scripts disponibles

En `json/package.json`:

- `test`: corre `tests/*.test.js`
- `test:unit`: alias de unitarias
- `test:integration`: corre `tests/*.integration.test.js`
- `coverage`: cobertura con `c8`
- `coverage:check`: valida umbrales de cobertura

## Estructura principal

- `index.html`: entrada principal
- `app/`: arquitectura modular (core, domain, infrastructure, shared)
- `styles/`: estilos modulares
- `tests/`: pruebas unitarias e integración
- `json/package.json`: scripts y dependencias de pruebas

## Repositorio remoto

Remoto principal configurado:

- `origin`: `https://github.com/joindatasolutions-lab/PetalOps-Frontend.git`
