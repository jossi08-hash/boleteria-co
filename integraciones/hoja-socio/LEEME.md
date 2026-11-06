# Hoja del socio

Es un Google Sheets donde el socio que provee las boletas propias actualiza cuántas le quedan. La página se actualiza sola, sin que nadie tenga que avisar.

## Cómo funciona

- **Pestaña "Por cantidad"** (partidos sin silla y conciertos)
  - El socio solo cambia **Quedan**. Si vende 2 por fuera, baja el número en 2.
  - **Vendidas en la web** y **Pagando ahora** se llenan solas. Cuando alguien compra en boleteriaco.com, Quedan baja sola.
  - Si se vende algo en la web mientras él edita, no se pierde: se aplica solo lo que él cambió.
- **Pestaña "Numeradas"** (Santa Fe, Millonarios, Nacional, Medellín, América y Selección Colombia)
  - Una fila por silla: tribuna, fila, silla y precio.
  - En **Estado** se elige Disponible, Vendida por fuera o Retirada.
  - **En la web** muestra lo que pasa en la página. Las vendidas quedan en gris.
- **Pestaña "Eventos"**: la llena el script con los eventos próximos. No se edita.
- **Cuándo se sincroniza**: cada vez que se edita una fila y además cada minuto.

**Reglas que el sistema siempre cumple:**

- No retira una boleta que alguien está pagando en ese momento. Lo deja anotado en la columna **Aviso**.
- No vuelve a publicar una boleta vendida.
- Solo toca boletas propias (las que publicas como admin) de las tribunas y sillas que están en la hoja. Las de vendedores externos y las que no aparecen en la hoja no se tocan.
- Lo que se retira por la hoja queda como "vendida", igual que con el botón **Vendida por fuera** del panel.
- El precio es el que paga el comprador, sin comisión (igual que en el panel).

## Instalación (una sola vez)

1. **En Vercel**: Project → Settings → Environment Variables. Agrega `SHEET_SYNC_TOKEN` con la clave larga (mínimo 24 caracteres) y vuelve a publicar.
2. **En Google**: crea un Sheets nuevo, por ejemplo "Boletería CO · Disponibilidad".
3. **El script**: en Extensiones → Apps Script, borra lo que haya, pega todo `Codigo.gs` y guarda.
4. **Configurar**: recarga la hoja. Aparece el menú **Boletería CO**. Ahí eliges **Configurar** y pegas la clave.
5. **Permisos**: Google pide autorizar el script, porque se conecta a boleteriaco.com y edita la hoja. Hay que aceptar.
6. **Compartir**: comparte la hoja con el socio como **Editor**. Él no necesita la clave ni usuario en la página.

Para cambiar la clave: cámbiala en Vercel y vuelve a correr **Configurar** en la hoja.
