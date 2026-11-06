/**
 * Hoja del socio · Boletería CO
 * Sincroniza la disponibilidad de las boletas propias con boleteriaco.com.
 *
 * Pestañas:
 *   Por cantidad  → partidos y conciertos sin silla: se cambia el número de "Quedan".
 *   Numeradas     → Santa Fe, Millonarios, Nacional, Medellín, América y Selección de locales: una fila por silla.
 *   Eventos       → la llena el script; no se edita.
 *
 * Instalación: ver LEEME.md en esta misma carpeta.
 */

const API_URL = 'https://www.boleteriaco.com/api/hoja-socio'
const T_CANT = 'Por cantidad'
const T_NUM = 'Numeradas'
const T_EV = 'Eventos'
const ESTADOS = ['Disponible', 'Vendida por fuera', 'Retirada']

// Solo si el script se creó como proyecto aparte (no desde Extensiones → Apps Script de la hoja):
// el id de la hoja, lo que va entre /d/ y /edit en su enlace.
const HOJA_ID = ''

function libro() {
  return SpreadsheetApp.getActive() || SpreadsheetApp.openById(HOJA_ID)
}

function interfaz() {
  try { return SpreadsheetApp.getUi() } catch (e) { return null }
}

// Columnas (1 = A)
const C = { evento: 1, tribuna: 2, precio: 3, plataforma: 4, quedan: 5, vendidas: 6, pagando: 7, aviso: 8, base: 9 }
const N = { evento: 1, tribuna: 2, fila: 3, silla: 4, precio: 5, plataforma: 6, estado: 7, web: 8, aviso: 9 }

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Boletería CO')
    .addItem('Sincronizar ahora', 'sincronizar')
    .addItem('Actualizar lista de eventos', 'actualizarEventos')
    .addSeparator()
    .addItem('Configurar (solo la primera vez)', 'configurar')
    .addToUi()
}

// ---------- Configuración ----------

function configurar() {
  // La clave se pide aquí si se corre desde el menú de la hoja. Si no, se guarda a mano en
  // Configuración del proyecto → Propiedades de la secuencia de comandos → TOKEN.
  const ui = interfaz()
  if (ui) {
    const r = ui.prompt('Clave de Boletería CO', 'Pega la clave que te pasó Boletería CO (SHEET_SYNC_TOKEN):', ui.ButtonSet.OK_CANCEL)
    if (r.getSelectedButton() !== ui.Button.OK || !r.getResponseText().trim()) return
    PropertiesService.getScriptProperties().setProperty('TOKEN', r.getResponseText().trim())
  }
  if (!PropertiesService.getScriptProperties().getProperty('TOKEN')) {
    throw new Error('Falta la clave: Configuración del proyecto → Propiedades de la secuencia de comandos → agrega TOKEN')
  }

  const ss = libro()
  prepararPestana(ss, T_CANT, ['Evento', 'Tribuna', 'Precio', 'Plataforma', 'Quedan', 'Vendidas en la web', 'Pagando ahora', 'Aviso', 'base'],
    [C.vendidas, C.pagando, C.aviso], C.base)
  prepararPestana(ss, T_NUM, ['Evento', 'Tribuna', 'Fila', 'Silla', 'Precio', 'Plataforma', 'Estado', 'En la web', 'Aviso'],
    [N.web, N.aviso], null)
  const num = ss.getSheetByName(T_NUM)
  num.getRange(2, N.estado, 1000).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).setAllowInvalid(false).build())
  const gris = num.getRange('A2:I1000')
  num.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=LEFT($H2,7)="Vendida"')
      .setBackground('#eeeeee').setFontColor('#888888').setRanges([gris]).build(),
  ])
  const ev = ss.getSheetByName(T_EV) || ss.insertSheet(T_EV)
  ss.getSheets().forEach(h => { if (/^(Hoja|Sheet) ?1$/.test(h.getName()) && h.getLastRow() === 0) ss.deleteSheet(h) })
  ev.protect().setWarningOnly(true)

  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t))
  ScriptApp.newTrigger('alEditar').forSpreadsheet(ss).onEdit().create()
  ScriptApp.newTrigger('sincronizar').timeBased().everyMinutes(1).create()
  ScriptApp.newTrigger('actualizarEventos').timeBased().everyHours(6).create()
  // proyecto aparte: el menú de la hoja se agrega con un activador de apertura
  if (!SpreadsheetApp.getActive()) ScriptApp.newTrigger('onOpen').forSpreadsheet(ss).onOpen().create()

  actualizarEventos()
  sincronizar()
  const listo = 'Listo. La hoja se sincroniza sola cada minuto y cada vez que editas una fila.'
  if (ui) ui.alert(listo); else Logger.log(listo)
}

function prepararPestana(ss, nombre, titulos, columnasSistema, columnaOculta) {
  const h = ss.getSheetByName(nombre) || ss.insertSheet(nombre)
  h.getRange(1, 1, 1, titulos.length).setValues([titulos]).setFontWeight('bold').setBackground('#141311').setFontColor('#ffe23b')
  h.setFrozenRows(1)
  columnasSistema.forEach(c => {
    h.getRange(1, c, 1000).setBackground('#f6f6f6')
    h.getRange(1, c).setBackground('#141311')
    const p = h.getRange(2, c, 999).protect().setDescription('La llena el sistema')
    p.setWarningOnly(true)
  })
  if (columnaOculta) h.hideColumns(columnaOculta)
  h.autoResizeColumns(1, titulos.length)
}

// ---------- Eventos ----------

function api(method, payload) {
  const token = PropertiesService.getScriptProperties().getProperty('TOKEN')
  if (!token) throw new Error('Falta configurar la clave (menú Boletería CO → Configurar)')
  const opts = { method, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + token } }
  if (payload) { opts.contentType = 'application/json'; opts.payload = JSON.stringify(payload) }
  const res = UrlFetchApp.fetch(API_URL, opts)
  const code = res.getResponseCode()
  if (code === 401) throw new Error('Clave incorrecta')
  const data = JSON.parse(res.getContentText() || '{}')
  if (code !== 200) throw new Error(data.error || ('Error ' + code))
  return data
}

function etiqueta(e) {
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const [, m, d] = e.fecha.split('-')
  return `${Number(d)} ${meses[Number(m) - 1]} · ${e.nombre} · ${e.ciudad}`
}

function actualizarEventos() {
  const { eventos } = api('get')
  const ss = libro()
  const h = ss.getSheetByName(T_EV) || ss.insertSheet(T_EV)
  h.clear()
  const cant = eventos.filter(e => !e.numerado).map(etiqueta)
  const num = eventos.filter(e => e.numerado).map(etiqueta)
  const filas = [['Por cantidad', 'Numerados', 'Evento', 'id', 'Tribunas']]
  const n = Math.max(cant.length, num.length, eventos.length)
  for (let i = 0; i < n; i++) {
    const e = eventos[i]
    filas.push([cant[i] || '', num[i] || '', e ? etiqueta(e) : '', e ? e.id : '', e ? (e.tribunas || []).join(' | ') : ''])
  }
  h.getRange(1, 1, filas.length, 5).setValues(filas)
  h.getRange(1, 1, 1, 5).setFontWeight('bold')

  const lista = col => SpreadsheetApp.newDataValidation()
    .requireValueInRange(h.getRange(2, col, Math.max(n, 1)), true).setAllowInvalid(true).build()
  ss.getSheetByName(T_CANT).getRange(2, C.evento, 999).setDataValidation(lista(1))
  ss.getSheetByName(T_NUM).getRange(2, N.evento, 999).setDataValidation(lista(2))
}

function mapaEventos() {
  const h = libro().getSheetByName(T_EV)
  const m = {}
  if (!h || h.getLastRow() < 2) return m
  h.getRange(2, 3, h.getLastRow() - 1, 3).getValues().forEach(([et, id, trib]) => {
    if (et) m[et] = { id, tribunas: String(trib).split(' | ').filter(Boolean) }
  })
  return m
}

// ---------- Edición ----------

function alEditar(e) {
  const h = e.range.getSheet()
  const nombre = h.getName()
  if ((nombre !== T_CANT && nombre !== T_NUM) || e.range.getRow() < 2) return
  // Al elegir el evento, la columna Tribuna muestra solo las de ese evento
  if (e.range.getColumn() === 1) {
    const ev = mapaEventos()
    for (let r = e.range.getRow(); r <= e.range.getLastRow(); r++) {
      const t = ev[h.getRange(r, 1).getValue()]
      const celda = h.getRange(r, 2)
      if (t && t.tribunas.length) {
        celda.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(t.tribunas, true).setAllowInvalid(true).build())
      } else celda.clearDataValidations()
    }
  }
  sincronizar()
}

// ---------- Sincronización ----------

function sincronizar() {
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(25000)) return
  try {
    const ss = libro()
    const hc = ss.getSheetByName(T_CANT), hn = ss.getSheetByName(T_NUM)
    if (!hc || !hn) return
    const ev = mapaEventos()
    const leer = (h, cols) => h.getLastRow() < 2 ? [] : h.getRange(2, 1, h.getLastRow() - 1, cols).getValues()
    const vc = leer(hc, C.base), vn = leer(hn, N.aviso)

    const filasC = [], filasN = []
    vc.forEach((v, i) => {
      if (!v[C.evento - 1]) return
      filasC.push({ r: i + 2, quedan: v[C.quedan - 1], dato: {
        eventoId: (ev[v[C.evento - 1]] || {}).id || '', tribuna: v[C.tribuna - 1], precio: v[C.precio - 1],
        plataforma: v[C.plataforma - 1], quedan: v[C.quedan - 1], base: v[C.base - 1] === '' ? null : v[C.base - 1],
      } })
    })
    vn.forEach((v, i) => {
      if (!v[N.evento - 1]) return
      filasN.push({ r: i + 2, dato: {
        eventoId: (ev[v[N.evento - 1]] || {}).id || '', tribuna: v[N.tribuna - 1], fila: v[N.fila - 1], silla: v[N.silla - 1],
        precio: v[N.precio - 1], plataforma: v[N.plataforma - 1], estado: v[N.estado - 1],
      } })
    })
    if (!filasC.length && !filasN.length) return

    let res
    try {
      res = api('post', { cantidad: filasC.map(f => f.dato), numeradas: filasN.map(f => f.dato) })
    } catch (err) {
      try { ss.toast(String(err.message || err), 'Boletería CO: no se pudo sincronizar', 10) } catch (e) { Logger.log(err) }
      return
    }

    res.cantidad.forEach((x, i) => {
      const f = filasC[i]
      if (x.error) { hc.getRange(f.r, C.aviso).setValue('⚠️ ' + x.error); return }
      // si el socio cambió "Quedan" mientras se sincronizaba, no se pisa: se aplica en la próxima vuelta
      const ahora = hc.getRange(f.r, C.quedan).getValue()
      if (String(ahora) === String(f.quedan)) {
        hc.getRange(f.r, C.quedan).setValue(x.quedan)
        hc.getRange(f.r, C.base).setValue(x.quedan)
      }
      hc.getRange(f.r, C.vendidas, 1, 3).setValues([[x.vendidasWeb, x.pagando, x.avisos.join(' · ') || '✓ ' + hora()]])
    })
    res.numeradas.forEach((x, i) => {
      const f = filasN[i]
      if (x.error) { hn.getRange(f.r, N.aviso).setValue('⚠️ ' + x.error); return }
      hn.getRange(f.r, N.web, 1, 2).setValues([[x.enLaWeb, x.avisos.join(' · ') || '✓ ' + hora()]])
    })
  } finally {
    lock.releaseLock()
  }
}

function hora() {
  return Utilities.formatDate(new Date(), 'America/Bogota', 'HH:mm')
}
