// Vista 4: formulario para evaluar un cliente nuevo. Manda los datos al backend (POST /api/predecir),
// que llama a predecir() del equipo de datos, y muestra la respuesta del modelo.
import { useRef, useState } from 'react'
import { predecir } from '../api'
import { Icono } from './Iconos'

// Campos numéricos agrupados por tema: [clave, etiqueta, unidad, paso, mínimo, máximo]
// Las tasas se capturan en porcentaje (0 a 100) y se convierten a 0-1 antes de enviarlas al modelo.
const GRUPOS = [
  { titulo: 'Compras', campos: [
    ['num_compras', 'Número de compras', 'compras', 1, 0],
    ['ticket_promedio_usd', 'Ticket promedio', 'USD', 0.01, 0],
    ['gasto_mensual_usd', 'Gasto mensual', 'USD', 0.01, 0],
  ] },
  { titulo: 'Servicio', campos: [
    ['satisfaccion', 'Satisfacción', 'de 5', 0.1, 1, 5],
    ['quejas', 'Quejas', 'total', 1, 0],
    ['devoluciones', 'Devoluciones', 'total', 1, 0],
  ] },
  { titulo: 'Correos de marketing', campos: [
    ['tasa_apertura_correos', 'Apertura', '%', 1, 0, 100],
    ['tasa_clics', 'Clics', '%', 1, 0, 100],
    ['tasa_conversion', 'Conversión', '%', 1, 0, 100],
  ] },
]
const TASAS = ['tasa_apertura_correos', 'tasa_clics', 'tasa_conversion']

const EJEMPLOS = {
  riesgo: { antiguedad_meses: 30, num_compras: 60, ticket_promedio_usd: 400, gasto_mensual_usd: 800, quejas: 12, devoluciones: 16, satisfaccion: 1.8, tasa_apertura_correos: 45, tasa_clics: 20, tasa_conversion: 10, canal: 'Online', dispositivo: 'Mobile', lealtad: 'Bronze' },
  fiel: { antiguedad_meses: 72, num_compras: 140, ticket_promedio_usd: 520, gasto_mensual_usd: 1100, quejas: 2, devoluciones: 3, satisfaccion: 4.6, tasa_apertura_correos: 60, tasa_clics: 30, tasa_conversion: 20, canal: 'In-Store', dispositivo: 'Desktop', lealtad: 'Diamond' },
}

const NIVEL_CLASE = { Bajo: 'lo', Medio: 'md', Alto: 'hi' }

// Campo numérico con su unidad dentro de la caja
function Numero({ id, label, unidad, paso, min, max, valor, cambiar }) {
  return (
    <label>
      <span>{label}</span>
      <span className="inp">
        <input type="number" step={paso} min={min} max={max} value={valor} onChange={(e) => cambiar(id, e.target.value)} required />
        <small>{unidad}</small>
      </span>
    </label>
  )
}

function Lista({ label, valor, opciones, cambiar, id, vacio }) {
  return (
    <label>
      <span>{label}</span>
      <select value={valor || ''} onChange={(e) => cambiar(id, e.target.value)}>
        {vacio && <option value="">{vacio}</option>}
        {opciones.map((x) => <option key={x}>{x}</option>)}
      </select>
    </label>
  )
}

export default function VistaEvaluar() {
  const [form, setForm] = useState(EJEMPLOS.riesgo)
  const [res, setRes] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [ejemplo, setEjemplo] = useState('riesgo')      // ejemplo cargado en el formulario
  const panel = useRef(null)

  // Alterna entre el ejemplo de cliente en riesgo y el de cliente fiel
  function cargarEjemplo() {
    const siguiente = ejemplo === 'riesgo' ? 'fiel' : 'riesgo'
    setEjemplo(siguiente)
    setForm(EJEMPLOS[siguiente])
    setRes(null)
  }

  const poner = (k, v) => setForm({ ...form, [k]: v })

  async function enviar(e) {
    e.preventDefault()
    setCargando(true)
    try {
      // Los números del formulario llegan como texto: se convierten antes de enviarlos
      const cliente = { ...form }
      GRUPOS.flatMap((g) => g.campos).concat([['antiguedad_meses']]).forEach(([k]) => {
        cliente[k] = cliente[k] === '' ? null : Number(cliente[k])
      })
      TASAS.forEach((k) => { if (cliente[k] !== null) cliente[k] = cliente[k] / 100 })  // % -> 0-1
      if (!cliente.lealtad) cliente.lealtad = null
      setRes(await predecir(cliente))
    } catch {
      setRes({ status: 'error', mensaje: 'No se pudo conectar con el backend.' })
    }
    setCargando(false)
    // En celular el resultado queda abajo: se lleva la vista hasta él
    if (window.innerWidth <= 1100) panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="g ev">
      <form className="c" onSubmit={enviar}>
        <div className="ch-h">
          <h2>Datos del cliente</h2>
          <button className="ib" type="button" onClick={cargarEjemplo}>Cargar ejemplo</button>
        </div>

        <fieldset className="grp-f">
          <legend>Perfil</legend>
          <div className="frm">
            <Numero id="antiguedad_meses" label="Antigüedad" unidad="meses" paso={1} min={0} valor={form.antiguedad_meses} cambiar={poner} />
            <Lista id="lealtad" label="Nivel de lealtad" valor={form.lealtad} vacio="Sin nivel" opciones={['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']} cambiar={poner} />
            <Lista id="canal" label="Canal de compra" valor={form.canal} opciones={['Online', 'In-Store', 'Mobile App', 'Marketplace']} cambiar={poner} />
            <Lista id="dispositivo" label="Dispositivo" valor={form.dispositivo} opciones={['Desktop', 'Mobile', 'Tablet', 'Multiple']} cambiar={poner} />
          </div>
        </fieldset>

        {GRUPOS.map((g) => (
          <fieldset className="grp-f" key={g.titulo}>
            <legend>{g.titulo}</legend>
            <div className="frm tres">
              {g.campos.map(([k, label, unidad, paso, min, max]) => (
                <Numero key={k} id={k} label={label} unidad={unidad} paso={paso} min={min} max={max} valor={form[k]} cambiar={poner} />
              ))}
            </div>
          </fieldset>
        ))}

        <div className="frm-a">
          <button className="btn" type="submit" disabled={cargando}><Icono id="i-play" />{cargando ? 'Evaluando…' : 'Evaluar cliente'}</button>
        </div>
      </form>

      <div className="c resu" ref={panel} aria-live="polite">
        <h2>Resultado del modelo</h2>
        {!res && (
          <div className="vacio">
            <Icono id="i-spark" className="i vacio-i" />
            <p>Llena los datos del cliente y pulsa «Evaluar cliente».</p>
          </div>
        )}
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
              : <div className="hint">Ninguna variable empuja a este cliente hacia el abandono.</div>}
            <h3>Acciones de retención</h3>
            <div className="recb"><ul className="acc-l">{res.acciones.map((a) => <li key={a}><b>{a}</b></li>)}</ul></div>
            {res.advertencia && <div className="hint">{res.advertencia}</div>}
          </>
        )}
      </div>
    </section>
  )
}
