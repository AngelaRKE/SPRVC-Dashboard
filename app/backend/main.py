"""Backend del dashboard SPRVC (FastAPI).

Es el puente entre el dashboard en React y el modelo de IA:

    React  --(HTTP / JSON)-->  este backend  --(Python)-->  predecir() y el modelo .joblib

Rutas:
    GET  /api/modelo     métricas del modelo (AUC, recall, umbral, importancia de variables)
    GET  /api/clientes   los 50,000 clientes reales ya calificados por el modelo
    POST /api/predecir   evalúa un cliente nuevo con predecir() y recomendar_retencion()

Cómo correrlo (desde la raíz del repositorio):
    python -m uvicorn app.backend.main:app --port 8000
Documentación interactiva para probar las rutas:  http://localhost:8000/docs
"""
import json
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))  # para poder importar src.models.predict

from src.models import predict as P  # noqa: E402
from app.backend import clientes as C  # noqa: E402

app = FastAPI(title="SPRVC API", description="Backend del dashboard de retención de clientes")
app.add_middleware(GZipMiddleware, minimum_size=1000)  # comprime la lista de clientes (~1 MB -> ~200 KB)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])

# Se calcula una sola vez al arrancar (tarda unos segundos) y se guarda en memoria
DATOS = C.cargar()
METRICAS = json.loads((RAIZ / "reports" / "real" / "metricas.json").read_text(encoding="utf-8"))


@app.get("/api/modelo")
def modelo():
    """Información y métricas del modelo que está usando el dashboard."""
    ganador = next(e for e in METRICAS["experimentos"] if e["experimento"] in P.CONFIG["modelo_candidato"])
    importancia = sorted(P.CONFIG["importancia_variables"].items(), key=lambda x: -x[1])[:8]
    return {
        "modelo": P.CONFIG["modelo_candidato"],
        "hiperparametros": P.CONFIG["hiperparametros"],
        "auc_test": round(P.CONFIG["auc_test"], 4),
        "recall_test": round(P.CONFIG["recall_test"], 4),
        "precision_test": ganador["precision_test"],
        "f1_test": ganador["f1_test"],
        "umbral": round(P.UMBRAL, 4),                                   # desde aquí el cliente se marca "en riesgo"
        "umbral_alto": round(min(0.85, max(0.50, P.UMBRAL + 0.15)), 4),  # mismo corte que _nivel_riesgo()
        "matriz_confusion": METRICAS["matriz_confusion"],
        "importancia": [{"variable": C.nombre_variable(k), "valor": round(v, 4)} for k, v in importancia],
    }


@app.get("/api/clientes")
def clientes():
    """Clientes reales con su probabilidad, factores y acciones (los índices apuntan a los catálogos)."""
    return DATOS


class Cliente(BaseModel):
    """Datos de un cliente para evaluarlo. Los rangos los vuelve a validar predecir()."""
    antiguedad_meses: float = Field(examples=[30])
    num_compras: float = Field(examples=[60])
    ticket_promedio_usd: float = Field(examples=[400])
    gasto_mensual_usd: float = Field(examples=[800])
    quejas: float = Field(examples=[12])
    devoluciones: float = Field(examples=[16])
    satisfaccion: float = Field(examples=[1.8])
    tasa_apertura_correos: float = Field(examples=[0.45])
    tasa_clics: float = Field(examples=[0.2])
    tasa_conversion: float = Field(examples=[0.1])
    canal: str | None = Field(default=None, examples=["Online"])
    dispositivo: str | None = Field(default=None, examples=["Mobile"])
    lealtad: str | None = Field(default=None, examples=["Bronze"])


@app.post("/api/predecir")
def evaluar(cliente: Cliente):
    """Llama a predecir() y recomendar_retencion() del equipo de datos, sin cambiar su lógica."""
    entrada = cliente.model_dump()
    resultado = P.predecir(entrada)
    if resultado["status"] == "success":
        resultado["acciones"] = P.recomendar_retencion(entrada, resultado)
        resultado["factores_legibles"] = [C.nombre_variable(f) for f in resultado["factores_principales"]]
    return resultado
