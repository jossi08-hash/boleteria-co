export const config = { runtime: 'edge' };

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

  if (!secret) {
    return new Response(JSON.stringify({ error: 'Secreto de integridad no configurado' }), {
      status: 500,
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
