// src/pages/leerTarjeta.js
// Lee una tarjeta informativa pegada como texto y saca SOLO los datos del hecho que necesita el mapa:
// fecha, hora de aviso, sector, tipo de hecho, lugar, carpeta de investigación y calibre.
//
// Privacidad: NO se extrae ni se guarda nada más. Nombres de víctima, edades, ocupación, domicilios, entrevistados,
// presuntos agresores (menos aún si son menores), alias y la reseña de los hechos se descartan.
//
// La carpeta de investigación casi nunca viene en la tarjeta preliminar: si falta, la persona la captura antes de guardar.

export const SECTORES = ['Renacimiento', 'Zapata', 'Garita', 'Coloso', 'Costa Azul', 'Central',
  'Barrios Históricos', 'Mozimba', 'Jardín', 'Coyuca de Benítez', 'San Marcos'];
const ALIAS_SECTOR = { 'BARRIOS': 'Barrios Históricos', 'COYUCA': 'Coyuca de Benítez' };
export const HOSPITAL_RE = /hospital|cl[ií]nica|cruz roja|\bimss\b|\bissste\b|centro de salud|semefo|servicio m[eé]dico/i;

const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const pad = (n) => String(n).padStart(2, '0');
const sinAcentos = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const norm = (s) => sinAcentos(s).toUpperCase().replace(/\s+/g, ' ').trim();

export function normalizarSector(txt) {
  const n = norm(txt).replace(/^SECTOR /, '').replace(/[.]+$/, '').trim();
  if (!n) return null;
  if (ALIAS_SECTOR[n]) return ALIAS_SECTOR[n];
  return SECTORES.find((s) => norm(s) === n) || SECTORES.find((s) => n.includes(norm(s))) || null;
}

// Limpia el formato de WhatsApp (*negritas*), espacios raros y saltos de línea de Windows
function limpiarTexto(t) {
  return String(t == null ? '' : t).replace(/\r/g, '').replace(/\u00a0/g, ' ').replace(/[*_]/g, '');
}

function dividirTarjetas(limpio) {
  const nT = (limpio.match(/TARJETA INFORMATIVA/gi) || []).length;
  if (nT < 2) return [limpio];
  const nF = (limpio.match(/FISCAL[IÍ]A GENERAL DEL ESTADO/gi) || []).length;
  const marca = nF === nT ? /(?=FISCAL[IÍ]A GENERAL DEL ESTADO)/gi : /(?=TARJETA INFORMATIVA)/gi;
  return limpio.split(marca).filter((b) => /TARJETA INFORMATIVA/i.test(b));
}

function hora(b, etiqueta) {
  const m = b.match(new RegExp(etiqueta + '\\s*:?\\s*(\\d{1,2})\\s*[:;.hH]\\s*(\\d{2})', 'i'));
  if (!m) return '';
  const h = +m[1], mi = +m[2];
  return h > 23 || mi > 59 ? '' : pad(h) + ':' + pad(mi);
}

// Busca el valor de una etiqueta (varios nombres posibles). El valor puede ir en la misma línea ("Delito: Homicidio...")
// o en la línea siguiente ("Delito:" y abajo el texto), que es como lo escriben algunas tarjetas.
function valorDe(b, etiquetas) {
  for (const et of etiquetas) {
    const m = b.match(new RegExp('(?:^|\\n)[ \\t]*(?:' + et + ')[ \\t]*:[ \\t]*([^\\n]*)(?:\\n\\s*([^\\n]+))?', 'i'));
    if (!m) continue;
    const misma = (m[1] || '').trim();
    if (misma) return misma;
    const sig = (m[2] || '').trim();
    if (sig && !/^[A-Za-zÁÉÍÓÚáéíóúÑñ .]{2,40}:/.test(sig)) return sig;
  }
  return '';
}
const limpiarValor = (v) => String(v || '').replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();

function leerUna(bloque, n) {
  const b = bloque;
  // Fecha: "Acapulco, Guerrero; a 26 de octubre de 2026"
  let fecha = '';
  const mf = b.match(/(\d{1,2})\s+de\s+([a-zA-ZáéíóúÁÉÍÓÚ]+)\s+(?:de|del)\s+(\d{4})/i);
  if (mf && MESES[sinAcentos(mf[2]).toLowerCase()]) fecha = mf[3] + '-' + pad(MESES[sinAcentos(mf[2]).toLowerCase()]) + '-' + pad(+mf[1]);
  else {
    const md = b.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (md) fecha = md[3] + '-' + pad(+md[2]) + '-' + pad(+md[1]);
  }

  const sectorCrudo = limpiarValor(valorDe(b, ['Sector', 'Coordinaci[oó]n', 'Zona']));
  const asunto = limpiarValor(valorDe(b, ['Asunto']));
  const tipo = limpiarValor(valorDe(b, ['Tipo de hecho', 'Tipo de delito', 'Delito', 'Tipificaci[oó]n', 'Hecho']));

  // El lugar puede ir en la misma línea de la etiqueta o en la línea siguiente
  const lugar = limpiarValor(valorDe(b, ['Lugar de intervenci[oó]n', 'Lugar de los hechos', 'Lugar del hecho', 'Ubicaci[oó]n', 'Lugar']));

  // Carpeta de investigación: con etiqueta, o un número suelto de 20 dígitos
  let ci = '';
  const mc = b.match(/(?:\bC\.?\s?I\.?\b|carpeta de investigaci[oó]n)[^\d\n]{0,30}(\d[\d ]{9,})/i);
  if (mc) ci = mc[1].replace(/\s+/g, '');
  else { const m20 = b.match(/\b\d{20}\b/); if (m20) ci = m20[0]; }

  const mcal = b.match(/calibre\s*(\.?\d{2,3})\s*(mm|milimetros)?/i) || b.match(/\b(\d{1,2})\s?mm\b/i);
  const calibre = mcal ? (mcal[1].replace(/\s/g, '') + ((mcal[2] || /mm/i.test(mcal[0])) ? 'MM' : '')).toUpperCase().replace(/MM+$/, 'MM') : '';

  const delito = tipo.toUpperCase();
  let sector = normalizarSector(sectorCrudo);
  // Si la tarjeta no dice el sector, se busca el nombre de un sector del catálogo en el lugar; si hay uno solo, se propone y se avisa
  let sectorAuto = '';
  if (!sector) {
    const hallados = SECTORES.filter((x) => new RegExp('(^|[^a-z])' + norm(x).toLowerCase().replace(/\s+/g, '\\s+') + '([^a-z]|$)').test(norm(lugar).toLowerCase()));
    if (hallados.length === 1) { sector = hallados[0]; sectorAuto = hallados[0]; }
  }

  return {
    id: 't' + n + '-' + Date.now(), fecha, hora: hora(b, 'Hora de aviso'), horaArribo: hora(b, 'Hora de arribo'),
    sector: sector || '', sectorAuto, sectorCrudo, asunto, delito, lugar, ci, calibre,
    cartulina: /cartulina/i.test(b) ? true : null, esHospital: HOSPITAL_RE.test(lugar),
  };
}

// Devuelve una lista de tarjetas leídas, una por cada "TARJETA INFORMATIVA" del texto pegado
export function leerTarjetas(texto) {
  const limpio = limpiarTexto(texto);
  if (!/\S/.test(limpio)) return [];
  return dividirTarjetas(limpio).map((b, i) => leerUna(b, i + 1));
}

// ¿El tipo de hecho es un homicidio? ("Muerte no constitutiva de delito" también se guarda: queda en espera de necropsia)
export function esTipoHomicidio(delito, asunto) {
  const n = norm((delito || '') + ' ' + (asunto || ''));
  return /HOMICID/.test(n) || /MUERTE NO CONSTITUTIVA|NO CONSTITUTIVA DE DELITO/.test(n);
}

// Avisos con lo que hay EN PANTALLA en este momento: si la persona corrige un campo, el aviso desaparece
export function revisar(t) {
  const a = [];
  if (!t.fecha) a.push('Falta la fecha.');
  if (!t.sector) a.push(t.sectorCrudo ? 'El sector "' + t.sectorCrudo + '" no está en el catálogo: elígelo de la lista.' : 'No encontré el sector: elígelo de la lista.');
  else if (t.sectorAuto && t.sector === t.sectorAuto) a.push('El sector se tomó del lugar del hecho (' + t.sector + '). Verifícalo.');
  if (!t.delito) a.push('Falta el tipo de hecho.');
  else if (!esTipoHomicidio(t.delito, t.asunto)) a.push('Esta tarjeta no es de homicidio: aquí solo se guardan homicidios dolosos.');
  if (!t.lugar) a.push('Falta el lugar.');
  return a;
}
