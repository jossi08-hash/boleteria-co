export const config = { runtime: 'edge' }

import { correo, boleta as datosBoleta, monto, parrafo, escapar } from './_lib/plantilla.js'

const SUPABASE_URL = 'https://ssyelddmusabkxwijghn.supabase.co'

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 })
  }
  const token = authHeader.split(' ')[1]
  const userRes = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { 'Authorization': 'Bearer ' + token, 'apikey': process.env.VITE_SUPABASE_ANON_KEY }
  })
  if (!userRes.ok) return new Response('Unauthorized', { status: 401 })
  const user = await userRes.json()

  let ordenId
  try {
    const body = await req.json()
    ordenId = body.ordenId
  } catch {
    return new Response(JSON.stringify({ error: 'Body invalido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  if (!ordenId) {
    return new Response(JSON.stringify({ error: 'Falta ordenId' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY

  if (!key || !resendKey) {
    return new Response(JSON.stringify({ error: 'Variables faltantes' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }

  if (!/^[0-9a-f-]{36}$/i.test(ordenId)) {
    return new Response(JSON.stringify({ error: 'ordenId inválido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  // Solo el admin envía este correo, y solo después de marcar la orden como pagada al vendedor
  const adminRes = await fetch(SUPABASE_URL + '/rest/v1/usuarios?id=eq.' + user.id + '&select=es_admin', {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  })
  const perfil = (await adminRes.json().catch(() => []))[0]
  if (!perfil || perfil.es_admin !== true) return new Response('Forbidden', { status: 403 })

  const res = await fetch(SUPABASE_URL + '/rest/v1/ordenes?id=eq.' + ordenId + '&select=id,codigo_orden,total,pago_vendedor_enviado,boletas(precio,publicada_por_admin,tribuna,fila,silla,eventos(nombre,ciudad,fecha),usuarios(nombre,correo,datos_pago))', {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  })
  const data = await res.json()

  if (!data || !data.length) {
    return new Response(JSON.stringify({ error: 'Orden no encontrada' }), {
      status: 404, headers: { 'Content-Type': 'application/json' }
    })
  }

  const orden = data[0]
  if (orden.pago_vendedor_enviado !== true) {
    return new Response(JSON.stringify({ error: 'La orden no está marcada como pagada al vendedor' }), {
      status: 409, headers: { 'Content-Type': 'application/json' }
    })
  }
  const boleta = orden.boletas
  const vendedor = boleta && boleta.usuarios
  const evento = boleta && boleta.eventos

  const correoVendedor = vendedor && vendedor.correo
  if (!correoVendedor) {
    return new Response(JSON.stringify({ error: 'Vendedor sin correo' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const precio = Number((boleta && boleta.precio) || 0)
  const neto = boleta && boleta.publicada_por_admin === true ? precio : Math.round(precio * 0.92)
  const netoFmt = '$' + neto.toLocaleString('es-CO')
  const nombreVendedor = (vendedor && vendedor.nombre) || 'Vendedor'
  const eventoNombre = (evento && evento.nombre) || 'Evento'
  const eventoCity = (evento && evento.ciudad) || ''
  const partes = [boleta && boleta.tribuna, boleta && boleta.fila && 'Fila ' + boleta.fila, boleta && boleta.silla && 'Silla ' + boleta.silla].filter(Boolean)
  const ubicacion = partes.join(' - ')
  const referencia = orden.codigo_orden
  const datosPago = (vendedor && vendedor.datos_pago) || null

  const htmlBody = correo({
    titulo: '¡Tu pago va en camino!',
    previa: `Te enviamos ${netoFmt} por tu boleta de ${eventoNombre}`,
    contenido: parrafo(`Hola ${escapar(nombreVendedor)}, el comprador confirmó que recibió la boleta y ya te enviamos tu pago.`) +
      monto('Te enviamos', netoFmt, datosPago ? `A: <strong>${escapar(datosPago)}</strong>` : 'Si no lo recibes en 24 horas, escríbenos a soporte@boleteriaco.com.') +
      datosBoleta([
        ['Evento', escapar(eventoNombre) + (eventoCity ? ' · ' + escapar(eventoCity) : '')],
        ['Ubicación', escapar(ubicacion) || 'Sin especificar'],
        ['Referencia', referencia],
      ])
  })

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Boletería CO <noreply@boleteriaco.com>',
      to: correoVendedor,
      subject: 'Tu pago está en camino — ' + netoFmt,
      html: htmlBody
    })
  })

  if (!emailRes.ok) {
    const err = await emailRes.text()
    return new Response(JSON.stringify({ error: 'Error enviando email', detalle: err }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  })
}
