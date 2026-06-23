import { supabase } from './supabase'

// Obtener todas las boletas publicadas o vendidas, con su evento
export async function obtenerBoletas() {
  const { data, error } = await supabase
    .from('boletas')
    .select(`
      id, tribuna, fila, silla, cantidad, precio, estado,
      eventos ( nombre, deporte, ciudad, estadio, fecha, hora )
    `)
    .in('estado', ['publicada', 'vendida'])
    .order('creado_en', { ascending: false })

  if (error) {
    console.error('Error al obtener boletas:', error.message)
    return []
  }
  return data
}

// Filtrar boletas por deporte
export async function obtenerBoletasPorDeporte(deporte) {
  const { data, error } = await supabase
    .from('boletas')
    .select(`
      id, tribuna, fila, silla, cantidad, precio, estado,
      eventos!inner ( nombre, deporte, ciudad, estadio, fecha, hora )
    `)
    .eq('eventos.deporte', deporte)
    .in('estado', ['publicada', 'vendida'])

  if (error) {
    console.error('Error al filtrar boletas:', error.message)
    return []
  }
  return data
}

// Publicar una nueva boleta (la usa el formulario de venta)
export async function publicarBoleta({ eventoId, vendedorId, tribuna, fila, silla, cantidad, precio }) {
  const { data, error } = await supabase
    .from('boletas')
    .insert({
      evento_id: eventoId,
      vendedor_id: vendedorId,
      tribuna,
      fila,
      silla,
      cantidad,
      precio,
      estado: 'verificando'
    })
    .select()

  if (error) {
    console.error('Error al publicar boleta:', error.message)
    return null
  }
  return data[0]
}

// Crear una orden de compra (la usa el checkout)
export async function crearOrden({ boletaId, compradorId, subtotal, comision, total, metodoPago }) {
  const codigoOrden = 'BCO-' + Math.floor(10000 + Math.random() * 90000)

  const { data, error } = await supabase
    .from('ordenes')
    .insert({
      boleta_id: boletaId,
      comprador_id: compradorId,
      subtotal,
      comision,
      total,
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