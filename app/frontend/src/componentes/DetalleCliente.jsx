// Panel lateral con el detalle de un cliente de la lista.
import { useEffect, useRef } from 'react'
import { Icono } from './Iconos'
import { Pastilla } from './VistaRiesgo'
import { NIVEL_TXT, acciones, clv12, colorSeg, f0, ingresoQ1, nivel, pct, prob, usd } from '../calculos'

export default function DetalleCliente({ cliente: c, cerrar, datos, modelo, f, estrella }) {
  const btnCerrar = useRef(null)
  const p = prob(c, f)
  const lvl = nivel(p, modelo)
  const predicho = c.p >= modelo.umbral ? 1 : 0

  // Cerrar con Escape y poner el foco en el botón de cerrar
  useEffect(() => {
    btnCerrar.current?.focus()
    const tecla = (e) => e.key === 'Escape' && cerrar()
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [cerrar])

  const v = c.v
  return (
    <>
      <div className="ov on" onClick={cerrar} />
      <aside className="dr on" role="dialog" aria-modal="true" aria-label={`Detalle del cliente ${c.id}`}>
        <div className="dr-h">
          <div>
            <div className="crumb">Detalle del cliente</div>
            <h2>{c.id}</h2>
            <div style={{ marginTop: 6 }}>
              <span className="sgt"><i style={{ background: colorSeg(c.s) }} />{datos.segmentos[c.s]}{c.s === estrella && ' ★'}</span>
              <span className="tag" style={{ marginLeft: 6 }}>{c.t}</span>
            </div>
          </div>
          <button className="x" ref={btnCerrar} type="button" aria-label="Cerrar detalle" onClick={cerrar}><Icono id="i-x" /></button>
        </div>
        <div className="dr-b">
          <div className="hero">
            <div>
              <small>Probabilidad de abandono</small>
              <b style={{ color: `var(--${lvl}-tx)` }}>{pct(p)}</b>
              <small>Riesgo {NIVEL_TXT[lvl].toLowerCase()} <Pastilla p={p} modelo={modelo} /></small>
            </div>
            <div>
              <small>CLV a 12 meses</small>
              <b>{usd(clv12(c, f))}</b>
              <small>Ingreso esperado del trimestre: {usd(ingresoQ1(c, f))}</small>
            </div>
          </div>

          <div className="sec">
            <h3>Acciones de retención</h3>
            <div className="recb">
              <ul className="acc-l">{acciones(c, f, datos, modelo).map((a) => <li key={a}><b>{a}</b></li>)}</ul>
            </div>
          </div>

          <div className="sec">
            <h3>Factores que más empujan su riesgo</h3>
            {c.f.length
              ? <ol className="fct">{c.f.map((j) => <li key={j}>{datos.factores[j]}</li>)}</ol>
              : <div className="hint">Ninguna variable empuja a este cliente hacia el abandono.</div>}
          </div>

          <div className="sec">
            <h3>Variables del cliente</h3>
            <div className="vars">
              <div><small>Antigüedad</small><b>{v.antiguedad_meses} meses</b></div>
              <div><small>Gasto mensual promedio</small><b>{usd(v.gasto_mensual_usd)}</b></div>
              <div><small>Compras</small><b>{f0(v.num_compras)}</b></div>
              <div><small>Ticket promedio</small><b>{usd(v.ticket_promedio_usd)}</b></div>
              <div><small>Quejas</small><b>{v.quejas}</b></div>
              <div><small>Devoluciones</small><b>{v.devoluciones}</b></div>
              <div><small>Satisfacción</small><b>{v.satisfaccion} / 5</b></div>
              <div><small>Apertura de correos</small><b>{pct(v.tasa_apertura_correos)}</b></div>
              <div><small>Canal</small><b>{v.canal}</b></div>
              <div><small>Dispositivo</small><b>{v.dispositivo}</b></div>
            </div>
            <div className="real">
              En los datos este cliente está <b>{c.real ? 'en riesgo' : 'sin riesgo'}</b>; el modelo
              {predicho === c.real ? ' acertó.' : ' se equivocó en este caso.'}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
