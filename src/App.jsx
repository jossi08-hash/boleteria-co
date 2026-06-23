import { useEffect, useState } from 'react'
import { obtenerBoletas, publicarBoleta, crearOrden } from './lib/boletas'
import { supabase } from './lib/supabase'

function App() {
  const [boletas, setBoletas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [eventos, setEventos] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [comprando, setComprando] = useState(null)

  const [form, setForm] = useState({
    eventoId: '', tribuna: '', fila: '', silla: '', cantidad: 1, precio: ''
  })

  useEffect(() => {
    cargarBoletas()
    cargarEventos()
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

  async function manejarPublicar(e) {
    e.preventDefault()
    setMensaje('Publicando...')

    const resultado = await publicarBoleta({
      eventoId: form.eventoId,
      vendedorId: null,
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

  function formatearPrecio(precio, moneda) {
    const valor = Number(precio)
    if (moneda === 'USD') {
      return 'US$' + valor.toLocaleString('en-US')
    }
    return '$' + valor.toLocaleString('es-CO')
  }

  function calcularTotal(precio, moneda) {
    const conComision = Number(precio) * 1.08
    const redondeado = Math.round(conComision / 1000) * 1000
    return formatearPrecio(redondeado, moneda)
  }

  async function manejarCompra(boleta) {
    setComprando(boleta.id)

    const subtotal = Number(boleta.precio)
    const comision = Math.round(subtotal * 0.08)
    const total = subtotal + comision

    const orden = await crearOrden({
      boletaId: boleta.id,
      compradorId: null,
      subtotal,
      comision,
      total,
      metodoPago: 'pendiente'
    })

    if (orden) {
      alert('Orden creada con exito. Codigo: ' + orden.codigo_orden)
    } else {
      alert('Hubo un error al crear la orden. Intenta de nuevo.')
    }

    setComprando(null)
  }

  const colores = {
    fondo: '#0f1117',
    tarjeta: '#171a23',
    borde: '#2a2e3a',
    texto: '#e8e9ed',
    textoSecundario: '#9a9eac',
    acento: '#3d7eff',
    acentoHover: '#5d93ff'
  }

  const estilos = {
    pagina: {
      minHeight: '100vh',
      background: colores.fondo,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      padding: '40px 20px'
    },
    contenedor: {
      maxWidth: '640px',
      margin: '0 auto'
    },
    titulo: {
      color: colores.texto,
      fontSize: '32px',
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: '24px'
    },
    botonPrincipal: {
      display: 'block',
      margin: '0 auto 28px',
      background: colores.acento,
      color: '#fff',
      border: 'none',
      borderRadius: '10px',
      padding: '12px 24px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer'
    },
    tarjetaFormulario: {
      background: colores.tarjeta,
      border: `1px solid ${colores.borde}`,
      borderRadius: '14px',
      padding: '24px',
      marginBottom: '24px'
    },
    label: {
      color: colores.textoSecundario,
      fontSize: '13px',
      fontWeight: '500',
      display: 'block',
      marginBottom: '6px'
    },
    input: {
      width: '100%',
      background: '#0f1117',
      border: `1px solid ${colores.borde}`,
      borderRadius: '8px',
      padding: '10px 12px',
      color: colores.texto,
      fontSize: '14px',
      marginBottom: '16px',
      boxSizing: 'border-box'
    },
    botonSubmit: {
      background: colores.acento,
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      padding: '11px 20px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      width: '100%'
    },
    mensaje: {
      color: colores.textoSecundario,
      fontSize: '13px',
      marginTop: '12px',
      textAlign: 'center'
    },
    tarjetaBoleta: {
      background: colores.tarjeta,
      border: `1px solid ${colores.borde}`,
      borderRadius: '14px',
      padding: '20px 24px',
      marginBottom: '14px'
    },
    nombreEvento: {
      color: colores.texto,
      fontSize: '18px',
      fontWeight: '700',
      margin: '0 0 6px'
    },
    detalleEvento: {
      color: colores.textoSecundario,
      fontSize: '14px',
      margin: '0 0 4px'
    },
    filaPrecio: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '14px'
    },
    precio: {
      color: colores.texto,
      fontSize: '22px',
      fontWeight: '700',
      margin: 0
    },
    botonComprar: {
      background: colores.acento,
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      padding: '10px 22px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer'
    },
    vacio: {
      color: colores.textoSecundario,
      textAlign: 'center',
      fontSize: '14px'
    }
  }

  return (
    <div style={estilos.pagina}>
      <div style={estilos.contenedor}>
        <h1 style={estilos.titulo}>🎟️ Boleteria CO</h1>

        <button
          style={estilos.botonPrincipal}
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          {mostrarFormulario ? 'Cerrar formulario' : '+ Vender boleta'}
        </button>

        {mostrarFormulario && (
          <form onSubmit={manejarPublicar} style={estilos.tarjetaFormulario}>
            <label style={estilos.label}>Evento</label>
            <select
              name="eventoId"
              value={form.eventoId}
              onChange={manejarCambio}
              required
              style={estilos.input}
            >
              <option value="">Selecciona un evento</option>
              {eventos.map(function(ev) {
                return <option key={ev.id} value={ev.id}>{ev.nombre} ({ev.moneda || 'COP'})</option>
              })}
            </select>

            <label style={estilos.label}>Tribuna</label>
            <input name="tribuna" value={form.tribuna} onChange={manejarCambio} required style={estilos.input} />

            <label style={estilos.label}>Fila</label>
            <input name="fila" value={form.fila} onChange={manejarCambio} required style={estilos.input} />

            <label style={estilos.label}>Silla</label>
            <input name="silla" value={form.silla} onChange={manejarCambio} required style={estilos.input} />

            <label style={estilos.label}>Precio (en la moneda del evento seleccionado)</label>
            <input name="precio" type="number" value={form.precio} onChange={manejarCambio} required style={estilos.input} />

            <button type="submit" style={estilos.botonSubmit}>Publicar boleta</button>
            {mensaje && <p style={estilos.mensaje}>{mensaje}</p>}
          </form>
        )}

        {cargando && <p style={estilos.vacio}>Cargando boletas...</p>}
        {!cargando && boletas.length === 0 && <p style={estilos.vacio}>No hay boletas publicadas todavia.</p>}

        {boletas.map(function(b) {
          const moneda = b.eventos ? b.eventos.moneda : 'COP'
          return (
            <div key={b.id} style={estilos.tarjetaBoleta}>
              <h3 style={estilos.nombreEvento}>{b.eventos ? b.eventos.nombre : ''}</h3>
              <p style={estilos.detalleEvento}>{b.eventos ? b.eventos.ciudad : ''} · {b.eventos ? b.eventos.estadio : ''}</p>
              <p style={estilos.detalleEvento}>Tribuna {b.tribuna} · Fila {b.fila} · Silla {b.silla}</p>
              <div style={estilos.filaPrecio}>
                <p style={estilos.precio}>{calcularTotal(b.precio, moneda)}</p>
                <button
                  onClick={() => manejarCompra(b)}
                  disabled={comprando === b.id}
                  style={estilos.botonComprar}
                >
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