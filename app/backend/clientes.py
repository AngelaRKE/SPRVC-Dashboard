"""Carga los clientes reales y los califica con el modelo (se ejecuta una sola vez al arrancar el backend).

Pasos:
  1. Lee el CSV real (data/real/ecommerce_real.csv).
  2. Construye las 26 variables con la MISMA función que usa el entrenamiento (construir de preprocess_real.py).
  3. Usa los 50,000 registros reales disponibles.
  4. Calcula la probabilidad de abandono, los factores de riesgo y las acciones de retención de cada cliente.
"""
from pathlib import Path

import numpy as np
import pandas as pd
from src.data.preprocess_real import construir
from src.models import predict as P

RAIZ = Path(__file__).resolve().parents[2]
CSV = RAIZ / "data" / "real" / "ecommerce_real.csv"

# Nombres legibles para el dashboard
SEGMENTOS = {"Consumer": "Consumidor", "Premium": "Premium", "Small Business": "Pequeña empresa", "Enterprise": "Empresa"}
NOMBRES = {
    "antiguedad_meses": "Antigüedad", "num_compras": "Número de compras", "ticket_promedio_usd": "Ticket promedio",
    "gasto_mensual_usd": "Gasto mensual", "quejas": "Quejas", "devoluciones": "Devoluciones",
    "quejas_por_compra": "Quejas por compra", "devoluciones_por_compra": "Devoluciones por compra",
    "satisfaccion": "Satisfacción", "tasa_apertura_correos": "Apertura de correos", "tasa_clics": "Clics en correos",
    "tasa_conversion": "Conversión",
}


def nombre_variable(feature: str) -> str:
    """Convierte el nombre técnico de una variable en uno legible (canal_Online -> Canal: Online)."""
    if feature in NOMBRES:
        return NOMBRES[feature]
    for pref, txt in (("canal_", "Canal"), ("dispositivo_", "Dispositivo"), ("lealtad_", "Lealtad")):
        if feature.startswith(pref):
            valor = feature[len(pref):]
            return f"{txt}: {'sin nivel' if valor == 'None' else valor}"
    return feature


def _factores(x_scaled: np.ndarray, prob: np.ndarray, top: int = 3) -> list[list[int]]:
    """Misma lógica que _factores() de predict.py, pero para muchos clientes a la vez.

    Para cada variable: cuánto baja la probabilidad si esa variable se pone en su promedio.
    Las que más la bajan son las que más empujan al cliente hacia el abandono.
    """
    n_var = x_scaled.shape[1]
    salida = []
    for inicio in range(0, len(x_scaled), 2000):
        x_lote = x_scaled[inicio:inicio + 2000]
        p_lote = prob[inicio:inicio + 2000]
        variantes = np.repeat(x_lote, n_var, axis=0)
        filas = np.arange(len(variantes))
        variantes[filas, filas % n_var] = 0.0
        aporte = p_lote[:, None] - P.MODELO.predict_proba(variantes)[:, 1].reshape(-1, n_var)
        for fila in aporte:
            orden = np.argsort(fila)[::-1][:top]
            salida.append([int(i) for i in orden if fila[i] > 0.005])
    return salida


def cargar() -> dict:
    """Devuelve los clientes calificados y los catálogos que necesita el frontend."""
    if not CSV.exists():
        raise FileNotFoundError(f"No se encontró {CSV}. Coloca ahí el CSV real (no se sube a GitHub).")

    raw = pd.read_csv(CSV).drop_duplicates(subset="customer_id").reset_index(drop=True)
    df = construir(raw)
    datos, crudos = df, raw

    # Los clientes con 1 o 2 meses de antigüedad tienen un "gasto mensual" enorme (todo lo que gastaron / 1 mes).
    # Para los cálculos de dinero del dashboard (ingreso y CLV) se recorta al percentil 95 de toda la base,
    # así unos pocos clientes nuevos no distorsionan las sumas. El modelo sigue recibiendo el valor original.
    tope_gasto = float(df["gasto_mensual_usd"].quantile(0.95))

    x_scaled = P.SCALER.transform(datos[P.FEATURES].astype(float))
    prob = P.MODELO.predict_proba(x_scaled)[:, 1]
    factores = _factores(x_scaled, prob)

    acciones: list[str] = []          # catálogo de acciones; cada cliente guarda solo los índices
    segmentos = list(SEGMENTOS.values())
    clientes = []
    for i, (fila, crudo) in enumerate(zip(datos.to_dict("records"), crudos.to_dict("records"))):
        entrada = {k: fila[k] for k in P.NUMERICAS}
        recs = P.recomendar_retencion(entrada, {"status": "success", "clase_predicha": 1})
        idx = []
        for r in recs:
            if r not in acciones:
                acciones.append(r)
            idx.append(acciones.index(r))
        clientes.append({
            "id": fila["id_cliente"],                                   # id seudonimizado
            "s": segmentos.index(SEGMENTOS[crudo["customer_segment"]]),  # segmento
            "t": crudo["loyalty_tier"] if isinstance(crudo["loyalty_tier"], str) else "Sin nivel",
            "p": round(float(prob[i]), 4),                              # probabilidad de abandono (0-1)
            "g": round(min(float(fila["gasto_mensual_usd"]), tope_gasto), 2),  # gasto mensual para cálculos (USD)
            "f": factores[i],                                           # índices de los factores de riesgo
            "a": idx,                                                   # índices de las acciones de retención
            "real": int(fila["abandono"]),                              # etiqueta real (para comparar)
            "v": {                                                      # variables para el detalle
                "antiguedad_meses": int(fila["antiguedad_meses"]), "num_compras": int(fila["num_compras"]),
                "gasto_mensual_usd": round(float(fila["gasto_mensual_usd"]), 2),
                "ticket_promedio_usd": round(float(fila["ticket_promedio_usd"]), 2),
                "quejas": int(fila["quejas"]), "devoluciones": int(fila["devoluciones"]),
                "satisfaccion": float(fila["satisfaccion"]),
                "tasa_apertura_correos": float(fila["tasa_apertura_correos"]),
                "canal": crudo["shopping_channel"], "dispositivo": crudo["device_used"],
            },
        })

    return {
        "clientes": clientes,
        "segmentos": segmentos,
        "factores": [nombre_variable(f) for f in P.FEATURES],
        "acciones": acciones,
        "tope_gasto": round(tope_gasto, 2),
        "accion_sin_riesgo": P.recomendar_retencion({}, {"status": "success", "clase_predicha": 0})[0],
    }
