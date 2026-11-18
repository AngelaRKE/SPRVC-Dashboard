// Vista 1: ingresos esperados, clientes en riesgo y escenario de retención (Dirección Comercial y Ventas).
import { useMemo } from 'react'
import { Icono } from './Iconos'
import { colorSeg, f0, indicadores, ingresoQ1, ingresoQ2, kfmt, pasoBonito, pct, signo, suma, usd } from '../calculos'

// Gráfica de barras: dos barras por segmento (próximo y segundo trimestre) con rango ±15%
function GraficaSegmentos({ filas, estrella }) {
  const alto = Math.max(...filas.flatMap((x) => [x.q1, x.q2])) * 1.15
  const paso = pasoBonito(alto / 4)
  const tope = Math.ceil(alto / paso - 1e-9) * paso
  const marcas = []
  for (let v = 0; v <= tope + 1e-6; v += paso) marcas.push(v)
  const y = (v) => (v / tope) * 100

  const barra = (nombre, periodo, v, clase) => (
    <div className="col" data-tip={`<b>${nombre}</b><br>${periodo}: ${usd(v)}<br>Rango: ${usd(v * 0.85)} a ${usd(v * 1.15)}`}>
      <div className={'bar ' + clase} style={{ height: y(v) + '%' }} />
      <div className="wh" style={{ bottom: y(v * 0.85) + '%', height: y(v * 0.3) + '%' }} />
      <div className="vl" style={{ bottom: `calc(${y(v * 1.15)}% + 3px)` }}>{kfmt(v)}</div>
    </div>
  )

  return (
    <div className="chw" role="img" aria-label="Ingresos esperados por segmento">
      <div className="yax">{marcas.map((v) => <span key={v} className="yl" style={{ bottom: y(v) + '%' }}>{kfmt(v)}</span>)}</div>
      <div className="plot">
        {marcas.slice(1).map((v) => <div key={v} className="gl" style={{ bottom: y(v) + '%' }} />)}
        {filas.map((x) => (
          <div className="grp" key={x.nombre}>
            {barra(x.nombre, 'Próximo trimestre', x.q1, 'q1')}
            {barra(x.nombre, 'Segundo trimestre', x.q2, 'q2')}
          </div>
        ))}
      </div>
      <div className="xl">
        {filas.map((x, k) => (
          <span key={x.nombre}>
            <i className="sw" style={{ background: colorSeg(k), borderRadius: '50%' }} />
            {x.nombre}{k === estrella && <span className="star"> ★</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function VistaTendencias({ datos, modelo, f, escenario, setEscenario, estrella }) {
  const C = datos.clientes
  const N = C.length
  const base = useMemo(() => indicadores(C, 1, modelo.umbral), [C, modelo])
  const m = useMemo(() => indicadores(C, f, modelo.umbral), [C, f, modelo])
  const activo = escenario > 0
  const dif = (v, b, fmt) => (activo ? `${signo(v - b, fmt)} vs. sin acciones` : '')

  const filas = useMemo(
    () => datos.segmentos.map((nombre, k) => {
      const cs = C.filter((c) => c.s === k)
      return { nombre, q1: suma(cs, (c) => ingresoQ1(c, f)), q2: suma(cs, (c) => ingresoQ2(c, f)) }
    }),
    [C, datos.segmentos, f],
  )

  const kpis = [
    ['i-users', 'Clientes', f0(N), 'Clientes analizados por el modelo', ''],
    ['i-cash', 'Ingreso esperado | próximo trimestre', usd(m.A), `Rango ${kfmt(m.A * 0.85)} a ${kfmt(m.A * 1.15)}`, dif(m.A, base.A, usd)],
    ['i-cal', 'Ingreso esperado | segundo trimestre', usd(m.B), `Rango ${kfmt(m.B * 0.85)} a ${kfmt(m.B * 1.15)}`, dif(m.B, base.B, usd)],
    ['i-gem', 'CLV promedio a 12 meses', usd(m.clvProm), 'Valor esperado por cliente', dif(m.clvProm, base.clvProm, usd)],
    ['i-risk', `En riesgo (prob. ≥ ${pct(modelo.umbral)})`, f0(m.enRiesgo), `${((m.enRiesgo / N) * 100).toFixed(1)}% de los clientes`, dif(m.enRiesgo, base.enRiesgo, f0)],
  ]

  const R = 52, LC = 2 * Math.PI * R, fr = m.enRiesgo / N
  const mx = Math.max(base.A, m.A)

  return (
    <section>
      <div className="g kpis">
        {kpis.map(([ic, l, v, s, d]) => (
          <div className="c kpi" key={l}>
            <div className="kl"><span className="ic"><Icono id={ic} /></span>{l}</div>
            <div className="kv">{v}</div>
            <div className="ks">{s}</div>
            <div className="kd">{d}</div>
          </div>
        ))}
      </div>

      <div className="g r1">
        <div className="c">
          <div className="ch-h">
            <div><h2>Ingresos esperados por segmento (USD)</h2><p>Próximos dos trimestres, con rango de referencia</p></div>
          </div>
          <div className="lg">
            <span><i className="sw" style={{ background: 'var(--pri)' }} />Próximo trimestre</span>
            <span><i className="sw" style={{ background: 'var(--pri2)' }} />Segundo trimestre</span>
            <span><i className="swr" />Rango ±15%</span>
          </div>
          <GraficaSegmentos filas={filas} estrella={estrella} />
        </div>

        <div className="stack">
          <div className="c">
            <div className="ch-h"><div><h2>Clientes en riesgo</h2><p>Probabilidad de abandono ≥ {pct(modelo.umbral)} (umbral del modelo)</p></div></div>
            <div className="ringw">
              <div className="ring" role="img" aria-label={`${(fr * 100).toFixed(1)}% de los clientes en riesgo`}>
                <svg viewBox="0 0 132 132">
                  <circle cx="66" cy="66" r={R} fill="none" stroke="var(--soft)" strokeWidth="14" />
                  <circle cx="66" cy="66" r={R} fill="none" stroke="var(--hi-dot)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${LC * fr} ${LC}`} />
                </svg>
                <div className="rc"><div><b className="num">{Math.round(fr * 100)}%</b><small>en riesgo</small></div></div>
              </div>
              <div className="rinfo">
                <div className="big">{f0(m.enRiesgo)} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--mut)' }}>de {f0(N)} clientes</span></div>
                <p>con probabilidad de abandono ≥ {pct(modelo.umbral)}</p>
                <div className="big">{usd(m.L)}</div>
                <p style={{ marginBottom: 0 }}>ingreso en juego por abandono el próximo trimestre</p>
              </div>
            </div>
          </div>

          <div className="c" id="scard">
            <h2>Escenario de retención</h2>
            <label htmlFor="sl" style={{ display: 'block', marginTop: 10 }}>Reducción del riesgo de abandono con acciones de retención</label>
            <div className="scv"><span className="big num">{escenario}%</span><span className="hint" style={{ margin: 0 }}>Rango 0 a 30%</span></div>
            <input id="sl" type="range" min="0" max="30" step="1" value={escenario} onChange={(e) => setEscenario(+e.target.value)} />
            <div className="ticks" aria-hidden="true"><span>0%</span><span>10%</span><span>20%</span><span>30%</span></div>
            <div className="pre">
              {[0, 10, 20, 30].map((v) => (
                <button key={v} type="button" aria-pressed={v === escenario} onClick={() => setEscenario(v)}>{v === 0 ? 'Sin acciones' : v + '%'}</button>
              ))}
            </div>
            <div className="hint">Al mover el control se recalculan los indicadores, la gráfica y las listas de las vistas 1 a 3.</div>
            <div className="cmp">
              {[['Sin acciones', base.A, 'var(--lo-dot)'], ['Con escenario', m.A, 'var(--pri)']].map(([l, v, col]) => (
                <div className="cr" key={l}><span>{l}</span><div className="ct"><div style={{ width: (v / mx) * 100 + '%', background: col }} /></div><b>{usd(v)}</b></div>
              ))}
            </div>
            <div className="res" aria-live="polite">
              {activo ? (
                <>
                  <span className="ck"><Icono id="i-check" /></span>
                  <span>El ingreso esperado del próximo trimestre sube <b>{usd(m.A - base.A)}</b> (+{((m.A / base.A - 1) * 100).toFixed(1)}%) y <b>{f0(base.enRiesgo - m.enRiesgo)}</b> clientes salen del riesgo.</span>
                </>
              ) : 'Mueve el control para simular cuánto mejoraría el ingreso si Marketing reduce el riesgo de abandono.'}
            </div>
          </div>
        </div>
      </div>

    </section>
  )
}
