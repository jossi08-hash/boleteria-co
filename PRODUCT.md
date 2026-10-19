# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Dos públicos con el mismo peso:
- **Compradores:** hinchas y público en Colombia que buscan una boleta para un partido de fútbol (y pronto un concierto, obra de teatro, festival o stand-up), con frecuencia desde el celular y cerca de la fecha del evento. Su trabajo: conseguir una boleta real sin que los estafen.
- **Vendedores:** personas que compraron una boleta y no pueden ir. Su trabajo: publicarla rápido, venderla y cobrar sin perseguir a un desconocido.

Existe además un rol de administrador (revisión de publicaciones, liberación de pagos, reclamos) que opera dentro del mismo sitio.

## Product Purpose
Boletería CO es un marketplace de reventa de boletas entre personas en Colombia. Existe para reemplazar la compraventa informal por WhatsApp o Facebook con un intermediario que protege a ambas partes. El éxito es que la boleta llegue al comprador por la app oficial y el vendedor cobre, sin estafas ni discusiones.

## Positioning
Lo que un grupo de WhatsApp o un clasificado no puede ofrecer:
- **Dinero en custodia:** el comprador paga con Wompi y Boletería CO retiene el dinero; el vendedor cobra solo cuando el comprador confirma la entrega o pasan 72 horas sin reclamo.
- **Transferencia oficial:** la boleta se cede a través de la plataforma oficial del evento (TuBoletaPass, Quentro, W Arena, DIM Plus), no se envía un pantallazo.
- **Revisión de publicaciones:** cada boleta se revisa antes de mostrarse.
- **Precio claro:** el comprador ve el total exacto antes de pagar; el vendedor sabe cuánto recibe.

## Operating Context
- Flujo del comprador: busca el evento → elige tribuna en el mapa del estadio → paga con Wompi → recibe la boleta en la app oficial siguiendo pasos específicos por plataforma → confirma en "Mis boletas" o toca "Tengo un problema" antes de 72 h (el pago al vendedor se congela).
- Flujo del vendedor: crea cuenta gratis → publica evento, tribuna, fila/silla y precio → se le notifica la venta → transfiere la boleta a boletas@boleteriaco.com desde la app oficial → cobra por transferencia a la cuenta registrada en su perfil.
- Cada plataforma de boletería tiene requisitos propios para el receptor (cuenta registrada previamente, documento exacto); el sitio los muestra antes de pagar.
- Se comparte mucho por WhatsApp: las páginas de evento tienen URL propia (/evento/:id) y vista previa Open Graph.

## Capabilities and Constraints
- Stack existente: React 19 + Vite, Supabase (auth y datos), funciones serverless en Vercel (/api), pagos y webhooks con Wompi, correos con Resend, Vercel Analytics.
- Rutas: inicio, evento, carrito, mis boletas, mi perfil, cómo funciona, privacidad, login/registro/recuperar, términos (HTML estático en /terminos.html).
- Comisiones: al comprador se le suma aprox. 15% sobre el precio publicado, redondeado a los $1.000; al vendedor se le retiene el 8%. Las boletas publicadas por el administrador no pagan comisión.
- Mapas de estadio interactivos por tribuna y escudos de equipos en SVG.
- Rediseño completo del sitio en curso (octubre 2026): mantener intactos pagos, custodia, reclamos y panel de administración; el cambio es de diseño y estructura, no de reglas de negocio.
- Ampliación decidida: eventos artísticos (conciertos, teatro, festivales, stand-up) con el mismo modelo de reventa, custodia, comisiones y reclamos; no venta directa ni emisión de boletas. Inicio con dos pestañas: Eventos deportivos / Eventos artísticos.
- Pendiente: confirmar que cada plataforma de conciertos permite ceder boletas antes de habilitarla.

## Brand Commitments
- Nombre: **Boletería CO**; dominio boleteriaco.com; logo en public/logo-nav.svg y favicons en public/.
- Idioma: español de Colombia, tuteo, frases directas y concretas ("Tu dinero queda en custodia", "Tengo un problema").
- Contacto: soporte@boleteriaco.com; cuenta receptora de boletas: boletas@boleteriaco.com.
- Instagram @boleteriaco.

## Evidence on Hand
- Copy real de cómo funciona y comisiones en src/ComoFunciona.jsx; términos y condiciones en public/terminos.html (Ley 1581 de 2012, jurisdicción Bogotá).
- Instrucciones reales por plataforma en src/datos/plataformas.js.
- Escudos y colores de equipos colombianos en src/componentes/EscudoSVG.jsx y src/lib/equipos.js; mapas de estadios en src/componentes/MapasEstadios.jsx.
- No hay testimonios, cifras de ventas, número de usuarios ni prensa: no inventarlos.
- Imágenes de eventos artísticos: fotos de artistas permitidas (p. ej. Don Omar, Ryan Castro, Karol G, Iron Maiden, BTS, Dua Lipa), siempre de fuentes con licencia para uso comercial o material de prensa del promotor; nunca fotos tomadas de Google o redes, ni rostros de artistas generados con IA.
- Imágenes de eventos deportivos: fotos de estadio, tribunas, hinchada y ambiente, sin escudos de equipos ni rostros reconocibles de jugadores.

## Product Principles
1. **La confianza se demuestra, no se promete:** cada paso muestra dónde está el dinero y qué pasa después.
2. **Total claro antes de pagar:** sin cobros sorpresa, ni para el comprador ni para el vendedor.
3. **Celular primero:** la compra ocurre en el teléfono, a menudo con prisa y desde un enlace de WhatsApp.
4. **Comprador y vendedor valen igual:** publicar tiene que ser tan fácil y claro como comprar.
5. **Las reglas del negocio no cambian con el diseño:** custodia, 72 h, comisiones y reclamos se respetan siempre.
