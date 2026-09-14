export const config = { runtime: 'edge' }

const SUPABASE_URL = 'https://ssyelddmusabkxwijghn.supabase.co'

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    })
  }

  let referencia
  try {
    const body = await req.json()
    referencia = body.referencia
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  if (!referencia) {
    return new Response(JSON.stringify({ error: 'Falta referencia' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY

  // 1. Obtener la orden con boleta, evento y usuario del vendedor en una sola query
  const url = `${SUPABASE_URL}/rest/v1/ordenes?codigo_orden=eq.${encodeURIComponent(referencia)}&select=total,boleta_id,boletas(precio,tribuna,fila,silla,eventos(nombre),usuarios(correo,nombre))`
  const res = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  })
  const data = await res.json()

  if (!data?.length) {
    return new Response(JSON.stringify({ error: 'Orden no encontrada', ref: referencia }), {
      status: 404, headers: { 'Content-Type': 'application/json' }
    })
  }

  const orden = data[0]
  const boleta = orden.boletas
  const correoVendedor = boleta?.usuarios?.correo
  const nombreVendedor = boleta?.usuarios?.nombre

  if (!correoVendedor) {
    return new Response(JSON.stringify({ error: 'Vendedor sin correo', boleta }), {
      status: 404, headers: { 'Content-Type': 'application/json' }
    })
  }

  const eventoNombre = boleta?.eventos?.nombre || 'Evento'
  const ubicacion = [
    boleta.tribuna,
    boleta.fila && `Fila ${boleta.fila}`,
    boleta.silla && `Silla ${boleta.silla}`
  ].filter(Boolean).join(' · ')

  // 2. Enviar email via Resend
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Boletería CO <onboarding@resend.dev>',
      to: correoVendedor,
      subject: `¡Vendiste tu boleta para ${eventoNombre}!`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
          <h1 style="color:#16a34a;font-size:24px;">¡Vendiste una boleta! 🎉</h1>
          <p style="color:#374151;">Hola ${nombreVendedor || ''}, se completó el pago de tu boleta en <strong>Boletería CO</strong>.</p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 8px;"><strong>Evento:</strong> ${eventoNombre}</p>
            <p style="margin:0 0 8px;"><strong>Ubicación:</strong> ${ubicacion || 'N/A'}</p>
            <p style="margin:0 0 8px;"><strong>Precio vendido:</strong> $${Number(boleta.precio).toLocaleString('es-CO')}</p>
            <p style="margin:0;"><strong>Referencia:</strong> ${referencia}</p>
          </div>
          <p style="color:#dc2626;font-weight:bold;">⚠️ Recuerda enviarle la boleta al comprador lo antes posible.</p>
          <p style="color:#6b7280;font-size:13px;">El comprador se comunicará contigo por la plataforma.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
          <p style="color:#9ca3af;font-size:12px;">Boletería CO · boleteriaco.com</p>
        </div>
      `
    })
  })

  const emailData = await emailRes.json()
  if (!emailRes.ok) {
    return new Response(JSON.stringify({ error: 'Resend error', detail: emailData }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ ok: true, to: correoVendedor }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  })
}
