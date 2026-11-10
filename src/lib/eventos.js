// Un evento se da por terminado 4 horas después de su hora de inicio (hora de Bogotá).
// Sin hora confirmada se toma el final de ese día. Misma regla que api/_lib/eventos.js.
export const HORAS_DESPUES = 4

export function terminado(e, ahora = Date.now()) {
  if (!e?.fecha) return false
  const hora = /^\d{1,2}:\d{2}/.test(String(e.hora || '')) ? String(e.hora).padStart(5, '0').slice(0, 5) : '23:59'
  return new Date(`${e.fecha}T${hora}:00-05:00`).getTime() + HORAS_DESPUES * 3600e3 < ahora
}
