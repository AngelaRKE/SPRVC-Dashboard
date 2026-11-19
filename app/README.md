# Dashboard SPRVC (Entrega 4, responsable: Emir)

Dashboard en React conectado al modelo real mediante un backend en Python (FastAPI).

```
Navegador (React, puerto 5173)  --/api-->  Backend FastAPI (puerto 8000)  -->  predecir() + modelo .joblib
```

## Cómo correrlo

Se necesitan **dos terminales** abiertas en la raíz del repositorio (`SPRVC-Model`).

**0. Una sola vez: preparar**
- Coloca el CSV real en `data/real/ecommerce_real.csv` (no se sube a GitHub).
- Instala lo de Python: `pip install -r requirements.txt -r app/backend/requirements.txt`
- Instala lo de React (necesita Node.js 18 o más nuevo): `cd app/frontend` y luego `npm install`

**Terminal 1: backend**
```bash
python -m uvicorn app.backend.main:app --port 8000
```
Tarda varios segundos en arrancar porque califica a los 50,000 clientes reales con el modelo.
En `http://localhost:8000/docs` se pueden probar las rutas a mano.

**Terminal 2: frontend**
```bash
cd app/frontend
npm run dev
```
Abre `http://localhost:5173`.

## Cómo funciona

### Backend (`app/backend/`)
- `clientes.py`: al arrancar lee los 50,000 registros del CSV, construye las 26 variables con la misma función del entrenamiento
  (`construir()` de `preprocess_real.py`) y calcula para cada cliente la probabilidad de abandono,
  sus factores de riesgo y sus acciones de retención. El conjunto de 20% de prueba se reserva para las métricas del modelo.
- `main.py`: expone 3 rutas.

| Ruta | Qué hace |
| --- | --- |
| `GET /api/modelo` | Métricas del modelo: AUC, recall, precisión, umbral, matriz de confusión |
| `GET /api/clientes` | Los 50,000 clientes reales ya calificados |
| `POST /api/predecir` | Evalúa un cliente nuevo con `predecir()` y `recomendar_retencion()` |

El backend **no cambia la lógica del modelo**: solo llama a las funciones del equipo de datos.

### Frontend (`app/frontend/src/`)
- `api.js`: las 3 llamadas al backend (`fetch`).
- `calculos.js`: fórmulas de ingreso, CLV y escenario (las mismas del prototipo de la Entrega 1).
- `App.jsx`: carga los datos, guarda el estado compartido (vista, escenario, filtros, tema) y dibuja el menú.
- `componentes/`: una vista por archivo, más el detalle del cliente (`DetalleCliente.jsx`) y el panel
  "Acerca de" (`AcercaDe.jsx`).

| Vista | Para quién | Qué muestra |
| --- | --- | --- |
| 1. Tendencias predictivas | Dirección Comercial, Ventas | Ingreso esperado, clientes en riesgo y escenario de retención |
| 2. Segmentos | Marketing | Clientes, ingresos y riesgo por segmento |
| 3. Clientes en riesgo | Marketing, Servicio al Cliente | Lista priorizada por ingreso en juego, con factores y acciones, detalle del cliente y exportación a CSV |
| 4. Evaluar un cliente | Todas | Formulario agrupado (perfil, compras, servicio y correos) que manda un cliente nuevo al modelo y muestra el resultado |

**Panel "Acerca de"** (botón en la barra superior): información de referencia que no hace falta en el uso
diario. Incluye los datos usados, el desempeño del modelo (AUC, recall, precisión, F1 y matriz de confusión),
cómo se calculan los valores y los créditos del equipo.

## Decisiones a tener en cuenta
- **Clientes mostrados:** todos los registros reales disponibles. Las métricas se siguen reportando sobre el conjunto de prueba del 20%.
- **Riesgo:** un cliente está "en riesgo" desde el umbral del modelo (56%) y en "riesgo alto" desde 71%,
  los mismos cortes de `predecir()`.
- **Gasto mensual:** para ingreso y CLV se recorta al percentil 95, porque los clientes de 1 o 2 meses de
  antigüedad tienen un gasto mensual enorme (todo su gasto dividido entre 1). El modelo recibe el valor original.
- **Segmentos:** se usa la columna `customer_segment` del dataset. Los 4 tienen un riesgo casi igual (24 a 25%),
  así que el riesgo lo explica el comportamiento y no el tipo de cliente. K-Means queda como mejora futura.
- **Prioridad de la lista:** se ordena por **ingreso en juego** (probabilidad × gasto mensual × 3), que es lo
  que se perdería el próximo trimestre si el cliente se va. Esa columna se ve en la tabla, así que el orden
  se puede comprobar.
- **Tasas de correo en porcentaje:** en "Evaluar un cliente" la apertura, los clics y la conversión se
  escriben de 0 a 100. El frontend las divide entre 100 antes de mandarlas, porque el modelo las espera de 0 a 1.
  El navegador valida los rangos (satisfacción de 1 a 5, porcentajes de 0 a 100, sin negativos).
- **Montos:** las cifras grandes se muestran en formato corto ($34.0M); al pasar el mouse se ve el monto exacto.
