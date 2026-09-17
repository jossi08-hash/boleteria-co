export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    })
  }

  let body
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const { referencia, total, moneda = 'COP', comprador } = body
  // comprador: { nombre, correo, cedula }

  if (!referencia || !total || !comprador?.cedula || !comprador?.nombre || !comprador?.correo) {
    return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const BOLD_API_KEY = process.env.BOLD_API_KEY
  if (!BOLD_API_KEY) {
    return new Response(JSON.stringify({ error: 'BOLD_API_KEY no configurada' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }

  const base = 'https://api.online.payments.bold.co'
  const headers = {
    'Authorization': `x-api-key ${BOLD_API_KEY}`,
    'Content-Type': 'application/json'
  }

  // 1. Crear payment intent
  const intentRes = await fetch(`${base}/v1/payment-intent`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      reference_id: referencia,
      amount: { currency: moneda, total_amount: total * 100 },
      description: `Boletería CO · ${referencia}`,
      callback_url: 'https://boleteriaco.com',
      customer: {
        name: comprador.nombre,
        email: comprador.correo,
        phone: '3000000000',
        billing_address: { address: 'Colombia', city: 'Bogota', country: 'CO' }
      }
    })
  })

  if (!intentRes.ok) {
    const err = await intentRes.text()
    return new Response(JSON.stringify({ error: 'Error creando intent', detalle: err }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }

  // 2. Ejecutar pago QR Bre-B
  const pagRes = await fetch(`${base}/v1/payment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      reference_id: referencia,
      payer: {
        person_type: 'NATURAL_PERSON',
        name: comprador.nombre,
        document_type: 'CEDULA',
        document_number: String(comprador.cedula)
      },
      payment_method: { name: 'QR', qr_format: 'IMAGE' },
      device_fingerprint: { device_type: 'DESKTOP', os: 'Web' }
    })
  })

  if (!pagRes.ok) {
    const err = await pagRes.text()
    return new Response(JSON.stringify({ error: 'Error generando QR', detalle: err }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }

  const pagData = await pagRes.json()
  return new Response(JSON.stringify({
    transaction_id: pagData.transaction_id,
    qr: pagData.next_actions?.qr_payload,
    expires_at: pagData.next_actions?.expires_at
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
