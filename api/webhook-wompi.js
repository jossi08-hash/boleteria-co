export const config = { runtime: 'edge' }

import { confirmarPago, rechazarPago, esRechazado, json } from './_lib/pagos.js'

// Evento de Wompi: https://docs.wompi.co/docs/colombia/eventos/
// Configurar en el panel de Wompi la URL https://www.boleteriaco.com/api/webhook-wompi
export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const secret = process.env.WOMPI_EVENTS_SECRET
  if (!secret) return json({ error: 'WOMPI_EVENTS_SECRET no configurada' }, 500)

  let evento
  try { evento = await req.json() } catch { return json({ error: 'Body inválido' }, 400) }

  // Verificar firma: SHA256(valores de signature.properties + timestamp + secreto de eventos)
  const props = evento?.signature?.properties || []
  const valor = ruta => ruta.split('.').reduce((o, k) => (o == null ? o : o[k]), evento.data)
  const cadena = props.map(valor).join('') + evento.timestamp + secret
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cadena))
  const checksum = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  if (!evento?.signature?.checksum || checksum !== String(evento.signature.checksum).toLowerCase()) {
    return json({ error: 'Firma inválida' }, 401)
  }

  const tx = evento.data?.transaction
  if (evento.event !== 'transaction.updated') return json({ ok: true, omitido: true })
  if (esRechazado(tx?.status)) return json(await rechazarPago(tx.reference))
  if (tx?.status !== 'APPROVED') return json({ ok: true, omitido: true })

  const resultado = await confirmarPago(tx.reference, tx.amount_in_cents)
  // Responder 200 aunque el monto no coincida: reintentar no lo arreglaría y el admin ya fue avisado
  return json(resultado)
}
