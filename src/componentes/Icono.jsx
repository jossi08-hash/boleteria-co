// Íconos de línea (trazo de 1.75px, 24×24) en el color que reciban por `color`
const TRAZOS = {
  candado: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  escudo: <><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></>,
  celular: <><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /><path d="M10 9l2-2 2 2M12 7v6" /></>,
  inicio: <><path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" /></>,
  ayuda: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3" /><path d="M12 16.8h.01" /></>,
  mas: <><path d="M12 5v14M5 12h14" /></>,
  boleta: <><path d="M4 7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4z" /><path d="M14 6v12" strokeDasharray="2 2" /></>,
  perfil: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.2-3.5 3.8-5.5 7-5.5s5.8 2 7 5.5" /></>,
  carrito: <><path d="M3 4h2.5l2.2 11h10.6L20.5 8H7" /><circle cx="9.5" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /></>,
  ajustes: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" /></>,
  cerrar: <><path d="M6 6l12 12M18 6L6 18" /></>,
  soporte: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="M5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9" /></>,
}

export default function Icono({ nombre, size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRAZOS[nombre]}
    </svg>
  )
}
