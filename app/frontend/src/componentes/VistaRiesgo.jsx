// Vista 3: lista priorizada de clientes a contactar, con factores y acciones (Marketing y Servicio al Cliente).
import { useMemo, useState } from 'react'
import { Icono } from './Iconos'
import { acciones, clv12, colorSeg, f0, nivel, pct, prob, suma, usd } from '../calculos'

const ORDEN_TXT = { pc: 'probabilidad × valor del cliente', p: 'probabilidad de abandono', c: 'CLV a 12 meses' }

export const Pastilla = ({ p, modelo }) => <span className={'pill ' + nivel(p, modelo)}><i />{pct(p)}</span>

export default function VistaRiesgo({ datos, modelo, f, estrella, abrir, filtros, setFiltros }) {
  const C = datos.clientes
  const { seg, minimo, orden } = filtros
  const [cuantos, setCuantos] = useState(12)
  const [avisoCsv, setAvisoCsv] = useState('')
  const cambiar = (x) => { setFiltros({ ...filtros, ...x }); setCuantos(12); setAvisoCsv('') }

  const pasa = (c, k) => (k === 'all' || c.s === +k) && prob(c, f) >= minimo / 100

  // Lista filtrada y ordenada
  const lista = useMemo(() => {
    const clave = orden === 'p' ? (c) => c.p : orden === 'c' ? (c) => clv12(c, f) : (c) => prob(c, f) * c.g   // prioridad: riesgo × gasto del cliente (lo que se perdería)
    return C.filter((c) => pasa(c, seg)).sort((a, b) => clave(b) - clave(a))
  }, [C, seg, minimo, orden, f]) // eslint-disable-line react-hooks/exhaustive-deps

  // ¿En qué porcentaje de los clientes de la lista aparece cada factor?
  const factores = useMemo(() => {
    const cuenta = {}
    lista.forEach((c) => c.f.forEach((i) => { cuenta[i] = (cuenta[i] || 0) + 1 }))
    return Object.entries(cuenta).map(([i, n]) => [datos.factores[i], n / lista.length]).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [lista, datos.factores])

  function exportar() {
    if (!lista.length) return
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"'
    const filas = [['Cliente', 'Segmento', 'Nivel', 'Probabilidad', 'CLV 12 m', 'Factores principales', 'Acciones de retención']].concat(
      lista.map((c) => [c.id, datos.segmentos[c.s], c.t, pct(prob(c, f)), Math.round(clv12(c, f)),
        c.f.map((i) => datos.factores[i]).join('; '), acciones(c, f, datos, modelo).join(' / ')]),
    )
    const blob = new Blob(['﻿' + filas.map((x) => x.map(q).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'clientes_en_riesgo.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    setAvisoCsv(`Se descargó la lista con ${f0(lista.length)} clientes.`)
  }

  const chips = [['all', 'Todos', null], ...datos.segmentos.map((n, k) => [String(k), n, k])]
  const altos = lista.filter((c) => prob(c, f) >= modelo.umbral_alto).length

  return (
    <section>
      <div className="c">
        <div className="tool">
          <div>
            <span className="fl-l">Segmento</span>
            <div className="chips">
              {chips.map(([v, n, k]) => (
                <button key={v} type="button" aria-pressed={seg === v} onClick={() => cambiar({ seg: v })}>
                  {k !== null && <i className="dot" style={{ background: colorSeg(k) }} />}
                  {n}{k === estrella && ' ★'} <small>{f0(C.filter((c) => pasa(c, v)).length)}</small>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="fl-l" htmlFor="fr">Probabilidad mínima: <b style={{ color: 'var(--tx)' }}>{minimo}%</b></label>
            <input id="fr" type="range" min="10" max="95" value={minimo} onChange={(e) => cambiar({ minimo: +e.target.value })} />
          </div>
          <div>
            <button className="btn" type="button" aria-disabled={!lista.length} onClick={exportar}><Icono id="i-down" />Exportar lista (CSV)</button>
            {avisoCsv && <div className="hint" aria-live="polite">{avisoCsv}</div>}
          </div>
        </div>

        <div className="g sum">
          <div className="c"><b>{f0(lista.length)}</b><small>clientes en la lista</small></div>
          <div className="c"><b>{f0(altos)}</b><small>con riesgo alto (≥ {pct(modelo.umbral_alto)})</small></div>
          <div className="c"><b>{usd(suma(lista, (c) => clv12(c, f)))}</b><small>CLV a 12 meses de la lista</small></div>
        </div>

        <details className="c impw" style={{ boxShadow: 'none' }}>
          <summary><Icono id="i-chev" />¿Qué factores pesan más en esta lista?</summary>
          <div className="imp">
            {factores.length ? factores.map(([n, v]) => (
              <div className="ir" key={n}><span>{n}</span><div className="it"><div style={{ width: (v / factores[0][1]) * 100 + '%' }} /></div><b>{Math.round(v * 100)}%</b></div>
            )) : <div className="hint">Sin clientes en la lista.</div>}
          </div>
          <div className="perf">Porcentaje de clientes de la lista en los que el modelo encontró ese factor entre sus 3 principales.</div>
        </details>

        <div className="legrow">
          <div className="legp">
            <span>Probabilidad de abandono:</span>
            <span className="pill lo"><i />menos de {pct(modelo.umbral)}</span>
            <span className="pill md"><i />desde {pct(modelo.umbral)}</span>
            <span className="pill hi"><i />desde {pct(modelo.umbral_alto)}</span>
          </div>
          <label className="ordw">
            <span>Ordenar por</span>
            <span className="selw">
              <select value={orden} onChange={(e) => cambiar({ orden: e.target.value })}>
                <option value="pc">Prioridad (probabilidad × valor)</option>
                <option value="p">Probabilidad de abandono</option>
                <option value="c">CLV 12 m</option>
              </select>
              <Icono id="i-chevd" />
            </span>
          </label>
        </div>

        <div className="tw">
          <table>
            <thead>
              <tr><th className="r">#</th><th>Cliente</th><th>Segmento y nivel</th><th>Prob. de abandono</th><th className="r">CLV 12 m</th><th>Factores principales</th><th>Acción sugerida</th></tr>
            </thead>
            <tbody>
              {lista.slice(0, cuantos).map((c, i) => (
                <tr key={c.id} onClick={() => abrir(c)}>
                  <td className="r" data-l="Prioridad">{i + 1}</td>
                  <td data-l="Cliente"><button type="button" className="idb">{c.id}</button></td>
                  <td data-l="Segmento"><span><span className="sgt"><i style={{ background: colorSeg(c.s) }} />{datos.segmentos[c.s]}</span><div className="sub">{c.t}</div></span></td>
                  <td data-l="Prob. de abandono"><Pastilla p={prob(c, f)} modelo={modelo} /></td>
                  <td className="r" data-l="CLV 12 m">{usd(clv12(c, f))}</td>
                  <td data-l="Factores">{c.f.length ? <ol className="fct">{c.f.map((j) => <li key={j}>{datos.factores[j]}</li>)}</ol> : '—'}</td>
                  <td className="rc" data-l="Acción">{acciones(c, f, datos, modelo)[0]}</td>
                </tr>
              ))}
              {!lista.length && <tr><td colSpan="7" className="empty">Ningún cliente cumple estos filtros. Baja la probabilidad mínima o elige otro segmento.</td></tr>}
            </tbody>
          </table>
        </div>
        {cuantos < lista.length && (
          <div className="mas"><button className="ib" type="button" onClick={() => setCuantos(cuantos + 12)}>Mostrar 12 más</button></div>
        )}
        <div className="tfoot">
          <span>{lista.length ? `Ordenada por ${ORDEN_TXT[orden]}. Se muestran ${Math.min(cuantos, lista.length)} de ${f0(lista.length)}; el CSV incluye todos.` : ''}</span>
        </div>
      </div>
    </section>
  )
}
