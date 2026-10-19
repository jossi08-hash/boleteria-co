---
name: Boletería CO
description: Reventa de boletas entre personas en Colombia, con el dinero en custodia hasta que la boleta llega.
colors:
  amarillo-afiche: "#ffe23b"
  tinta: "#141311"
  papel: "#fbf8ee"
  papel-2: "#ede7d4"
  fucsia-imprenta: "#d10f6b"
  fucsia-hondo: "#a80a55"
  gris-tinta: "#5a554a"
  tinta-suave: "#3b372d"
  sobre-tinta: "#f5f1e4"
  sobre-tinta-2: "#b9b4a6"
typography:
  display:
    fontFamily: "'Big Shoulders Display', 'Archivo', sans-serif"
    fontSize: "clamp(54px, 9.2vw, 150px)"
    fontWeight: 900
    lineHeight: 0.84
    letterSpacing: "-0.005em"
  headline:
    fontFamily: "'Big Shoulders Display', 'Archivo', sans-serif"
    fontSize: "clamp(46px, 7vw, 96px)"
    fontWeight: 900
    lineHeight: 0.88
    letterSpacing: "normal"
  title:
    fontFamily: "'Big Shoulders Display', 'Archivo', sans-serif"
    fontSize: "clamp(22px, 2.4vw, 30px)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "normal"
  body:
    fontFamily: "'Archivo', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "'Archivo', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.08em"
  button:
    fontFamily: "'Archivo', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.01em"
  cifra:
    fontFamily: "'Archivo', system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "'tnum'"
rounded:
  foco: "6px"
  sello: "10px"
  boleta-sm: "12px"
  boleta: "14px"
  tira: "16px"
  boleta-lg: "18px"
  pill: "999px"
spacing:
  gutter: "20px"
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "48px"
  seccion: "clamp(72px, 9vw, 112px)"
  contenido: "1120px"
  contenido-angosto: "760px"
components:
  button-tinta:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.amarillo-afiche}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "48px"
  button-tinta-hover:
    backgroundColor: "#000000"
    textColor: "{colors.amarillo-afiche}"
  button-borde:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "48px"
  button-borde-hover:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.amarillo-afiche}"
  button-fucsia:
    backgroundColor: "{colors.fucsia-imprenta}"
    textColor: "#ffffff"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "48px"
  button-fucsia-hover:
    backgroundColor: "{colors.fucsia-hondo}"
    textColor: "#ffffff"
  buscador:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pill}"
    padding: "6px 6px 6px 54px"
    width: "min(640px, 100%)"
  fila-evento:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.boleta}"
    height: "108px"
  fila-evento-hover:
    backgroundColor: "#ffffff"
  pestana:
    textColor: "{colors.sobre-tinta-2}"
    typography: "{typography.headline}"
  pestana-activa:
    textColor: "{colors.amarillo-afiche}"
  nav:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.sobre-tinta}"
    height: "60px"
  nav-entrar:
    backgroundColor: "{colors.amarillo-afiche}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
---

# Design System: Boletería CO

## Overview

**Creative North Star: "El afiche de poste con boleta en custodia"**

Boletería CO se ve como un afiche callejero bogotano pegado en un poste: amarillo afiche a sangre, tinta negra casi pura, fucsia de imprenta para la plata y la acción, y letras de madera condensadas que gritan en mayúsculas. Sobre ese afiche, cada pieza de información tiene forma de boleta: talón perforado con línea punteada, muescas semicirculares en el corte, número de serie y un sello de goma "EN CUSTODIA" con tinta irregular. La boleta es la interfaz; la confianza se muestra con un objeto, no se promete con un párrafo.

La densidad alterna por bandas completas: amarillo (primera pantalla, custodia) y tinta (eventos, preguntas, pie). El texto corrido es Archivo, sobrio y legible; la voz alta es Big Shoulders Display. Las fotos de estadios y artistas viven siempre dentro de boletas, a todo color. El mundo rechaza explícitamente el hero oscuro con brillo azul y la grilla de tarjetas iguales que tenía el sitio anterior.

**Key Characteristics:**
- Bandas a sangre que alternan amarillo afiche y tinta; papel crema para todo lo que es boleta.
- Titulares en Big Shoulders Display 800–900, siempre en mayúsculas, con interlineado apretado (0.84–0.95).
- Componentes con anatomía de boleta: talón, perforación punteada, muescas, serie, sello.
- Fucsia reservado para precio, acción de compra/venta, foco y el sello de custodia.
- Movimiento lento y suave con una sola curva (cubic-bezier(.16, 1, .3, 1)); todo se detiene con reduce-motion.

## Colors

Paleta de imprenta de tres tintas sobre papel: amarillo, negro y fucsia, con cremas cálidos y grises de tinta en lugar de grises neutros.

### Primary
- **Amarillo afiche** (amarillo-afiche): fondo a sangre de la primera pantalla y de la sección de custodia; columna de fecha en las filas de eventos; texto y subrayado de la pestaña activa sobre tinta; "CO" del logotipo y botón "Entrar" del nav. Es el color de la marca en la calle.

### Secondary
- **Fucsia de imprenta** (fucsia-imprenta): precios y totales, la acción "Vender una boleta", "Vende la tuya", el sello EN CUSTODIA, el anillo de foco y la selección de texto. Nunca decorativo.
- **Fucsia hondo** (fucsia-hondo): hover del botón fucsia y de los enlaces suaves sobre amarillo.

### Neutral
- **Tinta** (tinta): texto principal sobre amarillo y papel, fondo de las bandas oscuras, del nav y de la marquesina, fondo del botón primario.
- **Papel** (papel): cuerpo de toda boleta (filas, boleta de muestra, talones, tira de custodia) y fondo del buscador.
- **Papel viejo** (papel-2): columna de fecha de un evento sin boletas publicadas; el amarillo se apaga cuando no hay nada que comprar.
- **Gris tinta** (gris-tinta): metadatos sobre papel: lugar, "desde", series, rótulos de datos, descripciones de la tira.
- **Tinta suave** (tinta-suave): texto corrido sobre amarillo (bajada del titular, hechos de custodia).
- **Sobre tinta** (sobre-tinta): texto principal sobre las bandas oscuras.
- **Sobre tinta 2** (sobre-tinta-2): texto secundario y respuestas sobre tinta; las pestañas inactivas usan sobre-tinta al 50%.

### Named Rules
**La regla de la plata fucsia.** El fucsia marca dinero y acción: precio, total, vender, foco, sello. Si un elemento fucsia no es plata, una acción o la custodia, está mal.

**La regla de las bandas a sangre.** Las secciones no flotan en tarjetas sobre un fondo: cada sección es una banda de ancho completo, amarillo o tinta, y sobre ella se apoyan las boletas de papel.

## Typography

**Display Font:** Big Shoulders Display 700–900 (con Archivo, sans-serif)
**Body Font:** Archivo de ancho variable 62–125, peso 400–900 (con system-ui, sans-serif)

**Character:** Letra de madera condensada de afiche para todo lo que se grita, y una grotesca robusta y sobria para lo que se lee y se paga. Las cifras van tabulares.

### Hierarchy
- **Display** (display): solo el titular de la primera pantalla, en dos líneas que suben enmascaradas al cargar; en celular clamp(50px, 15.5vw, 84px).
- **Headline** (headline): títulos de sección ("Así viaja tu plata", "Preguntas frecuentes") y, a escala clamp(40px, 6.4vw, 84px), las pestañas Deportivos / Artísticos.
- **Title** (title): nombre del evento en filas y en la boleta de muestra (800, mayúsculas); día del mes en el talón a 900 46px/0.9; pasos de la tira de custodia.
- **Body** (body): bajadas, respuestas y hechos, 16–17px con interlineado 1.5–1.65 y ancho máximo de 46–64ch; metadatos a 13–14px.
- **Label** (label): rótulos de datos de la boleta (TRIBUNA, FECHA, TOTAL) y series, en mayúsculas con 0.06–0.08em. La marquesina usa Archivo 700 13px a ancho 78%, mayúsculas, 0.06em.
- **Cifra** (cifra): precios y totales en Archivo 800 con 'tnum', en fucsia.

### Named Rules
**La regla de la madera en mayúsculas.** Big Shoulders Display se usa siempre en mayúsculas y con interlineado ≤ 1; nunca para texto corrido, botones ni precios.

**La regla de la cifra tabular.** Todo número que es plata se compone en Archivo con 'tnum'; nunca en la letra de afiche.

## Layout

Contenido centrado a 1120px con 20px de margen lateral (760px para bloques angostos). Las bandas van a sangre y respiran con clamp(72px, 9vw, 112–120px) arriba. La primera pantalla ocupa min(100svh − 60px, 1000px): marquesina de 40px (34px en celular), titular centrado, buscador de hasta 640px y debajo la escena con el anillo 3D de boletas y la boleta de muestra al frente, sangrando hacia abajo.

Los eventos son una lista vertical de filas-boleta con 12px de separación, no una grilla. Rejilla de la fila: talón de fecha 112px, centro flexible, precio, flecha 64px; en celular el talón baja a 76px y precio y nombre se apilan. La tira de custodia es una sola boleta de cinco columnas que en tableta (≤ 960px) se vuelve vertical. Puntos de corte: 960px (tableta) y 640px (celular).

## Elevation & Depth

Sistema plano en las bandas, con sombras suaves, largas y difusas solo bajo objetos de papel que se apoyan sobre el afiche: el buscador, la boleta de muestra, la tira de custodia, las boletas del anillo y el botón fucsia. Las sombras tienen el tinte de la tinta (rgba(20, 19, 17, …)) y un spread negativo; nunca son duras ni desplazadas. Las filas de eventos sobre tinta no llevan sombra: se levantan 3px y se aclaran a blanco al pasar el cursor.

### Shadow Vocabulary
- **Papel apoyado** (`box-shadow: 0 14px 30px -18px rgba(20, 19, 17, .55)`): buscador en reposo.
- **Boleta levantada** (`box-shadow: 0 22px 40px -18px rgba(20, 19, 17, .6)`): boletas del anillo; con -26px de spread, la tira de custodia.
- **Boleta al frente** (`filter: drop-shadow(0 26px 34px rgba(20, 19, 17, .38))`): boleta de muestra, con drop-shadow para respetar las muescas.
- **Brillo fucsia** (`box-shadow: 0 6px 18px -8px rgba(209, 15, 107, .7)`): solo el botón fucsia.

### Named Rules
**La regla del papel sobre el poste.** Solo lo que es papel proyecta sombra, y siempre difusa y teñida de tinta. Las bandas y el texto nunca.

## Shapes

Dos formas mandan: la píldora (999px) para todo control (botones, buscador, selects, "Entrar") y el rectángulo de boleta de esquinas suaves (12–18px según tamaño) recortado con muescas semicirculares en la línea del talón (radios de 9–15px, 6px en celular). El talón se separa con una línea punteada de 2px en tinta al 30–35%. El sello es un rectángulo de 10px rotado -9° con doble filete fucsia. El foco usa un contorno de 3px con 6px de radio.

## Components

### Buttons
Píldoras gruesas y directas, con un leve hundimiento al presionar (scale .97).
- **Shape:** píldora (999px), alto mínimo 48px, padding horizontal 24px (16px dentro del buscador en celular).
- **Primario tinta:** fondo tinta, texto amarillo; hover a negro puro. Es el botón "Buscar".
- **Borde:** transparente con filete interior de 2px en tinta; hover se rellena de tinta con texto amarillo. "Vender mi boleta" sobre amarillo.
- **Fucsia:** fondo fucsia, texto blanco, brillo fucsia; hover a fucsia hondo. Acción de venta sobre tinta.
- **Enlace suave:** Archivo 700 15–18px, subrayado de 2px con offset de 4–5px; puede llevar flecha que avanza 4px al pasar el cursor.
- **Foco:** contorno fucsia de 3px con offset de 3px.

### Inputs / Fields
- **Buscador:** píldora de papel con filete de 2px en tinta, lupa SVG a la izquierda, texto Archivo 500 17px, cursor fucsia y el botón tinta dentro. Al enfocar suma un halo fucsia de 4px al 25% sobre la sombra.
- **Select de filtro (sobre tinta):** píldora de 44px, transparente, filete de 1.5px en sobre-tinta al 35%, chevron SVG propio.

### Cards / Containers
- **Fila de evento (boleta horizontal):** papel, 14px de radio, muescas de 11px en la línea del talón; talón de fecha amarillo (papel viejo si no hay boletas) con día en Big Shoulders 900 y semana/mes en Archivo 700 mayúsculas; escudos superpuestos −8px; precio "desde" en fucsia tabular; flecha que avanza 4px. Hover: sube 3px y el papel pasa a blanco. Foco: filete interior fucsia de 3px.
- **Boleta de tribuna (página de evento, `.af-boleta`):** papel con talón derecho de 150px (118px en celular), muescas de 10px, tribuna/fila/silla en Big Shoulders 800 y precio fucsia tabular; el botón del talón es una píldora tinta con texto amarillo y, ya en el carrito, se invierte a borde tinta sobre papel amarillo pálido (#fff6c2). Sello "Verificada · Boletería CO" con filete fucsia.
- **Paso numerado (`.cf-paso`):** boleta horizontal de papel con talón amarillo de 92px y número Big Shoulders 900; se usa en Cómo funciona.
- **Páginas internas:** fondo tinta (#141311), tarjetas en tinta alzada (#1e1c19) con borde #34312b, textos sobre-tinta #f5f1e4 / #b9b4a6 / #8f8a7d; encabezado de página como franja amarilla a sangre (`.af-franja`) con titular Big Shoulders y "← Volver". Estados de éxito, aviso y error conservan verde, ámbar y rojo semánticos.
- **Tira de custodia:** una boleta de papel de cinco celdas separadas por perforación punteada; la celda "Guardamos tu plata" se invierte a tinta con título amarillo.

### Navigation
- **Logotipo:** boleta amarilla #ffe23b con muescas laterales y "BCO" en Big Shoulders 900 tinta, convertido a trazos (public/logo-nav.svg, favicon.svg); los íconos de app lo ponen sobre fondo tinta.
- **Iconos:** trazo de 1.75px, 24×24, en src/componentes/Icono.jsx; nunca emojis como íconos.
- **Nav:** barra fija tinta de 60px (52px en celular) con borde inferior sobre-tinta al 10%, logotipo con "CO" en amarillo, botón "Entrar" / "Iniciar sesión" en píldora amarilla con texto tinta (Archivo 700 13px) y menú.
- **Pestañas Deportivos / Artísticos:** titulares Big Shoulders 900 sobre tinta; inactiva en sobre-tinta al 50%; activa en amarillo con una barra amarilla de 6px que crece desde la izquierda; contador en Archivo 700 como superíndice.
- **Marquesina:** banda tinta de 40px con eventos reales y la regla de custodia en amarillo, separados por una estrella SVG de cuatro puntas, desplazándose en 60s.

### Boleta de muestra y sello EN CUSTODIA (componente firma)
Boleta de papel de hasta 720px con cuerpo y talón de 200px (112px en celular) separados por perforación y muescas de 15px. El cuerpo lleva evento, lugar y datos en rótulos (tribuna, fecha, total fucsia); el talón lleva el sello EN CUSTODIA: Big Shoulders 900 26px fucsia, rotado −9°, doble filete, mix-blend-mode multiply y filtro de ruido que imita tinta de goma. Si los datos son ilustrativos, lo dice en el pie.

### Anillo de boletas (componente firma)
Boletas verticales de proporción ~0.49, foto a todo color en el 79% superior y talón de papel con nombre y serie "N° 00000", girando lento en un anillo 3D con perspectiva. Se detiene con prefers-reduced-motion y fuera de pantalla. Sobre tinta, la versión estática se reparte en cinco columnas con las pares bajadas 28px.

## Do's and Don'ts

### Do:
- **Do** poner las fotos de eventos siempre dentro de una boleta (talón, muescas, serie), a todo color y con crédito de licencia en el pie.
- **Do** alternar bandas a sangre amarillo afiche y tinta, y apoyar sobre ellas objetos de papel.
- **Do** usar la perforación punteada de 2px y las muescas semicirculares para separar talón y cuerpo en cualquier componente-boleta.
- **Do** componer precios y totales en Archivo 800 con 'tnum' y en fucsia de imprenta.
- **Do** usar la curva suave cubic-bezier(.16, 1, .3, 1) para entradas y estados, y detener toda animación con prefers-reduced-motion.
- **Do** marcar como ejemplo cualquier boleta con datos ilustrativos.

### Don't:
- **Don't** volver al hero oscuro con brillo azul ni a la grilla de tarjetas de evento iguales.
- **Don't** usar el fucsia como decoración: solo plata, acción, foco y custodia.
- **Don't** usar Big Shoulders Display en minúsculas, en texto corrido o en cifras.
- **Don't** poner fotos sueltas fuera de una boleta, ni escudos o rostros de jugadores en fotos deportivas.
- **Don't** usar sombras duras desplazadas ni sombras en las bandas; solo sombras difusas teñidas de tinta bajo el papel.
- **Don't** usar Inter ni los azules del sitio anterior en superficies nuevas.
