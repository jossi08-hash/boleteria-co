// Datos visuales de cada equipo para su escudo genérico: código de 3 letras, colores y forma.
// Las formas son genéricas (inspiradas en la silueta general del escudo real, no copias):
// clasico, redondeado, punta, corona, circulo, ovalo, ojiva — ver componentes/EscudoSVG.jsx.
// El orden importa: las claves más específicas van primero ("internacional" antes que "nacional",
// "boca" antes que "junior").

const EQUIPOS = [
  // Internacionales primero: "Boca Juniors" no debe tomarse como Junior
  { claves: ['boca'], sigla: 'BOC', colores: ['#0a3d91', '#f5c400'], forma: 'ovalo' },
  { claves: ['river'], sigla: 'RIV', colores: ['#ffffff', '#d0021b'], forma: 'redondeado' },
  { claves: ['flamengo'], sigla: 'FLA', colores: ['#c8102e', '#111111'], forma: 'redondeado' },
  { claves: ['penarol'], sigla: 'PEÑ', colores: ['#f5c400', '#111111'], forma: 'clasico' },
  { claves: ['internacional'], sigla: 'INT', colores: ['#1d3f94', '#ffffff'], forma: 'redondeado' },
  { claves: ['atletico nacional', 'nacional'], sigla: 'NAC', colores: ['#0b7a3e', '#ffffff'], forma: 'punta' },
  { claves: ['millonarios'], sigla: 'MIL', colores: ['#0a3d91', '#ffffff'], forma: 'circulo' },
  { claves: ['santa fe'], sigla: 'SFE', colores: ['#c8102e', '#ffffff'], forma: 'clasico' },
  { claves: ['america'], sigla: 'AME', colores: ['#d0021b', '#ffffff'], forma: 'redondeado' },
  { claves: ['deportivo cali', 'dep. cali'], sigla: 'CAL', colores: ['#0a7d3b', '#ffffff'], forma: 'ovalo' },
  { claves: ['junior'], sigla: 'JUN', colores: ['#d0021b', '#ffffff', '#1f3f9a'], forma: 'redondeado' },
  { claves: ['medellin', 'dim'], sigla: 'DIM', colores: ['#d0021b', '#ffffff', '#1d3f94'], forma: 'corona' },
  { claves: ['once caldas'], sigla: 'ONC', colores: ['#f2f2f2', '#111111'], forma: 'clasico' },
  { claves: ['tolima'], sigla: 'TOL', colores: ['#7a1230', '#f2c14e'], forma: 'punta' },
  { claves: ['bucaramanga'], sigla: 'BUC', colores: ['#f5c400', '#0b6b35'], forma: 'circulo' },
  { claves: ['pasto'], sigla: 'PAS', colores: ['#c8102e', '#f5c400', '#1d3f94'], forma: 'clasico' },
  { claves: ['pereira'], sigla: 'PER', colores: ['#f5c400', '#c8102e'], forma: 'redondeado' },
  { claves: ['envigado'], sigla: 'ENV', colores: ['#f07c00', '#0b6b35'], forma: 'ojiva' },
  { claves: ['aguilas', 'doradas'], sigla: 'AGU', colores: ['#f0a500', '#1a1a1a'], forma: 'punta' },
  { claves: ['fortaleza'], sigla: 'FOR', colores: ['#f07c00', '#ffffff'], forma: 'ojiva' },
  { claves: ['llaneros'], sigla: 'LLA', colores: ['#0b7a3e', '#ffffff', '#f5c400'], forma: 'corona' },
  { claves: ['chico'], sigla: 'CHI', colores: ['#1d3f94', '#ffffff'], forma: 'clasico' },
  { claves: ['cucuta'], sigla: 'CUC', colores: ['#c8102e', '#111111'], forma: 'clasico' },
  { claves: ['union magdalena', 'magdalena'], sigla: 'UNI', colores: ['#1d3f94', '#ffffff', '#c8102e'], forma: 'redondeado' },
]

// Palabras que no sirven para el código (Independiente Santa Fe → SFE, no IND)
const PREFIJOS = new Set(['independiente', 'deportivo', 'atletico', 'club', 'deportes', 'corporacion', 'cd', 'fc', 'cf', 'sc', 'de', 'del', 'la', 'el'])

const normalizar = t => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export function datosEquipo(nombre) {
  const n = normalizar(nombre)
  const equipo = EQUIPOS.find(e => e.claves.some(c => n.includes(c)))
  if (equipo) return equipo
  // Equipo sin datos: azul de la marca, forma clásica y las 3 primeras letras de su palabra principal
  const palabra = n.split(/\s+/).find(w => w.length > 2 && !PREFIJOS.has(w)) || n.replace(/\s+/g, '')
  return { sigla: palabra.slice(0, 3).toUpperCase() || '?', colores: ['#4f7eff', '#ffffff'], forma: 'clasico' }
}

export function extraerEquipos(nombre) {
  const p = (nombre||'').split(/\s+vs\.?\s*/i)
  return p.length>=2 ? [p[0].trim(), p.slice(1).join(' vs ').trim()] : [nombre||'', null]
}
