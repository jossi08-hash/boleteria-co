export const config = { runtime: 'edge' }

import { confirmarPago, json } from './_lib/pagos.js'

// Llamado por el frontend cuando Wompi redirige de vuelta con ?id=<transacción>.
// No confía en el cliente: consulta la transacción directamente a Wompi antes de confirmar.
export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let transaccionId
  try { ({ transaccionId } = await req.json()) } catch { return json({ error: 'Body inválido' }, 400) }
  if (!transaccionId || !/^[\w-]+$/.test(transaccionId)) return json({ error: 'Falta transaccionId' }, 400)

  const base = process.env.VITE_WOMPI_PUBLIC_KEY?.startsWith('pub_test')
    ? 'https://sandbox.wompi.co/v1'
    : 'https://production.wompi.co/v1'
  const res = await fetch(`${base}/transactions/${transaccionId}`)
  const tx = (await res.json().catch(() => null))?.data
  if (!tx) return json({ error: 'Transacción no encontrada' }, 404)

  if (tx.status !== 'APPROVED') return json({ ok: false, status: tx.status })
  return json(await confirmarPago(tx.reference, tx.amount_in_cents))
}
