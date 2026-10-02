export const config = { runtime: 'edge' }

import { supa, json, correoAdmin, enviarCorreo } from './_lib/pagos.js'

// Corre una vez al día (cron en vercel.json). Libera las órdenes pagadas hace más de 72 h
// que el comprador no confirmó, avisa al admin qué vendedores hay que pagar
// y devuelve a la venta las boletas con reservas vencidas.
export default async function handler(req) {
  // Vercel Cron envía "Authorization: Bearer <CRON_SECRET>"; x-cron-secret se mantiene para llamados manuales
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || (auth !== `Bearer ${secret}` && req.headers.get('x-cron-secret') !== secret)) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Sin service role key' }, 500)

  const limite = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
  const res = await supa(
    `ordenes?estado_pago=eq.pagada&liberado=eq.false&creado_en=lt.${limite}` +
    '&select=codigo_orden,subtotal,boletas(precio,publicada_por_admin,eventos(nombre),usuarios(nombre,correo,datos_pago))',
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ liberado: true, liberado_en: new Date().toISOString() })
    }
  )
  const liberadas = await res.json().catch(() => [])
  if (!Array.isArray(liberadas)) return json({ error: 'Error liberando órdenes', detalle: liberadas }, 500)

  // Las boletas del admin no tienen vendedor externo a quien pagar
  const porPagar = liberadas.filter(o => o.boletas?.publicada_por_admin !== true)
  if (porPagar.length > 0 && process.env.RESEND_API_KEY) {
    const filas = porPagar.map(o => {
      const b = o.boletas || {}
      const v = b.usuarios || {}
      const neto = Math.round(Number(o.subtotal ?? b.precio ?? 0) * 0.92)
      return `<tr><td style="padding:6px;border-bottom:1px solid #e5e7eb;">${o.codigo_orden}</td>` +
        `<td style="padding:6px;border-bottom:1px solid #e5e7eb;">${b.eventos?.nombre || ''}</td>` +
        `<td style="padding:6px;border-bottom:1px solid #e5e7eb;">${v.nombre || ''}<br><small>${v.correo || ''}</small><br><small>${v.datos_pago || 'Sin datos de pago'}</small></td>` +
        `<td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:right;"><strong>$${neto.toLocaleString('es-CO')}</strong></td></tr>`
    }).join('')
    await enviarCorreo(await correoAdmin(), `💸 ${porPagar.length} pago${porPagar.length !== 1 ? 's' : ''} a vendedores listos (72 h)`,
      `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#15803d;font-size:20px;">Pagos listos para enviar</h1>
        <p style="color:#374151;">Pasaron 72 horas sin reclamos en estas ventas. Envía el pago a cada vendedor y márcalo como pagado en el panel de admin.</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><th align="left">Ref</th><th align="left">Evento</th><th align="left">Vendedor</th><th align="right">Enviar (92%)</th></tr>
          ${filas}
        </table>
      </div>`)
  }

  // Reservas vencidas (el comprador no terminó de pagar): devolver las boletas a la venta.
  // La app ya las muestra como disponibles; esto deja la base de datos al día.
  const resReservas = await supa(`boletas?estado=eq.reservada&reservada_hasta=lt.${new Date().toISOString()}&select=id`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ estado: 'publicada', reservada_hasta: null, reservada_por: null })
  })
  const reservas = await resReservas.json().catch(() => [])

  return json({ ok: true, liberadas: liberadas.length, porPagar: porPagar.length, reservasVencidas: Array.isArray(reservas) ? reservas.length : 0 })
}
