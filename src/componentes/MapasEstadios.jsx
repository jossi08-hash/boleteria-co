// Mapas SVG interactivos de los estadios (tribunas seleccionables)

export function MapaElCampin({avail, selected, onSelect}) {
  // avail: { 'Nombre Tribuna': [boletas], ... }
  // Pitch horizontal (landscape). Goals a izq/der → Norte izq, Sur der.
  // Occidental=arco SUPERIOR (amplio, 120°, 4 anillos), Oriental=arco INFERIOR (amplio, 120°, 3 anillos)
  // Norte=D-shape IZQUIERDA (60°), Sur=D-shape DERECHA (60°)
  const CX=210, CY=195
  const r2d = d => d*Math.PI/180
  const ptx = (rx,ry,d) => CX+rx*Math.cos(r2d(d))
  const pty = (rx,ry,d) => CY+ry*Math.sin(r2d(d))
  const f = n => +n.toFixed(2)
  function ringPath({oRx,oRy,iRx,iRy,s,e}) {
    const span=((e-s)%360+360)%360, lg=span>180?1:0
    return `M${f(ptx(oRx,oRy,s))} ${f(pty(oRx,oRy,s))} A${oRx} ${oRy} 0 ${lg} 1 ${f(ptx(oRx,oRy,e))} ${f(pty(oRx,oRy,e))} L${f(ptx(iRx,iRy,e))} ${f(pty(iRx,iRy,e))} A${iRx} ${iRy} 0 ${lg} 0 ${f(ptx(iRx,iRy,s))} ${f(pty(iRx,iRy,s))}Z`
  }
  function midPt({oRx,oRy,iRx,iRy,s,e}) {
    const span=((e-s)%360+360)%360, mid=s+span/2
    return [f(CX+(oRx+iRx)/2*Math.cos(r2d(mid))), f(CY+(oRy+iRy)/2*Math.sin(r2d(mid)))]
  }
  const SECS=[
    // Fondos (detrás de los arcos): arcos pequeños izq/der
    {id:'Norte', name:'Norte', oRx:170,oRy:110,iRx:95,iRy:50, s:150,e:210},
    {id:'Sur',   name:'Sur',   oRx:170,oRy:110,iRx:95,iRy:50, s:330,e:30 },
    // Occidental (arriba, 210°→330°): 4 anillos de adentro a afuera
    {id:'Occidental General',      name:'Occ.Gen',  oRx:114,oRy:65, iRx:95, iRy:50, s:210,e:330},
    {id:'Occidental Platea Baja',  name:'Occ.Pl.B', oRx:133,oRy:80, iRx:114,iRy:65, s:210,e:330},
    {id:'Occidental Platea Alta',  name:'Occ.Pl.A', oRx:152,oRy:95, iRx:133,iRy:80, s:210,e:330},
    {id:'Occidental Preferencial', name:'Occ.Pref', oRx:170,oRy:110,iRx:152,iRy:95, s:210,e:330},
    // Oriental (abajo, 30°→150°): 3 anillos de adentro a afuera
    {id:'Oriental General',        name:'Ori.Gen',  oRx:114,oRy:65, iRx:95, iRy:50, s:30, e:150},
    {id:'Oriental Preferencial',   name:'Ori.Pref', oRx:137,oRy:84, iRx:114,iRy:65, s:30, e:150},
    {id:'Oriental Platea',         name:'Ori.Plata',oRx:170,oRy:110,iRx:137,iRy:84, s:30, e:150},
  ]
  const fw=190, fh=100, fx=CX-95, fy=CY-50
  const stripes = Array.from({length:9},(_,i)=>({x:f(fx+i*(fw/9)),fill:i%2===0?'#1e5c28':'#226630'}))
  return (
    <svg viewBox="0 0 420 380" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'auto',display:'block',borderRadius:'8px'}}>
      <defs><clipPath id="fcc"><rect x={fx} y={fy} width={fw} height={fh} rx="8"/></clipPath></defs>
      <rect width="420" height="380" fill="#06101c" rx="10"/>
      {SECS.map(sec=>{
        const isAvail=(avail[sec.id]||[]).length>0, isSel=selected===sec.id
        return (
          <path key={sec.id} d={ringPath(sec)}
            fill={isSel?'rgba(79,126,255,0.5)':isAvail?'rgba(61,219,122,0.25)':'rgba(255,255,255,0.04)'}
            stroke={isSel?'#4f7eff':isAvail?'rgba(61,219,122,0.55)':'rgba(255,255,255,0.08)'}
            strokeWidth={isSel?2:1}
            style={{cursor:isAvail?'pointer':'default',transition:'fill 0.15s'}}
            onClick={()=>isAvail&&onSelect(sec.id)}
          />
        )
      })}
      <ellipse cx={CX} cy={CY} rx="91" ry="46" fill="#0a1827"/>
      {stripes.map((s,i)=><rect key={i} x={s.x} y={fy} width={f(fw/9)} height={fh} fill={s.fill} clipPath="url(#fcc)"/>)}
      <g clipPath="url(#fcc)">
        <rect x={f(fx+1.5)} y={f(fy+1.5)} width={f(fw-3)} height={f(fh-3)} rx="6" fill="none" stroke="rgba(255,255,255,.32)" strokeWidth="1.2"/>
        <line x1={CX} y1={f(fy+1.5)} x2={CX} y2={f(fy+fh-1.5)} stroke="rgba(255,255,255,.32)" strokeWidth="1.2"/>
        <circle cx={CX} cy={CY} r="15" fill="none" stroke="rgba(255,255,255,.32)" strokeWidth="1.2"/>
        <circle cx={CX} cy={CY} r="2" fill="rgba(255,255,255,.4)"/>
        <rect x={f(fx+1.5)} y={f(CY-18)} width="28" height="36" fill="none" stroke="rgba(255,255,255,.32)" strokeWidth="1.2"/>
        <rect x={f(fx+fw-29.5)} y={f(CY-18)} width="28" height="36" fill="none" stroke="rgba(255,255,255,.32)" strokeWidth="1.2"/>
      </g>
      {SECS.filter(sec=>(avail[sec.id]||[]).length>0||selected===sec.id).map(sec=>{
        const [lx,ly]=midPt(sec)
        return (
          <text key={sec.id+'l'} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize="8.5" fontWeight="700"
            fill={selected===sec.id?'#fff':'rgba(255,255,255,0.9)'}
            style={{pointerEvents:'none'}}>{sec.name}</text>
        )
      })}
      {/* Compass markers */}
      <text x="210" y="14" textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="800" fill="rgba(168,139,250,0.7)" style={{pointerEvents:'none',letterSpacing:'0.5px'}}>OCCIDENTAL</text>
      <text x="210" y="372" textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="800" fill="rgba(168,139,250,0.7)" style={{pointerEvents:'none',letterSpacing:'0.5px'}}>ORIENTAL</text>
      <text x="12" y="195" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="800" fill="rgba(148,163,184,0.7)" style={{pointerEvents:'none'}} transform="rotate(-90,12,195)">NORTE</text>
      <text x="408" y="195" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="800" fill="rgba(148,163,184,0.7)" style={{pointerEvents:'none'}} transform="rotate(90,408,195)">SUR</text>
    </svg>
  )
}

export function MapaAtanasio({avail, selected, onSelect}) {
  // Horizontal: Norte=left, Sur=right, Occidental=top, Oriental=bottom
  const CX=210, CY=195
  const r2d = d => d*Math.PI/180
  const ptx = (rx,ry,d) => CX+rx*Math.cos(r2d(d))
  const pty = (rx,ry,d) => CY+ry*Math.sin(r2d(d))
  const f = n => +n.toFixed(2)
  function ringPath({oRx,oRy,iRx,iRy,s,e}) {
    const span=((e-s)%360+360)%360, lg=span>180?1:0
    return `M${f(ptx(oRx,oRy,s))} ${f(pty(oRx,oRy,s))} A${oRx} ${oRy} 0 ${lg} 1 ${f(ptx(oRx,oRy,e))} ${f(pty(oRx,oRy,e))} L${f(ptx(iRx,iRy,e))} ${f(pty(iRx,iRy,e))} A${iRx} ${iRy} 0 ${lg} 0 ${f(ptx(iRx,iRy,s))} ${f(pty(iRx,iRy,s))}Z`
  }
  function midPt({oRx,oRy,iRx,iRy,s,e}) {
    const span=((e-s)%360+360)%360, mid=s+span/2
    return [f(CX+(oRx+iRx)/2*Math.cos(r2d(mid))), f(CY+(oRy+iRy)/2*Math.sin(r2d(mid)))]
  }
  const SECS=[
    {id:'Norte',           lbl:['Norte'],        oRx:170,oRy:110,iRx:95, iRy:50, s:150,e:210},
    {id:'Sur',             lbl:['Sur'],           oRx:170,oRy:110,iRx:95, iRy:50, s:330,e:30 },
    {id:'Occidental Baja', lbl:['Occ.','Baja'],  oRx:115,oRy:67, iRx:95, iRy:50, s:210,e:330},
    {id:'Occidental Alta', lbl:['Occ.','Alta'],  oRx:143,oRy:88, iRx:115,iRy:67, s:210,e:330},
    {id:'Platea',          lbl:['Platea'],        oRx:170,oRy:110,iRx:143,iRy:88, s:210,e:330},
    {id:'Oriental Baja',   lbl:['Ori.','Baja'],  oRx:130,oRy:78, iRx:95, iRy:50, s:30, e:150},
    {id:'Oriental Alta',   lbl:['Ori.','Alta'],  oRx:170,oRy:110,iRx:130,iRy:78, s:30, e:150},
  ]
  const fw=190, fh=100, fx=CX-95, fy=CY-50
  return (
    <svg viewBox="0 0 420 390" style={{width:'100%',maxWidth:'540px',display:'block',margin:'0 auto'}} aria-label="Estadio Atanasio Girardot">
      <defs>
        <clipPath id="atc"><ellipse cx={CX} cy={CY} rx={95} ry={50}/></clipPath>
      </defs>
      <ellipse cx={CX} cy={CY} rx={170} ry={110} fill="#0f172a" opacity="0.5"/>
      {SECS.map(sec=>{
        const isAvail=(avail[sec.id]||[]).length>0, isSel=selected===sec.id
        const fill=isSel?'rgba(79,126,255,0.5)':isAvail?'rgba(61,219,122,0.25)':'rgba(255,255,255,0.04)'
        const stroke=isSel?'#4f7eff':isAvail?'rgba(61,219,122,0.55)':'rgba(255,255,255,0.08)'
        const [lx,ly]=midPt(sec)
        return (
          <g key={sec.id} onClick={()=>isAvail&&onSelect(sec.id)} style={{cursor:isAvail?'pointer':'default',transition:'fill 0.15s'}}>
            <path d={ringPath(sec)} fill={fill} stroke={stroke} strokeWidth="1.5" opacity={isSel?1:isAvail?0.9:0.5}/>
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              fontSize={sec.lbl.length>1?'8':'11'} fontWeight="700"
              fill={isSel?'#fff':isAvail?'#4ade80':'rgba(255,255,255,0.3)'}
              style={{pointerEvents:'none',letterSpacing:'0.2px'}}>
              {sec.lbl.length===1
                ? sec.lbl[0]
                : <><tspan x={lx} dy="-0.5em">{sec.lbl[0]}</tspan><tspan x={lx} dy="1.1em">{sec.lbl[1]}</tspan></>
              }
            </text>
          </g>
        )
      })}
      <g clipPath="url(#atc)">
        {Array.from({length:10},(_,i)=>(
          <rect key={i} x={fx} y={fy+i*10} width={fw} height={5} fill={i%2===0?'#166534':'#15803d'} opacity="0.9"/>
        ))}
        <rect x={fx} y={fy} width={fw} height={fh} fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.5"/>
        <line x1={CX} y1={fy} x2={CX} y2={fy+fh} stroke="#4ade80" strokeWidth="0.8" opacity="0.5"/>
        <circle cx={CX} cy={CY} r={22} fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.5"/>
        <circle cx={CX} cy={CY} r={2} fill="#4ade80" opacity="0.5"/>
        <rect x={fx} y={CY-18} width={28} height={36} fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.5"/>
        <rect x={fx+fw-28} y={CY-18} width={28} height={36} fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.5"/>
        <circle cx={fx+38} cy={CY} r={1.5} fill="#4ade80" opacity="0.5"/>
        <circle cx={fx+fw-38} cy={CY} r={1.5} fill="#4ade80" opacity="0.5"/>
      </g>
      <text x="210" y="14" textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="800" fill="rgba(168,139,250,0.7)" style={{pointerEvents:'none',letterSpacing:'0.5px'}}>OCCIDENTAL</text>
      <text x="210" y="378" textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="800" fill="rgba(168,139,250,0.7)" style={{pointerEvents:'none',letterSpacing:'0.5px'}}>ORIENTAL</text>
      <text x="12" y="195" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="800" fill="rgba(148,163,184,0.7)" style={{pointerEvents:'none'}} transform="rotate(-90,12,195)">NORTE</text>
      <text x="408" y="195" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="800" fill="rgba(148,163,184,0.7)" style={{pointerEvents:'none'}} transform="rotate(90,408,195)">SUR</text>
    </svg>
  )
}

export function MapaPascualGuerrero({avail, selected, onSelect}) {
  // Horizontal oval: Norte=left cap, Sur=right cap, Oriental=TOP (2 rings), Occidental=BOTTOM (3 rings)
  const CX=210, CY=195
  const r2d = d => d*Math.PI/180
  const ptx = (rx,ry,d) => CX+rx*Math.cos(r2d(d))
  const pty = (rx,ry,d) => CY+ry*Math.sin(r2d(d))
  const f = n => +n.toFixed(2)
  function ringPath({oRx,oRy,iRx,iRy,s,e}) {
    const span=((e-s)%360+360)%360, lg=span>180?1:0
    return `M${f(ptx(oRx,oRy,s))} ${f(pty(oRx,oRy,s))} A${oRx} ${oRy} 0 ${lg} 1 ${f(ptx(oRx,oRy,e))} ${f(pty(oRx,oRy,e))} L${f(ptx(iRx,iRy,e))} ${f(pty(iRx,iRy,e))} A${iRx} ${iRy} 0 ${lg} 0 ${f(ptx(iRx,iRy,s))} ${f(pty(iRx,iRy,s))}Z`
  }
  function midPt({oRx,oRy,iRx,iRy,s,e}) {
    const span=((e-s)%360+360)%360, mid=s+span/2
    return [f(CX+(oRx+iRx)/2*Math.cos(r2d(mid))), f(CY+(oRy+iRy)/2*Math.sin(r2d(mid)))]
  }
  const SECS=[
    // End caps
    {id:'Norte',                   lbl:['Norte'],        oRx:170,oRy:110,iRx:95,iRy:50, s:150,e:210},
    {id:'Sur',                     lbl:['Sur'],          oRx:170,oRy:110,iRx:95,iRy:50, s:330,e:30 },
    // Oriental (top, 30°→150°) — 2 rings inner→outer
    {id:'Oriental Baja',           lbl:['Ori.','Baja'],  oRx:132,oRy:80, iRx:95,iRy:50, s:30, e:150},
    {id:'Oriental Alta',           lbl:['Ori.','Alta'],  oRx:170,oRy:110,iRx:132,iRy:80,s:30, e:150},
    // Occidental (bottom, 210°→330°) — 3 rings inner→outer
    {id:'Occidental 1.er Piso',    lbl:['Occ.','1.er P'],oRx:113,oRy:65, iRx:95,iRy:50, s:210,e:330},
    {id:'Occidental 2.º Piso',     lbl:['Occ.','2.º P'], oRx:132,oRy:80, iRx:113,iRy:65,s:210,e:330},
    {id:'Occidental 3.er Piso',    lbl:['Occ.','3.er P'],oRx:170,oRy:110,iRx:132,iRy:80,s:210,e:330},
  ]
  const fw=190, fh=100, fx=CX-95, fy=CY-50
  return (
    <svg viewBox="0 0 420 390" style={{width:'100%',maxWidth:'540px',display:'block',margin:'0 auto'}} aria-label="Estadio Pascual Guerrero">
      <defs>
        <clipPath id="pgc"><ellipse cx={CX} cy={CY} rx={95} ry={50}/></clipPath>
      </defs>
      <rect width="420" height="390" fill="#06101c" rx="10"/>
      {SECS.map(sec=>{
        const isAvail=(avail[sec.id]||[]).length>0, isSel=selected===sec.id
        const fill=isSel?'rgba(79,126,255,0.5)':isAvail?'rgba(61,219,122,0.25)':'rgba(255,255,255,0.04)'
        const stroke=isSel?'#4f7eff':isAvail?'rgba(61,219,122,0.55)':'rgba(255,255,255,0.08)'
        const [lx,ly]=midPt(sec)
        return (
          <g key={sec.id} onClick={()=>isAvail&&onSelect(sec.id)} style={{cursor:isAvail?'pointer':'default',transition:'fill 0.15s'}}>
            <path d={ringPath(sec)} fill={fill} stroke={stroke} strokeWidth="1.5" opacity={isSel?1:isAvail?0.9:0.5}/>
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              fontSize={sec.lbl.length>1?'8':'11'} fontWeight="700"
              fill={isSel?'#fff':isAvail?'#4ade80':'rgba(255,255,255,0.3)'}
              style={{pointerEvents:'none',letterSpacing:'0.2px'}}>
              {sec.lbl.length===1
                ? sec.lbl[0]
                : <><tspan x={lx} dy="-0.5em">{sec.lbl[0]}</tspan><tspan x={lx} dy="1.1em">{sec.lbl[1]}</tspan></>
              }
            </text>
          </g>
        )
      })}
      <g clipPath="url(#pgc)">
        {Array.from({length:10},(_,i)=>(
          <rect key={i} x={fx} y={fy+i*10} width={fw} height={5} fill={i%2===0?'#166534':'#15803d'} opacity="0.9"/>
        ))}
        <rect x={fx} y={fy} width={fw} height={fh} fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.5"/>
        <line x1={CX} y1={fy} x2={CX} y2={fy+fh} stroke="#4ade80" strokeWidth="0.8" opacity="0.5"/>
        <circle cx={CX} cy={CY} r={22} fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.5"/>
        <circle cx={CX} cy={CY} r={2} fill="#4ade80" opacity="0.5"/>
        <rect x={fx} y={CY-18} width={28} height={36} fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.5"/>
        <rect x={fx+fw-28} y={CY-18} width={28} height={36} fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.5"/>
        <circle cx={fx+38} cy={CY} r={1.5} fill="#4ade80" opacity="0.5"/>
        <circle cx={fx+fw-38} cy={CY} r={1.5} fill="#4ade80" opacity="0.5"/>
      </g>
      <text x="210" y="14" textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="800" fill="rgba(168,139,250,0.7)" style={{pointerEvents:'none',letterSpacing:'0.5px'}}>ORIENTAL</text>
      <text x="210" y="378" textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="800" fill="rgba(168,139,250,0.7)" style={{pointerEvents:'none',letterSpacing:'0.5px'}}>OCCIDENTAL</text>
      <text x="12" y="195" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="800" fill="rgba(148,163,184,0.7)" style={{pointerEvents:'none'}} transform="rotate(-90,12,195)">NORTE</text>
      <text x="408" y="195" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="800" fill="rgba(148,163,184,0.7)" style={{pointerEvents:'none'}} transform="rotate(90,408,195)">SUR</text>
    </svg>
  )
}

export function MapaEstadioTecho({avail, selected, onSelect}) {
  /* Rectangular asymmetric stadium — polygon-based (not arc-based) */
  const SECS=[
    {id:'Norte',                name:'Norte',     d:'M170,42 L365,42 L365,115 L170,115Z',         lx:267, ly:78 },
    {id:'Oriental Norte',       name:'Ori.Norte', d:'M365,42 L445,62 L445,178 L365,115Z',         lx:407, ly:115},
    {id:'Oriental',             name:'Oriental',  d:'M365,115 L445,178 L445,412 L365,412Z',       lx:406, ly:295},
    {id:'Occidental Norte',     name:'Occ.Norte', d:'M42,12 L170,12 L170,258 L42,292Z',          lx:80,  ly:152},
    {id:'Occidental Norte VIP', name:'VIP',       d:'M112,58 L170,58 L170,212 L112,212Z',        lx:139, ly:135},
    {id:'Occidental Sur',       name:'Occ.Sur',   d:'M42,292 L170,258 L170,412 L42,448Z',        lx:98,  ly:367},
  ]
  /* Field bounds */
  const fx=170,fy=115,fw=195,fh=297
  return (
    <svg viewBox="0 0 490 505" style={{width:'100%',maxWidth:'490px',display:'block',margin:'0 auto'}} aria-label="Estadio de Techo">
      <defs>
        <clipPath id="tec"><rect x={fx} y={fy} width={fw} height={fh}/></clipPath>
      </defs>
      {SECS.map((sec)=>{
        const isAvail=(avail[sec.id]||[]).length>0, isSel=selected===sec.id
        const fill=isSel?'rgba(79,126,255,0.5)':isAvail?'rgba(61,219,122,0.25)':'rgba(255,255,255,0.04)'
        const stroke=isSel?'#4f7eff':isAvail?'rgba(61,219,122,0.55)':'rgba(255,255,255,0.08)'
        return (
          <g key={sec.id} onClick={()=>isAvail && onSelect(sec.id)} style={{cursor:isAvail?'pointer':'default'}}>
            <path d={sec.d} fill={fill} stroke={stroke} strokeWidth="1.5" opacity={isSel?1:isAvail?0.85:0.4}/>
            <text x={sec.lx} y={sec.ly} textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fontWeight="700"
              fill={isSel?'#fff':isAvail?'#4ade80':'rgba(255,255,255,0.3)'} style={{pointerEvents:'none',letterSpacing:'0.3px'}}>
              {sec.name}
            </text>
          </g>
        )
      })}
      {/* Field */}
      <g clipPath="url(#tec)">
        {Array.from({length:10},(_,i)=>(
          <rect key={i} x={fx} y={fy+i*(fh/10)} width={fw} height={fh/20} fill={i%2===0?'#166534':'#15803d'} opacity="0.9"/>
        ))}
        <rect x={fx} y={fy} width={fw} height={fh} fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.5"/>
        <line x1={fx} y1={fy+fh/2} x2={fx+fw} y2={fy+fh/2} stroke="#4ade80" strokeWidth="0.8" opacity="0.5"/>
        <circle cx={fx+fw/2} cy={fy+fh/2} r={28} fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.5"/>
        <circle cx={fx+fw/2} cy={fy+fh/2} r={2} fill="#4ade80" opacity="0.5"/>
        <rect x={fx+47} y={fy} width={101} height={36} fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.5"/>
        <rect x={fx+47} y={fy+fh-36} width={101} height={36} fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.5"/>
        <rect x={fx+66} y={fy} width={63} height={15} fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.5"/>
        <rect x={fx+66} y={fy+fh-15} width={63} height={15} fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.5"/>
        <circle cx={fx+fw/2} cy={fy+50} r={2} fill="#4ade80" opacity="0.5"/>
        <circle cx={fx+fw/2} cy={fy+fh-50} r={2} fill="#4ade80" opacity="0.5"/>
      </g>
      {/* Compass */}
      <text x="267" y="18" textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="800" fill="rgba(148,163,184,0.7)" style={{pointerEvents:'none',letterSpacing:'0.5px'}}>NORTE</text>
      <text x="267" y="490" textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="800" fill="rgba(148,163,184,0.7)" style={{pointerEvents:'none',letterSpacing:'0.5px'}}>SUR</text>
      <text x="16" y="262" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="800" fill="rgba(168,139,250,0.7)" style={{pointerEvents:'none'}} transform="rotate(-90,16,262)">OCCIDENTAL</text>
      <text x="474" y="262" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="800" fill="rgba(168,139,250,0.7)" style={{pointerEvents:'none'}} transform="rotate(90,474,262)">ORIENTAL</text>
    </svg>
  )
}
