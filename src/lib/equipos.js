// Colores y nombres de equipos a partir del nombre del evento

export function coloresEquipo(nombre) {
  const n = (nombre||'').toLowerCase()
  if (n.includes('santa fe')) return ['#c8102e','#ffffff']
  if (n.includes('millonarios')) return ['#003fa0','#b8d4f5']
  if (n.includes('atletico nacional')||(n.includes('nacional')&&!n.includes('santa'))) return ['#006400','#ffffff']
  if (n.includes('america')||n.includes('américa')) return ['#dd0000','#ffffff']
  if (n.includes('aguilas')||n.includes('águilas')||n.includes('doradas')) return ['#f0a500','#1a1a1a']
  if (n.includes('junior')) return ['#cc0000','#f5c518']
  if (n.includes('medellin')||n.includes('medellín')||n.includes('dim')) return ['#cc0000','#ffffff']
  if (n.includes('deportivo cali')||n.includes('dep. cali')) return ['#006400','#ffffff']
  if (n.includes('tolima')) return ['#cc0000','#1a1a1a']
  if (n.includes('cucuta')||n.includes('cúcuta')) return ['#1a1a1a','#f0f0f0']
  if (n.includes('peñarol')) return ['#f5c518','#1a1a1a']
  if (n.includes('boca')) return ['#003fa0','#f5c518']
  if (n.includes('river')) return ['#cc0000','#f0f0f0']
  if (n.includes('flamengo')) return ['#cc0000','#1a1a1a']
  return ['#4f7eff','#ffffff']
}
export function extraerEquipos(nombre) {
  const p = (nombre||'').split(/\s+vs\.?\s*/i)
  return p.length>=2 ? [p[0].trim(), p.slice(1).join(' vs ').trim()] : [nombre||'', null]
}
