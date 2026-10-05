import { datosEquipo } from '../lib/equipos'

// Siluetas genéricas en un lienzo de 44×50
const FORMAS = {
  clasico: 'M22 2 L40 9 L40 28 Q40 44 22 50 Q4 44 4 28 L4 9 Z',
  redondeado: 'M5 4 H39 V27 C39 39 31 46 22 49 C13 46 5 39 5 27 Z',
  punta: 'M4 4 Q22 8 40 4 V24 C40 35 31 42 22 49 C13 42 4 35 4 24 Z',
  corona: 'M4 11 L10 4 L16 9 L22 3 L28 9 L34 4 L40 11 V28 Q40 43 22 49 Q4 43 4 28 Z',
  circulo: 'M22 6 A20 20 0 1 1 21.99 6 Z',
  ovalo: 'M22 3 C33 3 40 13 40 26 C40 39 33 49 22 49 C11 49 4 39 4 26 C4 13 11 3 22 3 Z',
  ojiva: 'M22 2 C34 2 41 8 41 16 C41 31 32 41 22 49 C12 41 3 31 3 16 C3 8 10 2 22 2 Z',
}

// Centro vertical del texto según la forma (las de punta abajo tienen el centro visual más arriba)
const CENTRO = { circulo: 26, ovalo: 26, corona: 29 }

export default function EscudoSVG({ nombre, size = 44 }) {
  const { sigla, colores, forma } = datosEquipo(nombre)
  const [fondo, texto, acento] = colores
  const d = FORMAS[forma] || FORMAS.clasico
  const fondoClaro = ['#ffffff', '#f2f2f2'].includes(fondo)
  return (
    <svg width={size} height={size} viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d={d} fill={fondo} stroke={acento || (fondoClaro ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.2)')} strokeWidth={acento ? 2.5 : 1.5} />
      <text x="22" y={CENTRO[forma] || 28} textAnchor="middle" dominantBaseline="middle" fill={texto}
        fontSize={sigla.length > 2 ? 11.5 : 13} fontWeight="800" fontFamily="Inter,system-ui,sans-serif" letterSpacing="-0.2">{sigla}</text>
    </svg>
  )
}
