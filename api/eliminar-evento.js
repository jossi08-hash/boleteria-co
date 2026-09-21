export const config = { runtime: 'edge' }

const SUPABASE_URL = 'https://ssyelddmusabkxwijghn.supabase.co'

export default async function handler(req) {
  if (req.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    return new Response(JSON.stringify({ error: 'Sin service role key' }), { status: 500 })
  }

  let body
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Body inválido' }), { status: 400 }) }

  const { eventoId, userEmail } = body
  if (!eventoId) return new Response(JSON.stringify({ error: 'Falta eventoId' }), { status: 400 })

  // Verificar que el usuario es admin
  const userRes = await fetch(
    `${SUPABASE_URL}/rest/v1/usuarios?email=eq.${encodeURIComponent(userEmail)}&select=es_admin`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  const users = await userRes.json()
  if (!users[0]?.es_admin) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 })
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/eventos?id=eq.${eventoId}`,
    {
      method: 'DELETE',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=representation'
      }
    }
  )

  const data = await res.json()
  return new Response(JSON.stringify({ ok: true, deleted: data }), { status: 200 })
}
