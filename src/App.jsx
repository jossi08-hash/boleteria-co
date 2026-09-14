import { useEffect, useState } from 'react'
import { obtenerBoletas, publicarBoleta, crearOrden, obtenerVentasDeUsuario } from './lib/boletas'
import { registrarUsuario, iniciarSesion, cerrarSesion, obtenerUsuarioActual } from './lib/auth'
import { supabase } from './lib/supabase'

const ADMIN_EMAIL = 'jossi08@icloud.com'

function App() {
  const [boletas, setBoletas] = useState([])
  const [boletasPendientes, setBoletasPendientes] = useState([])
  const [ventasPorVendedor, setVentasPorVendedor] = useState({})
  const [cargando, setCargando] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [mostrarAdmin, setMostrarAdmin] = useState(false)
  const [eventos, setEventos] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [comprando, setComprando] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [vistaAuth, setVistaAuth] = useState(null)
  const [formAuth, setFormAuth] = useState({ nombre: '', correo: '', password: '' })
  const [mensajeAuth, setMensajeAuth] = useState('')
  const [formEvento, setFormEvento] = useState({ nombre: '', deporte: 'Futbol', ciudad: '', estadio: '', fecha: '', hora: '', moneda: 'COP' })
  const [mensajeEvento, setMensajeEvento] = useState('')
  const [form, setForm] = useState({ eventoId: '', tribuna: '', fila: '', silla: '', cantidad: 1, precio: '' })
  const [pagoStatus, setPagoStatus] = useState(null)
  const [pagoInfo, setPagoInfo] = useState(null)


  const esAdmin = usuario && usuario.email === ADMIN_EMAIL

  useEffect(() => {
    cargarBoletas()
    cargarEventos()
    obtenerUsuarioActual().then(u => setUsuario(u))

    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('id') || urlParams.get('status') || urlParams.get('pago') === 'exitoso') {
      procesarResultadoPago(urlParams)
    }
  }, [])

  useEffect(() => {
    if (esAdmin) cargarBoletasPendientes()
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
)
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

  function manejarCambio(e) { setForm({ ...form, [e.target.name]: e.target.value }) }
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
    const resultado = await publicarBoleta({ eventoId: form.eventoId, vendedorId: usuario.id, tribuna: form.tribuna, fila: form.fila, silla: form.silla, cantidad: Number(form.cantidad), precio: Number(form.precio) })
    if (resultado) { setMensaje('Boleta enviada. El equipo de Boleteria CO la verificara pronto.'); setForm({ eventoId: '', tribuna: '', fila: '', silla: '', cantidad: 1, precio: '' }); cargarBoletas() }
    else { setMensaje('Hubo un error al publicar. Intenta de nuevo.') }
  }

  async function manejarRegistro(e) {
    e.preventDefault()
    setMensajeAuth('Registrando...')
    const resultado = await registrarUsuario(formAuth)
    if (resultado.exito) { setUsuario(resultado.usuario); setVistaAuth(null); setMensajeAuth('') }
    else { setMensajeAuth('Error: ' + resultado.mensaje) }
  }

  async function manejarLogin(e) {
    e.preventDefault()
    setMensajeAuth('Iniciando sesion...')
    const resultado = await iniciarSesion(formAuth)
    if (resultado.exito) { setUsuario(resultado.usuario); setVistaAuth(null); setMensajeAuth('') }
    else { setMensajeAuth('Error: ' + resultado.mensaje) }
  }

  async function manejarCerrarSesion() { await cerrarSesion(); setUsuario(null) }

  function formatearPrecio(precio, moneda) {
    const valor = Number(precio)
    if (moneda === 'USD') return 'US$' + valor.toLocaleString('en-US')
    return '$' + valor.toLocaleString('es-CO')
  }

  function calcularTotal(precio, moneda) {
    const redondeado = Math.round(Number(precio) * 1.08 / 1000) * 1000
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
    const comision = Math.round(subtotal * 0.08)
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

  const c = { fondo: '#0f1117', tarjeta: '#171a23', borde: '#2a2e3a', texto: '#e8e9ed', textoSec: '#9a9eac', acento: '#3d7eff' }
  const s = {
    pagina: { minHeight: '100vh', background: c.fondo, fontFamily: 'sans-serif', padding: '40px 20px' },
    contenedor: { maxWidth: '640px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    titulo: { color: c.texto, fontSize: '28px', fontWeight: '700', margin: 0 },
    authBar: { display: 'flex', gap: '8px', alignItems: 'center' },
    usuarioNombre: { color: c.textoSec, fontSize: '13px' },
    botonSec: { background: 'transparent', border: '1px solid #2a2e3a', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: c.texto, cursor: 'pointer' },
    botonPrin: { background: c.acento, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
    botonAdmin: { background: '#2a1f3a', color: '#c084fc', border: '1px solid #4a2f6a', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer' },
    botonVender: { display: 'block', margin: '0 auto 16px', background: c.acento, color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
    tarjetaForm: { background: c.tarjeta, border: '1px solid #2a2e3a', borderRadius: '14px', padding: '24px', marginBottom: '24px' },
    tarjetaAdmin: { background: '#0d1f17', border: '1px solid #1a3a2a', borderRadius: '14px', padding: '24px', marginBottom: '24px' },
    label: { color: c.textoSec, fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' },
    input: { width: '100%', background: '#0f1117', border: '1px solid #2a2e3a', borderRadius: '8px', padding: '10px 12px', color: c.texto, fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box' },
    botonSubmit: { background: c.acento, color: '#fff', border: 'none', borderRadius: '8px', padding: '11px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', width: '100%' },
    botonSubmitVerde: { background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', width: '100%' },
    mensaje: { color: c.textoSec, fontSize: '13px', marginTop: '12px', textAlign: 'center' },
    tarjetaBoleta: { background: c.tarjeta, border: '1px solid #2a2e3a', borderRadius: '14px', padding: '20px 24px', marginBottom: '14px' },
    tarjetaPendiente: { background: '#1a1a0d', border: '1px solid #3a3a1a', borderRadius: '12px', padding: '16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    nombreEvento: { color: c.texto, fontSize: '18px', fontWeight: '700', margin: '0 0 6px' },
    detalleEvento: { color: c.textoSec, fontSize: '14px', margin: '0 0 4px' },
    vendedorRow: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' },
    badgeBCO: { background: '#1d3557', color: '#60a5fa', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' },
    vendedorNombre: { color: c.textoSec, fontSize: '13px' },
    ventasCount: { color: '#6b7280', fontSize: '12px' },
    filaPrecio: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' },
    precio: { color: c.texto, fontSize: '22px', fontWeight: '700', margin: 0 },
    botonComprar: { background: c.acento, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    botonAprobar: { background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', marginLeft: '6px' },
    botonRechazar: { background: '#991b1b', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', marginLeft: '6px' },
    vacio: { color: c.textoSec, textAlign: 'center', fontSize: '14px' },
    tituloForm: { color: c.texto, fontSize: '18px', fontWeight: '600', margin: '0 0 20px' },
    tituloAdmin: { color: '#4ade80', fontSize: '16px', fontWeight: '600', margin: '0 0 16px' },
    tituloPendiente: { color: '#facc15', fontSize: '14px', fontWeight: '600', margin: '0 0 12px' },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    separador: { border: 'none', borderTop: '1px solid #1a3a2a', margin: '20px 0' }
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
      <div style={s.contenedor}>
        <div style={s.header}>
          <h1 style={s.titulo}>Boleteria CO</h1>
          <div style={s.authBar}>
            {usuario ? (
              <>
                {esAdmin && <button style={s.botonAdmin} onClick={() => setMostrarAdmin(!mostrarAdmin)}>Admin {boletasPendientes.length > 0 && `(${boletasPendientes.length})`}</button>}
                <span style={s.usuarioNombre}>{usuario.email}</span>
                <button style={s.botonSec} onClick={manejarCerrarSesion}>Cerrar sesion</button>
              </>
            ) : (
              <>
                <button style={s.botonSec} onClick={() => setVistaAuth('login')}>Iniciar sesion</button>
                <button style={s.botonPrin} onClick={() => setVistaAuth('registro')}>Registrarse</button>
              </>
            )}
          </div>
        </div>

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

        <button style={s.botonVender} onClick={() => setMostrarFormulario(!mostrarFormulario)}>
          {mostrarFormulario ? 'Cerrar formulario' : '+ Vender boleta'}
        </button>

        {mostrarFormulario && (
          <form onSubmit={manejarPublicar} style={s.tarjetaForm}>
            <p style={s.tituloForm}>Publicar boleta</p>
            <label style={s.label}>Evento</label>
            <select name="eventoId" value={form.eventoId} onChange={manejarCambio} required style={s.input}>
              <option value="">Selecciona un evento</option>
              {eventos.map(function(ev) { return <option key={ev.id} value={ev.id}>{ev.nombre} ({ev.moneda || 'COP'})</option> })}
            </select>
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
        {!cargando && boletas.length === 0 && <p style={s.vacio}>No hay boletas publicadas todavia.</p>}

        {boletas.map(function(b) {
          const moneda = b.eventos ? b.eventos.moneda : 'COP'
          const esBoleteriaCO = b.usuarios && b.usuarios.correo === ADMIN_EMAIL
          const nombreVendedor = b.usuarios ? b.usuarios.nombre : 'Usuario'
          const ventasVendedor = b.vendedor_id ? (ventasPorVendedor[b.vendedor_id] || 0) : 0

          return (
            <div key={b.id} style={s.tarjetaBoleta}>
              <h3 style={s.nombreEvento}>{b.eventos ? b.eventos.nombre : ''}</h3>
              <p style={s.detalleEvento}>{b.eventos ? b.eventos.ciudad : ''} - {b.eventos ? b.eventos.estadio : ''}</p>
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
        })}
      </div>
    </div>
  )
}

export default App