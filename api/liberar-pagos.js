export const config = { runtime: 'edge' }

const SUPABASE_URL = 'https://ssyelddmusabkxwijghn.supabase.co'

export default async function handler(req) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    return new Response(JSON.stringify({ error: 'Sin service role key' }), { status: 500 })
  }

  // Actualizar órdenes pagadas, no liberadas, con más de 72h de antigüedad
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ordenes?estado_pago=eq.pagada&liberado=eq.false&creado_en=lt.${new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()}`,
    {
      method: 'PATCH',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({ liberado: true, liberado_en: new Date().toISOString() })
    }
  )

  const data = await res.json()
  const count = Array.isArray(data) ? data.length : 0

  return new Response(JSON.stringify({ ok: true, liberadas: count }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}
