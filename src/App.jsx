import { useEffect, useState } from 'react'
import { obtenerBoletas, publicarBoleta, crearOrden, obtenerVentasDeUsuario, obtenerMisCompras, obtenerMisVentas } from './lib/boletas'
import { registrarUsuario, iniciarSesion, cerrarSesion, obtenerUsuarioActual, enviarRecuperacion, actualizarPassword } from './lib/auth'
import { supabase } from './lib/supabase'

const ADMIN_EMAIL = 'jossi08@icloud.com'

const PLATAFORMAS = {
  'TuBoletaPass': {
    equipos: ['santa fe','america','llaneros','tolima'],
    color: '#e85d04',
    instrVendedor: 'Abre TuBoletaPass → Mis entradas → selecciona la boleta → Enviar Entrada → ingresa boletas@boleteriaco.com.',
    instrComprador: 'Descarga TuBoletaPass en App Store o Google Play. Regístrate con tu documento y correo. Boletería CO te transferirá la boleta; aparecerá en "Mis entradas".',
    tipoEntrega: 'email',
    requisitoReceptor: 'El destinatario debe tener cuenta activa y registrada en Tuboleta Pass para recibir la entrada.',
    pasosVendedor: [
      'Abre la aplicación Tuboleta Pass en tu celular.',
      'Entra a "Mis entradas" y selecciona el evento.',
      'Haz clic en la boleta que deseas transferir.',
      'Toca "Enviar Entrada" en la parte inferior.',
      'Escribe boletas@boleteriaco.com en el campo de correo.',
      'Confirma la acción para finalizar el envío.',
    ],
    pasosComprador: [
      'Descarga Tuboleta Pass en App Store o Google Play.',
      'Regístrate con tu documento y correo electrónico.',
      'Acepta la entrada cuando llegue la notificación o el correo de transferencia.',
      'La boleta aparecerá en "Mis entradas".',
    ],
  },
  'Quentro': {
    equipos: ['millonarios','nacional','atletico nacional'],
    color: '#2563eb',
    instrVendedor: 'Abre Quentro → Mis Entradas → selecciona la entrada → icono de flecha → ingresa boletas@boleteriaco.com.',
    instrComprador: 'Descarga Quentro en App Store o Google Play. Regístrate con tu correo y número de documento. Boletería CO te transferirá la entrada; recibirás una notificación en la app.',
    tipoEntrega: 'email',
    requisitoReceptor: 'El destinatario debe tener descargada la app y una cuenta creada en Quentro.',
    pasosVendedor: [
      'Abre Quentro e inicia sesión con tu cuenta.',
      'Ve a "Mis Entradas" y presiona sobre el ticket a transferir.',
      'Toca el icono de flecha (o "Transferir") debajo del código QR.',
      'Selecciona "Ingresar correo electrónico" e ingresa boletas@boleteriaco.com.',
      'Presiona Transferir para completar el proceso.',
    ],
    pasosComprador: [
      'Descarga Quentro en App Store o Google Play.',
      'Crea tu cuenta con tu correo y número de documento.',
      'Recibirás una notificación cuando Boletería CO te transfiera la entrada.',
      'Acepta la transferencia desde la app para recibirla.',
    ],
  },
  'Warena': {
    equipos: ['cucuta','junior','atletico junior'],
    color: '#7c3aed',
    instrVendedor: 'Abre W Arena → perfil → entradas → Transferir → ingresa el documento de identidad registrado en la cuenta de boletas@boleteriaco.com.',
    instrComprador: 'Descarga W Arena en App Store o Google Play. Regístrate con tu documento de identidad. Boletería CO te cederá la entrada a tu documento registrado en la app.',
    tipoEntrega: 'documento',
    requisitoReceptor: 'El destinatario debe tener cuenta activa en W Arena con su documento de identidad registrado.',
    pasosVendedor: [
      'Descarga e ingresa a la aplicación oficial de W Arena.',
      'Inicia sesión con la cuenta con la que compraste la boleta.',
      'Ve al perfil y busca tus entradas.',
      'Selecciona la opción de transferir entradas.',
      'Ingresa el documento de identidad de la cuenta boletas@boleteriaco.com.',
    ],
    pasosComprador: [
      'Descarga W Arena en App Store o Google Play.',
      'Regístrate con tu nombre y documento de identidad.',
      'Boletería CO transferirá la entrada a tu documento registrado en la app.',
      'La entrada aparecerá en tu perfil de W Arena.',
    ],
  },
  'Dim Plus': {
    equipos: ['independiente medellin','medellin','dim'],
    color: '#dc2626',
    instrVendedor: 'Abre DIM Plus → Mis boletas → Ver boleta → Ceder boleta → llena los datos de la cuenta boletas@boleteriaco.com.',
    instrComprador: 'Descarga DIM Plus en App Store o Google Play. Regístrate con tus datos exactos (nombre y documento). Boletería CO te cederá la boleta a tus datos registrados.',
    tipoEntrega: 'documento',
    requisitoReceptor: 'El receptor debe tener cuenta activa en DIM Plus con sus datos personales exactos registrados. Una boleta puede cederse máximo 3 veces. No se permiten capturas del QR ni descargas en PDF — el código es dinámico.',
    pasosVendedor: [
      'Entra a la App DIM Plus e inicia sesión.',
      'Ve a "Mis boletas" y selecciona la entrada a transferir.',
      'Haz clic en "Ver boleta".',
      'Presiona "Ceder boleta".',
      'Llena los datos personales de la cuenta boletas@boleteriaco.com exactamente como están registrados.',
    ],
    pasosComprador: [
      'Descarga DIM Plus en App Store o Google Play.',
      'Regístrate con tus datos personales exactos (nombre y documento).',
      'Boletería CO cederá la boleta a tus datos registrados.',
      'Importante: no se permiten descargas en PDF ni capturas del QR — el código es dinámico.',
    ],
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


function coloresEquipo(nombre) {
  const n = (nombre||'').toLowerCase()
  if (n.includes('santa fe')) return ['#c8102e','#ffffff']
  if (n.includes('millonarios')) return ['#003fa0','#b8d4f5']
  if (n.includes('atletico nacional')||(n.includes('nacional')&&!n.includes('santa'))) return ['#006400','#f5c518']
  if (n.includes('america')||n.includes('américarica')) return ['#dd0000','#ffffff']
  if (n.includes('junior')) return ['#cc0000','#f5c518']
  if (n.includes('medellin')||n.includes('medellín')||n.includes('dim')) return ['#cc0000','#003fa0']
  if (n.includes('deportivo cali')||n.includes('dep. cali')) return ['#006400','#1a1a1a']
  if (n.includes('tolima')) return ['#cc0000','#1a1a1a']
  if (n.includes('cucuta')||n.includes('cúcuta')) return ['#1a1a1a','#f0f0f0']
  if (n.includes('peñarol')) return ['#f5c518','#1a1a1a']
  if (n.includes('boca')) return ['#003fa0','#f5c518']
  if (n.includes('river')) return ['#cc0000','#f0f0f0']
  if (n.includes('flamengo')) return ['#cc0000','#1a1a1a']
  return ['#4f7eff','#ffffff']
}
function extraerEquipos(nombre) {
  const p = (nombre||'').split(/\s+vs\.?\s*/i)
  return p.length>=2 ? [p[0].trim(), p.slice(1).join(' vs ').trim()] : [nombre||'', null]
}
function EscudoSVG({nombre, size=44}) {
  const [c1,c2] = coloresEquipo(nombre)
  const ini = (nombre||'').split(/\s+/).filter(w=>w.length>2).slice(0,2).map(w=>w[0].toUpperCase()).join('')||'?'
  return (
    <svg width={size} height={size} viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
      <path d="M22 2 L40 9 L40 28 Q40 44 22 50 Q4 44 4 28 L4 9 Z" fill={c1}/>
      <path d="M22 2 L40 9 L40 28 Q40 44 22 50 Q4 44 4 28 L4 9 Z" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
      <text x="22" y="32" textAnchor="middle" dominantBaseline="middle" fill={c2} fontSize="13" fontWeight="800" fontFamily="system-ui,sans-serif" letterSpacing="-0.3">{ini}</text>
    </svg>
  )
}
function MapaElCampin({avail, selected, onSelect}) {
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

function MapaAtanasio({avail, selected, onSelect}) {
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

function MapaEstadioTecho({avail, selected, onSelect}) {
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
      {SECS.map((sec,i)=>{
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

function SillaExtraRow({ silla, indice, tribunas, onChangeTribuna, onChangeFila, onChangeSilla, onRemove, inputStyle, labelStyle }) {
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

function App() {
  const [esMobile, setEsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640)
  const [boletas, setBoletas] = useState([])
  const [boletasPendientes, setBoletasPendientes] = useState([])
  const [boletasAdmin, setBoletasAdmin] = useState([])
  const [ordenesLiberadas, setOrdenesLiberadas] = useState([])
  const [ventasPorVendedor, setVentasPorVendedor] = useState({})
  const [cargando, setCargando] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [mostrarAdmin, setMostrarAdmin] = useState(false)
  const [mostrarMenu, setMostrarMenu] = useState(false)
  const [eventos, setEventos] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [comprando, setComprando] = useState(null)
  const [carrito, setCarrito] = useState(() => {
    try {
      const saved = localStorage.getItem('bco_carrito')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [silasExtra, setSilasExtra] = useState([])
  const [toasts, setToasts] = useState([])
  const [timerReserva, setTimerReserva] = useState(null) // segundos restantes
  const [usuario, setUsuario] = useState(null)
  const [vistaAuth, setVistaAuth] = useState(null)
  const [formAuth, setFormAuth] = useState({ nombre: '', correo: '', password: '', nuevaPassword: '', datosPago: '', documento: '' })
  const [datosPagoVendedor, setDatosPagoVendedor] = useState('')
  const [editandoPago, setEditandoPago] = useState(false)
  const [esRecuperacion, setEsRecuperacion] = useState(false)
  const [mensajeAuth, setMensajeAuth] = useState('')
  const [confirmarEliminarEvento, setConfirmarEliminarEvento] = useState(null)
  const [confirmarEliminarBoleta, setConfirmarEliminarBoleta] = useState(null)
  const [boletaEditando, setBoletaEditando] = useState(null)
  const [busquedaBoleta, setBusquedaBoleta] = useState('')
  const [formEditarBoleta, setFormEditarBoleta] = useState({ tribuna: '', fila: '', silla: '', precio: '' })
  const [eventoEditando, setEventoEditando] = useState(null)
  const [formEditar, setFormEditar] = useState({})
  const [tribunaInputTemp, setTribunaInputTemp] = useState('')
  const [estadios, setEstadios] = useState([])
  const [formEstadio, setFormEstadio] = useState({ nombre: '', ciudad: '', tribunas: [] })
  const [estadioEditando, setEstadioEditando] = useState(null)
  const [tribunaEstadioTemp, setTribunaEstadioTemp] = useState('')
  const [confirmarEliminarEstadio, setConfirmarEliminarEstadio] = useState(null)
  const [tribunaExpandida, setTribunaExpandida] = useState(null)
  const [formEvento, setFormEvento] = useState({ nombre: '', deporte: 'Futbol', ciudad: '', estadio: '', estadioId: '', fechaHora: '', moneda: 'COP', tribunas: [] })
  const [mensajeEvento, setMensajeEvento] = useState('')
  const [form, setForm] = useState({ eventoId: '', tribuna: '', fila: '', silla: '', cantidad: 1, precio: '', plataforma: '' })
  const [tribunasEvento, setTribunasEvento] = useState([])
  const [pagoStatus, setPagoStatus] = useState(null)
  const [pagoInfo, setPagoInfo] = useState(null)
  const [docModal, setCedModal] = useState(null)   // null | { tipo: 'boleta'|'carrito', boleta?: object }
  const [documentoInput, setDocumentoInput] = useState('')
  const [qrModal, setQrModal] = useState(null)      // null | { qr, referencia, ordenes, carritoCount }
  const [boldCargando, setBoldCargando] = useState(false)
  const [paginaActual, setPaginaActual] = useState('inicio')
  const [pestanaMis, setPestanaMis] = useState('pedidos')
  const [pestanaAdmin, setPestanaAdmin] = useState('pendientes')
  const [misCompras, setMisCompras] = useState([])
  const [misVentas, setMisVentas] = useState([])
  const [cargandoMis, setCargandoMis] = useState(false)
  const [filtros, setFiltros] = useState({ ciudad: '', deporte: '', precioMax: '' })
  const [busquedaPublica, setBusquedaPublica] = useState('')
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null)
  const [seccionMapa, setSeccionMapa] = useState(null)
  const [faqAbierto, setFaqAbierto] = useState(null)
  const [datosEntrega, setDatosEntrega] = useState({})


  const esAdmin = usuario && usuario.es_admin === true

  useEffect(() => {
    const onResize = () => setEsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    try { localStorage.setItem('bco_carrito', JSON.stringify(carrito)) } catch {}
  }, [carrito])

  useEffect(() => {
    cargarBoletas()
    cargarEventos()
    cargarEstadios()
    obtenerUsuarioActual().then(u => setUsuario(u))

    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('id') || urlParams.get('status') || urlParams.get('pago') === 'exitoso') {
      procesarResultadoPago(urlParams)
    }

    // Escuchar cambios de autenticación: confirmación de email y recuperación de contraseña
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: perfil } = await supabase.from('usuarios').select('es_admin').eq('id', session.user.id).single()
        setUsuario({ ...session.user, es_admin: perfil?.es_admin || false })
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
    if (esAdmin) { cargarBoletasPendientes(); cargarOrdenesLiberadas(); cargarBoletasAdmin(); cargarEstadios() }
  }, [esAdmin])

  useEffect(() => {
    if (usuario && !esAdmin) {
      supabase.from('usuarios').select('datos_pago').eq('id', usuario.id).single()
        .then(({ data }) => { if (data) setDatosPagoVendedor(data.datos_pago || '') })
    }
  }, [usuario])

  async function guardarDatosPago() {
    if (!usuario) return
    const { error } = await supabase.from('usuarios').update({ datos_pago: datosPagoVendedor.trim() }).eq('id', usuario.id)
    if (!error) { setEditandoPago(false); toast('✅ Dato de pago guardado', 'success') }
  }

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
        // Procesar órdenes extra del carrito
        try {
          const extraStr = sessionStorage.getItem('carrito_ordenes_extra')
          if (extraStr) {
            const extras = JSON.parse(extraStr)
            await Promise.all(extras.map(async o => {
              await supabase.from('ordenes').update({ estado_pago: 'pagada' }).eq('id', o.id)
              await supabase.from('boletas').update({ estado: 'vendida' }).eq('id', o.boleta_id)
            }))
            sessionStorage.removeItem('carrito_ordenes_extra')
            // Notificar al vendedor por cada extra
            let datosEntregaSS = {}
            try { datosEntregaSS = JSON.parse(sessionStorage.getItem('datos_entrega') || '{}'); sessionStorage.removeItem('datos_entrega') } catch(e) {}
            extras.forEach(o => {
              if (o.codigo_orden) fetch('/api/notificar-vendedor', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ referencia: o.codigo_orden, datosEntrega: datosEntregaSS })
              })
            })
          }
        } catch(e) { console.error('Error procesando extras carrito:', e) }
        // Notificar al vendedor por email (boleta principal)
        let datosEntregaMain = {}
        try { datosEntregaMain = JSON.parse(sessionStorage.getItem('datos_entrega') || '{}'); sessionStorage.removeItem('datos_entrega') } catch(e) {}
        fetch('/api/notificar-vendedor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referencia, datosEntrega: datosEntregaMain })
        })
      }
      let carritoCount = 1
      try { carritoCount = parseInt(sessionStorage.getItem('carrito_count') || '1'); sessionStorage.removeItem('carrito_count') } catch(e) {}
      setPagoInfo({ referencia, transaccionId, carritoCount })
      setCarrito([])
      try { localStorage.removeItem('bco_carrito') } catch {}
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
    if (error) { console.error('Error confirmando recibo:', error.message); toast('Hubo un error. Intenta de nuevo.'); return }
    cargarMisBoletas()
  }

  async function entregarBoleta(ordenId, file) {
    setSubiendoArchivo(ordenId)
    try {
      const ext = file.name.split('.').pop().toLowerCase()
      const path = ordenId + '/boleta.' + ext
      const { error: upErr } = await supabase.storage.from('boletas-entregadas').upload(path, file, { upsert: true })
      if (upErr) { toast('Error al subir el archivo: ' + upErr.message); return }
      const { data: { publicUrl } } = supabase.storage.from('boletas-entregadas').getPublicUrl(path)
      const { error: dbErr } = await supabase.from('ordenes').update({ archivo_url: publicUrl }).eq('id', ordenId)
      if (dbErr) { toast('Error al guardar la URL: ' + dbErr.message); return }
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
    // Sync cart: refresh publicada_por_admin and remove unavailable boletas
    setCarrito(prev => prev.length === 0 ? prev : prev.map(item => data.find(b => b.id === item.id) || item).filter(item => data.some(b => b.id === item.id)))
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
          usuarios(nombre, correo, es_admin, datos_pago))`)
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
    if (!error) {
      cargarOrdenesLiberadas()
      fetch('/api/notificar-pago-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordenId })
      }).catch(() => {})
    }
  }

  async function cargarBoletasAdmin() {
    const { data } = await supabase
      .from('boletas')
      .select('id, tribuna, fila, silla, precio, estado, plataforma, publicada_por_admin, eventos(nombre, ciudad, estadio, fecha, hora, deporte, moneda), usuarios(nombre, es_admin)')
      .in('estado', ['publicada', 'reservada', 'oculta'])
      .order('creado_en', { ascending: false })
    setBoletasAdmin(data || [])
  }

  async function ocultarBoleta(id) {
    await supabase.from('boletas').update({ estado: 'oculta' }).eq('id', id)
    cargarBoletas(); cargarBoletasAdmin()
  }

  async function mostrarBoleta(id) {
    await supabase.from('boletas').update({ estado: 'publicada' }).eq('id', id)
    cargarBoletas(); cargarBoletasAdmin()
  }

  async function eliminarBoleta(id) {
    const { error } = await supabase.from('boletas').delete().eq('id', id)
    if (error) { toast('No se puede eliminar — tiene órdenes asociadas.'); return }
    cargarBoletas(); cargarBoletasAdmin()
  }

  async function guardarEdicionBoleta(e) {
    e.preventDefault()
    const { tribuna, fila, silla, precio } = formEditarBoleta
    const { error } = await supabase.from('boletas').update({
      tribuna: tribuna.trim(),
      fila: fila.trim(),
      silla: silla.trim(),
      precio: Number(precio)
    }).eq('id', boletaEditando)
    if (error) { toast('Error al guardar cambios.'); return }
    toast('Boleta actualizada.')
    setBoletaEditando(null)
    cargarBoletas(); cargarBoletasAdmin()
  }

  async function cargarBoletasPendientes() {
    const { data } = await supabase
      .from('boletas')
      .select('id, tribuna, fila, silla, precio, estado, plataforma, publicada_por_admin, eventos(nombre, ciudad, estadio, fecha, hora, deporte, moneda)')
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

  async function cargarEstadios() {
    const { data } = await supabase.from('estadios').select('*').order('ciudad').order('nombre')
    setEstadios(data || [])
  }

  async function crearEstadio(e) {
    e.preventDefault()
    const { nombre, ciudad, tribunas } = formEstadio
    const { error } = await supabase.from('estadios').insert({ nombre: nombre.trim(), ciudad: ciudad.trim(), tribunas })
    if (error) { toast('Error al crear estadio.'); return }
    toast('Estadio creado.')
    setFormEstadio({ nombre: '', ciudad: '', tribunas: [] })
    setTribunaEstadioTemp('')
    cargarEstadios()
  }

  async function guardarEstadio(e) {
    e.preventDefault()
    const { nombre, ciudad, tribunas } = formEstadio
    const { error } = await supabase.from('estadios').update({ nombre: nombre.trim(), ciudad: ciudad.trim(), tribunas }).eq('id', estadioEditando)
    if (error) { toast('Error al guardar estadio.'); return }
    toast('Estadio actualizado.')
    setEstadioEditando(null)
    cargarEstadios()
  }

  async function eliminarEstadio(id) {
    const { error } = await supabase.from('estadios').delete().eq('id', id)
    if (error) { toast('Error al eliminar estadio.'); return }
    setConfirmarEliminarEstadio(null)
    cargarEstadios()
  }

  async function cargarEventos() {
    const { data } = await supabase.from('eventos').select('id, nombre, deporte, ciudad, estadio, fecha, hora, moneda, tribunas')
    setEventos(data || [])
  }

  function manejarCambio(e) {
    const updated = { ...form, [e.target.name]: e.target.value }
    if (e.target.name === 'eventoId') {
      const ev = eventos.find(ev => ev.id === e.target.value)
      const sugerida = ev ? sugerirPlataforma(ev.nombre) : ''
      if (sugerida) updated.plataforma = sugerida
      updated.tribuna = ''
      const estNombre = ev ? (ev.estadio || '') : ''
      const estObj = estadios.find(e => e.nombre.toLowerCase() === estNombre.toLowerCase())
      const tribs = (estObj && estObj.tribunas && estObj.tribunas.length > 0) ? estObj.tribunas : (ev ? (ev.tribunas || []) : [])
      setTribunasEvento(tribs)
    }
    setForm(updated)
  }
  function manejarCambioAuth(e) { setFormAuth({ ...formAuth, [e.target.name]: e.target.value }) }
  function manejarCambioEvento(e) {
    const updated = { ...formEvento, [e.target.name]: e.target.value }
    if (e.target.name === 'estadioId') {
      const est = estadios.find(es => es.id === e.target.value)
      updated.estadio = est ? est.nombre : ''
      updated.ciudad = est ? est.ciudad : updated.ciudad
      updated.tribunas = est ? [...est.tribunas] : []
      updated.estadioId = e.target.value
    }
    setFormEvento(updated)
  }

  async function manejarCrearEvento(e) {
    e.preventDefault()
    setMensajeEvento('Creando evento...')
    const { error } = await supabase.from('eventos').insert({
      nombre: formEvento.nombre, deporte: formEvento.deporte, ciudad: formEvento.ciudad,
      estadio: formEvento.estadio,
      fecha: formEvento.fechaHora ? formEvento.fechaHora.split('T')[0] : '',
      hora: formEvento.fechaHora ? formEvento.fechaHora.split('T')[1] : '',
      moneda: formEvento.moneda,
      tribunas: formEvento.tribunas
    })
    if (error) { setMensajeEvento('Error: ' + error.message) }
    else { setMensajeEvento('Evento creado correctamente.'); setFormEvento({ nombre: '', deporte: 'Futbol', ciudad: '', estadio: '', estadioId: '', fechaHora: '', moneda: 'COP', tribunas: [] }); setTribunaInputTemp(''); cargarEventos() }
  }

  async function eliminarEvento(eventoId) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/eliminar-evento', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ eventoId, userEmail: usuario?.email })
    })
    const result = await res.json()
    if (!res.ok) { setMensajeEvento('Error: ' + (result.error || res.status)) }
    else { setConfirmarEliminarEvento(null); setMensajeEvento('Evento eliminado.'); cargarEventos() }
  }

  async function editarEvento(e) {
    e.preventDefault()
    const { data: { session } } = await supabase.auth.getSession()
    const { nombre, deporte, ciudad, estadio, fechaHora, moneda, tribunas } = formEditar
    const campos = {
      nombre, deporte, ciudad, estadio, moneda,
      fecha: fechaHora.split('T')[0],
      hora: fechaHora.split('T')[1],
      tribunas: tribunas || []
    }
    const res = await fetch('/api/editar-evento', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ eventoId: eventoEditando, campos })
    })
    const result = await res.json()
    if (!res.ok) { setMensajeEvento('Error al editar: ' + (result.error || res.status)) }
    else { setEventoEditando(null); setFormEditar({}); setMensajeEvento('Evento actualizado.'); cargarEventos() }
  }

  async function manejarPublicar(e) {
    e.preventDefault()
    if (!usuario) { setMensaje('Debes iniciar sesion para publicar una boleta.'); return }
    setMensaje('Publicando...')
    const todas = [{ tribuna: form.tribuna, fila: form.fila, silla: form.silla }, ...silasExtra]
    const resultados = await Promise.all(todas.map(s =>
      publicarBoleta({ eventoId: form.eventoId, vendedorId: usuario.id, tribuna: s.tribuna, fila: s.fila, silla: s.silla, cantidad: 1, precio: Number(form.precio), plataforma: form.plataforma, publicadaPorAdmin: esAdmin })
    ))
    const exito = resultados.every(r => r !== null)
    if (exito) {
      const n = resultados.length
      setMensaje(n === 1 ? 'Boleta enviada. El equipo de Boletería CO la verificará pronto.' : n + ' boletas enviadas. El equipo de Boletería CO las verificará pronto.')
      setTribunasEvento([])
      setForm({ eventoId: '', tribuna: '', fila: '', silla: '', cantidad: 1, precio: '', plataforma: '' })
      setSilasExtra([])
      cargarBoletas()
    } else { setMensaje('Hubo un error al publicar. Intenta de nuevo.') }
  }

  async function manejarRegistro(e) {
    e.preventDefault()
    if (formAuth.password !== formAuth.nuevaPassword) {
  setMensajeAuth('❌ Las contraseñas no coinciden')
  return
}
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
    if (resultado.exito) { setUsuario(resultado.usuario); setVistaAuth(null); setPaginaActual('inicio'); setMensajeAuth('') }
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

  function calcularTotal(precio, moneda, esAdmin = false) {
    if (esAdmin) return formatearPrecio(Number(precio), moneda)
    const redondeado = Math.round(Number(precio) * 1.15 / 1000) * 1000
    return formatearPrecio(redondeado, moneda)
  }

  function startTimer(segundos) {
    setTimerReserva(segundos)
    const iv = setInterval(() => {
      setTimerReserva(s => {
        if (s <= 1) { clearInterval(iv); return null }
        return s - 1
      })
    }, 1000)
  }

  function toast(msg, tipo = 'error') {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, tipo }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }


  // ── Polling Bold: cuando hay QR abierto, verificar estado cada 3 s ──
  useEffect(() => {
    if (!qrModal) return
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`/api/estado-bold?referencia=${encodeURIComponent(qrModal.referencia)}`)
        const data = await res.json()
        if (data.status === 'APPROVED') {
          clearInterval(iv)
          // Notificar al vendedor (same as Wompi success)
          fetch('/api/notificar-vendedor', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referencia: qrModal.referencia })
          })
          // Procesar órdenes extra del carrito si hay
          try {
            const extraStr = sessionStorage.getItem('carrito_ordenes_extra')
            if (extraStr) {
              const extras = JSON.parse(extraStr)
              extras.forEach(o => {
                if (o.codigo_orden) fetch('/api/notificar-vendedor', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ referencia: o.codigo_orden })
                })
              })
              sessionStorage.removeItem('carrito_ordenes_extra')
            }
          } catch {}
          setCarrito([])
          try { localStorage.removeItem('bco_carrito') } catch {}
          setPagoInfo({ referencia: qrModal.referencia, carritoCount: qrModal.carritoCount || 1 })
          setQrModal(null)
          cargarBoletas()
          setPagoStatus('exitoso')
        }
      } catch {}
    }, 3000)
    return () => clearInterval(iv)
  }, [qrModal?.referencia])

  // ── Iniciar pago Bold Bre-B (carrito) ──
  async function iniciarBoldCarrito(documento) {
    if (!usuario) { toast('Debes iniciar sesión para comprar.', 'info'); return }
    setBoldCargando(true)
    setCedModal(null)

    // Reservar todas las boletas
    const reservadaHasta = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const reservaciones = await Promise.all(carrito.map(b =>
      supabase.from('boletas').update({ estado: 'reservada', reservada_hasta: reservadaHasta })
        .eq('id', b.id).eq('estado', 'publicada').select()
    ))
    const fallidas = reservaciones.filter(r => !r.data || r.data.length === 0)
    if (fallidas.length > 0) {
      await Promise.all(reservaciones.filter(r => r.data?.length > 0).map((_, i) =>
        supabase.from('boletas').update({ estado: 'publicada', reservada_hasta: null }).eq('id', carrito[i].id)
      ))
      toast('Algunas boletas ya no están disponibles. Revisa tu carrito.')
      setBoldCargando(false)
      return
    }

    // Crear órdenes
    const ordenes = await Promise.all(carrito.map(b => {
      const subtotal = Number(b.precio)
      const esBoletaAdmin = b.publicada_por_admin === true
      const comision = esBoletaAdmin ? 0 : Math.round(subtotal * 1.15 / 1000) * 1000 - subtotal
      const total = subtotal + comision
      return crearOrden({ boletaId: b.id, compradorId: usuario.id, subtotal, comision, total, metodoPago: 'bold_breb' })
    }))

    if (ordenes.some(o => o === null)) {
      await Promise.all(carrito.map(b =>
        supabase.from('boletas').update({ estado: 'publicada', reservada_hasta: null }).eq('id', b.id)
      ))
      toast('Error al crear órdenes. Intenta de nuevo.')
      setBoldCargando(false)
      return
    }

    const moneda = carrito[0].eventos?.moneda || 'COP'
    const totalCombinado = ordenes.reduce((sum, o) => sum + o.total, 0)
    const referencia = ordenes[0].codigo_orden

    if (ordenes.length > 1) {
      try { sessionStorage.setItem('carrito_ordenes_extra', JSON.stringify(ordenes.slice(1).map(o => ({ id: o.id, boleta_id: o.boleta_id, codigo_orden: o.codigo_orden })))) } catch {}
    }

    // Llamar API Bold
    const res = await fetch('/api/pago-bold', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referencia, total: totalCombinado, moneda,
        comprador: { nombre: usuario.nombre || usuario.email, correo: usuario.email, documento }
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast('Error generando QR Bold: ' + (err.detalle || err.error || 'Intenta de nuevo'))
      // Liberar boletas
      await Promise.all(carrito.map(b =>
        supabase.from('boletas').update({ estado: 'publicada', reservada_hasta: null }).eq('id', b.id)
      ))
      setBoldCargando(false)
      return
    }

    const { qr } = await res.json()
    if (!qr) {
      toast('No se pudo generar el QR. Intenta de nuevo.')
      setBoldCargando(false)
      return
    }

    setBoldCargando(false)
    try { sessionStorage.setItem('carrito_count', String(carrito.length)) } catch {}
    setQrModal({ qr, referencia, ordenes, carritoCount: carrito.length })
  }

  // ── Iniciar pago Bold Bre-B (boleta individual) ──
  async function iniciarBold(boleta, documento) {
    if (!usuario) { toast('Debes iniciar sesión para comprar.', 'info'); return }
    setBoldCargando(true)
    setCedModal(null)

    const reservadaHasta = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const { data: reservada } = await supabase
      .from('boletas').update({ estado: 'reservada', reservada_hasta: reservadaHasta })
      .eq('id', boleta.id).eq('estado', 'publicada').select()

    if (!reservada || reservada.length === 0) {
      toast('Esta boleta ya fue reservada. Intenta con otra.')
      setBoldCargando(false)
      cargarBoletas()
      return
    }

    const subtotal = Number(boleta.precio)
    const esBoletaAdmin = boleta.publicada_por_admin === true
    const comision = esBoletaAdmin ? 0 : Math.round(subtotal * 1.15 / 1000) * 1000 - subtotal
    const total = subtotal + comision
    const moneda = boleta.eventos?.moneda || 'COP'

    const orden = await crearOrden({ boletaId: boleta.id, compradorId: usuario.id, subtotal, comision, total, metodoPago: 'bold_breb' })
    if (!orden) {
      await supabase.from('boletas').update({ estado: 'publicada', reservada_hasta: null }).eq('id', boleta.id)
      toast('Error al crear la orden. Intenta de nuevo.')
      setBoldCargando(false)
      return
    }

    const res = await fetch('/api/pago-bold', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referencia: orden.codigo_orden, total, moneda,
        comprador: { nombre: usuario.nombre || usuario.email, correo: usuario.email, documento }
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast('Error generando QR Bold: ' + (err.detalle || err.error || 'Intenta de nuevo'))
      await supabase.from('boletas').update({ estado: 'publicada', reservada_hasta: null }).eq('id', boleta.id)
      setBoldCargando(false)
      return
    }

    const { qr } = await res.json()
    if (!qr) {
      toast('No se pudo generar el QR. Intenta de nuevo.')
      setBoldCargando(false)
      return
    }

    setBoldCargando(false)
    try { sessionStorage.setItem('carrito_count', '1') } catch {}
    setQrModal({ qr, referencia: orden.codigo_orden, ordenes: [orden], carritoCount: 1 })
  }

  async function manejarCompraCarrito() {
    if (carrito.length === 0) return
    if (!usuario) { toast('Debes iniciar sesión para comprar.', 'info'); return }
    const platsConRequisito = [...new Set(carrito.filter(b => b.plataforma && PLATAFORMAS[b.plataforma]).map(b => b.plataforma))]
    for (const plat of platsConRequisito) {
      const tipo = PLATAFORMAS[plat].tipoEntrega
      if (!datosEntrega[plat]?.trim()) {
        toast('Por favor ingresa tu ' + (tipo === 'email' ? 'correo electrónico' : 'número de documento') + ' para recibir tu boleta en ' + plat + '.', 'info')
        return
      }
    }
    setComprando('carrito')

    const reservadaHasta = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const reservaciones = await Promise.all(carrito.map(b =>
      supabase.from('boletas')
        .update({ estado: 'reservada', reservada_hasta: reservadaHasta })
        .eq('id', b.id).eq('estado', 'publicada').select()
    ))
    const fallidas = reservaciones.filter(r => !r.data || r.data.length === 0)
    if (fallidas.length > 0) {
      // Liberar las que sí se reservaron
      await Promise.all(reservaciones.filter(r => r.data?.length > 0).map((_, i) =>
        supabase.from('boletas').update({ estado: 'publicada', reservada_hasta: null }).eq('id', carrito[i].id)
      ))
      toast('Algunas boletas ya no están disponibles. Revisa tu carrito.')
      setCarrito(prev => prev.filter((b, i) => reservaciones[i]?.data?.length > 0))
      setComprando(null)
      return
    }

    const ordenes = await Promise.all(carrito.map(b => {
      const subtotal = Number(b.precio)
      const esBoletaAdmin = b.publicada_por_admin === true
      const comision = esBoletaAdmin ? 0 : Math.round(subtotal * 1.15 / 1000) * 1000 - subtotal
      const total = subtotal + comision
      return crearOrden({ boletaId: b.id, compradorId: usuario.id, subtotal, comision, total, metodoPago: 'wompi' })
    }))

    if (ordenes.some(o => o === null)) {
      await Promise.all(carrito.map(b =>
        supabase.from('boletas').update({ estado: 'publicada', reservada_hasta: null }).eq('id', b.id)
      ))
      toast('Error al crear órdenes. Intenta de nuevo.')
      setComprando(null)
      return
    }

    const moneda = carrito[0].eventos?.moneda || 'COP'
    const totalCombinado = ordenes.reduce((sum, o) => sum + o.total, 0)
    const referencia = ordenes[0].codigo_orden

    if (ordenes.length > 1) {
      try { sessionStorage.setItem('carrito_ordenes_extra', JSON.stringify(ordenes.slice(1).map(o => ({ id: o.id, boleta_id: o.boleta_id, codigo_orden: o.codigo_orden })))) } catch(e) {}
    }

    const totalCentavos = totalCombinado * 100
    const res = await fetch('/api/integrity', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: referencia, amount: totalCentavos, currency: moneda })
    })
    if (!res.ok) { toast('Error al generar firma de pago. Intenta de nuevo.'); setComprando(null); return }
    const { signature } = await res.json()

    const params = new URLSearchParams({
      'public-key': import.meta.env.VITE_WOMPI_PUBLIC_KEY,
      currency: moneda, 'amount-in-cents': totalCentavos,
      reference: referencia, 'signature:integrity': signature,
      'redirect-url': window.location.origin
    })
    startTimer(15 * 60)
    try { sessionStorage.setItem('carrito_count', String(carrito.length)) } catch(e) {}
    try { sessionStorage.setItem('datos_entrega', JSON.stringify(datosEntrega)) } catch(e) {}
    window.location.href = `https://checkout.wompi.co/p/?${params.toString()}`
  }

  async function manejarCompra(boleta) {
    if (!usuario) { toast('Debes iniciar sesión para comprar.', 'info'); return }
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
      toast('Esta boleta ya fue reservada. Intenta con otra.')
      setComprando(null)
      cargarBoletas()
      return
    }

    const subtotal = Number(boleta.precio)
    const esBoletaAdmin = boleta.publicada_por_admin === true
    const comision = esBoletaAdmin ? 0 : Math.round(subtotal * 1.15 / 1000) * 1000 - subtotal
    const total = subtotal + comision
    const moneda = boleta.eventos ? boleta.eventos.moneda : 'COP'

    const orden = await crearOrden({ boletaId: boleta.id, compradorId: usuario.id, subtotal, comision, total, metodoPago: 'wompi' })
    if (!orden) {
      await supabase.from('boletas').update({ estado: 'publicada', reservada_hasta: null }).eq('id', boleta.id)
      toast('Hubo un error al crear la orden. Intenta de nuevo.')
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

    if (!res.ok) { toast('Error al generar la firma de pago. Intenta de nuevo.'); setComprando(null); return }

    const { signature } = await res.json()

    const params = new URLSearchParams({
      'public-key': import.meta.env.VITE_WOMPI_PUBLIC_KEY,
      'currency': moneda,
      'amount-in-cents': totalCentavos,
      'reference': referencia,
      'signature:integrity': signature,
      'redirect-url': window.location.origin
    })

    startTimer(15 * 60)
    try { sessionStorage.setItem('carrito_count', '1') } catch(e) {}
    window.location.href = `https://checkout.wompi.co/p/?${params.toString()}`
  }

  const c = {
    fondo: '#080b12', nav: '#0d1117', tarjeta: '#0f1623', borde: '#1e2a3a',
    texto: '#eef0f6', textoSec: '#8892a4', textoTercio: '#4e5a6e',
    acento: '#4f7eff', verde: '#22c55e', ambar: '#f59e0b',
  }
  const s = {
    pagina: { minHeight: '100vh', paddingTop: esMobile ? '52px' : '60px', background: '#080b12', fontFamily: "'Inter', system-ui, -apple-system, sans-serif", backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(79,126,255,0.07), transparent)' },
    nav: { background: 'rgba(13,17,23,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e2a3a', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 400, padding: esMobile ? '0 12px' : '0 20px' },
    navSec: { background: 'rgba(13,17,23,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e2a3a', position: 'sticky', top: 0, zIndex: 10, padding: esMobile ? '0 12px' : '0 20px' },
    navInner: { maxWidth: '720px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: esMobile ? '52px' : '60px' },
    logo: { color: '#eef0f6', fontSize: esMobile ? '15px' : '17px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0, whiteSpace: 'nowrap' },
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
    const n = pagoInfo?.carritoCount || 1
    const ref = pagoInfo?.referencia || ''
    return (
      <div style={{minHeight:'100vh',background:'#080b12',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Inter',system-ui,sans-serif",padding:'20px'}}>
        <div style={{maxWidth:'480px',width:'100%'}}>
          {/* Header */}
          <div style={{background:'#0f2d1e',border:'1px solid #166534',borderRadius:'20px',padding:'36px 32px',textAlign:'center',marginBottom:'16px'}}>
            <div style={{fontSize:'64px',marginBottom:'16px',lineHeight:1}}>🎟️</div>
            <h2 style={{color:'#4ade80',fontSize:'26px',fontWeight:'900',margin:'0 0 8px'}}>¡Compra exitosa!</h2>
            <p style={{color:'#86efac',fontSize:'15px',margin:'0 0 20px'}}>
              {n === 1 ? 'Adquiriste tu boleta correctamente.' : `Adquiriste ${n} boletas correctamente.`}
            </p>
            {ref && (
              <div style={{background:'rgba(0,0,0,0.3)',borderRadius:'10px',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px'}}>
                <div style={{textAlign:'left'}}>
                  <p style={{color:'#4e5a6e',fontSize:'11px',margin:'0 0 2px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.5px'}}>Referencia</p>
                  <p style={{color:'#6ee7b7',fontSize:'13px',margin:0,fontFamily:'monospace',fontWeight:'700'}}>{ref}</p>
                </div>
                <button
                  onClick={() => { navigator.clipboard?.writeText(ref); toast('Referencia copiada', 'info') }}
                  style={{background:'#166534',border:'none',color:'#4ade80',borderRadius:'8px',padding:'6px 12px',fontSize:'12px',fontWeight:'700',cursor:'pointer',flexShrink:0}}
                >
                  Copiar
                </button>
              </div>
            )}
          </div>

          {/* Pasos */}
          <div style={{background:'#0f1623',border:'1px solid #1e2a3a',borderRadius:'16px',padding:'24px',marginBottom:'16px'}}>
            <h3 style={{color:'#eef0f6',fontSize:'14px',fontWeight:'800',margin:'0 0 16px',textAlign:'center',textTransform:'uppercase',letterSpacing:'0.5px'}}>¿Qué sigue?</h3>
            {[
              {num:'1', titulo:'Revisa tu correo', desc:'Te llegará el comprobante de pago de Wompi.'},
              {num:'2', titulo:'El vendedor te contacta', desc:'En las próximas horas recibirás la boleta digital por la app o correo acordado.'},
              {num:'3', titulo:'Confirma que llegó', desc:'En "Mis boletas" confirma el recibo para liberar el pago al vendedor.'},
            ].map(p => (
              <div key={p.num} style={{display:'flex',flexDirection:'column',gap:'6px',marginBottom:'20px',alignItems:'center',textAlign:'center'}}>
                <div style={{width:'24px',height:'24px',borderRadius:'50%',background:'#1e3a6a',color:'#4f7eff',fontSize:'12px',fontWeight:'900',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:'1px'}}>{p.num}</div>
                <div>
                  <p style={{color:'#eef0f6',fontSize:'14px',fontWeight:'700',margin:'0 0 2px',textAlign:'center'}}>{p.titulo}</p>
                  <p style={{color:'#8892a4',fontSize:'13px',margin:0,lineHeight:'1.5',textAlign:'center'}}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Botones */}
          <div style={{display:'flex',gap:'10px',flexDirection:'column'}}>
            <button
              onClick={() => { setPagoStatus(null); setPagoInfo(null); setPaginaActual('mis-boletas') }}
              style={{background:'#4f7eff',color:'#fff',border:'none',borderRadius:'12px',padding:'14px',fontSize:'15px',fontWeight:'700',cursor:'pointer'}}
            >
              Ver mis boletas
            </button>
            <a
              href={`mailto:soporte@boleteriaco.com?subject=Compra%20${ref}&body=Hola%2C%20tengo%20una%20pregunta%20sobre%20mi%20compra.%20Referencia%3A%20${ref}`}
              style={{display:'block',textAlign:'center',background:'#0f1623',color:'#8892a4',border:'1px solid #1e2a3a',borderRadius:'12px',padding:'13px',fontSize:'14px',fontWeight:'700',textDecoration:'none'}}
            >
              ✉️ Contactar soporte
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (pagoStatus === 'fallido') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a1f14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter',system-ui,sans-serif" }}>
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
      <div style={{ minHeight: '100vh', background: '#0a1f14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter',system-ui,sans-serif" }}>
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


  const faqFooterSeccion = (
    <div style={{maxWidth:'680px',margin:'0 auto',padding:'40px 20px 48px'}}>
      <h2 style={{color:'#eef0f6',fontSize:'20px',fontWeight:'900',textAlign:'center',margin:'0 0 24px',letterSpacing:'-0.3px',borderTop:'1px solid #1e2a3a',paddingTop:'40px'}}>Preguntas frecuentes</h2>
      {[
        {q:'¿Cómo sé que no me estafan?',a:'Tu dinero queda en custodia con Boletería CO hasta que tú confirmes que recibiste la boleta. Solo después de tu confirmación el vendedor cobra. Si algo sale mal, nosotros respondemos.'},
        {q:'¿Cómo llega la boleta?',a:'Depende de la plataforma: en TuBoletaPass y Quentro te la transferimos por correo electrónico; en W Arena y DIM Plus por número de documento. Antes de pagar te mostramos exactamente los pasos.'},
        {q:'¿Cuánto demora?',a:'En la mayoría de casos menos de 24 horas. Cuando tu pago se confirma, el vendedor recibe una notificación inmediata para transferirte la boleta.'},
        {q:'¿Cuánto cobra Boletería CO?',a:'Al comprador se le suma aproximadamente un 15% sobre el precio publicado (redondeado a los $1.000 más cercanos). Al vendedor se le retiene un 8% del precio de venta. Sin cobros ocultos.'},
      ].map(({q,a},i)=>(
        <div key={i} style={{borderBottom:'1px solid #1e2a3a',overflow:'hidden'}}>
          <button onClick={()=>setFaqAbierto(faqAbierto===i?null:i)} style={{width:'100%',background:'none',border:'none',padding:'16px 0',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',gap:'12px'}}>
            <span style={{color:'#eef0f6',fontSize:'15px',fontWeight:'700',textAlign:'left',lineHeight:'1.4'}}>{q}</span>
            <span style={{color:'#4f7eff',fontSize:'18px',flexShrink:0,transition:'transform 0.2s',transform:faqAbierto===i?'rotate(45deg)':'rotate(0deg)'}}>+</span>
          </button>
          {faqAbierto===i&&<p style={{color:'#8892a4',fontSize:'14px',lineHeight:'1.7',margin:'0 0 16px',paddingRight:'32px'}}>{a}</p>}
        </div>
      ))}
      <footer style={{borderTop:'1px solid #1e2a3a',marginTop:'40px',paddingTop:'28px',paddingBottom:'32px',textAlign:'center'}}>
        <p style={{color:'#4e5a6e',fontSize:'13px',margin:'0 0 8px',fontWeight:'700',letterSpacing:'-0.2px'}}>Boletería <span style={{color:'#4f7eff'}}>CO</span></p>
        <p style={{color:'#4e5a6e',fontSize:'12px',margin:0}}>© 2026 · <a href='/terminos.html' target='_blank' style={{color:'#8892a4',textDecoration:'none'}}>Términos y condiciones</a> · <button onClick={()=>setPaginaActual('privacidad')} style={{background:'none',border:'none',color:'#8892a4',cursor:'pointer',fontSize:'12px',padding:0}}>Política de privacidad</button> · soporte@boleteriaco.com</p>
      </footer>
    </div>
  )

  return (
    <div style={s.pagina}>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {/* TIMER RESERVA */}
      {timerReserva !== null && (
        <div style={{position:'fixed',top:0,left:0,right:0,zIndex:9998,background:'#1a2a00',borderBottom:'2px solid #4ade80',padding:'10px 20px',textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'}}>
          <span style={{fontSize:'18px'}}>⏳</span>
          <span style={{color:'#eef0f6',fontSize:'14px',fontWeight:'700'}}>
            Boleta reservada por{' '}
            <span style={{color:'#4ade80',fontVariantNumeric:'tabular-nums'}}>
              {String(Math.floor(timerReserva/60)).padStart(2,'0')}:{String(timerReserva%60).padStart(2,'0')}
            </span>
            {' '}— completa tu pago en Wompi
          </span>
        </div>
      )}

      {/* TOASTS */}
      <div style={{position:'fixed',bottom:'24px',left:'50%',transform:'translateX(-50%)',zIndex:9999,display:'flex',flexDirection:'column',gap:'10px',alignItems:'center',pointerEvents:'none'}}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.tipo === 'info' ? '#0f1e3a' : '#1a0808',
            border: `1px solid ${t.tipo === 'info' ? '#1e3a6a' : '#5a1e1e'}`,
            color: t.tipo === 'info' ? '#93c5fd' : '#fca5a5',
            borderRadius:'12px', padding:'12px 20px',
            fontSize:'14px', fontWeight:'600',
            boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
            maxWidth:'360px', textAlign:'center',
            animation:'fadeInUp 0.25s ease',
            pointerEvents:'auto'
          }}>
            {t.tipo === 'info' ? 'ℹ️' : '⚠️'} {t.msg}
          </div>
        ))}
      </div>
      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <h1 style={s.logo}><img src='/logo-nav.svg' style={{width:'38px',height:'38px',borderRadius:'8px',flexShrink:0,verticalAlign:'middle',marginRight:'6px'}} alt='BCO' />Boletería <span style={s.logoPunto}>CO</span></h1>
          <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
            {usuario ? (
              <>
                {!esMobile && (
                  <span style={{color:'#6b7a94',fontSize:'11px',fontWeight:'600',maxWidth:'80px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    ¡Hola, {((usuario.user_metadata?.nombre || usuario.email || '').split(' ')[0].split('@')[0])}!
                  </span>
                )}
                <button onClick={manejarCerrarSesion} style={{background:'rgba(255,59,48,0.07)',border:'1px solid rgba(255,59,48,0.18)',borderRadius:'7px',cursor:'pointer',color:'#f87171',fontSize:'11px',fontWeight:'700',padding:'4px 8px',lineHeight:1}}>
                  Salir
                </button>
              </>
            ) : (
              <button onClick={()=>setPaginaActual('login')} style={{background:'transparent',border:'1px solid #4f7eff',borderRadius:'8px',cursor:'pointer',color:'#4f7eff',fontSize:'12px',fontWeight:'600',padding:'5px 10px',lineHeight:1,whiteSpace:'nowrap'}}>
                {esMobile ? 'Entrar' : 'Iniciar sesión'}
              </button>
            )}
            {esAdmin && (
              <button onClick={()=>{setMostrarAdmin(true);setPaginaActual('inicio')}} style={{position:'relative',background:'rgba(160,82,255,0.1)',border:'1px solid rgba(160,82,255,0.3)',borderRadius:'8px',cursor:'pointer',color:'#c084fc',fontSize:'12px',fontWeight:'700',padding:'5px 10px',lineHeight:1}}>
                ⚙️ Admin
                {boletasPendientes.length > 0 && <span style={{position:'absolute',top:'-6px',right:'-6px',background:'#a855f7',color:'#fff',borderRadius:'50%',width:'17px',height:'17px',fontSize:'10px',fontWeight:'800',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>{boletasPendientes.length}</span>}
              </button>
            )}
            {usuario && (
              <button onClick={() => setPaginaActual('carrito')} style={{position:'relative',background:'transparent',border:'1px solid #1e2a3a',borderRadius:'8px',cursor:'pointer',color:'#8892a4',fontSize:'17px',padding:'5px 10px',lineHeight:1}}>
                🛒
                {carrito.length > 0 && <span style={{position:'absolute',top:'-6px',right:'-6px',background:'#4f7eff',color:'#fff',borderRadius:'50%',width:'17px',height:'17px',fontSize:'10px',fontWeight:'800',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>{carrito.length}</span>}
              </button>
            )}
            <button onClick={()=>setMostrarMenu(true)} style={{background:'transparent',border:'1px solid #1e2a3a',borderRadius:'8px',color:'#8892a4',cursor:'pointer',padding:'5px 11px',lineHeight:1,display:'flex',flexDirection:'column',gap:'4px',alignItems:'center',justifyContent:'center',width:'38px',height:'36px'}}>
              <span style={{display:'block',width:'16px',height:'2px',background:'#8892a4',borderRadius:'2px'}}/>
              <span style={{display:'block',width:'16px',height:'2px',background:'#8892a4',borderRadius:'2px'}}/>
              <span style={{display:'block',width:'16px',height:'2px',background:'#8892a4',borderRadius:'2px'}}/>
            </button>
          </div>
        </div>
      </nav>
      {/* ── MENÚ MÓVIL ── */}
      {mostrarMenu && (
        <>
          {/* Overlay */}
          <div onClick={()=>setMostrarMenu(false)} style={{position:'fixed',inset:0,zIndex:998,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(2px)'}}/>
          {/* Panel */}
          <div style={{position:'fixed',top:0,right:0,bottom:0,width:'78%',maxWidth:'300px',zIndex:999,background:'#0d1117',borderLeft:'1px solid #1e2a3a',display:'flex',flexDirection:'column',overflowY:'auto'}}>
            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 20px',borderBottom:'1px solid #1e2a3a'}}>
              <h2 style={{color:'#eef0f6',fontSize:'16px',fontWeight:'800',margin:0,letterSpacing:'-0.3px',display:'flex',alignItems:'center',gap:'7px'}}><img src='/logo-nav.svg' style={{width:'34px',height:'34px',borderRadius:'7px',flexShrink:0}} alt='BCO' />Boletería <span style={{color:'#4f7eff'}}>CO</span></h2>
              <button onClick={()=>setMostrarMenu(false)} style={{background:'transparent',border:'none',color:'#6b7a94',cursor:'pointer',fontSize:'20px',lineHeight:1,padding:'2px 6px'}}>✕</button>
            </div>
            {/* Usuario */}
            {usuario && (
              <div style={{padding:'14px 20px',borderBottom:'1px solid #1e2a3a',background:'rgba(79,126,255,0.05)'}}>
                <p style={{color:'#6b7a94',fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.8px',margin:'0 0 3px'}}>Sesión activa</p>
                <p style={{color:'#eef0f6',fontSize:'13px',fontWeight:'600',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{usuario.email}</p>
              </div>
            )}
            {/* Opciones */}
            <nav style={{flex:1,padding:'8px 0'}}>
              {/* Inicio */}
              <button onClick={()=>{setPaginaActual('inicio');setSeccionMapa(null);setMostrarMenu(false)}}
                style={{width:'100%',background:'transparent',border:'none',borderBottom:'1px solid rgba(30,42,58,0.5)',color:'#eef0f6',cursor:'pointer',fontSize:'15px',fontWeight:'600',padding:'16px 20px',textAlign:'left',display:'flex',alignItems:'center',gap:'12px'}}>
                <span style={{fontSize:'18px',width:'24px',textAlign:'center'}}>🏠</span> Inicio
              </button>
              {/* Vender */}
              {usuario && (
                <button onClick={()=>{setMostrarFormulario(true);setPaginaActual('inicio');setMostrarMenu(false)}}
                  style={{width:'100%',background:'transparent',border:'none',borderBottom:'1px solid rgba(30,42,58,0.5)',color:'#eef0f6',cursor:'pointer',fontSize:'15px',fontWeight:'600',padding:'16px 20px',textAlign:'left',display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{fontSize:'18px',width:'24px',textAlign:'center'}}>➕</span> Vender boleta
                </button>
              )}
              {/* Mis boletas */}
              {usuario && (
                <button onClick={()=>{irAMisBoletas();setMostrarMenu(false)}}
                  style={{width:'100%',background:'transparent',border:'none',borderBottom:'1px solid rgba(30,42,58,0.5)',color:'#eef0f6',cursor:'pointer',fontSize:'15px',fontWeight:'600',padding:'16px 20px',textAlign:'left',display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{fontSize:'18px',width:'24px',textAlign:'center'}}>🎟</span> Mis boletas
                </button>
              )}
              {/* Carrito */}
              {usuario && (
                <button onClick={()=>{setPaginaActual('carrito');setMostrarMenu(false)}}
                  style={{width:'100%',background:'transparent',border:'none',borderBottom:'1px solid rgba(30,42,58,0.5)',color:'#eef0f6',cursor:'pointer',fontSize:'15px',fontWeight:'600',padding:'16px 20px',textAlign:'left',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'}}>
                  <span style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'18px',width:'24px',textAlign:'center'}}>🛒</span> Carrito</span>
                  {carrito.length > 0 && <span style={{background:'#4f7eff',color:'#fff',borderRadius:'20px',padding:'2px 9px',fontSize:'11px',fontWeight:'800'}}>{carrito.length}</span>}
                </button>
              )}
              {/* Admin */}
              {esAdmin && (
                <button onClick={()=>{setMostrarAdmin(true);setPaginaActual('inicio');setMostrarMenu(false)}}
                  style={{width:'100%',background:'rgba(160,82,255,0.06)',border:'none',borderBottom:'1px solid rgba(30,42,58,0.5)',color:'#c084fc',cursor:'pointer',fontSize:'15px',fontWeight:'600',padding:'16px 20px',textAlign:'left',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'}}>
                  <span style={{display:'flex',alignItems:'center',gap:'12px'}}><span style={{fontSize:'18px',width:'24px',textAlign:'center'}}>⚙️</span> Admin</span>
                  {boletasPendientes.length > 0 && <span style={{background:'rgba(160,82,255,0.25)',color:'#c084fc',borderRadius:'20px',padding:'2px 9px',fontSize:'11px',fontWeight:'800'}}>{boletasPendientes.length}</span>}
                </button>
              )}
            </nav>
            {/* Footer: Salir / Auth */}
            <div style={{padding:'16px 20px',borderTop:'1px solid #1e2a3a'}}>
              {usuario ? (
                <button onClick={()=>{manejarCerrarSesion();setMostrarMenu(false)}}
                  style={{width:'100%',background:'rgba(255,59,48,0.08)',border:'1px solid rgba(255,59,48,0.2)',borderRadius:'10px',color:'#f87171',cursor:'pointer',fontSize:'14px',fontWeight:'700',padding:'12px 0'}}>
                  Salir
                </button>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                  <button onClick={()=>{setPaginaActual('login');setMostrarMenu(false)}} style={{width:'100%',background:'transparent',border:'1px solid #1e2a3a',borderRadius:'10px',color:'#eef0f6',cursor:'pointer',fontSize:'14px',fontWeight:'600',padding:'12px 0'}}>Iniciar sesión</button>
                  <button onClick={()=>{setPaginaActual('registro');setMostrarMenu(false)}} style={{width:'100%',background:'#4f7eff',border:'none',borderRadius:'10px',color:'#fff',cursor:'pointer',fontSize:'14px',fontWeight:'700',padding:'12px 0'}}>Registrarse</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
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
          <div style={{position:'fixed',top:esMobile?'52px':'60px',left:0,right:0,bottom:0,zIndex:300,background:'#080b12',overflowY:'auto'}}>
          <nav style={s.navSec}>
            <div style={s.navInner}>
              <button onClick={()=>setPaginaActual('inicio')} style={{background:'transparent',border:'none',color:'#8892a4',cursor:'pointer',fontSize:'14px',fontWeight:'600',display:'flex',alignItems:'center',gap:'6px',padding:0}}>← Volver</button>
              <p style={{color:'#eef0f6',fontSize:'15px',fontWeight:'800',margin:0,letterSpacing:'-0.3px'}}>🎟 Mis boletas</p>
            </div>
          </nav>
          <div style={{maxWidth:'680px',margin:'0 auto',padding:'28px 20px 48px'}}>
            <div style={{display:'flex',gap:'3px',marginBottom:'20px',background:'rgba(255,255,255,0.03)',borderRadius:'10px',padding:'4px',overflowX:'auto'}}>
              <button onClick={() => setPestanaMis('pedidos')} style={{flex:1,minWidth:'68px',padding:'8px 4px',borderRadius:'7px',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px',background:pestanaMis==='pedidos'?'#4f7eff':'transparent',color:pestanaMis==='pedidos'?'#fff':'#8892a4',whiteSpace:'nowrap'}}>🛍 Pedidos</button>
              <button onClick={() => setPestanaMis('ventas')} style={{flex:1,minWidth:'68px',padding:'8px 4px',borderRadius:'7px',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px',background:pestanaMis==='ventas'?'#4f7eff':'transparent',color:pestanaMis==='ventas'?'#fff':'#8892a4',whiteSpace:'nowrap'}}>📦 Mis ventas</button>
              <button onClick={() => setPestanaMis('en-venta')} style={{flex:1,minWidth:'68px',padding:'8px 4px',borderRadius:'7px',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px',background:pestanaMis==='en-venta'?'#4f7eff':'transparent',color:pestanaMis==='en-venta'?'#fff':'#8892a4',whiteSpace:'nowrap'}}>🎟 En venta</button>
              <button onClick={() => setPestanaMis('pagos')} style={{flex:1,minWidth:'68px',padding:'8px 4px',borderRadius:'7px',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px',background:pestanaMis==='pagos'?'#4f7eff':'transparent',color:pestanaMis==='pagos'?'#fff':'#8892a4',whiteSpace:'nowrap'}}>💰 Mis pagos</button>
            </div>
            {cargandoMis && <p style={{color:'#6b7280',fontSize:'13px'}}>Cargando...</p>}
            {!cargandoMis && pestanaMis === 'pedidos' && (
              misCompras.length === 0
                ? <p style={{color:'#6b7280',fontSize:'13px'}}>No has comprado boletas aun.</p>
                : misCompras.map(function(o) {
                    const b = o.boletas
                    const ev = b && b.eventos
                    const moneda = ev && ev.moneda === 'USD' ? 'US$' : '$'
                    const fecha = ev && ev.fecha ? new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}) : ''
                    const esBoletaAdmin = b?.usuarios?.es_admin === true
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
                                {/* Status tracker */}
                                {(() => {
                                  const tpasos = [
                                    { label: 'Pago en custodia', done: true },
                                    { label: 'Boleta transferida', done: !!o.archivo_url },
                                    { label: 'Pago liberado', done: !!(yaLiberado || o.liberado) },
                                  ]
                                  return (
                                    <div style={{display:'flex',alignItems:'flex-start',marginBottom:'14px'}}>
                                      {tpasos.map((paso, tidx) => (
                                        <div key={tidx} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',position:'relative'}}>
                                          {tidx < tpasos.length - 1 && (
                                            <div style={{position:'absolute',top:'11px',left:'50%',width:'100%',height:'2px',background:paso.done&&tpasos[tidx+1]?.done?'#22c55e':paso.done?'#f59e0b':'#1e2a3a',zIndex:0}} />
                                          )}
                                          <div style={{width:'22px',height:'22px',borderRadius:'50%',background:paso.done?'#22c55e':'#1e2a3a',border:paso.done?'none':'1px solid #2d3a55',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1,flexShrink:0}}>
                                            {paso.done && <span style={{color:'#fff',fontSize:'11px',fontWeight:'800'}}>✓</span>}
                                          </div>
                                          <p style={{color:paso.done?'#eef0f6':'#4e5a6e',fontSize:'10px',fontWeight:paso.done?'700':'400',margin:'5px 0 0',textAlign:'center',lineHeight:1.3,padding:'0 2px'}}>{paso.label}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                })()}
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
            {!cargandoMis && pestanaMis === 'ventas' && (<>
              <div style={{background:'#0f1623',border:'1px solid #1e2a3a',borderRadius:'12px',padding:'14px 16px',marginBottom:'14px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:editandoPago?'10px':'0'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <span style={{fontSize:'18px'}}>💳</span>
                    <div>
                      <p style={{color:'#8892a4',fontSize:'11px',fontWeight:'600',margin:'0 0 2px',textTransform:'uppercase',letterSpacing:'0.4px'}}>Mi dato de pago</p>
                      {!editandoPago && <p style={{color:datosPagoVendedor?'#eef0f6':'#4e5a6e',fontSize:'13px',margin:'0',fontStyle:datosPagoVendedor?'normal':'italic'}}>{datosPagoVendedor||'No registrado — agrega tu Nequi o cuenta bancaria'}</p>}
                    </div>
                  </div>
                  {!editandoPago && <button onClick={()=>setEditandoPago(true)} style={{background:'rgba(79,126,255,0.12)',color:'#6b93ff',border:'1px solid rgba(79,126,255,0.25)',borderRadius:'6px',padding:'5px 12px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>✏️ Editar</button>}
                </div>
                {editandoPago && (
                  <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                    <input value={datosPagoVendedor} onChange={e=>setDatosPagoVendedor(e.target.value)} placeholder="Ej: 3001234567 Nequi · Banco Bogotá 123-456789" style={{flex:1,minWidth:'180px',background:'#080b12',border:'1px solid #2d3a55',borderRadius:'8px',padding:'9px 12px',color:'#eef0f6',fontSize:'13px',outline:'none'}} />
                    <button onClick={guardarDatosPago} style={{background:'#4f7eff',color:'#fff',border:'none',borderRadius:'8px',padding:'9px 16px',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>Guardar</button>
                    <button onClick={()=>setEditandoPago(false)} style={{background:'transparent',color:'#8892a4',border:'1px solid #1e2a3a',borderRadius:'8px',padding:'9px 12px',fontSize:'13px',cursor:'pointer'}}>✕</button>
                  </div>
                )}
              </div>
              {misVentas.length === 0
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
                                      <p style={{color:'#f59e0b',fontSize:'12px',margin:'0 0 8px',fontWeight:'600'}}>📲 Transfiere la boleta a boletas@boleteriaco.com</p>
                                      {plat && (
                                        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid #1e2a3a',borderRadius:'8px',padding:'10px 12px',marginBottom:'10px'}}>
                                          <p style={{color:'#eef0f6',fontSize:'11px',fontWeight:'700',margin:'0 0 8px',textTransform:'uppercase',letterSpacing:'0.4px'}}>{b.plataforma}</p>
                                          {plat.pasosVendedor ? (
                                            <ol style={{color:'#8892a4',fontSize:'12px',margin:'0 0 8px',paddingLeft:'16px',lineHeight:1.8}}>
                                              {plat.pasosVendedor.map((paso, i) => <li key={i}>{paso}</li>)}
                                            </ol>
                                          ) : (
                                            <p style={{color:'#8892a4',fontSize:'12px',margin:'0 0 8px',lineHeight:1.6}}>{plat.instrVendedor}</p>
                                          )}
                                          {plat.requisitoReceptor && (
                                            <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:'6px',padding:'8px 10px'}}>
                                              <p style={{color:'#f59e0b',fontSize:'11px',margin:'0',lineHeight:1.5}}>⚠️ Requisito: {plat.requisitoReceptor}</p>
                                            </div>
                                          )}
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
              }
            </>
            )}
            {!cargandoMis && pestanaMis === 'en-venta' && (
              (() => {
                const enVenta = misVentas.filter(b => b.estado === 'publicada' && !(Array.isArray(b.ordenes) && b.ordenes.some(o => o.estado_pago === 'pagada')))
                return enVenta.length === 0
                  ? <p style={{color:'#6b7280',fontSize:'13px'}}>No tienes boletas en venta actualmente.</p>
                  : enVenta.map(function(b) {
                      const ev = b.eventos
                      const moneda = ev && ev.moneda === 'USD' ? 'US$' : '$'
                      return (
                        <div key={b.id} style={{background:'#0f1623',border:'1px solid #1e2a3a',borderRadius:'12px',padding:'16px',marginBottom:'10px'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                            <div>
                              <p style={{color:'#eef0f6',fontWeight:'700',margin:'0 0 4px',fontSize:'14px'}}>{ev ? ev.nombre : 'Evento'}</p>
                              <p style={{color:'#8892a4',fontSize:'12px',margin:'0 0 2px'}}>{ev ? ev.ciudad + (ev.estadio ? ' · ' + ev.estadio : '') : ''}</p>
                              <p style={{color:'#8892a4',fontSize:'12px',margin:'0 0 2px'}}>Tribuna {b.tribuna}{b.fila ? ' · Fila ' + b.fila : ''}{b.silla ? ' · Silla ' + b.silla : ''}</p>
                            </div>
                            <div style={{textAlign:'right'}}>
                              <p style={{color:'#eef0f6',fontWeight:'800',fontSize:'16px',margin:'0 0 6px'}}>{moneda}{Number(b.precio).toLocaleString('es-CO')}</p>
                              <span style={{background:'rgba(79,126,255,0.1)',color:'#6b93ff',fontSize:'11px',fontWeight:'700',padding:'3px 10px',borderRadius:'20px'}}>⏳ Esperando comprador</span>
                            </div>
                          </div>
                        </div>
                      )
                    })
              })()
            )}
            {!cargandoMis && pestanaMis === 'pagos' && (
              (() => {
                const ordenesVentas = misVentas.flatMap(b => Array.isArray(b.ordenes) ? b.ordenes.filter(o => o.estado_pago === 'pagada').map(o => ({...o, precio: b.precio, moneda: b.eventos ? b.eventos.moneda : null})) : [])
                const liberadas = ordenesVentas.filter(o => o.liberado || (Date.now() - new Date(o.creado_en).getTime() > 72 * 60 * 60 * 1000))
                const enEscrow = ordenesVentas.filter(o => !(o.liberado || (Date.now() - new Date(o.creado_en).getTime() > 72 * 60 * 60 * 1000)))
                const totalLiberado = liberadas.reduce((s, o) => s + Math.round(Number(o.precio || 0) * 0.92), 0)
                const totalEscrow = enEscrow.reduce((s, o) => s + Math.round(Number(o.precio || 0) * 0.92), 0)
                return (
                  <>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'20px'}}>
                      <div style={{background:'rgba(34,197,94,0.06)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:'12px',padding:'16px'}}>
                        <p style={{color:'#6b7a94',fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.6px',margin:'0 0 4px'}}>Recibido</p>
                        <p style={{color:'#22c55e',fontSize:'22px',fontWeight:'800',margin:'0'}}>${totalLiberado.toLocaleString('es-CO')}</p>
                        <p style={{color:'#4e5a6e',fontSize:'11px',margin:'4px 0 0'}}>{liberadas.length} venta{liberadas.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div style={{background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'12px',padding:'16px'}}>
                        <p style={{color:'#6b7a94',fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.6px',margin:'0 0 4px'}}>En custodia</p>
                        <p style={{color:'#f59e0b',fontSize:'22px',fontWeight:'800',margin:'0'}}>${totalEscrow.toLocaleString('es-CO')}</p>
                        <p style={{color:'#4e5a6e',fontSize:'11px',margin:'4px 0 0'}}>{enEscrow.length} venta{enEscrow.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    {ordenesVentas.length === 0
                      ? <p style={{color:'#6b7280',fontSize:'13px'}}>Aún no tienes ventas registradas.</p>
                      : ordenesVentas.map(function(o, i) {
                          const liberado = o.liberado || (Date.now() - new Date(o.creado_en).getTime() > 72 * 60 * 60 * 1000)
                          const moneda = o.moneda === 'USD' ? 'US$' : '$'
                          const neto = Math.round(Number(o.precio || 0) * 0.92)
                          return (
                            <div key={o.id || i} style={{background:'#0f1623',border:'1px solid #1e2a3a',borderRadius:'12px',padding:'14px 16px',marginBottom:'10px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
                              <div>
                                <p style={{color:'#eef0f6',fontWeight:'700',margin:'0 0 3px',fontSize:'13px'}}>Ref: {o.codigo_orden}</p>
                                <p style={{color:'#4e5a6e',fontSize:'11px',margin:'0'}}>{new Date(o.creado_en).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'})}</p>
                              </div>
                              <div style={{textAlign:'right'}}>
                                <p style={{color:'#eef0f6',fontWeight:'800',fontSize:'15px',margin:'0 0 4px'}}>{moneda}{neto.toLocaleString('es-CO')} <span style={{color:'#4e5a6e',fontSize:'11px',fontWeight:'400'}}>(92%)</span></p>
                                <span style={{background:liberado?'rgba(34,197,94,0.1)':'rgba(245,158,11,0.1)',color:liberado?'#4ade80':'#fbbf24',fontSize:'11px',fontWeight:'700',padding:'3px 8px',borderRadius:'20px'}}>{liberado?'✅ Liberado':'⏳ En custodia'}</span>
                              </div>
                            </div>
                          )
                        })
                    }
                  </>
                )
              })()
            )}
          {faqFooterSeccion}
          </div>
          </div>
        )}

        {esAdmin && mostrarAdmin && (
          <div style={{position:'fixed',top:esMobile?'52px':'60px',left:0,right:0,bottom:0,zIndex:350,background:'#080b12',overflowY:'auto'}}>
            {/* NAV ADMIN */}
            <nav style={s.navSec}>
              <div style={s.navInner}>
                <button onClick={()=>setMostrarAdmin(false)} style={{background:'transparent',border:'none',color:'#8892a4',cursor:'pointer',fontSize:'14px',fontWeight:'600',display:'flex',alignItems:'center',gap:'6px',padding:0}}>← Volver</button>
                <span style={{color:'#eef0f6',fontSize:'15px',fontWeight:'800',letterSpacing:'-0.3px'}}>⚙️ Admin</span>
              </div>
            </nav>
            <div style={{maxWidth:'720px',margin:'0 auto',padding:'28px 20px 48px'}}>
              {/* PESTAÑAS ADMIN */}
              <div style={{display:'flex',gap:'3px',marginBottom:'24px',background:'rgba(255,255,255,0.03)',borderRadius:'10px',padding:'4px',overflowX:'auto'}}>
                {[
                  {key:'pendientes', label:'🔴 Pendientes', badge: boletasPendientes.length + ordenesLiberadas.filter(o=>!o.boletas?.usuarios?.es_admin).length},
                  {key:'mis-boletas', label:'🎟 Mis boletas', badge: boletasAdmin.length},
                  {key:'estadios', label:'🏟 Estadios', badge: 0},
                  {key:'eventos', label:'📅 Eventos', badge: 0},
                ].map(tab => (
                  <button key={tab.key} onClick={()=>setPestanaAdmin(tab.key)} style={{flex:1,minWidth:'80px',padding:'8px 4px',borderRadius:'7px',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px',background:pestanaAdmin===tab.key?'#4f7eff':'transparent',color:pestanaAdmin===tab.key?'#fff':'#8892a4',whiteSpace:'nowrap',position:'relative'}}>
                    {tab.label}{tab.badge > 0 ? ` (${tab.badge})` : ''}
                  </button>
                ))}
              </div>

              {/* ── PESTAÑA: PENDIENTES ── */}
              {pestanaAdmin === 'pendientes' && (<>
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
                  const esBoletaAdmin = b?.usuarios?.es_admin === true
                  if (esBoletaAdmin) return null
                  const neto = Math.round(Number(b?.precio || 0) * 0.92)
                  return (
                    <div key={o.id} style={{background:'#1c2a1c',border:'1px solid #166534',borderRadius:'10px',padding:'14px',marginBottom:'10px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
                      <div>
                        <p style={{color:'#f9fafb',fontWeight:'600',margin:'0 0 2px',fontSize:'13px'}}>{ev?.nombre || 'Evento'} · {ev?.ciudad || ''}</p>
                        <p style={{color:'#9ca3af',fontSize:'12px',margin:'0 0 2px'}}>Vendedor: {b?.usuarios?.nombre || 'N/A'} — {b?.usuarios?.correo || ''}</p>
                        <p style={{color:'#6b93ff',fontSize:'12px',margin:'0 0 2px'}}>💳 {b?.usuarios?.datos_pago || <span style={{color:'#4e5a6e',fontStyle:'italic'}}>Sin dato de pago registrado</span>}</p>
                        <p style={{color:'#9ca3af',fontSize:'12px',margin:'0'}}>Ref: {o.codigo_orden} · Pagar: <strong style={{color:'#34d399'}}>${neto.toLocaleString('es-CO')}</strong> (92% del precio)</p>
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
            {ordenesLiberadas.filter(o => !o.boletas?.usuarios?.es_admin).length === 0 && (
              <p style={{color:'#6b7280',fontSize:'13px',marginBottom:'16px'}}>No hay pagos pendientes de envío.</p>
            )}
              </>)}

              {/* ── PESTAÑA: MIS BOLETAS ADMIN ── */}
              {pestanaAdmin === 'mis-boletas' && (<>
            {boletasAdmin.length > 0 && (
              <div style={{marginBottom:'20px'}}>
                <p style={{...s.tituloAdmin, marginBottom:'8px'}}>Gestionar boletas ({boletasAdmin.length})</p>
                <input
                  type="text"
                  placeholder="Buscar por evento o equipo..."
                  value={busquedaBoleta}
                  onChange={e => setBusquedaBoleta(e.target.value)}
                  style={{width:'100%',boxSizing:'border-box',background:'#0a0f1a',border:'1px solid #2a3a52',borderRadius:'8px',padding:'8px 12px',color:'#eef0f6',fontSize:'13px',marginBottom:'12px',outline:'none'}}
                />
                {boletasAdmin.filter(b => {
                  if (!busquedaBoleta.trim()) return true
                  const q = busquedaBoleta.toLowerCase()
                  return (b.eventos?.nombre || '').toLowerCase().includes(q)
                }).map(b => (
                  <div key={b.id} style={{background:'#0f1623',border:'1px solid #1e2a3a',borderRadius:'10px',padding:'12px 14px',marginBottom:'8px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                      <div>
                        <p style={{color:'#eef0f6',fontSize:'13px',fontWeight:'700',margin:'0 0 2px'}}>{b.eventos?.nombre || 'Evento'}</p>
                        <p style={{color:'#8892a4',fontSize:'12px',margin:0}}>
                          {b.usuarios?.nombre} · Trib. {b.tribuna} F.{b.fila} S.{b.silla} · ${Number(b.precio).toLocaleString('es-CO')}
                          {' '}<span style={{color: b.estado==='oculta' ? '#facc15' : b.estado==='reservada' ? '#fb923c' : '#4ade80', fontWeight:'700'}}>({b.estado})</span>
                        </p>
                      </div>
                      <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                        {confirmarEliminarBoleta === b.id
                          ? <>
                              <button onClick={()=>{eliminarBoleta(b.id);setConfirmarEliminarBoleta(null)}} style={{background:'#7f1d1d',color:'#fca5a5',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>Sí, eliminar</button>
                              <button onClick={()=>setConfirmarEliminarBoleta(null)} style={{background:'transparent',border:'1px solid #1e2a3a',borderRadius:'6px',color:'#6b7280',fontSize:'12px',cursor:'pointer',padding:'6px 10px'}}>Cancelar</button>
                            </>
                          : <>
                              {b.estado === 'oculta'
                                ? <button onClick={()=>mostrarBoleta(b.id)} style={{background:'#1e3a6a',color:'#93c5fd',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>Publicar</button>
                                : <button onClick={()=>ocultarBoleta(b.id)} style={{background:'#3d2a00',color:'#facc15',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>Ocultar</button>
                              }
                              <button onClick={()=>{ setBoletaEditando(boletaEditando===b.id ? null : b.id); setFormEditarBoleta({tribuna:b.tribuna||'',fila:b.fila||'',silla:b.silla||'',precio:b.precio||''}) }} style={{background:'#1a2f4a',color:'#60a5fa',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>Editar</button>
                              <button onClick={()=>setConfirmarEliminarBoleta(b.id)} style={{background:'#3b0a0a',color:'#f87171',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>Eliminar</button>
                            </>
                        }
                      </div>
                    </div>
                    {boletaEditando === b.id && (
                      <form onSubmit={guardarEdicionBoleta} style={{marginTop:'12px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'8px',alignItems:'flex-end'}}>
                        <div>
                          <label style={{color:'#6b7280',fontSize:'11px',fontWeight:'600',display:'block',marginBottom:'3px'}}>Tribuna</label>
                          <input value={formEditarBoleta.tribuna} onChange={e=>setFormEditarBoleta(f=>({...f,tribuna:e.target.value}))} required style={{width:'100%',boxSizing:'border-box',background:'#0a0f1a',border:'1px solid #2a3a52',borderRadius:'6px',padding:'6px 8px',color:'#eef0f6',fontSize:'12px'}} />
                        </div>
                        <div>
                          <label style={{color:'#6b7280',fontSize:'11px',fontWeight:'600',display:'block',marginBottom:'3px'}}>Fila</label>
                          <input value={formEditarBoleta.fila} onChange={e=>setFormEditarBoleta(f=>({...f,fila:e.target.value}))} style={{width:'100%',boxSizing:'border-box',background:'#0a0f1a',border:'1px solid #2a3a52',borderRadius:'6px',padding:'6px 8px',color:'#eef0f6',fontSize:'12px'}} />
                        </div>
                        <div>
                          <label style={{color:'#6b7280',fontSize:'11px',fontWeight:'600',display:'block',marginBottom:'3px'}}>Silla</label>
                          <input value={formEditarBoleta.silla} onChange={e=>setFormEditarBoleta(f=>({...f,silla:e.target.value}))} style={{width:'100%',boxSizing:'border-box',background:'#0a0f1a',border:'1px solid #2a3a52',borderRadius:'6px',padding:'6px 8px',color:'#eef0f6',fontSize:'12px'}} />
                        </div>
                        <div>
                          <label style={{color:'#6b7280',fontSize:'11px',fontWeight:'600',display:'block',marginBottom:'3px'}}>Precio</label>
                          <input type="number" value={formEditarBoleta.precio} onChange={e=>setFormEditarBoleta(f=>({...f,precio:e.target.value}))} required style={{width:'100%',boxSizing:'border-box',background:'#0a0f1a',border:'1px solid #2a3a52',borderRadius:'6px',padding:'6px 8px',color:'#eef0f6',fontSize:'12px'}} />
                        </div>
                        <button type="submit" style={{gridColumn:'1/-1',background:'#1e3a6a',color:'#93c5fd',border:'none',borderRadius:'6px',padding:'7px',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>Guardar cambios</button>
                      </form>
                    )}
                  </div>
                ))}
                <hr style={s.separador}/>
              </div>
            )}
              </>)}

              {/* ── PESTAÑA: ESTADIOS ── */}
              {pestanaAdmin === 'estadios' && (<>
            <p style={s.tituloAdmin}>Estadios</p>
            {estadios.length === 0
              ? <p style={{color:'#4e5a6e',fontSize:'13px',marginBottom:'12px'}}>No hay estadios registrados.</p>
              : <div style={{marginBottom:'16px',display:'flex',flexDirection:'column',gap:'8px'}}>
                  {estadios.map(es => (
                    <div key={es.id} style={{background:'rgba(255,255,255,0.04)',border:'1px solid #1e2a3a',borderRadius:'10px',padding:'10px 14px'}}>
                      {estadioEditando === es.id
                        ? <form onSubmit={guardarEstadio}>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                              <div><label style={{color:'#6b7280',fontSize:'11px',fontWeight:'600',display:'block',marginBottom:'3px'}}>Nombre</label>
                                <input value={formEstadio.nombre} onChange={e=>setFormEstadio(f=>({...f,nombre:e.target.value}))} required style={s.input} /></div>
                              <div><label style={{color:'#6b7280',fontSize:'11px',fontWeight:'600',display:'block',marginBottom:'3px'}}>Ciudad</label>
                                <input value={formEstadio.ciudad} onChange={e=>setFormEstadio(f=>({...f,ciudad:e.target.value}))} required style={s.input} /></div>
                            </div>
                            <label style={{color:'#6b7280',fontSize:'11px',fontWeight:'600',display:'block',marginBottom:'4px'}}>Tribunas</label>
                            <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
                              <input value={tribunaEstadioTemp} onChange={e=>setTribunaEstadioTemp(e.target.value)}
                                onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const t=tribunaEstadioTemp.trim();if(t&&!formEstadio.tribunas.includes(t)){setFormEstadio(f=>({...f,tribunas:[...f.tribunas,t]}));setTribunaEstadioTemp('')}}}}
                                style={{...s.input,marginBottom:0,flex:1}} placeholder="Ej: Oriental General" />
                              <button type="button" onClick={()=>{const t=tribunaEstadioTemp.trim();if(t&&!formEstadio.tribunas.includes(t)){setFormEstadio(f=>({...f,tribunas:[...f.tribunas,t]}));setTribunaEstadioTemp('')}}}
                                style={{background:'#1e3a6a',border:'none',borderRadius:'8px',color:'#93c5fd',fontSize:'12px',fontWeight:'700',cursor:'pointer',padding:'0 14px',flexShrink:0}}>+ Agregar</button>
                            </div>
                            {formEstadio.tribunas.length > 0 && (
                              <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'10px'}}>
                                {formEstadio.tribunas.map(t => (
                                  <span key={t} style={{background:'rgba(79,126,255,0.1)',border:'1px solid rgba(79,126,255,0.3)',borderRadius:'20px',padding:'3px 10px',fontSize:'12px',color:'#93c5fd',display:'flex',alignItems:'center',gap:'6px'}}>
                                    {t}
                                    <button type="button" onClick={()=>setFormEstadio(f=>({...f,tribunas:f.tribunas.filter(x=>x!==t)}))} style={{background:'transparent',border:'none',color:'#6b7280',cursor:'pointer',fontSize:'14px',padding:0,lineHeight:1}}>×</button>
                                  </span>
                                ))}
                              </div>
                            )}
                            <div style={{display:'flex',gap:'6px'}}>
                              <button type="submit" style={{background:'#1e3a6a',border:'none',borderRadius:'7px',color:'#93c5fd',fontSize:'12px',fontWeight:'700',cursor:'pointer',padding:'6px 14px'}}>Guardar</button>
                              <button type="button" onClick={()=>setEstadioEditando(null)} style={{background:'transparent',border:'1px solid #1e2a3a',borderRadius:'7px',color:'#6b7280',fontSize:'12px',cursor:'pointer',padding:'6px 12px'}}>Cancelar</button>
                            </div>
                          </form>
                        : <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
                            <div>
                              <p style={{color:'#eef0f6',fontSize:'13px',fontWeight:'700',margin:'0 0 2px'}}>{es.nombre}</p>
                              <p style={{color:'#8892a4',fontSize:'12px',margin:'0 0 4px'}}>{es.ciudad}</p>
                              {es.tribunas?.length > 0 && (
                                <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
                                  {es.tribunas.map(t => <span key={t} style={{background:'rgba(79,126,255,0.08)',border:'1px solid rgba(79,126,255,0.2)',borderRadius:'12px',padding:'2px 8px',fontSize:'11px',color:'#7aa2ff'}}>{t}</span>)}
                                </div>
                              )}
                            </div>
                            <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                              {confirmarEliminarEstadio === es.id
                                ? <>
                                    <button onClick={()=>eliminarEstadio(es.id)} style={{background:'#7f1d1d',color:'#fca5a5',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>Sí, eliminar</button>
                                    <button onClick={()=>setConfirmarEliminarEstadio(null)} style={{background:'transparent',border:'1px solid #1e2a3a',borderRadius:'6px',color:'#6b7280',fontSize:'12px',cursor:'pointer',padding:'6px 10px'}}>Cancelar</button>
                                  </>
                                : <>
                                    <button onClick={()=>{setEstadioEditando(es.id);setFormEstadio({nombre:es.nombre,ciudad:es.ciudad,tribunas:[...(es.tribunas||[])]});setTribunaEstadioTemp('')}}
                                      style={{background:'transparent',border:'1px solid #1e3a6a',borderRadius:'7px',color:'#93c5fd',fontSize:'12px',fontWeight:'600',cursor:'pointer',padding:'5px 10px'}}>Editar</button>
                                    <button onClick={()=>setConfirmarEliminarEstadio(es.id)} style={{background:'#3b0a0a',border:'none',borderRadius:'7px',color:'#f87171',fontSize:'12px',fontWeight:'700',cursor:'pointer',padding:'5px 10px'}}>Eliminar</button>
                                  </>
                              }
                            </div>
                          </div>
                      }
                    </div>
                  ))}
                </div>
            }
            <form onSubmit={crearEstadio} style={{background:'rgba(255,255,255,0.02)',border:'1px solid #1e2a3a',borderRadius:'10px',padding:'14px',marginBottom:'20px'}}>
              <p style={{color:'#4f7eff',fontSize:'12px',fontWeight:'700',margin:'0 0 10px',textTransform:'uppercase',letterSpacing:'0.4px'}}>+ Agregar estadio</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                <div><label style={{color:'#6b7280',fontSize:'11px',fontWeight:'600',display:'block',marginBottom:'3px'}}>Nombre</label>
                  <input value={formEstadio.nombre} onChange={e=>setFormEstadio(f=>({...f,nombre:e.target.value}))} required style={s.input} placeholder="El Campín" /></div>
                <div><label style={{color:'#6b7280',fontSize:'11px',fontWeight:'600',display:'block',marginBottom:'3px'}}>Ciudad</label>
                  <input value={formEstadio.ciudad} onChange={e=>setFormEstadio(f=>({...f,ciudad:e.target.value}))} required style={s.input} placeholder="Bogotá DC" /></div>
              </div>
              <label style={{color:'#6b7280',fontSize:'11px',fontWeight:'600',display:'block',marginBottom:'4px'}}>Tribunas</label>
              <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
                <input value={tribunaEstadioTemp} onChange={e=>setTribunaEstadioTemp(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const t=tribunaEstadioTemp.trim();if(t&&!formEstadio.tribunas.includes(t)){setFormEstadio(f=>({...f,tribunas:[...f.tribunas,t]}));setTribunaEstadioTemp('')}}}}
                  style={{...s.input,marginBottom:0,flex:1}} placeholder="Ej: Oriental General" />
                <button type="button" onClick={()=>{const t=tribunaEstadioTemp.trim();if(t&&!formEstadio.tribunas.includes(t)){setFormEstadio(f=>({...f,tribunas:[...f.tribunas,t]}));setTribunaEstadioTemp('')}}}
                  style={{background:'#1e3a6a',border:'none',borderRadius:'8px',color:'#93c5fd',fontSize:'12px',fontWeight:'700',cursor:'pointer',padding:'0 14px',flexShrink:0}}>+ Agregar</button>
              </div>
              {formEstadio.tribunas.length > 0 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'10px'}}>
                  {formEstadio.tribunas.map(t => (
                    <span key={t} style={{background:'rgba(79,126,255,0.1)',border:'1px solid rgba(79,126,255,0.3)',borderRadius:'20px',padding:'3px 10px',fontSize:'12px',color:'#93c5fd',display:'flex',alignItems:'center',gap:'6px'}}>
                      {t}
                      <button type="button" onClick={()=>setFormEstadio(f=>({...f,tribunas:f.tribunas.filter(x=>x!==t)}))} style={{background:'transparent',border:'none',color:'#6b7280',cursor:'pointer',fontSize:'14px',padding:0,lineHeight:1}}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <button type="submit" style={s.botonSubmitVerde}>Crear estadio</button>
            </form>
              </>)}

              {/* ── PESTAÑA: EVENTOS ── */}
              {pestanaAdmin === 'eventos' && (<>
            <p style={s.tituloAdmin}>Eventos registrados</p>
            {eventos.length === 0
              ? <p style={{color:'#4e5a6e',fontSize:'13px',marginBottom:'16px'}}>No hay eventos.</p>
              : <div style={{marginBottom:'20px',display:'flex',flexDirection:'column',gap:'8px'}}>
                  {[...eventos].sort((a,b)=> new Date(a.fecha||0)-new Date(b.fecha||0)).map(ev => (
                    <div key={ev.id} style={{background:'rgba(255,255,255,0.04)',border:'1px solid #1e2a3a',borderRadius:'10px',padding:'10px 14px'}}>
                      {eventoEditando === ev.id
                        ? <form onSubmit={editarEvento}>
                            <p style={{color:'#eef0f6',fontWeight:'700',fontSize:'13px',margin:'0 0 10px'}}>Editando: {ev.nombre}</p>
                            <input value={formEditar.nombre||''} onChange={e=>setFormEditar(f=>({...f,nombre:e.target.value}))} required style={{...s.input,marginBottom:'8px'}} placeholder="Nombre del evento" />
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                              <select value={formEditar.deporte||''} onChange={e=>setFormEditar(f=>({...f,deporte:e.target.value}))} style={s.input}>
                                <option>Futbol</option><option>Baloncesto</option><option>Tenis</option><option>Ciclismo</option><option>Otro</option>
                              </select>
                              <select value={formEditar.moneda||''} onChange={e=>setFormEditar(f=>({...f,moneda:e.target.value}))} style={s.input}>
                                <option value="COP">COP</option><option value="USD">USD</option>
                              </select>
                            </div>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                              <input value={formEditar.ciudad||''} onChange={e=>setFormEditar(f=>({...f,ciudad:e.target.value}))} required style={s.input} placeholder="Ciudad" />
                              <input value={formEditar.estadio||''} onChange={e=>setFormEditar(f=>({...f,estadio:e.target.value}))} required style={s.input} placeholder="Estadio" />
                            </div>
                            <input type="datetime-local" value={formEditar.fechaHora||''} onChange={e=>setFormEditar(f=>({...f,fechaHora:e.target.value}))} required style={{...s.input,marginBottom:'8px'}} />
                            <div style={{marginBottom:'10px'}}>
                              <p style={{color:'#8892a4',fontSize:'11px',margin:'0 0 6px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Tribunas</p>
                              <div style={{display:'flex',gap:'8px',marginBottom:'6px'}}>
                                <input value={tribunaInputTemp} onChange={e=>setTribunaInputTemp(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const t=tribunaInputTemp.trim();if(t&&!(formEditar.tribunas||[]).includes(t)){setFormEditar(f=>({...f,tribunas:[...(f.tribunas||[]),t]}));setTribunaInputTemp('')}}}} style={{...s.input,marginBottom:0,flex:1}} placeholder="Ej: Oriental Preferencial" />
                                <button type="button" onClick={()=>{const t=tribunaInputTemp.trim();if(t&&!(formEditar.tribunas||[]).includes(t)){setFormEditar(f=>({...f,tribunas:[...(f.tribunas||[]),t]}));setTribunaInputTemp('')}}} style={{background:'#1e3a6a',border:'none',borderRadius:'8px',color:'#93c5fd',fontSize:'12px',fontWeight:'700',cursor:'pointer',padding:'0 14px',flexShrink:0}}>+ Agregar</button>
                              </div>
                              {(formEditar.tribunas||[]).length > 0 && (
                                <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                                  {(formEditar.tribunas||[]).map(t => (
                                    <span key={t} style={{background:'rgba(147,197,253,0.1)',border:'1px solid #1e3a6a',borderRadius:'20px',color:'#93c5fd',fontSize:'11px',padding:'3px 10px',display:'flex',alignItems:'center',gap:'6px'}}>
                                      {t}
                                      <button type="button" onClick={()=>setFormEditar(f=>({...f,tribunas:(f.tribunas||[]).filter(x=>x!==t)}))} style={{background:'transparent',border:'none',color:'#6b7280',cursor:'pointer',fontSize:'14px',padding:0,lineHeight:1}}>×</button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div style={{display:'flex',gap:'8px'}}>
                              <button type="submit" style={{background:'#1a3a6a',border:'none',borderRadius:'7px',color:'#93c5fd',fontSize:'12px',fontWeight:'700',cursor:'pointer',padding:'6px 14px'}}>Guardar</button>
                              <button type="button" onClick={()=>{setEventoEditando(null);setFormEditar({});setTribunaInputTemp('')}} style={{background:'transparent',border:'1px solid #1e2a3a',borderRadius:'7px',color:'#6b7280',fontSize:'12px',cursor:'pointer',padding:'6px 12px'}}>Cancelar</button>
                            </div>
                          </form>
                        : <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px'}}>
                            <div style={{flex:1,minWidth:0}}>
                              <p style={{color:'#eef0f6',fontWeight:'700',fontSize:'13px',margin:'0 0 2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.nombre}</p>
                              {ev.fecha && <p style={{color: new Date(ev.fecha + 'T12:00:00') < new Date() ? '#6b7280' : '#8892a4',fontSize:'11px',margin:0}}>{new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'})}{new Date(ev.fecha + 'T12:00:00') < new Date() ? ' · pasado' : ''}</p>}
                            </div>
                            {confirmarEliminarEvento === ev.id
                              ? <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                                  <button onClick={() => eliminarEvento(ev.id)} style={{background:'#7f1d1d',border:'none',borderRadius:'7px',color:'#fca5a5',fontSize:'12px',fontWeight:'700',cursor:'pointer',padding:'5px 10px'}}>Sí, eliminar</button>
                                  <button onClick={() => setConfirmarEliminarEvento(null)} style={{background:'transparent',border:'1px solid #1e2a3a',borderRadius:'7px',color:'#6b7280',fontSize:'12px',cursor:'pointer',padding:'5px 10px'}}>Cancelar</button>
                                </div>
                              : <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                                  <button onClick={() => { setEventoEditando(ev.id); setTribunaInputTemp(''); setFormEditar({ nombre: ev.nombre, deporte: ev.deporte, ciudad: ev.ciudad, estadio: ev.estadio, moneda: ev.moneda, fechaHora: ev.fecha && ev.hora ? ev.fecha + 'T' + ev.hora : '', tribunas: ev.tribunas || [] }) }} style={{background:'transparent',border:'1px solid #1e3a6a',borderRadius:'7px',color:'#93c5fd',fontSize:'12px',fontWeight:'600',cursor:'pointer',padding:'5px 10px'}}>Editar</button>
                                  <button onClick={() => setConfirmarEliminarEvento(ev.id)} style={{background:'transparent',border:'1px solid #3a1e1e',borderRadius:'7px',color:'#f87171',fontSize:'12px',fontWeight:'600',cursor:'pointer',padding:'5px 10px'}}>Eliminar</button>
                                </div>
                            }
                          </div>
                      }
                    </div>
                  ))}
                </div>
            }
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
                <div>
                  <label style={s.label}>Estadio o lugar</label>
                  {estadios.length > 0
                    ? <select name="estadioId" value={formEvento.estadioId || ''} onChange={manejarCambioEvento} style={s.input}>
                        <option value="">Selecciona estadio...</option>
                        {estadios.map(es => <option key={es.id} value={es.id}>{es.nombre} — {es.ciudad}</option>)}
                        <option value="otro">Otro (escribir)</option>
                      </select>
                    : null
                  }
                  {(formEvento.estadioId === 'otro' || estadios.length === 0) && (
                    <input name="estadio" value={formEvento.estadio} onChange={manejarCambioEvento} required style={{...s.input, marginTop: estadios.length > 0 ? '6px' : 0}} placeholder="El Campin" />
                  )}
                </div>
              </div>
              <div>
                <label style={s.label}>Fecha y hora</label>
                <input name="fechaHora" type="datetime-local" value={formEvento.fechaHora || ''} onChange={manejarCambioEvento} required style={s.input} />
              </div>
              <div>
                <label style={s.label}>Tribunas del evento</label>
                <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
                  <input value={tribunaInputTemp} onChange={e=>setTribunaInputTemp(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const t=tribunaInputTemp.trim();if(t&&!formEvento.tribunas.includes(t)){setFormEvento({...formEvento,tribunas:[...formEvento.tribunas,t]});setTribunaInputTemp('')}}}} style={{...s.input,marginBottom:0,flex:1}} placeholder="Ej: Oriental Preferencial" />
                  <button type="button" onClick={()=>{const t=tribunaInputTemp.trim();if(t&&!formEvento.tribunas.includes(t)){setFormEvento({...formEvento,tribunas:[...formEvento.tribunas,t]});setTribunaInputTemp('')}}} style={{background:'#1e3a6a',border:'none',borderRadius:'8px',color:'#93c5fd',fontSize:'12px',fontWeight:'700',cursor:'pointer',padding:'0 14px',flexShrink:0}}>+ Agregar</button>
                </div>
                {formEvento.tribunas.length > 0 && (
                  <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'8px'}}>
                    {formEvento.tribunas.map(t => (
                      <span key={t} style={{background:'rgba(79,126,255,0.1)',border:'1px solid rgba(79,126,255,0.3)',borderRadius:'20px',padding:'3px 10px',fontSize:'12px',color:'#93c5fd',display:'flex',alignItems:'center',gap:'6px'}}>
                        {t}
                        <button type="button" onClick={()=>setFormEvento({...formEvento,tribunas:formEvento.tribunas.filter(x=>x!==t)})} style={{background:'transparent',border:'none',color:'#6b7280',cursor:'pointer',fontSize:'14px',padding:0,lineHeight:1}}>x</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" style={s.botonSubmitVerde}>Crear evento</button>
              {mensajeEvento && <p style={s.mensaje}>{mensajeEvento}</p>}
            </form>
              </>)}
            </div>
          </div>
        )}

        {/* ── Vista Publicar Boleta ── */}
        {mostrarFormulario && usuario && (
          <div style={{position:'fixed',top:esMobile?'52px':'60px',left:0,right:0,bottom:0,zIndex:300,background:'#080b12',overflowY:'auto'}}>
            <nav style={{background:'rgba(13,17,23,0.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid #1e2a3a',position:'sticky',top:0,zIndex:10,padding:'0 20px'}}>
              <div style={{maxWidth:'720px',margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',height:'60px'}}>
                <button onClick={()=>{setMostrarFormulario(false);setSilasExtra([])}} style={{background:'transparent',border:'none',color:'#8892a4',cursor:'pointer',fontSize:'14px',fontWeight:'600',display:'flex',alignItems:'center',gap:'6px',padding:0}}>← Volver</button>
                <p style={{color:'#eef0f6',fontSize:'15px',fontWeight:'800',margin:0,letterSpacing:'-0.3px'}}>➕ Publicar boleta</p>
              </div>
            </nav>
            <div style={{maxWidth:'560px',margin:'0 auto',padding:'28px 20px 60px'}}>
              <form onSubmit={manejarPublicar} style={s.tarjetaForm}>
                <label style={s.label}>Evento</label>
                <select name="eventoId" value={form.eventoId} onChange={manejarCambio} required style={s.input}>
                  <option value="">Selecciona un evento</option>
                  {eventos.map(function(ev) { return <option key={ev.id} value={ev.id}>{ev.nombre} ({ev.moneda || 'COP'})</option> })}
                </select>
                {form.eventoId && (() => {
                  const ev = eventos.find(e => e.id === form.eventoId)
                  const info = ev ? [ev.ciudad, ev.estadio].filter(Boolean).join(' · ') : ''
                  return info ? (
                    <p style={{color:'#6b93ff',fontSize:'12px',margin:'-8px 0 14px',display:'flex',alignItems:'center',gap:'6px'}}>
                      <span>📍</span><span>{info}</span>
                    </p>
                  ) : null
                })()}
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
                {tribunasEvento.length > 0
                  ? <select name="tribuna" value={form.tribuna} onChange={manejarCambio} required style={s.input}>
                      <option value="">Selecciona tribuna</option>
                      {tribunasEvento.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  : <input name="tribuna" value={form.tribuna} onChange={manejarCambio} required style={s.input} placeholder="Ej: Occidental" />
                }
                <label style={s.label}>Fila</label>
                <input name="fila" value={form.fila} onChange={manejarCambio} required style={s.input} />
                <label style={s.label}>Silla</label>
                <input name="silla" value={form.silla} onChange={manejarCambio} required style={s.input} />
                <label style={s.label}>Precio</label>
                <input name="precio" type="number" value={form.precio} onChange={manejarCambio} required style={s.input} />
                {silasExtra.map((s2, i) => (
                  <SillaExtraRow
                    key={i}
                    silla={s2}
                    indice={i}
                    tribunas={tribunasEvento}
                    onChangeTribuna={v=>setSilasExtra(silasExtra.map((x,j)=>j===i?{...x,tribuna:v}:x))}
                    onChangeFila={v=>setSilasExtra(silasExtra.map((x,j)=>j===i?{...x,fila:v}:x))}
                    onChangeSilla={v=>setSilasExtra(silasExtra.map((x,j)=>j===i?{...x,silla:v}:x))}
                    onRemove={()=>setSilasExtra(silasExtra.filter((_,j)=>j!==i))}
                    inputStyle={s.input}
                    labelStyle={s.label}
                  />
                ))}
                <button type="button" onClick={()=>setSilasExtra([...silasExtra,{tribuna:form.tribuna||'',fila:'',silla:''}])} style={{background:'transparent',border:'1px dashed #1e2a3a',borderRadius:'8px',padding:'8px',fontSize:'12px',color:'#4e5a6e',cursor:'pointer',width:'100%',marginBottom:'16px'}}>+ Añadir otra silla</button>
                <button type="submit" style={s.botonSubmit}>Publicar {silasExtra.length > 0 ? silasExtra.length+1+' boletas' : 'boleta'}</button>
                {mensaje && <p style={s.mensaje}>{mensaje}</p>}
              </form>
            </div>
          </div>
        )}

                {/* ── Página de Login ── */}
        {paginaActual === 'login' && (
          <div style={{position:'fixed',top:esMobile?'52px':'60px',left:0,right:0,bottom:0,zIndex:300,background:'#080b12',overflowY:'auto'}}>
            <nav style={{background:'rgba(13,17,23,0.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid #1e2a3a',position:'sticky',top:0,zIndex:10,padding:'0 20px'}}>
              <div style={{maxWidth:'720px',margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',height:'60px'}}>
                <button onClick={()=>setPaginaActual('inicio')} style={{background:'transparent',border:'none',color:'#8892a4',cursor:'pointer',fontSize:'14px',fontWeight:'600',display:'flex',alignItems:'center',gap:'6px',padding:0}}>← Volver</button>
                <p style={{color:'#eef0f6',fontSize:'16px',fontWeight:'800',margin:0,letterSpacing:'-0.3px'}}>Iniciar sesión</p>
                <div style={{width:'60px'}}></div>
              </div>
            </nav>
            <div style={{maxWidth:'480px',margin:'0 auto',padding:'40px 20px 60px'}}>
              <form onSubmit={manejarLogin} style={s.tarjetaForm}>
                <label style={s.label}>Correo</label>
                <input name="correo" type="email" value={formAuth.correo} onChange={manejarCambioAuth} required style={s.input} />
                <label style={s.label}>Contraseña</label>
                <input name="password" type="password" value={formAuth.password} onChange={manejarCambioAuth} required style={s.input} />
                <button type="submit" style={s.botonSubmit}>Entrar</button>
                <p style={{textAlign:'center',marginTop:'12px'}}>
                  <button type="button" onClick={() => { setPaginaActual('recuperar'); setMensajeAuth('') }}
                    style={{background:'none',border:'none',color:'#6366f1',fontSize:'13px',cursor:'pointer',textDecoration:'underline'}}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </p>
                <p style={{textAlign:'center',marginTop:'8px'}}>
                  <button type="button" onClick={() => { setPaginaActual('registro'); setMensajeAuth('') }}
                    style={{background:'none',border:'none',color:'#8892a4',fontSize:'13px',cursor:'pointer'}}>
                    ¿No tienes cuenta? Regístrate
                  </button>
                </p>
                {mensajeAuth && <p style={s.mensaje}>{mensajeAuth}</p>}
              </form>
            </div>
          </div>
        )}

        {/* ── Página de Recuperar contraseña ── */}
        {paginaActual === 'recuperar' && (
          <div style={{position:'fixed',top:esMobile?'52px':'60px',left:0,right:0,bottom:0,zIndex:300,background:'#080b12',overflowY:'auto'}}>
            <nav style={{background:'rgba(13,17,23,0.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid #1e2a3a',position:'sticky',top:0,zIndex:10,padding:'0 20px'}}>
              <div style={{maxWidth:'720px',margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',height:'60px'}}>
                <button onClick={()=>setPaginaActual('login')} style={{background:'transparent',border:'none',color:'#8892a4',cursor:'pointer',fontSize:'14px',fontWeight:'600',display:'flex',alignItems:'center',gap:'6px',padding:0}}>← Volver</button>
                <p style={{color:'#eef0f6',fontSize:'16px',fontWeight:'800',margin:0,letterSpacing:'-0.3px'}}>Recuperar contraseña</p>
                <div style={{width:'60px'}}></div>
              </div>
            </nav>
            <div style={{maxWidth:'480px',margin:'0 auto',padding:'40px 20px 60px'}}>
              <form onSubmit={manejarRecuperacion} style={s.tarjetaForm}>
                <p style={{color:'#9ca3af',fontSize:'13px',marginBottom:'16px'}}>Ingresa tu correo y te enviamos un link para crear una nueva contraseña.</p>
                <label style={s.label}>Correo</label>
                <input name="correo" type="email" value={formAuth.correo} onChange={manejarCambioAuth} required style={s.input} />
                <button type="submit" style={s.botonSubmit}>Enviar link</button>
                {mensajeAuth && <p style={s.mensaje}>{mensajeAuth}</p>}
              </form>
            </div>
          </div>
        )}

        {/* ── Página de Nueva contraseña ── */}
        {paginaActual === 'nueva-password' && (
          <div style={{position:'fixed',top:esMobile?'52px':'60px',left:0,right:0,bottom:0,zIndex:300,background:'#080b12',overflowY:'auto'}}>
            <nav style={{background:'rgba(13,17,23,0.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid #1e2a3a',position:'sticky',top:0,zIndex:10,padding:'0 20px'}}>
              <div style={{maxWidth:'720px',margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',height:'60px'}}>
                <button onClick={()=>setPaginaActual('inicio')} style={{background:'transparent',border:'none',color:'#8892a4',cursor:'pointer',fontSize:'14px',fontWeight:'600',display:'flex',alignItems:'center',gap:'6px',padding:0}}>← Volver</button>
                <p style={{color:'#eef0f6',fontSize:'16px',fontWeight:'800',margin:0,letterSpacing:'-0.3px'}}>Nueva contraseña</p>
                <div style={{width:'60px'}}></div>
              </div>
            </nav>
            <div style={{maxWidth:'480px',margin:'0 auto',padding:'40px 20px 60px'}}>
              <form onSubmit={manejarNuevaPassword} style={s.tarjetaForm}>
                <label style={s.label}>Nueva contraseña</label>
                <input name="nuevaPassword" type="password" value={formAuth.nuevaPassword} onChange={manejarCambioAuth} required minLength={6} style={s.input} />
                <button type="submit" style={s.botonSubmit}>Guardar contraseña</button>
                {mensajeAuth && <p style={s.mensaje}>{mensajeAuth}</p>}
              </form>
            </div>
          </div>
        )}

        {/* ── Página de Registro ── */}
        {paginaActual === 'registro' && (
          <div style={{position:'fixed',top:esMobile?'52px':'60px',left:0,right:0,bottom:0,zIndex:300,background:'#080b12',overflowY:'auto'}}>
            <nav style={{background:'rgba(13,17,23,0.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid #1e2a3a',position:'sticky',top:0,zIndex:10,padding:'0 20px'}}>
              <div style={{maxWidth:'720px',margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',height:'60px'}}>
                <button onClick={()=>setPaginaActual('inicio')} style={{background:'transparent',border:'none',color:'#8892a4',cursor:'pointer',fontSize:'14px',fontWeight:'600',display:'flex',alignItems:'center',gap:'6px',padding:0}}>← Volver</button>
                <p style={{color:'#eef0f6',fontSize:'16px',fontWeight:'800',margin:0,letterSpacing:'-0.3px'}}>Crear cuenta</p>
                <div style={{width:'60px'}}></div>
              </div>
            </nav>
            <div style={{maxWidth:'480px',margin:'0 auto',padding:'40px 20px 60px'}}>
              <form onSubmit={manejarRegistro} style={s.tarjetaForm}>
                <label style={s.label}>Nombre</label>
                <input name="nombre" value={formAuth.nombre} onChange={manejarCambioAuth} required style={s.input} />
                <label style={s.label}>🪪 Número de documento</label>
                <input name="documento" placeholder="Ej: 1020304050" value={formAuth.documento} onChange={manejarCambioAuth} required style={s.input} inputMode="numeric" />
                <label style={s.label}>Correo</label>
                <input name="correo" type="email" value={formAuth.correo} onChange={manejarCambioAuth} required style={s.input} />
                <label style={s.label}>Contraseña</label>
                <input name="password" type="password" value={formAuth.password} onChange={manejarCambioAuth} required style={s.input} />
                <label style={s.label}>Confirmar contraseña</label>
                <input name="nuevaPassword" type="password" value={formAuth.nuevaPassword} onChange={manejarCambioAuth} required style={s.input} />
                <label style={s.label}>📱 Dato de pago (Nequi o banco)</label>
                <input name="datosPago" placeholder="Ej: 3001234567 Nequi · Banco Bogotá 123-456789" value={formAuth.datosPago} onChange={manejarCambioAuth} style={s.input} />
                <p style={{color:'#4e5a6e',fontSize:'11px',margin:'-8px 0 12px',lineHeight:1.5}}>Aquí te enviamos tu pago cuando vendes una boleta.</p>
                <button type="submit" style={s.botonSubmit}>Crear cuenta</button>
                <p style={{textAlign:'center',marginTop:'12px'}}>
                  <button type="button" onClick={() => { setPaginaActual('login'); setMensajeAuth('') }}
                    style={{background:'none',border:'none',color:'#8892a4',fontSize:'13px',cursor:'pointer'}}>
                    ¿Ya tienes cuenta? Inicia sesión
                  </button>
                </p>
                {mensajeAuth && <p style={s.mensaje}>{mensajeAuth}</p>}
              </form>
            </div>
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
            <label style={s.label}>🪪 Número de documento</label>
            <input name="documento" placeholder="Ej: 1020304050" value={formAuth.documento} onChange={manejarCambioAuth} required style={s.input} inputMode="numeric" />
            <label style={s.label}>Correo</label>
            <input name="correo" type="email" value={formAuth.correo} onChange={manejarCambioAuth} required style={s.input} />
            <label style={s.label}>Contrasena</label>
            <input name="password" type="password" value={formAuth.password} onChange={manejarCambioAuth} required style={s.input} />
            <label style={s.label}>Confirmar contraseña</label>
<input name="nuevaPassword" type="password" value={formAuth.nuevaPassword} onChange={manejarCambioAuth} required style={s.input} />
            <label style={s.label}>📱 Dato de pago (Nequi o banco)</label>
            <input name="datosPago" placeholder="Ej: 3001234567 Nequi · Banco Bogotá 123-456789" value={formAuth.datosPago} onChange={manejarCambioAuth} style={s.input} />
            <p style={{color:'#4e5a6e',fontSize:'11px',margin:'-8px 0 12px',lineHeight:1.5}}>Aquí te enviamos tu pago cuando vendes una boleta.</p>
            <button type="submit" style={s.botonSubmit}>Crear cuenta</button>
            {mensajeAuth && <p style={s.mensaje}>{mensajeAuth}</p>}
          </form>
        )}

        {/* ── BARRA DE BÚSQUEDA ── */}
        <div style={{margin:'28px 0 0'}}>
          <div style={{position:'relative',marginBottom:'12px'}}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
              <circle cx="6.5" cy="6.5" r="5" stroke="#6b82a0" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="#6b82a0" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input type="text" placeholder="Buscar equipo o evento..." value={busquedaPublica} onChange={e=>setBusquedaPublica(e.target.value)} style={{width:'100%',boxSizing:'border-box',background:'#0f1928',border:'1px solid #1e2a3a',borderRadius:'12px',padding:'11px 16px 11px 38px',color:'#eef0f6',fontSize:'14px',outline:'none'}}/>
          </div>
          {!cargando && boletas.length>0 && (()=>{
            const ciudades=[...new Set(boletas.map(b=>b.eventos?.ciudad).filter(Boolean))]
            const deportes=[...new Set(boletas.map(b=>b.eventos?.deporte).filter(Boolean))]
            return (
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
                <select value={filtros.ciudad} onChange={e=>setFiltros(f=>({...f,ciudad:e.target.value}))} style={{flex:'1',minWidth:'130px',background:'#0f1928',border:'1px solid #1e2a3a',borderRadius:'10px',padding:'8px 14px',color:'#eef0f6',fontSize:'12px',cursor:'pointer',outline:'none'}}>
                  <option value=''>Todas las ciudades</option>
                  {ciudades.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filtros.deporte} onChange={e=>setFiltros(f=>({...f,deporte:e.target.value}))} style={{flex:'1',minWidth:'130px',background:'#0f1928',border:'1px solid #1e2a3a',borderRadius:'10px',padding:'8px 14px',color:'#eef0f6',fontSize:'12px',cursor:'pointer',outline:'none'}}>
                  <option value=''>Todos los deportes</option>
                  {deportes.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
                {(filtros.ciudad||filtros.deporte)&&<button onClick={()=>setFiltros({ciudad:'',deporte:'',precioMax:''})} style={{background:'transparent',border:'1px solid #1e2a3a',color:'#6b82a0',borderRadius:'10px',padding:'8px 14px',cursor:'pointer',fontSize:'12px'}}>Limpiar</button>}
              </div>
            )
          })()}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
            <div>
              <p style={{color:'#eef0f6',fontSize:'17px',fontWeight:'800',margin:'0 0 2px',letterSpacing:'-0.4px'}}>Eventos disponibles</p>
              <p style={{color:'#4e5a6e',fontSize:'12px',margin:0}}>{[...new Set(boletas.filter(b=>b.estado==='publicada'&&b.evento_id).map(b=>b.evento_id))].length} evento{[...new Set(boletas.filter(b=>b.estado==='publicada'&&b.evento_id).map(b=>b.evento_id))].length!==1?'s':''} con entradas</p>
            </div>
            {usuario&&(
              <button onClick={()=>setMostrarFormulario(true)} style={{background:'rgba(79,126,255,0.12)',color:'#6b93ff',border:'1px solid rgba(79,126,255,0.25)',borderRadius:'10px',padding:'9px 18px',fontSize:'13px',fontWeight:'700',cursor:'pointer',flexShrink:0}}>
                + Vender
              </button>
            )}
          </div>
        </div>


        {cargando && <p style={s.vacio}>Cargando eventos...</p>}

        {/* ── TARJETAS DE EVENTOS ── */}
        {(()=>{
          const boletasFiltradas = boletas.filter(b => {
            if (b.estado !== 'publicada') return false
            if (filtros.ciudad && (b.eventos?.ciudad || '').toLowerCase() !== filtros.ciudad.toLowerCase()) return false
            if (filtros.deporte && (b.eventos?.deporte || '').toLowerCase() !== filtros.deporte.toLowerCase()) return false
            if (busquedaPublica.trim()) {
              const q = busquedaPublica.toLowerCase()
              const nombre = (b.eventos?.nombre || '').toLowerCase()
              const ciudad = (b.eventos?.ciudad || '').toLowerCase()
              if (!nombre.includes(q) && !ciudad.includes(q)) return false
            }
            return true
          })
          if (!cargando && boletas.length === 0) return (
            <div style={{textAlign:'center',padding:'60px 20px 40px',display:'flex',flexDirection:'column',alignItems:'center',gap:'16px'}}>
              <div style={{fontSize:'52px',lineHeight:1}}>🎟️</div>
              <h2 style={{margin:0,fontSize:'22px',fontWeight:'800',color:'#eef0f6'}}>Aún no hay boletas publicadas</h2>
              <p style={{margin:0,fontSize:'15px',color:'#8892a4',maxWidth:'320px',lineHeight:'1.6'}}>Sé el primero en vender. Publica tu boleta en minutos y llega a compradores en toda Colombia.</p>
              <button
                onClick={() => { if (!usuario) { setVistaAuth('registro'); return } setMostrarFormulario(true) }}
                style={{marginTop:'8px',background:'#4f7eff',color:'#fff',border:'none',borderRadius:'12px',padding:'14px 32px',fontSize:'15px',fontWeight:'700',cursor:'pointer',boxShadow:'0 0 28px rgba(79,126,255,0.3)'}}>
                Publicar mi boleta
              </button>
            </div>
          )
          // Group by evento_id
          const eventosMap = {}
          boletasFiltradas.forEach(b => {
            const eid = b.evento_id || (b.eventos && b.eventos.id) || b.id
            if (!eventosMap[eid]) eventosMap[eid] = { info: b.eventos, boletas: [] }
            eventosMap[eid].boletas.push(b)
          })
          const eventosArr = Object.entries(eventosMap).sort((a, b) => {
            const fa = a[1].info?.fecha || ''
            const fb = b[1].info?.fecha || ''
            return fa.localeCompare(fb)
          })
          if (!cargando && eventosArr.length === 0 && boletas.length > 0) return (
            <p style={s.vacio}>No hay eventos que coincidan con la búsqueda.</p>
          )
          return eventosArr.map(([eid, ev]) => {
            const info = ev.info
            const precios = ev.boletas.map(b => Number(b.precio)).filter(p => p > 0)
            const precioMin = precios.length > 0 ? Math.min(...precios) : 0
            const moneda = info?.moneda || 'COP'
            const esAdminEvento = ev.boletas.some(b => b.publicada_por_admin === true || b.usuarios?.es_admin === true)
            const [equipo1, equipo2] = extraerEquipos(info?.nombre || '')
            const fechaObj = info?.fecha ? new Date(info.fecha + 'T12:00:00') : null
            const diaN = fechaObj ? fechaObj.getDate() : ''
            const mesAbr = fechaObj ? fechaObj.toLocaleDateString('es-CO',{month:'short'}).replace('.','').toUpperCase() : ''
            const anioN = fechaObj ? fechaObj.getFullYear() : ''
            const horaStr = info?.hora ? info.hora.slice(0,5) : ''
            return (
              <div
                key={eid}
                onClick={() => { setEventoSeleccionado({eid, ev}); setSeccionMapa(null); setPaginaActual('evento') }}
                style={{background:'linear-gradient(135deg,#0f1a2e 0%,#0c1220 100%)',border:'1px solid #1e2a3a',borderRadius:'18px',padding:'20px 16px',marginBottom:'12px',cursor:'pointer',display:'flex',flexDirection:'column',gap:'14px'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor='#4f7eff'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='#1e2a3a'}
              >
                {/* Top: grid 3 cols — fecha | escudos centrados | flecha */}
                <div style={{display:'grid',gridTemplateColumns:'80px 1fr 24px',alignItems:'center',gap:'8px'}}>
                  {fechaObj ? (
                    <div style={{background:'rgba(79,126,255,0.12)',border:'1px solid rgba(79,126,255,0.2)',borderRadius:'10px',padding:'8px 12px',textAlign:'center'}}>
                      <p style={{color:'#6b93ff',fontSize:'10px',fontWeight:'800',margin:0,textTransform:'uppercase',letterSpacing:'0.8px'}}>{mesAbr}</p>
                      <p style={{color:'#eef0f6',fontSize:'22px',fontWeight:'900',margin:'2px 0',lineHeight:'1'}}>{diaN}</p>
                      <p style={{color:'#8892a4',fontSize:'10px',fontWeight:'600',margin:0}}>{anioN}</p>
                      {horaStr && <p style={{color:'#6b93ff',fontSize:'10px',fontWeight:'700',margin:'3px 0 0',background:'rgba(79,126,255,0.15)',borderRadius:'6px',padding:'1px 4px'}}>{horaStr}</p>}
                    </div>
                  ) : <div/>}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'16px'}}>
                    <EscudoSVG nombre={equipo1} size={60} />
                    {equipo2 && <>
                      <span style={{color:'#2a3a52',fontSize:'13px',fontWeight:'800',letterSpacing:'1px'}}>VS</span>
                      <EscudoSVG nombre={equipo2} size={60} />
                    </>}
                  </div>
                  <span style={{color:'#4e5a6e',fontSize:'18px',textAlign:'right'}}>›</span>
                </div>
                {/* Nombre + estadio centrados */}
                <div style={{textAlign:'center'}}>
                  <p style={{color:'#eef0f6',fontSize:'15px',fontWeight:'700',margin:'0 0 4px',lineHeight:'1.3'}}>{info?.nombre || 'Evento'}</p>
                  <p style={{color:'#6b7a94',fontSize:'12px',margin:0}}>{[info?.ciudad, info?.estadio].filter(Boolean).join(' · ')}</p>
                </div>
                {/* Footer: precio + badge */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid #111d2b',paddingTop:'12px'}}>
                  <div>
                    <p style={{color:'#4ade80',fontSize:'14px',fontWeight:'800',margin:'0 0 1px'}}>
                      {ev.boletas.length > 0 ? `desde ${calcularTotal(precioMin, moneda, esAdminEvento)}` : 'Sin disponibles'}
                    </p>
                    <p style={{color:'#4e5a6e',fontSize:'11px',margin:0}}>{ev.boletas.length} entrada{ev.boletas.length !== 1 ? 's' : ''} disponible{ev.boletas.length !== 1 ? 's' : ''}</p>
                  </div>
                  {esAdminEvento && (
                    <span style={{background:'rgba(79,126,255,0.15)',border:'1px solid rgba(79,126,255,0.25)',color:'#6b93ff',fontSize:'10px',fontWeight:'700',padding:'4px 10px',borderRadius:'20px'}}>✓ Verificado</span>
                  )}
                </div>
              </div>
            )
          })
        })()}

        {/* ── PÁGINA DE EVENTO ── */}
        {paginaActual === 'evento' && eventoSeleccionado && (() => {
          const {eid, ev} = eventoSeleccionado
          const info = ev.info
          const [equipo1, equipo2] = extraerEquipos(info?.nombre || '')
          const fechaStr = info?.fecha ? new Date(info.fecha + 'T12:00:00').toLocaleDateString('es-CO',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}) : ''
          const horaStr = info?.hora ? info.hora.slice(0,5) : ''
          const disponibles = ev.boletas.filter(b => b.estado === 'publicada')
          const porTribuna = {}
          disponibles.forEach(b => {
            const t = (b.tribuna || 'General').trim()
            if (!porTribuna[t]) porTribuna[t] = []
            porTribuna[t].push(b)
          })
          const tribunas = Object.keys(porTribuna)
          const seccionActual = seccionMapa || null
          const boletasSeccion = seccionActual ? (porTribuna[seccionActual] || []) : disponibles
          const esElCampin = (info?.estadio||'').toLowerCase().replace(/[íi]/g,'i').includes('campin')
          const esAtanasio = (info?.estadio||'').toLowerCase().includes('atanasio') || (info?.estadio||'').toLowerCase().includes('girardot')
          const esTecho = (info?.estadio||'').toLowerCase().includes('techo')
          return (
            <div style={{position:'fixed',top:esMobile?'52px':'60px',left:0,right:0,bottom:0,zIndex:300,background:'#080b12',overflowY:'auto'}}>
              {/* NAV */}
              <nav style={s.navSec}>
                <div style={s.navInner}>
                  <button onClick={()=>{setPaginaActual('inicio');setSeccionMapa(null)}} style={{background:'transparent',border:'none',color:'#8892a4',cursor:'pointer',fontSize:'14px',fontWeight:'600',display:'flex',alignItems:'center',gap:'6px',padding:0}}>← Volver</button>
                  <span style={{color:'#eef0f6',fontSize:'15px',fontWeight:'800',letterSpacing:'-0.3px'}}>🏟 Evento</span>
                </div>
              </nav>
              <div style={{maxWidth:'680px',margin:'0 auto',padding:'0 20px 80px'}}>

                {/* HERO */}
                <div style={{padding:'24px 0 20px',borderBottom:'1px solid #111d2b',marginBottom:'20px'}}>
                  <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:'20px',marginBottom:'14px'}}>
                    <EscudoSVG nombre={equipo1} size={52} />
                    {equipo2 && <>
                      <span style={{color:'#293748',fontSize:'13px',fontWeight:'700',letterSpacing:'1px'}}>VS</span>
                      <EscudoSVG nombre={equipo2} size={52} />
                    </>}
                  </div>
                  <h1 style={{color:'#eef0f6',fontSize:'19px',fontWeight:'800',margin:'0 0 8px',lineHeight:'1.25',textAlign:'center'}}>{info?.nombre}</h1>
                  <div style={{display:'flex',justifyContent:'center',flexWrap:'wrap',gap:'6px',alignItems:'center'}}>
                    {fechaStr && <span style={{color:'#a78bfa',fontSize:'12px',fontWeight:'600',background:'rgba(167,139,250,0.1)',padding:'4px 10px',borderRadius:'20px'}}>{fechaStr}{horaStr ? ` · ${horaStr}` : ''}</span>}
                    {info?.estadio && <span style={{color:'#6b7a94',fontSize:'12px',fontWeight:'500'}}>{[info?.ciudad, info?.estadio].filter(Boolean).join(' · ')}</span>}
                  </div>
                </div>

                {/* MAPA */}
                {(esElCampin || esAtanasio || esTecho) ? (
                  <div style={{marginBottom:'20px'}}>
                    <p style={{color:'#4e5a6e',fontSize:'10px',fontWeight:'700',textAlign:'center',margin:'0 0 10px',textTransform:'uppercase',letterSpacing:'1px'}}>
                      🗺️ Toca una tribuna para ver las boletas
                    </p>
                    {esElCampin ? (
                      <MapaElCampin
                        avail={porTribuna}
                        selected={seccionActual}
                        onSelect={t => setSeccionMapa(seccionMapa === t ? null : t)}
                      />
                    ) : esAtanasio ? (
                      <MapaAtanasio
                        avail={porTribuna}
                        selected={seccionActual}
                        onSelect={t => setSeccionMapa(seccionMapa === t ? null : t)}
                      />
                    ) : (
                      <MapaEstadioTecho
                        avail={porTribuna}
                        selected={seccionActual}
                        onSelect={t => setSeccionMapa(seccionMapa === t ? null : t)}
                      />
                    )}
                    {/* Leyenda */}
                    <div style={{display:'flex',justifyContent:'center',gap:'16px',marginTop:'10px',flexWrap:'wrap'}}>
                      {[['rgba(61,219,122,0.7)','Disponible'],['rgba(79,126,255,0.8)','Seleccionado'],['rgba(255,255,255,0.15)','Sin disponibilidad']].map(([col,lbl])=>(
                        <div key={lbl} style={{display:'flex',alignItems:'center',gap:'5px'}}>
                          <span style={{width:'10px',height:'10px',borderRadius:'2px',background:col,display:'inline-block',flexShrink:0}}/>
                          <span style={{color:'#6b7a94',fontSize:'11px',fontWeight:'500'}}>{lbl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid #1a2332',borderRadius:'14px',padding:'18px',marginBottom:'20px',textAlign:'center'}}>
                    <p style={{color:'#4f7eff',fontSize:'12px',fontWeight:'700',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'1px'}}>Mapa del estadio</p>
                    <p style={{color:'#4e5a6e',fontSize:'13px',margin:0}}>🗺️ Próximamente — selección interactiva de tribuna</p>
                  </div>
                )}

                {/* TRIBUNA PILLS (non-Campín) */}
                {!esElCampin && !esAtanasio && !esTecho && tribunas.length > 1 && (
                  <div style={{display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'4px',marginBottom:'16px'}}>
                    {tribunas.map(t => (
                      <button key={t} onClick={()=>setSeccionMapa(seccionMapa===t?null:t)}
                        style={{background:seccionActual===t?'#4f7eff':'rgba(255,255,255,0.04)',border:seccionActual===t?'none':'1px solid #1a2332',borderRadius:'20px',color:seccionActual===t?'#fff':'#8892a4',fontSize:'12px',fontWeight:'600',padding:'7px 14px',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}
                      >{t}</button>
                    ))}
                  </div>
                )}

                {/* SECCIÓN HEADER */}
                {seccionActual ? (
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <span style={{width:'10px',height:'10px',borderRadius:'50%',background:'#4f7eff',display:'inline-block',flexShrink:0}}/>
                      <span style={{color:'#eef0f6',fontSize:'15px',fontWeight:'700'}}>Tribuna {seccionActual}</span>
                    </div>
                    <span style={{color:'#6b93ff',fontSize:'12px',fontWeight:'600',background:'rgba(79,126,255,0.1)',padding:'4px 10px',borderRadius:'20px'}}>
                      {boletasSeccion.length} disponible{boletasSeccion.length!==1?'s':''}
                    </span>
                  </div>
                ) : (
                  <p style={{color:'#6b7a94',fontSize:'13px',fontWeight:'600',margin:'0 0 12px'}}>
                    {boletasSeccion.length} entrada{boletasSeccion.length!==1?'s':''} disponible{boletasSeccion.length!==1?'s':''}
                  </p>
                )}

                {/* BOLETA CARDS */}
                {boletasSeccion.map(b => {
                  const moneda = info?.moneda || 'COP'
                  const esAdminB = b.publicada_por_admin === true || b.usuarios?.es_admin === true
                  const enCarrito = carrito.some(ci => ci.id === b.id)
                  const precioFinal = calcularTotal(b.precio, moneda, esAdminB)
                  return (
                    <div key={b.id} style={{background:enCarrito?'rgba(61,219,122,0.05)':'#0d1420',border:enCarrito?'1px solid rgba(74,222,128,0.3)':'1px solid #1a2332',borderRadius:'14px',padding:'14px 16px',marginBottom:'10px',transition:'all 0.15s'}}>
                      {/* Badge */}
                      {esAdminB && (
                        <div style={{display:'inline-flex',alignItems:'center',gap:'4px',background:'rgba(79,126,255,0.1)',border:'1px solid rgba(79,126,255,0.2)',borderRadius:'20px',padding:'3px 10px',marginBottom:'10px'}}>
                          <span style={{color:'#6b93ff',fontSize:'10px',fontWeight:'700'}}>✓ Verificado · Boletería CO</span>
                        </div>
                      )}
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{color:'#eef0f6',fontSize:'14px',fontWeight:'700',margin:'0 0 3px'}}>
                            {b.tribuna ? `Tribuna ${b.tribuna}` : 'General'}
                            {b.fila ? ` · Fila ${b.fila}` : ''}
                            {b.silla ? ` · Silla ${b.silla}` : ''}
                          </p>
                          <p style={{color:enCarrito?'#4ade80':'#3de37a',fontSize:'18px',fontWeight:'800',margin:0,letterSpacing:'-0.5px'}}>{precioFinal}</p>
                        </div>
                        <button
                          onClick={() => enCarrito ? setCarrito(carrito.filter(ci=>ci.id!==b.id)) : setCarrito([...carrito, b])}
                          style={{background:enCarrito?'transparent':'#4f7eff',border:enCarrito?'1px solid rgba(74,222,128,0.4)':'none',borderRadius:'10px',color:enCarrito?'#4ade80':'#fff',fontSize:'12px',fontWeight:'700',padding:'8px 14px',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,transition:'all 0.15s'}}
                        >
                          {enCarrito ? '✓ En carrito' : 'Añadir al carrito'}
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* MAPA GOOGLE MAPS */}
                {info?.estadio && (
                  <div style={{marginTop:'28px',marginBottom:'8px'}}>
                    <p style={{color:'#6b7a94',fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.8px',margin:'0 0 10px',display:'flex',alignItems:'center',gap:'6px'}}>
                      📍 Cómo llegar
                    </p>
                    <div style={{borderRadius:'14px',overflow:'hidden',border:'1px solid #1a2332',height:'200px'}}>
                      <iframe
                        title="Ubicación del estadio"
                        width="100%"
                        height="200"
                        style={{border:0,display:'block'}}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent((info.estadio||'')+(info.ciudad?', '+info.ciudad:''))}&output=embed&z=15`}
                      />
                    </div>
                  </div>
                )}

                {/* BOTÓN VER CARRITO */}
                {carrito.length > 0 && (
                  <button
                    onClick={()=>setPaginaActual('carrito')}
                    style={{position:'sticky',bottom:'20px',width:'100%',background:'#4f7eff',border:'none',borderRadius:'14px',color:'#fff',fontSize:'15px',fontWeight:'700',cursor:'pointer',padding:'16px',marginTop:'12px',boxShadow:'0 4px 24px rgba(79,126,255,0.45)'}}
                  >
                    Ver carrito ({carrito.length} entrada{carrito.length!==1?'s':''}) →
                  </button>
                )}
              {faqFooterSeccion}
              </div>
            </div>
          )
        })()}

        {/* CARRITO */}
        {paginaActual === 'carrito' && (
          <div style={{position:'fixed',top:esMobile?'52px':'60px',left:0,right:0,bottom:0,zIndex:300,background:'#080b12',overflowY:'auto'}}>
            <nav style={s.navSec}>
              <div style={s.navInner}>
                <button onClick={()=>setPaginaActual('inicio')} style={{background:'transparent',border:'none',color:'#8892a4',cursor:'pointer',fontSize:'14px',fontWeight:'600',display:'flex',alignItems:'center',gap:'6px',padding:0}}>← Volver</button>
                <span style={{color:'#eef0f6',fontSize:'15px',fontWeight:'800',letterSpacing:'-0.3px'}}>🛒 Carrito</span>
              </div>
            </nav>
            <div style={{maxWidth:'480px',margin:'0 auto',padding: esMobile ? '24px 16px 48px' : '32px 20px 48px'}}>
              {carrito.length === 0 ? (
                <div style={{textAlign:'center',padding:'60px 0'}}>
                  <div style={{fontSize:'48px',marginBottom:'16px'}}>🛒</div>
                  <p style={{color:'#8892a4',fontSize:'16px',fontWeight:'600',margin:'0 0 8px'}}>Tu carrito está vacío</p>
                  <p style={{color:'#4e5a6e',fontSize:'13px',margin:'0 0 24px'}}>Añade boletas desde el listado principal</p>
                  <button onClick={()=>setPaginaActual('inicio')} style={s.botonSubmit}>Ver boletas disponibles</button>
                </div>
              ) : (
                <>
                  {/* Lista de ítems */}
                  {carrito.map(b => {
                    const monB = b.eventos?.moneda || 'COP'
                    const subB = Number(b.precio)
                    const esAdminB = b.publicada_por_admin === true
                    const totB = esAdminB ? subB : Math.round(subB * 1.15 / 1000) * 1000
                    return (
                      <div key={b.id} style={{background:'#0f1623',border:'1px solid #1e2a3a',borderRadius:'14px',padding:'16px 18px',marginBottom:'12px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px'}}>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{color:'#eef0f6',fontWeight:'700',fontSize:'14px',margin:'0 0 4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.eventos?.nombre || 'Evento'}</p>
                            <p style={{color:'#8892a4',fontSize:'12px',margin:'0 0 6px'}}>
                              {b.tribuna}{b.fila ? ` · Fila ${b.fila}` : ''}{b.silla ? ` · Silla ${b.silla}` : ''}
                              {b.plataforma ? <span style={{marginLeft:'6px',background:'rgba(79,126,255,0.1)',color:'#4f7eff',borderRadius:'4px',padding:'1px 6px',fontSize:'11px'}}>{b.plataforma}</span> : null}
                            </p>
                            <p style={{color:'#4f7eff',fontWeight:'700',fontSize:'14px',margin:0}}>{formatearPrecio(totB, monB)}</p>
                          </div>
                          <button onClick={()=>setCarrito(carrito.filter(c=>c.id!==b.id))} style={{background:'transparent',border:'1px solid #1e2a3a',borderRadius:'8px',color:'#6b7280',cursor:'pointer',padding:'6px 10px',fontSize:'12px',whiteSpace:'nowrap',flexShrink:0}}>✕ Quitar</button>
                        </div>
                      </div>
                    )
                  })}

                  {/* Resumen total */}
                  {(() => {
                    const monC = carrito[0]?.eventos?.moneda || 'COP'
                    const subtotalC = carrito.reduce((s, b) => s + Number(b.precio), 0)
                    const totalC = carrito.reduce((s, b) => s + (b.publicada_por_admin === true ? Number(b.precio) : Math.round(Number(b.precio) * 1.15 / 1000) * 1000), 0)
                    return (
                      <div style={{background:'#0f1623',border:'1px solid #1e2a3a',borderRadius:'14px',padding:'20px',marginTop:'8px',marginBottom:'24px'}}>
                        <p style={{color:'#8892a4',fontSize:'11px',fontWeight:'700',letterSpacing:'0.5px',textTransform:'uppercase',margin:'0 0 14px'}}>Resumen</p>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                          <span style={{color:'#8892a4',fontSize:'14px'}}>{carrito.length} {carrito.length===1?'boleta':'boletas'}</span>
                          <span style={{color:'#eef0f6',fontSize:'14px',fontWeight:'600'}}>{formatearPrecio(totalC, monC)}</span>
                        </div>

                        <div style={{borderTop:'1px solid #1e2a3a',paddingTop:'14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{color:'#eef0f6',fontSize:'16px',fontWeight:'800'}}>Total</span>
                          <span style={{color:'#4f7eff',fontSize:'22px',fontWeight:'800'}}>{formatearPrecio(totalC, monC)}</span>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Avisos de plataformas */}
                  {[...new Set(carrito.filter(b=>b.plataforma&&PLATAFORMAS[b.plataforma]).map(b=>b.plataforma))].map(plat => (
                    <div key={plat} style={{background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.18)',borderRadius:'12px',padding:'14px 16px',marginBottom:'12px'}}>
                      <p style={{color:'#f59e0b',fontSize:'13px',fontWeight:'700',margin:'0 0 8px'}}>📲 Para recibir tu boleta en {plat}:</p>
                      {PLATAFORMAS[plat].pasosComprador ? (
                        <ol style={{color:'#8892a4',fontSize:'12px',margin:'0 0 8px',paddingLeft:'16px',lineHeight:1.8}}>
                          {PLATAFORMAS[plat].pasosComprador.map((paso, i) => <li key={i}>{paso}</li>)}
                        </ol>
                      ) : (
                        <p style={{color:'#8892a4',fontSize:'12px',margin:'0 0 8px',lineHeight:1.5}}>{PLATAFORMAS[plat].instrComprador}</p>
                      )}
                      {PLATAFORMAS[plat].requisitoReceptor && (
                        <div style={{background:'rgba(245,158,11,0.1)',borderRadius:'6px',padding:'8px 10px'}}>
                          <p style={{color:'#f59e0b',fontSize:'11px',margin:'0',lineHeight:1.5}}>⚠️ {PLATAFORMAS[plat].requisitoReceptor}</p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Campo de entrega */}
                  {[...new Set(carrito.filter(b=>b.plataforma&&PLATAFORMAS[b.plataforma]).map(b=>b.plataforma))].length > 0 && (
                    <div style={{background:'rgba(79,126,255,0.06)',border:'1px solid rgba(79,126,255,0.2)',borderRadius:'12px',padding:'14px 16px',marginBottom:'16px'}}>
                      <p style={{color:'#6b93ff',fontSize:'13px',fontWeight:'700',margin:'0 0 12px'}}>📋 ¿Dónde te enviamos tu boleta?</p>
                      {[...new Set(carrito.filter(b=>b.plataforma&&PLATAFORMAS[b.plataforma]).map(b=>b.plataforma))].map(plat => {
                        const tipo = PLATAFORMAS[plat]?.tipoEntrega
                        return (
                          <div key={plat} style={{marginBottom:'10px'}}>
                            <label style={{color:'#8892a4',fontSize:'12px',fontWeight:'600',display:'block',marginBottom:'6px'}}>
                              {tipo === 'email' ? `📧 Tu correo registrado en ${plat}` : `🪪 Tu número de documento registrado en ${plat}`}
                            </label>
                            <input
                              type={tipo === 'email' ? 'email' : 'text'}
                              placeholder={tipo === 'email' ? 'correo@ejemplo.com' : 'Ej: 1234567890'}
                              value={datosEntrega[plat] || ''}
                              onChange={e => setDatosEntrega(prev => ({...prev, [plat]: e.target.value}))}
                              style={{width:'100%',background:'#080b12',border:'1px solid #1e2a3a',borderRadius:'8px',padding:'10px 12px',color:'#eef0f6',fontSize:'13px',boxSizing:'border-box',outline:'none'}}
                            />
                          </div>
                        )
                      })}
                      <p style={{color:'#4e5a6e',fontSize:'11px',margin:'4px 0 0',lineHeight:1.5}}>Boletería CO transferirá tu boleta a este dato registrado en la app.</p>
                    </div>
                  )}

                  <button
                    onClick={manejarCompraCarrito}
                    disabled={comprando === 'carrito'}
                    style={{...s.botonSubmit,fontSize:'16px',padding:'15px',background:comprando==='carrito'?'#2d3a55':'#4f7eff',cursor:comprando==='carrito'?'not-allowed':'pointer',marginTop:'4px'}}
                  >
                    {comprando === 'carrito' ? '⏳ Procesando...' : `💳 Pagar ${carrito.length > 1 ? carrito.length + ' boletas' : ''}`}
                  </button>
                  <div style={{marginTop:'16px',borderTop:'1px solid #111d2b',paddingTop:'14px'}}>
                    <p style={{color:'#4e5a6e',fontSize:'10px',textAlign:'center',margin:'0 0 12px',letterSpacing:'0.5px',textTransform:'uppercase',fontWeight:'600'}}>Pagos procesados por Wompi</p>
                    {/* Tarjeta */}
                    <div style={{marginBottom:'10px'}}>
                      <p style={{color:'#4e5a6e',fontSize:'10px',fontWeight:'600',margin:'0 0 5px',letterSpacing:'0.3px'}}>Tarjeta débito o crédito</p>
                      <div style={{display:'flex',gap:'5px',alignItems:'center'}}>
                        <svg width="36" height="22" viewBox="0 0 36 22" xmlns="http://www.w3.org/2000/svg" style={{borderRadius:'4px',background:'#0f1623',border:'1px solid #1e2a3a'}}>
                          <circle cx="13" cy="11" r="7" fill="#EB001B"/>
                          <circle cx="23" cy="11" r="7" fill="#F79E1B"/>
                          <path d="M18 4.8A7 7 0 0 1 23 11a7 7 0 0 1-5 6.2A7 7 0 0 1 13 11a7 7 0 0 1 5-6.2z" fill="#FF5F00"/>
                        </svg>
                        <div style={{background:'#1A1F71',borderRadius:'4px',padding:'3px 7px',height:'22px',display:'flex',alignItems:'center'}}>
                          <span style={{color:'white',fontSize:'12px',fontWeight:'900',fontStyle:'italic',letterSpacing:'-0.5px'}}>VISA</span>
                        </div>
                        <div style={{background:'#016FD0',borderRadius:'4px',padding:'3px 7px',height:'22px',display:'flex',alignItems:'center'}}>
                          <span style={{color:'white',fontSize:'10px',fontWeight:'800',letterSpacing:'0.5px'}}>AMEX</span>
                        </div>
                      </div>
                    </div>
                    {/* Transferencia */}
                    <div style={{marginBottom:'10px'}}>
                      <p style={{color:'#4e5a6e',fontSize:'10px',fontWeight:'600',margin:'0 0 5px',letterSpacing:'0.3px'}}>Transferencia</p>
                      <div style={{display:'flex',flexWrap:'wrap',gap:'5px',alignItems:'center'}}>
                        <div style={{background:'#FDDA24',borderRadius:'4px',padding:'3px 7px',height:'22px',display:'flex',alignItems:'center'}}>
                          <span style={{color:'#111',fontSize:'9px',fontWeight:'800'}}>Bancolombia</span>
                        </div>
                        <div style={{background:'#0f1623',borderRadius:'4px',padding:'3px 7px',height:'22px',display:'flex',alignItems:'center',border:'1px solid #1e2a3a'}}>
                          <span style={{color:'#FF0080',fontSize:'11px',fontWeight:'900',letterSpacing:'-0.3px'}}>Nequi</span>
                        </div>
                        <div style={{background:'#003DA5',borderRadius:'4px',padding:'3px 7px',height:'22px',display:'flex',alignItems:'center'}}>
                          <span style={{color:'white',fontSize:'10px',fontWeight:'800',letterSpacing:'1px'}}>PSE</span>
                        </div>
                        <div style={{background:'#E40046',borderRadius:'4px',padding:'3px 7px',height:'22px',display:'flex',alignItems:'center'}}>
                          <span style={{color:'white',fontSize:'9px',fontWeight:'800'}}>Daviplata</span>
                        </div>
                      </div>
                    </div>
                    {/* Crédito */}
                    <div>
                      <p style={{color:'#4e5a6e',fontSize:'10px',fontWeight:'600',margin:'0 0 5px',letterSpacing:'0.3px'}}>Paga con crédito</p>
                      <div style={{display:'flex',gap:'5px',alignItems:'center'}}>
                        <div style={{background:'#0f1623',borderRadius:'4px',padding:'3px 7px',height:'22px',display:'flex',alignItems:'center',border:'1px solid #1e2a3a'}}>
                          <span style={{color:'#FF0080',fontSize:'11px',fontWeight:'900',letterSpacing:'-0.3px'}}>Nequi</span>
                        </div>
                        <div style={{background:'#FF6B00',borderRadius:'4px',padding:'3px 7px',height:'22px',display:'flex',alignItems:'center'}}>
                          <span style={{color:'white',fontSize:'9px',fontWeight:'800'}}>Sumas</span>
                        </div>
                      </div>
                    </div>
                    <p style={{color:'#4e5a6e',fontSize:'11px',textAlign:'center',marginTop:'10px',margin:'10px 0 0'}}>🔒 Un solo cargo para todo el carrito</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      {paginaActual === 'privacidad' && (
        <div style={{maxWidth:'720px',margin:'0 auto',padding:'40px 20px 60px'}}>
          <button onClick={()=>setPaginaActual('inicio')} style={{background:'transparent',border:'none',color:'#8892a4',cursor:'pointer',fontSize:'14px',fontWeight:'600',display:'flex',alignItems:'center',gap:'6px',padding:'0 0 28px'}}>← Volver</button>
          <h1 style={{fontSize:'26px',fontWeight:'900',color:'#eef0f6',margin:'0 0 6px'}}>Política de Privacidad</h1>
          <p style={{color:'#4e5a6e',fontSize:'13px',margin:'0 0 36px'}}>Última actualización: septiembre 2026</p>

          {[
            {titulo:'1. Responsable del tratamiento', texto:`Boletería CO (en adelante "la Plataforma"), con dominio boleteriaco.com y correo de contacto soporte@boleteriaco.com, es responsable del tratamiento de los datos personales recopilados a través de este sitio web, en cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013.`},
            {titulo:'2. Datos que recopilamos', texto:`Recopilamos los siguientes datos personales cuando te registras o usas la Plataforma:
• Nombre completo
• Correo electrónico
• Información de pago procesada por Wompi (no almacenamos datos de tarjetas)
• Historial de compras y ventas de boletas
• Dirección IP y datos de sesión para fines de seguridad`},
            {titulo:'3. Finalidad del tratamiento', texto:`Tus datos se utilizan exclusivamente para:
• Crear y gestionar tu cuenta en la Plataforma
• Procesar transacciones de compra y venta de boletas
• Enviarte confirmaciones y comprobantes de pago
• Prevenir fraude y garantizar la seguridad de las transacciones
• Cumplir obligaciones legales y tributarias`},
            {titulo:'4. Base legal', texto:`El tratamiento de tus datos se realiza con base en el consentimiento que otorgas al registrarte en la Plataforma, así como en la necesidad de ejecutar el contrato de compraventa de boletas que celebras a través de ella.`},
            {titulo:'5. Transferencia de datos', texto:`Tus datos pueden compartirse con:
• Wompi (pasarela de pagos), para procesar transacciones
• Supabase (proveedor de infraestructura), que almacena los datos en servidores con altos estándares de seguridad

No vendemos ni cedemos tus datos personales a terceros con fines comerciales.`},
            {titulo:'6. Derechos del titular', texto:`De conformidad con la Ley 1581 de 2012, tienes derecho a:
• Conocer, actualizar y rectificar tus datos
• Solicitar prueba de la autorización otorgada
• Ser informado sobre el uso dado a tus datos
• Revocar la autorización y solicitar la supresión de tus datos
• Acceder gratuitamente a tus datos personales

Para ejercer estos derechos, escríbenos a soporte@boleteriaco.com.`},
            {titulo:'7. Conservación de datos', texto:`Conservamos tus datos mientras mantengas una cuenta activa en la Plataforma o mientras sea necesario para cumplir obligaciones legales. Si solicitas la eliminación de tu cuenta, eliminaremos tus datos personales en un plazo de 30 días hábiles, salvo los que debamos conservar por obligación legal.`},
            {titulo:'8. Seguridad', texto:`Implementamos medidas técnicas y organizativas para proteger tus datos contra accesos no autorizados, pérdida o destrucción, incluyendo cifrado en tránsito (HTTPS) y control de acceso a bases de datos.`},
            {titulo:'9. Cambios a esta política', texto:`Podemos actualizar esta política en cualquier momento. Te notificaremos por correo electrónico si los cambios son significativos. El uso continuado de la Plataforma tras la notificación implica tu aceptación.`},
            {titulo:'10. Contacto', texto:`Para cualquier consulta sobre esta política o el tratamiento de tus datos, contáctanos en:
soporte@boleteriaco.com`},
          ].map(({titulo, texto}) => (
            <div key={titulo} style={{marginBottom:'28px'}}>
              <h2 style={{fontSize:'16px',fontWeight:'800',color:'#eef0f6',margin:'0 0 10px'}}>{titulo}</h2>
              <p style={{fontSize:'14px',color:'#8892a4',lineHeight:'1.75',margin:0,whiteSpace:'pre-line'}}>{texto}</p>
            </div>
          ))}

          {faqFooterSeccion}
        </div>
      )}


      {/* ── Modal Documento (antes de mostrar QR Bold) ── */}
      {docModal && (
        <div style={{position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{background:'#0f1623',border:'1px solid #1e2a3a',borderRadius:'16px',padding:'32px 28px',width:'100%',maxWidth:'360px'}}>
            <h3 style={{color:'#eef0f6',fontSize:'18px',fontWeight:'900',margin:'0 0 6px'}}>📱 Pagar con Bre-B</h3>
            <p style={{color:'#8892a4',fontSize:'13px',margin:'0 0 24px',lineHeight:'1.5'}}>Necesitamos tu documento para generar el QR de pago de acuerdo con las normas de Bancolombia.</p>
            <label style={{display:'block',color:'#8892a4',fontSize:'12px',fontWeight:'700',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Número de documento</label>
            <input
              type="number"
              value={documentoInput}
              onChange={e => setDocumentoInput(e.target.value)}
              placeholder="Ej: 1234567890"
              onKeyDown={e => { if (e.key === 'Enter' && documentoInput.trim().length >= 6) {
                if (docModal.tipo === 'carrito') iniciarBoldCarrito(documentoInput.trim())
                else iniciarBold(docModal.boleta, documentoInput.trim())
              }}}
              style={{width:'100%',boxSizing:'border-box',background:'#080b12',border:'1px solid #2d3f55',borderRadius:'8px',padding:'11px 14px',color:'#eef0f6',fontSize:'15px',outline:'none',marginBottom:'16px'}}
            />
            <button
              onClick={() => {
                if (documentoInput.trim().length < 6) { return }
                if (docModal.tipo === 'carrito') iniciarBoldCarrito(documentoInput.trim())
                else iniciarBold(docModal.boleta, documentoInput.trim())
              }}
              disabled={documentoInput.trim().length < 6}
              style={{width:'100%',background:documentoInput.trim().length < 6?'#1a2a1a':'#064e3b',border:'1px solid #065f46',borderRadius:'10px',padding:'13px',color:'#fff',fontSize:'15px',fontWeight:'700',cursor:documentoInput.trim().length < 6?'not-allowed':'pointer',marginBottom:'10px'}}
            >
              Generar QR →
            </button>
            <button
              onClick={() => { setCedModal(null); setDocumentoInput('') }}
              style={{width:'100%',background:'transparent',border:'none',color:'#4e5a6e',fontSize:'13px',cursor:'pointer',padding:'6px'}}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Modal QR Bre-B ── */}
      {qrModal && (
        <div style={{position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.92)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{background:'#0f1623',border:'1px solid #065f46',borderRadius:'16px',padding:'28px 24px',width:'100%',maxWidth:'380px',textAlign:'center'}}>
            <h3 style={{color:'#4ade80',fontSize:'18px',fontWeight:'900',margin:'0 0 4px'}}>📱 Escanea con tu app bancaria</h3>
            <p style={{color:'#8892a4',fontSize:'13px',margin:'0 0 20px'}}>Abre tu app del banco → Bre-B → Escanear QR</p>
            <div style={{background:'#fff',borderRadius:'12px',padding:'16px',display:'inline-block',marginBottom:'16px'}}>
              <img
                src={`data:image/png;base64,${qrModal.qr}`}
                alt="QR Bre-B"
                style={{width:'200px',height:'200px',display:'block'}}
              />
            </div>
            <p style={{color:'#8892a4',fontSize:'12px',margin:'0 0 4px'}}>Referencia: <span style={{color:'#eef0f6',fontWeight:'700'}}>{qrModal.referencia}</span></p>
            <p style={{color:'#4e5a6e',fontSize:'12px',margin:'0 0 20px'}}>El QR expira en 10 minutos · Verificando pago automáticamente...</p>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginBottom:'20px'}}>
              <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#4ade80',animation:'pulse 1.5s infinite'}}/>
              <span style={{color:'#4ade80',fontSize:'13px',fontWeight:'600'}}>Esperando pago...</span>
            </div>
            <button
              onClick={() => setQrModal(null)}
              style={{background:'transparent',border:'1px solid #1e2a3a',borderRadius:'8px',padding:'8px 20px',color:'#4e5a6e',fontSize:'13px',cursor:'pointer'}}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

        {/* SECCIÓN DE SEGURIDAD */}
        <div style={{maxWidth:'720px',margin:'0 auto',padding:'40px 20px 0'}}>
          <h3 style={{color:'#eef0f6',fontSize:'18px',fontWeight:'800',textAlign:'center',margin:'0 0 6px',letterSpacing:'-0.3px'}}>¿Por qué confiar en Boletería CO?</h3>
          <p style={{color:'#8892a4',fontSize:'13px',textAlign:'center',margin:'0 0 24px'}}>Tu dinero y tu boleta están protegidos en cada compra</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'10px'}}>
            {[
              {icon:'🔒', title:'Custodia de pago', desc:'Tu dinero queda retenido hasta que recibas tu boleta y confirmes la entrega.'},
              {icon:'✅', title:'Vendedores verificados', desc:'Solo vendemos boletas de usuarios con cuenta real. Sin intermediarios desconocidos.'},
              {icon:'📲', title:'Solo cesión oficial', desc:'Transferencias directas desde TuBoletaPass, Quentro, W Arena y DIM Plus. Sin capturas ni PDFs.'},
              {icon:'🛟', title:'Soporte garantizado', desc:'Si algo falla, te ayudamos. Escríbenos a boletas@boleteriaco.com.'},
            ].map(({icon,title,desc}) => (
              <div key={title} style={{background:'#0f1623',border:'1px solid #1e2a3a',borderRadius:'12px',padding:'16px'}}>
                <div style={{fontSize:'26px',marginBottom:'8px'}}>{icon}</div>
                <p style={{color:'#eef0f6',fontWeight:'700',fontSize:'13px',margin:'0 0 6px'}}>{title}</p>
                <p style={{color:'#8892a4',fontSize:'12px',margin:'0',lineHeight:1.6}}>{desc}</p>
              </div>
            ))}
          </div>
        </div>


      {/* ── Preguntas frecuentes ── */}
      <section style={{maxWidth:'680px',margin:'0 auto 48px',padding:'0 4px'}}>
          <h2 style={{color:'#eef0f6',fontSize:'20px',fontWeight:'900',textAlign:'center',margin:'0 0 24px',letterSpacing:'-0.3px'}}>Preguntas frecuentes</h2>
          {[
            {
              q: '¿Cómo sé que no me estafan?',
              a: 'Tu dinero queda en custodia con Boletería CO hasta que tú confirmes que recibiste la boleta. Solo después de tu confirmación el vendedor cobra. Si algo sale mal, nosotros respondemos.'
            },
            {
              q: '¿Cómo llega la boleta?',
              a: 'Depende de la plataforma: en TuBoletaPass y Quentro te la transferimos por correo electrónico; en W Arena y DIM Plus por número de documento. Antes de pagar te mostramos exactamente los pasos.'
            },
            {
              q: '¿Cuánto demora?',
              a: 'En la mayoría de casos menos de 24 horas. Cuando tu pago se confirma, el vendedor recibe una notificación inmediata para transferirte la boleta.'
            },
            {
              q: '¿Cuánto cobra Boletería CO?',
              a: 'Al comprador se le suma aproximadamente un 15% sobre el precio publicado (redondeado a los $1.000 más cercanos). Al vendedor se le retiene un 8% del precio de venta. Sin cobros ocultos.'
            },
          ].map(({ q, a }, i) => (
            <div key={i} style={{borderBottom:'1px solid #1e2a3a',overflow:'hidden'}}>
              <button
                onClick={() => setFaqAbierto(faqAbierto === i ? null : i)}
                style={{width:'100%',background:'none',border:'none',padding:'16px 0',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',gap:'12px'}}
              >
                <span style={{color:'#eef0f6',fontSize:'15px',fontWeight:'700',textAlign:'left',lineHeight:'1.4'}}>{q}</span>
                <span style={{color:'#4f7eff',fontSize:'18px',flexShrink:0,transition:'transform 0.2s',transform:faqAbierto===i?'rotate(45deg)':'rotate(0deg)'}}>+</span>
              </button>
              {faqAbierto === i && (
                <p style={{color:'#8892a4',fontSize:'14px',lineHeight:'1.7',margin:'0 0 16px',paddingRight:'32px'}}>{a}</p>
              )}
            </div>
          ))}
      </section>
      <footer style={{borderTop:'1px solid #1e2a3a', marginTop:'48px', paddingTop:'28px', paddingBottom:'32px', textAlign:'center'}}>
        <p style={{color:'#4e5a6e', fontSize:'13px', margin:'0 0 8px', fontWeight:'700', letterSpacing:'-0.2px'}}>Boletería <span style={{color:'#4f7eff'}}>CO</span></p>
        <p style={{color:'#4e5a6e', fontSize:'12px', margin:0}}>© 2026 · <a href='/terminos.html' target='_blank' style={{color:'#8892a4', textDecoration:'none'}}>Términos y condiciones</a> · <button onClick={()=>setPaginaActual('privacidad')} style={{background:'none',border:'none',color:'#8892a4',cursor:'pointer',fontSize:'12px',padding:0,textDecoration:'none'}}>Política de privacidad</button> · soporte@boleteriaco.com</p>
      </footer>
      </div>
    </div>
  )
}

export default App
