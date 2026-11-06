// Lógica de la hoja del socio (Google Sheets → boletas propias). Sin red: solo decide qué hacer.
// El endpoint api/hoja-socio.js la usa y luego escribe en Supabase.

// Partidos de estos equipos se venden con fila y silla. El resto, por cantidad.
const EQUIPOS_NUMERADOS = ['santa fe', 'millonarios', 'atletico nacional', 'independiente medellin', 'america de cali', 'colombia']

export const NO_NUMERADA = 'No Numerada'
export const MAX_POR_TRIBUNA = 300
export const ESTADOS_SOCIO = ['Disponible', 'Vendida por fuera', 'Retirada']

export function normalizar(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function esNumerado(evento) {
  if (normalizar(evento?.deporte) !== 'futbol') return false
  const nombre = normalizar(evento?.nombre)
  return EQUIPOS_NUMERADOS.some(eq => new RegExp(`(^|[^a-z])${eq}([^a-z]|$)`).test(nombre))
}

export function esNoNumerada(b) {
  return /^(no numerada|n\/?a|-|)$/.test(normalizar(b?.silla))
}

export function reservadaActiva(b, ahora) {
  return b.estado === 'reservada' && !!b.reservada_hasta && new Date(b.reservada_hasta) >= ahora
}

// Se puede vender ya: publicada, o reservada con la reserva vencida.
export function disponible(b, ahora) {
  return b.estado === 'publicada' || (b.estado === 'reservada' && !reservadaActiva(b, ahora))
}

export function vendidaWeb(b) {
  return b.estado === 'vendida' && (b.ordenes || []).some(o => o.estado_pago === 'pagada')
}

// Tribuna escrita en la hoja → nombre exacto del evento (null si no existe)
export function tribunaDelEvento(evento, tribuna) {
  const t = normalizar(tribuna)
  if (!t) return null
  const lista = Array.isArray(evento?.tribunas) ? evento.tribunas : []
  if (lista.length === 0) return String(tribuna).trim()
  return lista.find(x => normalizar(x) === t) || null
}

export function precioValido(p) {
  const n = Number(String(p ?? '').replace(/[$.\s]/g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 1000 && n <= 50_000_000 ? Math.round(n) : null
}

export function cantidadValida(q) {
  if (q === '' || q === null || q === undefined) return null
  const n = Number(q)
  return Number.isInteger(n) && n >= 0 ? n : null
}

// Resumen de una tribuna por cantidad
export function resumenCantidad(boletas, ahora) {
  return {
    quedan: boletas.filter(b => disponible(b, ahora) || reservadaActiva(b, ahora)).length,
    pagando: boletas.filter(b => reservadaActiva(b, ahora)).length,
    vendidasWeb: boletas.filter(vendidaWeb).length,
  }
}

// Tribuna por cantidad. "base" es lo que la hoja mostraba en la última sincronización:
// si en la web se vendieron boletas mientras tanto, solo se aplica lo que el socio cambió.
export function planCantidad({ boletas, quedan, base, precio, plataforma, ahora }) {
  const libres = boletas.filter(b => disponible(b, ahora))
  const { quedan: actual } = resumenCantidad(boletas, ahora)
  let objetivo = Number.isInteger(base) ? actual + (quedan - base) : quedan
  objetivo = Math.max(0, Math.min(objetivo, MAX_POR_TRIBUNA))
  const avisos = []
  let crear = 0, retirar = []
  if (objetivo > actual) crear = objetivo - actual
  if (objetivo < actual) {
    const n = actual - objetivo
    // primero las de reserva vencida, luego las más nuevas
    retirar = [...libres].sort((a, b) => (a.estado === 'reservada' ? -1 : 0) - (b.estado === 'reservada' ? -1 : 0) ||
      String(b.creado_en || '').localeCompare(String(a.creado_en || ''))).slice(0, n).map(b => b.id)
    if (retirar.length < n) avisos.push(`${n - retirar.length} se están pagando en la web ahora; si el pago falla, vuelve a intentar`)
  }
  if (Number.isInteger(base) && quedan !== base && base > actual) {
    avisos.push(`mientras editabas se vendieron ${base - actual} en la web; quedan ${objetivo}`)
  }
  const retiradas = new Set(retirar)
  const cambiarPrecio = libres.filter(b => !retiradas.has(b.id) &&
    (Number(b.precio) !== precio || (plataforma && b.plataforma !== plataforma))).map(b => b.id)
  return { crear, retirar, cambiarPrecio, objetivo, avisos }
}

// Cómo se ve una boleta numerada en la columna "En la web"
export function estadoWeb(b, ahora) {
  if (!b) return 'No publicada'
  if (vendidaWeb(b)) return 'Vendida en la web'
  if (b.estado === 'vendida') return 'Vendida por fuera'
  if (reservadaActiva(b, ahora)) return 'Pagando ahora'
  if (disponible(b, ahora)) return 'Disponible'
  if (b.estado === 'oculta') return 'Retirada'
  return 'En verificación'
}

// Boleta numerada: qué hacer según lo que el socio puso en "Estado"
export function planNumerada({ boleta, deseado, precio, plataforma, ahora }) {
  const actual = estadoWeb(boleta, ahora)
  const d = ESTADOS_SOCIO.find(e => normalizar(e) === normalizar(deseado)) || null
  const cambioPrecio = b => Number(b.precio) !== precio || (plataforma && b.plataforma !== plataforma)
  if (!d) return { accion: null, aviso: deseado ? 'Estado no válido: usa Disponible, Vendida por fuera o Retirada' : 'Elige el estado' }

  if (actual === 'Vendida en la web' || actual === 'Vendida por fuera') {
    return { accion: null, aviso: d === 'Disponible' ? 'Ya está vendida; no se puede volver a publicar' : null }
  }
  if (actual === 'Pagando ahora') {
    return { accion: null, aviso: d !== 'Disponible' ? 'Alguien la está pagando en la web; se aplica si el pago no se completa' : null }
  }
  if (d === 'Disponible') {
    if (!boleta) return { accion: 'crear' }
    if (actual !== 'Disponible') return { accion: 'publicar' }
    return { accion: cambioPrecio(boleta) ? 'precio' : null }
  }
  if (!boleta) return { accion: null }
  if (d === 'Vendida por fuera') return { accion: 'vender' }
  if (d === 'Retirada' && actual !== 'Retirada') return { accion: 'retirar' }
  return { accion: null }
}
