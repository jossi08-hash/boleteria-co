export const config = { runtime: 'edge' }

const SUPABASE_URL = 'https://ssyelddmusabkxwijghn.supabase.co'

export default async function handler(req) {
  if (req.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return new Response(JSON.stringify({ error: 'Sin service role key' }), { status: 500 })

  // Leer body primero (stream se consume una sola vez)
  let eventoId
  try { const b = await req.json(); eventoId = b.eventoId } catch { return new Response(JSON.stringify({ error: 'Body inválido' }), { status: 400 }) }
  if (!eventoId) return new Response(JSON.stringify({ error: 'Falta eventoId' }), { status: 400 })

  // Verificar JWT
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  if (!token) return new Response(JSON.stringify({ error: 'Sin token' }), { status: 401 })

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` }
  })
  const userData = await userRes.json()
  if (!userRes.ok || !userData.id) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401 })

  // Verificar es_admin
  const adminRes = await fetch(
    `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${userData.id}&select=es_admin`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  const adminData = await adminRes.json()
  if (!adminData[0]?.es_admin) return new Response(JSON.stringify({ error: 'No eres admin' }), { status: 403 })

  // Eliminar evento
  const res = await fetch(`${SUPABASE_URL}/rest/v1/eventos?id=eq.${eventoId}`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'return=representation' }
  })
  const data = await res.json()
  return new Response(JSON.stringify({ ok: true, deleted: data }), { status: 200 })
}
