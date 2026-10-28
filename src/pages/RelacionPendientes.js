// src/pages/RelacionPendientes.js
// Genera, desde la propia base, la relación de datos pendientes que el regional manda a su personal:
// qué casos de homicidios dolosos tienen datos faltantes o en duda, y qué debe enviar el personal para cada uno.
//
// El Excel trae tres hojas: Instrucción (el oficio breve), Pendientes (por coordinación) y Falta hora de aviso.
// No lleva nombres de víctimas ni de imputados. Es de uso interno.

import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';

const pad = (n) => String(n).padStart(2, '0');
const fechaCorta = (iso) => { const p = String(iso || '').slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; };

const COMO_UBICAR = 'Dirección exacta (calle y número, o esquina, colonia y una referencia cercana) o las coordenadas tomadas con el teléfono: en Google Maps, mantener presionado el punto y copiar los dos números que aparecen arriba.';

// Analiza un caso y devuelve lo que falta o está en duda. rows: registros de incidencia_regional
export function analizarCaso(r, comparten = 0) {
  const dudas = [], pedir = [];
  let estadoUbicacion = 'Confirmada';
  if (r.coordenadas_lat == null) {
    estadoUbicacion = 'Sin ubicar';
    dudas.push('Falta la ubicación exacta del hecho.');
    pedir.push(COMO_UBICAR);
  } else if (!r.ubicacion_confirmada) {
    estadoUbicacion = 'Sin confirmar';
    dudas.push('La ubicación es una estimación (por la colonia o la dirección) y no está confirmada.');
    pedir.push('Confirmar si el punto es correcto, o enviar la calle exacta o las coordenadas.');
  }
  // Dos carpetas distintas con exactamente las mismas coordenadas confirmadas suelen ser un dato copiado
  if (comparten > 0) {
    dudas.push('Comparte exactamente las mismas coordenadas con ' + comparten + (comparten === 1 ? ' otra carpeta.' : ' otras carpetas.'));
    pedir.push('Confirmar que ocurrieron en el mismo lugar o enviar las coordenadas correctas de este hecho.');
  }
  if (r.lugar_es_hospital) {
    dudas.push('El lugar registrado es un hospital o servicio médico.');
    pedir.push('Indicar dónde ocurrió la agresión o el hecho, si se conoce.');
  }
  const ci = String(r.carpeta_investigacion || '').replace(/\s+/g, '');
  if (/\d{10,}/.test(ci) && ci.length !== 20) {
    dudas.push('La carpeta de investigación tiene ' + ci.length + ' dígitos y lo normal son 20.');
    pedir.push('Verificar y enviar el número correcto de la carpeta de investigación.');
  }
  // La carpeta termina con la fecha en que se abrió (ddmmaa). Si no coincide con la fecha del hecho, se pide aclararlo
  const f = String(r.fecha || '').slice(0, 10).split('-');
  if (ci.length === 20 && f.length === 3) {
    const sufijo = ci.slice(-6), esperado = f[2] + f[1] + f[0].slice(2);
    if (sufijo !== esperado) {
      dudas.push('La fecha del hecho (' + fechaCorta(r.fecha) + ') no coincide con la fecha con que termina la carpeta (' + sufijo.slice(0, 2) + '/' + sufijo.slice(2, 4) + '/20' + sufijo.slice(4) + ').');
      pedir.push('Confirmar la fecha en que ocurrió el hecho y la fecha en que se tuvo conocimiento.');
    }
  }
  return { estadoUbicacion, dudas, pedir };
}

export function armarRelacion(registros, hoy = new Date()) {
  const pendientes = [];
  const sinHora = [];
  const llave = (r) => (r.ubicacion_confirmada && r.coordenadas_lat != null && r.coordenadas_lng != null ? Number(r.coordenadas_lat).toFixed(5) + ',' + Number(r.coordenadas_lng).toFixed(5) : null);
  const cuentaCoord = {};
  registros.forEach((r) => { const k = llave(r); if (k) cuentaCoord[k] = (cuentaCoord[k] || 0) + 1; });
  registros.forEach((r) => {
    const k = llave(r);
    const a = analizarCaso(r, k ? cuentaCoord[k] - 1 : 0);
    if (a.dudas.length) pendientes.push({ r, a });
    if (!r.hora_conocimiento) sinHora.push(r);
  });
  const porZona = (x, y) => String(x.zona || '').localeCompare(String(y.zona || ''), 'es') || String(x.fecha).localeCompare(String(y.fecha));
  pendientes.sort((x, y) => porZona(x.r, y.r));
  sinHora.sort(porZona);

  const hojaPend = pendientes.map((p, i) => ({
    'No.': i + 1, 'COORDINACIÓN': p.r.zona || '', 'FECHA': fechaCorta(p.r.fecha), 'CARPETA DE INVESTIGACIÓN': p.r.carpeta_investigacion || '',
    'LUGAR DE LOS HECHOS (COMO ESTÁ REGISTRADO)': p.r.lugar_hechos || '', 'UBICACIÓN': p.a.estadoUbicacion,
    'DATO FALTANTE O EN DUDA': p.a.dudas.join(' '), 'QUÉ DEBE ENVIAR EL PERSONAL': p.a.pedir.join(' '),
    'RESPUESTA DEL PERSONAL': '', 'LATITUD': '', 'LONGITUD': '',
  }));
  const hojaHora = sinHora.map((r, i) => ({
    'No.': i + 1, 'COORDINACIÓN': r.zona || '', 'FECHA': fechaCorta(r.fecha), 'CARPETA DE INVESTIGACIÓN': r.carpeta_investigacion || '',
    'HORA DE AVISO (24 H, EJ. 19:06)': '',
  }));

  const nSin = pendientes.filter((p) => p.a.estadoUbicacion === 'Sin ubicar').length;
  const nConf = pendientes.filter((p) => p.a.estadoUbicacion === 'Sin confirmar').length;
  const corte = pad(hoy.getDate()) + '/' + pad(hoy.getMonth() + 1) + '/' + hoy.getFullYear();
  const instruccion = [
    ['RELACIÓN DE DATOS PENDIENTES · ESTADÍSTICA DE HOMICIDIOS DOLOSOS · REGIÓN ACAPULCO'],
    ['Corte al ' + corte + '. Uso interno.'],
    [''],
    ['OBJETIVO'],
    ['Completar y confirmar los datos de los casos que se indican, para mantener actualizada la estadística y el mapa de homicidios dolosos de la región.'],
    [''],
    ['RESUMEN'],
    ['Casos con datos faltantes o en duda: ' + pendientes.length + ' (sin ubicar: ' + nSin + '; con ubicación sin confirmar: ' + nConf + ').'],
    ['Casos sin hora de aviso: ' + sinHora.length + ' (hoja "Falta hora de aviso").'],
    [''],
    ['QUÉ SE SOLICITA AL PERSONAL'],
    ['1. Revisar la hoja "Pendientes", ordenada por coordinación y fecha.'],
    ['2. Responder en la columna "RESPUESTA DEL PERSONAL" y, si cuenta con ellas, anotar las coordenadas en LATITUD y LONGITUD.'],
    ['3. Anotar la hora en que se tuvo conocimiento del hecho en la hoja "Falta hora de aviso" (formato de 24 horas, por ejemplo 19:06).'],
    ['4. Para ubicar un hecho: ' + COMO_UBICAR],
    ['5. No anotar nombres de víctimas ni de imputados. Solo los datos del hecho.'],
    [''],
    ['PLAZO DE RESPUESTA: ____________________      ENVIAR A: ____________________'],
  ];
  return { instruccion, hojaPend, hojaHora, resumen: { pendientes: pendientes.length, sinUbicar: nSin, sinConfirmar: nConf, sinHora: sinHora.length } };
}

export function libroRelacion(registros, hoy) {
  const { instruccion, hojaPend, hojaHora, resumen } = armarRelacion(registros, hoy);
  const wb = XLSX.utils.book_new();
  const w1 = XLSX.utils.aoa_to_sheet(instruccion);
  w1['!cols'] = [{ wch: 140 }];
  XLSX.utils.book_append_sheet(wb, w1, 'Instrucción');
  const w2 = XLSX.utils.json_to_sheet(hojaPend.length ? hojaPend : [{ 'No.': '', 'COORDINACIÓN': 'Sin pendientes' }]);
  w2['!cols'] = [{ wch: 5 }, { wch: 16 }, { wch: 11 }, { wch: 24 }, { wch: 52 }, { wch: 14 }, { wch: 52 }, { wch: 60 }, { wch: 40 }, { wch: 11 }, { wch: 11 }];
  XLSX.utils.book_append_sheet(wb, w2, 'Pendientes');
  const w3 = XLSX.utils.json_to_sheet(hojaHora.length ? hojaHora : [{ 'No.': '', 'COORDINACIÓN': 'Todos tienen hora' }]);
  w3['!cols'] = [{ wch: 5 }, { wch: 16 }, { wch: 11 }, { wch: 24 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, w3, 'Falta hora de aviso');
  return { wb, resumen };
}

// Consulta la base y descarga el Excel
export async function descargarRelacionPendientes() {
  const cols = 'zona, fecha, carpeta_investigacion, lugar_hechos, coordenadas_lat, coordenadas_lng, ubicacion_confirmada, lugar_es_hospital';
  let { data, error } = await supabase.from('incidencia_regional').select(cols + ', hora_conocimiento').order('fecha', { ascending: true });
  if (error && /hora_conocimiento/i.test(error.message || '')) ({ data, error } = await supabase.from('incidencia_regional').select(cols).order('fecha', { ascending: true }));
  if (error) throw error;
  const hoy = new Date();
  const { wb, resumen } = libroRelacion(data || [], hoy);
  XLSX.writeFile(wb, 'RELACION_PENDIENTES_REGION_ACAPULCO_' + hoy.getFullYear() + pad(hoy.getMonth() + 1) + pad(hoy.getDate()) + '.xlsx');
  return resumen;
}
