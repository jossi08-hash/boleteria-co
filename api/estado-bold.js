export const config = { runtime: 'edge' }

export default async function handler(req) {
  const url = new URL(req.url)
  const referencia = url.searchParams.get('referencia')
  if (!referencia) {
    return new Response(JSON.stringify({ error: 'Falta referencia' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const BOLD_API_KEY = process.env.BOLD_API_KEY
  if (!BOLD_API_KEY) {
    return new Response(JSON.stringify({ error: 'BOLD_API_KEY no configurada' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const res = await fetch(`https://api.online.payments.bold.co/v1/payment/${encodeURIComponent(referencia)}`, {
      headers: { 'Authorization': `x-api-key ${BOLD_API_KEY}` }
    })
    const data = await res.json()
    return new Response(JSON.stringify({ status: data.status }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Error consultando Bold', detalle: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}
