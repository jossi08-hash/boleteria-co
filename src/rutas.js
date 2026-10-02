// ── Direcciones (URL) de cada página ──
export const TITULO_BASE = 'Boletería CO'
export const RUTAS = {
  'como-funciona': { url: '/como-funciona', titulo: 'Cómo funciona' },
  'privacidad': { url: '/privacidad', titulo: 'Política de privacidad' },
  'carrito': { url: '/carrito', titulo: 'Carrito' },
  'mis-boletas': { url: '/mis-boletas', titulo: 'Mis boletas', requiereSesion: true },
  'mi-perfil': { url: '/mi-perfil', titulo: 'Mi perfil', requiereSesion: true },
  'login': { url: '/login', titulo: 'Iniciar sesión' },
  'registro': { url: '/registro', titulo: 'Crear cuenta' },
  'recuperar': { url: '/recuperar', titulo: 'Recuperar contraseña' },
}

export function paginaDesdeUrl() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const evento = path.match(/^\/evento\/([^/]+)$/)
  if (evento) return { pagina: 'evento', eventoId: decodeURIComponent(evento[1]) }
  return { pagina: Object.keys(RUTAS).find(k => RUTAS[k].url === path) || 'inicio' }
}

export function urlDePagina(pagina, evento) {
  if (pagina === 'evento') return evento ? `/evento/${encodeURIComponent(evento.eid)}` : null
  return RUTAS[pagina]?.url || '/'
}
