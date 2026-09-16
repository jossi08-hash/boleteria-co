import { supabase } from './supabase'

export async function obtenerBoletas() {
  const { data, error } = await supabase
    .from('boletas')
    .select(`
      id, tribuna, fila, silla, cantidad, precio, estado, vendedor_id,
      eventos ( nombre, deporte, ciudad, estadio, fecha, hora, moneda ),
      usuarios ( nombre, correo, es_admin )
    `)
    .eq('estado', 'publicada')
    .order('creado_en', { ascending: false })

  if (error) {
    console.error('Error al obtener boletas:', error.message)
    return []
  }
  return data
}

export async function obtenerBoletasPorDeporte(deporte) {
  const { data, error } = await supabase
    .from('boletas')
    .select(`
      id, tribuna, fila, silla, cantidad, precio, estado, vendedor_id,
      eventos!inner ( nombre, deporte, ciudad, estadio, fecha, hora, moneda ),
      usuarios ( nombre, correo, es_admin )
    `)
    .eq('eventos.deporte', deporte)
    .eq('estado', 'publicada')

  if (error) {
    console.error('Error al filtrar boletas:', error.message)
    return []
  }
  return data
}

export async function obtenerVentasDeUsuario(usuarioId) {
  const { count } = await supabase
    .from('boletas')
    .select('id', { count: 'exact' })
    .eq('vendedor_id', usuarioId)
    .eq('estado', 'vendida')
  return count || 0
}

export async function publicarBoleta({ eventoId, vendedorId, tribuna, fila, silla, cantidad, precio, plataforma }) {
  const { data, error } = await supabase
    .from('boletas')
    .insert({
      evento_id: eventoId,
      vendedor_id: vendedorId,
      tribuna, fila, silla, cantidad, precio, plataforma,
      estado: 'verificando'
    })
    .select()

  if (error) {
    console.error('Error al publicar boleta:', error.message)
    return null
  }
  return data[0]
}

export async function crearOrden({ boletaId, compradorId, subtotal, comision, total, metodoPago }) {
  const codigoOrden = 'BCO-' + Math.floor(10000 + Math.random() * 90000)

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
      boletas(tribuna, fila, silla, precio, plataforma, vendedor_id, eventos(nombre, ciudad, estadio, fecha, moneda),
        usuarios(correo))
    `)
    .eq('comprador_id', usuarioId)
    .eq('estado_pago', 'pagada')
    .order('creado_en', { ascending: false })
  if (error) { console.error('Error misCompras:', error.message); return [] }
  return data || []
}

export async function obtenerMisVentas(usuarioId) {
  const { data, error } = await supabase
    .from('boletas')
    .select(`
      id, tribuna, fila, silla, precio, estado, creado_en, plataforma,
      eventos(nombre, ciudad, fecha, moneda),
      ordenes(id, codigo_orden, total, estado_pago, liberado, liberado_en, creado_en, archivo_url)
    `)
    .eq('vendedor_id', usuarioId)
    .order('creado_en', { ascending: false })
  if (error) { console.error('Error misVentas:', error.message); return [] }
  return data || []
}
