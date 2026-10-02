import { useState } from 'react'

const PASOS = {
  comprador: [
    { icon: '🔎', titulo: 'Busca tu evento', desc: 'Explora los partidos disponibles, elige tu tribuna en el mapa del estadio y revisa el precio final antes de pagar.' },
    { icon: '💳', titulo: 'Paga seguro', desc: 'Pagas con Wompi o Bre-B. Tu dinero queda en custodia con Boletería CO: el vendedor todavía no lo recibe.' },
    { icon: '📲', titulo: 'Recibe tu boleta', desc: 'Te transferimos la boleta por la plataforma oficial del evento (TuBoletaPass, Quentro, W Arena o DIM Plus). Antes de pagar te mostramos los pasos exactos.' },
    { icon: '✅', titulo: 'Confirma la entrega', desc: 'Cuando la boleta aparezca en tu app, confírmalo en "Mis boletas". Solo entonces liberamos el pago al vendedor.' },
  ],
  vendedor: [
    { icon: '📝', titulo: 'Publica tu boleta', desc: 'Crea tu cuenta gratis, elige el evento, tu tribuna y el precio. Revisamos cada publicación antes de mostrarla.' },
    { icon: '🔔', titulo: 'Recibe la venta', desc: 'Cuando alguien compra, te notificamos al instante. El pago del comprador ya está asegurado en custodia.' },
    { icon: '📤', titulo: 'Transfiere la boleta', desc: 'Envía la boleta por la app oficial a boletas@boleteriaco.com siguiendo los pasos que te mostramos para cada plataforma.' },
    { icon: '💰', titulo: 'Cobra tu dinero', desc: 'Cuando el comprador confirma (o a las 72 horas sin reclamos), te transferimos el precio de venta menos el 8% de comisión.' },
  ],
}

export default function ComoFunciona({ onVolver, onEmpezar }) {
  const [rol, setRol] = useState('comprador')

  return (
    <div style={{maxWidth:'720px',margin:'0 auto',padding:'40px 20px 60px',textAlign:'left'}}>
      <button onClick={onVolver} style={{background:'transparent',border:'none',color:'#8892a4',cursor:'pointer',fontSize:'14px',fontWeight:'600',display:'flex',alignItems:'center',gap:'6px',padding:'0 0 28px'}}>← Volver</button>
      <h1 style={{fontSize:'26px',fontWeight:'900',color:'#eef0f6',margin:'0 0 6px',letterSpacing:'-0.3px'}}>¿Cómo funciona Boletería CO?</h1>
      <p style={{color:'#8892a4',fontSize:'14px',margin:'0 0 28px',lineHeight:1.6}}>Compra y vende boletas entre personas, con tu dinero protegido hasta que la boleta llega a tus manos.</p>

      {/* Selector comprador / vendedor */}
      <div style={{display:'flex',gap:'6px',background:'#0f1623',border:'1px solid #1e2a3a',borderRadius:'12px',padding:'4px',marginBottom:'24px'}}>
        {[['comprador','🎟 Quiero comprar'],['vendedor','💸 Quiero vender']].map(([id, label]) => (
          <button key={id} onClick={() => setRol(id)}
            style={{flex:1,background:rol===id?'#4f7eff':'transparent',border:'none',borderRadius:'9px',color:rol===id?'#fff':'#8892a4',cursor:'pointer',fontSize:'14px',fontWeight:'700',padding:'10px 0'}}>
            {label}
          </button>
        ))}
      </div>

      {/* Pasos */}
      <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        {PASOS[rol].map(({ icon, titulo, desc }, i) => (
          <div key={titulo} style={{display:'flex',gap:'14px',background:'#0f1623',border:'1px solid #1e2a3a',borderRadius:'12px',padding:'16px'}}>
            <div style={{flexShrink:0,width:'36px',height:'36px',borderRadius:'50%',background:'rgba(79,126,255,0.12)',border:'1px solid rgba(79,126,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center',color:'#6b93ff',fontSize:'14px',fontWeight:'800'}}>{i + 1}</div>
            <div>
              <p style={{color:'#eef0f6',fontWeight:'700',fontSize:'15px',margin:'0 0 4px'}}>{icon} {titulo}</p>
              <p style={{color:'#8892a4',fontSize:'13px',margin:0,lineHeight:1.6}}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Comisiones */}
      <div style={{background:'rgba(79,126,255,0.06)',border:'1px solid rgba(79,126,255,0.2)',borderRadius:'12px',padding:'16px',marginTop:'24px'}}>
        <p style={{color:'#6b93ff',fontSize:'13px',fontWeight:'800',margin:'0 0 6px'}}>💡 Comisiones claras</p>
        <p style={{color:'#8892a4',fontSize:'13px',margin:0,lineHeight:1.6}}>
          {rol === 'comprador'
            ? 'Al precio publicado se le suma aproximadamente un 15% (redondeado a los $1.000 más cercanos). Ves el total exacto antes de pagar, sin cobros ocultos.'
            : 'Publicar es gratis. Al vender se retiene el 8% del precio de venta y recibes el resto por transferencia a la cuenta que registres en tu perfil.'}
        </p>
      </div>

      {onEmpezar && (
        <div style={{textAlign:'center',marginTop:'32px'}}>
          <button onClick={() => onEmpezar(rol)} style={{background:'#4f7eff',border:'none',borderRadius:'10px',color:'#fff',cursor:'pointer',fontSize:'15px',fontWeight:'700',padding:'13px 28px'}}>
            {rol === 'comprador' ? 'Ver boletas disponibles' : 'Publicar mi boleta'}
          </button>
        </div>
      )}

      <p style={{color:'#4e5a6e',fontSize:'12px',textAlign:'center',margin:'28px 0 0'}}>¿Dudas? Escríbenos a soporte@boleteriaco.com</p>
    </div>
  )
}
