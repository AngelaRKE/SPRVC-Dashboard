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
  const [ayuda, setAyuda] = useState(false)
  const [recorrido, setRecorrido] = useState(null)
  const [pasoRecorrido, setPasoRecorrido] = useState(0)
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

  useEffect(() => {
    if (!recorrido) return
    const tecla = (e) => { if (e.key === 'Escape') setRecorrido(null) }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [recorrido])

  useEffect(() => {
    document.querySelectorAll('.tour-hl').forEach((x) => x.classList.remove('tour-hl'))
    if (!recorrido) return
    const objetivo = [
      null,
      '.tool',
      '.tw',
      '.dr',
      '.btn',
      '#scard',
      null,
    ][pasoRecorrido]
    if (!objetivo) return
    const elemento = document.querySelector(objetivo)
    if (elemento) {
      elemento.classList.add('tour-hl')
      if (window.getComputedStyle(elemento).position !== 'fixed') {
        setTimeout(() => elemento.scrollIntoView({ block: 'center', behavior: 'smooth' }), 80)
      }
    }
  }, [recorrido, pasoRecorrido, vista, abierto])

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

  const terminarRecorrido = useCallback(() => {
    setRecorrido(null)
    setPasoRecorrido(0)
    setEscenario(0)
    setFiltros((x) => ({ ...x, seg: 'all', minimo: modelo ? Math.round(modelo.umbral * 100) : 50, orden: 'pc' }))
    setAbierto(null)
    setVista('t1')
  }, [modelo])

  const abrirRecorrido = () => {
    setPasoRecorrido(0)
    setRecorrido(true)
  }

  const avanzarRecorrido = () => {
    const ultimo = 6
    if (pasoRecorrido >= ultimo) { terminarRecorrido(); return }
    setPasoRecorrido((x) => x + 1)
  }

  const pasosRecorrido = [
    {
      titulo: 'Ejemplo de uso del dashboard',
      texto: 'La gerente de Marketing abre el dashboard antes de planear una campaña. Los 50,000 clientes reales ya están calificados.',
    },
    {
      titulo: 'Entra a “Clientes en riesgo”',
      texto: `Selecciona todos los segmentos y usa el umbral operativo del modelo: ${modelo ? Math.round(modelo.umbral * 100) : 56}%.`,
    },
    {
      titulo: 'Revisa la lista priorizada',
      texto: 'La lista puede ordenarse por ingreso en juego, probabilidad de abandono o CLV a 12 meses.',
    },
    {
      titulo: 'Abre un cliente de la lista',
      texto: 'El panel muestra su riesgo, variables principales, CLV estimado e instrumentos de retención aplicables.',
    },
    {
      titulo: 'Exporta la lista',
      texto: 'El botón CSV exporta todos los clientes que cumplen los filtros, no solamente los que aparecen en la página.',
    },
    {
      titulo: 'Estima el efecto de una campaña',
      texto: 'En Tendencias puedes aplicar una reducción del 15% al riesgo y ver el ingreso esperado protegido.',
    },
    {
      titulo: 'Fin del recorrido',
      texto: 'Al salir, el escenario se quita y vuelven los filtros generales para comenzar una nueva revisión.',
    },
  ]

  useEffect(() => {
    if (!recorrido || !datos || !modelo) return

    if (pasoRecorrido === 0) {
      setVista('t1')
      setEscenario(0)
      setFiltros((x) => ({ ...x, seg: 'all', minimo: Math.round(modelo.umbral * 100), orden: 'pc' }))
      setAbierto(null)
    }
    if (pasoRecorrido === 1) {
      setVista('t3')
      setFiltros((x) => ({ ...x, seg: 'all', minimo: Math.round(modelo.umbral * 100), orden: 'pc' }))
      setAbierto(null)
    }
    if (pasoRecorrido === 2) setVista('t3')
    if (pasoRecorrido === 3) {
      setVista('t3')
      setFiltros((x) => ({ ...x, minimo: Math.round(modelo.umbral * 100), orden: 'pc' }))
      const candidato = datos.clientes
        .filter((c) => c.p * f >= modelo.umbral)
        .sort((a, b) => (b.p * b.g) - (a.p * a.g))[0]
      if (candidato) setAbierto(candidato)
    }
    if (pasoRecorrido === 4) {
      setAbierto(null)
      setVista('t3')
    }
    if (pasoRecorrido === 5) {
      setVista('t1')
      setEscenario(15)
    }
    if (pasoRecorrido === 6) setVista('t1')
  }, [recorrido, pasoRecorrido, datos, modelo, f])

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
              {listo && (
                <button className="ib tourb" type="button" aria-label="Ver recorrido del ejemplo de uso" onClick={abrirRecorrido}>
                  <Icono id="i-play" /><span className="lbl">Ver ejemplo</span>
                </button>
              )}
              <button className="ib" type="button" aria-expanded={ayuda} aria-controls="panel-ayuda" onClick={() => setAyuda((v) => !v)}>
                <Icono id="i-help" /><span className="lbl">Ayuda</span>
              </button>
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
            {ayuda && (
              <section className="help" id="panel-ayuda" aria-label="Cómo usar el tablero">
                <h2>Cómo usar el tablero</h2>
                <ol>
                  <li><b>Tendencias predictivas:</b> consulte el ingreso esperado y pruebe escenarios de retención.</li>
                  <li><b>Segmentos:</b> identifique qué grupos concentran clientes e ingresos.</li>
                  <li><b>Clientes en riesgo:</b> filtre, abra un cliente y exporte la lista (CSV).</li>
                  <li><b>Evaluar un cliente:</b> ingrese datos y obtenga una predicción del modelo.</li>
                </ol>
                <div style={{ marginTop: 12 }}>
                  <button className="ib" type="button" onClick={() => window.print()}>
                    <Icono id="i-print" />Imprimir esta vista
                  </button>
                </div>
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
      {recorrido && (
        <>
          <div className="tour-ov" aria-hidden="true" />
          <section className={`tour ${pasoRecorrido === 3 || pasoRecorrido === 5 ? 'tour-left' : ''}`} role="dialog" aria-modal="true" aria-labelledby="titulo-recorrido">
            <div className="tc">Paso {pasoRecorrido + 1} de {pasosRecorrido.length}</div>
            <h3 id="titulo-recorrido">{pasosRecorrido[pasoRecorrido].titulo}</h3>
            <p>{pasosRecorrido[pasoRecorrido].texto}</p>
            <div className="tb">
              <div className="dots" aria-hidden="true">
                {pasosRecorrido.map((_, i) => <i key={i} className={i === pasoRecorrido ? 'on' : ''} />)}
              </div>
              <div className="tbn">
                <button type="button" onClick={terminarRecorrido}>Salir</button>
                <button type="button" disabled={pasoRecorrido === 0} onClick={() => setPasoRecorrido((x) => Math.max(0, x - 1))}>Anterior</button>
                <button type="button" className="pr" onClick={avanzarRecorrido}>{pasoRecorrido === pasosRecorrido.length - 1 ? 'Terminar' : 'Siguiente'}</button>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  )
}
