import { useEffect, useRef } from 'react'
import { FOTOS_ANILLO } from './fotos'

// Anillo 3D de boletas (idea de Motion Sites "Vertex"): las tarjetas viven sobre un
// cilindro con la cámara en su centro y giran despacio. Es decorativo: el listado
// real de eventos está más abajo.
const N = FOTOS_ANILLO.length * 2   // múltiplo de las fotos para que no se repitan vecinas
const PASO = 360 / N
const CORTE = 44          // grados visibles a cada lado del frente
const VELOCIDAD = 2.2     // grados por segundo

export default function AnilloBoletas() {
  const anilloRef = useRef(null)

  useEffect(() => {
    const anillo = anilloRef.current
    if (!anillo) return
    const tarjetas = [...anillo.children]
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)')
    let fase = -PASO / 2
    let ultimo = 0
    let frame = 0
    let visible = true

    function radio() {
      return parseFloat(getComputedStyle(anillo).getPropertyValue('--radio')) || 900
    }

    function pintar() {
      const R = radio()
      tarjetas.forEach((el, i) => {
        const a = (((i * PASO + fase) % 360) + 540) % 360 - 180
        if (Math.abs(a) > CORTE) { el.style.visibility = 'hidden'; return }
        const r = (a * Math.PI) / 180
        const c = Math.cos(r)
        el.style.visibility = 'visible'
        el.style.transform = `translate3d(${R * Math.sin(r)}px,0,${R * (1 - c)}px) rotateY(${-a}deg)`
        el.style.filter = `brightness(${Math.min(1, 1.12 - (1 / c - 1) * 1.4)})`
      })
    }

    function cuadro(t) {
      if (!ultimo) ultimo = t
      const dt = Math.min((t - ultimo) / 1000, 0.1)
      ultimo = t
      fase -= VELOCIDAD * dt
      pintar()
      frame = requestAnimationFrame(cuadro)
    }

    function arrancar() {
      cancelAnimationFrame(frame)
      ultimo = 0
      if (visible && !quieto.matches && !document.hidden) frame = requestAnimationFrame(cuadro)
      else pintar()
    }

    const observador = new IntersectionObserver(([e]) => { visible = e.isIntersecting; arrancar() })
    observador.observe(anillo)
    const alCambiar = () => arrancar()
    document.addEventListener('visibilitychange', alCambiar)
    quieto.addEventListener('change', alCambiar)
    window.addEventListener('resize', pintar)
    arrancar()

    return () => {
      cancelAnimationFrame(frame)
      observador.disconnect()
      document.removeEventListener('visibilitychange', alCambiar)
      quieto.removeEventListener('change', alCambiar)
      window.removeEventListener('resize', pintar)
    }
  }, [])

  return (
    <div className="ini-anillo" ref={anilloRef} aria-hidden="true">
      {Array.from({ length: N }, (_, i) => {
        const f = FOTOS_ANILLO[i % FOTOS_ANILLO.length]
        return (
          <div className="ini-anillo-boleta" key={i}>
            <img src={f.src} alt="" loading={i < 6 ? 'eager' : 'lazy'} decoding="async" style={{ objectPosition: f.pos }} />
            <span className="ini-anillo-talon">
              <span>{f.etiqueta}</span>
              <span className="ini-anillo-serie">Nº {String(1040 + i * 37).padStart(5, '0')}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
