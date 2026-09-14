import { useEffect, useState } from 'react'
import { obtenerBoletas, publicarBoleta, crearOrden } from './lib/boletas'
import { registrarUsuario, iniciarSesion, cerrarSesion, obtenerUsuarioActual } from './lib/auth'
import { supabase } from './lib/supabase'

const ADMIN_EMAIL = 'jossi08@icloud.com'

function App() {
  const [boletas, setBoletas] = useState([])
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

  const esAdmin = usuario && usuario.email === ADMIN_EMAIL

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

  function manejarCambio(e) { setForm({ ...form, [e.target.name]: e.target.value }) }
  function manejarCambioAuth(e) { setFormAuth({ ...formAuth, [e.target.name]: e.target.value }) }
  function manejarCambioEvento(e) { setFormEvento({ ...formEvento, [e.target.name]: e.target.value }) }

  async function manejarCrearEvento(e) {
    e.preventDefault()
    setMensajeEvento('Creando evento...')
    const { error } = await supabase.from('eventos').insert({
      nombre: formEvento.nombre,
      deporte: formEvento.deporte,
      ciudad: formEvento.ciudad,
      estadio: formEvento.estadio,
      fecha: formEvento.fecha,
      hora: formEvento.hora,
      moneda: formEvento.moneda
    })
    if (error) {
      setMensajeEvento('Error: ' + error.message)
    } else {
      setMensajeEvento('Evento creado correctamente.')
      setFormEvento({ nombre: '', deporte: 'Futbol', ciudad: '', estadio: '', fecha: '', hora: '', moneda: 'COP' })
      cargarEventos()
    }
  }

  async function manejarPublicar(e) {
    e.preventDefault()
    if (!usuario) { setMensaje('Debes iniciar sesion para publicar una boleta.'); return }
    setMensaje('Publicando...')
    const resultado = await publicarBoleta({ eventoId: form.eventoId, vendedorId: usuario.id, tribuna: form.tribuna, fila: form.fila, silla: form.silla, cantidad: Number(form.cantidad), precio: Number(form.precio) })
    if (resultado) { setMensaje('Boleta publicada. Quedara visible cuando este verificada.'); setForm({ eventoId: '', tribuna: '', fila: '', silla: '', cantidad: 1, precio: '' }); cargarBoletas() }
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
    const subtotal = Number(boleta.precio)
    const comision = Math.round(subtotal * 0.08)
    const total = subtotal + comision
    const orden = await crearOrden({ boletaId: boleta.id, compradorId: usuario.id, subtotal, comision, total, metodoPago: 'pendiente' })
    if (orden) { alert('Orden creada con exito. Codigo: ' + orden.codigo_orden) }
    else { alert('Hubo un error al crear la orden. Intenta de nuevo.') }
    setComprando(null)
  }

  const c = { fondo: '#0f1117', tarjeta: '#171a23', borde: '#2a2e3a', texto: '#e8e9ed', textoSec: '#9a9eac', acento: '#3d7eff', verde: '#1a3a2a', verdeTexto: '#4ade80' }
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
    nombreEvento: { color: c.texto, fontSize: '18px', fontWeight: '700', margin: '0 0 6px' },
    detalleEvento: { color: c.textoSec, fontSize: '14px', margin: '0 0 4px' },
    filaPrecio: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' },
    precio: { color: c.texto, fontSize: '22px', fontWeight: '700', margin: 0 },
    botonComprar: { background: c.acento, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    vacio: { color: c.textoSec, textAlign: 'center', fontSize: '14px' },
    tituloForm: { color: c.texto, fontSize: '18px', fontWeight: '600', margin: '0 0 20px' },
    tituloAdmin: { color: '#4ade80', fontSize: '16px', fontWeight: '600', margin: '0 0 20px' },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  }

  return (
    <div style={s.pagina}>
      <div style={s.contenedor}>
        <div style={s.header}>
          <h1 style={s.titulo}>Boleteria CO</h1>
          <div style={s.authBar}>
            {usuario ? (
              <>
                {esAdmin && <button style={s.botonAdmin} onClick={() => setMostrarAdmin(!mostrarAdmin)}>Admin</button>}
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
            <p style={s.tituloAdmin}>Panel de administrador — Crear evento</p>
            <form onSubmit={manejarCrearEvento}>
              <label style={s.label}>Nombre del evento</label>
              <input name="nombre" value={formEvento.nombre} onChange={manejarCambioEvento} required style={s.input} placeholder="Ej: Millonarios FC vs America de Cali" />
              <div style={s.row2}>
                <div>
                  <label style={s.label}>Deporte</label>
                  <select name="deporte" value={formEvento.deporte} onChange={manejarCambioEvento} style={s.input}>
                    <option>Futbol</option>
                    <option>Baloncesto</option>
                    <option>Tenis</option>
                    <option>Ciclismo</option>
                    <option>Otro</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Moneda</label>
                  <select name="moneda" value={formEvento.moneda} onChange={manejarCambioEvento} style={s.input}>
                    <option value="COP">COP - Pesos</option>
                    <option value="USD">USD - Dolares</option>
                  </select>
                </div>
              </div>
              <div style={s.row2}>
                <div>
                  <label style={s.label}>Ciudad</label>
                  <input name="ciudad" value={formEvento.ciudad} onChange={manejarCambioEvento} required style={s.input} placeholder="Bogota" />
                </div>
                <div>
                  <label style={s.label}>Estadio o lugar</label>
                  <input name="estadio" value={formEvento.estadio} onChange={manejarCambioEvento} required style={s.input} placeholder="El Campin" />
                </div>
              </div>
              <div style={s.row2}>
                <div>
                  <label style={s.label}>Fecha</label>
                  <input name="fecha" type="date" value={formEvento.fecha} onChange={manejarCambioEvento} required style={s.input} />
                </div>
                <div>
                  <label style={s.label}>Hora</label>
                  <input name="hora" type="time" value={formEvento.hora} onChange={manejarCambioEvento} required style={s.input} />
                </div>
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
          return (
            <div key={b.id} style={s.tarjetaBoleta}>
              <h3 style={s.nombreEvento}>{b.eventos ? b.eventos.nombre : ''}</h3>
              <p style={s.detalleEvento}>{b.eventos ? b.eventos.ciudad : ''} - {b.eventos ? b.eventos.estadio : ''}</p>
              <p style={s.detalleEvento}>Tribuna {b.tribuna} - Fila {b.fila} - Silla {b.silla}</p>
              <div style={s.filaPrecio}>
                <p style={s.precio}>{calcularTotal(b.precio, moneda)}</p>
                <button onClick={() => manejarCompra(b)} disabled={comprando === b.id} style={s.botonComprar}>
                  {comprando === b.id ? 'Procesando...' : 'Comprar'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default App