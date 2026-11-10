import { useMemo, useState } from 'react'
import { reclamoAbierto, pagoLiberado } from '../lib/ordenes'

// Pestaña Usuarios del panel admin: vista Ficha (un usuario a fondo) y vista Tabla (todos, ordenables y desplegables)

const C = { fondo: '#141311', tarjeta: '#1e1c19', borde: '#34312b', linea: '#26231f', texto: '#f5f1e4', sec: '#b9b4a6', mudo: '#8f8a7d', amarillo: '#ffe23b', verde: '#4ade80', naranja: '#fb923c', rojo: '#f87171', azul: '#60a5fa' }
const pesos = n => '$' + Math.round(n || 0).toLocaleString('es-CO')
// "Oriental · F.12 S.8" o "General · No numerada"
const ubicacion = b => {
  const silla = (b?.silla || '').trim()
  if (!silla || /^no ?numerada$|^n\/?a$|^-$/i.test(silla)) return `${b?.tribuna || ''} · No numerada`
  return `${b?.tribuna || ''} · F.${b?.fila || '-'} S.${silla}`
}
const fecha = f => f ? new Date(f).toLocaleString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'

function whatsapp(u) {
  const tel = (u.telefono || '').replace(/\D/g, '')
  return tel ? 'https://wa.me/' + (tel.length === 10 ? '57' + tel : tel) : null
}
function correo(u) {
  return u.correo ? `mailto:${u.correo}?subject=${encodeURIComponent('Boletería CO')}&body=${encodeURIComponent('Hola, ' + (u.nombre || '').split(' ')[0] + '.\n\n')}` : null
}

// Estado de confirmación de una venta, con su color
function confirmacion(b) {
  const o = b.venta
  if (!o) return b.estado === 'vendida' ? { txt: 'vendida por fuera', color: C.mudo } : { txt: b.estado, color: C.mudo }
  if (reclamoAbierto(o)) return { txt: 'reclamo abierto', color: C.rojo }
  if (!pagoLiberado(o)) return { txt: 'esperando (72 h)', color: C.naranja }
  if (b.publicada_por_admin) return { txt: 'confirmada', color: C.verde }
  return o.pago_vendedor_enviado ? { txt: 'confirmada · pagada', color: C.verde } : { txt: 'confirmada · por pagar', color: C.amarillo }
}

const Pill = ({ txt, color }) => (
  <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '6px', color, background: color + '1f', whiteSpace: 'nowrap' }}>{txt}</span>
)

// Datos que se calculan una vez por usuario para ordenar y filtrar
function enriquecer(u) {
  const ventas = u.boletas.filter(b => b.venta)
  return {
    ...u,
    ultimaVenta: ventas.reduce((m, b) => (!m || b.venta.creado_en > m ? b.venta.creado_en : m), null),
    esperando: ventas.filter(b => !reclamoAbierto(b.venta) && !pagoLiberado(b.venta)).length,
    reclamos: ventas.filter(b => reclamoAbierto(b.venta)).length,
  }
}

function resumenCorto(u) {
  if (u.reclamos) return { txt: u.reclamos === 1 ? '1 reclamo abierto' : `${u.reclamos} reclamos abiertos`, color: C.rojo }
  if (u.porPagar > 0 && !u.es_admin) return { txt: `${pesos(u.porPagar)} por pagar`, color: C.amarillo }
  if (u.esperando) return { txt: `${u.esperando} ${u.esperando === 1 ? 'venta espera' : 'ventas esperan'} confirmación`, color: C.naranja }
  if (u.vendidasWeb) return { txt: `${u.vendidasWeb} ${u.vendidasWeb === 1 ? 'vendida' : 'vendidas'} · al día`, color: C.mudo }
  if (u.compras) return { txt: `comprador · ${u.compras} ${u.compras === 1 ? 'compra' : 'compras'}`, color: C.mudo }
  return { txt: u.publicadas ? `${u.publicadas} subidas · sin ventas` : 'sin actividad', color: C.mudo }
}

const FILTROS = [
  { k: 'ventas', label: 'Con ventas', fn: u => u.vendidasWeb > 0 },
  { k: 'pagar', label: 'Por pagar', fn: u => u.porPagar > 0 && !u.es_admin },
  { k: 'esperando', label: 'Esperando confirmación', fn: u => u.esperando > 0 },
  { k: 'reclamo', label: 'Con reclamo', fn: u => u.reclamos > 0 },
  { k: 'compradores', label: 'Compradores', fn: u => u.compras > 0 },
  { k: 'sindoc', label: 'Sin documento', fn: u => !u.documento },
]

const COLUMNAS = [
  { k: 'nombre', label: 'Usuario', w: '24%' },
  { k: 'correo', label: 'Contacto', w: '25%' },
  { k: 'publicadas', label: 'Sub.', w: '8%' },
  { k: 'vendidasWeb', label: 'Vend.', w: '9%' },
  { k: 'ganancias', label: 'Ganancias', w: '12%' },
  { k: 'porPagar', label: 'Por pagar', w: '11%' },
  { k: 'ultimaVenta', label: 'Últ. venta', w: '11%' },
]

function descargarCSV(lista) {
  const cab = ['Nombre', 'Correo', 'Teléfono', 'Documento', 'Registrado', 'Subidas', 'Vendidas web', 'Vendidas por fuera', 'Compras', 'Ganancias', 'Por pagar', 'Esperando confirmación', 'Reclamos', 'Última venta']
  const filas = lista.map(u => [u.nombre, u.correo, u.telefono, u.documento, u.creado_en, u.publicadas, u.vendidasWeb, u.vendidasFuera, u.compras, u.ganancias, u.es_admin ? 0 : u.porPagar, u.esperando, u.reclamos, u.ultimaVenta])
  const csv = [cab, ...filas].map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `usuarios-boleteria-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

const enlace = color => ({ color, fontSize: '12px', fontWeight: 700, textDecoration: 'none', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 })
const th = { textAlign: 'left', fontWeight: 600, color: C.mudo, fontSize: '11px', padding: '7px 6px', borderBottom: `1px solid ${C.borde}`, whiteSpace: 'nowrap', overflow: 'hidden' }
const td = { padding: '7px 6px', borderBottom: `1px solid ${C.linea}`, color: C.texto, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

// Boletas de un usuario en tabla compacta (se usa en la ficha y al desplegar una fila)
function TablaBoletas({ boletas, hace, compacta }) {
  if (!boletas.length) return <p style={{ color: C.mudo, fontSize: '12px', margin: '8px 0' }}>No ha subido boletas.</p>
  if (compacta) return boletas.map(b => (
    <div key={b.id} style={{ padding: '8px 0', borderBottom: `1px solid ${C.linea}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
        <span style={{ color: C.texto, fontSize: '12px', fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.eventos?.nombre || 'Evento'}</span>
        <Pill {...confirmacion(b)} />
      </div>
      <p style={{ color: C.mudo, fontSize: '12px', margin: '3px 0 0' }}>
        {ubicacion(b)} · {pesos(b.precio)} · subida {hace(b.creado_en)}{b.venta ? ` · vendida ${hace(b.venta.creado_en)} · ${b.venta.codigo_orden}` : ''}
      </p>
    </div>
  ))
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth: '460px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup><col style={{ width: '29%' }} /><col style={{ width: '23%' }} /><col style={{ width: '14%' }} /><col style={{ width: '12%' }} /><col style={{ width: '22%' }} /></colgroup>
        <thead><tr><th style={th}>Evento</th><th style={th}>Ubicación</th><th style={th}>Precio</th><th style={th}>Vendida</th><th style={th}>Estado</th></tr></thead>
        <tbody>
          {boletas.map(b => (
            <tr key={b.id} title={`Subida ${hace(b.creado_en)}${b.venta ? ' · orden ' + b.venta.codigo_orden : ''}`}>
              <td style={td} title={b.eventos?.nombre}>{b.eventos?.nombre || 'Evento'}</td>
              <td style={{ ...td, color: C.sec }} title={ubicacion(b)}>{ubicacion(b)}</td>
              <td style={td}>{pesos(b.precio)}</td>
              <td style={{ ...td, color: C.sec }}>{b.venta ? hace(b.venta.creado_en).replace('hace ', '') : '—'}</td>
              <td style={{ ...td, textOverflow: 'clip' }}><Pill {...confirmacion(b)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Ficha({ u, historial, hace, describirCambio, onVolver, esMobile }) {
  const [pestana, setPestana] = useState('boletas')
  const ventas = u.boletas.filter(b => b.venta)
  const suyo = historial.filter(h => h.boleta?.vendedor_id === u.id || h.hecho_por === u.id)
  const wa = whatsapp(u), mail = correo(u)
  const pestanas = [
    { k: 'boletas', label: `Boletas (${u.publicadas})` },
    { k: 'ventas', label: `Ventas (${ventas.length})` },
    { k: 'compras', label: `Compras (${u.compras})` },
    { k: 'historial', label: `Historial (${suyo.length})` },
    { k: 'contacto', label: 'Contacto' },
  ]
  const dato = (label, valor, color = C.texto) => (
    <div style={{ background: C.fondo, border: `1px solid ${C.linea}`, borderRadius: '8px', padding: '8px 10px' }}>
      <div style={{ color: C.mudo, fontSize: '11px' }}>{label}</div>
      <div style={{ color, fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>{valor}</div>
    </div>
  )
  return (
    <div style={{ minWidth: 0 }}>
      {onVolver && <button onClick={onVolver} style={{ ...enlace(C.amarillo), marginBottom: '10px' }}>← Todos los usuarios</button>}
      <p style={{ color: C.texto, fontSize: '16px', fontWeight: 700, margin: 0 }}>{u.nombre || 'Sin nombre'}{u.es_admin ? ' · admin' : ''}</p>
      <p style={{ color: C.sec, fontSize: '12px', margin: '3px 0 0', wordBreak: 'break-word' }}>{u.correo || 'Sin correo'} · {u.telefono || 'Sin teléfono'} · Doc. {u.documento || 'pendiente'}</p>
      <p style={{ color: C.mudo, fontSize: '12px', margin: '2px 0 12px' }}>Registrado {fecha(u.creado_en)} · Dato de pago: {u.datos_pago ? 'sí' : 'no'}</p>
      <div style={{ display: 'grid', gridTemplateColumns: esMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: '8px', marginBottom: '12px' }}>
        {dato('Subidas', u.publicadas)}
        {dato('Vendidas', u.vendidasWeb + (u.vendidasFuera ? ` + ${u.vendidasFuera}` : ''))}
        {dato('Ganancias', pesos(u.ganancias), C.verde)}
        {dato('Por pagar', u.es_admin ? '—' : pesos(u.porPagar), u.porPagar > 0 && !u.es_admin ? C.amarillo : C.texto)}
      </div>
      <div style={{ display: 'flex', gap: '14px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {mail && <a href={mail} style={enlace(C.azul)}>Escribir por correo →</a>}
        {wa && <a href={wa} target="_blank" rel="noreferrer" style={enlace(C.verde)}>WhatsApp →</a>}
      </div>
      <div style={{ display: 'flex', gap: '2px', borderBottom: `1px solid ${C.borde}`, marginBottom: '8px', overflowX: 'auto' }}>
        {pestanas.map(p => (
          <button key={p.k} onClick={() => setPestana(p.k)} style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${pestana === p.k ? C.amarillo : 'transparent'}`, color: pestana === p.k ? C.texto : C.mudo, fontSize: '12px', fontWeight: 600, padding: '6px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>{p.label}</button>
        ))}
      </div>

      {pestana === 'boletas' && <TablaBoletas boletas={u.boletas} hace={hace} compacta />}

      {pestana === 'ventas' && (ventas.length === 0
        ? <p style={{ color: C.mudo, fontSize: '12px' }}>Todavía no ha vendido en la web.</p>
        : ventas.map(b => {
          const o = b.venta
          return (
            <div key={b.id} style={{ padding: '8px 0', borderBottom: `1px solid ${C.linea}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: C.texto, fontSize: '12px', fontWeight: 700 }}>{b.eventos?.nombre || 'Evento'} · {ubicacion(b)}</span>
                <Pill {...confirmacion(b)} />
              </div>
              <p style={{ color: C.mudo, fontSize: '12px', margin: '3px 0 0' }}>
                {o.codigo_orden} · vendida {hace(o.creado_en)} ({fecha(o.creado_en)}) · le corresponden {pesos(b.ganancia)}
                {o.liberado_en ? ` · confirmada ${hace(o.liberado_en)}` : ''}
              </p>
            </div>
          )
        }))}

      {pestana === 'compras' && ((u.comprasLista || []).length === 0
        ? <p style={{ color: C.mudo, fontSize: '12px' }}>No ha comprado boletas.</p>
        : u.comprasLista.map(o => (
          <div key={o.codigo_orden} style={{ padding: '8px 0', borderBottom: `1px solid ${C.linea}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
              <span style={{ color: C.texto, fontSize: '12px', fontWeight: 700 }}>{o.boletas?.eventos?.nombre || 'Evento'} · {ubicacion(o.boletas)}</span>
              <Pill {...(reclamoAbierto(o) ? { txt: 'reclamo abierto', color: C.rojo } : o.liberado ? { txt: 'confirmó', color: C.verde } : { txt: 'sin confirmar', color: C.naranja })} />
            </div>
            <p style={{ color: C.mudo, fontSize: '12px', margin: '3px 0 0' }}>{o.codigo_orden} · {pesos(o.total)} · {hace(o.creado_en)} ({fecha(o.creado_en)})</p>
          </div>
        )))}

      {pestana === 'historial' && (suyo.length === 0
        ? <p style={{ color: C.mudo, fontSize: '12px' }}>Sin movimientos registrados desde que se activó el historial.</p>
        : suyo.map(h => (
          <div key={h.id} style={{ padding: '8px 0 8px 10px', borderBottom: `1px solid ${C.linea}`, borderLeft: `3px solid ${h.accion === 'eliminada' ? C.rojo : h.accion === 'creada' ? C.verde : C.amarillo}` }}>
            <p style={{ color: C.texto, fontSize: '12px', fontWeight: 700, margin: 0 }}>{h.evento} · {ubicacion(h.boleta)}</p>
            <p style={{ color: C.sec, fontSize: '12px', margin: '2px 0 0' }}>{describirCambio(h)}</p>
            <p style={{ color: C.mudo, fontSize: '11px', margin: '2px 0 0' }}>{fecha(h.creado_en)} · por {h.autor ? (h.autor.es_admin ? 'admin' : h.autor.nombre || h.autor.correo) : 'sistema'}</p>
          </div>
        )))}

      {pestana === 'contacto' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {[['Nombre', u.nombre], ['Correo', u.correo], ['Teléfono', u.telefono], ['Documento', u.documento], ['Dato de pago', u.datos_pago ? (typeof u.datos_pago === 'string' ? u.datos_pago : JSON.stringify(u.datos_pago)) : null], ['Registrado', fecha(u.creado_en)]].map(([k, v]) => (
              <tr key={k}><td style={{ ...td, color: C.mudo, width: '120px' }}>{k}</td><td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word' }}>{v || '—'}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function UsuariosAdmin({ usuarios, historial, esMobile, hace, describirCambio }) {
  const [vista, setVista] = useState('ficha')
  const [busqueda, setBusqueda] = useState('')
  const [filtros, setFiltros] = useState([])
  const [orden, setOrden] = useState({ k: 'ultimaVenta', asc: false })
  const [elegido, setElegido] = useState(null)
  const [abiertos, setAbiertos] = useState([])

  const todos = useMemo(() => usuarios.map(enriquecer), [usuarios])
  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const activos = FILTROS.filter(f => filtros.includes(f.k))
    const res = todos.filter(u => (!q || [u.nombre, u.correo, u.telefono, u.documento].some(v => (v || '').toLowerCase().includes(q))) && activos.every(f => f.fn(u)))
    const val = u => orden.k === 'nombre' || orden.k === 'correo' ? (u[orden.k] || '').toLowerCase() : orden.k === 'ultimaVenta' ? (u.ultimaVenta || '') : (u[orden.k] || 0)
    return [...res].sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * (orden.asc ? 1 : -1))
  }, [todos, busqueda, filtros, orden])

  const actual = todos.find(u => u.id === elegido) || (!esMobile ? lista[0] : null)
  const alternar = (arr, set, k) => set(arr.includes(k) ? arr.filter(x => x !== k) : [...arr, k])
  const verFicha = id => { setElegido(id); setVista('ficha') }

  const boton = activo => ({ padding: '6px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', background: activo ? C.amarillo : 'transparent', color: activo ? C.fondo : C.sec })
  const chip = activo => ({ fontSize: '11px', fontWeight: 600, padding: '4px 9px', borderRadius: '6px', cursor: 'pointer', border: `1px solid ${activo ? C.amarillo : C.borde}`, background: activo ? C.amarillo + '1a' : 'transparent', color: activo ? C.amarillo : C.sec, whiteSpace: 'nowrap' })

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <p style={{ color: C.verde, fontSize: '15px', fontWeight: 700, margin: 0 }}>Usuarios ({lista.length}{lista.length !== todos.length ? ` de ${todos.length}` : ''})</p>
        <div style={{ display: 'flex', background: C.tarjeta, border: `1px solid ${C.borde}`, borderRadius: '9px', padding: '3px' }}>
          <button onClick={() => setVista('ficha')} style={boton(vista === 'ficha')}>Ficha</button>
          <button onClick={() => setVista('tabla')} style={boton(vista === 'tabla')}>Tabla</button>
        </div>
      </div>
      <input type="text" placeholder="Buscar por nombre, correo, teléfono o documento" value={busqueda} onChange={e => setBusqueda(e.target.value)}
        style={{ width: '100%', boxSizing: 'border-box', background: C.fondo, border: '1px solid #4a463d', borderRadius: '8px', padding: '8px 12px', color: C.texto, fontSize: '13px', marginBottom: '8px', outline: 'none' }} />
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {FILTROS.map(f => <button key={f.k} onClick={() => alternar(filtros, setFiltros, f.k)} style={chip(filtros.includes(f.k))}>{f.label}</button>)}
        {vista === 'tabla' && <button onClick={() => descargarCSV(lista)} style={{ ...chip(false), marginLeft: 'auto' }}>Descargar CSV</button>}
      </div>

      {vista === 'ficha' && (
        esMobile && actual
          ? <Ficha key={actual.id} u={actual} historial={historial} hace={hace} describirCambio={describirCambio} esMobile={esMobile} onVolver={() => setElegido(null)} />
          : (
            <div style={{ display: 'grid', gridTemplateColumns: esMobile ? 'minmax(0,1fr)' : '230px minmax(0,1fr)', gap: '16px', alignItems: 'start' }}>
              <div style={{ borderRight: esMobile ? 'none' : `1px solid ${C.borde}`, paddingRight: esMobile ? 0 : '10px', maxHeight: esMobile ? 'none' : '70vh', overflowY: 'auto' }}>
                {lista.length === 0 && <p style={{ color: C.mudo, fontSize: '12px' }}>Ningún usuario coincide.</p>}
                {lista.map(u => {
                  const sel = actual?.id === u.id, r = resumenCorto(u)
                  return (
                    <button key={u.id} onClick={() => setElegido(u.id)} style={{ display: 'block', width: '100%', textAlign: 'left', background: sel ? C.amarillo + '14' : 'transparent', border: 'none', borderLeft: `3px solid ${sel ? C.amarillo : 'transparent'}`, padding: '8px 10px', cursor: 'pointer', borderBottom: `1px solid ${C.linea}` }}>
                      <div style={{ color: sel ? C.amarillo : C.texto, fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nombre || u.correo || 'Sin nombre'}{u.es_admin ? ' · admin' : ''}</div>
                      <div style={{ color: r.color, fontSize: '11px', marginTop: '2px' }}>{r.txt}</div>
                    </button>
                  )
                })}
              </div>
              {!esMobile && (actual
                ? <Ficha key={actual.id} u={actual} historial={historial} hace={hace} describirCambio={describirCambio} esMobile={esMobile} />
                : <p style={{ color: C.mudo, fontSize: '12px' }}>Elige un usuario para ver su ficha.</p>)}
            </div>
          )
      )}

      {vista === 'tabla' && (
        <div style={{ overflowX: 'auto', border: `1px solid ${C.borde}`, borderRadius: '10px', background: C.tarjeta }}>
          <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup><col style={{ width: '28px' }} />{COLUMNAS.map(c => <col key={c.k} style={{ width: c.w }} />)}</colgroup>
            <thead>
              <tr>
                <th style={th}></th>
                {COLUMNAS.map(c => (
                  <th key={c.k} onClick={() => setOrden(o => ({ k: c.k, asc: o.k === c.k ? !o.asc : c.k === 'nombre' || c.k === 'correo' }))} style={{ ...th, cursor: 'pointer', color: orden.k === c.k ? C.amarillo : C.mudo }}>
                    {c.label}{orden.k === c.k ? (orden.asc ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map(u => {
                const abierto = abiertos.includes(u.id)
                return [
                  <tr key={u.id} onClick={() => alternar(abiertos, setAbiertos, u.id)} style={{ cursor: 'pointer', background: abierto ? C.fondo : 'transparent' }}>
                    <td style={{ ...td, color: C.mudo, textAlign: 'center' }}>{abierto ? '▾' : '▸'}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{u.nombre || 'Sin nombre'}{u.es_admin ? ' · admin' : ''}</td>
                    <td style={{ ...td, color: C.sec }} title={`${u.correo || ''} · ${u.telefono || ''}`}>{u.correo || '—'}{u.telefono ? ' · ' + u.telefono : ''}</td>
                    <td style={td}>{u.publicadas}</td>
                    <td style={td}>{u.vendidasWeb}{u.vendidasFuera ? `+${u.vendidasFuera}` : ''}</td>
                    <td style={{ ...td, color: u.ganancias ? C.verde : C.mudo }}>{u.ganancias ? pesos(u.ganancias) : '—'}</td>
                    <td style={{ ...td, textOverflow: 'clip' }}>{u.reclamos ? <Pill txt="reclamo" color={C.rojo} /> : u.porPagar > 0 && !u.es_admin ? <Pill txt={pesos(u.porPagar)} color={C.amarillo} /> : u.esperando ? <Pill txt="esperando" color={C.naranja} /> : u.vendidasWeb ? <Pill txt="al día" color={C.verde} /> : <span style={{ color: C.mudo }}>—</span>}</td>
                    <td style={{ ...td, color: C.sec }}>{u.ultimaVenta ? hace(u.ultimaVenta).replace('hace ', '') : '—'}</td>
                  </tr>,
                  abierto && (
                    <tr key={u.id + '-detalle'}>
                      <td colSpan={8} style={{ padding: '6px 10px 12px 34px', background: C.fondo, borderBottom: `1px solid ${C.borde}` }}>
                        <TablaBoletas boletas={u.boletas} hace={hace} />
                        <div style={{ display: 'flex', gap: '14px', marginTop: '8px', flexWrap: 'wrap' }}>
                          {correo(u) && <a href={correo(u)} style={enlace(C.azul)}>Correo →</a>}
                          {whatsapp(u) && <a href={whatsapp(u)} target="_blank" rel="noreferrer" style={enlace(C.verde)}>WhatsApp →</a>}
                          <button onClick={() => verFicha(u.id)} style={enlace(C.amarillo)}>Abrir ficha completa →</button>
                        </div>
                      </td>
                    </tr>
                  ),
                ]
              })}
              {lista.length === 0 && <tr><td colSpan={8} style={{ ...td, color: C.mudo, textAlign: 'center' }}>Ningún usuario coincide.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
