// Cálculos del dashboard (mismas fórmulas del prototipo de la Entrega 1).
// p = probabilidad de abandono que calculó el modelo; g = gasto mensual del cliente (USD).
// f = factor del escenario de retención: 1 sin acciones; 0.85 si Marketing reduce el riesgo 15%.

export const prob = (c, f) => c.p * f
export const ingresoQ1 = (c, f) => (1 - prob(c, f)) * c.g * 3          // próximo trimestre
export const ingresoQ2 = (c, f) => ingresoQ1(c, f) * (1 - prob(c, f) / 4) // segundo trimestre
export const clv12 = (c, f) => (1 - prob(c, f)) * c.g * 12               // valor del cliente a 12 meses
export const perdida = (c, f) => prob(c, f) * c.g * 3                    // ingreso en juego por abandono

export const suma = (lista, fn) => lista.reduce((acc, c) => acc + fn(c), 0)

// Indicadores generales para un escenario
export function indicadores(clientes, f, umbral) {
  return {
    A: suma(clientes, (c) => ingresoQ1(c, f)),
    B: suma(clientes, (c) => ingresoQ2(c, f)),
    clvProm: suma(clientes, (c) => clv12(c, f)) / clientes.length,
    enRiesgo: clientes.filter((c) => prob(c, f) >= umbral).length,
    L: suma(clientes, (c) => perdida(c, f)),
  }
}

// Nivel de riesgo con los mismos cortes que _nivel_riesgo() de predict.py
export const nivel = (p, modelo) => (p >= modelo.umbral_alto ? 'hi' : p >= modelo.umbral ? 'md' : 'lo')
export const NIVEL_TXT = { lo: 'Bajo', md: 'Medio', hi: 'Alto' }

// Acciones de retención (vienen de recomendar_retencion() del backend)
export function acciones(c, f, datos, modelo) {
  if (prob(c, f) < modelo.umbral) return [datos.accion_sin_riesgo]
  return c.a.map((i) => datos.acciones[i])
}

// Formatos
export const f0 = (n) => Math.round(n).toLocaleString('en-US')
export const usd = (n) => '$' + f0(n)
export const pct = (p) => Math.round(p * 100) + '%'
export const kfmt = (n) => (n <= 0 ? '0' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.round(n / 1e3) + 'k')
export const signo = (n, fmt) => (Math.round(n) === 0 ? '0' : (n > 0 ? '+' : '−') + fmt(Math.abs(n)))

export function pasoBonito(x) {
  const e = Math.pow(10, Math.floor(Math.log10(x)))
  const r = x / e
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * e
}

// Color de cada segmento (variables CSS --s0 a --s3)
export const colorSeg = (k) => `var(--s${k})`
