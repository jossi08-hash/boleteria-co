export const config = { runtime: 'edge' }

import { correo, boleta as datosBoleta, monto, aviso, parrafo, escapar } from './_lib/plantilla.js'

const SUPABASE_URL = 'https://ssyelddmusabkxwijghn.supabase.co'

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    })
  }

  // Verificar JWT de Supabase
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 })
  }
  const token = authHeader.split(' ')[1]
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': process.env.VITE_SUPABASE_ANON_KEY }
  })
  if (!userRes.ok) return new Response('Unauthorized', { status: 401 })
  const user = await userRes.json()

  let ordenId
  try {
    const body = await req.json()
    ordenId = body.ordenId
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  if (!ordenId || !/^[0-9a-f-]{36}$/i.test(ordenId)) {
    return new Response(JSON.stringify({ error: 'Falta ordenId' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY

  if (!key || !resendKey) {
    return new Response(JSON.stringify({ error: 'Variables de entorno faltantes' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }

  // Obtener datos de la orden con vendedor, boleta y evento
  const url = `${SUPABASE_URL}/rest/v1/ordenes?id=eq.${ordenId}&select=id,codigo_orden,total,comprador_id,liberado,boletas(precio,publicada_por_admin,tribuna,fila,silla,plataforma,eventos(nombre,ciudad),usuarios(nombre,correo,datos_pago))`
  const res = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  })
  const data = await res.json()

  if (!data?.length) {
    return new Response(JSON.stringify({ error: 'Orden no encontrada' }), {
      status: 404, headers: { 'Content-Type': 'application/json' }
    })
  }

  const orden = data[0]
  // Solo el comprador de la orden, y solo después de confirmar que recibió la boleta
  if (orden.comprador_id !== user.id || orden.liberado !== true) {
    return new Response(JSON.stringify({ error: 'Orden no encontrada' }), {
      status: 404, headers: { 'Content-Type': 'application/json' }
    })
  }
  const boleta = orden.boletas
  const vendedor = boleta?.usuarios
  const evento = boleta?.eventos

  // Boleta del admin: no hay vendedor externo a quien pagar
  if (boleta?.publicada_por_admin === true) {
    return new Response(JSON.stringify({ ok: true, omitido: 'boleta_admin' }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  }

  const neto = Math.round(Number(boleta?.precio || 0) * 0.92)
  const netoFmt = '$' + neto.toLocaleString('es-CO')
  const eventoNombre = evento?.nombre || 'Evento'
  const eventoCity = evento?.ciudad || ''
  const ubicacion = [boleta?.tribuna, boleta?.fila && 'Fila ' + boleta.fila, boleta?.silla && 'Silla ' + boleta.silla].filter(Boolean).join(' · ')
  const datosPago = vendedor?.datos_pago || null
  const nombreVendedor = vendedor?.nombre || 'N/A'
  const correoVendedor = vendedor?.correo || 'N/A'
  const referencia = orden.codigo_orden

  // Obtener correo del admin
  const adminRes = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?es_admin=eq.true&select=correo&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  })
  const adminData = await adminRes.json()
  const correoAdmin = adminData?.[0]?.correo || 'jossi08@icloud.com'

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Boletería CO <noreply@boleteriaco.com>',
      to: correoAdmin,
      subject: `Pagar vendedor — ${eventoNombre} · ${netoFmt}`,
      html: correo({
        titulo: 'Pago pendiente al vendedor',
        previa: `El comprador confirmó recibo · enviar ${netoFmt}`,
        contenido: parrafo('El comprador confirmó que recibió la boleta. Ya puedes enviarle el pago al vendedor.') +
          monto('Enviar al vendedor', netoFmt, datosPago ? `Dato de pago: <strong>${escapar(datosPago)}</strong>` : '') +
          (datosPago ? '' : aviso('Sin dato de pago', 'El vendedor no tiene dato de pago registrado. Contáctalo directamente.')) +
          datosBoleta([
            ['Vendedor', `${escapar(nombreVendedor)} · ${escapar(correoVendedor)}`],
            ['Evento', escapar(eventoNombre) + (eventoCity ? ' · ' + escapar(eventoCity) : '')],
            ['Ubicación', escapar(ubicacion) || 'Sin especificar'],
            ['Plataforma', escapar(boleta?.plataforma || '')],
            ['Referencia', referencia],
          ])
      })
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
