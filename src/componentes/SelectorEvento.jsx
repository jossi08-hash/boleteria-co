import { useMemo, useState } from 'react'
import EscudoSVG from './EscudoSVG'
import { extraerEquipos } from '../lib/equipos'
import { esArtistico } from '../lib/categorias'
import '../estilo/selector-evento.css'

// Selector de evento para publicar boletas: buscador, pestañas y eventos agrupados por día.
// Reemplaza el <select> largo, que en el celular era imposible de recorrer.

const normalizar = t => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const hoyISO = () => new Date().toLocaleDateString('en-CA')

function etiquetaDia(fecha) {
  const hoy = new Date(hoyISO() + 'T12:00:00')
  const f = new Date(fecha + 'T12:00:00')
  const dias = Math.round((f - hoy) / 864e5)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  const txt = f.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

function Fila({ ev, onElegir, elegido }) {
  const artistico = esArtistico(ev.deporte)
  const [e1, e2] = artistico ? [] : extraerEquipos(ev.nombre)
  return (
    <button type="button" className={`sel-ev-fila${elegido ? ' es-elegido' : ''}`} onClick={() => onElegir(ev.id)}>
      {e1 && (
        <span className="sel-ev-escudos" aria-hidden="true">
          <EscudoSVG nombre={e1} size={28} />
          {e2 && <EscudoSVG nombre={e2} size={28} />}
        </span>
      )}
      <span className="sel-ev-textos">
        <span className="sel-ev-nombre">{ev.nombre}</span>
        <span className="sel-ev-lugar">{[ev.hora?.slice(0, 5), ev.estadio, ev.ciudad].filter(Boolean).join(' · ')}</span>
      </span>
    </button>
  )
}

export default function SelectorEvento({ eventos, value, onChange }) {
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('deportivos')
  const [abierto, setAbierto] = useState(!value)

  const proximos = useMemo(() => {
    const hoy = hoyISO()
    return eventos
      .filter(ev => ev.fecha && ev.fecha >= hoy)
      .sort((a, b) => `${a.fecha} ${a.hora || ''}`.localeCompare(`${b.fecha} ${b.hora || ''}`))
  }, [eventos])

  const deportivos = proximos.filter(ev => !esArtistico(ev.deporte))
  const artisticos = proximos.filter(ev => esArtistico(ev.deporte))
  const busqueda = normalizar(q.trim())
  // Al buscar se busca en todo; sin búsqueda se muestra la pestaña elegida
  const lista = busqueda
    ? proximos.filter(ev => normalizar(`${ev.nombre} ${ev.estadio} ${ev.ciudad}`).includes(busqueda))
    : (tipo === 'deportivos' ? deportivos : artisticos)

  const grupos = []
  lista.forEach(ev => {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.fecha === ev.fecha) ultimo.eventos.push(ev)
    else grupos.push({ fecha: ev.fecha, eventos: [ev] })
  })

  const elegido = eventos.find(ev => ev.id === value)

  function elegir(id) {
    onChange(id)
    setAbierto(false)
    setQ('')
  }

  if (elegido && !abierto) {
    return (
      <div className="sel-ev-elegido">
        <Fila ev={elegido} onElegir={() => setAbierto(true)} elegido />
        <span className="sel-ev-fecha-elegida">{etiquetaDia(elegido.fecha)}</span>
        <button type="button" className="sel-ev-cambiar" onClick={() => setAbierto(true)}>Cambiar evento</button>
      </div>
    )
  }

  return (
    <div className="sel-ev">
      <div className="sel-ev-buscador">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20l-4.6-4.6" /></svg>
        <input
          type="search" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Busca equipo, artista o ciudad" aria-label="Buscar evento" autoComplete="off"
        />
      </div>

      {!busqueda && (
        <div className="sel-ev-tipos" role="tablist" aria-label="Tipo de evento">
          {[['deportivos', 'Fútbol', deportivos.length], ['artisticos', 'Conciertos', artisticos.length]].map(([id, nombre, n]) => (
            <button key={id} type="button" role="tab" aria-selected={tipo === id} onClick={() => setTipo(id)}>
              {nombre} <span>{n}</span>
            </button>
          ))}
        </div>
      )}

      <div className="sel-ev-lista">
        {grupos.length === 0 && (
          <p className="sel-ev-vacio">
            {busqueda ? 'No encontramos eventos con esa búsqueda.' : 'No hay eventos próximos en esta categoría.'}
            {' '}Si tu evento no aparece, escríbenos a soporte@boleteriaco.com.
          </p>
        )}
        {grupos.map(g => (
          <div key={g.fecha} className="sel-ev-grupo">
            <p className="sel-ev-dia">{etiquetaDia(g.fecha)}</p>
            {g.eventos.map(ev => <Fila key={ev.id} ev={ev} onElegir={elegir} elegido={ev.id === value} />)}
          </div>
        ))}
      </div>

      {elegido && (
        <button type="button" className="sel-ev-cambiar" onClick={() => setAbierto(false)}>Mantener {elegido.nombre}</button>
      )}
    </div>
  )
}
