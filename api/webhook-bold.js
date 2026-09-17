export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const body = await req.text()
  let evento
  try { evento = JSON.parse(body) } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Verificar firma Bold (HMAC-SHA256) si hay secret configurado
  const secret = process.env.BOLD_WEBHOOK_SECRET
  if (secret) {
    const signature = req.headers.get('bold-signature') || ''
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
    const computed = 'sha256=' + Array.from(new Uint8Array(mac))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    if (signature !== computed) {
      return new Response('Invalid signature', { status: 401 })
    }
  }

  // Solo procesar pagos aprobados
  const tipo = evento.type || evento.event_type || ''
  const estado = evento.status || evento.data?.status || ''
  const esAprobado = tipo === 'SALE_APPROVED' || estado === 'APPROVED'
  if (!esAprobado) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  }

  const referencia = evento.reference_id || evento.data?.reference_id
  if (!referencia) {
    return new Response(JSON.stringify({ error: 'Sin referencia' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  // Delegar a notificar-vendedor (ya maneja DB updates + emails)
  const origin = new URL(req.url).origin
  try {
    await fetch(`${origin}/api/notificar-vendedor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referencia })
    })
  } catch (e) {
    console.error('Error llamando notificar-vendedor desde webhook-bold:', e)
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  })
}
