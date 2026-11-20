// Panel "Acerca de": información de referencia que no se necesita en el uso diario
// (datos usados, desempeño del modelo, cómo se calculan los valores y créditos del equipo).
import { useEffect, useRef } from 'react'
import { Icono } from './Iconos'
import { f0, pct, usd } from '../calculos'

const EQUIPO = [
  ['EC', 'Castillo Gamboa Emir Ariel', 'Gerente de proyecto'],
  ['AD', 'Dominguez Caamal Andres Said', 'Ingeniero de datos'],
  ['AK', 'Kumul Ek Angela Rubi', 'Científica de datos'],
  ['DP', 'Pirin Solis David Antonio', 'Dashboard y QA'],
]

export default function AcercaDe({ cerrar, datos, modelo, msCarga }) {
  const btnCerrar = useRef(null)
  const mc = modelo.matriz_confusion

  useEffect(() => {
    btnCerrar.current?.focus()
    const tecla = (e) => e.key === 'Escape' && cerrar()
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [cerrar])

  return (
    <>
      <div className="ov on" onClick={cerrar} />
      <aside className="dr on" role="dialog" aria-modal="true" aria-label="Acerca de SPRVC">
        <div className="dr-h">
          <div>
            <div className="crumb">Acerca de</div>
            <h2>SPRVC</h2>
            <div className="hint" style={{ marginTop: 2 }}>Sistema Predictivo de Retención y Valor de Cliente</div>
          </div>
          <button className="x" ref={btnCerrar} type="button" aria-label="Cerrar" onClick={cerrar}><Icono id="i-x" /></button>
        </div>
        <div className="dr-b">
          <div className="sec">
            <h3>Datos</h3>
            <p className="ad-p">
              {f0(datos.clientes.length)} clientes reales del dataset de e-commerce. El conjunto de prueba del 20%
              separado durante el entrenamiento se mantiene únicamente para validar y reportar las métricas del modelo.
            </p>
          </div>

          <div className="sec">
            <h3>Modelo</h3>
            <p className="ad-p">{modelo.modelo.replace(/^Exp \d+ - /, '')} ({modelo.hiperparametros}). Umbral operativo {pct(modelo.umbral)}.</p>
            <div className="metr">
              <div><b>{modelo.auc_test.toFixed(3)}</b><small>AUC-ROC (meta ≥ 0.75)</small></div>
              <div><b>{pct(modelo.recall_test)}</b><small>Recall (meta ≥ 60%)</small></div>
              <div><b>{pct(modelo.precision_test)}</b><small>Precisión</small></div>
              <div><b>{modelo.f1_test.toFixed(2)}</b><small>F1</small></div>
            </div>
            <div className="mc" aria-label="Matriz de confusión en el conjunto de prueba">
              <span className="h">Real \ Predicho</span><span className="h">Sin riesgo</span><span className="h">En riesgo</span>
              <span className="h">Sin riesgo</span><span className="okc">{f0(mc.TN)}</span><span>{f0(mc.FP)}</span>
              <span className="h">En riesgo</span><span>{f0(mc.FN)}</span><span className="okc">{f0(mc.TP)}</span>
            </div>
          </div>

          <div className="sec">
            <h3>Metas del proyecto</h3>
            <div className="goal">
              <div><span>Datos reales disponibles</span><span className="st okk">Cumplida</span><small>{f0(datos.clientes.length)} clientes calificados</small></div>
              <div><span>Modelo de abandono</span><span className="st okk">Cumplida</span><small>AUC-ROC {modelo.auc_test.toFixed(3)} ≥ 0.75 | Recall {pct(modelo.recall_test)} ≥ 60%</small></div>
              <div><span>Tiempo de carga del dashboard</span><span className="st okk">Medido</span><small>{msCarga ?? 'No disponible'} ms | meta ≤ 5 s</small></div>
              <div><span>Segmentación con K-Means</span><span className="st">Pendiente</span><small>Se usan los segmentos reales del dataset</small></div>
              <div><span>Proyección estadística de ventas</span><span className="st">Pendiente</span><small>No se generan series históricas ni pronósticos simulados</small></div>
            </div>
          </div>

          <div className="sec">
            <h3>Cómo se calculan los valores</h3>
            <ul className="ad-l">
              <li><b>Probabilidad de abandono (p):</b> la calcula el modelo con 26 variables de comportamiento de cada cliente.</li>
              <li><b>En riesgo:</b> p ≥ {pct(modelo.umbral)}; <b>riesgo alto:</b> p ≥ {pct(modelo.umbral_alto)}.</li>
              <li><b>Gasto mensual:</b> gasto total ÷ meses de antigüedad, recortado a {usd(datos.tope_gasto)} (percentil 95) para que los clientes de 1 o 2 meses no distorsionen las sumas.</li>
              <li><b>Ingreso del próximo trimestre:</b> (1 − p) × gasto mensual × 3.</li>
              <li><b>Ingreso del segundo trimestre:</b> el del primero × (1 − p/4).</li>
              <li><b>CLV a 12 meses:</b> (1 − p) × gasto mensual × 12.</li>
              <li><b>Ingreso en juego:</b> p × gasto mensual × 3.</li>
              <li><b>Escenario de retención:</b> multiplica p por (1 − reducción) y recalcula todo.</li>
              <li><b>Segmentos:</b> columna customer_segment del dataset; la segmentación con K-Means queda como mejora futura.</li>
            </ul>
          </div>

          <div className="sec">
            <h3>Equipo</h3>
            <ul className="ad-eq">
              {EQUIPO.map(([ini, nombre, rol]) => (
                <li key={ini}><span className="ini">{ini}</span><span>{nombre}<em>{rol}</em></span></li>
              ))}
            </ul>
            <div className="hint">Universidad Tecnológica de Cancún | LITIID71</div>
          </div>
        </div>
      </aside>
    </>
  )
}
