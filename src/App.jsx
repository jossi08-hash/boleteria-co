import { useEffect, useState } from 'react'
import { obtenerBoletas, publicarBoleta, crearOrden } from './lib/boletas'
import { registrarUsuario, iniciarSesion, cerrarSesion, obtenerUsuarioActual } from './lib/auth'
import { supabase } from './lib/supabase'

function App() {
  const [boletas, setBoletas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [eventos, setEventos] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [comprando, setComprando] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [vistaAuth, setVistaAuth] = useState(null)
  const [formAuth, setFormAuth] = useState({ nombre: '', correo: '', password: '' })
  const [mensajeAuth, setMensajeAuth] = useState('')

  const [form, setForm] = useState({
    eventoId: '', tribuna: '', fila: '', silla: '', cantidad: 1, precio: ''
  })

  useEffect(() => {
    cargarBoletas()
    cargarEventos()
    obtenerUsuarioActual().then(u => setUsuario(u))
  }, [])

  async function cargarBoletas() {
    const data = await obtenerBoletas()
    setBoletas(data)
    setCargando(false)
  }

  async function cargarEventos() {
    const { data } = await supabase.from('eventos').select('id, nombre, moneda')
    setEventos(data || [])
  }

  function manejarCambio(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function manejarCambioAuth(e) {
    setFormAuth({ ...formAuth, [e.target.name]: e.target.value })
  }

  async function manejarPublicar(e) {
    e.preventDefault()
    if (!usuario) {
      setMensaje('Debes iniciar sesion para publicar una boleta.')
      return
    }
    setMensaje('Publicando...')
    const resultado = await publicarBoleta({
      eventoId: form.eventoId,
      vendedorId: usuario.id,
      tribuna: form.tribuna,
      fila: form.fila,
      silla: form.silla,
      cantidad: Number(form.cantidad),
      precio: Number(form.precio)
    })
    if (resultado) {
      setMensaje('Boleta publicada. Quedara visible cuando este verificada.')
      setForm({ eventoId: '', tribuna: '', fila: '', silla: '', cantidad: 1, precio: '' })
      cargarBoletas()
    } else {
      setMensaje('Hubo un error al publicar. Intenta de nuevo.')
    }
  }

  async function manejarRegistro(e) {
    e.preventDefault()
    setMensajeAuth('Registrando...')
    const resultado = await registrarUsuario(formAuth)
    if (resultado.exito) {
      setUsuario(resultado.usuario)
      setVistaAuth(null)
      setMensajeAuth('')
    } else {
      setMensajeAuth('Error: ' + resultado.mensaje)
    }
  }

  async function manejarLogin(e) {
    e.preventDefault()
    setMensajeAuth('Iniciando sesion...')
    const resultado = await iniciarSesion(formAuth)
    if (resultado.exito) {
      setUsuario(resultado.usuario)
      setVistaAuth(null)
      setMensajeAuth('')
    } else {
      setMensajeAuth('Error: ' + resultado.mensaje)
    }
  }

  async function manejarCerrarSesion() {
    await cerrarSesion()
    setUsuario(null)
  }

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
    if (!usuario) {
      alert('Debes iniciar sesion para comprar una boleta.')
      return
    }
    setComprando(boleta.id)
    const subtotal = Number(boleta.precio)
    const comision = Math.round(subtotal * 0.08)
    const total = subtotal + comision
    const orden = await crearOrden({
      boletaId: boleta.id,
      compradorId: usuario.id,
      subtotal, comision, total,
      metodoPago: 'pendiente'
    })
    if (orden) {
      alert('Orden creada con exito. Codigo: ' + orden.codigo_orden)
    } else {
      alert('Hubo un error al crear la orden. Intenta de nuevo.')
    }
    setComprando(null)
  }

  const c = {
    fondo: '#0f1117', tarjeta: '#171a23', borde: '#2a2e3a',
    texto: '#e8e9ed', textoSec: '#9a9eac', acento: '#3d7eff'
  }

  const s = {
    pagina: { minHeight: '100vh', background: c.fondo, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: '40px 20px' },
    contenedor: { maxWidth: '640px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    titulo: { color: c.texto, fontSize: '28px', fontWeight: '700', margin: 0 },
    authBar: { display: 'flex', gap: '8px', alignItems: 'center' },
    usuarioNombre: { color: c.textoSec, fontSize: '13px' },
    botonSecundario: { background: 'transparent', border: `1px solid ${c.borde}`, borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: c.texto, cursor: 'pointer' },
    botonPrincipal: { background: c.acento, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
    botonVender: { display: 'block', margin: '0 auto 28px', background: c.acento, color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
    tarjetaForm: { background: c.tarjeta, border: `1px solid ${c.borde}`, borderRadius: '14px', padding: '24px', marginBottom: '24px' },
    label: { color: c.textoSec, fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' },
    input: { width: '100%', background: '#0f1117', border: `1px solid ${c.borde}`, borderRadius: '8px', padding: '10px 12px', color: c.texto, fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box' },
    botonSubmit: { background: c.acento, color: '#fff', border: 'none', borderRadius: '8px', padding: '11px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', width: '100%' },
    mensaje: { color: c.textoSec, fontSize: '13px', marginTop: '12px', textAlign: 'center' },
    tarjetaBoleta: { background: c.tarjeta, border: `1px solid ${c.borde}`, borderRadius: '14px', padding: '20px 24px', marginBottom: '14px' },
    nombreEvento: { color: c.texto, fontSize: '18px', fontWeight: '700', margin: '0 0 6px' },
    detalleEvento: { color: c.textoSec, fontSize: '14px', margin: '0 0 4px' },
    filaPrecio: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' },
    precio: { color: c.texto, fontSize: '22px', fontWeight: '700', margin: 0 },
    botonComprar: { background: c.acento, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    vacio: { color: c.textoSec, textAlign: 'center', fontSize: '14px' },
    tituloForm: { color: c.texto, fontSize: '18px', fontWeight: '600', margin: '0 0 20px' }
  }

  return (
    <div style={s.pagina}>
      <div style={s.contenedor}>

        <div style={s.header}>
          <h1 style={s.titulo}>Boleteria CO</h1>
          <div style={s.authBar}>
            {usuario ? (
              <>
                <span style={s.usuarioNombre}>{usuario.email}</span>
                <button style={s.botonSecundario} onClick={manejarCerrarSesion}>Cerrar sesion</button>
              </>
            ) : (
              <>
                <button style={s.botonSecundario} onClick={() => setVistaAuth('login')}>Iniciar sesion</button>
                <button style={s.botonPrincipal} onClick={() => setVistaAuth('registro')}>Registrarse</button>
              </>
            )}
          </div>
        </div>

        {vistaAuth === 'login' && (
          <form onSubmit={manejarLogin} style={s.tarjetaForm}>
            <p style={s.tituloForm}>Iniciar sesion</p>
            <label style={s.label}>Correo</label>
            <input name="correo" type="email" value={formAuth.correo} onChange={manejarCambioAuth} required style={s.input} />
            <label style={s.label}>Contrasena</label>
            <input name="password" type="password" value={formAuth.password} onChange={manejarCambioAuth} required style={s.input} />