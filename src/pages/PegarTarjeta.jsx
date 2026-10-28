// src/pages/PegarTarjeta.jsx
// Dos herramientas para la estadística de homicidios dolosos de la región Acapulco:
//   · Importar Excel  (en ImportarIncidenciaRegional.jsx): el histórico, mes completo.
//   · Pegar tarjeta   (este archivo): el hecho en tiempo real, directo desde la tarjeta informativa.
//   · Cierre de mes   (este archivo): genera el Excel del mes con la misma plantilla del regional.
//
// Reglas:
//  - Solo se guardan los datos del hecho (fecha, hora de aviso, sector, tipo de hecho, lugar, carpeta, calibre).
//    No se guardan nombres de víctima ni imputado, edades, domicilios, alias ni la reseña.
//  - La carpeta de investigación es obligatoria: es la llave que evita duplicados.
//  - Todo queda en revisión: la persona ve lo leído y puede corregirlo antes de guardar.

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import { ClipboardPaste, Download, CheckCircle2, AlertTriangle, CalendarCheck } from 'lucide-react';
import { leerTarjetas, SECTORES } from './leerTarjeta';
import { clasificarDelito, COLOR_MEDIO } from './clasificarDelito';
import { nombreMesAnio } from './SelectorPeriodo';

const C = { navy: '#001a4d', gold: '#b69054', guinda: '#8b1e1e', white: '#ffffff', gray: '#5a6478', border: '#d8dde8', bg: '#f4f6fb', verde: '#2e7d32', ambar: '#7a4b00' };
const REGION = 'Región Acapulco';
const VIEWBOX = '-100.25,17.25,-99.30,16.60';
const CLASES_DIRECCION = ['highway', 'building', 'amenity', 'shop', 'tourism', 'healthcare', 'leisure', 'office'];
const esperar = (ms) => new Promise((res) => setTimeout(res, ms));

const btn = { borderRadius: 8, padding: '10px 18px', fontSize: 16, fontWeight: 700, cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 8 };
const btnPrimario = { ...btn, background: C.navy, border: '2px solid ' + C.navy, color: C.white };
const btnSecundario = { ...btn, background: C.white, border: '2px solid ' + C.navy, color: C.navy };
const etiqueta = { fontSize: 15, fontWeight: 700, color: C.gray, display: 'block', marginBottom: 4 };
const campo = { width: '100%', padding: '10px 12px', border: '2px solid #e8ecf1', borderRadius: 7, fontSize: 16, minHeight: 44, boxSizing: 'border-box', fontFamily: 'inherit' };

// ---------- ubicación (misma lógica del importador: solo se envía dirección + municipio) ----------
const municipioDe = (sector) => (sector === 'Coyuca de Benítez' ? 'Coyuca de Benítez' : sector === 'San Marcos' ? 'San Marcos' : 'Acapulco de Juárez');
function consultasDe(t) {
  const muni = municipioDe(t.sector);
  const q = [];
  const base = t.lugar.split(/como referencia|a un costado|frente a|bajando|subiendo/i)[0].replace(/\s+/g, ' ').trim().slice(0, 160);
  if (base) q.push({ q: `${base}, ${muni}, Guerrero, México`, nivel: 'direccion' });
  const m = t.lugar.match(/(?:colonia|col\.?|fraccionamiento|fracc\.?|unidad habitacional)\s+([^,.;()]{3,60})/i);
  if (m) q.push({ q: `${m[1].trim()}, ${muni}, Guerrero, México`, nivel: 'colonia' });
  return q;
}
async function geocodificar(texto) {
  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=mx&bounded=1&viewbox=' + VIEWBOX + '&q=' + encodeURIComponent(texto);
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json();
  return j.length ? { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon), clase: j[0].class } : null;
}
async function ubicar(t) {
  for (const c of consultasDe(t)) {
    let hit = null;
    try { hit = await geocodificar(c.q); } catch (e) { hit = null; }
    await esperar(1100); // política de uso de Nominatim: máximo 1 consulta por segundo
    if (hit) return { lat: hit.lat, lng: hit.lng, precision: c.nivel === 'direccion' && CLASES_DIRECCION.includes(hit.clase) ? 'direccion' : 'aproximada' };
  }
  return null;
}

// ---------- Excel del mes (misma plantilla que manda el regional; el importador la lee igual) ----------
export const ENCABEZADOS = ['COORDINACION', 'FECHA', 'DELITO', 'CARPETA DE INVESTIGACIÓN', 'LUGAR DE LOS HECHOS', 'CARTULINA LOCALIZADA',
  'CALIBRE DE ARMA', 'VEHICULO ASEGURADO', 'DROGA ASEGURADA', 'HORA', 'LATITUD', 'LONGITUD'];
const siNo = (v) => (v === true ? 'SI' : v === false ? 'NO' : '');

export function filasExcel(registros) {
  return registros.map((r) => {
    const f = String(r.fecha || '').slice(0, 10).split('-');
    return {
      'COORDINACION': r.zona || '', 'FECHA': f.length === 3 ? f[2] + '/' + f[1] + '/' + f[0] : '', 'DELITO': r.delito || '',
      'CARPETA DE INVESTIGACIÓN': r.carpeta_investigacion || '', 'LUGAR DE LOS HECHOS': r.lugar_hechos || '',
      'CARTULINA LOCALIZADA': siNo(r.cartulina), 'CALIBRE DE ARMA': r.arma_calibre || 'NO',
      'VEHICULO ASEGURADO': siNo(r.vehiculo_asegurado), 'DROGA ASEGURADA': siNo(r.droga_asegurada),
      'HORA': r.hora_conocimiento ? String(r.hora_conocimiento).slice(0, 5) : '',
      // Solo se exportan coordenadas confirmadas: una ubicación aproximada no debe viajar como si fuera exacta
      'LATITUD': r.ubicacion_confirmada && r.coordenadas_lat != null ? r.coordenadas_lat : '',
      'LONGITUD': r.ubicacion_confirmada && r.coordenadas_lng != null ? r.coordenadas_lng : '',
    };
  });
}

export function libroDelMes(registros) {
  const ws = XLSX.utils.json_to_sheet(filasExcel(registros), { header: ENCABEZADOS });
  ws['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 46 }, { wch: 26 }, { wch: 60 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 11 }, { wch: 11 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'HOMICIDIOS DOLOSOS');
  return wb;
}

export async function descargarMes(region, clave) {
  const cols = 'zona, fecha, delito, carpeta_investigacion, lugar_hechos, cartulina, arma_calibre, vehiculo_asegurado, droga_asegurada, coordenadas_lat, coordenadas_lng, ubicacion_confirmada';
  let { data, error } = await supabase.from('incidencia_regional').select(cols + ', hora_conocimiento').eq('region', region).eq('mes_reporte', clave).order('fecha', { ascending: true });
  if (error && /hora_conocimiento/i.test(error.message || '')) ({ data, error } = await supabase.from('incidencia_regional').select(cols).eq('region', region).eq('mes_reporte', clave).order('fecha', { ascending: true }));
  if (error) throw error;
  const nombre = nombreMesAnio(clave).toUpperCase().replace(' ', '_');
  XLSX.writeFile(libroDelMes(data || []), 'HOMICIDIOS_DOLOSOS_' + nombre + '.xlsx');
  return (data || []).length;
}

async function mesesConDatos(region) {
  const { data } = await supabase.from('incidencia_regional').select('mes_reporte').eq('region', region).limit(5000);
  const cuenta = {};
  (data || []).forEach((r) => { if (r.mes_reporte) cuenta[r.mes_reporte] = (cuenta[r.mes_reporte] || 0) + 1; });
  return cuenta;
}

// ---------- Aviso de cierre de mes: aparece los primeros 7 días del mes siguiente ----------
export function AvisoCierreMes({ region = REGION }) {
  const [cuenta, setCuenta] = useState({});
  const [msg, setMsg] = useState(null);
  const [bajando, setBajando] = useState(false);
  useEffect(() => { mesesConDatos(region).then(setCuenta).catch(() => {}); }, [region]);
  const hoy = new Date();
  if (hoy.getDate() > 7) return null;
  const a = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const clave = a.getFullYear() + '-' + String(a.getMonth() + 1).padStart(2, '0');
  if (!cuenta[clave]) return null;
  const bajar = async () => { setBajando(true); setMsg(null); try { await descargarMes(region, clave); } catch (e) { setMsg('No se pudo generar el Excel: ' + e.message); } setBajando(false); };
  return (
    <div style={{ background: '#fff8e1', border: '1px solid #f0d58a', borderRadius: 10, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <CalendarCheck size={26} color={C.ambar} />
      <div style={{ flex: 1, minWidth: 240, fontSize: 17, color: C.navy, lineHeight: 1.4 }}>
        <strong>Cierre de {nombreMesAnio(clave)}:</strong> hay {cuenta[clave]} casos registrados. Ya puedes descargar el Excel del mes.
        {msg && <div style={{ color: C.guinda, fontSize: 15 }}>{msg}</div>}
      </div>
      <button onClick={bajar} disabled={bajando} style={{ ...btnPrimario, opacity: bajando ? 0.6 : 1 }}><Download size={20} /> {bajando ? 'Generando…' : 'Descargar Excel'}</button>
    </div>
  );
}

// ---------- Descarga del Excel de cualquier mes ----------
export function DescargaMes({ region = REGION }) {
  const [cuenta, setCuenta] = useState({});
  const [mes, setMes] = useState('');
  const [msg, setMsg] = useState(null);
  const [bajando, setBajando] = useState(false);
  useEffect(() => { mesesConDatos(region).then((c) => { setCuenta(c); const ks = Object.keys(c).sort(); if (ks.length) setMes(ks[ks.length - 1]); }).catch(() => {}); }, [region]);
  const claves = Object.keys(cuenta).sort().reverse();
  const bajar = async () => {
    setBajando(true); setMsg(null);
    try { const n = await descargarMes(region, mes); setMsg({ ok: true, t: 'Excel generado con ' + n + ' casos.' }); }
    catch (e) { setMsg({ ok: false, t: 'No se pudo generar el Excel: ' + e.message }); }
    setBajando(false);
  };
  return (
    <div style={{ background: C.white, border: '1px solid #b6905440', borderRadius: 10, padding: 16, marginTop: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 4 }}>Cierre de mes</div>
      <div style={{ fontSize: 16, color: C.gray, marginBottom: 12 }}>Descarga el Excel del mes con la plantilla del regional. Incluye solo los datos del hecho: sin nombres de víctimas ni imputados.</div>
      {claves.length === 0 ? <div style={{ fontSize: 16, color: C.gray }}>Todavía no hay casos registrados.</div> : (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={mes} onChange={(e) => setMes(e.target.value)} style={{ ...campo, width: 'auto', minWidth: 240 }}>
            {claves.map((k) => <option key={k} value={k}>{nombreMesAnio(k)} · {cuenta[k]} casos</option>)}
          </select>
          <button onClick={bajar} disabled={bajando || !mes} style={{ ...btnPrimario, opacity: bajando ? 0.6 : 1 }}><Download size={20} /> {bajando ? 'Generando…' : 'Descargar Excel del mes'}</button>
        </div>
      )}
      {msg && <div style={{ fontSize: 16, marginTop: 10, color: msg.ok ? C.verde : C.guinda, fontWeight: 700 }}>{msg.t}</div>}
    </div>
  );
}

// ---------- Pegar tarjeta ----------
export default function PegarTarjeta({ perfil, onGuardado }) {
  const [texto, setTexto] = useState('');
  const [tarjetas, setTarjetas] = useState([]);
  const [estado, setEstado] = useState({});   // id -> { tipo: 'trabajando' | 'ok' | 'error', texto }
  const [dup, setDup] = useState({});          // id -> 'carpeta' | 'posible'
  const [leido, setLeido] = useState(false);

  const poner = (id, cambios) => setTarjetas((ts) => ts.map((t) => (t.id === id ? { ...t, ...cambios } : t)));

  const revisarDuplicados = async (ts) => {
    const marca = {};
    try {
      const cis = ts.map((t) => t.ci).filter((c) => /\d{10,}/.test(c));
      const existentes = new Set();
      if (cis.length) {
        const { data } = await supabase.from('incidencia_regional').select('carpeta_investigacion').in('carpeta_investigacion', cis);
        (data || []).forEach((r) => existentes.add(r.carpeta_investigacion));
      }
      const fechas = [...new Set(ts.map((t) => t.fecha).filter(Boolean))];
      let mismos = [];
      if (fechas.length) {
        let { data, error } = await supabase.from('incidencia_regional').select('zona, fecha, hora_conocimiento').in('fecha', fechas);
        if (error) ({ data } = await supabase.from('incidencia_regional').select('zona, fecha').in('fecha', fechas));
        mismos = data || [];
      }
      ts.forEach((t) => {
        if (existentes.has(t.ci)) marca[t.id] = 'carpeta';
        else if (t.hora && mismos.some((r) => r.zona === t.sector && String(r.fecha).slice(0, 10) === t.fecha && r.hora_conocimiento && String(r.hora_conocimiento).slice(0, 5) === t.hora)) marca[t.id] = 'posible';
      });
    } catch (e) { /* si falla la revisión, el guardado vuelve a revisar la carpeta */ }
    setDup(marca);
  };

  const leer = async () => {
    const ts = leerTarjetas(texto);
    setTarjetas(ts); setEstado({}); setLeido(true);
    if (ts.length) await revisarDuplicados(ts);
  };
  const limpiar = () => { setTexto(''); setTarjetas([]); setEstado({}); setDup({}); setLeido(false); };

  const problemas = (t) => {
    const p = [];
    if (!t.esHomicidio) p.push('No es una tarjeta de homicidio.');
    if (!t.fecha) p.push('Falta la fecha.');
    if (!t.sector) p.push('Elige el sector.');
    if (!t.lugar) p.push('Falta el lugar.');
    if (!/\d{10,}/.test(t.ci)) p.push('Falta la carpeta de investigación.');
    return p;
  };

  const guardar = async (t) => {
    const p = problemas(t);
    if (p.length) { setEstado((e) => ({ ...e, [t.id]: { tipo: 'error', texto: p.join(' ') } })); return; }
    setEstado((e) => ({ ...e, [t.id]: { tipo: 'trabajando', texto: 'Revisando que no esté repetida…' } }));
    try {
      const { data: ya } = await supabase.from('incidencia_regional').select('carpeta_investigacion').eq('carpeta_investigacion', t.ci);
      if (ya && ya.length) { setEstado((e) => ({ ...e, [t.id]: { tipo: 'error', texto: 'Esa carpeta ya está registrada: no se duplica.' } })); return; }
      setEstado((e) => ({ ...e, [t.id]: { tipo: 'trabajando', texto: 'Buscando la ubicación…' } }));
      const ub = await ubicar(t);
      const fila = {
        carpeta_investigacion: t.ci, region: REGION, zona: t.sector, fecha: t.fecha, delito: t.delito || null,
        lugar_hechos: t.lugar, observaciones: null,
        coordenadas_lat: ub ? ub.lat : null, coordenadas_lng: ub ? ub.lng : null, ubicacion_confirmada: false,
        lugar_es_hospital: t.esHospital, cartulina: t.cartulina, vehiculo_asegurado: null, droga_asegurada: null,
        arma_calibre: t.calibre || null, mes_reporte: t.fecha.slice(0, 7), hora_conocimiento: t.hora || null,
        registrado_por_id: perfil ? perfil.id : null,
      };
      let { error } = await supabase.from('incidencia_regional').insert(fila);
      if (error && /hora_conocimiento/i.test(error.message || '')) { const { hora_conocimiento, ...resto } = fila; ({ error } = await supabase.from('incidencia_regional').insert(resto)); }
      if (error) { setEstado((e) => ({ ...e, [t.id]: { tipo: 'error', texto: 'No se pudo guardar: ' + error.message } })); return; }
      const donde = !ub ? 'Sin ubicación: cuenta en el panel y puedes ubicarla en Revisar ubicaciones.'
        : ub.precision === 'direccion' ? 'Ubicada por la dirección. Verifica el punto en Revisar ubicaciones.'
        : 'Ubicada de forma aproximada (por la colonia). Verifica el punto en Revisar ubicaciones.';
      const pend = clasificarDelito(t.delito).pendiente ? ' Está en espera de necropsia: no cuenta como homicidio doloso hasta que el MP la reclasifique.' : '';
      setEstado((e) => ({ ...e, [t.id]: { tipo: 'ok', texto: 'Guardada. ' + donde + pend } }));
      if (onGuardado) onGuardado();
    } catch (err) {
      setEstado((e) => ({ ...e, [t.id]: { tipo: 'error', texto: 'No se pudo guardar: ' + (err.message || err) } }));
    }
  };

  return (
    <div>
      <div style={{ fontSize: 17, color: '#374151', lineHeight: 1.5, marginBottom: 10 }}>
        Pega aquí la tarjeta informativa (puedes pegar varias juntas). El sistema lee solo los datos del hecho y tú los revisas antes de guardar.
      </div>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Pega aquí el texto de la tarjeta…"
        style={{ ...campo, minHeight: 200, resize: 'vertical', lineHeight: 1.5 }} aria-label="Texto de la tarjeta informativa" />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
        <button onClick={leer} disabled={!texto.trim()} style={{ ...btnPrimario, opacity: texto.trim() ? 1 : 0.5 }}><ClipboardPaste size={20} /> Leer tarjeta</button>
        {(texto || tarjetas.length > 0) && <button onClick={limpiar} style={btnSecundario}>Limpiar</button>}
        <span style={{ fontSize: 15, color: C.gray }}>No se guardan nombres, edades, domicilios ni la reseña de los hechos.</span>
      </div>

      {leido && tarjetas.length === 0 && <div style={{ fontSize: 17, color: C.guinda, marginTop: 14 }}>No encontré ninguna tarjeta en ese texto.</div>}

      {tarjetas.map((t, i) => {
        const cls = clasificarDelito(t.delito);
        const est = estado[t.id];
        const color = COLOR_MEDIO[cls.medio];
        const guardada = est && est.tipo === 'ok';
        return (
          <div key={t.id} style={{ background: C.white, border: '1px solid #b6905466', borderLeft: '6px solid ' + (guardada ? C.verde : C.navy), borderRadius: 10, padding: 16, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>Tarjeta {i + 1}</span>
              {t.delito && <span style={{ background: color.bg, color: color.tx, borderRadius: 14, padding: '4px 12px', fontSize: 15, fontWeight: 700 }}>{cls.pendiente ? 'En espera de necropsia' : cls.medio}</span>}
              {cls.calificado && <span style={{ background: '#eef1f6', color: C.navy, borderRadius: 14, padding: '4px 12px', fontSize: 15, fontWeight: 700 }}>Calificado</span>}
            </div>

            {dup[t.id] === 'carpeta' && <div style={{ background: '#fdecea', color: C.guinda, borderRadius: 8, padding: '8px 12px', fontSize: 16, fontWeight: 700, marginBottom: 10 }}><AlertTriangle size={16} style={{ verticalAlign: -2 }} /> Esa carpeta ya está registrada. No se va a duplicar.</div>}
            {dup[t.id] === 'posible' && <div style={{ background: '#fff8e1', color: C.ambar, borderRadius: 8, padding: '8px 12px', fontSize: 16, fontWeight: 700, marginBottom: 10 }}><AlertTriangle size={16} style={{ verticalAlign: -2 }} /> Posible duplicado: ya hay un caso del mismo sector, fecha y hora de aviso.</div>}
            {t.avisos.map((a, k) => <div key={k} style={{ fontSize: 16, color: C.ambar, marginBottom: 4 }}>• {a}</div>)}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginTop: 8 }}>
              <label><span style={etiqueta}>Fecha</span><input type="date" style={campo} value={t.fecha} onChange={(e) => poner(t.id, { fecha: e.target.value })} disabled={guardada} /></label>
              <label><span style={etiqueta}>Hora de aviso</span><input type="time" style={campo} value={t.hora} onChange={(e) => poner(t.id, { hora: e.target.value })} disabled={guardada} /></label>
              <label><span style={etiqueta}>Sector</span>
                <select style={campo} value={t.sector} onChange={(e) => poner(t.id, { sector: e.target.value })} disabled={guardada}>
                  <option value="">— Elige —</option>{SECTORES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select></label>
              <label><span style={etiqueta}>Calibre (si aparece)</span><input style={campo} value={t.calibre} onChange={(e) => poner(t.id, { calibre: e.target.value.toUpperCase() })} disabled={guardada} /></label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12, marginTop: 12 }}>
              <label><span style={etiqueta}>Tipo de hecho</span><input style={campo} value={t.delito} onChange={(e) => poner(t.id, { delito: e.target.value.toUpperCase() })} disabled={guardada} /></label>
              <label><span style={etiqueta}>Carpeta de investigación (obligatoria)</span><input style={{ ...campo, borderColor: /\d{10,}/.test(t.ci) ? '#e8ecf1' : C.gold }} value={t.ci} inputMode="numeric" placeholder="La tarjeta preliminar casi nunca la trae" onChange={(e) => poner(t.id, { ci: e.target.value.replace(/\s+/g, '') })} onBlur={() => revisarDuplicados(tarjetas)} disabled={guardada} /></label>
            </div>
            <label style={{ display: 'block', marginTop: 12 }}><span style={etiqueta}>Lugar de intervención</span><input style={campo} value={t.lugar} onChange={(e) => poner(t.id, { lugar: e.target.value })} disabled={guardada} /></label>
            {t.ci && t.ci.length !== 20 && /\d{10,}/.test(t.ci) && <div style={{ fontSize: 15, color: C.ambar, marginTop: 6 }}>La carpeta tiene {t.ci.length} dígitos y lo normal son 20. Revísala.</div>}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}>
              {!guardada && <button onClick={() => guardar(t)} disabled={est && est.tipo === 'trabajando' || dup[t.id] === 'carpeta'} style={{ ...btnPrimario, opacity: est && est.tipo === 'trabajando' || dup[t.id] === 'carpeta' ? 0.5 : 1 }}><CheckCircle2 size={20} /> Guardar en el sistema</button>}
              {est && <span style={{ fontSize: 16, fontWeight: 700, color: est.tipo === 'ok' ? C.verde : est.tipo === 'error' ? C.guinda : C.gray, lineHeight: 1.4 }}>{est.texto}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
