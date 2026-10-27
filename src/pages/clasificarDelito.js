// src/pages/clasificarDelito.js
// Agrupa las tipificaciones que escribe el Ministerio Público en categorías para el ANÁLISIS.
// El texto original del MP nunca se modifica: sigue guardado tal cual en cada caso.
//
// Se separan dos cosas distintas:
//   - medio: cómo se cometió el homicidio (arma de fuego, arma blanca, estrangulamiento o equivalente, etc.)
//   - hallazgo: circunstancia en que se encontró (por ejemplo, fosa). No es un medio.
// Si la tipificación no menciona el medio (p. ej. cuando falta el dictamen del perito), queda "Por determinar".

export function normalizar(t) {
  return String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// El orden importa: gana la primera categoría que coincida.
const REGLAS = [
  { medio: 'Desmembramiento, desollado o calcinado', palabras: ['DESMEMBR', 'MUTIL', 'DECAPIT', 'DESOLL', 'CALCIN', 'INCINER'] },
  { medio: 'Arma de fuego', palabras: ['ARMA DE FUEGO', 'ARMA FUEGO', 'PROYECTIL', 'DISPARO'] },
  { medio: 'Arma blanca', palabras: ['ARMA BLANCA', 'PUNZOCORTANTE', 'CORTOPUNZANTE', 'PUNZANTE', 'CUCHILL'] },
  // "Torniquete" es el término que se usa en la región; incluye estrangulamiento y asfixia
  { medio: 'Torniquete', palabras: ['TORNIQUETE', 'ESTRANGUL', 'ASFIXIA', 'AHORCA', 'SOFOCA', 'SUFOCA'] },
  { medio: 'Golpes', palabras: ['GOLPES', 'CONTUNDENTE', 'LAPIDA'] },
];

export const MEDIOS_ORDEN = ['Arma de fuego', 'Torniquete', 'Arma blanca', 'Desmembramiento, desollado o calcinado', 'Golpes', 'Por determinar'];

// Colores atenuados de la paleta institucional (guinda, dorado, azul y tonos arena). tx = color del texto sobre ese fondo
export const COLOR_MEDIO = {
  'Arma de fuego': { bg: '#9a5a5e', tx: '#ffffff' },
  'Torniquete': { bg: '#cdb078', tx: '#001a4d' },
  'Arma blanca': { bg: '#62739a', tx: '#ffffff' },
  'Desmembramiento, desollado o calcinado': { bg: '#8a7566', tx: '#ffffff' },
  'Golpes': { bg: '#b9b5ac', tx: '#001a4d' },
  'Por determinar': { bg: '#e6dcc3', tx: '#001a4d' },
};

export function clasificarDelito(texto) {
  const n = normalizar(texto);
  let medio = 'Por determinar';
  for (const r of REGLAS) { if (r.palabras.some((p) => n.includes(p))) { medio = r.medio; break; } }
  // "Muerte no constitutiva de delito": mientras no haya resultado de necropsia NO es homicidio doloso; el MP reclasifica después
  const pendiente = /MUERTE NO CONSTITUTIVA|NO CONSTITUTIVA DE DELITO/.test(n);
  return { medio, pendiente, calificado: n.includes('CALIFICADO'), hallazgo: /\bFOSAS?\b|CLANDESTIN|INHUMAD/.test(n) ? 'Hallazgo en fosa' : null };
}
