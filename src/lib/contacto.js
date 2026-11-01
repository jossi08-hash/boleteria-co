// Canales de atención de Boletería CO
export const WHATSAPP_VISIBLE = '+57 301 970 2612'
const WHATSAPP_NUMERO = '573019702612'

// Enlace a WhatsApp con un mensaje inicial opcional
export const enlaceWhatsApp = (mensaje = '') =>
  `https://wa.me/${WHATSAPP_NUMERO}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`
