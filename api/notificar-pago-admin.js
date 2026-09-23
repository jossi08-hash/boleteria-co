export const config = { runtime: 'edge' }

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

  let ordenId
  try {
    const body = await req.json()
    ordenId = body.ordenId
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
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
    return new Response(JSON.stringify({ error: 'Variables de entorno faltantes' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }

  // Obtener datos de la orden con vendedor, boleta y evento
  const url = `${SUPABASE_URL}/rest/v1/ordenes?id=eq.${ordenId}&select=id,codigo_orden,total,boletas(precio,tribuna,fila,silla,plataforma,eventos(nombre,ciudad),usuarios(nombre,correo,datos_pago))`
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
  const boleta = orden.boletas
  const vendedor = boleta?.usuarios
  const evento = boleta?.eventos

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
      subject: `💸 Pagar vendedor — ${eventoNombre} · ${netoFmt}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
          <h1 style="color:#34d399;font-size:22px;">Pago pendiente al vendedor</h1>
          <p style="color:#374151;">El comprador confirmó recibo. Ya puedes enviarle el pago al vendedor.</p>
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 10px;font-size:20px;font-weight:900;color:#15803d;">💸 Enviar: ${netoFmt}</p>
            ${datosPago
              ? `<p style="margin:0 0 4px;color:#374151;font-size:14px;"><strong>📱 Dato de pago:</strong></p>
                 <p style="margin:0;font-size:16px;font-weight:700;color:#166534;background:#dcfce7;padding:10px 14px;border-radius:6px;">${datosPago}</p>`
              : `<p style="margin:0;color:#dc2626;font-weight:600;">⚠️ El vendedor no tiene dato de pago registrado. Contáctalo directamente.</p>`
            }
          </div>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 6px;"><strong>Vendedor:</strong> ${nombreVendedor} · ${correoVendedor}</p>
            <p style="margin:0 0 6px;"><strong>Evento:</strong> ${eventoNombre}${eventoCity ? ' · ' + eventoCity : ''}</p>
            <p style="margin:0 0 6px;"><strong>Ubicación:</strong> ${ubicacion || 'N/A'}</p>
            ${boleta?.plataforma ? `<p style="margin:0 0 6px;"><strong>Plataforma:</strong> ${boleta.plataforma}</p>` : ''}
            <p style="margin:0;"><strong>Referencia:</strong> ${referencia}</p>
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
          <p style="color:#9ca3af;font-size:12px;">Boletería CO · boleteriaco.com</p>
        </div>
      `
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
