// Datos de prueba SOLO para desarrollo: abre http://localhost:5173/?demo para ver el
// inicio con eventos. Nunca se usan en producción (ver App.jsx).
const dias = n => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA')
const ev = (id, nombre, ciudad, estadio, n, hora, deporte = 'Futbol') =>
  ({ id, nombre, ciudad, estadio, fecha: dias(n), hora, deporte, moneda: 'COP' })

export const EVENTOS_DEMO = !import.meta.env.DEV ? [] : [
  ev('d1', 'Millonarios vs Atlético Nacional', 'Bogotá', 'El Campín', 6, '19:30:00'),
  ev('d2', 'Independiente Santa Fe vs América de Cali', 'Bogotá', 'El Campín', 9, '17:00:00'),
  ev('d3', 'Junior vs Deportivo Cali', 'Barranquilla', 'Metropolitano', 12, '20:00:00'),
  ev('d4', 'Independiente Medellín vs Once Caldas', 'Medellín', 'Atanasio Girardot', 15, '18:15:00'),
  ev('d5', 'Karol G — Tropicoqueta Tour', 'Medellín', 'Atanasio Girardot', 30, '20:00:00', 'Concierto'),
]

const b = (id, evento, precio, tribuna) => ({ id, estado: 'publicada', evento_id: evento.id, precio, tribuna, eventos: evento })
export const BOLETAS_DEMO = !import.meta.env.DEV ? [] : [
  b('b1', EVENTOS_DEMO[0], 160000, 'Oriental'),
  b('b2', EVENTOS_DEMO[0], 210000, 'Occidental'),
  b('b3', EVENTOS_DEMO[1], 95000, 'Norte'),
  b('b4', EVENTOS_DEMO[2], 120000, 'Oriental'),
  b('b5', EVENTOS_DEMO[4], 450000, 'General'),
]
