// Cómo se reparte el dinero de una venta entre vendedor, Wompi y Boletería CO

// Tarifa de Wompi (porcentaje + fijo, más IVA sobre la tarifa) y retención en la fuente del 1,5 % sobre el
// total pagado. Confirmada con un pago real: $125.000 → $120.225 en Wompi → $118.350 en Nequi.
export const TARIFA_WOMPI = { porcentaje: 0.0265, fijo: 700, iva: 0.19, retencion: 0.015, confirmada: true }
export const COMISION_VENDEDOR = 0.08

export function tarifaWompi(total) {
  if (!total) return 0
  return Math.round((total * TARIFA_WOMPI.porcentaje + TARIFA_WOMPI.fijo) * (1 + TARIFA_WOMPI.iva))
}

// Retención en la fuente que Wompi descuenta antes de girar (anticipo de renta, descontable en la declaración)
export function retencionWompi(total) {
  if (!total) return 0
  return Math.round(total * TARIFA_WOMPI.retencion)
}

// precio: lo que pidió el vendedor (el subtotal de la orden); total: lo que pagó el comprador
export function desglosePago(orden, boleta) {
  const precio = Number(orden?.subtotal ?? boleta?.precio ?? 0)
  const total = Number(orden?.total ?? 0)
  const wompi = tarifaWompi(total)
  const retencion = retencionWompi(total)
  const llego = total - wompi - retencion
  const comision = Math.round(precio * COMISION_VENDEDOR)
  const vendedor = precio - comision
  return { precio, total, wompi, retencion, llego, comision, vendedor, queda: llego - vendedor }
}

// Lo que paga el comprador. Boletas de terceros: precio + ~15 %. Boletas propias: precio + lo justo para
// cubrir la tarifa de Wompi y la retención del 1,5 %, así llega completo el precio publicado. Siempre redondeado a $1.000.
// OJO: api/_lib/pagos.js (totalEsperado) repite esta fórmula para validar el cobro; cambiar ambas juntas.
export function totalComprador(precio, esPropia) {
  const p = Number(precio || 0)
  if (!p) return 0
  if (!esPropia) return Math.round(p * 1.15 / 1000) * 1000
  const { porcentaje, fijo, iva, retencion } = TARIFA_WOMPI
  return Math.ceil((p + fijo * (1 + iva)) / (1 - porcentaje * (1 + iva) - retencion) / 1000) * 1000
}
