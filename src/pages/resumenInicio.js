// src/pages/resumenInicio.js
// El "cerebro" del Inicio ejecutivo: convierte los casos de homicidio de TU alcance en cifras, un resumen en lenguaje
// natural y una lista priorizada de asuntos que requieren atención.
//
// Todo se calcula con reglas simples y revisables, en el navegador y con los datos que ya puedes ver:
// no se envía nada a ningún servicio externo ni se usa inteligencia artificial para redactar.
// Criterio de conteo: la "muerte no constitutiva de delito" (en espera de necropsia) NO cuenta como homicidio doloso.

import { clasificarDelito } from './clasificarDelito';

const DIA = 86400000;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ABR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const aDia = (iso) => { const p = String(iso).slice(0, 10).split('-').map(Number); return Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / DIA); };
const deDia = (d) => new Date(d * DIA).toISOString().slice(0, 10);
const diaDeHoy = (hoy) => Math.floor(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) / DIA);

export function fechaLarga(iso) { const p = String(iso).slice(0, 10).split('-'); return Number(p[2]) + ' de ' + MESES[Number(p[1]) - 1]; }
export function rangoLargo(a, b) {
  const pa = a.split('-'), pb = b.split('-');
  if (pa[1] === pb[1]) return 'del ' + Number(pa[2]) + ' al ' + Number(pb[2]) + ' de ' + MESES[Number(pa[1]) - 1];
  return 'del ' + Number(pa[2]) + ' de ' + MESES[Number(pa[1]) - 1] + ' al ' + Number(pb[2]) + ' de ' + MESES[Number(pb[1]) - 1];
}
const etiquetaSemana = (a, b) => { const pa = a.split('-'), pb = b.split('-'); return pa[1] === pb[1] ? Number(pa[2]) + '–' + Number(pb[2]) + ' ' + ABR[Number(pa[1]) - 1] : Number(pa[2]) + ' ' + ABR[Number(pa[1]) - 1] + '–' + Number(pb[2]) + ' ' + ABR[Number(pb[1]) - 1]; };

// casos: [{ fecha, zona, delito, coordenadas_lat, ubicacion_confirmada, hora_conocimiento }]
export function analizarCasos(casos, hoy = new Date()) {
  const hoyD = diaDeHoy(hoy);
  const validos = [], pendientes = [];
  (casos || []).forEach((c) => { (clasificarDelito(c.delito).pendiente ? pendientes : validos).push(c); });

  let n30 = 0, nPrev = 0, ultima = '';
  const porZona = {}, medios = {};
  const semanas = [];
  for (let b = 0; b < 8; b++) { const fin = hoyD - 7 * (7 - b); semanas.push({ ini: deDia(fin - 6), fin: deDia(fin), n: 0 }); }
  const porMes = {};

  // Hallazgos en fosa clandestina: se cuentan todos (aunque el caso esté en espera de necropsia): un hallazgo es un hallazgo.
  // Cada uno es una carpeta de investigación (no es el número de víctimas).
  let hallazgos30 = 0, hallazgos7 = 0, hallazgosTotal = 0, ultimoHallazgo = '';
  (casos || []).forEach((c) => {
    if (!c.fecha || !clasificarDelito(c.delito).hallazgo) return;
    const f = String(c.fecha).slice(0, 10), edad = hoyD - aDia(f);
    hallazgosTotal++;
    if (f > ultimoHallazgo) ultimoHallazgo = f;
    if (edad >= 0 && edad < 30) hallazgos30++;
    if (edad >= 0 && edad < 7) hallazgos7++;
  });

  validos.forEach((c) => {
    if (!c.fecha) return;
    const f = String(c.fecha).slice(0, 10);
    if (f > ultima) ultima = f;
    porMes[f.slice(0, 7)] = (porMes[f.slice(0, 7)] || 0) + 1;
    const edad = hoyD - aDia(f);
    if (edad >= 0 && edad < 30) {
      n30++;
      const z = (c.zona && String(c.zona).trim()) || 'Sin coordinación';
      porZona[z] = (porZona[z] || 0) + 1;
      const m = clasificarDelito(c.delito).medio;
      medios[m] = (medios[m] || 0) + 1;
    } else if (edad >= 30 && edad < 60) nPrev++;
    for (let b = 0; b < 8; b++) { const d = aDia(f); if (d >= aDia(semanas[b].ini) && d <= aDia(semanas[b].fin)) { semanas[b].n++; break; } }
  });

  const zonas = Object.entries(porZona).sort((a, b) => b[1] - a[1]);
  const topZona = zonas[0] ? { zona: zonas[0][0], n: zonas[0][1], pct: Math.round(zonas[0][1] / n30 * 100) } : null;
  const mediosOrden = Object.entries(medios).filter((e) => e[0] !== 'Por determinar').sort((a, b) => b[1] - a[1]);
  const medioTop = mediosOrden[0] ? { nombre: mediosOrden[0][0], n: mediosOrden[0][1], pct: Math.round(mediosOrden[0][1] / n30 * 100) } : null;

  const prom = semanas.reduce((s, x) => s + x.n, 0) / semanas.length;
  let repunte = null;
  for (let b = 7; b >= 4; b--) { if (semanas[b].n >= prom * 1.5 && semanas[b].n >= 3) { repunte = { ini: semanas[b].ini, fin: semanas[b].fin, n: semanas[b].n, prom }; break; } }

  const sinUbicar = validos.filter((c) => c.coordenadas_lat == null).length;
  const sinConfirmar = validos.filter((c) => c.coordenadas_lat != null && !c.ubicacion_confirmada).length;
  const total = validos.length;

  return {
    total, n30, nPrev, ultima,
    cambioPct: nPrev > 0 ? Math.round((n30 / nPrev - 1) * 100) : null,
    ritmo: n30 > 0 ? 30 / n30 : null, ritmoPrev: nPrev > 0 ? 30 / nPrev : null,
    semanas: semanas.map((s) => ({ ...s, etiqueta: etiquetaSemana(s.ini, s.fin) })),
    promSemana: prom, repunte, zonas, topZona, medioTop,
    sinUbicar, sinConfirmar, pctUbicados: total > 0 ? Math.round((total - sinUbicar) / total * 100) : null,
    pendientesNecropsia: pendientes.length, porMes,
    hallazgos30, hallazgos7, hallazgosTotal, ultimoHallazgo,
  };
}

// Resumen del día: lista de frases; cada frase es una lista de { t: texto, b: true si va en negritas }
export function construirResumen(a) {
  if (!a || a.total === 0) return [[{ t: 'Todavía no hay casos de homicidio registrados en tu alcance.' }]];
  const frases = [];
  const comp = a.cambioPct === null ? ' (aún no hay un periodo anterior con el cual comparar).'
    : a.cambioPct === 0 ? ', igual que en los 30 días anteriores.'
    : ', ' + Math.abs(a.cambioPct) + '% ' + (a.cambioPct > 0 ? 'más' : 'menos') + ' que en los 30 días anteriores.';
  frases.push([{ t: 'En los últimos 30 días hubo ' }, { t: a.n30 + ' homicidios', b: true }, { t: comp }]);
  if (a.hallazgosTotal > 0) {
    frases.push(a.hallazgos30 > 0
      ? [{ t: 'Se registraron ' }, { t: a.hallazgos30 + (a.hallazgos30 === 1 ? ' hallazgo' : ' hallazgos') + ' en fosa clandestina', b: true }, { t: ' en los últimos 30 días (' + a.hallazgosTotal + ' en total).' }]
      : [{ t: 'No hubo hallazgos en fosa clandestina en los últimos 30 días (' + a.hallazgosTotal + ' en total).' }]);
  }
  if (a.repunte) frases.push([{ t: 'La semana ' }, { t: rangoLargo(a.repunte.ini, a.repunte.fin), b: true }, { t: ' fue un repunte, con ' + a.repunte.n + ' casos (el promedio semanal es ' + a.promSemana.toFixed(1) + ').' }]);
  else frases.push([{ t: 'En las últimas 8 semanas no hubo repuntes: ninguna semana superó en 50% el promedio.' }]);
  if (a.topZona) frases.push([{ t: a.topZona.zona, b: true }, { t: ' concentra ' + a.topZona.n + ' casos (' + a.topZona.pct + '%) y es la coordinación con más homicidios.' }]);
  if (a.medioTop) frases.push([{ t: 'El medio predominante es ' }, { t: a.medioTop.nombre.toLowerCase(), b: true }, { t: ' (' + a.medioTop.pct + '%).' }]);
  frases.push(a.sinUbicar > 0
    ? [{ t: a.sinUbicar + ' casos', b: true }, { t: ' siguen sin ubicar en el mapa.' }]
    : [{ t: 'Todos los casos están ubicados en el mapa.' }]);
  return frases;
}

// Asuntos que requieren atención, de mayor a menor prioridad. accion: { texto, seccion, tab } o null
export function construirAtencion(a, { rol, hoy = new Date(), avisosSinLeer = 0 } = {}) {
  const items = [];
  if (a && a.hallazgos7 > 0) {
    items.push({ nivel: 'alta', titulo: a.hallazgos7 === 1 ? 'Hallazgo en fosa clandestina esta semana' : a.hallazgos7 + ' hallazgos en fosa clandestina esta semana',
      detalle: 'Último: ' + fechaLarga(a.ultimoHallazgo) + '. Involucra a varias áreas para su localización', accion: { texto: 'Ver en el mapa', seccion: 'sara', tab: 'mapa' } });
  }
  if (a && a.topZona && a.topZona.n >= 4) {
    items.push({ nivel: 'alta', titulo: a.topZona.zona + ' concentra ' + a.topZona.n + ' homicidios en 30 días', detalle: a.topZona.pct + '% de los casos del periodo', accion: { texto: 'Ver en el mapa', seccion: 'sara', tab: 'mapa' } });
  }
  if (a && a.repunte) {
    items.push({ nivel: 'alta', titulo: 'Repunte la semana ' + rangoLargo(a.repunte.ini, a.repunte.fin), detalle: a.repunte.n + ' casos; el promedio semanal es ' + a.promSemana.toFixed(1), accion: { texto: 'Ver el panel', seccion: 'sara', tab: 'panel' } });
  }
  if (a && a.sinUbicar > 0) {
    items.push({ nivel: 'media', titulo: a.sinUbicar + (a.sinUbicar === 1 ? ' caso sin ubicar' : ' casos sin ubicar'), detalle: a.sinConfirmar > 0 ? 'Y ' + a.sinConfirmar + ' con la ubicación sin confirmar' : 'Cuentan en el panel, pero no aparecen en el mapa', accion: rol === 'mando' ? { texto: 'Revisar ubicaciones', seccion: 'sara', tab: 'importar' } : null });
  }
  if (a && a.pendientesNecropsia > 0) {
    items.push({ nivel: 'info', titulo: a.pendientesNecropsia + (a.pendientesNecropsia === 1 ? ' caso en espera de necropsia' : ' casos en espera de necropsia'), detalle: 'No cuentan como homicidio doloso hasta que el MP los reclasifique', accion: null });
  }
  if (rol === 'mando' && a && hoy.getDate() <= 7) {
    const prev = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const clave = prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0');
    if (a.porMes[clave] > 0) items.push({ nivel: 'info', titulo: 'El cierre de ' + MESES[prev.getMonth()] + ' está listo', detalle: 'Descarga el Excel del mes con la plantilla del regional', accion: { texto: 'Descargar', seccion: 'sara', tab: 'importar' } });
  }
  if (avisosSinLeer > 0) items.push({ nivel: 'info', titulo: avisosSinLeer + (avisosSinLeer === 1 ? ' aviso sin leer' : ' avisos sin leer'), detalle: 'Los encuentras en la campana, arriba a la derecha', accion: null });
  const orden = { alta: 0, media: 1, info: 2 };
  items.sort((x, y) => orden[x.nivel] - orden[y.nivel]);
  if (items.length === 0) items.push({ nivel: 'ok', titulo: 'Todo en orden', detalle: 'No hay asuntos pendientes por atender.', accion: null });
  return items;
}
