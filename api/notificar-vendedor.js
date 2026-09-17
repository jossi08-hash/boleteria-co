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

  if (!key) {
    return new Response(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY no está configurada' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY no está configurada' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }

  // Obtener orden con info del vendedor (via boleta) y del comprador
  const url = `${SUPABASE_URL}/rest/v1/ordenes?codigo_orden=eq.${encodeURIComponent(referencia)}&select=id,total,comprador_id,boleta_id,boletas(id,precio,tribuna,fila,silla,publicada_por_admin,eventos(nombre,ciudad,fecha),usuarios(correo,nombre))`
  const res = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  })
  const rawData = await res.text()
  let data
  try { data = JSON.parse(rawData) } catch { data = [] }

  if (!data?.length) {
    return new Response(JSON.stringify({ error: 'Orden no encontrada', ref: referencia }), {
      status: 404, headers: { 'Content-Type': 'application/json' }
    })
  }

  const orden = data[0]

  // Actualizar estados server-side con service role (bypassa RLS)
  const boletaId = orden.boleta_id || orden.boletas?.id
  await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/ordenes?id=eq.${orden.id}`, {
      method: 'PATCH',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ estado_pago: 'pagada' })
    }),
    boletaId ? fetch(`${SUPABASE_URL}/rest/v1/boletas?id=eq.${boletaId}`, {
      method: 'PATCH',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ estado: 'vendida' })
    }) : Promise.resolve()
  ])

  const boleta = orden.boletas
  const esBoletaAdmin = boleta?.publicada_por_admin === true
  const correoVendedor = boleta?.usuarios?.correo
  const nombreVendedor = boleta?.usuarios?.nombre
  const eventoNombre = boleta?.eventos?.nombre || 'Evento'
  const eventoFecha = boleta?.eventos?.fecha
    ? new Date(boleta.eventos.fecha).toLocaleDateString('es-CO', { dateStyle: 'full' })
    : null
  const eventoCity = boleta?.eventos?.ciudad || ''
  const ubicacion = [
    boleta?.tribuna,
    boleta?.fila && `Fila ${boleta.fila}`,
    boleta?.silla && `Silla ${boleta.silla}`
  ].filter(Boolean).join(' · ')
  const precioFmt = `$${Number(boleta?.precio || 0).toLocaleString('es-CO')}`
  const totalFmt = `$${Number(orden.total || 0).toLocaleString('es-CO')}`

  // Obtener email del admin
  const adminRes = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?es_admin=eq.true&select=correo,nombre&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  })
  const adminData = await adminRes.json()
  const correoAdmin = adminData?.[0]?.correo || 'soporte@boleteriaco.com'

  const promises = []

  if (esBoletaAdmin) {
    // Boleta de Boletería CO: notificar al admin para que envíe al comprador
    promises.push(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Boletería CO <noreply@boleteriaco.com>',
        to: correoAdmin,
        subject: `🎟️ Nueva venta — enviar boleta al comprador | ${eventoNombre}`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
            <h1 style="color:#6366f1;font-size:22px;">Nueva venta — acción requerida</h1>
            <p style="color:#374151;">Se completó un pago de una boleta publicada por <strong>Boletería CO</strong>. Debes enviarle la boleta al comprador.</p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">
              <p style="margin:0 0 8px;"><strong>Evento:</strong> ${eventoNombre}${eventoCity ? ` · ${eventoCity}` : ''}</p>
              ${eventoFecha ? `<p style="margin:0 0 8px;"><strong>Fecha:</strong> ${eventoFecha}</p>` : ''}
              <p style="margin:0 0 8px;"><strong>Ubicación:</strong> ${ubicacion || 'N/A'}</p>
              <p style="margin:0 0 8px;"><strong>Total pagado:</strong> ${totalFmt}</p>
              <p style="margin:0;"><strong>Referencia:</strong> ${referencia}</p>
            </div>
            <p style="color:#dc2626;font-weight:bold;">⚠️ Envía la boleta al comprador lo antes posible.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
            <p style="color:#9ca3af;font-size:12px;">Boletería CO · boleteriaco.com</p>
          </div>
        `
      })
    }))
  } else {
    // Boleta de tercero: notificar al vendedor que envíe al admin, y al admin que espere la boleta
    if (correoVendedor) {
      promises.push(fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Boletería CO <noreply@boleteriaco.com>',
          to: correoVendedor,
          subject: `¡Vendiste tu boleta para ${eventoNombre}! — Acción requerida`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
              <h1 style="color:#16a34a;font-size:24px;">¡Vendiste una boleta! 🎉</h1>
              <p style="color:#374151;">Hola ${nombreVendedor || ''}, se completó el pago de tu boleta en <strong>Boletería CO</strong>.</p>
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">
                <p style="margin:0 0 8px;"><strong>Evento:</strong> ${eventoNombre}${eventoCity ? ` · ${eventoCity}` : ''}</p>
                ${eventoFecha ? `<p style="margin:0 0 8px;"><strong>Fecha:</strong> ${eventoFecha}</p>` : ''}
                <p style="margin:0 0 8px;"><strong>Ubicación:</strong> ${ubicacion || 'N/A'}</p>
                <p style="margin:0 0 8px;"><strong>Precio vendido:</strong> ${precioFmt}</p>
                <p style="margin:0;"><strong>Referencia:</strong> ${referencia}</p>
              </div>
              <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:20px 0;">
                <p style="margin:0 0 8px;color:#92400e;font-weight:bold;">⚠️ Paso importante: envía tu boleta a Boletería CO</p>
                <p style="margin:0;color:#92400e;">Debes enviar la boleta a nuestro equipo para que se la entreguemos al comprador. Contáctanos lo antes posible a <strong>${correoAdmin}</strong> con tu referencia de venta.</p>
              </div>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
              <p style="color:#9ca3af;font-size:12px;">Boletería CO · boleteriaco.com</p>
            </div>
          `
        })
      }))
    }

    // Notificar al admin que hay una boleta entrante de tercero
    promises.push(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Boletería CO <noreply@boleteriaco.com>',
        to: correoAdmin,
        subject: `🔔 Nueva venta de tercero — esperar boleta | ${eventoNombre}`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
            <h1 style="color:#f59e0b;font-size:22px;">Nueva venta — boleta en camino</h1>
            <p style="color:#374151;">Se vendió una boleta de un tercero. El vendedor fue notificado para enviarte la boleta.</p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">
              <p style="margin:0 0 8px;"><strong>Evento:</strong> ${eventoNombre}${eventoCity ? ` · ${eventoCity}` : ''}</p>
              ${eventoFecha ? `<p style="margin:0 0 8px;"><strong>Fecha:</strong> ${eventoFecha}</p>` : ''}
              <p style="margin:0 0 8px;"><strong>Ubicación:</strong> ${ubicacion || 'N/A'}</p>
              <p style="margin:0 0 8px;"><strong>Total pagado:</strong> ${totalFmt}</p>
              <p style="margin:0 0 8px;"><strong>Vendedor:</strong> ${nombreVendedor || 'N/A'} · ${correoVendedor || 'N/A'}</p>
              <p style="margin:0;"><strong>Referencia:</strong> ${referencia}</p>
            </div>
            <p style="color:#374151;">Cuando recibas la boleta del vendedor, verifícala y envíala al comprador.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
            <p style="color:#9ca3af;font-size:12px;">Boletería CO · boleteriaco.com</p>
          </div>
        `
      })
    }))
  }

  // 2. Email al comprador (query por comprador_id)
  if (orden.comprador_id) {
    const compradorRes = await fetch(
      `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${orden.comprador_id}&select=correo,nombre`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    )
    const compradorData = await compradorRes.json()
    const comprador = compradorData?.[0]

    if (comprador?.correo) {
      promises.push(fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Boletería CO <noreply@boleteriaco.com>',
          to: comprador.correo,
          subject: `¡Tu compra fue exitosa! ${eventoNombre}`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
              <h1 style="color:#6366f1;font-size:24px;">¡Compra confirmada! 🎟️</h1>
              <p style="color:#374151;">Hola ${comprador.nombre || ''}, tu pago fue aprobado en <strong>Boletería CO</strong>.</p>
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">
                <p style="margin:0 0 8px;"><strong>Evento:</strong> ${eventoNombre}${eventoCity ? ` · ${eventoCity}` : ''}</p>
                ${eventoFecha ? `<p style="margin:0 0 8px;"><strong>Fecha:</strong> ${eventoFecha}</p>` : ''}
                <p style="margin:0 0 8px;"><strong>Ubicación:</strong> ${ubicacion || 'N/A'}</p>
                <p style="margin:0 0 8px;"><strong>Total pagado:</strong> ${totalFmt}</p>
                <p style="margin:0;"><strong>Referencia:</strong> ${referencia}</p>
              </div>
              <p style="color:#374151;">El vendedor te enviará la boleta próximamente. Si tienes algún problema, escríbenos a <a href="mailto:soporte@boleteriaco.com" style="color:#6366f1;">soporte@boleteriaco.com</a>.</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
              <p style="color:#9ca3af;font-size:12px;">Boletería CO · boleteriaco.com</p>
            </div>
          `
        })
      }))
    }
  }

  await Promise.all(promises)

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  })
}
