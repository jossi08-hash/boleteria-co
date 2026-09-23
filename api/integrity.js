export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://ssyelddmusabkxwijghn.supabase.co'

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await req.json();
  const { reference, amount, currency } = body;

  if (!reference || !amount || !currency) {
    return new Response(JSON.stringify({ error: 'Faltan campos: reference, amount, currency' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const secret = process.env.WOMPI_INTEGRITY_SECRET;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    return new Response(JSON.stringify({ error: 'Secreto de integridad no configurado' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!supabaseKey) {
    return new Response(JSON.stringify({ error: 'Service role key no configurada' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validar monto contra la BD antes de generar la firma
  const dbRes = await fetch(
    `${SUPABASE_URL}/rest/v1/ordenes?codigo_orden=eq.${reference}&select=total`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    }
  )
  const dbData = await dbRes.json()
  if (!Array.isArray(dbData) || dbData.length === 0) {
    return new Response(JSON.stringify({ error: 'Orden no encontrada' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  // Wompi maneja montos en centavos (enteros)
  const totalCentavos = Math.round(Number(dbData[0].total) * 100)
  if (Number(amount) !== totalCentavos) {
    return new Response(JSON.stringify({ error: 'Monto no coincide con el total de la orden' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const chain = `${reference}${amount}${currency}${secret}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(chain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return new Response(JSON.stringify({ signature }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
