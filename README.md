# SPRVC · Motor de IA (Entrega 3)

Predicción de riesgo de abandono (churn) y recomendaciones de retención con el dataset de e-commerce (50,000 clientes, 26 variables de comportamiento sin fuga de recencia).

## Corrección de objetivo y resultados (Meta O3)
- **Hallazgo de fuga / falta de señal previa:** `activity_status` (`Inactive`) es una regla determinista sobre `days_since_last_purchase` (`>= 90` días) sin correlación con satisfacción, quejas ni devoluciones (sin esa variable, el AUC caía a ≈ 0.51).
- **Objetivo corregido (`churn_risk_category`):** Se define `abandono = 1` para clientes en riesgo `Medium`, `High` o `Very High` (~24.4%), capturando señal multifactorial real (`satisfaccion`, `devoluciones`, `quejas`, `num_compras`) sin fuga de información. Ver `reports/real/entrenamiento/control_fuga.txt` (`AUC = 0.8421` en regresión logística sin recencia).
- **Modelo ganador (`Exp 4 · Random Forest` optimizado):** `AUC-ROC test = 0.8749` (CV `0.8727`), `PR-AUC = 0.7374`, `Recall = 63.1%` con umbral operativo `0.560`, `Precision = 69.3%`, `F1 = 0.6605`. Cumple la meta O3 (`AUC-ROC >= 0.75` y `Recall >= 60%`).

## Reproducir desde cero (Python >= 3.10)
```bash
pip install -r requirements.txt
python src/data/preprocess_real.py --raw data/real/ecommerce_real.csv --out data/processed/dataset_real_limpio.csv --models models/real/
python src/models/control_fuga.py --data data/processed/dataset_real_limpio.csv --models models/real/
python src/models/train.py --data data/processed/dataset_real_limpio.csv --output models/real/ --reports reports/real/ --rf-iter 5
python src/models/predict.py                                             # demo de inferencia y retención
python -m unittest tests/test_predict.py -v                              # pruebas unitarias
```
Comando de una línea para el entrenamiento: `python src/models/train.py --data data/processed/dataset_real_limpio.csv --output models/real/ --reports reports/real/ --rf-iter 5`

## Estructura
- `src/data/preprocess_real.py` limpieza, seudonimización, objetivo `churn_risk_category`, 26 variables, partición 80/20 estratificada, escalado (solo train)
- `src/models/train.py` 4 experimentos (regresión logística y Random Forest, por defecto y ajustados)
- `src/models/control_fuga.py` verifica la señal de comportamiento sin `days_since_last_purchase` vs referencia con recencia
- `src/models/predict.py` funciones `predecir(dict) -> dict` y `recomendar_retencion(dict, resultado=None) -> list[str]` para el dashboard de la Entrega 4
- `models/real/` modelos y escalador serializados · `reports/real/metricas.json` métricas que consume el dashboard · `reports/real/entrenamiento/` logs, tabla de experimentos, análisis y gráficas que no consume el dashboard
## Datos
El CSV real no se sube al repositorio (datos de clientes). Colócalo en `data/real/ecommerce_real.csv`.
