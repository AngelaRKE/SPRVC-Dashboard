// Tutorial guiado del dashboard, hecho con driver.js (https://driverjs.com).
// driver.js oscurece la pantalla, resalta un elemento y muestra un cuadro con la explicación.
// Como algunos pasos están en otra vista (o en el panel del cliente), cada paso tiene una función
// "antes" que prepara la pantalla; luego se espera a que React la dibuje y se muestra el paso.
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const ESPERA_MS = 250                 // tiempo para que React dibuje la vista antes de resaltar
export const CLAVE_VISTO = 'sprvc-tutorial-visto'

export function iniciarTutorial({ datos, modelo, setVista, setFiltros, setEscenario, setAbierto }) {
  const umbral = Math.round(modelo.umbral * 100)
  const filtrosGenerales = () => setFiltros({ seg: 'all', minimo: umbral, orden: 'pc' })

  // Cliente con más ingreso en juego: el que se abre en el paso del detalle
  const clienteEjemplo = datos.clientes
    .filter((c) => c.p >= modelo.umbral)
    .reduce((a, b) => (b.p * b.g > a.p * a.g ? b : a))

  const pasos = [
    {
      antes: () => { setVista('t1'); setEscenario(0); setAbierto(null); filtrosGenerales() },
      popover: {
        title: 'Recorrido rápido',
        description: `Te mostramos cómo usaría el dashboard alguien de Marketing antes de planear una campaña. Los ${datos.clientes.length.toLocaleString('en-US')} clientes ya están calificados por el modelo.`,
      },
    },
    {
      element: '.nav button:nth-child(3)',
      antes: () => { setVista('t1'); setAbierto(null) },
      popover: { title: 'Clientes en riesgo', description: 'Desde el menú entras a la lista de clientes que el modelo marca con riesgo de abandono.', side: 'right' },
    },
    {
      element: '.tool',
      antes: () => { setVista('t3'); filtrosGenerales(); setAbierto(null) },
      popover: { title: 'Filtra la lista', description: `Elige un segmento y la probabilidad mínima. Por defecto se usa el umbral del modelo: ${umbral}%.`, side: 'bottom' },
    },
    {
      element: '.tw tbody tr:first-child',
      antes: () => { setVista('t3'); setAbierto(null) },
      popover: { title: 'Lista priorizada', description: 'Arriba quedan los clientes con más ingreso en juego: lo que se perdería el próximo trimestre si se van.', side: 'bottom' },
    },
    {
      element: '.dr',
      antes: () => { setVista('t3'); setAbierto(clienteEjemplo) },
      popover: { title: 'Detalle del cliente', description: 'Al abrir un cliente ves su riesgo, las acciones de retención sugeridas y los factores que más lo empujan.', side: 'left' },
    },
    {
      element: '.tool .btn',
      antes: () => { setVista('t3'); setAbierto(null) },
      popover: { title: 'Exporta la lista', description: 'Descarga en CSV todos los clientes que cumplen los filtros, no solo los que se ven en pantalla.', side: 'bottom' },
    },
    {
      element: '#scard',
      antes: () => { setAbierto(null); setVista('t1'); setEscenario(15) },
      popover: { title: 'Mide el efecto de una campaña', description: 'Si la campaña reduce el riesgo 15%, aquí ves cuánto ingreso se protege. Todo el dashboard se recalcula.', side: 'left' },
    },
    {
      antes: () => { setVista('t1') },
      popover: { title: '¡Listo!', description: 'Puedes repetir este recorrido cuando quieras desde el botón Ayuda.' },
    },
  ]

  // Ejecuta "antes" del paso i y, cuando React ya dibujó la pantalla, lo muestra
  const irA = (d, i) => {
    pasos[i].antes()
    setTimeout(() => d.drive(i), ESPERA_MS)
  }

  const d = driver({
    steps: pasos.map(({ element, popover }) => ({ element, popover })),
    showProgress: true,
    progressText: '{{current}} de {{total}}',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Anterior',
    doneBtnText: 'Terminar',
    popoverClass: 'sprvc-tour',
    stagePadding: 6,
    stageRadius: 14,
    overlayOpacity: 0.6,
    onNextClick: () => {
      const i = d.getActiveIndex() + 1
      if (i >= pasos.length) d.destroy()
      else irA(d, i)
    },
    onPrevClick: () => irA(d, Math.max(0, d.getActiveIndex() - 1)),
    // Al cerrar (Terminar, Esc o clic fuera) se deja el dashboard como estaba al inicio
    onDestroyed: () => { setEscenario(0); setAbierto(null); filtrosGenerales(); setVista('t1') },
  })

  try { localStorage.setItem(CLAVE_VISTO, '1') } catch { /* sin almacenamiento */ }
  irA(d, 0)
}
