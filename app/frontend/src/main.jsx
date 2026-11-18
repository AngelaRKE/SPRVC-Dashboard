// Punto de entrada: monta el componente App dentro de <div id="root"> de index.html
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './estilos.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
