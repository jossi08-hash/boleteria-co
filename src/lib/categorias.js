// Categorías de evento (columna `deporte` de la tabla eventos)
export const DEPORTES = ['Futbol', 'Baloncesto', 'Tenis', 'Ciclismo', 'Otro']
export const ARTISTICOS = ['Concierto', 'Teatro', 'Festival', 'Stand-up']

const normalizar = t => (t || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const CLAVES_ARTISTICAS = new Set([...ARTISTICOS.map(normalizar), 'standup', 'comedia', 'musica'])

export const esArtistico = (deporte) => CLAVES_ARTISTICAS.has(normalizar(deporte))
