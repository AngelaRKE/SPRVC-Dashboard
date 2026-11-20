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
import AcercaDe from './componentes/AcercaDe'
import { CLAVE_VISTO, iniciarTutorial } from './tutorial'

const VISTAS = [
  { id: 't1', titulo: 'Tendencias predictivas', corto: 'Tendencias', para: 'Dirección Comercial, Ventas' },
  { id: 't2', titulo: 'Segmentos', corto: 'Segmentos', para: 'Marketing' },
  { id: 't3', titulo: 'Clientes en riesgo', corto: 'En riesgo', para: 'Marketing, Servicio al Cliente' },
  { id: 't4', titulo: 'Evaluar un cliente', corto: 'Evaluar', para: 'Todas las áreas' },
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
  const [acerca, setAcerca] = useState(false)            // panel Acerca de
  const [menuAyuda, setMenuAyuda] = useState(false)      // menú desplegable del botón Ayuda
  const [guia, setGuia] = useState(false)                // guía rápida (alternativa al tutorial)
  const [invitar, setInvitar] = useState(false)          // invitación al tutorial la primera vez
  const [tema, setTema] = useState(() => {
    try { return localStorage.getItem('sprvc-tema') || 'dark' } catch { return 'dark' }
  })

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

  // Al cambiar de vista se regresa al inicio de la página
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [vista])

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

  const cerrarDetalle = useCallback(() => setAbierto(null), [])
  const cerrarAcerca = useCallback(() => setAcerca(false), [])
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

  const props = { datos, modelo, f, escenario, estrella, abrir: setAbierto }

  // La primera vez que se abre el dashboard se invita a ver el tutorial
  useEffect(() => {
    if (!listo) return
    try { if (!localStorage.getItem(CLAVE_VISTO)) setInvitar(true) } catch { /* sin almacenamiento */ }
  }, [listo])

  function verTutorial() {
    setInvitar(false)
    setMenuAyuda(false)
    setGuia(false)
    iniciarTutorial({ datos, modelo, setVista, setFiltros, setEscenario, setAbierto })
  }

  // El menú de Ayuda se cierra al hacer clic fuera de él o con Escape
  const menuRef = useRef(null)
  useEffect(() => {
    if (!menuAyuda) return
    const fuera = (e) => { if (!menuRef.current?.contains(e.target)) setMenuAyuda(false) }
    const tecla = (e) => { if (e.key === 'Escape') setMenuAyuda(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla) }
  }, [menuAyuda])

  function abrirGuia() {
    setMenuAyuda(false)
    setGuia(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function imprimir() {
    setMenuAyuda(false)
    setTimeout(() => window.print(), 50)
  }

  function noVerTutorial() {
    setInvitar(false)
    try { localStorage.setItem(CLAVE_VISTO, '1') } catch { /* sin almacenamiento */ }
  }


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
                  <span className="nt">
                    <span className="lg-n">{v.titulo}</span><span className="sh-n">{v.corto}</span>
                    <span className="ns">{v.para}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <h1>{actual.titulo}</h1>
            <div className="acts">
              <div className="ayw" ref={menuRef}>
                <button className="ib" type="button" aria-label="Ayuda" aria-haspopup="menu" aria-expanded={menuAyuda} onClick={() => setMenuAyuda((v) => !v)}>
                  <Icono id="i-help" /><span className="lbl">Ayuda</span><Icono id="i-chevd" className="i chv-s" />
                </button>
                {menuAyuda && (
                  <div className="menu" role="menu">
                    <button type="button" role="menuitem" disabled={!listo} onClick={verTutorial}>
                      <Icono id="i-play" /><span><b>Ver tutorial</b><small>Recorrido guiado de 1 minuto</small></span>
                    </button>
                    <button type="button" role="menuitem" onClick={abrirGuia}>
                      <Icono id="i-help" /><span><b>Guía rápida</b><small>Qué hace cada vista</small></span>
                    </button>
                    <button type="button" role="menuitem" onClick={imprimir}>
                      <Icono id="i-print" /><span><b>Imprimir esta vista</b><small>O guardarla como PDF</small></span>
                    </button>
                  </div>
                )}
              </div>
              {listo && (
                <button className="ib" type="button" aria-label="Acerca de" onClick={() => setAcerca(true)}>
                  <Icono id="i-info" /><span className="lbl">Acerca de</span>
                </button>
              )}
              <button className="ib" type="button" aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')}>
                <Icono id={tema === 'dark' ? 'i-sun' : 'i-moon'} />
                <span className="lbl">{tema === 'dark' ? 'Claro' : 'Oscuro'}</span>
              </button>
            </div>
          </header>

          <div className="content">
            {guia && (
              <section className="help" aria-label="Guía rápida">
                <div className="help-h">
                  <h2>Guía rápida</h2>
                  <button className="x" type="button" aria-label="Cerrar guía" onClick={() => setGuia(false)}><Icono id="i-x" /></button>
                </div>
                <ol>
                  <li><b>Tendencias predictivas:</b> consulta el ingreso esperado y prueba escenarios de retención.</li>
                  <li><b>Segmentos:</b> identifica qué grupos concentran clientes e ingresos.</li>
                  <li><b>Clientes en riesgo:</b> filtra, abre un cliente y exporta la lista en CSV.</li>
                  <li><b>Evaluar un cliente:</b> captura los datos de un cliente y obtén la predicción del modelo.</li>
                </ol>
                {listo && <button className="ib" type="button" onClick={verTutorial}><Icono id="i-play" />Ver el tutorial completo</button>}
              </section>
            )}
            {error && (
              <div className="carga">
                <div className="ban err" role="alert"><Icono id="i-info" /><div><b>{error}</b> Revisa que esté corriendo en otra terminal:</div></div>
                <code>python -m uvicorn app.backend.main:app --port 8000</code>
              </div>
            )}
            {!error && !listo && <div className="carga">Cargando clientes y calificándolos con el modelo…</div>}

            {listo && (
              <>
                {escenario > 0 && vista !== 't4' && (
                  <div className="scn" role="status">
                    <Icono id="i-spark" />
                    <span>Escenario activo: <b>riesgo de abandono −{escenario}%</b></span>
                    <button className="ib scn-x" type="button" onClick={() => setEscenario(0)}>Quitar</button>
                  </div>
                )}
                {vista === 't1' && <VistaTendencias {...props} setEscenario={setEscenario} />}
                {vista === 't2' && <VistaSegmentos {...props} />}
                {vista === 't3' && <VistaRiesgo {...props} filtros={filtros} setFiltros={setFiltros} />}
                {vista === 't4' && <VistaEvaluar />}
              </>
            )}
          </div>
        </div>
      </div>

      {acerca && <AcercaDe cerrar={cerrarAcerca} datos={datos} modelo={modelo} msCarga={msCarga} />}
      {abierto && <DetalleCliente cliente={abierto} cerrar={cerrarDetalle} {...props} />}
      <div className="tip" ref={tipRef} role="tooltip" hidden />
      {invitar && (
        <aside className="invita" role="dialog" aria-label="Invitación al tutorial">
          <b>¿Primera vez aquí?</b>
          <p>Te mostramos en un minuto cómo usar el dashboard.</p>
          <div>
            <button className="btn" type="button" onClick={verTutorial}><Icono id="i-play" />Ver tutorial</button>
            <button className="ib" type="button" onClick={noVerTutorial}>Ahora no</button>
          </div>
        </aside>
      )}
    </>
  )
}
