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
  // Cada tarjeta trae su línea de fecha ("Acapulco, Guerrero; a 31 de octubre del 2026"): es la marca más confiable para separarlas,
  // aunque unas traigan encabezado ("Tarjeta informativa…") y otras no (las de levantamiento cadavérico pegadas juntas).
  const reFecha = /(?:^|\n)[ \t]*Acapulco,?\s*Guerrero[;,.]?\s*a\s+\d{1,2}\s+de\s+[a-zA-ZáéíóúÁÉÍÓÚ]+/gi;
  const pos = []; let mm;
  while ((mm = reFecha.exec(limpio))) pos.push(mm.index + (mm[0].charAt(0) === '\n' ? 1 : 0));
  if (pos.length >= 2) {
    const bloques = pos.map((p, i) => limpio.slice(p, i + 1 < pos.length ? pos[i + 1] : undefined)).filter((x) => x.replace(/\s/g, '').length > 120);
    if (bloques.length >= 2) return bloques;
  }
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
const OTRA_ETIQUETA = /^(delito|tipo de|v[ií]ctima|imputado|hora|lugar|coordenadas?|breve|ca[a-z]{0,2}peta|carpeta|asunto|sector|situaci[oó]n|diagn[oó]stico|indicios?|autoridades)\b/i;
function valorDe(b, etiquetas) {
  for (const et of etiquetas) {
    // "Etiqueta: valor" o "Etiqueta. valor" (el valor va en la misma línea o en la siguiente)
    let m = b.match(new RegExp('(?:^|\\n)[ \\t]*(?:' + et + ')[ \\t]*[:.][ \\t]*([^\\n]*)(?:\\n\\s*([^\\n]+))?', 'i'));
    // "Etiqueta" sola en su renglón y el valor abajo
    if (!m) m = b.match(new RegExp('(?:^|\\n)[ \\t]*(?:' + et + ')[ \\t]*(?=\\n)()(?:\\n\\s*([^\\n]+))?', 'i'));
    if (!m) continue;
    const misma = (m[1] || '').trim();
    if (misma) return misma;
    const sig = (m[2] || '').trim();
    if (sig && !/^[A-Za-zÁÉÍÓÚáéíóúÑñ .]{2,40}:/.test(sig) && !OTRA_ETIQUETA.test(sig)) return sig;
  }
  return '';
}

// El lugar puede ocupar varios renglones ("Avenida X…" y abajo "Hospital General…"): se juntan los que siguen
// si parecen continuación de la dirección y se corta en el primer renglón vacío o la siguiente etiqueta.
const CONTINUA_DIRECCION = /^(hospital|cl[ií]nica|centro de salud|cruz roja|imss|issste|frente|entre|esquina|a la altura|junto|c\.?\s?p\.?|col\.?|colonia|fracc|calle|avenida|av\.|carretera|km\b|lote|manzana|mz\b|[aá]rea|interior|exterior)/i;
function lugarDe(b) {
  const lineas = b.split('\n');
  const et = /^[ \t]*(?:Lugar de intervenci[oó]n|Lugar de los hechos|Lugar del hecho|Ubicaci[oó]n|Lugar)[ \t]*(?:[:.][ \t]*(.*))?$/i;
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(et);
    if (!m) continue;
    const partes = [];
    if ((m[1] || '').trim()) partes.push(m[1].trim());
    for (let j = i + 1; j < lineas.length && j <= i + 5; j++) {
      const l = lineas[j].trim();
      if (!l) { if (partes.length) break; continue; }
      if (OTRA_ETIQUETA.test(l) || /^[A-Za-zÁÉÍÓÚáéíóúÑñ .]{2,40}:/.test(l)) break;
      if (partes.length && !CONTINUA_DIRECCION.test(l)) break;
      partes.push(l);
    }
    if (partes.length) return partes.join(', ');
  }
  return '';
}

// Unidad (dígitos 6 y 7) de la carpeta de investigación → sector. Solo las unidades que no se comparten entre sectores.
const UNIDAD_SECTOR = { '29': 'Renacimiento', '22': 'Mozimba', '24': 'Zapata', '36': 'Coyuca de Benítez', '23': 'Barrios Históricos', '08': 'Central', '21': 'Garita', '25': 'Jardín', '31': 'Costa Azul', '32': 'Costa Azul', '35': 'San Marcos' };
export function sectorDeCarpeta(ci) {
  const d = String(ci || '').replace(/\D/g, '');
  return d.length === 20 && d.slice(0, 5) === '12030' ? (UNIDAD_SECTOR[d.slice(5, 7)] || null) : null;
}
// ddmmaa del final de la carpeta → 'AAAA-MM-DD' (o null si no es una fecha)
export function fechaDeCarpeta(ci) {
  const d = String(ci || '').replace(/\D/g, '');
  if (d.length !== 20) return null;
  const dd = +d.slice(14, 16), mm = +d.slice(16, 18), aa = 2000 + +d.slice(18, 20);
  const f = new Date(Date.UTC(aa, mm - 1, dd));
  return f.getUTCFullYear() === aa && f.getUTCMonth() === mm - 1 && f.getUTCDate() === dd ? aa + '-' + pad(mm) + '-' + pad(dd) : null;
}
const aDias = (iso) => { const p = String(iso).slice(0, 10).split('-').map(Number); return Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000); };

// Sector escrito en el texto ("Agente del Ministerio Público en turno del Sector Zapata")
function sectorDeTexto(b) {
  const n = norm(b);
  const lista = SECTORES.map((s) => [s, norm(s)]).concat(Object.keys(ALIAS_SECTOR).map((k) => [ALIAS_SECTOR[k], k]));
  for (const [s, k] of lista) { if (new RegExp('SECTOR\\s+' + k.replace(/\s+/g, '\\s+') + '\\b').test(n)) return s; }
  return null;
}

// Fecha del hecho. Prioridad: la del encabezado ("Acapulco, Guerrero, a 30 de octubre de 2026"), luego "...horas del día 30 de octubre...",
// y al final cualquier otra fecha del texto. Si el año falta o está mal escrito ("deldel año"), se toma de la carpeta.
function fechaDe(b, ci) {
  const MES = '([a-zA-ZáéíóúÁÉÍÓÚ]+)(?:\\s+(?:de|del))*(?:\\s+a[nñ]o)?\\s*(\\d{4})?';
  const intentos = [
    [b.split('\n').slice(0, 6).join('\n'), new RegExp('(\\d{1,2})\\s+de\\s+' + MES, 'i')],
    [b, new RegExp('horas\\s+del\\s+d[ií]a\\s+(\\d{1,2})\\s+de\\s+' + MES, 'i')],
  ];
  const suf = fechaDeCarpeta(ci);
  for (const [texto, re] of intentos) {
    const m = texto.match(re);
    if (!m || !MESES[sinAcentos(m[2]).toLowerCase()]) continue;
    const mes = MESES[sinAcentos(m[2]).toLowerCase()], dia = +m[1];
    let anio = m[3] ? +m[3] : null;
    if (!anio && suf && +suf.slice(5, 7) === mes && +suf.slice(8, 10) === dia) anio = +suf.slice(0, 4);
    if (!anio) { const ma = b.match(/a[nñ]o\s+(20\d{2})/i); if (ma) anio = +ma[1]; }
    if (anio) return anio + '-' + pad(mes) + '-' + pad(dia);
  }
  const mf = b.match(/(\d{1,2})\s+de\s+([a-zA-ZáéíóúÁÉÍÓÚ]+)\s+(?:de|del)\s+(\d{4})/i);
  if (mf && MESES[sinAcentos(mf[2]).toLowerCase()]) return mf[3] + '-' + pad(MESES[sinAcentos(mf[2]).toLowerCase()]) + '-' + pad(+mf[1]);
  const md = b.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (md) return md[3] + '-' + pad(+md[2]) + '-' + pad(+md[1]);
  return suf || '';
}

// "Coordenadas: 16.900250,-99.827278" → { lat, lng } si caen en la zona de Acapulco y Coyuca
function coordenadasDe(b) {
  const v = valorDe(b, ['Coordenadas?', 'Coordenadas GPS', 'Ubicaci[oó]n GPS']);
  const m = v.match(/(-?\d{1,3}\.\d{3,})\s*[,;]?\s*(-?\d{1,3}\.\d{3,})/);   // "16.86,-99.87", "16.85 -99.84" y "16.8605549-99.871673"
  if (!m) return null;
  const la = parseFloat(m[1]); let lo = parseFloat(m[2]); if (lo > 0) lo = -lo;
  return la >= 16.4 && la <= 17.5 && lo >= -100.6 && lo <= -99.0 ? { lat: la, lng: lo } : null;
}
const limpiarValor = (v) => String(v || '').replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();

function leerUna(bloque, n) {
  const b = bloque;
  // Fecha: "Acapulco, Guerrero; a 26 de octubre de 2026"
  // (la fecha se calcula más abajo, cuando ya se leyó la carpeta: la carpeta sirve para completar o confirmar el año)

  const sectorCrudo = limpiarValor(valorDe(b, ['Sector', 'Coordinaci[oó]n', 'Zona']));
  const asunto = limpiarValor(valorDe(b, ['Asunto']));
  // El tipo puede venir en "Tipo de hecho", "Tipo de hecho delictivo", "Tipo de delito" o "Delito": si hay varios, gana el que dice homicidio
  // o muerte no constitutiva (en algunas tarjetas "Tipo de hecho" describe la escena y el delito va en otra línea).
  const candidatos = ['Tipo de hecho', 'Tipo de hecho delictivo', 'Tipo de delito', 'Delito', 'Tipificaci[oó]n', 'Hecho delictivo', 'Hecho']
    .map((et) => limpiarValor(valorDe(b, [et]))).filter(Boolean);
  const tipo = candidatos.find((c) => esTipoHomicidio(c, '')) || candidatos[0] || '';

  // El lugar puede ir en la misma línea de la etiqueta o en la línea siguiente
  const lugar = limpiarValor(lugarDe(b) || valorDe(b, ['Lugar de intervenci[oó]n', 'Lugar de los hechos', 'Lugar del hecho', 'Ubicaci[oó]n', 'Lugar']));

  // Carpeta de investigación: con etiqueta, o un número suelto de 20 dígitos
  let ci = '';
  const mc = b.match(/(?:\bC\.?\s?I\.?\b|\bca[a-z]{0,2}peta\s+de\s+investigaci[oó]n)[^\d\n]{0,30}(\d[\d ]{9,})/i);
  if (mc) ci = mc[1].replace(/\s+/g, '');
  else { const m20 = b.match(/\b\d{20}\b/); if (m20) ci = m20[0]; }

  const mcal = b.match(/calibre\s*(\.?\d{2,3})\s*(mm|milimetros)?/i) || b.match(/\b(\d{1,2})\s?mm\b/i);
  const calibre = mcal ? (mcal[1].replace(/\s/g, '') + ((mcal[2] || /mm/i.test(mcal[0])) ? 'MM' : '')).toUpperCase().replace(/MM+$/, 'MM') : '';

  let delito = tipo.toUpperCase();
  // "Persona privada de la vida, muerte no constitutiva de delito (accidente de trabajo)" → siempre el mismo texto, con su aclaración
  const mnc = tipo.match(/no constitutiv[oa]\s+de\s+delito(?:\s*\(([^)]*)\))?/i);
  if (mnc) delito = 'MUERTE NO CONSTITUTIVA DE DELITO' + (mnc[1] && mnc[1].trim() ? ' (' + mnc[1].trim().toUpperCase() + ')' : '');
  let sector = normalizarSector(sectorCrudo);
  // Si la tarjeta no trae la etiqueta del sector se deduce, en este orden: de lo que dice el texto ("turno del Sector Zapata"),
  // de la unidad de la carpeta de investigación y, al final, del nombre de un sector en el lugar. Siempre se avisa para que se verifique.
  let sectorAuto = '', sectorOrigen = '';
  const sectorCarpeta = sectorDeCarpeta(ci);
  if (!sector) {
    const dt = sectorDeTexto(b);
    if (dt) { sector = dt; sectorAuto = dt; sectorOrigen = 'texto'; }
    else if (sectorCarpeta) { sector = sectorCarpeta; sectorAuto = sectorCarpeta; sectorOrigen = 'carpeta'; }
  }
  if (!sector) {
    const hallados = SECTORES.filter((x) => new RegExp('(^|[^a-z])' + norm(x).toLowerCase().replace(/\s+/g, '\\s+') + '([^a-z]|$)').test(norm(lugar).toLowerCase()));
    if (hallados.length === 1) { sector = hallados[0]; sectorAuto = hallados[0]; sectorOrigen = 'lugar'; }
  }

  const fecha = fechaDe(b, ci);
  const coord = coordenadasDe(b);

  return {
    id: 't' + n + '-' + Date.now(), fecha, hora: hora(b, 'Hora de aviso'), horaArribo: hora(b, 'Hora de arribo'),
    sector: sector || '', sectorAuto, sectorOrigen, sectorCarpeta: sectorCarpeta || '', sectorCrudo, asunto, delito, lugar, ci, calibre,
    lat: coord ? coord.lat : null, lng: coord ? coord.lng : null,
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
  return /HOMICID/.test(n) || /NO CONSTITUTIV[OA]/.test(n);
}

// Avisos con lo que hay EN PANTALLA en este momento: si la persona corrige un campo, el aviso desaparece
export function revisar(t) {
  const a = [];
  if (!t.fecha) a.push('Falta la fecha.');
  if (!t.sector) a.push(t.sectorCrudo ? 'El sector "' + t.sectorCrudo + '" no está en el catálogo: elígelo de la lista.' : 'No encontré el sector: elígelo de la lista.');
  else if (t.sectorAuto && t.sector === t.sectorAuto) a.push('El sector se tomó ' + (t.sectorOrigen === 'texto' ? 'de lo que dice la tarjeta' : t.sectorOrigen === 'carpeta' ? 'de la unidad de la carpeta' : 'del lugar del hecho') + ' (' + t.sector + '). Verifícalo.');
  if (t.sector && t.sectorCarpeta && t.sector !== t.sectorCarpeta) a.push('La carpeta es de la unidad de ' + t.sectorCarpeta + ', pero el sector elegido es ' + t.sector + '. Verifícalo.');
  if (!t.delito) a.push('Falta el tipo de hecho.');
  else if (!esTipoHomicidio(t.delito, t.asunto)) a.push('Esta tarjeta no es de homicidio: aquí solo se guardan homicidios dolosos.');
  if (!t.lugar) a.push('Falta el lugar.');
  const suf = fechaDeCarpeta(t.ci);
  if (t.fecha && suf && Math.abs(aDias(t.fecha) - aDias(suf)) > 3) a.push('La fecha (' + t.fecha.slice(8, 10) + '/' + t.fecha.slice(5, 7) + '/' + t.fecha.slice(0, 4) + ') no coincide con la que trae la carpeta (' + suf.slice(8, 10) + '/' + suf.slice(5, 7) + '/' + suf.slice(0, 4) + '). Verifícala.');
  return a;
}
