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
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': process.env.SUPABASE_ANON_KEY }
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

  // Obtener datos de la orden con vendedor, comprador, boleta y evento
  const url = `${SUPABASE_URL}/rest/v1/ordenes?id=eq.${ordenId}&select=id,codigo_orden,total,boletas(precio,tribuna,fila,silla,plataforma,eventos(nombre,ciudad,fecha),usuarios(nombre,correo,datos_pago))`
  const res = await fetch(url, {
    headers: { apikey: key, Authorization: \`Bearer \${key}\` }
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

  const correoVendedor = vendedor?.correo
  if (!correoVendedor) {
    return new Response(JSON.stringify({ error: 'Vendedor sin correo' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const neto = Math.round(Number(boleta?.precio || 0) * 0.92)
  const netoFmt = '\$' + neto.toLocaleString('es-CO')
  const nombreVendedor = vendedor?.nombre || 'Vendedor'
  const eventoNombre = evento?.nombre || 'Evento'
  const eventoCity = evento?.ciudad || ''
  const ubicacion = [boleta?.tribuna, boleta?.fila && 'Fila ' + boleta.fila, boleta?.silla && 'Silla ' + boleta.silla].filter(Boolean).join(' · ')
  const referencia = orden.codigo_orden
  const datosPago = vendedor?.datos_pago || null

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: \`Bearer \${resendKey}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Boletería CO <noreply@boleteriaco.com>',
      to: correoVendedor,
      subject: \`💸 Tu pago está en camino — \${netoFmt}\`,
      html: \`
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
          <h1 style="color:#34d399;font-size:22px;">¡Tu pago fue enviado, \${nombreVendedor}!</h1>
          <p style="color:#374151;">El comprador confirmó que recibió la boleta y ya enviamos tu pago.</p>
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 6px;font-size:28px;font-weight:900;color:#15803d;">\${netoFmt}</p>
            \${datosPago
              ? \`<p style="margin:0;color:#374151;font-size:14px;">Enviado a: <strong>\${datosPago}</strong></p>\`
              : \`<p style="margin:0;color:#dc2626;font-size:14px;">Si no recibes el pago en 24h, contáctanos a hola@boleteriaco.com.</p>\`
            }
          </div>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 6px;"><strong>Evento:</strong> \${eventoNombre}\${eventoCity ? ' · ' + eventoCity : ''}</p>
            <p style="margin:0 0 6px;"><strong>Ubicación:</strong> \${ubicacion || 'N/A'}</p>
            <p style="margin:0;"><strong>Referencia:</strong> \${referencia}</p>
          </div>
          <p style="color:#374151;font-size:14px;">¿Tienes preguntas? Escríbenos a <a href="mailto:hola@boleteriaco.com" style="color:#6b93ff;">hola@boleteriaco.com</a>.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
          <p style="color:#9ca3af;font-size:12px;">Boletería CO · boleteriaco.com</p>
        </div>
      \`
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
