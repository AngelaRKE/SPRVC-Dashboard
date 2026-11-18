// Componente principal: carga los datos del backend, guarda el estado compartido
// (vista activa, escenario de retención, filtros, tema) y dibuja el menú y la vista elegida.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { obtenerClientes, obtenerModelo } from './api'
import { DefinicionesIconos, Icono } from './componentes/Iconos'
import VistaTendencias from './componentes/VistaTendencias'
import VistaSegmentos from './componentes/VistaSegmentos'
import VistaRiesgo from './componentes/VistaRiesgo'
import VistaEvaluar from './componentes/VistaEvaluar'
import DetalleCliente from './componentes/DetalleCliente'

const VISTAS = [
  { id: 't1', titulo: 'Tendencias predictivas', corto: 'Tendencias', para: 'Dirección Comercial, Ventas' },
  { id: 't2', titulo: 'Segmentos', corto: 'Segmentos', para: 'Marketing' },
  { id: 't3', titulo: 'Clientes en riesgo', corto: 'En riesgo', para: 'Marketing, Servicio al Cliente' },
  { id: 't4', titulo: 'Evaluar un cliente', corto: 'Evaluar', para: 'Todas las áreas' },
]

const EQUIPO = [
  ['EC', 'Castillo Gamboa Emir Ariel', 'Gerente de proyecto'],
  ['AD', 'Dominguez Caamal Andres Said', 'Ingeniero de datos'],
  ['AK', 'Kumul Ek Angela Rubi', 'Científica de datos'],
  ['DP', 'Pirin Solis David Antonio', 'Dashboard y QA'],
]

export default function App() {
  // ----- datos que vienen del backend -----
  const [datos, setDatos] = useState(null)
  const [modelo, setModelo] = useState(null)
  const [error, setError] = useState('')
  const [msCarga, setMsCarga] = useState(null)

  // ----- estado compartido entre vistas -----
  const [vista, setVista] = useState('t1')
  const [escenario, setEscenario] = useState(0)          // % de reducción del riesgo (0 a 30)
  const [filtros, setFiltros] = useState({ seg: 'all', minimo: null, orden: 'pc' })
  const [abierto, setAbierto] = useState(null)           // cliente del panel de detalle
  const [tema, setTema] = useState(() => {
    try { return localStorage.getItem('sprvc-tema') || 'dark' } catch { return 'dark' }
  })
  const [aviso, setAviso] = useState('')

  // 1. Al abrir la página se piden los datos al backend
  useEffect(() => {
    const t0 = performance.now()
    Promise.all([obtenerModelo(), obtenerClientes()])
      .then(([m, d]) => {
        setModelo(m)
        setDatos(d)
        setFiltros((x) => ({ ...x, minimo: Math.round(m.umbral * 100) }))
        setMsCarga(Math.round(performance.now() - t0))
      })
      .catch(() => setError('No se pudo conectar con el backend.'))
  }, [])

  // 2. Tema claro / oscuro
  useEffect(() => {
    document.documentElement.dataset.theme = tema
    try { localStorage.setItem('sprvc-tema', tema) } catch { /* sin almacenamiento */ }
  }, [tema])

  // 3. Tooltip: cualquier elemento con data-tip muestra su texto al pasar el mouse
  const tipRef = useRef(null)
  useEffect(() => {
    const tip = tipRef.current
    const sobre = (e) => {
      const t = e.target.closest?.('[data-tip]')
      if (!t) { tip.hidden = true; return }
      tip.innerHTML = t.dataset.tip
      tip.hidden = false
    }
    const mover = (e) => {
      if (tip.hidden) return
      let x = e.clientX + 14, y = e.clientY + 14
      if (x + tip.offsetWidth > innerWidth - 8) x = e.clientX - tip.offsetWidth - 14
      if (y + tip.offsetHeight > innerHeight - 8) y = e.clientY - tip.offsetHeight - 14
      tip.style.left = x + 'px'
      tip.style.top = y + 'px'
    }
    document.addEventListener('mouseover', sobre)
    document.addEventListener('mousemove', mover)
    return () => { document.removeEventListener('mouseover', sobre); document.removeEventListener('mousemove', mover) }
  }, [])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(''), 3200)
    return () => clearTimeout(t)
  }, [aviso])

  const cerrarDetalle = useCallback(() => setAbierto(null), [])
  const f = 1 - escenario / 100                           // factor del escenario
  const actual = VISTAS.find((v) => v.id === vista)
  const listo = datos && modelo

  // Segmento de alto valor = el de mayor CLV promedio (se marca con ★)
  const estrella = useMemo(() => {
    if (!datos) return 0
    const prom = datos.segmentos.map((_, k) => {
      const cs = datos.clientes.filter((c) => c.s === k)
      return cs.reduce((a, c) => a + (1 - c.p) * c.g * 12, 0) / cs.length
    })
    return prom.indexOf(Math.max(...prom))
  }, [datos])

  function irAArea(area) {
    if (area === 'dir' || area === 'ven') { setVista('t1'); setAviso('Dirección Comercial y Ventas: ingresos esperados y escenario de retención.') }
    if (area === 'mkt') { setVista('t2'); setAviso('Marketing: segmentos y dónde está el valor.') }
    if (area === 'sac') {
      setFiltros({ seg: 'all', minimo: Math.round(modelo.umbral_alto * 100), orden: 'pc' })
      setVista('t3')
      setAviso('Servicio al Cliente: clientes con riesgo alto para contactar primero.')
    }
  }

  const props = { datos, modelo, f, escenario, estrella, abrir: setAbierto }

  return (
    <>
      <DefinicionesIconos />
      <div className="app">
        <aside className="side">
          <div className="brand">
            <div className="logo" aria-hidden="true">S</div>
            <div><b>SPRVC</b><small>Sistema Predictivo de Retención y Valor de Cliente</small></div>
          </div>
          <div className="navw">
            <div className="navlbl">Vistas</div>
            <div className="nav" role="tablist" aria-orientation="vertical">
              {VISTAS.map((v, i) => (
                <button key={v.id} role="tab" aria-selected={vista === v.id} onClick={() => setVista(v.id)}>
                  <span className="nn">{i + 1}</span>
                  <span className="nt"><span className="lg-n">{v.titulo}</span><span className="sh-n">{v.corto}</span></span>
                </button>
              ))}
            </div>
          </div>
          <div className="team">
            Equipo SPRVC | UT Cancún
            <ul>
              {EQUIPO.map(([ini, nombre, rol]) => (
                <li key={ini}><span className="ini">{ini}</span><span>{nombre}<em>{rol}</em></span></li>
              ))}
            </ul>
            Entrega 4 | Dashboard conectado al modelo
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div>
              <div className="crumb">SPRVC | Vista {VISTAS.indexOf(actual) + 1} de {VISTAS.length}</div>
              <h1>{actual.titulo}</h1>
            </div>
            <div className="acts">
              {listo && <span className="badge ok" title={modelo.modelo}><i />Modelo real | AUC {modelo.auc_test.toFixed(2)}</span>}
              <span className="selw">
                <select value="" onChange={(e) => e.target.value && listo && irAArea(e.target.value)} aria-label="Ir a la vista de mi área">
                  <option value="">Mi área…</option>
                  <option value="dir">Dirección Comercial</option>
                  <option value="ven">Ventas</option>
                  <option value="mkt">Marketing</option>
                  <option value="sac">Servicio al Cliente</option>
                </select>
                <Icono id="i-chevd" />
              </span>
              <button className="ib" type="button" onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')}>
                <Icono id={tema === 'dark' ? 'i-sun' : 'i-moon'} />
                <span className="lbl">{tema === 'dark' ? 'Claro' : 'Oscuro'}</span>
              </button>
            </div>
          </header>

          <div className="content">
            {error && (
              <div className="carga">
                <div className="ban err" role="alert"><Icono id="i-info" /><div><b>{error}</b> Revisa que esté corriendo en otra terminal:</div></div>
                <code>python -m uvicorn app.backend.main:app --port 8000</code>
              </div>
            )}
            {!error && !listo && <div className="carga">Cargando clientes y calificándolos con el modelo…</div>}

            {listo && (
              <>
                <div className="ban" role="note">
                  <Icono id="i-info" />
                  <div>
                    <b>Datos reales.</b> {datos.clientes.length.toLocaleString('en-US')} clientes del conjunto de prueba
                    (el modelo no los vio al entrenar), calificados por el {modelo.modelo}.
                  </div>
                </div>
                {escenario > 0 && vista !== 't4' && (
                  <div className="scn" role="status">
                    <Icono id="i-spark" />
                    <span>Escenario de retención activo: <b>riesgo de abandono −{escenario}%</b>. Las vistas 1 a 3 ya lo incluyen.</span>
                  </div>
                )}
                {vista === 't1' && <VistaTendencias {...props} setEscenario={setEscenario} msCarga={msCarga} />}
                {vista === 't2' && <VistaSegmentos {...props} />}
                {vista === 't3' && <VistaRiesgo {...props} filtros={filtros} setFiltros={setFiltros} />}
                {vista === 't4' && <VistaEvaluar modelo={modelo} />}
              </>
            )}
          </div>
        </div>
      </div>

      {abierto && <DetalleCliente cliente={abierto} cerrar={cerrarDetalle} {...props} />}
      <div className="tip" ref={tipRef} role="tooltip" hidden />
      <div className={'toast' + (aviso ? ' on' : '')} role="status" aria-live="polite">{aviso}</div>
    </>
  )
}
