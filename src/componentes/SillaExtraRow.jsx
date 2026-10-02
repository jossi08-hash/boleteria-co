export default function SillaExtraRow({ silla, indice, tribunas, onChangeTribuna, onChangeFila, onChangeSilla, onRemove, inputStyle, labelStyle }) {
  const hasTribunas = Array.isArray(tribunas) && tribunas.length > 0
  return (
    <div style={{background:'rgba(79,126,255,0.04)',border:'1px solid rgba(79,126,255,0.15)',borderRadius:'10px',padding:'12px',marginBottom:'12px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
        <span style={{color:'#6b93ff',fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.4px'}}>Silla {indice+2}</span>
        <button type="button" onClick={onRemove} style={{background:'transparent',border:'none',color:'#6b7280',cursor:'pointer',fontSize:'16px',lineHeight:1,padding:'0 4px'}}>×</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
        <div>
          <label style={{...labelStyle,marginBottom:'4px'}}>Tribuna</label>
          {hasTribunas
            ? <select value={silla.tribuna} onChange={e=>onChangeTribuna(e.target.value)} required style={{...inputStyle,marginBottom:0}}>
                <option value="">Selecciona tribuna</option>
                {tribunas.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            : <input value={silla.tribuna} onChange={e=>onChangeTribuna(e.target.value)} required style={{...inputStyle,marginBottom:0}} />
          }
        </div>
        <div>
          <label style={{...labelStyle,marginBottom:'4px'}}>Fila</label>
          <input value={silla.fila} onChange={e=>onChangeFila(e.target.value)} style={{...inputStyle,marginBottom:0}} />
        </div>
        <div>
          <label style={{...labelStyle,marginBottom:'4px'}}>Silla</label>
          <input value={silla.silla} onChange={e=>onChangeSilla(e.target.value)} style={{...inputStyle,marginBottom:0}} />
        </div>
      </div>
    </div>
  )
}
