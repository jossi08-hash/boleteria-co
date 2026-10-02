// Pruebas de las funciones de api/ con Supabase, Wompi y Resend simulados.
// Ejecutar con: npm test
import assert from 'node:assert/strict'
const R = new URL('../api/', import.meta.url).href
process.env.SUPABASE_SERVICE_ROLE_KEY='srk'; process.env.RESEND_API_KEY='rk'; process.env.WOMPI_EVENTS_SECRET='evsecret'
process.env.WOMPI_INTEGRITY_SECRET='intsecret'; process.env.CRON_SECRET='cron'; process.env.VITE_WOMPI_PUBLIC_KEY='pub_prod_x'

// ---- Base de datos simulada ----
let db, calls
function reset() {
  calls = []
  db = { ordenes: [
    { id:'o1', codigo_orden:'BCO-ABC1234', total:115000, estado_pago:'pendiente', comprador_id:'c1', boleta_id:'b1', boletas:{ id:'b1', precio:100000, publicada_por_admin:false, eventos:{nombre:'Santa Fe vs Millos'}, usuarios:{correo:'vend@x.com', nombre:'Vend'} } },
    { id:'o2', codigo_orden:'BCO-ABC1234-2', total:50000, estado_pago:'pendiente', comprador_id:'c1', boleta_id:'b2', boletas:{ id:'b2', precio:50000, publicada_por_admin:true, eventos:{nombre:'Santa Fe vs Millos'}, usuarios:{correo:'admin@x.com'} } },
    { id:'o3', codigo_orden:'BCO-ZZZ9999', total:1000, estado_pago:'pendiente', comprador_id:'c2', boleta_id:'b3', boletas:{ id:'b3', precio:80000, publicada_por_admin:false } },
  ]}
}
const ok = d => new Response(JSON.stringify(d), { status:200, headers:{'Content-Type':'application/json'} })
globalThis.fetch = async (url, opts={}) => {
  url = String(url); const m = opts.method || 'GET'; calls.push({url, m, body: opts.body})
  if (url.startsWith('https://api.resend.com')) return ok({id:'e'})
  if (url.includes('/auth/v1/user')) {
    const tokens = { 'Bearer buen-token': {id:'c1', email:'comp@x.com'}, 'Bearer admin-token': {id:'admin1', email:'admin@x.com'} }
    const auth = opts.headers?.Authorization || opts.headers?.authorization
    return tokens[auth] ? ok(tokens[auth]) : new Response('no', {status:401})
  }
  if (url.includes('wompi.co/v1/transactions/')) {
    const id = url.split('/').pop()
    return ok({ data: id==='tx-ok' ? {status:'APPROVED', reference:'BCO-ABC1234', amount_in_cents:16500000}
                    : id==='tx-barato' ? {status:'APPROVED', reference:'BCO-ZZZ9999', amount_in_cents:100000}
                    : {status:'DECLINED', reference:'BCO-ABC1234', amount_in_cents:16500000} })
  }
  const u = new URL(url)
  if (u.pathname.endsWith('/usuarios')) {
    if (u.searchParams.get('select') === 'es_admin') return ok([{ es_admin: u.searchParams.get('id') === 'eq.admin1' }])
    return ok(u.search.includes('es_admin') ? [{correo:'admin@x.com'}] : [{id:'c1', correo:'comp@x.com', nombre:'Comp'}])
  }
  if (u.pathname.endsWith('/ordenes')) {
    const or = u.searchParams.get('or')
    if (m==='GET' && u.searchParams.get('id')?.startsWith('eq.')) return ok(db.ordenes.filter(o => 'eq.'+o.id === u.searchParams.get('id')))
    if (m==='GET' && or) {
      const ref = or.match(/codigo_orden\.eq\.([^,]+),/)[1]
      return ok(db.ordenes.filter(o => o.codigo_orden===ref || o.codigo_orden.startsWith(ref+'-')))
    }
    if (m==='PATCH' && u.searchParams.get('id') && u.searchParams.get('estado_pago')==='eq.pendiente') {
      const ids = u.searchParams.get('id').replace(/^in\.\(|\)$/g,'').split(',')
      const res = db.ordenes.filter(o => ids.includes(o.id) && o.estado_pago==='pendiente')
      res.forEach(o => o.estado_pago=JSON.parse(opts.body).estado_pago); return ok(res)
    }
    if (m==='PATCH' && u.searchParams.get('id')) {
      const ids = u.searchParams.get('id').replace(/^in\.\(|\)$/g,'').split(',')
      const res = db.ordenes.filter(o => ids.includes(o.id) && o.estado_pago!=='pagada')
      res.forEach(o => o.estado_pago='pagada'); return ok(res)
    }
    if (m==='PATCH') return ok([{codigo_orden:'BCO-OLD', subtotal:100000, boletas:{precio:100000, publicada_por_admin:false, eventos:{nombre:'Ev'}, usuarios:{nombre:'V', datos_pago:'Nequi 300'}}}, {codigo_orden:'BCO-ADM', subtotal:50000, boletas:{publicada_por_admin:true}}])
  }
  if (u.pathname.endsWith('/boletas')) return ok([])
  throw new Error('fetch no simulado: '+url)
}
const correos = () => calls.filter(c => c.url.includes('resend')).map(c => JSON.parse(c.body))
const post = (body, headers={}) => new Request('https://x/api', { method:'POST', body: JSON.stringify(body), headers })

const lib = await import(R+'_lib/pagos.js')
// 1. Fórmula igual a la del frontend
for (const precio of [100000, 87300, 50000, 12345]) {
  const front = precio + (Math.round(precio*1.15/1000)*1000 - precio)
  assert.equal(lib.totalEsperado({precio}), front)
  assert.equal(lib.totalEsperado({precio, publicada_por_admin:true}), precio)
}
assert.equal(lib.referenciaValida('BCO-ABC1234'), true); assert.equal(lib.referenciaValida('BCO-X),id.neq.(0'), false)
console.log('✓ fórmula y validación de referencia')

// 2. confirmar-pago: carrito de 2 (115.000 + 50.000 admin) aprobado
reset()
const confirmar = (await import(R+'confirmar-pago.js')).default
let r = await (await confirmar(post({transaccionId:'tx-ok'}))).json()
assert.deepEqual(r, {ok:true, confirmadas:2})
assert.equal(db.ordenes[0].estado_pago, 'pagada'); assert.equal(db.ordenes[1].estado_pago, 'pagada')
const asuntos = correos().map(c => c.to+' | '+c.subject)
assert.ok(asuntos.some(a => a.startsWith('vend@x.com | ¡Vendiste')))
assert.ok(asuntos.some(a => a.startsWith('admin@x.com | 🎟️ Nueva venta')))   // boleta admin
assert.ok(asuntos.some(a => a.startsWith('admin@x.com | 🔔')))
assert.equal(asuntos.filter(a => a.startsWith('comp@x.com')).length, 2)
console.log('✓ pago aprobado marca 2 órdenes y envía', asuntos.length, 'correos')
// repetido (webhook + regreso del comprador): no duplica
const n = correos().length
r = await (await confirmar(post({transaccionId:'tx-ok'}))).json()
assert.equal(r.yaConfirmado, true); assert.equal(correos().length, n)
console.log('✓ segunda confirmación no duplica correos')
// rechazado: órdenes fallidas y boletas de vuelta a la venta
reset(); r = await (await confirmar(post({transaccionId:'tx-no'}))).json()
assert.equal(r.rechazadas, 2); assert.equal(r.status, 'DECLINED')
assert.equal(db.ordenes[0].estado_pago, 'fallida'); assert.equal(db.ordenes[1].estado_pago, 'fallida')
const lib2 = calls.find(c => c.m==='PATCH' && c.url.includes('/boletas?id=in.(b1,b2)&estado=eq.reservada'))
assert.ok(lib2 && JSON.parse(lib2.body).estado==='publicada' && JSON.parse(lib2.body).reservada_por===null)
assert.equal(correos().length, 0)
console.log('✓ transacción rechazada: órdenes fallidas y boletas liberadas, sin correos')
// orden con total manipulado (pagó 1.000 por boleta de 80.000)
reset(); r = await (await confirmar(post({transaccionId:'tx-barato'}))).json()
assert.equal(r.error, 'Monto no coincide'); assert.equal(db.ordenes[2].estado_pago, 'pendiente')
assert.ok(correos()[0].subject.includes('monto incorrecto'))
console.log('✓ monto manipulado se rechaza y avisa al admin')

// 3. webhook con firma
const webhook = (await import(R+'webhook-wompi.js')).default
const { createHash } = await import('node:crypto')
const evento = (tx, secret='evsecret') => {
  const e = { event:'transaction.updated', data:{transaction:tx}, timestamp:1700000000,
    signature:{ properties:['transaction.id','transaction.status','transaction.amount_in_cents'] } }
  e.signature.checksum = createHash('sha256').update(`${tx.id}${tx.status}${tx.amount_in_cents}${e.timestamp}${secret}`).digest('hex').toUpperCase()
  return e
}
reset()
const tx = {id:'1-2', status:'APPROVED', reference:'BCO-ABC1234', amount_in_cents:16500000}
assert.equal((await webhook(post(evento(tx, 'otro')))).status, 401)
const falso = evento(tx); falso.data.transaction = {...tx, amount_in_cents: 100}
assert.equal((await webhook(post(falso))).status, 401)
assert.equal(db.ordenes[0].estado_pago, 'pendiente')
r = await (await webhook(post(evento(tx)))).json()
assert.equal(r.confirmadas, 2)
reset(); r = await (await webhook(post(evento({...tx, status:'DECLINED'})))).json()
assert.equal(r.rechazadas, 2); assert.equal(db.ordenes[0].estado_pago, 'fallida')
console.log('✓ webhook: firma falsa → 401, firma válida → confirma')

// 4. integrity
const integrity = (await import(R+'integrity.js')).default
reset()
assert.equal((await integrity(post({reference:'BCO-ABC1234', amount:16500000, currency:'COP'}))).status, 200)
assert.equal((await integrity(post({reference:'BCO-ABC1234', amount:11500000, currency:'COP'}))).status, 400)
assert.equal((await integrity(post({reference:'BCO-ZZZ9999', amount:100000, currency:'COP'}))).status, 400)
console.log('✓ integrity: carrito correcto firma; monto parcial o manipulado se rechaza')

// 5. liberar-pagos
const liberar = (await import(R+'liberar-pagos.js')).default
reset()
assert.equal((await liberar(new Request('https://x', {headers:{}}))).status, 401)
assert.equal((await liberar(new Request('https://x', {headers:{authorization:'Bearer mal'}}))).status, 401)
r = await (await liberar(new Request('https://x', {headers:{authorization:'Bearer cron'}}))).json()
assert.deepEqual(r, {ok:true, liberadas:2, porPagar:1, reservasVencidas:0})
assert.ok(calls.some(c => c.m==='PATCH' && c.url.includes('/boletas?estado=eq.reservada&reservada_hasta=lt.')))
const c = correos()[0]; assert.ok(c.subject.includes('1 pago')); assert.ok(c.html.includes('$92.000'))
reset(); r = await (await liberar(new Request('https://x', {headers:{'x-cron-secret':'cron'}}))).json(); assert.equal(r.ok, true)
assert.ok(calls.some(c => c.m==='PATCH' && c.url.includes('/ordenes?estado_pago=eq.pagada&liberado=eq.false&reclamo_en=is.null')))
console.log('✓ liberar-pagos: autenticación, libera y avisa solo vendedores externos ($92.000)')

// 6. reserva vencida y boleta vendida a otro comprador
reset(); db.ordenes[0].boletas.estado = 'vendida'
r = await (await confirmar(post({transaccionId:'tx-ok'}))).json()
assert.equal(r.confirmadas, 1)                      // solo la boleta del admin
assert.equal(db.ordenes[0].estado_pago, 'pendiente')
assert.equal(db.ordenes[1].estado_pago, 'pagada')
assert.ok(correos().some(c => c.subject.includes('Reembolso necesario') && c.html.includes('BCO-ABC1234')))
reset(); db.ordenes.forEach(o => o.boletas.estado = 'vendida')
r = await (await confirmar(post({transaccionId:'tx-ok'}))).json()
assert.equal(r.reembolso, true)
console.log('✓ boleta vendida a otro: no se duplica la venta y se pide reembolso')

// 7. aviso de reclamo
const reclamo = (await import(R+'notificar-reclamo.js')).default
const UUID = '11111111-1111-1111-1111-111111111111'
reset(); db.ordenes[0].id = UUID
assert.equal((await reclamo(post({ordenId:UUID}, {Authorization:'Bearer malo'}))).status, 401)
assert.equal((await reclamo(post({ordenId:UUID}, {Authorization:'Bearer buen-token'}))).status, 404)   // aún sin reclamo registrado
db.ordenes[0].reclamo_en = '2026-10-02T10:00:00Z'; db.ordenes[0].reclamo_motivo = 'No me llegó <b>nada</b>'
r = await (await reclamo(post({ordenId:UUID}, {Authorization:'Bearer buen-token'}))).json()
assert.equal(r.ok, true)
const cr = correos()[0]; assert.ok(cr.subject.includes('Reclamo') && cr.html.includes('&lt;b&gt;nada') && !cr.html.includes('<b>nada'))
db.ordenes[0].comprador_id = 'otro'
assert.equal((await reclamo(post({ordenId:UUID}, {Authorization:'Bearer buen-token'}))).status, 404)
console.log('✓ aviso de reclamo: exige sesión, solo el comprador, texto escapado')

// 8. correos de pago: solo quien corresponde puede dispararlos
const pagoVendedor = (await import(R+'notificar-vendedor-pago.js')).default
const pagoAdmin = (await import(R+'notificar-pago-admin.js')).default
reset(); db.ordenes[0].id = UUID
assert.equal((await pagoVendedor(post({ordenId:UUID}, {Authorization:'Bearer buen-token'}))).status, 403)   // comprador no es admin
assert.equal((await pagoVendedor(post({ordenId:UUID}, {Authorization:'Bearer admin-token'}))).status, 409)  // aún no marcada como pagada
db.ordenes[0].pago_vendedor_enviado = true
assert.equal((await pagoVendedor(post({ordenId:UUID}, {Authorization:'Bearer admin-token'}))).status, 200)
assert.ok(correos().some(c => c.to === 'vend@x.com'))
assert.equal((await pagoVendedor(post({ordenId:'x&id=neq.0'}, {Authorization:'Bearer admin-token'}))).status, 400)
reset(); db.ordenes[0].id = UUID
assert.equal((await pagoAdmin(post({ordenId:UUID}, {Authorization:'Bearer buen-token'}))).status, 404)     // sin confirmar recibo
db.ordenes[0].liberado = true
assert.equal((await pagoAdmin(post({ordenId:UUID}, {Authorization:'Bearer admin-token'}))).status, 404)    // no es el comprador
assert.equal((await pagoAdmin(post({ordenId:UUID}, {Authorization:'Bearer buen-token'}))).status, 200)
assert.ok(correos().some(c => c.to === 'admin@x.com'))
console.log('✓ correos de pago: "pago en camino" solo admin tras marcar pagada; "pagar vendedor" solo el comprador tras confirmar')
console.log('\nTODAS LAS PRUEBAS PASARON')
