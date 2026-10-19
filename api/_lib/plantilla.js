// Plantilla de correo con el estilo de afiche de Boletería CO (ver DESIGN.md).
// Todo en tablas y estilos en línea para que se vea igual en Gmail, Outlook y Apple Mail.

const TINTA = '#141311'
const AMARILLO = '#ffe23b'
const PAPEL = '#fbf8ee'
const PAPEL_2 = '#ede7d4'
const FUCSIA = '#d10f6b'
const GRIS = '#5a554a'
const CARTEL = "'Big Shoulders Display','Arial Narrow',Arial,sans-serif"
const TEXTO = "Archivo,Helvetica,Arial,sans-serif"
const SITIO = 'https://boleteriaco.com'

export const escapar = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Datos de la boleta en forma de talón: [['Evento', 'Millonarios vs Nacional'], ...]
export function boleta(filas) {
  const celdas = filas.filter(([, v]) => v).map(([k, v]) => `
    <tr>
      <td style="padding:6px 0;font:600 11px/1.3 ${TEXTO};letter-spacing:.08em;text-transform:uppercase;color:${GRIS};width:110px;vertical-align:top;">${k}</td>
      <td style="padding:6px 0;font:600 15px/1.4 ${TEXTO};color:${TINTA};">${v}</td>
    </tr>`).join('')
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;background:${PAPEL};border:2px dashed rgba(20,19,17,.28);border-radius:14px;">
    <tr><td style="padding:16px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${celdas}</table>
    </td></tr>
  </table>`
}

// Monto destacado (lo que se paga o se recibe)
export function monto(etiqueta, valor, nota = '') {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;background:${AMARILLO};border-radius:14px;">
    <tr><td style="padding:18px 20px;">
      <p style="margin:0 0 6px;font:700 11px/1 ${TEXTO};letter-spacing:.1em;text-transform:uppercase;color:${TINTA};">${etiqueta}</p>
      <p style="margin:0;font:900 40px/1 ${CARTEL};color:${TINTA};">${valor}</p>
      ${nota ? `<p style="margin:10px 0 0;font:500 14px/1.5 ${TEXTO};color:${TINTA};">${nota}</p>` : ''}
    </td></tr>
  </table>`
}

// Aviso de acción requerida o problema, con filete fucsia
export function aviso(titulo, texto = '') {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;border:3px solid ${FUCSIA};border-radius:12px;">
    <tr><td style="padding:14px 18px;">
      <p style="margin:0;font:800 20px/1.1 ${CARTEL};text-transform:uppercase;color:${FUCSIA};">${titulo}</p>
      ${texto ? `<p style="margin:8px 0 0;font:500 14px/1.6 ${TEXTO};color:${TINTA};">${texto}</p>` : ''}
    </td></tr>
  </table>`
}

export const parrafo = html => `<p style="margin:0 0 14px;font:400 16px/1.6 ${TEXTO};color:${TINTA};">${html}</p>`

export const boton = (texto, url) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;">
    <tr><td style="background:${TINTA};border-radius:999px;">
      <a href="${url}" style="display:inline-block;padding:14px 26px;font:700 15px/1 ${TEXTO};color:${AMARILLO};text-decoration:none;">${texto}</a>
    </td></tr>
  </table>`

// Correo completo: franja de tinta con el logo, título de afiche y el contenido sobre papel
export function correo({ titulo, previa = '', contenido, ancho = 560 }) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(titulo)}</title></head>
<body style="margin:0;padding:0;background:${PAPEL_2};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapar(previa)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPEL_2};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${ancho}px;background:${PAPEL};border-radius:18px;overflow:hidden;">
        <tr><td style="background:${TINTA};padding:16px 24px;">
          <a href="${SITIO}" style="text-decoration:none;">
            <img src="${SITIO}/icon-192.png" width="40" height="40" alt="BCO" style="vertical-align:middle;border-radius:8px;border:0;">
            <span style="vertical-align:middle;margin-left:10px;font:800 20px/1 ${CARTEL};text-transform:uppercase;color:#f5f1e4;">Boletería <span style="color:${AMARILLO};">CO</span></span>
          </a>
        </td></tr>
        <tr><td style="background:${AMARILLO};padding:26px 24px 22px;">
          <h1 style="margin:0;font:900 34px/1 ${CARTEL};text-transform:uppercase;color:${TINTA};">${titulo}</h1>
        </td></tr>
        <tr><td style="padding:26px 24px 8px;">${contenido}</td></tr>
        <tr><td style="padding:18px 24px 26px;border-top:1px solid rgba(20,19,17,.12);">
          <p style="margin:0 0 6px;font:500 13px/1.6 ${TEXTO};color:${GRIS};">¿Dudas? Escríbenos a <a href="mailto:soporte@boleteriaco.com" style="color:${TINTA};font-weight:700;">soporte@boleteriaco.com</a></p>
          <p style="margin:0;font:500 12px/1.6 ${TEXTO};color:${GRIS};">Boletería CO · Reventa segura de boletas en Colombia · <a href="${SITIO}" style="color:${GRIS};">boleteriaco.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}
