export const config = { runtime: 'edge' }

const SUPABASE_URL = 'https://ssyelddmusabkxwijghn.supabase.co'

export default async function handler(req) {
  if (req.method !== 'PATCH') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return new Response(JSON.stringify({ error: 'Sin service role key' }), { status: 500 })

  // Leer body primero (stream se consume una sola vez)
  let eventoId, campos
  try {
    const b = await req.json()
    eventoId = b.eventoId
    campos = b.campos
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), { status: 400 })
  }
  if (!eventoId || !campos) return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400 })

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

  // Actualizar evento
  const res = await fetch(`${SUPABASE_URL}/rest/v1/eventos?id=eq.${eventoId}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(campos)
  })
  const data = await res.json()
  return new Response(JSON.stringify({ ok: true, updated: data }), { status: 200 })
}
