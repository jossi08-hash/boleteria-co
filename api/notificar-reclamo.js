export const config = { runtime: 'edge' }

import { supa, json, correoAdmin, enviarCorreo, SUPABASE_URL } from './_lib/pagos.js'

// Avisa al admin que un comprador reportó un problema con su boleta
export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer /, '')
  if (!token) return new Response('Unauthorized', { status: 401 })
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: process.env.VITE_SUPABASE_ANON_KEY }
  })
  if (!userRes.ok) return new Response('Unauthorized', { status: 401 })
  const user = await userRes.json()

  let ordenId
  try { ({ ordenId } = await req.json()) } catch { return json({ error: 'Body inválido' }, 400) }
  if (!ordenId || !/^[0-9a-f-]{36}$/i.test(ordenId)) return json({ error: 'Falta ordenId' }, 400)

  const res = await supa(`ordenes?id=eq.${ordenId}&select=codigo_orden,total,comprador_id,reclamo_motivo,reclamo_en,` +
    'boletas(tribuna,fila,silla,plataforma,eventos(nombre),usuarios(nombre,correo))')
  const orden = (await res.json().catch(() => []))?.[0]
  // Solo el comprador de la orden, y solo si el reclamo ya quedó registrado
  if (!orden || orden.comprador_id !== user.id || !orden.reclamo_en) return json({ error: 'Orden no encontrada' }, 404)

  const b = orden.boletas || {}
  const escapar = t => String(t || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  await enviarCorreo(await correoAdmin(), `🛑 Reclamo de comprador — ${orden.codigo_orden}`,
    `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
      <h1 style="color:#dc2626;font-size:20px;">Un comprador reportó un problema</h1>
      <p><strong>Evento:</strong> ${escapar(b.eventos?.nombre)} · ${escapar(b.tribuna)}${b.fila ? ' · Fila ' + escapar(b.fila) : ''}${b.silla ? ' · Silla ' + escapar(b.silla) : ''}</p>
      <p><strong>Referencia:</strong> ${orden.codigo_orden} · <strong>Pagado:</strong> $${Number(orden.total || 0).toLocaleString('es-CO')}</p>
      <p><strong>Comprador:</strong> ${escapar(user.email)}</p>
      <p><strong>Vendedor:</strong> ${escapar(b.usuarios?.nombre)} · ${escapar(b.usuarios?.correo)}</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin:16px 0;white-space:pre-wrap;">${escapar(orden.reclamo_motivo)}</div>
      <p>El pago al vendedor quedó congelado. Resuélvelo desde el panel de admin: liberar el pago o reembolsar al comprador.</p>
    </div>`)
  return json({ ok: true })
}
