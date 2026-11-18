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
Tarda unos segundos en arrancar porque califica a los 10,000 clientes con el modelo.
En `http://localhost:8000/docs` se pueden probar las rutas a mano.

**Terminal 2: frontend**
```bash
cd app/frontend
npm run dev
```
Abre `http://localhost:5173`.

## Cómo funciona

### Backend (`app/backend/`)
- `clientes.py`: al arrancar lee el CSV, construye las 26 variables con la misma función del entrenamiento
  (`construir()` de `preprocess_real.py`), separa el mismo 20% de prueba (10,000 clientes que el modelo no vio)
  y calcula para cada uno la probabilidad de abandono, sus factores de riesgo y sus acciones de retención.
- `main.py`: expone 3 rutas.

| Ruta | Qué hace |
| --- | --- |
| `GET /api/modelo` | Métricas del modelo: AUC, recall, precisión, umbral, matriz de confusión |
| `GET /api/clientes` | Los 10,000 clientes ya calificados |
| `POST /api/predecir` | Evalúa un cliente nuevo con `predecir()` y `recomendar_retencion()` |

El backend **no cambia la lógica del modelo**: solo llama a las funciones del equipo de datos.

### Frontend (`app/frontend/src/`)
- `api.js`: las 3 llamadas al backend (`fetch`).
- `calculos.js`: fórmulas de ingreso, CLV y escenario (las mismas del prototipo de la Entrega 1).
- `App.jsx`: carga los datos, guarda el estado compartido (vista, escenario, filtros, tema) y dibuja el menú.
- `componentes/`: una vista por archivo.

| Vista | Para quién | Qué muestra |
| --- | --- | --- |
| 1. Tendencias predictivas | Dirección Comercial, Ventas | Ingreso esperado, clientes en riesgo, escenario de retención y desempeño del modelo |
| 2. Segmentos | Marketing | Clientes, ingresos y riesgo por segmento |
| 3. Clientes en riesgo | Marketing, Servicio al Cliente | Lista priorizada con factores y acciones, detalle del cliente y exportación a CSV |
| 4. Evaluar un cliente | Todas | Formulario que manda un cliente nuevo al modelo y muestra el resultado |

## Decisiones a tener en cuenta
- **Clientes mostrados:** solo los del conjunto de prueba, para que las predicciones sean honestas.
- **Riesgo:** un cliente está "en riesgo" desde el umbral del modelo (56%) y en "riesgo alto" desde 71%,
  los mismos cortes de `predecir()`.
- **Gasto mensual:** para ingreso y CLV se recorta al percentil 95, porque los clientes de 1 o 2 meses de
  antigüedad tienen un gasto mensual enorme (todo su gasto dividido entre 1). El modelo recibe el valor original.
- **Segmentos:** se usa la columna `customer_segment` del dataset. Los 4 tienen un riesgo casi igual (24 a 25%),
  así que el riesgo lo explica el comportamiento y no el tipo de cliente. K-Means queda como mejora futura.
- **Prioridad de la lista:** probabilidad × gasto del cliente, es decir, a quién conviene contactar primero
  por lo que se perdería.
