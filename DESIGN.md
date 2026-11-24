---
name: Sistema Ministerial · FGE Guerrero
version: 1.0
description: Identidad visual del Sistema Ministerial de la Policía de Investigación Ministerial, Fiscalía General del Estado de Guerrero.
colors:
  # PALETA INSTITUCIONAL OFICIAL — NO MODIFICAR
  navy: "#001a4d"
  dorado: "#b69054"
  guinda: "#8b1e1e"
  # Neutros de apoyo (no son colores institucionales; si el código ya usa otro valor, se respeta el del código)
  blanco: "#ffffff"
  texto: "#1a1a1a"
  borde: "#d9d9d9"
  fondo-pagina: "#f5f5f5"
typography:
  base-px: 18
  minimo-px: 16
  titulos-px: 24
  peso-texto: 600
  peso-titulos: 700
  familia: "la ya definida en el sistema; si no hay una, Arial, Helvetica, sans-serif"
spacing:
  unidad-px: 8
  padding-ficha-px: 24
  separacion-entre-fichas-px: 16
radius:
  ficha-px: 8
  chip-px: 999
  boton-px: 6
---

# DESIGN.md — Sistema Ministerial · FGE Guerrero

Esta guía es para cualquier sesión o agente que trabaje el código del Sistema Ministerial (React + Vite, Supabase, Cloudflare Pages). Todo módulo nuevo o rediseñado debe seguirla para que el sistema se vea como una sola herramienta institucional.

## 1. Regla número uno: la paleta institucional no se toca

La paleta es oficial y viene de la identidad gráfica de `fiscaliaguerrero.gob.mx`:

| Color  | Hex       | Uso principal |
|--------|-----------|---------------|
| Navy   | `#001a4d` | Encabezado, menú lateral, títulos de alto nivel |
| Dorado | `#b69054` | Acentos, líneas bajo títulos, grado en el encabezado, elementos activos |
| Guinda | `#8b1e1e` | Alertas institucionales, estatus críticos (p. ej. DETENIDO), acciones importantes |

Prohibido:
- Cambiar cualquiera de los tres hexadecimales, aunque sea "un poquito".
- Agregar colores nuevos (morados, verdes neón, degradados llamativos).
- Usar morado en cualquier texto, en especial en el grado del encabezado.

Tonos que ya existen en el código (por ejemplo, el navy más suave del panel del menú lateral, ya aprobado) se conservan tal cual están en `MenuLateral.jsx`. Si hace falta un tono derivado, se toma del código existente, no se inventa.

## 2. A quién va dirigido (esto manda sobre todo lo demás)

La mayoría de los usuarios son mandos y agentes adultos mayores, muchos militares retirados, con dificultad visual y poca costumbre de usar tecnología. No leen mucho texto: quieren información concreta, corta y que sirva para decidir.

Por eso:
- **Texto grande:** 18 px de base, nunca menos de 16 px. Títulos de 24 px o más.
- **Letra gruesa:** peso 600 para texto normal, 700 para títulos.
- **Contraste alto:** texto oscuro sobre fondo blanco, o blanco/dorado sobre navy o guinda. Nunca gris claro sobre blanco.
- **Iconos siempre con texto visible.** Un icono solo no se entiende.
- **Pocas palabras por pantalla.** Solo datos críticos.
- **Nada que se oculte o se mueva solo.** El menú lateral queda siempre fijo (se descartó ocultarlo porque dejaba la pantalla en blanco).

## 3. Estructura general de pantalla

- **Encabezado navy** (`#001a4d`) con escudo FGE, nombre del sistema y datos del usuario. El grado se muestra **completo** (p. ej. "Coordinador Regional"), en dorado o blanco.
- **Menú lateral fijo** con secciones agrupadas, en el navy suave que ya tiene el sistema. Opción activa marcada con dorado.
- **Área de trabajo** con fondo claro y fichas blancas.
- **Marca de agua** con los logos de la FGE en pantalla, discreta, para proteger la autoría del trabajo.

## 4. Componentes

### Títulos de sección
- En MAYÚSCULAS, peso 700, color navy.
- Línea inferior dorada (`#b69054`) de 2–3 px.

### Fichas (tarjetas)
- Fondo blanco, borde fino gris claro, esquinas redondeadas de 8 px.
- Padding de 24 px. Separación entre fichas de 16 px.
- Una ficha = un tema (un detenido, un vehículo, un contacto). Sin saturar.
- Fotos con contorno negro delgado, todas del mismo tamaño dentro de la misma vista.

### Chips (etiquetas)
- Redondeados por completo (forma de píldora).
- Texto de 16 px como mínimo, peso 600.
- Para grupo delictivo, región, tipo de delito, SPID relacionado.

### Badges de estatus
- **DETENIDO:** fondo guinda (`#8b1e1e`), texto blanco, mayúsculas.
- **EN INVESTIGACIÓN:** fondo dorado (`#b69054`), texto navy o blanco (el que dé mejor contraste en pantalla).
- Siempre con la palabra escrita; el color nunca va solo.

### Tablas
- Encabezado navy con texto blanco.
- Filas alternas muy suaves para seguir la línea con la vista.
- **Máximo 5 resultados por página**, con botones **Anterior / Siguiente**, igual que en Vehículos Robados y Órdenes de Aprehensión. Nada de scroll infinito.

### Botones
- Grandes, fáciles de tocar o dar clic (alto mínimo de 44 px).
- Siempre icono + texto.
- Acción principal en navy o guinda con texto blanco; secundaria con borde dorado.

### Formularios
- Etiqueta visible arriba de cada campo (no solo texto gris dentro del campo).
- Campos altos, letra de 18 px.
- Mensajes de error en lenguaje sencillo y en guinda, junto al campo que falló.

## 5. Gráficas y mapas

- Gráficas **muy simples**, que se lean en segundos. Nada de visualizaciones técnicas (por ejemplo, mapas de calor hora × actividad).
- Colores armónicos de la paleta (guinda, dorado, navy). Sin colores intensos.
- **El semáforo (rojo / amarillo / verde) se usa solo en el mapa**, con los valores que ya tiene el código del mapa.
- El mapa de Análisis Criminal debe poder verse **en pantalla completa** para proyectarlo.
- Las líneas de tiempo llevan flechas que acompañen la lectura.

## 6. Tono del texto en pantalla

- Español claro, frases cortas, lenguaje institucional pero humano.
- Nombres de sección que los mandos entiendan. Ejemplo: "Análisis Criminal", no siglas internas como "SARA".
- Comillas dobles " " para citas, nunca comillas angulares « ».

## 7. Instrucciones para el agente que programe

1. Lee este archivo antes de crear o rediseñar cualquier pantalla.
2. No cambies los tres colores institucionales ni agregues colores nuevos.
3. Si un componente ya existe en otro módulo (por ejemplo, la paginación de Vehículos Robados), reutilízalo en vez de inventar otro.
4. No cambies lógica, permisos (RLS) ni base de datos cuando la tarea sea solo de diseño.
5. Cuando dudes entre "bonito" y "legible", gana legible.
6. Antes de terminar, revisa que el texto más pequeño de la pantalla mida 16 px o más.
