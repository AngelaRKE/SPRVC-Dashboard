// Vista 4: formulario para evaluar un cliente nuevo. Manda los datos al backend (POST /api/predecir),
// que llama a predecir() del equipo de datos, y muestra la respuesta del modelo.
import { useState } from 'react'
import { predecir } from '../api'
import { Icono } from './Iconos'

const CAMPOS = [
  ['antiguedad_meses', 'Antigüedad', 'meses', 1],
  ['num_compras', 'Número de compras', 'total', 1],
  ['ticket_promedio_usd', 'Ticket promedio', 'USD', 0.01],
  ['gasto_mensual_usd', 'Gasto mensual', 'USD', 0.01],
  ['quejas', 'Quejas', 'total', 1],
  ['devoluciones', 'Devoluciones', 'total', 1],
  ['satisfaccion', 'Satisfacción', '1 a 5', 0.1],
  ['tasa_apertura_correos', 'Apertura de correos', '0 a 1', 0.01],
  ['tasa_clics', 'Clics en correos', '0 a 1', 0.01],
  ['tasa_conversion', 'Conversión', '0 a 1', 0.01],
]

const EJEMPLOS = {
  riesgo: { antiguedad_meses: 30, num_compras: 60, ticket_promedio_usd: 400, gasto_mensual_usd: 800, quejas: 12, devoluciones: 16, satisfaccion: 1.8, tasa_apertura_correos: 0.45, tasa_clics: 0.2, tasa_conversion: 0.1, canal: 'Online', dispositivo: 'Mobile', lealtad: 'Bronze' },
  fiel: { antiguedad_meses: 72, num_compras: 140, ticket_promedio_usd: 520, gasto_mensual_usd: 1100, quejas: 2, devoluciones: 3, satisfaccion: 4.6, tasa_apertura_correos: 0.6, tasa_clics: 0.3, tasa_conversion: 0.2, canal: 'In-Store', dispositivo: 'Desktop', lealtad: 'Diamond' },
}

const NIVEL_CLASE = { Bajo: 'lo', Medio: 'md', Alto: 'hi' }

export default function VistaEvaluar() {
  const [form, setForm] = useState(EJEMPLOS.riesgo)
  const [res, setRes] = useState(null)
  const [cargando, setCargando] = useState(false)

  const poner = (k, v) => setForm({ ...form, [k]: v })

  async function enviar(e) {
    e.preventDefault()
    setCargando(true)
    try {
      // Los números del formulario llegan como texto: se convierten antes de enviarlos
      const cliente = { ...form }
      CAMPOS.forEach(([k]) => { cliente[k] = cliente[k] === '' ? null : Number(cliente[k]) })
      if (!cliente.lealtad) cliente.lealtad = null
      setRes(await predecir(cliente))
    } catch {
      setRes({ status: 'error', mensaje: 'No se pudo conectar con el backend.' })
    }
    setCargando(false)
  }

  return (
    <section className="g ev">
      <form className="c" onSubmit={enviar}>
        <h2>Datos del cliente</h2>
        <div className="frm" style={{ marginTop: 16 }}>
          {CAMPOS.map(([k, label, unidad, paso]) => (
            <label key={k}>
              <span>{label} <small>({unidad})</small></span>
              <input type="number" step={paso} value={form[k]} onChange={(e) => poner(k, e.target.value)} required />
            </label>
          ))}
          <label>
            Canal
            <select value={form.canal} onChange={(e) => poner('canal', e.target.value)}>
              {['Online', 'In-Store', 'Mobile App', 'Marketplace'].map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label>
            Dispositivo
            <select value={form.dispositivo} onChange={(e) => poner('dispositivo', e.target.value)}>
              {['Desktop', 'Mobile', 'Tablet', 'Multiple'].map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="full">
            Nivel de lealtad
            <select value={form.lealtad || ''} onChange={(e) => poner('lealtad', e.target.value)}>
              <option value="">Sin nivel</option>
              {['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
        </div>
        <div className="frm-a">
          <button className="btn" type="submit" disabled={cargando}><Icono id="i-play" />{cargando ? 'Evaluando…' : 'Evaluar cliente'}</button>
          <button className="ib" type="button" onClick={() => { setForm(EJEMPLOS.riesgo); setRes(null) }}>Ejemplo en riesgo</button>
          <button className="ib" type="button" onClick={() => { setForm(EJEMPLOS.fiel); setRes(null) }}>Ejemplo fiel</button>
        </div>
      </form>

      <div className="c resu" aria-live="polite">
        <h2>Resultado del modelo</h2>
        {!res && <div className="vacio">Pulsa «Evaluar cliente» para ver la predicción.</div>}
        {res?.status === 'error' && <div className="ban err" style={{ marginTop: 14 }}><Icono id="i-info" /><div><b>Error:</b> {res.mensaje}</div></div>}
        {res?.status === 'success' && (
          <>
            <div className="hero">
              <div>
                <small>Probabilidad de abandono</small>
                <b style={{ color: `var(--${NIVEL_CLASE[res.nivel_riesgo]}-tx)` }}>{Math.round(res.probabilidad_abandono)}%</b>
                <small>Riesgo {res.nivel_riesgo.toLowerCase()}</small>
              </div>
              <div>
                <small>Predicción</small>
                <b style={{ fontSize: 20, marginTop: 6 }}>{res.etiqueta}</b>
                <small>Umbral del modelo: {Math.round(res.umbral_usado * 100)}%</small>
              </div>
            </div>
            <h3>Factores que más empujan el riesgo</h3>
            {res.factores_legibles.length
              ? <ol className="fct">{res.factores_legibles.map((x) => <li key={x}>{x}</li>)}</ol>
              : <div className="hint">El cliente no está en riesgo: no hay factores que lo empujen al abandono.</div>}
            <h3>Acciones de retención</h3>
            <div className="recb"><ul className="acc-l">{res.acciones.map((a) => <li key={a}><b>{a}</b></li>)}</ul></div>
            {res.advertencia && <div className="hint">{res.advertencia}</div>}
          </>
        )}
      </div>
    </section>
  )
}
