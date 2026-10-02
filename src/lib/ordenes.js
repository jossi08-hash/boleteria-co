// Estado de una orden pagada, visto desde la app

const MS_72H = 72 * 60 * 60 * 1000

// Reclamo del comprador sin resolver: congela la liberación automática del pago
export function reclamoAbierto(orden) {
  return !!orden?.reclamo_en && !orden.reclamo_resuelto_en
}

// Pago liberado al vendedor: el comprador confirmó, o pasaron 72 h sin reclamo abierto
export function pagoLiberado(orden) {
  if (!orden) return false
  return orden.liberado || (!reclamoAbierto(orden) && Date.now() - new Date(orden.creado_en).getTime() > MS_72H)
}

// Horas que faltan para la liberación automática
export function horasParaLiberar(orden) {
  return Math.max(0, Math.floor((new Date(orden.creado_en).getTime() + MS_72H - Date.now()) / 3600000))
}
