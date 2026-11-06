// Pruebas de la hoja del socio (api/hoja-socio.js) con Supabase simulado.
// Ejecutar con: npm test
import assert from 'node:assert/strict'
import { esNumerado, planCantidad } from '../api/_lib/hoja.js'

process.env.SUPABASE_SERVICE_ROLE_KEY = 'srk'
process.env.SHEET_SYNC_TOKEN = 'token-de-prueba-0123456789abcdef'
const handler = (await import('../api/hoja-socio.js')).default

// ---- equipos numerados ----
const f = nombre => ({ deporte: 'Futbol', nombre })
assert.ok(esNumerado(f('Independiente Santa Fe vs Deportivo Pasto')))
assert.ok(esNumerado(f('Millonarios vs Deportes Tolima')))
assert.ok(!esNumerado(f('Deportes Tolima vs Millonarios')))        // de visitante no
assert.ok(esNumerado(f('Atlético Nacional vs Deportivo Pereira')))
assert.ok(esNumerado(f('Independiente Medellín vs Fortaleza')))
assert.ok(!esNumerado(f('Fortaleza vs Independiente Medellín')))
assert.ok(esNumerado(f('América de Cali vs Deportivo Cali')))
assert.ok(esNumerado(f('Colombia vs Chile')))
assert.ok(!esNumerado(f('Boyacá Chicó vs Internacional de Bogotá')))
assert.ok(!esNumerado(f('Junior vs Cúcuta Deportivo')))
assert.ok(!esNumerado(f('Chile vs Colombia')))
assert.ok(!esNumerado({ deporte: 'Concierto', nombre: 'Congreso Nacional del Chupe' }))
console.log('✓ numerados: Santa Fe, Millonarios, Nacional, Medellín, América y Selección solo de locales; el resto por cantidad')

// ---- plan por cantidad: lo vendido en la web mientras el socio editaba no se pierde ----
const ahora = new Date()
const pub = (id, extra = {}) => ({ id, estado: 'publicada', precio: 50000, ...extra })
let p = planCantidad({ boletas: [pub('a'), pub('b'), pub('c')], quedan: 1, base: 5, precio: 50000, ahora })
// la hoja decía 5, en la web se vendieron 2 (quedan 3), el socio vendió 4 por fuera y escribió 1 → 3 - 4 = 0
assert.equal(p.objetivo, 0); assert.equal(p.retirar.length, 3); assert.equal(p.crear, 0)
p = planCantidad({ boletas: [pub('a')], quedan: 4, base: null, precio: 50000, ahora })
assert.equal(p.crear, 3)
const pagando = { id: 'r', estado: 'reservada', reservada_hasta: new Date(Date.now() + 600000).toISOString(), precio: 50000 }
p = planCantidad({ boletas: [pub('a'), pagando], quedan: 0, base: 2, precio: 50000, ahora })
assert.deepEqual(p.retirar, ['a']); assert.ok(p.avisos[0].includes('pagando'))
console.log('✓ por cantidad: aplica solo el cambio del socio y nunca retira una boleta que se está pagando')

// ---- base de datos simulada ----
const EV_CANT = '11111111-1111-1111-1111-111111111111'   // Junior: por cantidad
const EV_NUM = '22222222-2222-2222-2222-222222222222'    // Colombia vs Chile: numerado
const eventos = [
  { id: EV_CANT, nombre: 'Junior vs Cúcuta Deportivo', deporte: 'Futbol', ciudad: 'Barranquilla', fecha: '2099-11-09', tribunas: ['Norte', 'Sur', 'Oriental', 'Occidental'] },
  { id: EV_NUM, nombre: 'Colombia vs Chile', deporte: 'Futbol', ciudad: 'Cali', fecha: '2099-11-13', tribunas: ['Norte', 'Oriental Baja'] },
]
let boletas, n
const futuro = () => new Date(Date.now() + 600000).toISOString()
function reset() {
  n = 0
  boletas = [
    { id: 'c1', evento_id: EV_CANT, tribuna: 'Oriental', fila: 'No Numerada', silla: 'No Numerada', precio: 40000, estado: 'publicada', publicada_por_admin: true, ordenes: [] },
    { id: 'c2', evento_id: EV_CANT, tribuna: 'Oriental', fila: 'No Numerada', silla: 'No Numerada', precio: 40000, estado: 'vendida', publicada_por_admin: true, ordenes: [{ estado_pago: 'pagada' }] },
    { id: 'c3', evento_id: EV_CANT, tribuna: 'Oriental', fila: 'N/A', silla: 'N/A', precio: 40000, estado: 'reservada', reservada_hasta: futuro(), publicada_por_admin: true, ordenes: [] },
    { id: 'v1', evento_id: EV_CANT, tribuna: 'Oriental', fila: 'No Numerada', silla: 'No Numerada', precio: 40000, estado: 'publicada', publicada_por_admin: false, ordenes: [] },
    { id: 'n1', evento_id: EV_NUM, tribuna: 'Oriental Baja', fila: 'G · Bloque 13', silla: '201', precio: 300000, estado: 'publicada', publicada_por_admin: true, ordenes: [] },
    { id: 'n2', evento_id: EV_NUM, tribuna: 'Oriental Baja', fila: 'G · Bloque 13', silla: '202', precio: 300000, estado: 'reservada', reservada_hasta: futuro(), publicada_por_admin: true, ordenes: [] },
  ]
}
const ok = d => new Response(JSON.stringify(d), { status: 200, headers: { 'Content-Type': 'application/json' } })
const lista = v => v.replace(/^in\.\(|\)$/g, '').split(',')
function cumple(b, q) {
  const id = q.get('id'), est = q.get('estado'), or = q.get('or')
  if (id && !(id.startsWith('eq.') ? b.id === id.slice(3) : lista(id).includes(b.id))) return false
  if (est && !(est.startsWith('eq.') ? b.estado === est.slice(3) : lista(est).includes(b.estado))) return false
  if (q.get('publicada_por_admin') && !b.publicada_por_admin) return false
  if (q.get('evento_id') && !lista(q.get('evento_id')).includes(b.evento_id)) return false
  if (or) {
    const vencida = b.estado === 'reservada' && new Date(b.reservada_hasta) < new Date(or.match(/lt\.([^)]+)\)/)[1])
    const m = or.match(/estado\.(?:eq\.(\w+)|in\.\(([^)]+)\))/)
    const estados = m[1] ? [m[1]] : m[2].split(',')
    if (!(estados.includes(b.estado) || vencida)) return false
  }
  return true
}
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(String(url)); const m = opts.method || 'GET'
  if (u.pathname.endsWith('/eventos')) return ok(eventos)
  if (u.pathname.endsWith('/usuarios')) return ok([{ id: 'admin1' }])
  if (u.pathname.endsWith('/boletas')) {
    if (m === 'GET') return ok(boletas.filter(b => cumple(b, u.searchParams)))
    if (m === 'PATCH') {
      const cambio = JSON.parse(opts.body); const res = boletas.filter(b => cumple(b, u.searchParams))
      res.forEach(b => Object.assign(b, cambio)); return ok(res)
    }
    if (m === 'POST') {
      const nuevas = JSON.parse(opts.body).map(b => ({ id: 'nueva' + (++n), ordenes: [], ...b }))
      boletas.push(...nuevas); return ok(nuevas)
    }
  }
  return new Response('?', { status: 404 })
}
const llamar = (body, token = process.env.SHEET_SYNC_TOKEN) => handler(new Request('https://x/api/hoja-socio', {
  method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: body ? JSON.stringify(body) : undefined,
}))

// ---- seguridad ----
reset()
assert.equal((await llamar(null, 'otra-clave')).status, 401)
let r = await (await llamar(null)).json()
assert.deepEqual(r.eventos.map(e => e.numerado), [false, true])
console.log('✓ endpoint: sin la clave no entra; lista eventos con su tipo')

// ---- por cantidad ----
reset()
const fila = (extra) => ({ eventoId: EV_CANT, tribuna: 'oriental', precio: '45.000', plataforma: 'TuBoletaPass', ...extra })
r = await (await llamar({ cantidad: [fila({ quedan: 5, base: null })] })).json()
assert.deepEqual(r.cantidad[0], { quedan: 5, pagando: 1, vendidasWeb: 1, avisos: [] })
assert.equal(boletas.filter(b => b.id.startsWith('nueva')).length, 3)
assert.ok(boletas.filter(b => b.id.startsWith('nueva')).every(b => b.estado === 'publicada' && b.publicada_por_admin && b.tribuna === 'Oriental' && b.vendedor_id === 'admin1'))
assert.equal(boletas.find(b => b.id === 'c1').precio, 45000)                 // precio actualizado
assert.equal(boletas.find(b => b.id === 'v1').estado, 'publicada')           // la de un vendedor externo no se toca
r = await (await llamar({ cantidad: [fila({ quedan: 0, base: 5 })] })).json()
assert.equal(r.cantidad[0].quedan, 1)                                        // queda solo la que se está pagando
assert.equal(boletas.find(b => b.id === 'c3').estado, 'reservada')
assert.ok(r.cantidad[0].avisos[0].includes('pagando'))
r = await (await llamar({ cantidad: [fila({ eventoId: EV_NUM, tribuna: 'Norte', quedan: 2 })] })).json()
assert.ok(r.cantidad[0].error.includes('numerado'))
r = await (await llamar({ cantidad: [fila({ tribuna: 'Platea', quedan: 2 })] })).json()
assert.ok(r.cantidad[0].error.includes('Tribuna'))
console.log('✓ por cantidad: crea, retira como vendidas por fuera, respeta pagos en curso y valida evento y tribuna')

// ---- numeradas ----
reset()
const silla = (s, estado, extra) => ({ eventoId: EV_NUM, tribuna: 'Oriental Baja', fila: 'G · Bloque 13', silla: s, precio: 300000, estado, ...extra })
r = await (await llamar({ numeradas: [silla('201', 'Vendida por fuera'), silla('202', 'Vendida por fuera'), silla('203', 'Disponible')] })).json()
assert.deepEqual(r.numeradas.map(x => x.enLaWeb), ['Vendida por fuera', 'Pagando ahora', 'Disponible'])
assert.ok(r.numeradas[1].avisos[0].includes('pagando'))
assert.equal(boletas.find(b => b.silla === '203').estado, 'publicada')
r = await (await llamar({ numeradas: [silla('201', 'Disponible')] })).json()
assert.equal(r.numeradas[0].enLaWeb, 'Vendida por fuera')                    // vendida no se vuelve a publicar
assert.ok(r.numeradas[0].avisos[0].includes('vendida'))
r = await (await llamar({ numeradas: [silla('203', 'Retirada'), silla('203', 'Disponible')] })).json()
assert.equal(r.numeradas[0].enLaWeb, 'Retirada'); assert.equal(r.numeradas[1].error, 'Fila repetida')
console.log('✓ numeradas: publica, marca vendida por fuera, retira y nunca toca una vendida o en pago')

console.log('\nPRUEBAS DE LA HOJA PASARON')
