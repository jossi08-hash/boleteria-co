import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const SUPABASE_URL = 'https://ssyelddmusabkxwijghn.supabase.co'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { referencia } = req.body
  if (!referencia) {
    return res.status(400).json({ error: 'Falta referencia' })
  }

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const resend = new Resend(process.env.RESEND_API_KEY)

  // 1. Obtener la orden
  const { data: orden } = await supabase
    .from('ordenes')
    .select('boleta_id, total')
    .eq('codigo_orden', referencia)
    .single()

  if (!orden) {
    return res.status(404).json({ error: 'Orden no encontrada' })
  }

  // 2. Obtener la boleta y evento
  const { data: boleta } = await supabase
    .from('boletas')
    .select('vendedor_id, precio, tribuna, fila, silla, eventos(nombre)')
    .eq('id', orden.boleta_id)
    .single()

  if (!boleta) {
    return res.status(404).json({ error: 'Boleta no encontrada' })
  }

  // 3. Obtener email del vendedor
  const { data: { user } } = await supabase.auth.admin.getUserById(boleta.vendedor_id)
  if (!user?.email) {
    return res.status(404).json({ error: 'Vendedor sin email' })
  }

  const eventoNombre = boleta.eventos?.nombre || 'Evento'
  const ubicacion = [boleta.tribuna, boleta.fila && `Fila ${boleta.fila}`, boleta.silla && `Silla ${boleta.silla}`].filter(Boolean).join(' · ')

  // 4. Enviar email
  await resend.emails.send({
    from: 'Boleteria CO <onboarding@resend.dev>',
    to: user.email,
    subject: `Vendiste tu boleta para ${eventoNombre}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
        <h1 style="color:#16a34a;font-size:24px;">Vendiste una boleta!</h1>
        <p style="color:#374151;">Se completo el pago de tu boleta en <strong>Boleteria CO</strong>.</p>
        
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 8px;"><strong>Evento:</strong> ${eventoNombre}</p>
          <p style="margin:0 0 8px;"><strong>Ubicacion:</strong> ${ubicacion || 'N/A'}</p>
          <p style="margin:0 0 8px;"><strong>Precio vendido:</strong> $${Number(boleta.precio).toLocaleString('es-CO')}</p>
          <p style="margin:0;"><strong>Referencia:</strong> ${referencia}</p>
        </div>

        <p style="color:#dc2626;font-weight:bold;">Recuerda enviarle la boleta al comprador lo antes posible.</p>
        <p style="color:#6b7280;font-size:13px;">El comprador se comunicara contigo por la plataforma.</p>
        
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
        <p style="color:#9ca3af;font-size:12px;">Boleteria CO · boleteriaco.com</p>
      </div>
    `
  })

  return res.status(200).json({ ok: true })
}
