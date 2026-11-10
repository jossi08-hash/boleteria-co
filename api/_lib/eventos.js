import { supa } from './pagos.js'

// Un evento se da por terminado 4 horas después de su hora de inicio (hora de Bogotá).
// Sin hora confirmada se toma el final de ese día. Misma regla que src/lib/eventos.js.
export const HORAS_DESPUES = 4

export function terminado(e, ahora = Date.now()) {
  if (!e?.fecha) return false
  const hora = /^\d{1,2}:\d{2}/.test(String(e.hora || '')) ? String(e.hora).padStart(5, '0').slice(0, 5) : '23:59'
  return new Date(`${e.fecha}T${hora}:00-05:00`).getTime() + HORAS_DESPUES * 3600e3 < ahora
}

export function diaBogota(desplazarDias = 0) {
  return new Date(Date.now() - 5 * 3600e3 + desplazarDias * 864e5).toISOString().slice(0, 10)
}

// Eventos recientes (últimos 30 días hasta hoy) que ya terminaron
export async function eventosTerminados() {
  const res = await supa(`eventos?fecha=gte.${diaBogota(-30)}&fecha=lte.${diaBogota()}&select=id,nombre,ciudad,fecha,hora`)
  const lista = res.ok ? await res.json() : []
  return lista.filter(e => terminado(e))
}

// Oculta las boletas que siguen a la venta en eventos terminados (no toca vendidas ni reservas en curso)
export async function ocultarTerminados(terminados) {
  const lista = terminados || await eventosTerminados()
  if (!lista.length) return 0
  const ahora = new Date().toISOString()
  const res = await supa(
    `boletas?evento_id=in.(${lista.map(e => e.id).join(',')})` +
    `&or=(estado.in.(publicada,verificando),and(estado.eq.reservada,reservada_hasta.lt.${ahora}))&select=id`,
    { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ estado: 'oculta' }) }
  )
  const filas = res.ok ? await res.json().catch(() => []) : []
  return Array.isArray(filas) ? filas.length : 0
}
