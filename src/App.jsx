import { useEffect, useState } from 'react'
import { obtenerBoletas, publicarBoleta, crearOrden, obtenerVentasDeUsuario, obtenerMisCompras, obtenerMisVentas } from './lib/boletas'
import { registrarUsuario, iniciarSesion, cerrarSesion, obtenerUsuarioActual, enviarRecuperacion, actualizarPassword } from './lib/auth'
import { supabase } from './lib/supabase'

const ADMIN_EMAIL = 'jossi08@icloud.com'

const PLATAFORMAS = {
  'TuBoletaPass': {
    equipos: ['santa fe','america','llaneros','tolima'],
    color: '#e85d04',
    instrVendedor: 'Abre TuBoletaPass → Mis Boletas → selecciona la boleta → Transferir → ingresa el correo del comprador.',
    instrComprador: 'Descarga TuBoletaPass en App Store o Google Play. Regístrate con tu cédula y correo. El vendedor te transferirá la boleta; aparecerá en "Mis Boletas".',
  },
  'Quentro': {
    equipos: ['millonarios','nacional','atletico nacional'],
    color: '#2563eb',
    instrVendedor: 'Abre Quentro → Mi Perfil → Mis Boletas → selecciona la entrada → Transferir → ingresa el correo del comprador registrado en Quentro.',
    instrComprador: 'Descarga Quentro en App Store o Google Play. Regístrate con tu correo y número de documento. El vendedor te transferirá la entrada; recibirás una notificación en la app.',
  },
  'Warena': {
    equipos: ['cucuta','junior','atletico junior'],
    color: '#7c3aed',
    instrVendedor: 'Abre Warena → Mis Entradas → selecciona la entrada → Ceder entrada → ingresa el correo del comprador.',
    instrComprador: 'Descarga Warena en App Store o Google Play. Crea tu cuenta con tu correo. El vendedor te cederá la entrada y aparecerá en "Mis Entradas".',
  },
  'Dim Plus': {
    equipos: ['independiente medellin','medellin','dim'],
    color: '#dc2626',
    instrVendedor: 'Abre Dim Plus → Mis Boletas → selecciona la boleta → Compartir → ingresa el correo del comprador.',
    instrComprador: 'Descarga Dim Plus en App Store o Google Play. Regístrate con tu correo. El vendedor compartirá la boleta a tu correo registrado en la app.',
  },
}

function sugerirPlataforma(nombreEvento) {
  if (!nombreEvento) return ''
  const lower = nombreEvento.toLowerCase()
  for (const [nombre, data] of Object.entries(PLATAFORMAS)) {
    if (data.equipos.some(eq => lower.includes(eq))) return nombre
  }
  return ''
}


function App() {
  const [esMobile, setEsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640)
  const [boletas, setBoletas] = useState([])
  const [boletasPendientes, setBoletasPendientes] = useState([])
  const [ordenesLiberadas, setOrdenesLiberadas] = useState([])
  const [ventasPorVendedor, setVentasPorVendedor] = useState({})
  const [cargando, setCargando] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [mostrarAdmin, setMostrarAdmin] = useState(false)
  const [eventos, setEventos] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [comprando, setComprando] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [vistaAuth, setVistaAuth] = useState(null)
  const [formAuth, setFormAuth] = useState({ nombre: '', correo: '', password: '', nuevaPassword: '' })
  const [esRecuperacion, setEsRecuperacion] = useState(false)
  const [mensajeAuth, setMensajeAuth] = useState('')
  const [formEvento, setFormEvento] = useState({ nombre: '', deporte: 'Futbol', ciudad: '', estadio: '', fecha: '', hora: '', moneda: 'COP' })
  const [mensajeEvento, setMensajeEvento] = useState('')
  const [form, setForm] = useState({ eventoId: '', tribuna: '', fila: '', silla: '', cantidad: 1, precio: '', plataforma: '' })
  const [pagoStatus, setPagoStatus] = useState(null)
  const [pagoInfo, setPagoInfo] = useState(null)
  const [paginaActual, setPaginaActual] = useState('inicio')
  const [pestanaMis, setPestanaMis] = useState('compras')
  const [misCompras, setMisCompras] = useState([])
  const [misVentas, setMisVentas] = useState([])
  const [cargandoMis, setCargandoMis] = useState(false)
  const [filtros, setFiltros] = useState({ ciudad: '', deporte: '', precioMax: '' })


  const esAdmin = usuario && usuario.email === ADMIN_EMAIL

  useEffect(() => {
    const onResize = () => setEsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    cargarBoletas()
    cargarEventos()
    obtenerUsuarioActual().then(u => setUsuario(u))

    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('id') || urlParams.get('status') || urlParams.get('pago') === 'exitoso') {
      procesarResultadoPago(urlParams)
    }

    // Escuchar cambios de autenticación: confirmación de email y recuperación de contraseña
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUsuario(session.user)
        setVistaAuth(null)
        setMensajeAuth('')
      }
      if (event === 'PASSWORD_RECOVERY') {
        setEsRecuperacion(true)
        setVistaAuth('nueva-password')
      }
    })
    return () => authListener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (esAdmin) { cargarBoletasPendientes(); cargarOrdenesLiberadas() }
  }, [esAdmin])

  async function procesarResultadoPago(params) {
    let status = params.get('status')
    let referencia = params.get('reference')
    const transaccionId = params.get('id')

    window.history.replaceState({}, document.title, window.location.pathname)

    // Si Wompi solo mandó el id, consultamos la API para obtener status y referencia
    if (transaccionId && !status) {
      try {
        const wompiBase = import.meta.env.VITE_WOMPI_PUBLIC_KEY?.startsWith('pub_test')
          ? 'https://sandbox.wompi.co/v1'
          : 'https://production.wompi.co/v1'
        const txRes = await fetch(`${wompiBase}/transactions/${transaccionId}`)
        const txData = await txRes.json()
        if (txData?.data) {
          status = txData.data.status
          referencia = txData.data.reference
        }
      } catch (e) {
        console.error('Error consultando Wompi:', e)
      }
    }

    if (status === 'APPROVED' && referencia) {
      const { data: orden } = await supabase
        .from('ordenes').select('id, boleta_id').eq('codigo_orden', referencia).single()
      if (orden) {
        await supabase.from('ordenes').update({ estado_pago: 'pagada' }).eq('id', orden.id)
        await supabase.from('boletas').update({ estado: 'vendida' }).eq('id', orden.boleta_id)
        cargarBoletas()
        // Notificar al vendedor por email
        fetch('/api/notificar-vendedor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referencia })
        })
      }
      setPagoInfo({ referencia, transaccionId })
      setPagoStatus('exitoso')
    } else if (status === 'DECLINED' || status === 'ERROR' || status === 'VOIDED') {
      if (referencia) {
        await supabase.from('ordenes').update({ estado_pago: 'fallida' }).eq('codigo_orden', referencia)
        // Liberar la boleta para que otros puedan comprarla
        const { data: ord } = await supabase.from('ordenes').select('boleta_id').eq('codigo_orden', referencia).single()
        if (ord) await supabase.from('boletas').update({ estado: 'publicada', reservada_hasta: null }).eq('id', ord.boleta_id)
      }
      setPagoStatus('fallido')
    } else if (status === 'PENDING') {
      setPagoStatus('pendiente')
    }
  }


  async function confirmarRecibo(ordenId) {
    const { error } = await supabase
      .from('ordenes')
      .update({ liberado: true, liberado_en: new Date().toISOString() })
      .eq('id', ordenId)
      .eq('comprador_id', usuario.id)
    if (error) { console.error('Error confirmando recibo:', error.message); alert('Hubo un error. Intenta de nuevo.'); return }
    cargarMisBoletas()
  }

  async function entregarBoleta(ordenId, file) {
    setSubiendoArchivo(ordenId)
    try {
      const ext = file.name.split('.').pop().toLowerCase()
      const path = ordenId + '/boleta.' + ext
      const { error: upErr } = await supabase.storage.from('boletas-entregadas').upload(path, file, { upsert: true })
      if (upErr) { alert('Error al subir el archivo: ' + upErr.message); return }
      const { data: { publicUrl } } = supabase.storage.from('boletas-entregadas').getPublicUrl(path)
      const { error: dbErr } = await supabase.from('ordenes').update({ archivo_url: publicUrl }).eq('id', ordenId)
      if (dbErr) { alert('Error al guardar la URL: ' + dbErr.message); return }
      cargarMisBoletas()
    } finally {
      setSubiendoArchivo(null)
    }
  }

  async function cargarMisBoletas() {
    if (!usuario) return
    setCargandoMis(true)
    const [compras, ventas] = await Promise.all([
      obtenerMisCompras(usuario.id),
      obtenerMisVentas(usuario.id)
    ])
    setMisCompras(compras)
    setMisVentas(ventas)
    setCargandoMis(false)
  }

  async function cargarBoletas() {
    // Liberar reservas expiradas
    await supabase
      .from('boletas')
      .update({ estado: 'publicada', reservada_hasta: null })
      .eq('estado', 'reservada')
      .lt('reservada_hasta', new Date().toISOString())
    const data = await obtenerBoletas()
    setBoletas(data)
    setCargando(false)
    const ventas = {}
    for (const b of data) {
      if (b.vendedor_id && !(b.vendedor_id in ventas)) {
        const { count } = await supabase
          .from('boletas')
          .select('id', { count: 'exact' })
          .eq('vendedor_id', b.vendedor_id)
          .eq('estado', 'vendida')
        ventas[b.vendedor_id] = count || 0
      }
    }
    setVentasPorVendedor(ventas)
  }

  async function cargarOrdenesLiberadas() {
    const { data, error } = await supabase
      .from('ordenes')
      .select(`id, codigo_orden, total, creado_en, liberado_en, pago_vendedor_enviado,
        boletas(tribuna, fila, silla, precio, vendedor_id,
          eventos(nombre, ciudad),
          usuarios(nombre, correo))`)
      .eq('estado_pago', 'pagada')
      .eq('liberado', true)
      .eq('pago_vendedor_enviado', false)
      .order('liberado_en', { ascending: true })
    if (!error) setOrdenesLiberadas(data || [])
  }

  async function marcarPagadoVendedor(ordenId) {
    const { error } = await supabase
      .from('ordenes')
      .update({ pago_vendedor_enviado: true })
      .eq('id', ordenId)
    if (!error) cargarOrdenesLiberadas()
  }

  async function cargarBoletasPendientes() {
    const { data } = await supabase
      .from('boletas')
      .select('id, tribuna, fila, silla, precio, estado, eventos(nombre, ciudad)')
      .eq('estado', 'verificando')
    setBoletasPendientes(data || [])
  }

  async function aprobarBoleta(id) {
    await supabase.from('boletas').update({ estado: 'publicada' }).eq('id', id)
    cargarBoletasPendientes()
    cargarBoletas()
  }

  async function rechazarBoleta(id) {
    await supabase.from('boletas').delete().eq('id', id)
    cargarBoletasPendientes()
  }

  async function cargarEventos() {
    const { data } = await supabase.from('eventos').select('id, nombre, moneda')
    setEventos(data || [])
  }

  function manejarCambio(e) {
    const updated = { ...form, [e.target.name]: e.target.value }
    if (e.target.name === 'eventoId') {
      const ev = eventos.find(ev => ev.id === e.target.value)
      const sugerida = ev ? sugerirPlataforma(ev.nombre) : ''
      if (sugerida) updated.plataforma = sugerida
    }
    setForm(updated)
  }
  function manejarCambioAuth(e) { setFormAuth({ ...formAuth, [e.target.name]: e.target.value }) }
  function manejarCambioEvento(e) { setFormEvento({ ...formEvento, [e.target.name]: e.target.value }) }

  async function manejarCrearEvento(e) {
    e.preventDefault()
    setMensajeEvento('Creando evento...')
    const { error } = await supabase.from('eventos').insert({
      nombre: formEvento.nombre, deporte: formEvento.deporte, ciudad: formEvento.ciudad,
      estadio: formEvento.estadio, fecha: formEvento.fecha, hora: formEvento.hora, moneda: formEvento.moneda
    })
    if (error) { setMensajeEvento('Error: ' + error.message) }
    else { setMensajeEvento('Evento creado correctamente.'); setFormEvento({ nombre: '', deporte: 'Futbol', ciudad: '', estadio: '', fecha: '', hora: '', moneda: 'COP' }); cargarEventos() }
  }

  async function manejarPublicar(e) {
    e.preventDefault()
    if (!usuario) { setMensaje('Debes iniciar sesion para publicar una boleta.'); return }
    setMensaje('Publicando...')
    const resultado = await publicarBoleta({ eventoId: form.eventoId, vendedorId: usuario.id, tribuna: form.tribuna, fila: form.fila, silla: form.silla, cantidad: Number(form.cantidad), precio: Number(form.precio), plataforma: form.plataforma })
    if (resultado) { setMensaje('Boleta enviada. El equipo de Boleteria CO la verificara pronto.'); setForm({ eventoId: '', tribuna: '', fila: '', silla: '', cantidad: 1, precio: '', plataforma: '' }); cargarBoletas() }
    else { setMensaje('Hubo un error al publicar. Intenta de nuevo.') }
  }

  async function manejarRegistro(e) {
    e.preventDefault()
    setMensajeAuth('Registrando...')
    const resultado = await registrarUsuario(formAuth)
    if (resultado.exito) {
      if (resultado.session) {
        // Confirmación de email desactivada en Supabase — entra directo
        setUsuario(resultado.usuario)
        setVistaAuth(null)
        setMensajeAuth('')
      } else {
        // Confirmación de email requerida
        setMensajeAuth('✅ Te enviamos un correo de confirmación a ' + formAuth.correo + '. Haz clic en el link para activar tu cuenta.')
      }
    } else {
      setMensajeAuth('Error: ' + resultado.mensaje)
    }
  }



  async function manejarRecuperacion(e) {
    e.preventDefault()
    setMensajeAuth('Enviando...')
    const resultado = await enviarRecuperacion(formAuth.correo)
    if (resultado.exito) {
      setMensajeAuth('✅ Revisa tu correo — te enviamos un link para restablecer tu contraseña.')
    } else {
      setMensajeAuth('Error: ' + resultado.mensaje)
    }
  }

  async function manejarNuevaPassword(e) {
    e.preventDefault()
    setMensajeAuth('Actualizando...')
    const resultado = await actualizarPassword(formAuth.nuevaPassword)
    if (resultado.exito) {
      setMensajeAuth('✅ Contraseña actualizada. Ya puedes iniciar sesión.')
      setVistaAuth('login')
      setEsRecuperacion(false)
      window.history.replaceState({}, '', window.location.pathname)
    } else {
      setMensajeAuth('Error: ' + resultado.mensaje)
    }
  }

  async function manejarLogin(e) {
    e.preventDefault()
    setMensajeAuth('Iniciando sesion...')
    const resultado = await iniciarSesion(formAuth)
    if (resultado.exito) { setUsuario(resultado.usuario); setVistaAuth(null); setMensajeAuth('') }
    else { setMensajeAuth('Error: ' + resultado.mensaje) }
  }

  async function manejarCerrarSesion() { await cerrarSesion(); setUsuario(null); setPaginaActual('inicio') }

  function irAMisBoletas() {
    setPaginaActual('mis-boletas')
    cargarMisBoletas()
  }

  function formatearPrecio(precio, moneda) {
    const valor = Number(precio)
    if (moneda === 'USD') return 'US$' + valor.toLocaleString('en-US')
    return '$' + valor.toLocaleString('es-CO')
  }

  function calcularTotal(precio, moneda) {
    const redondeado = Math.round(Number(precio) * 1.10 / 1000) * 1000
    return formatearPrecio(redondeado, moneda)
  }

  async function manejarCompra(boleta) {
    if (!usuario) { alert('Debes iniciar sesion para comprar una boleta.'); return }
    setComprando(boleta.id)

    // Intentar reservar atómicamente (solo si sigue publicada)
    const reservadaHasta = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const { data: reservada } = await supabase
      .from('boletas')
      .update({ estado: 'reservada', reservada_hasta: reservadaHasta })
      .eq('id', boleta.id)
      .eq('estado', 'publicada')
      .select()

    if (!reservada || reservada.length === 0) {
      alert('Esta boleta ya fue reservada por otro comprador. Intenta con otra.')
      setComprando(null)
      cargarBoletas()
      return
    }

    const subtotal = Number(boleta.precio)
    const comision = Math.round(subtotal * 0.10)
    const total = subtotal + comision
    const moneda = boleta.eventos ? boleta.eventos.moneda : 'COP'

    const orden = await crearOrden({ boletaId: boleta.id, compradorId: usuario.id, subtotal, comision, total, metodoPago: 'wompi' })
    if (!orden) {
      await supabase.from('boletas').update({ estado: 'publicada', reservada_hasta: null }).eq('id', boleta.id)
      alert('Hubo un error al crear la orden. Intenta de nuevo.')
      setComprando(null)
      return
    }

    const totalCentavos = total * 100
    const referencia = orden.codigo_orden

    const res = await fetch('/api/integrity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: referencia, amount: totalCentavos, currency: moneda })
    })

    if (!res.ok) { alert('Error al generar la firma de pago. Intenta de nuevo.'); setComprando(null); return }

    const { signature } = await res.json()

    const params = new URLSearchParams({
      'public-key': import.meta.env.VITE_WOMPI_PUBLIC_KEY,
      'currency': moneda,
      'amount-in-cents': totalCentavos,
      'reference': referencia,
      'signature:integrity': signature,
      'redirect-url': window.location.origin
    })

    window.location.href = `https://checkout.wompi.co/p/?${params.toString()}`
  }

  const c = {
    fondo: '#080b12', nav: '#0d1117', tarjeta: '#0f1623', borde: '#1e2a3a',
    texto: '#eef0f6', textoSec: '#8892a4', textoTercio: '#4e5a6e',
    acento: '#4f7eff', verde: '#22c55e', ambar: '#f59e0b',
  }
  const s = {
    pagina: { minHeight: '100vh', background: '#080b12', fontFamily: "'Inter', system-ui, -apple-system, sans-serif", backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(79,126,255,0.07), transparent)' },
    nav: { background: 'rgba(13,17,23,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e2a3a', position: 'sticky', top: 0, zIndex: 100, padding: '0 20px' },
    navInner: { maxWidth: '720px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px' },
    logo: { color: '#eef0f6', fontSize: '17px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0 },
    logoPunto: { color: '#4f7eff' },
    contenedor: { maxWidth: '720px', margin: '0 auto', padding: esMobile ? '0 12px 48px' : '0 20px 48px' },
    header: { display: 'none' },
    titulo: { display: 'none' },
    authBar: { display: 'flex', gap: '8px', alignItems: 'center' },
    usuarioNombre: { color: '#8892a4', fontSize: '12px', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    botonSec: { background: 'transparent', border: '1px solid #1e2a3a', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', color: '#8892a4', cursor: 'pointer' },
    botonPrin: { background: '#4f7eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
    botonAdmin: { background: 'rgba(160,82,255,0.1)', color: '#c084fc', border: '1px solid rgba(160,82,255,0.2)', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' },
    hero: { textAlign: 'center', padding: esMobile ? '36px 0 28px' : '56px 0 44px' },
    heroTag: { display: 'inline-block', background: 'rgba(79,126,255,0.1)', color: '#4f7eff', border: '1px solid rgba(79,126,255,0.2)', borderRadius: '20px', padding: '4px 14px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '20px' },
    heroTitle: { color: '#eef0f6', fontSize: esMobile ? '28px' : '40px', fontWeight: '800', margin: '0 0 14px', letterSpacing: esMobile ? '-0.8px' : '-1.5px', lineHeight: 1.1 },
    heroSub: { color: '#8892a4', fontSize: esMobile ? '14px' : '16px', margin: '0 auto 32px', lineHeight: 1.65, maxWidth: '440px' },
    botonVender: { display: 'inline-block', background: '#4f7eff', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px 28px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 0 28px rgba(79,126,255,0.25)' },
    seccionTitulo: { color: '#eef0f6', fontSize: '14px', fontWeight: '600', margin: '0 0 16px' },
    tarjetaForm: { background: '#0f1623', border: '1px solid #1e2a3a', borderRadius: '16px', padding: esMobile ? '20px 16px' : '28px', marginBottom: '24px' },
    tarjetaAdmin: { background: '#081a10', border: '1px solid #0f3320', borderRadius: '16px', padding: '24px', marginBottom: '24px' },
    label: { color: '#8892a4', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '7px' },
    input: { width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '11px 14px', color: '#eef0f6', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box' },
    botonSubmit: { background: '#4f7eff', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 20px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', width: '100%' },
    botonSubmitVerde: { background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 20px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', width: '100%' },
    mensaje: { color: '#8892a4', fontSize: '13px', marginTop: '12px', textAlign: 'center' },
    tarjetaBoleta: { background: '#0f1623', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '20px 22px', marginBottom: '12px' },
    tarjetaPendiente: { background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    nombreEvento: { color: '#eef0f6', fontSize: '16px', fontWeight: '700', margin: '0 0 4px', letterSpacing: '-0.2px' },
    detalleEvento: { color: '#8892a4', fontSize: '13px', margin: '0 0 3px' },
    vendedorRow: { display: 'flex', alignItems: 'center', gap: '6px', margin: '8px 0 0' },
    badgeBCO: { background: 'rgba(79,126,255,0.12)', color: '#4f7eff', fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', letterSpacing: '0.4px', textTransform: 'uppercase' },
    vendedorNombre: { color: '#4e5a6e', fontSize: '12px' },
    ventasCount: { color: '#4e5a6e', fontSize: '11px', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: '4px' },
    filaPrecio: { display: 'flex', flexDirection: esMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: esMobile ? 'flex-start' : 'center', gap: esMobile ? '10px' : '0', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #1e2a3a' },
    precio: { color: '#eef0f6', fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' },
    botonComprar: { background: '#4f7eff', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', width: esMobile ? '100%' : 'auto' },
    botonAprobar: { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', marginLeft: '6px' },
    botonRechazar: { background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', marginLeft: '6px' },
    vacio: { color: '#4e5a6e', textAlign: 'center', fontSize: '14px', padding: '40px 0' },
    tituloForm: { color: '#eef0f6', fontSize: '17px', fontWeight: '700', margin: '0 0 22px', letterSpacing: '-0.3px' },
    tituloAdmin: { color: '#4ade80', fontSize: '15px', fontWeight: '700', margin: '0 0 16px' },
    tituloPendiente: { color: '#f59e0b', fontSize: '14px', fontWeight: '600', margin: '0 0 12px' },
    row2: { display: 'grid', gridTemplateColumns: esMobile ? '1fr' : '1fr 1fr', gap: '12px' },
    separador: { border: 'none', borderTop: '1px solid #1e2a3a', margin: '20px 0' },
  }

  if (pagoStatus === 'exitoso') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a1f14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: '#0f2d1e', border: '1px solid #166534', borderRadius: '16px', padding: '40px', maxWidth: '480px', width: '90%', textAlign: 'center' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ color: '#4ade80', fontSize: '24px', fontWeight: '700', margin: '0 0 12px' }}>¡Pago exitoso!</h2>
          <p style={{ color: '#86efac', fontSize: '15px', margin: '0 0 8px' }}>Tu boleta ha sido adquirida correctamente.</p>
          {pagoInfo?.referencia && (
            <p style={{ color: '#6ee7b7', fontSize: '13px', margin: '0 0 24px' }}>Referencia: <strong>{pagoInfo.referencia}</strong></p>
          )}

          <button
            onClick={() => { setPagoStatus(null); setPagoInfo(null) }}
            style={{ background: '#166534', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
          >
            Ver boletas disponibles
          </button>
        </div>
      </div>
    )
  }

  if (pagoStatus === 'fallido') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a1f14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: '#1c0a0a', border: '1px solid #991b1b', borderRadius: '16px', padding: '40px', maxWidth: '480px', width: '90%', textAlign: 'center' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ color: '#f87171', fontSize: '24px', fontWeight: '700', margin: '0 0 12px' }}>Pago no completado</h2>
          <p style={{ color: '#fca5a5', fontSize: '15px', margin: '0 0 24px' }}>El pago fue rechazado o cancelado. Puedes intentarlo de nuevo.</p>
          <button
            onClick={() => setPagoStatus(null)}
            style={{ background: '#991b1b', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    )
  }

  if (pagoStatus === 'pendiente') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a1f14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: '#1a150a', border: '1px solid #854d0e', borderRadius: '16px', padding: '40px', maxWidth: '480px', width: '90%', textAlign: 'center' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>⏳</div>
          <h2 style={{ color: '#facc15', fontSize: '24px', fontWeight: '700', margin: '0 0 12px' }}>Pago en proceso</h2>
          <p style={{ color: '#fde68a', fontSize: '15px', margin: '0 0 24px' }}>Tu pago está siendo procesado. Te notificaremos cuando se confirme.</p>
          <button
            onClick={() => setPagoStatus(null)}
            style={{ background: '#854d0e', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={s.pagina}>
      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <h1 style={s.logo}><span style={{fontSize:'20px'}}>🎟</span> Boletería <span style={s.logoPunto}>CO</span></h1>
          <div style={s.authBar}>
            {usuario ? (
              <>
                {esAdmin && <button style={s.botonAdmin} onClick={() => setMostrarAdmin(!mostrarAdmin)}>Admin {boletasPendientes.length > 0 && `(${boletasPendientes.length})`}</button>}
                {!esMobile && <span style={s.usuarioNombre}>{usuario.email}</span>}
                <button style={s.botonSec} onClick={irAMisBoletas}>{esMobile ? '🎟' : 'Mis boletas'}</button>
                <button style={s.botonSec} onClick={manejarCerrarSesion}>{esMobile ? '←' : 'Salir'}</button>
              </>
            ) : (
              <>
                <button style={s.botonSec} onClick={() => setVistaAuth('login')}>Iniciar sesión</button>
                <button style={s.botonPrin} onClick={() => setVistaAuth('registro')}>Registrarse</button>
              </>
            )}
          </div>
        </div>
      </nav>
      <div style={s.contenedor}>
        {/* HERO */}
        {!usuario && (
          <div style={s.hero}>
            <div style={s.heroTag}>🎟 Marketplace de boletas · Colombia</div>
            <h2 style={s.heroTitle}>Tu boleta al precio<br/>que realmente vale</h2>
            <p style={s.heroSub}>Compra y vende boletas para eventos deportivos en Colombia. Pagos seguros con Wompi.</p>
            <button style={s.botonVender} onClick={() => setVistaAuth('registro')}>Empieza gratis</button>
          </div>
        )}


        {paginaActual === 'mis-boletas' && usuario && (
          <div style={{position:'fixed',inset:0,zIndex:300,background:'#080b12',overflowY:'auto'}}>
          <nav style={{background:'rgba(13,17,23,0.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid #1e2a3a',position:'sticky',top:0,zIndex:10,padding:'0 20px'}}>
            <div style={{maxWidth:'720px',margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',height:'60px'}}>
              <button onClick={()=>setPaginaActual('inicio')} style={{background:'transparent',border:'none',color:'#8892a4',cursor:'pointer',fontSize:'14px',fontWeight:'600',display:'flex',alignItems:'center',gap:'6px',padding:0}}>← Volver</button>
              <p style={{color:'#eef0f6',fontSize:'16px',fontWeight:'800',margin:0,letterSpacing:'-0.3px'}}>🎟 Mis boletas</p>
              <div style={{width:'60px'}}></div>
            </div>
          </nav>
          <div style={{maxWidth:'680px',margin:'0 auto',padding:'28px 20px 48px'}}>
            <div style={{display:'flex',gap:'4px',marginBottom:'20px',background:'rgba(255,255,255,0.03)',borderRadius:'10px',padding:'4px'}}>
              <button onClick={() => setPestanaMis('compras')} style={{flex:1,padding:'8px 0',borderRadius:'7px',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'13px',background:pestanaMis==='compras'?'#4f7eff':'transparent',color:pestanaMis==='compras'?'#fff':'#8892a4'}}>Mis compras</button>
              <button onClick={() => setPestanaMis('ventas')} style={{flex:1,padding:'8px 0',borderRadius:'7px',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'13px',background:pestanaMis==='ventas'?'#4f7eff':'transparent',color:pestanaMis==='ventas'?'#fff':'#8892a4'}}>Mis ventas</button>
            </div>
            {cargandoMis && <p style={{color:'#6b7280',fontSize:'13px'}}>Cargando...</p>}
            {!cargandoMis && pestanaMis === 'compras' && (
              misCompras.length === 0
                ? <p style={{color:'#6b7280',fontSize:'13px'}}>No has comprado boletas aun.</p>
                : misCompras.map(function(o) {
                    const b = o.boletas
                    const ev = b && b.eventos
                    const moneda = ev && ev.moneda === 'USD' ? 'US$' : '$'
                    const fecha = ev && ev.fecha ? new Date(ev.fecha).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}) : ''
                    const esAdmin = b?.usuarios?.correo === ADMIN_EMAIL
                    const yaLiberado = o.liberado || (Date.now() - new Date(o.creado_en).getTime() > 72 * 60 * 60 * 1000)
                    const msRestantes = (new Date(o.creado_en).getTime() + 72 * 60 * 60 * 1000) - Date.now()
                    const horas = Math.max(0, Math.floor(msRestantes / 3600000))
                    return (
                          <div key={o.id} style={{background:'#0f1623',border:'1px solid #1e2a3a',borderRadius:'12px',padding:'16px',marginBottom:'10px'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                              <div>
                                <p style={{color:'#eef0f6',fontWeight:'700',margin:'0 0 4px',fontSize:'14px'}}>{ev ? ev.nombre : 'Evento'}</p>
                                <p style={{color:'#8892a4',fontSize:'12px',margin:'0 0 2px'}}>{ev ? ev.ciudad + (ev.estadio ? ' · ' + ev.estadio : '') : ''}{fecha ? ' · ' + fecha : ''}</p>
                                <p style={{color:'#8892a4',fontSize:'12px',margin:'0 0 2px'}}>Tribuna {b && b.tribuna}{b && b.fila ? ' · Fila ' + b.fila : ''}{b && b.silla ? ' · Silla ' + b.silla : ''}</p>
                                <p style={{color:'#4e5a6e',fontSize:'11px',margin:'4px 0 0'}}>Ref: {o.codigo_orden}</p>
                              </div>
                              <div style={{textAlign:'right'}}>
                                <p style={{color:'#22c55e',fontWeight:'800',fontSize:'16px',margin:'0 0 4px'}}>{moneda}{Number(o.total).toLocaleString('es-CO')}</p>
                                <span style={{background:'rgba(34,197,94,0.1)',color:'#4ade80',fontSize:'11px',fontWeight:'700',padding:'3px 8px',borderRadius:'20px'}}>Pagada</span>
                              </div>
                            </div>
                            {!esAdmin && (
                              <div style={{marginTop:'12px',paddingTop:'12px',borderTop:'1px solid #1e2a3a'}}>
                                {(() => {
                                  const plat = b?.plataforma && PLATAFORMAS[b.plataforma]
                                  return plat ? (
                                    <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid #1e2a3a',borderRadius:'8px',padding:'10px 12px',marginBottom:'10px'}}>
                                      <p style={{color:'#eef0f6',fontSize:'11px',fontWeight:'700',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'0.4px'}}>📲 Tu boleta está en {b.plataforma}</p>
                                      <p style={{color:'#8892a4',fontSize:'12px',margin:'0 0 8px',lineHeight:1.6}}>{plat.instrComprador}</p>
                                      {o.archivo_url && (
                                        <a href={o.archivo_url} target="_blank" rel="noreferrer" style={{background:'rgba(79,126,255,0.15)',color:'#6b93ff',border:'1px solid rgba(79,126,255,0.25)',borderRadius:'6px',padding:'5px 12px',fontSize:'11px',fontWeight:'600',textDecoration:'none',display:'inline-block'}}>⬇ Ver comprobante de transferencia</a>
                                      )}
                                    </div>
                                  ) : o.archivo_url ? (
                                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'8px',marginBottom:'8px'}}>
                                      <p style={{color:'#4ade80',fontSize:'12px',margin:'0'}}>✅ Boleta entregada por el vendedor</p>
                                      <a href={o.archivo_url} target="_blank" rel="noreferrer" style={{background:'rgba(79,126,255,0.15)',color:'#6b93ff',border:'1px solid rgba(79,126,255,0.25)',borderRadius:'6px',padding:'6px 14px',fontSize:'12px',fontWeight:'600',textDecoration:'none'}}>⬇ Descargar</a>
                                    </div>
                                  ) : (
                                    <p style={{color:'#f59e0b',fontSize:'12px',margin:'0 0 8px'}}>⏳ Esperando que el vendedor transfiera la boleta</p>
                                  )
                                })()}
                                {o.liberado ? (
                                  <p style={{color:'#4ade80',fontSize:'12px',margin:'0'}}>✅ Recibo confirmado — pago liberado al vendedor</p>
                                ) : yaLiberado ? (
                                  <p style={{color:'#4e5a6e',fontSize:'12px',margin:'0'}}>✅ Pago liberado automáticamente al vendedor</p>
                                ) : (
                                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'8px',marginTop:'6px'}}>
                                    <p style={{color:'#8892a4',fontSize:'11px',margin:'0'}}>¿Ya la recibiste en la app? Se libera en {horas}h automáticamente.</p>
                                    <button onClick={() => confirmarRecibo(o.id)} style={{background:'#16a34a',color:'#fff',border:'none',borderRadius:'6px',padding:'6px 14px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>Confirmar recibo</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                    )
                  })
            )}
            {!cargandoMis && pestanaMis === 'ventas' && (
              misVentas.length === 0
                ? <p style={{color:'#6b7280',fontSize:'13px'}}>No has publicado boletas aun.</p>
                : misVentas.map(function(b) {
                    const ev = b.eventos
                    const moneda = ev && ev.moneda === 'USD' ? 'US$' : '$'
                    const ordenPagada = Array.isArray(b.ordenes) ? b.ordenes.find(o => o.estado_pago === 'pagada') : null
                    const liberadoOrden = ordenPagada && (ordenPagada.liberado || (Date.now() - new Date(ordenPagada.creado_en).getTime() > 72 * 60 * 60 * 1000))
                    const hVenta = ordenPagada ? Math.max(0, Math.floor(((new Date(ordenPagada.creado_en).getTime() + 72*3600000) - Date.now()) / 3600000)) : 0
                    return (
                          <div key={b.id} style={{background:'#0f1623',border:'1px solid #1e2a3a',borderRadius:'12px',padding:'16px',marginBottom:'10px'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                              <div>
                                <p style={{color:'#eef0f6',fontWeight:'700',margin:'0 0 4px',fontSize:'14px'}}>{ev ? ev.nombre : 'Evento'}</p>
                                <p style={{color:'#8892a4',fontSize:'12px',margin:'0 0 2px'}}>Tribuna {b.tribuna}{b.fila ? ' · Fila ' + b.fila : ''}{b.silla ? ' · Silla ' + b.silla : ''}</p>
                                {ordenPagada && <p style={{color:'#4e5a6e',fontSize:'11px',margin:'4px 0 0'}}>Ref: {ordenPagada.codigo_orden}</p>}
                              </div>
                              <div style={{textAlign:'right'}}>
                                <p style={{color:'#eef0f6',fontWeight:'800',fontSize:'16px',margin:'0 0 4px'}}>{moneda}{Number(b.precio).toLocaleString('es-CO')}</p>
                                <span style={{background:b.estado==='vendida'?'rgba(34,197,94,0.1)':b.estado==='publicada'?'rgba(79,126,255,0.1)':'rgba(255,255,255,0.05)',color:b.estado==='vendida'?'#4ade80':b.estado==='publicada'?'#6b93ff':'#8892a4',fontSize:'11px',fontWeight:'700',padding:'3px 8px',borderRadius:'20px'}}>{b.estado==='vendida'?'Vendida':b.estado==='publicada'?'Publicada':'En verificación'}</span>
                              </div>
                            </div>
                            {ordenPagada && (
                              <div style={{marginTop:'12px',paddingTop:'12px',borderTop:'1px solid #1e2a3a'}}>
                                {ordenPagada.archivo_url ? (
                                  <p style={{color:'#4ade80',fontSize:'12px',margin:'0'}}>✅ Comprobante de transferencia subido</p>
                                ) : (() => {
                                  const plat = b.plataforma && PLATAFORMAS[b.plataforma]
                                  return (
                                    <div>
                                      <p style={{color:'#f59e0b',fontSize:'12px',margin:'0 0 8px',fontWeight:'600'}}>📲 Transfiere la boleta al comprador</p>
                                      {plat && (
                                        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid #1e2a3a',borderRadius:'8px',padding:'10px 12px',marginBottom:'10px'}}>
                                          <p style={{color:'#eef0f6',fontSize:'11px',fontWeight:'700',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'0.4px'}}>{b.plataforma}</p>
                                          <p style={{color:'#8892a4',fontSize:'12px',margin:'0',lineHeight:1.6}}>{plat.instrVendedor}</p>
                                        </div>
                                      )}
                                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'8px'}}>
                                        <p style={{color:'#4e5a6e',fontSize:'11px',margin:'0'}}>Sube el comprobante de transferencia (screenshot)</p>
                                        <label style={{background:'rgba(79,126,255,0.15)',color:'#6b93ff',border:'1px solid rgba(79,126,255,0.25)',borderRadius:'6px',padding:'6px 14px',fontSize:'12px',fontWeight:'600',cursor:'pointer',display:'inline-block'}}>
                                          {subiendoArchivo === ordenPagada.id ? 'Subiendo...' : '⬆ Subir comprobante'}
                                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}} disabled={subiendoArchivo !== null} onChange={(e)=>{ if(e.target.files[0]) entregarBoleta(ordenPagada.id, e.target.files[0]) }} />
                                        </label>
                                      </div>
                                    </div>
                                  )
                                })()}
                                <div style={{marginTop:'8px'}}>
                                {liberadoOrden ? (
                                  <p style={{color:'#4ade80',fontSize:'12px',margin:'0'}}>✅ Pago liberado — coordina el cobro con Boletería CO</p>
                                ) : (
                                  <p style={{color:'#8892a4',fontSize:'11px',margin:'0'}}>⏳ Pago bloqueado — el comprador tiene {hVenta}h para confirmar recibo</p>
                                )}
                                </div>
                              </div>
                            )}
                          </div>
                    )
                  })
            )}
          </div>
          </div>
        )}

        {esAdmin && mostrarAdmin && (
          <div style={s.tarjetaAdmin}>
            <p style={s.tituloAdmin}>Panel de administrador</p>
            {boletasPendientes.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <p style={s.tituloPendiente}>Boletas pendientes de verificacion ({boletasPendientes.length})</p>
                {boletasPendientes.map(function(b) {
                  return (
                    <div key={b.id} style={s.tarjetaPendiente}>
                      <div>
                        <div style={{ color: c.texto, fontSize: '14px', fontWeight: '500' }}>{b.eventos ? b.eventos.nombre : ''}</div>
                        <div style={{ color: c.textoSec, fontSize: '12px' }}>Tribuna {b.tribuna} - Fila {b.fila} - Silla {b.silla} - ${Number(b.precio).toLocaleString('es-CO')}</div>
                      </div>
                      <div>
                        <button style={s.botonAprobar} onClick={() => aprobarBoleta(b.id)}>Aprobar</button>
                        <button style={s.botonRechazar} onClick={() => rechazarBoleta(b.id)}>Rechazar</button>
                      </div>
                    </div>
                  )
                })}
                <hr style={s.separador} />
              </div>
            )}
            {boletasPendientes.length === 0 && <p style={{ color: c.textoSec, fontSize: '13px', marginBottom: '16px' }}>No hay boletas pendientes.</p>}
            {ordenesLiberadas.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{color:'#fbbf24',fontSize:'14px',fontWeight:'600',margin:'0 0 12px'}}>
                  Pagos pendientes de envío al vendedor ({ordenesLiberadas.length})
                </p>
                {ordenesLiberadas.map(function(o) {
                  const b = o.boletas
                  const ev = b?.eventos
                  const esBoletaAdmin = b?.usuarios?.correo === ADMIN_EMAIL
                  if (esBoletaAdmin) return null
                  const neto = Math.round(Number(b?.precio || 0) * 0.95)
                  return (
                    <div key={o.id} style={{background:'#1c2a1c',border:'1px solid #166534',borderRadius:'10px',padding:'14px',marginBottom:'10px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
                      <div>
                        <p style={{color:'#f9fafb',fontWeight:'600',margin:'0 0 2px',fontSize:'13px'}}>{ev?.nombre || 'Evento'} · {ev?.ciudad || ''}</p>
                        <p style={{color:'#9ca3af',fontSize:'12px',margin:'0 0 2px'}}>Vendedor: {b?.usuarios?.nombre || 'N/A'} — {b?.usuarios?.correo || ''}</p>
                        <p style={{color:'#9ca3af',fontSize:'12px',margin:'0'}}>Ref: {o.codigo_orden} · Pagar: <strong style={{color:'#34d399'}}>${neto.toLocaleString('es-CO')}</strong> (95% del precio)</p>
                      </div>
                      <button onClick={() => marcarPagadoVendedor(o.id)}
                        style={{background:'#16a34a',color:'#fff',border:'none',borderRadius:'6px',padding:'8px 16px',fontSize:'13px',fontWeight:'600',cursor:'pointer',whiteSpace:'nowrap'}}>
                        ✅ Marcar pagado
                      </button>
                    </div>
                  )
                })}
                <hr style={s.separador} />
              </div>
            )}
            {ordenesLiberadas.filter(o => o.boletas?.usuarios?.correo !== ADMIN_EMAIL).length === 0 && (
              <p style={{color:'#6b7280',fontSize:'13px',marginBottom:'16px'}}>No hay pagos pendientes de envío.</p>
            )}
            <p style={s.tituloAdmin}>Crear evento</p>
            <form onSubmit={manejarCrearEvento}>
              <label style={s.label}>Nombre del evento</label>
              <input name="nombre" value={formEvento.nombre} onChange={manejarCambioEvento} required style={s.input} placeholder="Ej: Millonarios FC vs America de Cali" />
              <div style={s.row2}>
                <div><label style={s.label}>Deporte</label>
                  <select name="deporte" value={formEvento.deporte} onChange={manejarCambioEvento} style={s.input}>
                    <option>Futbol</option><option>Baloncesto</option><option>Tenis</option><option>Ciclismo</option><option>Otro</option>
                  </select>
                </div>
                <div><label style={s.label}>Moneda</label>
                  <select name="moneda" value={formEvento.moneda} onChange={manejarCambioEvento} style={s.input}>
                    <option value="COP">COP - Pesos</option><option value="USD">USD - Dolares</option>
                  </select>
                </div>
              </div>
              <div style={s.row2}>
                <div><label style={s.label}>Ciudad</label><input name="ciudad" value={formEvento.ciudad} onChange={manejarCambioEvento} required style={s.input} placeholder="Bogota" /></div>
                <div><label style={s.label}>Estadio o lugar</label><input name="estadio" value={formEvento.estadio} onChange={manejarCambioEvento} required style={s.input} placeholder="El Campin" /></div>
              </div>
              <div style={s.row2}>
                <div><label style={s.label}>Fecha</label><input name="fecha" type="date" value={formEvento.fecha} onChange={manejarCambioEvento} required style={s.input} /></div>
                <div><label style={s.label}>Hora</label><input name="hora" type="time" value={formEvento.hora} onChange={manejarCambioEvento} required style={s.input} /></div>
              </div>
              <button type="submit" style={s.botonSubmitVerde}>Crear evento</button>
              {mensajeEvento && <p style={s.mensaje}>{mensajeEvento}</p>}
            </form>
          </div>
        )}

        {vistaAuth === 'login' && (
          <form onSubmit={manejarLogin} style={s.tarjetaForm}>
            <p style={s.tituloForm}>Iniciar sesion</p>
            <label style={s.label}>Correo</label>
            <input name="correo" type="email" value={formAuth.correo} onChange={manejarCambioAuth} required style={s.input} />
            <label style={s.label}>Contrasena</label>
            <input name="password" type="password" value={formAuth.password} onChange={manejarCambioAuth} required style={s.input} />
            <button type="submit" style={s.botonSubmit}>Entrar</button>
            <p style={{textAlign:'center',marginTop:'12px'}}>
              <button type="button" onClick={() => { setVistaAuth('recuperar'); setMensajeAuth('') }}
                style={{background:'none',border:'none',color:'#6366f1',fontSize:'13px',cursor:'pointer',textDecoration:'underline'}}>
                ¿Olvidaste tu contraseña?
              </button>
            </p>
            {mensajeAuth && <p style={s.mensaje}>{mensajeAuth}</p>}
          </form>
        )}

        {vistaAuth === 'recuperar' && (
          <form onSubmit={manejarRecuperacion} style={s.tarjetaForm}>
            <p style={s.tituloForm}>Recuperar contraseña</p>
            <p style={{color:'#9ca3af',fontSize:'13px',marginBottom:'16px'}}>Ingresa tu correo y te enviamos un link para crear una nueva contraseña.</p>
            <label style={s.label}>Correo</label>
            <input name="correo" type="email" value={formAuth.correo} onChange={manejarCambioAuth} required style={s.input} />
            <button type="submit" style={s.botonSubmit}>Enviar link</button>
            <p style={{textAlign:'center',marginTop:'12px'}}>
              <button type="button" onClick={() => { setVistaAuth('login'); setMensajeAuth('') }}
                style={{background:'none',border:'none',color:'#6b7280',fontSize:'13px',cursor:'pointer'}}>
                ← Volver al inicio de sesión
              </button>
            </p>
            {mensajeAuth && <p style={s.mensaje}>{mensajeAuth}</p>}
          </form>
        )}

        {vistaAuth === 'nueva-password' && (
          <form onSubmit={manejarNuevaPassword} style={s.tarjetaForm}>
            <p style={s.tituloForm}>Nueva contraseña</p>
            <label style={s.label}>Nueva contraseña</label>
            <input name="nuevaPassword" type="password" value={formAuth.nuevaPassword} onChange={manejarCambioAuth} required minLength={6} style={s.input} />
            <button type="submit" style={s.botonSubmit}>Guardar contraseña</button>
            {mensajeAuth && <p style={s.mensaje}>{mensajeAuth}</p>}
          </form>
        )}

        {vistaAuth === 'registro' && (
          <form onSubmit={manejarRegistro} style={s.tarjetaForm}>
            <p style={s.tituloForm}>Crear cuenta</p>
            <label style={s.label}>Nombre</label>
            <input name="nombre" value={formAuth.nombre} onChange={manejarCambioAuth} required style={s.input} />
            <label style={s.label}>Correo</label>
            <input name="correo" type="email" value={formAuth.correo} onChange={manejarCambioAuth} required style={s.input} />
            <label style={s.label}>Contrasena</label>
            <input name="password" type="password" value={formAuth.password} onChange={manejarCambioAuth} required style={s.input} />
            <button type="submit" style={s.botonSubmit}>Crear cuenta</button>
            {mensajeAuth && <p style={s.mensaje}>{mensajeAuth}</p>}
          </form>
        )}

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', margin:'32px 0 16px'}}>
          <div>
            <p style={{color:'#eef0f6', fontSize:'18px', fontWeight:'800', margin:'0 0 2px', letterSpacing:'-0.5px'}}>
              Boletas disponibles
            </p>
            <p style={{color:'#4e5a6e', fontSize:'12px', margin:0}}>{boletas.filter(b=>b.estado==='publicada').length} boleta{boletas.filter(b=>b.estado==='publicada').length!==1?'s':''} en el mercado</p>
          </div>
          {usuario && (
            <button style={{background:'rgba(79,126,255,0.12)', color:'#6b93ff', border:'1px solid rgba(79,126,255,0.25)', borderRadius:'10px', padding:'9px 18px', fontSize:'13px', fontWeight:'700', cursor:'pointer'}}
              onClick={() => setMostrarFormulario(!mostrarFormulario)}>
              {mostrarFormulario ? '✕ Cancelar' : '+ Vender'}
            </button>
          )}
        </div>

        {mostrarFormulario && (
          <form onSubmit={manejarPublicar} style={s.tarjetaForm}>
            <p style={s.tituloForm}>Publicar boleta</p>
            <label style={s.label}>Evento</label>
            <select name="eventoId" value={form.eventoId} onChange={manejarCambio} required style={s.input}>
              <option value="">Selecciona un evento</option>
              {eventos.map(function(ev) { return <option key={ev.id} value={ev.id}>{ev.nombre} ({ev.moneda || 'COP'})</option> })}
            </select>
            <label style={s.label}>Plataforma de la boleta</label>
            <select name="plataforma" value={form.plataforma} onChange={manejarCambio} required style={s.input}>
              <option value="">Selecciona la app donde tienes la boleta</option>
              {Object.keys(PLATAFORMAS).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {form.plataforma && PLATAFORMAS[form.plataforma] && (
              <p style={{color:'#8892a4',fontSize:'11px',margin:'-10px 0 12px',lineHeight:1.5}}>
                ℹ️ {form.plataforma === 'TuBoletaPass' ? 'Santa Fe, América, Llaneros, Tolima' : form.plataforma === 'Quentro' ? 'Millonarios, Atlético Nacional' : form.plataforma === 'Warena' ? 'Cúcuta, Junior' : 'Ind. Medellín'}
              </p>
            )}
            <label style={s.label}>Tribuna</label>
            <input name="tribuna" value={form.tribuna} onChange={manejarCambio} required style={s.input} />
            <label style={s.label}>Fila</label>
            <input name="fila" value={form.fila} onChange={manejarCambio} required style={s.input} />
            <label style={s.label}>Silla</label>
            <input name="silla" value={form.silla} onChange={manejarCambio} required style={s.input} />
            <label style={s.label}>Precio</label>
            <input name="precio" type="number" value={form.precio} onChange={manejarCambio} required style={s.input} />
            <button type="submit" style={s.botonSubmit}>Publicar boleta</button>
            {mensaje && <p style={s.mensaje}>{mensaje}</p>}
          </form>
        )}

        {cargando && <p style={s.vacio}>Cargando boletas...</p>}

        {!cargando && boletas.length > 0 && (() => {
          const ciudades = [...new Set(boletas.map(b => b.eventos?.ciudad).filter(Boolean))]
          const deportes = [...new Set(boletas.map(b => b.eventos?.deporte).filter(Boolean))]
          return (
            <div style={{display:'flex',gap:'8px',marginBottom:'20px',flexWrap:'wrap'}}>
              <select
                value={filtros.ciudad}
                onChange={e => setFiltros(f => ({...f, ciudad: e.target.value}))}
                style={{flex:'1', minWidth:'120px', background:'rgba(255,255,255,0.04)', border:'1px solid #1e2a3a', borderRadius:'20px', padding:'8px 16px', color:'#eef0f6', fontSize:'13px', cursor:'pointer', outline:'none'}}
              >
                <option value=''>Todas las ciudades</option>
                {ciudades.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={filtros.deporte}
                onChange={e => setFiltros(f => ({...f, deporte: e.target.value}))}
                style={{flex:'1', minWidth:'120px', background:'rgba(255,255,255,0.04)', border:'1px solid #1e2a3a', borderRadius:'20px', padding:'8px 16px', color:'#eef0f6', fontSize:'13px', cursor:'pointer', outline:'none'}}
              >
                <option value=''>Todos los deportes</option>
                {deportes.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <input
                type='number'
                placeholder='Precio max.'
                value={filtros.precioMax}
                onChange={e => setFiltros(f => ({...f, precioMax: e.target.value}))}
                style={{flex:'1', minWidth:'120px', background:'rgba(255,255,255,0.04)', border:'1px solid #1e2a3a', borderRadius:'20px', padding:'8px 16px', color:'#eef0f6', fontSize:'13px', cursor:'pointer', outline:'none'}}
              />
              {(filtros.ciudad || filtros.deporte || filtros.precioMax) && (
                <button
                  onClick={() => setFiltros({ ciudad: '', deporte: '', precioMax: '' })}
                  style={{background:'transparent',border:'1px solid #1e2a3a',color:'#4e5a6e',borderRadius:'20px',padding:'8px 16px',cursor:'pointer',fontSize:'13px'}}
                >Limpiar</button>
              )}
            </div>
          )
        })()}

        {(() => {
          const boletasFiltradas = boletas.filter(b => {
            if (filtros.ciudad && b.eventos?.ciudad !== filtros.ciudad) return false
            if (filtros.deporte && b.eventos?.deporte !== filtros.deporte) return false
            if (filtros.precioMax && Number(b.precio) > Number(filtros.precioMax)) return false
            return true
          })
          if (!cargando && boletasFiltradas.length === 0) return <p style={s.vacio}>No hay boletas que coincidan con los filtros.</p>
          return boletasFiltradas.map(function(b) {
          const moneda = b.eventos ? b.eventos.moneda : 'COP'
          const esBoleteriaCO = b.usuarios && b.usuarios.correo === ADMIN_EMAIL
          const nombreVendedor = b.usuarios ? b.usuarios.nombre : 'Usuario'
          const ventasVendedor = b.vendedor_id ? (ventasPorVendedor[b.vendedor_id] || 0) : 0

          return (
            <div key={b.id} style={{...s.tarjetaBoleta, borderTop: '2px solid #4f7eff', background: 'linear-gradient(135deg, #0f1a2e 0%, #0f1623 100%)'}}>
              <h3 style={s.nombreEvento}>{b.eventos ? b.eventos.nombre : ''}</h3>
              <p style={s.detalleEvento}>{b.eventos ? b.eventos.ciudad : ''}{b.eventos && b.eventos.estadio ? ' · ' + b.eventos.estadio : ''}</p>
              {b.eventos && b.eventos.fecha && <p style={{...s.detalleEvento, color:'#a78bfa', fontSize:'12px'}}>{new Date(b.eventos.fecha).toLocaleDateString('es-CO',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})}</p>}
              <p style={s.detalleEvento}>Tribuna {b.tribuna} - Fila {b.fila} - Silla {b.silla}</p>
              <div style={s.vendedorRow}>
                {esBoleteriaCO ? (
                  <span style={s.badgeBCO}>verificado Boleteria CO</span>
                ) : (
                  <>
                    <span style={s.vendedorNombre}>{nombreVendedor || 'Vendedor'}</span>
                    <span style={s.ventasCount}>{ventasVendedor} ventas</span>
                  </>
                )}
              </div>
              <div style={s.filaPrecio}>
                <p style={s.precio}>{b.estado === 'vendida' ? <span style={{color:'#6b7280',fontSize:'13px'}}>Vendida</span> : calcularTotal(b.precio, moneda)}</p>
                {b.estado === 'reservada' ? (
                  <span style={{background:'#3d2a00',color:'#facc15',fontSize:'12px',fontWeight:'600',padding:'6px 14px',borderRadius:'8px'}}>⏳ Reservada</span>
                ) : b.estado === 'vendida' ? (
                  <span style={{background:'#1a1a1a',color:'#6b7280',fontSize:'12px',fontWeight:'600',padding:'6px 14px',borderRadius:'8px'}}>Vendida</span>
                ) : (
                  <button onClick={() => manejarCompra(b)} disabled={comprando === b.id} style={s.botonComprar}>
                    {comprando === b.id ? 'Procesando...' : 'Comprar'}
                  </button>
                )}
              </div>
            </div>
          )
        })
        })()}
      <footer style={{borderTop:'1px solid #1e2a3a', marginTop:'48px', paddingTop:'28px', paddingBottom:'32px', textAlign:'center'}}>
        <p style={{color:'#4e5a6e', fontSize:'13px', margin:'0 0 8px', fontWeight:'700', letterSpacing:'-0.2px'}}>Boletería <span style={{color:'#4f7eff'}}>CO</span></p>
        <p style={{color:'#4e5a6e', fontSize:'12px', margin:0}}>© 2026 · <a href='/terminos.html' target='_blank' style={{color:'#8892a4', textDecoration:'none'}}>Términos y condiciones</a> · soporte@boleteriaco.com</p>
      </footer>
      </div>
    </div>
  )
}

export default App