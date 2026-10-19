import { useState } from 'react'
import './estilo/afiche.css'

const PASOS = {
  comprador: [
    { titulo: 'Busca tu evento', desc: 'Explora los partidos disponibles, elige tu tribuna en el mapa del estadio y revisa el precio final antes de pagar.' },
    { titulo: 'Paga seguro', desc: 'Pagas de forma segura con Wompi. Tu dinero queda en custodia con Boletería CO: el vendedor todavía no lo recibe.' },
    { titulo: 'Recibe tu boleta', desc: 'Te transferimos la boleta por la plataforma oficial del evento (TuBoletaPass, Quentro, W Arena o DIM Plus). Antes de pagar te mostramos los pasos exactos.' },
    { titulo: 'Confirma la entrega', desc: 'Cuando la boleta aparezca en tu app, confírmalo en "Mis boletas". Si algo salió mal, toca "Tengo un problema" antes de 72 horas y congelamos el pago al vendedor mientras lo revisamos.' },
  ],
  vendedor: [
    { titulo: 'Publica tu boleta', desc: 'Crea tu cuenta gratis, elige el evento, tu tribuna y el precio. Revisamos cada publicación antes de mostrarla.' },
    { titulo: 'Recibe la venta', desc: 'Cuando alguien compra, te notificamos al instante. El pago del comprador ya está asegurado en custodia.' },
    { titulo: 'Transfiere la boleta', desc: 'Transfiere la boleta a la cuenta de Boletería CO desde la app oficial, siguiendo los pasos que te mostramos para cada plataforma.' },
    { titulo: 'Cobra tu dinero', desc: 'Cuando el comprador confirma (o a las 72 horas sin reclamos), te transferimos el precio de venta menos el 8% de comisión.' },
  ],
}

export default function ComoFunciona({ onVolver, onEmpezar }) {
  const [rol, setRol] = useState('comprador')

  return (
    <div className="cf">
      <div className="af-franja cf-franja">
        <div className="cf-ancho">
          <button className="cf-volver" onClick={onVolver}>← Volver</button>
          <h1 className="af-franja-titulo cf-titulo">Así funciona Boletería CO</h1>
          <p className="cf-bajada">Compra y vende boletas entre personas, con tu dinero protegido hasta que la boleta llega a tus manos.</p>
          <div className="cf-rol" role="tablist" aria-label="Quiero">
            {[['comprador', 'Quiero comprar'], ['vendedor', 'Quiero vender']].map(([id, label]) => (
              <button key={id} role="tab" aria-selected={rol === id} onClick={() => setRol(id)}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="cf-ancho">
        <ol className="cf-pasos">
          {PASOS[rol].map(({ titulo, desc }, i) => (
            <li key={titulo} className="cf-paso">
              <span className="cf-paso-n">{i + 1}</span>
              <div>
                <p className="cf-paso-t">{titulo}</p>
                <p className="cf-paso-d">{desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="cf-comision">
          <p className="cf-comision-t">Comisiones claras</p>
          <p>
            {rol === 'comprador'
              ? 'Al precio publicado se le suma aproximadamente un 15% (redondeado a los $1.000 más cercanos). Ves el total exacto antes de pagar, sin cobros ocultos.'
              : 'Publicar es gratis. Al vender se retiene el 8% del precio de venta y recibes el resto por transferencia a la cuenta que registres en tu perfil.'}
          </p>
        </div>

        {onEmpezar && (
          <button className="cf-empezar" onClick={() => onEmpezar(rol)}>
            {rol === 'comprador' ? 'Ver boletas disponibles' : 'Publicar mi boleta'}
          </button>
        )}

        <p className="cf-dudas">¿Dudas? Escríbenos a <a href="mailto:soporte@boleteriaco.com">soporte@boleteriaco.com</a></p>
      </div>
    </div>
  )
}
