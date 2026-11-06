export const config = { runtime: 'edge' }

import { supa, json } from './_lib/pagos.js'
import {
  esNumerado, esNoNumerada, normalizar, tribunaDelEvento, precioValido, cantidadValida,
  planCantidad, resumenCantidad, planNumerada, estadoWeb, NO_NUMERADA, MAX_POR_TRIBUNA,
} from './_lib/hoja.js'

// La hoja de Google del socio llama aquí (Apps Script) al editar y cada minuto.
//   GET  → eventos próximos, con sus tribunas y si van numerados
//   POST { cantidad: [...], numeradas: [...] } → aplica los cambios y devuelve cómo quedó cada fila
// Solo toca boletas propias (publicada_por_admin) de las tribunas/sillas que están en la hoja.
// Nunca retira una boleta que alguien está pagando ni vuelve a publicar una vendida.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const SELECT_BOLETA = 'id,evento_id,tribuna,fila,silla,precio,plataforma,estado,reservada_hasta,creado_en,ordenes(estado_pago)'
const MAX_FILAS = 500

function hoyBogota() {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10)
}

async function leer(path) {
  const res = await supa(path)
  if (!res.ok) throw new Error(`Supabase ${res.status}`)
  return res.json()
}

async function escribir(path, method, body) {
  const res = await supa(path, { method, body: JSON.stringify(body), headers: { Prefer: 'return=representation' } })
  if (!res.ok) throw new Error(`Supabase ${res.status}`)
  return res.json()
}

const libre = ahora => `or=(estado.eq.publicada,and(estado.eq.reservada,reservada_hasta.lt.${ahora.toISOString()}))`
const ids = lista => `id=in.(${lista.join(',')})`

export default async function handler(req) {
  const token = process.env.SHEET_SYNC_TOKEN
  if (!token || token.length < 24 || req.headers.get('authorization') !== `Bearer ${token}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Sin service role key' }, 500)

  try {
    const eventos = await leer(`eventos?fecha=gte.${hoyBogota()}&select=id,nombre,deporte,ciudad,fecha,hora,tribunas&order=fecha,hora`)
    const porId = new Map(eventos.map(e => [e.id, e]))

    if (req.method === 'GET') {
      return json({ eventos: eventos.map(e => ({
        id: e.id, nombre: e.nombre, ciudad: e.ciudad, fecha: e.fecha, hora: e.hora,
        tribunas: e.tribunas || [], numerado: esNumerado(e),
      })) })
    }
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

    const body = await req.json().catch(() => null)
    const cantidad = Array.isArray(body?.cantidad) ? body.cantidad : []
    const numeradas = Array.isArray(body?.numeradas) ? body.numeradas : []
    if (cantidad.length + numeradas.length > MAX_FILAS) return json({ error: `Máximo ${MAX_FILAS} filas` }, 400)

    const admin = (await leer('usuarios?es_admin=eq.true&select=id&limit=1'))[0]
    if (!admin) return json({ error: 'No hay usuario admin' }, 500)

    // Validar filas y preparar claves
    const vistos = new Set()
    const validar = (f, numerada) => {
      const evento = UUID.test(String(f?.eventoId)) ? porId.get(f.eventoId) : null
      if (!evento) return { error: 'Evento no encontrado o ya pasó' }
      if (!numerada && esNumerado(evento)) return { error: 'Este partido es numerado: va en la pestaña Numeradas' }
      if (numerada && !esNumerado(evento)) return { error: 'Este evento va por cantidad: pásalo a la pestaña Por cantidad' }
      const tribuna = tribunaDelEvento(evento, f.tribuna)
      if (!tribuna) return { error: `Tribuna no válida. Opciones: ${(evento.tribunas || []).join(', ')}` }
      const precio = precioValido(f.precio)
      if (!precio) return { error: 'Precio no válido' }
      const plataforma = String(f.plataforma || '').trim().slice(0, 60) || null
      let clave = `${evento.id}|${normalizar(tribuna)}`
      const extra = {}
      if (numerada) {
        extra.fila = String(f.fila ?? '').trim().slice(0, 40)
        extra.silla = String(f.silla ?? '').trim().slice(0, 40)
        if (!extra.fila || !extra.silla) return { error: 'Falta fila o silla' }
        clave += `|${normalizar(extra.fila)}|${normalizar(extra.silla)}`
      } else {
        extra.quedan = cantidadValida(f.quedan)
        if (extra.quedan === null) return { error: 'En "Quedan" va un número entero (0 o más)' }
        if (extra.quedan > MAX_POR_TRIBUNA) return { error: `Máximo ${MAX_POR_TRIBUNA} por tribuna` }
        extra.base = cantidadValida(f.base)
      }
      if (vistos.has(clave)) return { error: 'Fila repetida' }
      vistos.add(clave)
      return { evento, tribuna, precio, plataforma, clave, deseado: f.estado, ...extra }
    }
    const filasC = cantidad.map(f => validar(f, false))
    const filasN = numeradas.map(f => validar(f, true))

    const eventoIds = [...new Set([...filasC, ...filasN].filter(f => !f.error).map(f => f.evento.id))]
    const cargar = async () => eventoIds.length === 0 ? [] :
      leer(`boletas?publicada_por_admin=eq.true&evento_id=in.(${eventoIds.join(',')})&select=${SELECT_BOLETA}&order=creado_en.desc`)
    let boletas = await cargar()
    const ahora = new Date()

    const deTribuna = (f, bs) => bs.filter(b => b.evento_id === f.evento.id && normalizar(b.tribuna) === normalizar(f.tribuna))
    const grupoC = (f, bs) => deTribuna(f, bs).filter(esNoNumerada)
    const silla = (f, bs) => deTribuna(f, bs).find(b => normalizar(b.fila) === normalizar(f.fila) && normalizar(b.silla) === normalizar(f.silla))
    const nueva = (f, fila, sillaN) => ({
      evento_id: f.evento.id, vendedor_id: admin.id, tribuna: f.tribuna, fila, silla: sillaN, cantidad: 1,
      precio: f.precio, plataforma: f.plataforma, publicada_por_admin: true, estado: 'publicada',
    })

    // Aplicar cambios
    const avisos = new Map()
    const insertar = []
    for (const f of filasC) {
      if (f.error) continue
      const plan = planCantidad({ boletas: grupoC(f, boletas), quedan: f.quedan, base: f.base, precio: f.precio, plataforma: f.plataforma, ahora })
      avisos.set(f, plan.avisos)
      for (let i = 0; i < plan.crear; i++) insertar.push(nueva(f, NO_NUMERADA, NO_NUMERADA))
      if (plan.retirar.length) {
        const hechas = await escribir(`boletas?${ids(plan.retirar)}&${libre(ahora)}`, 'PATCH', { estado: 'vendida', reservada_hasta: null, reservada_por: null })
        if (hechas.length < plan.retirar.length) plan.avisos.push('alguna se empezó a pagar en la web justo ahora')
      }
      if (plan.cambiarPrecio.length) {
        await escribir(`boletas?${ids(plan.cambiarPrecio)}&${libre(ahora)}`, 'PATCH', { precio: f.precio, plataforma: f.plataforma })
      }
    }
    for (const f of filasN) {
      if (f.error) continue
      const b = silla(f, boletas)
      const plan = planNumerada({ boleta: b, deseado: f.deseado, precio: f.precio, plataforma: f.plataforma, ahora })
      avisos.set(f, plan.aviso ? [plan.aviso] : [])
      if (plan.accion === 'crear') insertar.push(nueva(f, f.fila, f.silla))
      if (plan.accion === 'publicar') await escribir(`boletas?id=eq.${b.id}&estado=in.(oculta,verificando)`, 'PATCH', { estado: 'publicada', precio: f.precio, plataforma: f.plataforma })
      if (plan.accion === 'precio') await escribir(`boletas?id=eq.${b.id}&${libre(ahora)}`, 'PATCH', { precio: f.precio, plataforma: f.plataforma })
      if (plan.accion === 'vender' || plan.accion === 'retirar') {
        const filtro = plan.accion === 'vender'
          ? `or=(estado.in.(publicada,oculta,verificando),and(estado.eq.reservada,reservada_hasta.lt.${ahora.toISOString()}))`
          : libre(ahora)
        const cambio = plan.accion === 'vender' ? { estado: 'vendida', reservada_hasta: null, reservada_por: null } : { estado: 'oculta', reservada_hasta: null, reservada_por: null }
        const hechas = await escribir(`boletas?id=eq.${b.id}&${filtro}`, 'PATCH', cambio)
        if (hechas.length === 0) avisos.get(f).push('Alguien la está pagando en la web; se aplica si el pago no se completa')
      }
    }
    if (insertar.length) await escribir('boletas', 'POST', insertar)

    // Releer y devolver cómo quedó todo
    boletas = await cargar()
    const despues = new Date()
    return json({
      ok: true,
      cantidad: filasC.map(f => f.error ? { error: f.error } : {
        ...resumenCantidad(grupoC(f, boletas), despues), avisos: avisos.get(f) || [],
      }),
      numeradas: filasN.map(f => f.error ? { error: f.error } : {
        enLaWeb: estadoWeb(silla(f, boletas), despues), avisos: avisos.get(f) || [],
      }),
    })
  } catch (e) {
    return json({ error: e.message || 'Error' }, 502)
  }
}
