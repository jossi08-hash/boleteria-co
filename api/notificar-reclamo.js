export const config = { runtime: 'edge' }

import { supa, json, correoAdmin, enviarCorreo, SUPABASE_URL } from './_lib/pagos.js'
import { correo, boleta, aviso, parrafo, escapar } from './_lib/plantilla.js'

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
  await enviarCorreo(await correoAdmin(), `Reclamo de comprador — ${orden.codigo_orden}`, correo({
    titulo: 'Un comprador reportó un problema',
    previa: `Pago congelado · ${orden.codigo_orden}`,
    contenido: boleta([
      ['Evento', escapar(b.eventos?.nombre)],
      ['Ubicación', [escapar(b.tribuna), b.fila && 'Fila ' + escapar(b.fila), b.silla && 'Silla ' + escapar(b.silla)].filter(Boolean).join(' · ')],
      ['Referencia', orden.codigo_orden],
      ['Pagado', '$' + Number(orden.total || 0).toLocaleString('es-CO')],
      ['Comprador', escapar(user.email)],
      ['Vendedor', `${escapar(b.usuarios?.nombre)} · ${escapar(b.usuarios?.correo)}`],
    ]) +
      aviso('Motivo del reclamo', `<span style="white-space:pre-wrap;">${escapar(orden.reclamo_motivo)}</span>`) +
      parrafo('El pago al vendedor quedó congelado. Resuélvelo desde el panel de admin: liberar el pago o reembolsar al comprador.')
  }))
  return json({ ok: true })
}
