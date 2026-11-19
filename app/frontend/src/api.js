// Funciones que hablan con el backend de Python (FastAPI).
// Gracias al proxy de vite.config.js, "/api/..." llega a http://localhost:8000/api/...

async function pedir(url, opciones) {
  const resp = await fetch(url, opciones)
  if (!resp.ok) throw new Error(`El backend respondió ${resp.status}`)
  return resp.json()
}

// Métricas del modelo: AUC, recall, umbral, importancia de variables...
export const obtenerModelo = () => pedir('/api/modelo')

// Los 50,000 clientes reales ya calificados por el modelo
export const obtenerClientes = () => pedir('/api/clientes')

// Evalúa un cliente nuevo con predecir() del equipo de datos
export const predecir = (cliente) =>
  pedir('/api/predecir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cliente),
  })
