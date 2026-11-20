// Vista 2: qué segmentos concentran clientes, ingresos y riesgo (Marketing).
import { useMemo } from 'react'
import { Icono } from './Iconos'
import { clv12, colorSeg, f0, ingresoQ1, nivel, prob, suma, usd, usdCorto } from '../calculos'

const DESCRIPCION = {
  Consumidor: 'Clientes individuales',
  Premium: 'Clientes con servicio premium',
  'Pequeña empresa': 'Negocios pequeños',
  Empresa: 'Clientes corporativos',
}

export default function VistaSegmentos({ datos, modelo, f, estrella }) {
  const C = datos.clientes
  const N = C.length
  const S = datos.segmentos

  const st = useMemo(() => {
    const total = suma(C, (c) => ingresoQ1(c, f))
    return S.map((_, k) => {
      const cs = C.filter((c) => c.s === k)
      const ingreso = suma(cs, (c) => ingresoQ1(c, f))
      return {
        n: cs.length,
        pc: (cs.length / N) * 100,
        ing: (ingreso / total) * 100,
        ingreso,
        clv: suma(cs, (c) => clv12(c, f)) / cs.length,
        rk: (suma(cs, (c) => prob(c, f)) / cs.length) * 100,
        enRiesgo: cs.filter((c) => prob(c, f) >= modelo.umbral).length,
        total,
      }
    })
  }, [C, S, N, f, modelo])

  const mx = Math.max(...st.flatMap((x) => [x.pc, x.ing]))
  const menor = st.map((x) => x.ing).indexOf(Math.min(...st.map((x) => x.ing)))

  // Dona de ingresos
  const R = 70, LC = 2 * Math.PI * R
  let acumulado = 0

  return (
    <section>
      <div className="g segs">
        {S.map((nombre, k) => (
          <div className="c seg" key={nombre} style={{ '--sc': colorSeg(k) }}>
            <div className="sh"><i className="dot" /><h2>{nombre}</h2>{k === estrella && <span className="star" title="Mayor CLV promedio">★</span>}</div>
            <div className="sd">{DESCRIPCION[nombre]}</div>
            <div className="st">
              <div><b>{Math.round(st[k].pc)}%</b><small>de los clientes</small></div>
              <div><b>{Math.round(st[k].ing)}%</b><small>de los ingresos</small></div>
              <div><b>{usd(st[k].clv)}</b><small>CLV promedio</small></div>
              <div><b>{Math.round(st[k].rk)}%</b><small>riesgo promedio</small></div>
            </div>
            <div className="meter">
              <div className="ml"><span>Riesgo promedio</span><span className="num">{f0(st[k].n)} clientes</span></div>
              <div className="mt"><div style={{ width: st[k].rk + '%', background: `var(--${nivel(st[k].rk / 100, modelo)}-dot)` }} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="c" style={{ marginTop: 16 }}>
        <div className="ch-h">
          <div><h2>¿Dónde está el valor?</h2><p>Peso de cada segmento en clientes contra ingresos</p></div>
          <div className="lg">
            <span><i className="sw" style={{ background: 'var(--pri2)' }} />% de los clientes</span>
            <span><i className="sw" style={{ background: 'var(--pri)' }} />% de los ingresos esperados</span>
          </div>
        </div>
        {S.map((nombre, k) => (
          <div className="vrow" key={nombre}>
            <div className="vn"><i className="sw" style={{ background: colorSeg(k), borderRadius: '50%' }} />{nombre}{k === estrella && <span className="star"> ★</span>}</div>
            <div className="vbw">
              <div className="vb">
                <div className="a" style={{ width: (st[k].pc / mx) * 100 + '%' }} data-tip={`<b>${nombre}</b><br>${st[k].pc.toFixed(1)}% de los clientes`}><span>{Math.round(st[k].pc)}%</span></div>
                <div className="b" style={{ width: (st[k].ing / mx) * 100 + '%' }} data-tip={`<b>${nombre}</b><br>${st[k].ing.toFixed(1)}% de los ingresos esperados`}><span>{Math.round(st[k].ing)}%</span></div>
              </div>
            </div>
          </div>
        ))}
        <div className="ins">
          <b>{S[estrella]}</b>: {Math.round(st[estrella].pc)}% de los clientes aporta el {Math.round(st[estrella].ing)}% de los ingresos esperados, con riesgo promedio de {Math.round(st[estrella].rk)}%.
          En el otro extremo, <b>{S[menor]}</b> reúne el {Math.round(st[menor].pc)}% de los clientes y el {Math.round(st[menor].ing)}% de los ingresos.
        </div>
      </div>

      <div className="g" style={{ marginTop: 16 }}>
        <details className="c acc">
          <summary>
            <span className="st-t"><b>Valor contra riesgo por segmento</b><small>Qué grupo combina mucho valor y mucho riesgo</small></span>
            <span className="chv"><span className="vc">Mostrar</span><span className="vo">Ocultar</span><Icono id="i-chevd" /></span>
          </summary>
          <div className="acc-b">
            <div className="tw">
              <table>
                <thead>
                  <tr><th>Segmento</th><th className="r">Clientes</th><th className="r">Riesgo promedio</th><th className="r">En riesgo</th><th className="r">CLV promedio</th></tr>
                </thead>
                <tbody>
                  {st.map((x, k) => (
                    <tr key={k} style={{ cursor: 'default' }}>
                      <td><span className="sgt"><i style={{ background: colorSeg(k) }} />{S[k]}{k === estrella && ' ★'}</span></td>
                      <td className="r">{f0(x.n)}</td>
                      <td className="r">{Math.round(x.rk)}%</td>
                      <td className="r">{f0(x.enRiesgo)} ({Math.round((x.enRiesgo / x.n) * 100)}%)</td>
                      <td className="r">{usd(x.clv)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ins">
              Los cuatro segmentos tienen un riesgo muy parecido ({Math.round(Math.min(...st.map((x) => x.rk)))}% a {Math.round(Math.max(...st.map((x) => x.rk)))}%):
              el tipo de cliente casi no cambia el riesgo. Lo que lo explica es el comportamiento (satisfacción, quejas y devoluciones),
              por eso la lista de clientes en riesgo se arma cliente por cliente.
            </div>
          </div>
        </details>

        <details className="c acc">
          <summary>
            <span className="st-t"><b>Reparto de ingresos esperados</b><small>Próximo trimestre, por segmento</small></span>
            <span className="chv"><span className="vc">Mostrar</span><span className="vo">Ocultar</span><Icono id="i-chevd" /></span>
          </summary>
          <div className="acc-b">
            <div className="donw">
              <div className="don" role="img" aria-label="Reparto de ingresos esperados por segmento">
                <svg viewBox="0 0 190 190">
                  <circle cx="95" cy="95" r={R} fill="none" stroke="var(--soft)" strokeWidth="24" />
                  {st.map((x, k) => {
                    const v = x.ing / 100, len = Math.max(0, LC * v - 3), off = -LC * acumulado
                    acumulado += v
                    return <circle key={k} cx="95" cy="95" r={R} fill="none" stroke={colorSeg(k)} strokeWidth="24" strokeDasharray={`${len} ${LC}`} strokeDashoffset={off}
                      data-tip={`<b>${S[k]}</b><br>${usd(x.ingreso)} | ${x.ing.toFixed(1)}% de los ingresos`} />
                  })}
                </svg>
                <div className="rc"><div><b data-tip={usd(st[0].total)}>{usdCorto(st[0].total)}</b><small>próximo trimestre</small></div></div>
              </div>
              <div className="dl">
                {st.map((x, k) => (
                  <div key={k}><i className="sw" style={{ background: colorSeg(k), borderRadius: '50%' }} /><span>{S[k]}{k === estrella && ' ★'}</span><b>{Math.round(x.ing)}%</b></div>
                ))}
              </div>
            </div>
          </div>
        </details>
      </div>
    </section>
  )
}
