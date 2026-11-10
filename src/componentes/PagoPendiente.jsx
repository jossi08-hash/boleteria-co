import { useState } from 'react'
import { desglosePago, TARIFA_WOMPI } from '../lib/pagos'

// Tarjeta de un pago pendiente al vendedor: recibo con el desglose y barra de reparto

const pesos = n => '$' + Math.round(n || 0).toLocaleString('es-CO')
const C = { texto: '#f5f1e4', sec: '#b9b4a6', mudo: '#8f8a7d', verde: '#4ade80', rojo: '#f87171', amarillo: '#ffe23b', linea: '#2c2a25' }

function Fila({ label, valor, color = C.sec, borde, fuerte }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '5px 0', borderTop: borde ? `1px solid ${C.linea}` : 'none', alignItems: 'baseline' }}>
      <span style={{ color, fontSize: '13px', fontWeight: fuerte ? 700 : 400 }}>{label}</span>
      <span style={{ color, fontSize: fuerte ? '22px' : '13px', fontWeight: fuerte ? 800 : 400, whiteSpace: 'nowrap' }}>{valor}</span>
    </div>
  )
}

export default function PagoPendiente({ orden, hace, onMarcarPagado }) {
  const [copiado, setCopiado] = useState('')
  const b = orden.boletas
  const u = b?.usuarios
  const d = desglosePago(orden, b)
  const nombre = u?.nombre || 'el vendedor'
  const estimada = TARIFA_WOMPI.confirmada ? '' : ' (estimada)'
  const copiar = (texto, que) => {
    navigator.clipboard?.writeText(texto).then(() => { setCopiado(que); setTimeout(() => setCopiado(''), 1500) })
  }
  const pct = n => d.total ? Math.max(0, (n / d.total) * 100) : 0
  const boton = { background: 'transparent', border: '1px solid #4a463d', borderRadius: '7px', color: C.texto, fontSize: '12px', fontWeight: 600, padding: '7px 12px', cursor: 'pointer' }

  return (
    <div style={{ background: '#1c2a1c', border: '1px solid #166534', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' }}>
      <p style={{ color: C.texto, fontWeight: 700, margin: 0, fontSize: '14px' }}>{nombre} · {b?.eventos?.nombre || 'Evento'}</p>
      <p style={{ color: C.mudo, fontSize: '12px', margin: '2px 0 12px' }}>
        {b?.tribuna} · F.{b?.fila || '-'} S.{b?.silla || '-'} · Orden {orden.codigo_orden}{orden.liberado_en ? ` · confirmada ${hace(orden.liberado_en)}` : ''}
      </p>

      <div style={{ display: 'flex', height: '24px', borderRadius: '6px', overflow: 'hidden', fontSize: '11px', fontWeight: 700 }}>
        <div style={{ width: pct(d.vendedor) + '%', background: 'rgba(74,222,128,0.18)', color: C.verde, display: 'flex', alignItems: 'center', paddingLeft: '8px', whiteSpace: 'nowrap', overflow: 'hidden' }}>{nombre.split(' ')[0]}</div>
        <div style={{ width: pct(d.wompi) + '%', background: 'rgba(248,113,113,0.3)' }} title={`Wompi ${pesos(d.wompi)}`} />
        <div style={{ width: pct(d.queda) + '%', background: 'rgba(255,226,59,0.2)', color: C.amarillo, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Tú</div>
      </div>
      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: C.mudo, margin: '6px 0 12px', flexWrap: 'wrap' }}>
        <span><span style={{ color: C.verde }}>■</span> Vendedor {pesos(d.vendedor)}</span>
        <span><span style={{ color: C.rojo }}>■</span> Wompi ≈ {pesos(d.wompi)}</span>
        <span><span style={{ color: C.amarillo }}>■</span> Tú ≈ {pesos(d.queda)}</span>
      </div>

      <Fila label="El comprador pagó" valor={pesos(d.total)} color={C.texto} />
      <Fila label={`− Tarifa Wompi${estimada}`} valor={'− ' + pesos(d.wompi)} />
      <Fila label="Te llegó" valor={pesos(d.llego)} color={C.texto} borde />
      <Fila label={`− Comisión 8 % de ${pesos(d.precio)}`} valor={'− ' + pesos(d.comision)} />
      <Fila label={`Transferir a ${nombre.split(' ')[0]}`} valor={pesos(d.vendedor)} color={C.verde} borde fuerte />
      <Fila label="Te queda" valor={pesos(d.queda)} />

      <div style={{ background: '#141311', borderRadius: '8px', padding: '9px 12px', margin: '10px 0', fontSize: '13px', color: u?.datos_pago ? C.amarillo : C.mudo, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {u?.datos_pago || 'Sin dato de pago registrado. Escríbele para pedirlo.'}
        {u?.correo && <span style={{ color: C.mudo }}>{'\n'}{u.correo}</span>}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => copiar(String(d.vendedor), 'monto')} style={boton}>{copiado === 'monto' ? 'Copiado' : 'Copiar monto'}</button>
        {u?.datos_pago && <button onClick={() => copiar(u.datos_pago, 'dato')} style={boton}>{copiado === 'dato' ? 'Copiado' : 'Copiar dato de pago'}</button>}
        <button onClick={() => onMarcarPagado(orden.id)} style={{ ...boton, background: '#16a34a', border: 'none', color: '#fff' }}>Marcar pagado</button>
      </div>
    </div>
  )
}
