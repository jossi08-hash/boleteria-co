import { useMemo, useState } from 'react'
import EscudoSVG from '../componentes/EscudoSVG'
import { extraerEquipos } from '../lib/equipos'
import { esArtistico } from '../lib/categorias'
import AnilloBoletas from './AnilloBoletas'
import { FOTOS_ANILLO } from './fotos'
import './inicio.css'

const esArtisticoInfo = (info) => esArtistico(info?.deporte)

const PREGUNTAS = [
  { q: '¿Cómo sé que no me estafan?', a: 'Tu dinero queda en custodia con Boletería CO hasta que tú confirmes que recibiste la boleta. Solo después de tu confirmación el vendedor cobra. Si algo sale mal, tocas "Tengo un problema" antes de 72 horas y congelamos el pago mientras lo revisamos.' },
  { q: '¿Cómo llega la boleta?', a: 'Depende de la plataforma: en TuBoletaPass, Quentro y Ticketmaster te la transferimos por correo electrónico; en W Arena y DIM Plus por número de documento. Antes de pagar te mostramos exactamente qué necesitas.' },
  { q: '¿Cuánto demora?', a: 'En la mayoría de casos menos de 24 horas. Cuando tu pago se confirma, el vendedor recibe una notificación inmediata para transferirte la boleta.' },
  { q: '¿Cuánto cobra Boletería CO?', a: 'Al comprador se le suma aproximadamente un 15% sobre el precio publicado (redondeado a los $1.000 más cercanos) y ve el total exacto antes de pagar. Al vendedor se le retiene un 8% del precio de venta. Publicar es gratis.' },
]

const PASOS = [
  { t: 'Pagas', d: 'Con Wompi. Ves el total exacto antes.' },
  { t: 'Guardamos tu plata', d: 'El vendedor todavía no la recibe.' },
  { t: 'Llega tu boleta', d: 'Por la app oficial del evento.' },
  { t: 'Confirmas', d: 'O pasan 72 horas sin reclamo.' },
  { t: 'Cobra el vendedor', d: 'Precio de venta menos 8%.' },
]

function fechaPartes(info) {
  if (!info?.fecha) return null
  const f = new Date(info.fecha + 'T12:00:00')
  return {
    dia: f.getDate(),
    mes: f.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
    semana: f.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', ''),
    hora: info.hora ? info.hora.slice(0, 5) : '',
  }
}

// Fecha ilustrativa: el sábado de dentro de dos o tres semanas
function fechaEjemplo() {
  const f = new Date()
  f.setDate(f.getDate() + 14 + ((6 - f.getDay() + 7) % 7))
  const p = fechaPartes({ fecha: f.toLocaleDateString('en-CA') })
  return `${p.semana} ${p.dia} ${p.mes}`
}

function IconoLupa() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20l-4.6-4.6" />
    </svg>
  )
}

function IconoFlecha() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export default function Inicio({
  boletas, eventos, cargando,
  busqueda, setBusqueda, filtros, setFiltros,
  calcularTotal, abrirEvento, venderParaEvento, onVender, irA,
}) {
  const [pestana, setPestana] = useState('deportivos')
  const [abierta, setAbierta] = useState(null)

  const hoy = new Date().toLocaleDateString('en-CA')

  // Eventos agrupados con sus boletas, igual que el listado anterior
  const todos = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const coincide = (info) => {
      if (filtros.ciudad && (info?.ciudad || '').toLowerCase() !== filtros.ciudad.toLowerCase()) return false
      if (q && !(info?.nombre || '').toLowerCase().includes(q) && !(info?.ciudad || '').toLowerCase().includes(q)) return false
      return true
    }
    const mapa = {}
    boletas.forEach(b => {
      if (b.estado !== 'publicada' || !coincide(b.eventos)) return
      const eid = String(b.evento_id || b.eventos?.id || b.id)
      if (!mapa[eid]) mapa[eid] = { info: b.eventos, boletas: [] }
      mapa[eid].boletas.push(b)
    })
    const sinBoletas = eventos
      .filter(ev => ev.fecha && ev.fecha >= hoy && !mapa[String(ev.id)] && coincide(ev))
      .map(ev => [String(ev.id), { info: ev, boletas: [], sinBoletas: true }])
    return [...Object.entries(mapa), ...sinBoletas]
      .sort((a, b) => `${a[1].info?.fecha || ''} ${a[1].info?.hora || ''}`.localeCompare(`${b[1].info?.fecha || ''} ${b[1].info?.hora || ''}`))
  }, [boletas, eventos, busqueda, filtros.ciudad, hoy])

  const deportivos = todos.filter(([, ev]) => !esArtisticoInfo(ev.info))
  const artisticos = todos.filter(([, ev]) => esArtisticoInfo(ev.info))
  const lista = pestana === 'deportivos' ? deportivos : artisticos
  const ciudades = [...new Set(boletas.map(b => b.eventos?.ciudad).filter(Boolean))]

  // Próximos eventos para la marquesina
  const proximos = eventos
    .filter(ev => ev.fecha && ev.fecha >= hoy)
    .sort((a, b) => `${a.fecha} ${a.hora || ''}`.localeCompare(`${b.fecha} ${b.hora || ''}`))
    .slice(0, 5)
  const marquesina = [
    ...proximos.map(ev => {
      const p = fechaPartes(ev)
      return `${ev.nombre} · ${p.semana} ${p.dia} ${p.mes}${ev.ciudad ? ' · ' + ev.ciudad : ''}`
    }),
    'Tu plata queda en custodia hasta que recibes la boleta',
    'Solo cesión oficial: TuBoletaPass · Quentro · W Arena · DIM Plus · Ticketmaster',
  ]

  // Boleta de ejemplo: el próximo evento con boletas, si existe
  const muestra = deportivos.find(([, ev]) => !ev.sinBoletas)
  const muestraInfo = muestra?.[1].info
  const muestraBoleta = muestra?.[1].boletas.reduce((m, b) => (Number(b.precio) < Number(m.precio) ? b : m))
  const muestraFecha = fechaPartes(muestraInfo)
  // Sin boletas publicadas, la boleta de ejemplo usa datos ilustrativos (marcados como ejemplo)
  const ejemplo = {
    nombre: muestraInfo?.nombre || 'Millonarios vs Nacional',
    lugar: [muestraInfo?.estadio, muestraInfo?.ciudad].filter(Boolean).join(' · ') || 'El Campín · Bogotá',
    tribuna: muestraBoleta?.tribuna || 'Oriental',
    fecha: muestraFecha ? `${muestraFecha.dia} ${muestraFecha.mes}` : fechaEjemplo(),
    total: calcularTotal(muestraBoleta ? muestraBoleta.precio : 160000, muestraInfo?.moneda || 'COP'),
  }

  function buscar(e) {
    e.preventDefault()
    const otra = pestana === 'deportivos' ? artisticos : deportivos
    if (busqueda.trim() && lista.length === 0 && otra.length > 0) setPestana(pestana === 'deportivos' ? 'artisticos' : 'deportivos')
    document.getElementById('partidos')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="ini">
      {/* ── PRIMERA PANTALLA ── */}
      <section className="ini-hero">
        <div className="ini-marquesina" aria-hidden="true">
          <div className="ini-marquesina-pista">
            {[0, 1].map(k => (
              <span key={k}>
                {marquesina.map((m, i) => (
                  <span key={i} className="ini-marquesina-item">
                    {m}
                    <svg viewBox="0 0 12 12" width="12" height="12"><path d="M6 0l1.4 4.6L12 6l-4.6 1.4L6 12l-1.4-4.6L0 6l4.6-1.4z" fill="currentColor" /></svg>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <div className="ini-hero-texto">
          <h1 className="ini-titular">
            <span className="ini-linea"><span>Primero la boleta.</span></span>
            <span className="ini-linea"><span>Después la plata.</span></span>
          </h1>
          <p className="ini-bajada">
            Reventa de boletas para fútbol y conciertos en Colombia. Tu plata queda en custodia
            hasta que la boleta llega a tu app.
          </p>
          <form className="ini-buscador" role="search" onSubmit={buscar}>
            <label htmlFor="ini-q" className="ini-oculto">Buscar evento</label>
            <span className="ini-buscador-icono"><IconoLupa /></span>
            <input
              id="ini-q" type="search" autoComplete="off"
              placeholder="Equipo, artista o ciudad"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
            />
            <button type="submit" className="ini-boton ini-boton-tinta">Buscar</button>
          </form>
          <div className="ini-acciones">
            <button type="button" className="ini-boton ini-boton-borde" onClick={() => venderParaEvento('')}>Vender mi boleta</button>
            <button type="button" className="ini-enlace-suave" onClick={() => irA('como-funciona')}>Cómo funciona</button>
          </div>
        </div>

        <div className="ini-escena">
          <AnilloBoletas />
          <article className="ini-boleta-muestra" aria-label="Ejemplo de una compra en custodia">
            <div className="ini-muestra-cuerpo">
              <p className="ini-muestra-evento">{ejemplo.nombre}</p>
              <p className="ini-muestra-lugar">{ejemplo.lugar}</p>
              <dl className="ini-muestra-datos">
                <div><dt>Tribuna</dt><dd>{ejemplo.tribuna}</dd></div>
                <div><dt>Fecha</dt><dd>{ejemplo.fecha}</dd></div>
                <div><dt>Total</dt><dd className="ini-cifra">{ejemplo.total}</dd></div>
              </dl>
              <p className="ini-muestra-pie">Boleta de muestra · datos ilustrativos</p>
            </div>
            <div className="ini-muestra-talon">
              <span className="ini-sello">En<br />custodia</span>
              <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
                <filter id="ini-tinta">
                  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="ruido" />
                  <feColorMatrix in="ruido" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.5" result="huecos" />
                  <feComposite in="SourceGraphic" in2="huecos" operator="in" result="tinta" />
                  <feDisplacementMap in="tinta" in2="ruido" scale="1.6" />
                </filter>
              </svg>
              <p>Se libera cuando confirmas o a las 72 h</p>
            </div>
          </article>
        </div>
      </section>

      {/* ── EVENTOS ── */}
      <section className="ini-eventos" id="partidos">
        <div className="ini-contenido">
          <div className="ini-pestanas" role="tablist" aria-label="Tipo de evento">
            {[['deportivos', 'Deportivos', deportivos.length], ['artisticos', 'Artísticos', artisticos.length]].map(([id, nombre, n]) => (
              <button
                key={id} role="tab" id={`tab-${id}`} aria-controls="ini-lista" aria-selected={pestana === id}
                className="ini-pestana" onClick={() => setPestana(id)}
              >
                {nombre}<span className="ini-pestana-n">{n}</span>
              </button>
            ))}
          </div>

          <div className="ini-filtros">
            {ciudades.length > 1 && (
              <select aria-label="Ciudad" value={filtros.ciudad} onChange={e => setFiltros(f => ({ ...f, ciudad: e.target.value }))}>
                <option value="">Todas las ciudades</option>
                {ciudades.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {(filtros.ciudad || busqueda) && (
              <button type="button" className="ini-limpiar" onClick={() => { setFiltros(f => ({ ...f, ciudad: '' })); setBusqueda('') }}>
                Limpiar búsqueda
              </button>
            )}
            {pestana === 'deportivos' && (cargando || lista.length > 0) && (
              <button type="button" className="ini-boton ini-boton-fucsia" onClick={onVender}>Vender una boleta</button>
            )}
          </div>

          <div id="ini-lista" role="tabpanel" aria-labelledby={`tab-${pestana}`}>
            {cargando && <p className="ini-estado">Cargando eventos…</p>}

            {!cargando && lista.length === 0 && pestana === 'deportivos' && (
              <div className="ini-vacio">
                <p className="ini-vacio-titulo">{busqueda || filtros.ciudad ? 'Nada con esa búsqueda.' : 'Aún no hay partidos publicados.'}</p>
                <p>{busqueda || filtros.ciudad ? 'Prueba con otro equipo o ciudad.' : 'Publica tu boleta en minutos y llega a compradores en toda Colombia.'}</p>
                <button type="button" className="ini-boton ini-boton-fucsia" onClick={onVender}>Publicar mi boleta</button>
              </div>
            )}

            {!cargando && lista.length === 0 && pestana === 'artisticos' && (
              <div className="ini-pronto">
                <div className="ini-pronto-texto">
                  <p className="ini-pronto-titulo">Conciertos, teatro, festivales y stand-up.</p>
                  <p>
                    Estamos habilitando la reventa de boletas para eventos artísticos con el mismo sistema:
                    tu plata en custodia hasta que la boleta llegue. Si tienes una boleta para un show,
                    escríbenos a <a href="mailto:soporte@boleteriaco.com">soporte@boleteriaco.com</a>.
                  </p>
                </div>
                <div className="ini-pronto-fotos" aria-hidden="true">
                  {FOTOS_ANILLO.filter(f => ['Urbano', 'Rock', 'Pop', 'Reguetón', 'K-pop'].includes(f.etiqueta)).slice(0, 5).map((f, i) => (
                    <div key={f.src} className="ini-anillo-boleta ini-pronto-boleta">
                      <img src={f.src} alt="" loading="lazy" style={{ objectPosition: f.pos }} />
                      <span className="ini-anillo-talon">
                        <span>{f.etiqueta}</span>
                        <span className="ini-anillo-serie">Pronto · Nº {String(2210 + i * 53).padStart(5, '0')}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!cargando && lista.length > 0 && (
              <ol className="ini-lista">
                {lista.map(([eid, ev]) => {
                  const info = ev.info
                  const p = fechaPartes(info)
                  const precios = ev.boletas.map(b => Number(b.precio)).filter(x => x > 0)
                  const esAdminEv = ev.boletas.some(b => b.publicada_por_admin === true || b.usuarios?.es_admin === true)
                  const [e1, e2] = esArtisticoInfo(info) ? [] : extraerEquipos(info?.nombre || '')
                  const abrir = () => (ev.sinBoletas ? venderParaEvento(eid) : abrirEvento(eid, ev))
                  return (
                    <li key={eid}>
                      <button type="button" className={`ini-fila${ev.sinBoletas ? ' es-vacia' : ''}`} onClick={abrir}>
                        <span className="ini-fila-fecha">
                          {p ? <>
                            <span className="ini-fila-semana">{p.semana}</span>
                            <span className="ini-fila-dia">{p.dia}</span>
                            <span className="ini-fila-mes">{p.mes}{p.hora && <> · {p.hora}</>}</span>
                          </> : <span className="ini-fila-mes">Por definir</span>}
                        </span>
                        <span className="ini-fila-centro">
                          {e1 && (
                            <span className="ini-fila-escudos" aria-hidden="true">
                              <EscudoSVG nombre={e1} size={40} />
                              {e2 && <EscudoSVG nombre={e2} size={40} />}
                            </span>
                          )}
                          <span className="ini-fila-textos">
                            <span className="ini-fila-nombre">{info?.nombre || 'Evento'}</span>
                            <span className="ini-fila-lugar">{[info?.estadio, info?.ciudad].filter(Boolean).join(' · ')}</span>
                          </span>
                        </span>
                        <span className="ini-fila-precio">
                          {ev.sinBoletas ? (
                            <>
                              <span className="ini-fila-sin">Sin boletas aún</span>
                              <span className="ini-fila-accion">Vende la tuya</span>
                            </>
                          ) : (
                            <>
                              <span className="ini-fila-desde">desde</span>
                              <span className="ini-fila-valor ini-cifra">{calcularTotal(Math.min(...precios), info?.moneda || 'COP', esAdminEv)}</span>
                              <span className="ini-fila-n">{ev.boletas.length} disponible{ev.boletas.length !== 1 ? 's' : ''}</span>
                            </>
                          )}
                        </span>
                        <span className="ini-fila-flecha"><IconoFlecha /></span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </div>
      </section>

      {/* ── CUSTODIA ── */}
      <section className="ini-custodia">
        <div className="ini-contenido">
          <h2 className="ini-h2">Así viaja tu plata</h2>
          <ol className="ini-tira">
            {PASOS.map((paso, i) => (
              <li key={paso.t} className={i === 1 ? 'es-custodia' : ''}>
                <span className="ini-tira-t">{paso.t}</span>
                <span className="ini-tira-d">{paso.d}</span>
              </li>
            ))}
          </ol>
          <div className="ini-hechos">
            <p><strong>Revisamos cada publicación</strong> antes de mostrarla.</p>
            <p><strong>Solo cesión oficial</strong> desde TuBoletaPass, Quentro, W Arena, DIM Plus y Ticketmaster. Sin capturas ni PDF.</p>
            <p><strong>Precio claro:</strong> el comprador paga cerca de 15% sobre el precio publicado y ve el total antes; el vendedor publica gratis y paga 8% al vender.</p>
          </div>
          <button type="button" className="ini-enlace" onClick={() => irA('como-funciona')}>
            Ver paso a paso para comprar y vender <IconoFlecha />
          </button>
        </div>
      </section>

      {/* ── PREGUNTAS ── */}
      <section className="ini-preguntas">
        <div className="ini-contenido ini-contenido-angosto">
          <h2 className="ini-h2">Preguntas frecuentes</h2>
          {PREGUNTAS.map(({ q, a }, i) => (
            <div key={q} className="ini-pregunta">
              <button type="button" aria-expanded={abierta === i} aria-controls={`ini-r-${i}`} onClick={() => setAbierta(abierta === i ? null : i)}>
                <span>{q}</span>
                <span className="ini-mas" aria-hidden="true" />
              </button>
              <div id={`ini-r-${i}`} className="ini-respuesta" hidden={abierta !== i}><p>{a}</p></div>
            </div>
          ))}
        </div>
      </section>

      <footer className="ini-pie">
        <div className="ini-contenido">
          <p className="ini-pie-marca">Boletería CO</p>
          <p className="ini-pie-aviso">
            Boletería CO es un sitio de reventa entre personas. No es la boletería oficial de los eventos
            ni está asociado con los artistas, equipos u organizadores.
          </p>
          <nav className="ini-pie-enlaces" aria-label="Enlaces legales">
            <button type="button" onClick={() => irA('como-funciona')}>Cómo funciona</button>
            <a href="/terminos.html" target="_blank" rel="noreferrer">Términos y condiciones</a>
            <button type="button" onClick={() => irA('privacidad')}>Política de privacidad</button>
            <button type="button" onClick={() => irA('creditos')}>Créditos</button>
            <a href="mailto:soporte@boleteriaco.com">soporte@boleteriaco.com</a>
          </nav>
          <p className="ini-pie-creditos">© 2026 Boletería CO · Bogotá</p>
        </div>
      </footer>
    </div>
  )
}
