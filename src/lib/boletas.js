import { supabase } from './supabase'

// Las reservas duran 15 minutos. Si el comprador no terminó de pagar, la boleta vuelve a estar disponible.
export function filtroDisponible() {
  return `estado.eq.publicada,and(estado.eq.reservada,reservada_hasta.lt."${new Date().toISOString()}")`
}

function liberarReservaVencida(b) {
  const vencida = b.estado === 'reservada' && b.reservada_hasta && new Date(b.reservada_hasta) < new Date()
  return vencida ? { ...b, estado: 'publicada' } : b
}

export async function obtenerBoletas() {
  const { data, error } = await supabase
    .from('boletas')
    .select(`
      id, evento_id, tribuna, fila, silla, cantidad, precio, estado, reservada_hasta, vendedor_id, publicada_por_admin,
      eventos ( id, nombre, deporte, ciudad, estadio, fecha, hora, moneda ),
      usuarios ( nombre, es_admin )
    `)
    .or(filtroDisponible())
    .order('creado_en', { ascending: false })

  if (error) {
    console.error('Error al obtener boletas:', error.message)
    return []
  }
  return data.map(liberarReservaVencida)
}


export async function publicarBoleta({ eventoId, vendedorId, tribuna, fila, silla, cantidad, precio, plataforma, publicadaPorAdmin = false }) {
  const { data, error } = await supabase
    .from('boletas')
    .insert({
      evento_id: eventoId,
      vendedor_id: vendedorId,
      tribuna, fila, silla, cantidad, precio, plataforma,
      publicada_por_admin: publicadaPorAdmin,
      estado: 'verificando'
    })
    .select()

  if (error) {
    console.error('Error al publicar boleta:', error.message)
    return null
  }
  return data[0]
}

export function generarCodigoOrden() {
  return 'BCO-' + Math.random().toString(36).substring(2, 9).toUpperCase()
}

// En el carrito, las órdenes extra usan el código de la principal con sufijo (-2, -3...)
// para que el servidor sepa qué órdenes cubre un mismo pago de Wompi.
export async function crearOrden({ boletaId, compradorId, subtotal, comision, total, metodoPago, codigoOrden = generarCodigoOrden() }) {

  const { data, error } = await supabase
    .from('ordenes')
    .insert({
      boleta_id: boletaId,
      comprador_id: compradorId,
      subtotal, comision, total,
      metodo_pago: metodoPago,
      estado_pago: 'pendiente',
      codigo_orden: codigoOrden
    })
    .select()

  if (error) {
    console.error('Error al crear orden:', error.message)
    return null
  }
  return data[0]
}
export async function obtenerMisCompras(usuarioId) {
  const { data, error } = await supabase
    .from('ordenes')
    .select(`
      id, codigo_orden, total, estado_pago, creado_en, liberado, liberado_en, archivo_url,
      reclamo_motivo, reclamo_en, reclamo_resuelto_en,
      boletas(tribuna, fila, silla, precio, plataforma, vendedor_id, eventos(nombre, ciudad, estadio, fecha, moneda))
    `)
    .eq('comprador_id', usuarioId)
    .in('estado_pago', ['pagada', 'reembolsada'])
    .order('creado_en', { ascending: false })
  if (error) { console.error('Error misCompras:', error.message); return [] }
  return data || []
}

export async function obtenerMisVentas(usuarioId) {
  const { data, error } = await supabase
    .from('boletas')
    .select(`
      id, tribuna, fila, silla, precio, estado, reservada_hasta, creado_en, plataforma, publicada_por_admin,
      eventos(nombre, ciudad, fecha, moneda),
      ordenes(id, codigo_orden, subtotal, comision, total, estado_pago, liberado, liberado_en, creado_en, archivo_url, pago_vendedor_enviado, reclamo_en, reclamo_resuelto_en)
    `)
    .eq('vendedor_id', usuarioId)
    .order('creado_en', { ascending: false })
  if (error) { console.error('Error misVentas:', error.message); return [] }
  return (data || []).map(liberarReservaVencida)
}
