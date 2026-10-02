// Lógica compartida de pagos (los archivos en api/_lib no se publican como endpoints)

export const SUPABASE_URL = 'https://ssyelddmusabkxwijghn.supabase.co'

const FROM = 'Boletería CO <noreply@boleteriaco.com>'

export function supa(path, opts = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  })
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

// Códigos generados por crearOrden: BCO-XXXXXXX (las órdenes extra del carrito llevan sufijo -2, -3...)
export function referenciaValida(ref) {
  return typeof ref === 'string' && /^BCO-[A-Z0-9]+$/.test(ref)
}

// Total que debe pagar el comprador por una boleta (misma fórmula que el frontend)
export function totalEsperado(boleta) {
  const precio = Number(boleta?.precio || 0)
  if (boleta?.publicada_por_admin === true) return precio
  return Math.round(precio * 1.15 / 1000) * 1000
}

const SELECT_ORDEN = 'id,codigo_orden,total,estado_pago,comprador_id,boleta_id,' +
  'boletas(id,precio,estado,tribuna,fila,silla,plataforma,publicada_por_admin,eventos(nombre,ciudad,fecha),usuarios(correo,nombre))'

// Órdenes cubiertas por un pago: la principal y las extra del carrito (referencia-2, referencia-3...)
export async function ordenesDelPago(referencia) {
  if (!referenciaValida(referencia)) return []
  const res = await supa(`ordenes?or=(codigo_orden.eq.${referencia},codigo_orden.like.${referencia}-*)&select=${SELECT_ORDEN}`)
  const data = await res.json().catch(() => [])
  return Array.isArray(data) ? data : []
}

export function montoEsperadoCentavos(ordenes) {
  return ordenes.reduce((s, o) => s + totalEsperado(o.boletas), 0) * 100
}

export async function correoAdmin() {
  const res = await supa('usuarios?es_admin=eq.true&select=correo&limit=1')
  const data = await res.json().catch(() => [])
  return data?.[0]?.correo || 'soporte@boleteriaco.com'
}

export function enviarCorreo(to, subject, html) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html })
  })
}

const fmt = n => '$' + Number(n || 0).toLocaleString('es-CO')

// Marca como pagadas las órdenes de un pago aprobado por Wompi y envía los correos de venta.
// Es idempotente: el webhook y el regreso del comprador pueden llegar a la vez sin duplicar correos.
export async function confirmarPago(referencia, montoCentavos) {
  const ordenes = await ordenesDelPago(referencia)
  if (!ordenes.length) return { ok: false, error: 'Orden no encontrada' }

  const esperado = montoEsperadoCentavos(ordenes)
  if (esperado !== Number(montoCentavos)) {
    await enviarCorreo(await correoAdmin(), `⚠️ Pago con monto incorrecto — ${referencia}`,
      `<p>Wompi aprobó un pago por <strong>${fmt(Number(montoCentavos) / 100)}</strong> para la referencia <strong>${referencia}</strong>, ` +
      `pero el total esperado era <strong>${fmt(esperado / 100)}</strong>. Las órdenes NO se marcaron como pagadas. Revisa el pago en Wompi.</p>`)
    return { ok: false, error: 'Monto no coincide' }
  }

  let pendientes = ordenes.filter(o => o.estado_pago !== 'pagada')
  if (!pendientes.length) return { ok: true, yaConfirmado: true }

  // Si la reserva venció y otra persona alcanzó a comprar la boleta, este pago hay que reembolsarlo
  const yaVendidas = pendientes.filter(o => o.boletas?.estado === 'vendida')
  if (yaVendidas.length) {
    await enviarCorreo(await correoAdmin(), `⚠️ Reembolso necesario — ${referencia}`,
      `<p>Wompi aprobó el pago <strong>${referencia}</strong>, pero estas boletas ya se habían vendido a otro comprador ` +
      `(la reserva de 15 minutos venció antes de que pagara):</p><ul>` +
      yaVendidas.map(o => `<li>${o.codigo_orden} · ${o.boletas?.eventos?.nombre || ''} · ${fmt(totalEsperado(o.boletas))}</li>`).join('') +
      `</ul><p>Reembolsa ese valor al comprador desde el panel de Wompi. Las demás boletas del pago se confirmaron normalmente.</p>`)
    pendientes = pendientes.filter(o => o.boletas?.estado !== 'vendida')
    if (!pendientes.length) return { ok: false, error: 'Boletas ya vendidas', reembolso: true }
  }

  // Solo actualiza las que siguen sin pagar; las que devuelve son las que este llamado confirmó
  const upd = await supa(`ordenes?id=in.(${pendientes.map(o => o.id).join(',')})&estado_pago=neq.pagada`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ estado_pago: 'pagada' })
  })
  const actualizadas = await upd.json().catch(() => [])
  if (!Array.isArray(actualizadas) || !actualizadas.length) return { ok: true, yaConfirmado: true }

  const idsConfirmados = new Set(actualizadas.map(o => o.id))
  const confirmadas = pendientes.filter(o => idsConfirmados.has(o.id))
  await supa(`boletas?id=in.(${confirmadas.map(o => o.boleta_id).join(',')})`, {
    method: 'PATCH',
    body: JSON.stringify({ estado: 'vendida', reservada_hasta: null })
  })

  await enviarCorreosVenta(confirmadas)
  return { ok: true, confirmadas: confirmadas.length }
}

const INSTRUCCIONES_VENDEDOR = {
  'TuBoletaPass': 'Abre TuBoletaPass → Mis entradas → selecciona la boleta → Enviar Entrada → ingresa boletas@boleteriaco.com.',
  'Quentro': 'Abre Quentro → Mis Entradas → selecciona la entrada → icono de flecha → ingresa boletas@boleteriaco.com.',
  'Warena': 'Abre W Arena → perfil → entradas → Transferir → ingresa el documento de identidad registrado en la cuenta de boletas@boleteriaco.com.',
  'Dim Plus': 'Abre DIM Plus → Mis boletas → Ver boleta → Ceder boleta → llena los datos de la cuenta boletas@boleteriaco.com.',
}

async function enviarCorreosVenta(ordenes) {
  const admin = await correoAdmin()
  const promesas = []

  const compradorIds = [...new Set(ordenes.map(o => o.comprador_id).filter(Boolean))]
  const compRes = compradorIds.length
    ? await supa(`usuarios?id=in.(${compradorIds.join(',')})&select=id,correo,nombre`)
    : null
  const compradores = compRes ? await compRes.json().catch(() => []) : []

  for (const orden of ordenes) {
    const boleta = orden.boletas || {}
    const ev = boleta.eventos || {}
    const eventoNombre = ev.nombre || 'Evento'
    const eventoFecha = ev.fecha ? new Date(ev.fecha).toLocaleDateString('es-CO', { dateStyle: 'full' }) : null
    const ubicacion = [boleta.tribuna, boleta.fila && `Fila ${boleta.fila}`, boleta.silla && `Silla ${boleta.silla}`].filter(Boolean).join(' · ')
    const plataforma = boleta.plataforma || ''
    const instr = INSTRUCCIONES_VENDEDOR[plataforma] || ''
    const vendedor = boleta.usuarios || {}
    const ref = orden.codigo_orden
    const detalle = `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;"><strong>Evento:</strong> ${eventoNombre}${ev.ciudad ? ` · ${ev.ciudad}` : ''}</p>
        ${eventoFecha ? `<p style="margin:0 0 8px;"><strong>Fecha:</strong> ${eventoFecha}</p>` : ''}
        <p style="margin:0 0 8px;"><strong>Ubicación:</strong> ${ubicacion || 'N/A'}</p>
        ${plataforma ? `<p style="margin:0 0 8px;"><strong>Plataforma:</strong> ${plataforma}</p>` : ''}
        <p style="margin:0;"><strong>Referencia:</strong> ${ref}</p>
      </div>`
    const pie = '<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"><p style="color:#9ca3af;font-size:12px;">Boletería CO · boleteriaco.com</p>'
    const caja = html => `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">${html}${pie}</div>`

    if (boleta.publicada_por_admin === true) {
      promesas.push(enviarCorreo(admin, `🎟️ Nueva venta — enviar boleta al comprador | ${eventoNombre}`, caja(`
        <h1 style="color:#6366f1;font-size:22px;">Nueva venta — acción requerida</h1>
        <p style="color:#374151;">Se pagó una boleta publicada por <strong>Boletería CO</strong>. Total pagado: <strong>${fmt(totalEsperado(boleta))}</strong>.</p>
        ${detalle}
        <p style="color:#dc2626;font-weight:bold;">⚠️ Envía la boleta al comprador lo antes posible.</p>`)))
    } else {
      if (vendedor.correo) {
        promesas.push(enviarCorreo(vendedor.correo, `¡Vendiste tu boleta para ${eventoNombre}! — Acción requerida`, caja(`
          <h1 style="color:#16a34a;font-size:24px;">¡Vendiste una boleta! 🎉</h1>
          <p style="color:#374151;">Hola ${vendedor.nombre || ''}, se completó el pago de tu boleta por <strong>${fmt(boleta.precio)}</strong>.</p>
          ${detalle}
          <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#92400e;font-weight:bold;">⚠️ Acción requerida: transfiere tu boleta a Boletería CO</p>
            ${instr ? `<p style="margin:0;color:#78350f;font-size:13px;line-height:1.6;">${instr}</p>` : ''}
          </div>`)))
      }
      promesas.push(enviarCorreo(admin, `🔔 Nueva venta de tercero — esperar boleta | ${eventoNombre}`, caja(`
        <h1 style="color:#f59e0b;font-size:22px;">Nueva venta — boleta en camino</h1>
        <p style="color:#374151;">Se vendió una boleta de <strong>${vendedor.nombre || 'N/A'}</strong> (${vendedor.correo || 'N/A'}). Ya le pedimos que la transfiera a Boletería CO.</p>
        ${detalle}`)))
    }

    const comprador = compradores.find(c => c.id === orden.comprador_id)
    if (comprador?.correo) {
      promesas.push(enviarCorreo(comprador.correo, `¡Tu compra fue exitosa! ${eventoNombre}`, caja(`
        <h1 style="color:#6366f1;font-size:24px;">¡Compra confirmada! 🎟️</h1>
        <p style="color:#374151;">Hola ${comprador.nombre || ''}, tu pago fue aprobado. Total: <strong>${fmt(totalEsperado(boleta))}</strong>.</p>
        ${detalle}
        <p style="color:#374151;">Recibirás tu boleta en las próximas horas. Cuando la tengas, confírmalo en "Mis boletas". Si tienes algún problema, escríbenos a <a href="mailto:soporte@boleteriaco.com" style="color:#6366f1;">soporte@boleteriaco.com</a>.</p>`)))
    }
  }

  await Promise.all(promesas)
}
