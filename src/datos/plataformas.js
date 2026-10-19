// Plataformas de boletería: cómo transfiere el vendedor y cómo recibe el comprador

export const PLATAFORMAS = {
  'TuBoletaPass': {
    uso: 'Santa Fe, América, Llaneros, Tolima y conciertos vendidos por TuBoleta',
    equipos: ['santa fe','america','llaneros','tolima'],
    color: '#e85d04',
    instrVendedor: 'Abre TuBoletaPass → Mis entradas → selecciona la boleta → Enviar Entrada → ingresa boletas@boleteriaco.com.',
    instrComprador: 'Descarga TuBoletaPass en App Store o Google Play. Regístrate con tu documento y correo. Boletería CO te transferirá la boleta; aparecerá en "Mis entradas".',
    tipoEntrega: 'email',
    requisitoReceptor: 'La persona que recibe la entrada debe tener una cuenta activa y registrada previamente en la App Tuboleta Pass.',
    notaVendedor: 'El destinatario recibirá un correo con instrucciones para aceptar la entrada en su cuenta de Tuboleta Pass. Si aún no ha aceptado la boleta, puedes cancelar la transferencia desde el menú principal en la opción "Pendiente".',
    emailAdmin: 'boletas@boleteriaco.com',
    pasosVendedor: [
      'Abre la aplicación Tuboleta Pass en tu celular.',
      'Entra a la sección "Mis entradas" y selecciona el evento deseado.',
      'Haz clic en la boleta que deseas transferir.',
      'Toca el botón "Enviar Entrada" ubicado en la parte inferior.',
      'Escribe el correo electrónico: boletas@boleteriaco.com.',
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
    uso: 'Millonarios, Atlético Nacional',
    equipos: ['millonarios','nacional','atletico nacional'],
    color: '#2563eb',
    instrVendedor: 'Abre Quentro → Mis Entradas → selecciona la entrada → icono de flecha → ingresa boletas@boleteriaco.com.',
    instrComprador: 'Descarga Quentro en App Store o Google Play. Regístrate con tu correo y número de documento. Boletería CO te transferirá la entrada; recibirás una notificación en la app.',
    tipoEntrega: 'email',
    requisitoReceptor: 'La persona que recibe la entrada debe tener una cuenta activa y registrada previamente en la App Quentro.',
    emailAdmin: 'boletas@boleteriaco.com',
    pasosVendedor: [
      'Abre la aplicación: Inicia sesión en Quentro con tu cuenta registrada.',
      'Selecciona la entrada: Entra a "Mis Entradas" y presiona sobre el ticket específico.',
      'Toca la flecha: Haz clic en el icono de la flecha (o botón "transferir" debajo del código QR) en la esquina superior derecha.',
      'Elige el método: Selecciona "Ingresar correo electrónico" e ingresa boletas@boleteriaco.com.',
      'Confirma el envío: Presiona transferir para completar el proceso.',
    ],
    pasosComprador: [
      'Descarga Quentro en App Store o Google Play.',
      'Crea tu cuenta con tu correo y número de documento.',
      'Recibirás una notificación cuando Boletería CO te transfiera la entrada.',
      'Acepta la transferencia desde la app para recibirla.',
    ],
  },
  'Warena': {
    uso: 'Cúcuta, Junior',
    equipos: ['cucuta','junior','atletico junior'],
    color: '#7c3aed',
    instrVendedor: 'Abre W Arena → perfil → entradas → Transferir → ingresa el documento de identidad registrado en la cuenta de boletas@boleteriaco.com.',
    instrComprador: 'Descarga W Arena en App Store o Google Play. Regístrate con tu documento de identidad. Boletería CO te cederá la entrada a tu documento registrado en la app.',
    tipoEntrega: 'documento',
    requisitoReceptor: 'La persona que recibe la entrada debe tener una cuenta activa y registrada previamente en la App W Arena con su documento de identidad.',
    pasosVendedor: [
      'Descarga e ingresa a la aplicación oficial de W Arena en tu celular.',
      'Inicia sesión con los datos de la cuenta con la que realizaste la compra de la boletería o abono.',
      'Busca el evento o la sección de tus entradas almacenadas en el perfil.',
      'Selecciona la opción de transferir entradas.',
      'Ingresa el documento de identidad registrado en la cuenta de Boletería CO para completar el proceso.',
    ],
    pasosComprador: [
      'Descarga W Arena en App Store o Google Play.',
      'Regístrate con tu nombre y documento de identidad.',
      'Boletería CO transferirá la entrada a tu documento registrado en la app.',
      'La entrada aparecerá en tu perfil de W Arena.',
    ],
  },
  'Dim Plus': {
    uso: 'Independiente Medellín',
    equipos: ['independiente medellin','medellin','dim'],
    color: '#dc2626',
    instrVendedor: 'Abre DIM Plus → Mis boletas → Ver boleta → Ceder boleta → llena los datos de la cuenta boletas@boleteriaco.com.',
    instrComprador: 'Descarga DIM Plus en App Store o Google Play. Regístrate con tus datos exactos (nombre y documento). Boletería CO te cederá la boleta a tus datos registrados.',
    tipoEntrega: 'documento',
    requisitoReceptor: 'La persona que recibe la entrada debe tener una cuenta activa y registrada previamente en la App DIM Plus.',
    notaVendedor: 'Condiciones importantes: máximo 3 cesiones por boleta · la cuenta del receptor debe estar activa y registrada previamente · no se permiten descargas en PDF, capturas ni imágenes QR (código dinámico).',
    pasosVendedor: [
      'Entra a la App DIM Plus e inicia sesión con tu cuenta.',
      'Dirígete a la sección "Mis boletas".',
      'Selecciona la entrada que deseas transferir y haz clic en "Ver boleta".',
      'Presiona el botón "Ceder boleta".',
      'Llena los datos personales del receptor exactamente como los tiene registrados en su cuenta de la aplicación.',
    ],
    pasosComprador: [
      'Descarga DIM Plus en App Store o Google Play.',
      'Regístrate con tus datos personales exactos (nombre y documento).',
      'Boletería CO cederá la boleta a tus datos registrados.',
      'Importante: no se permiten descargas en PDF ni capturas del QR — el código es dinámico.',
    ],
  },
  'Ticketmaster': {
    uso: 'Conciertos vendidos por Ticketmaster',
    equipos: [],
    color: '#026cdf',
    instrVendedor: 'Abre Ticketmaster → Mis boletos → selecciona el evento → Transferir boletos → ingresa el nombre y el correo boletas@boleteriaco.com.',
    instrComprador: 'Crea tu cuenta en Ticketmaster con tu correo. Boletería CO te transferirá la boleta y te llegará un correo para aceptarla; después aparecerá en "Mis boletos".',
    tipoEntrega: 'email',
    requisitoReceptor: 'La persona que recibe la boleta debe tener una cuenta en Ticketmaster creada con el mismo correo al que se envía la transferencia.',
    notaVendedor: 'Solo se puede transferir si el organizador activó la transferencia para ese evento (si el botón "Transferir" sale en gris, no se puede). Las boletas VIP o con beneficios suelen no ser transferibles, y la opción se cierra unas horas antes del evento.',
    emailAdmin: 'boletas@boleteriaco.com',
    pasosVendedor: [
      'Entra a Ticketmaster (app o web) con la cuenta con la que compraste.',
      'Ve a "Mis boletos" y selecciona el evento.',
      'Toca "Transferir boletos" y elige las boletas que vas a ceder.',
      'Confirma tu identidad con el código que te llega por SMS o correo.',
      'Escribe como destinatario a Boletería CO con el correo boletas@boleteriaco.com y confirma.',
    ],
    pasosComprador: [
      'Crea tu cuenta en Ticketmaster con tu correo electrónico.',
      'Boletería CO te transferirá la boleta a ese correo.',
      'Abre el correo de Ticketmaster y acepta la transferencia; si no la aceptas, la boleta no queda a tu nombre.',
      'La boleta aparecerá en "Mis boletos" de tu cuenta.',
    ],
  },
}

export function sugerirPlataforma(nombreEvento) {
  if (!nombreEvento) return ''
  const lower = nombreEvento.toLowerCase()
  for (const [nombre, data] of Object.entries(PLATAFORMAS)) {
    if (data.equipos.some(eq => lower.includes(eq))) return nombre
  }
  return ''
}
