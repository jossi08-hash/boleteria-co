import { coloresEquipo } from '../lib/equipos'

export default function EscudoSVG({nombre, size=44}) {
  const [c1,c2] = coloresEquipo(nombre)
  const ini = (nombre||'').split(/\s+/).filter(w=>w.length>2).slice(0,2).map(w=>w[0].toUpperCase()).join('')||'?'
  return (
    <svg width={size} height={size} viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
      <path d="M22 2 L40 9 L40 28 Q40 44 22 50 Q4 44 4 28 L4 9 Z" fill={c1}/>
      <path d="M22 2 L40 9 L40 28 Q40 44 22 50 Q4 44 4 28 L4 9 Z" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
      <text x="22" y="32" textAnchor="middle" dominantBaseline="middle" fill={c2} fontSize="13" fontWeight="800" fontFamily="system-ui,sans-serif" letterSpacing="-0.3">{ini}</text>
    </svg>
  )
}
