export const config = { runtime: 'edge' }

import { supa, totalEsperado } from './_lib/pagos.js'

// /evento/<id> llega aquí (rewrite en vercel.json). Devuelve el mismo index.html de la app,
// pero con título y descripción del partido para las vistas previas de WhatsApp, redes y Google,
// que no ejecutan JavaScript.
export default async function handler(req) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id') || ''
  const html = await (await fetch(new URL('/index.html', url))).text()
  if (!/^[0-9a-f-]{36}$/i.test(id)) return pagina(html)

  const [evRes, bolRes] = await Promise.all([
    supa(`eventos?id=eq.${id}&select=nombre,ciudad,estadio,fecha,moneda`),
    supa(`boletas?evento_id=eq.${id}&estado=eq.publicada&select=precio,publicada_por_admin`),
  ])
  const evento = (await evRes.json().catch(() => []))?.[0]
  if (!evento) return pagina(html)
  const boletas = await bolRes.json().catch(() => [])

  const fecha = evento.fecha
    ? new Date(evento.fecha + 'T12:00:00Z').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    : ''
  const lugar = [evento.estadio, evento.ciudad].filter(Boolean).join(', ')
  const precios = Array.isArray(boletas) ? boletas.map(totalEsperado).filter(p => p > 0) : []
  const desde = precios.length
    ? `Boletas desde ${evento.moneda === 'USD' ? 'US$' : '$'}${Math.min(...precios).toLocaleString('es-CO')}`
    : 'Compra y vende boletas'

  const titulo = `${evento.nombre}${fecha ? ` · ${fecha}` : ''}`
  const descripcion = `${desde}${lugar ? ` para ${evento.nombre} en ${lugar}` : ''}. Pago seguro con Wompi: tu dinero queda en custodia hasta que recibes tu boleta.`
  return pagina(html, {
    titulo: `${titulo} · Boletería CO`,
    descripcion,
    url: `https://boleteriaco.com/evento/${id}`,
  })
}

const escapar = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function pagina(html, meta) {
  if (meta) {
    const t = escapar(meta.titulo), d = escapar(meta.descripcion), u = escapar(meta.url)
    // Reemplazos con función: un texto como "$115.000" no debe leerse como "$1" (grupo de la expresión)
    const atributo = (selector, valor) => {
      html = html.replace(new RegExp(`(<meta ${selector} content=")[^"]*(")`), (_, a, b) => a + valor + b)
    }
    html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${t}</title>`)
    html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, (_, a, b) => a + u + b)
    atributo('name="description"', d)
    atributo('property="og:url"', u)
    atributo('property="og:title"', t)
    atributo('property="og:description"', d)
    atributo('name="twitter:title"', t)
    atributo('name="twitter:description"', d)
  }
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
