// src/pages/ImportarIncidenciaRegional.jsx
// Importa el reporte regional de homicidios dolosos (Excel) a incidencia_regional,
// ubica cada caso en el mapa (geocodificación automática + revisión manual del pin)
// y lo deja listo para el Mapa de Calor. Solo rol 'mando' (lo decide MapaCalor.jsx
// y lo refuerza la RLS de la tabla).
//
// Reglas acordadas:
//  - Casos sin carpeta de investigación real (vacía / "PENDIENTE") se OMITEN.
//  - La C.I. es la llave: re-subir el archivo acumulado solo agrega casos nuevos.
//  - No se guardan nombres de víctima ni imputado.
//  - Los casos cuyo "lugar" es un hospital se conservan y se marcan.

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import { Upload, MapPin, CheckCircle2, AlertTriangle, X } from 'lucide-react';

const C = {
  navy: '#001a4d', gold: '#b69054', guinda: '#8b1e1e', white: '#ffffff',
  gray: '#5a6478', border: '#d8dde8', bg: '#f4f6fb',
  verde: '#2e7d32', ambar: '#b8860b', rojo: '#c62828',
};

const REGION = 'Región Acapulco';
const SECTORES = ['Renacimiento', 'Zapata', 'Garita', 'Coloso', 'Costa Azul', 'Central',
  'Barrios Históricos', 'Mozimba', 'Jardín', 'Coyuca de Benítez', 'San Marcos'];
const ALIAS_SECTOR = { 'BARRIOS': 'Barrios Históricos', 'COYUCA': 'Coyuca de Benítez' };
const HOSPITAL_RE = /hospital|cl[ií]nica|cruz roja|\bimss\b|\bissste\b|centro de salud|semefo|servicio m[eé]dico/i; // \b evita falsos positivos como FOVISSSTE
const CLASES_DIRECCION = ['highway', 'building', 'amenity', 'shop', 'tourism', 'healthcare', 'leisure', 'office'];
const VIEWBOX = '-100.25,17.25,-99.30,16.60'; // izquierda,arriba,derecha,abajo (Acapulco, Coyuca, San Marcos)

const normalizar = (s) => String(s == null ? '' : s)
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

function normalizarSector(txt) {
  const n = normalizar(txt).replace(/^SECTOR /, '');
  if (ALIAS_SECTOR[n]) return ALIAS_SECTOR[n];
  return SECTORES.find((s) => normalizar(s) === n) || null;
}

const pad = (n) => String(n).padStart(2, '0');

// Acepta serial de Excel, "2026-10-01", "01/10/2026" y los errores de captura vistos
// en los archivos ("02/010/2026", "17/10/22026"). Devuelve { iso, corregida } o null.
function parseFecha(v) {
  if (typeof v === 'number') {
    const p = XLSX.SSF.parse_date_code(v);
    return p ? { iso: `${p.y}-${pad(p.m)}-${pad(p.d)}`, corregida: false } : null;
  }
  const s = String(v == null ? '' : v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { iso: `${m[1]}-${m[2]}-${m[3]}`, corregida: false };
  m = s.match(/^(\d{1,2})\/(\d{1,3})\/(\d{4,5})$/);
  if (!m) return null;
  let corregida = m[2].length > 2 || m[3].length > 4;
  let y = m[3];
  if (y.length === 5) {
    const cands = [0, 1, 2, 3, 4].map((i) => y.slice(0, i) + y.slice(i + 1)).filter((c) => +c >= 2020 && +c <= 2035);
    if (!cands.length) return null;
    y = cands[0];
  }
  const d = parseInt(m[1], 10), mo = parseInt(m[2], 10);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return { iso: `${y}-${pad(mo)}-${pad(d)}`, corregida };
}

const siNo = (v) => { const s = normalizar(v); return s ? s.startsWith('SI') : null; };
const armaTxt = (v) => { const s = String(v == null ? '' : v).trim(); return !s || normalizar(s) === 'NO' ? null : s; };

// Coordenadas opcionales del archivo (p. ej. las que colocó el regional en Google Earth).
const aNumero = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(',', '.'));
  return isFinite(n) ? n : null;
};
const enZona = (la, lo) => la != null && lo != null && la > 16.4 && la < 17.5 && lo > -100.6 && lo < -99.0;

function parsearLibro(wb) {
  const nombres = wb.SheetNames;
  const orden = [...nombres.filter((n) => normalizar(n).includes('HOMICIDIO')),
    ...nombres.filter((n) => !normalizar(n).includes('HOMICIDIO'))];
  for (const nombre of orden) {
    const filas = XLSX.utils.sheet_to_json(wb.Sheets[nombre], { header: 1, raw: true, defval: '' });
    const h = filas.findIndex((r) => r.some((c) => normalizar(c).includes('CARPETA DE INVESTIGACION')));
    if (h === -1) continue;
    const enc = filas[h].map(normalizar);
    const col = (clave) => enc.findIndex((t) => t.includes(clave));
    const idx = {
      zona: col('COORDINACION'), fecha: col('FECHA'), delito: col('DELITO'), ci: col('CARPETA DE INVESTIGACION'),
      lugar: col('LUGAR DE LOS HECHOS'), cartulina: col('CARTULINA'), calibre: col('CALIBRE'),
      vehiculo: col('VEHICULO'), droga: col('DROGA'), lat: col('LATITUD'), lng: col('LONGITUD'),
    };
    const datos = filas.slice(h + 1);

    // La columna de observaciones no tiene encabezado: es la columna sin encabezado con más texto largo.
    const conocidas = new Set(Object.values(idx));
    const maxCols = Math.max(0, ...datos.map((r) => r.length));
    let obsIdx = -1, mejor = 0;
    for (let c = 0; c < maxCols; c++) {
      if (conocidas.has(c)) continue;
      const t = enc[c] || '';
      if (t !== '' && !/^\d+(\.\d+)?$/.test(t)) continue; // tiene encabezado propio (víctima, imputado...)
      const n = datos.filter((r) => typeof r[c] === 'string' && r[c].trim().length > 25).length;
      if (n > mejor) { mejor = n; obsIdx = c; }
    }

    let totalLeidos = 0, omitidos = 0, repetidos = 0;
    const vistos = new Set();
    const out = [];
    for (const r of datos) {
      const lugar = String(r[idx.lugar] == null ? '' : r[idx.lugar]).trim();
      const delito = String(r[idx.delito] == null ? '' : r[idx.delito]).trim();
      if (!lugar && !delito) continue;
      totalLeidos++;
      const crudo = r[idx.ci];
      const ci = typeof crudo === 'number' ? String(crudo) : String(crudo == null ? '' : crudo).replace(/\s+/g, '');
      if (!/\d{10,}/.test(ci)) { omitidos++; continue; }
      if (vistos.has(ci)) { repetidos++; continue; }
      vistos.add(ci);
      const f = parseFecha(r[idx.fecha]);
      const la = idx.lat >= 0 ? aNumero(r[idx.lat]) : null;
      const lo = idx.lng >= 0 ? aNumero(r[idx.lng]) : null;
      const conCoords = enZona(la, lo);
      out.push({
        ci, ciRara: ci.length !== 20,
        zonaCruda: String(r[idx.zona] == null ? '' : r[idx.zona]).trim(),
        sector: normalizarSector(r[idx.zona]),
        fecha: f ? f.iso : '', fechaCorregida: !!(f && f.corregida),
        delito, lugar,
        obs: obsIdx >= 0 ? String(r[obsIdx] == null ? '' : r[obsIdx]).trim() : '',
        esHospital: HOSPITAL_RE.test(lugar),
        cartulina: siNo(r[idx.cartulina]), vehiculo: siNo(r[idx.vehiculo]), droga: siNo(r[idx.droga]),
        arma: armaTxt(r[idx.calibre]),
        lat: conCoords ? la : null, lng: conCoords ? lo : null,
        precision: conCoords ? 'manual' : null, confirmada: conCoords, deArchivo: conCoords,
      });
    }
    return { filas: out, totalLeidos, omitidos, repetidos, hoja: nombre };
  }
  return null;
}

const municipioDe = (sector) => (sector === 'Coyuca de Benítez' ? 'Coyuca de Benítez'
  : sector === 'San Marcos' ? 'San Marcos' : 'Acapulco de Juárez');

function consultasDe(f) {
  const muni = municipioDe(f.sector);
  const q = [];
  const base = f.lugar.split(/como referencia|a un costado|frente a|bajando|subiendo/i)[0].replace(/\s+/g, ' ').trim().slice(0, 160);
  if (base) q.push({ q: `${base}, ${muni}, Guerrero, México`, nivel: 'direccion' });
  const m = f.lugar.match(/(?:colonia|col\.?|fraccionamiento|fracc\.?|unidad habitacional)\s+([^,.;()]{3,60})/i);
  if (m) q.push({ q: `${m[1].trim()}, ${muni}, Guerrero, México`, nivel: 'colonia' });
  return q;
}

// Solo se envía el texto de la dirección + municipio. Nunca C.I., nombres ni otros datos.
async function geocodificar(texto) {
  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=mx&bounded=1'
    + '&viewbox=' + VIEWBOX + '&q=' + encodeURIComponent(texto);
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json();
  if (!j.length) return null;
  return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon), clase: j[0].class };
}

const esperar = (ms) => new Promise((res) => setTimeout(res, ms));

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
function loadCSS(href) {
  if (document.querySelector('link[href="' + href + '"]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = href;
  document.head.appendChild(l);
}

const colorPrecision = (f) => (f.confirmada ? C.navy : f.precision === 'direccion' ? C.verde : C.ambar);
const etiquetaPrecision = (f) => (f.lat == null ? { t: 'Sin ubicar', c: C.rojo }
  : f.confirmada ? { t: 'Confirmada', c: C.navy }
    : f.precision === 'direccion' ? { t: 'Dirección', c: C.verde } : { t: 'Aproximada', c: C.ambar });

const btn = { border: 'none', borderRadius: 7, padding: '12px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' };
const btnPrimario = { ...btn, background: C.gold, color: C.white };
const btnSecundario = { ...btn, background: 'transparent', color: C.navy, border: '2px solid ' + C.navy };
const campo = { padding: '10px 12px', border: '2px solid ' + C.border, borderRadius: 7, fontSize: 15, fontFamily: 'inherit', minHeight: 44, boxSizing: 'border-box', background: C.white, color: '#1a1a1a' };


// ============================================================================
// Revisar y corregir la ubicación de casos YA guardados (poner los que faltan,
// confirmar los automáticos, mover los que quedaron mal).
// ============================================================================
function RevisarGuardadas({ leafletListo, onCambio }) {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('pendientes'); // 'pendientes' | 'todos'
  const [sel, setSel] = useState(null);
  const [borrador, setBorrador] = useState(null); // punto aún sin guardar
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null);
  const mapEl = useRef(null);
  const mapObj = useRef(null);
  const capa = useRef(null);
  const selRef = useRef(null);
  selRef.current = sel;

  const cargar = async () => {
    setCargando(true);
    const { data, error } = await supabase.from('incidencia_regional')
      .select('id, carpeta_investigacion, zona, fecha, lugar_hechos, observaciones, coordenadas_lat, coordenadas_lng, ubicacion_confirmada, lugar_es_hospital')
      .order('fecha', { ascending: false });
    if (error) setMsg({ tipo: 'error', texto: 'No se pudieron cargar los casos: ' + error.message });
    else setFilas(data || []);
    setCargando(false);
  };
  useEffect(() => { cargar(); }, []);

  const sinUbicar = (f) => f.coordenadas_lat == null;
  const sinConfirmar = (f) => f.coordenadas_lat != null && !f.ubicacion_confirmada;
  const nSin = filas.filter(sinUbicar).length;
  const nAuto = filas.filter(sinConfirmar).length;
  const lista = filas
    .filter((f) => filtro === 'todos' || sinUbicar(f) || sinConfirmar(f))
    .sort((a, b) => (sinUbicar(b) - sinUbicar(a)) || (sinConfirmar(b) - sinConfirmar(a)) || String(b.fecha).localeCompare(String(a.fecha)));
  const fSel = filas.find((f) => f.id === sel) || null;

  const seleccionar = (f) => {
    setSel(f.id); setBorrador(null); setMsg(null);
    if (f.coordenadas_lat != null && mapObj.current) mapObj.current.setView([f.coordenadas_lat, f.coordenadas_lng], 16);
  };

  useEffect(() => {
    if (!leafletListo || !mapEl.current || !window.L) return;
    const L = window.L;
    if (mapObj.current && mapObj.current.getContainer() !== mapEl.current) {
      try { mapObj.current.remove(); } catch (e) { /* contenedor anterior ya no existe */ }
      mapObj.current = null;
    }
    if (!mapObj.current) {
      mapObj.current = L.map(mapEl.current, { center: [16.85, -99.88], zoom: 11 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(mapObj.current);
      capa.current = L.layerGroup().addTo(mapObj.current);
      mapObj.current.on('click', (e) => { if (selRef.current != null) setBorrador({ lat: e.latlng.lat, lng: e.latlng.lng }); });
    }
    capa.current.clearLayers();
    filas.forEach((f) => {
      if (f.coordenadas_lat == null || f.id === sel) return;
      L.circleMarker([f.coordenadas_lat, f.coordenadas_lng], { radius: 7, fillColor: f.ubicacion_confirmada ? C.navy : C.ambar, color: '#ffffff', weight: 2, fillOpacity: 0.9 })
        .addTo(capa.current).on('click', () => seleccionar(f));
    });
    const actual = filas.find((f) => f.id === sel);
    const pos = borrador || (actual && actual.coordenadas_lat != null ? { lat: actual.coordenadas_lat, lng: actual.coordenadas_lng } : null);
    if (pos) {
      const mk = L.marker([pos.lat, pos.lng], { draggable: true }).addTo(capa.current);
      mk.on('dragend', () => { const q = mk.getLatLng(); setBorrador({ lat: q.lat, lng: q.lng }); });
    }
  }, [leafletListo, filas, sel, borrador]);

  useEffect(() => () => { if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; } }, []);

  const actualizar = async (cambios, textoOk) => {
    setGuardando(true); setMsg(null);
    const { data, error } = await supabase.from('incidencia_regional')
      .update({ ...cambios, updated_at: new Date().toISOString() }).eq('id', sel).select('id');
    setGuardando(false);
    if (error || !data || data.length === 0) {
      setMsg({ tipo: 'error', texto: 'No se pudo guardar' + (error ? ': ' + error.message : ' (sin permiso o el caso ya no existe).') });
      return;
    }
    setFilas((prev) => prev.map((f) => (f.id === sel ? { ...f, ...cambios } : f)));
    setBorrador(null);
    setMsg({ tipo: 'ok', texto: textoOk });
    if (onCambio) onCambio();
  };

  const guardarUbicacion = () => {
    if (!borrador) return;
    if (!enZona(borrador.lat, borrador.lng)) { setMsg({ tipo: 'error', texto: 'El punto queda fuera de la zona de Acapulco y Coyuca. Colócalo de nuevo.' }); return; }
    actualizar({ coordenadas_lat: borrador.lat, coordenadas_lng: borrador.lng, ubicacion_confirmada: true }, 'Ubicación guardada.');
  };
  const confirmarActual = () => actualizar({ ubicacion_confirmada: true }, 'Ubicación confirmada.');
  const quitarUbicacion = () => {
    if (!window.confirm('¿Quitar la ubicación de este caso? Dejará de aparecer en el mapa.')) return;
    actualizar({ coordenadas_lat: null, coordenadas_lng: null, ubicacion_confirmada: false }, 'Ubicación quitada.');
  };

  const buscarDireccion = async () => {
    if (!fSel) return;
    setBuscando(true); setMsg(null);
    for (const c of consultasDe({ sector: fSel.zona, lugar: fSel.lugar_hechos || '' })) {
      let hit = null;
      try { hit = await geocodificar(c.q); } catch (e) { hit = null; }
      if (hit) {
        setBorrador({ lat: hit.lat, lng: hit.lng });
        if (mapObj.current) mapObj.current.setView([hit.lat, hit.lng], 16);
        setMsg({ tipo: 'ok', texto: c.nivel === 'direccion' ? 'Se encontró por la dirección. Revisa el punto y guarda.' : 'Solo se encontró la colonia: el punto es aproximado. Muévelo si hace falta y guarda.' });
        setBuscando(false);
        return;
      }
      await esperar(1100);
    }
    setBuscando(false);
    setMsg({ tipo: 'error', texto: 'No se encontró la dirección. Colócala a mano con un clic en el mapa.' });
  };

  const chipEstado = (f) => (sinUbicar(f) ? { t: 'Sin ubicar', c: C.rojo } : f.ubicacion_confirmada ? { t: 'Confirmada', c: C.navy } : { t: 'Sin confirmar', c: C.ambar });
  const chipFiltro = (activo) => ({ ...btn, padding: '8px 14px', minHeight: 38, fontSize: 14, background: activo ? C.navy : 'transparent', color: activo ? '#fff' : C.navy, border: '2px solid ' + C.navy });

  return (
    <div>
      <p style={{ color: C.gray, fontSize: 15, margin: '0 0 10px 0', lineHeight: 1.5 }}>
        Aquí corriges casos ya guardados: ubicas los que faltan, confirmas los que SARA ubicó sola y mueves los que quedaron mal.
        Selecciona un caso, coloca el punto con un clic en el mapa (o arrastra el marcador) y guarda.
      </p>
      {msg && (
        <div style={{ background: msg.tipo === 'ok' ? '#e1f5ee' : '#fcebeb', border: '1px solid ' + (msg.tipo === 'ok' ? '#22c55e55' : '#ef444455'), color: msg.tipo === 'ok' ? '#0f6e56' : '#791f1f', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 12 }}>{msg.texto}</div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, fontSize: 14 }}>
        <span style={{ background: C.bg, border: '1.5px solid ' + C.border, borderRadius: 8, padding: '8px 12px', fontWeight: 700, color: C.rojo }}>{nSin} · Sin ubicar</span>
        <span style={{ background: C.bg, border: '1.5px solid ' + C.border, borderRadius: 8, padding: '8px 12px', fontWeight: 700, color: C.ambar }}>{nAuto} · Sin confirmar</span>
        <span style={{ background: C.bg, border: '1.5px solid ' + C.border, borderRadius: 8, padding: '8px 12px', fontWeight: 700, color: C.navy }}>{filas.length - nSin - nAuto} · Confirmadas</span>
        <button onClick={() => setFiltro('pendientes')} style={chipFiltro(filtro === 'pendientes')}>Pendientes</button>
        <button onClick={() => setFiltro('todos')} style={chipFiltro(filtro === 'todos')}>Todos</button>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 340px', maxHeight: 460, overflowY: 'auto', border: '1.5px solid ' + C.border, borderRadius: 8 }}>
          {cargando ? (
            <div style={{ padding: 16, color: C.gray }}>Cargando…</div>
          ) : lista.length === 0 ? (
            <div style={{ padding: 16, color: C.gray, fontSize: 15 }}>{filtro === 'pendientes' ? 'No hay casos pendientes: todo está ubicado y confirmado.' : 'Aún no hay casos guardados.'}</div>
          ) : lista.map((f) => {
            const et = chipEstado(f);
            return (
              <div key={f.id} onClick={() => seleccionar(f)} style={{ padding: '10px 12px', borderBottom: '1px solid ' + C.border, cursor: 'pointer', background: f.id === sel ? '#f5ede0' : C.white }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>{f.zona || 'Sin sector'} · {f.fecha || 'sin fecha'}</span>
                  <span style={{ background: et.c, color: '#fff', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{et.t}</span>
                </div>
                <div style={{ color: '#374151', fontSize: 13, marginTop: 3 }}>{String(f.lugar_hechos || '').slice(0, 90)}{String(f.lugar_hechos || '').length > 90 ? '…' : ''}</div>
                {f.lugar_es_hospital && <span style={{ background: C.guinda, color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700, display: 'inline-block', marginTop: 4 }}>HOSPITAL</span>}
              </div>
            );
          })}
        </div>

        <div style={{ flex: '1 1 380px', minWidth: 300 }}>
          {fSel ? (
            <div style={{ border: '1.5px solid ' + C.border, borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 14 }}>
              <div style={{ fontFamily: 'monospace', color: C.gray, fontSize: 12, marginBottom: 6 }}>C.I. {fSel.carpeta_investigacion}</div>
              <div style={{ color: '#374151', lineHeight: 1.4 }}><strong>Lugar:</strong> {fSel.lugar_hechos}</div>
              {fSel.observaciones && <div style={{ color: C.gray, lineHeight: 1.4, marginTop: 4, fontSize: 13 }}><strong>Observaciones:</strong> {fSel.observaciones}</div>}
              {fSel.lugar_es_hospital && <div style={{ color: C.guinda, fontSize: 13, marginTop: 6, fontWeight: 700 }}>El lugar registrado es un hospital. Si sabes dónde ocurrió el hecho, coloca el punto ahí.</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button onClick={buscarDireccion} disabled={buscando || guardando} style={{ ...btnSecundario, padding: '8px 14px', fontSize: 13, minHeight: 38, opacity: buscando ? 0.6 : 1 }}>{buscando ? 'Buscando…' : 'Buscar dirección'}</button>
                <button onClick={guardarUbicacion} disabled={!borrador || guardando} style={{ ...btnPrimario, padding: '8px 14px', fontSize: 13, minHeight: 38, opacity: !borrador || guardando ? 0.45 : 1 }}>{guardando ? 'Guardando…' : 'Guardar ubicación'}</button>
                <button onClick={confirmarActual} disabled={borrador || sinUbicar(fSel) || fSel.ubicacion_confirmada || guardando} style={{ ...btnSecundario, padding: '8px 14px', fontSize: 13, minHeight: 38, opacity: (borrador || sinUbicar(fSel) || fSel.ubicacion_confirmada) ? 0.45 : 1 }}>Confirmar ubicación actual</button>
                <button onClick={quitarUbicacion} disabled={sinUbicar(fSel) || guardando} style={{ ...btn, padding: '8px 14px', fontSize: 13, minHeight: 38, background: 'transparent', color: C.rojo, border: '1px solid ' + C.rojo, opacity: sinUbicar(fSel) ? 0.45 : 1 }}>Quitar ubicación</button>
              </div>
              <div style={{ color: C.gray, fontSize: 12, marginTop: 8 }}>{borrador ? 'Hay un punto sin guardar: presiona "Guardar ubicación".' : 'Haz clic en el mapa para colocar el punto, o arrastra el marcador.'}</div>
            </div>
          ) : (
            <div style={{ color: C.gray, fontSize: 14, padding: '4px 2px 10px' }}>Selecciona un caso de la lista para revisarlo en el mapa.</div>
          )}
          <div ref={mapEl} style={{ height: 380, borderRadius: 8, border: '1.5px solid ' + C.border }} />
        </div>
      </div>
    </div>
  );
}

export default function ImportarIncidenciaRegional({ perfil, onImportado }) {
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState('importar'); // 'importar' | 'revisar'
  const [fase, setFase] = useState('inicio'); // 'inicio' | 'revision'
  const [resumen, setResumen] = useState(null);
  const [filas, setFilas] = useState([]);
  const [sel, setSel] = useState(null);
  const [ubicando, setUbicando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [leafletListo, setLeafletListo] = useState(false);

  const mapEl = useRef(null);
  const mapObj = useRef(null);
  const capa = useRef(null);
  const selRef = useRef(null);
  const filasRef = useRef([]);
  const cancelado = useRef(false);
  selRef.current = sel;
  filasRef.current = filas;

  useEffect(() => {
    loadCSS('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css');
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js')
      .then(() => setLeafletListo(true)).catch(() => setMsg({ tipo: 'error', texto: 'No se pudo cargar el mapa.' }));
    return () => { cancelado.current = true; if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; } };
  }, []);

  const actualizar = (i, cambios) => setFilas((prev) => prev.map((f, j) => (j === i ? { ...f, ...cambios } : f)));
  const ponerCoords = (i, lat, lng) => actualizar(i, { lat, lng, confirmada: true, precision: 'manual' });

  // Mapa de revisión
  useEffect(() => {
    if (!(fase === 'revision' && modo === 'importar')) {
      if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; }
      return;
    }
    if (!leafletListo || !mapEl.current || !window.L) return;
    const L = window.L;
    if (mapObj.current && mapObj.current.getContainer() !== mapEl.current) {
      try { mapObj.current.remove(); } catch (e) { /* contenedor anterior ya no existe */ }
      mapObj.current = null;
    }
    if (!mapObj.current) {
      mapObj.current = L.map(mapEl.current, { center: [16.85, -99.88], zoom: 11 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(mapObj.current);
      capa.current = L.layerGroup().addTo(mapObj.current);
      mapObj.current.on('click', (e) => { const i = selRef.current; if (i != null) ponerCoords(i, e.latlng.lat, e.latlng.lng); });
    }
    capa.current.clearLayers();
    filas.forEach((f, i) => {
      if (f.lat == null) return;
      if (i === sel) {
        const mk = L.marker([f.lat, f.lng], { draggable: true }).addTo(capa.current);
        mk.on('dragend', () => { const p = mk.getLatLng(); ponerCoords(i, p.lat, p.lng); });
      } else {
        L.circleMarker([f.lat, f.lng], { radius: 7, fillColor: colorPrecision(f), color: '#ffffff', weight: 2, fillOpacity: 0.9 })
          .addTo(capa.current).on('click', () => seleccionar(i));
      }
    });
  }, [fase, modo, leafletListo, filas, sel]);

  const seleccionar = (i) => {
    setSel(i);
    const f = filasRef.current[i];
    if (f && f.lat != null && mapObj.current) mapObj.current.setView([f.lat, f.lng], 16);
  };

  const cargarArchivo = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setMsg(null);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const parsed = parsearLibro(wb);
      if (!parsed) { setMsg({ tipo: 'error', texto: 'No encontré la tabla de casos (busco una fila con el encabezado "CARPETA DE INVESTIGACIÓN").' }); return; }

      const existentes = new Set();
      const cis = parsed.filas.map((f) => f.ci);
      for (let i = 0; i < cis.length; i += 100) {
        const { data, error } = await supabase.from('incidencia_regional').select('carpeta_investigacion').in('carpeta_investigacion', cis.slice(i, i + 100));
        if (error) throw error;
        (data || []).forEach((r) => existentes.add(r.carpeta_investigacion));
      }
      const nuevas = parsed.filas.filter((f) => !existentes.has(f.ci));
      setFilas(nuevas);
      setSel(null);
      setProgreso(0);
      setResumen({ archivo: file.name, hoja: parsed.hoja, leidos: parsed.totalLeidos, omitidos: parsed.omitidos, repetidos: parsed.repetidos, existentes: parsed.filas.length - nuevas.length, nuevas: nuevas.length, conCoords: nuevas.filter((f) => f.deArchivo).length });
      setFase('revision');
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'No se pudo leer el archivo: ' + (err.message || err) });
    }
  };

  const ubicarAutomatico = async () => {
    setUbicando(true); setProgreso(0); setMsg(null);
    cancelado.current = false;
    const total = filasRef.current.length;
    for (let i = 0; i < total; i++) {
      if (cancelado.current) break;
      const f = filasRef.current[i];
      if (f && f.lat == null && !f.confirmada) {
        for (const c of consultasDe(f)) {
          let hit = null;
          try { hit = await geocodificar(c.q); } catch (err) { hit = null; }
          await esperar(1100); // política de uso de Nominatim: máximo 1 consulta por segundo
          if (hit) {
            const buena = c.nivel === 'direccion' && CLASES_DIRECCION.includes(hit.clase);
            actualizar(i, { lat: hit.lat, lng: hit.lng, precision: buena ? 'direccion' : 'aproximada' });
            break;
          }
        }
      }
      setProgreso(i + 1);
    }
    setUbicando(false);
  };

  const incompletas = filas.filter((f) => !f.sector || !f.fecha).length;
  const sinUbicar = filas.filter((f) => f.lat == null).length;

  const guardar = async () => {
    if (incompletas > 0) { setMsg({ tipo: 'error', texto: `Hay ${incompletas} caso(s) sin sector o sin fecha válida. Selecciónalos en la lista y complétalos.` }); return; }
    setGuardando(true); setMsg(null);
    const payload = filas.map((f) => ({
      carpeta_investigacion: f.ci, region: REGION, zona: f.sector, fecha: f.fecha,
      delito: f.delito || null, lugar_hechos: f.lugar, observaciones: f.obs || null,
      coordenadas_lat: f.lat, coordenadas_lng: f.lng, ubicacion_confirmada: f.confirmada,
      lugar_es_hospital: f.esHospital, cartulina: f.cartulina, vehiculo_asegurado: f.vehiculo,
      droga_asegurada: f.droga, arma_calibre: f.arma, mes_reporte: f.fecha.slice(0, 7),
      registrado_por_id: perfil ? perfil.id : null,
    }));
    let guardados = 0;
    for (let i = 0; i < payload.length; i += 50) {
      const lote = payload.slice(i, i + 50);
      const { error } = await supabase.from('incidencia_regional').insert(lote);
      if (error) {
        setGuardando(false);
        setMsg({ tipo: 'error', texto: `Error al guardar: ${error.message}. Se guardaron ${guardados} casos; si vuelves a subir el archivo, esos no se duplican.` });
        return;
      }
      guardados += lote.length;
    }
    setGuardando(false);
    setMsg({ tipo: 'ok', texto: `Listo: se importaron ${guardados} casos nuevos.` });
    setFase('inicio'); setFilas([]); setResumen(null); setSel(null);
    if (onImportado) onImportado();
  };

  const cancelar = () => { cancelado.current = true; setUbicando(false); setFase('inicio'); setFilas([]); setResumen(null); setSel(null); setMsg(null); };

  const caja = { background: C.white, borderRadius: 10, padding: 14, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
  const fSel = sel != null ? filas[sel] : null;

  if (!abierto) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button onClick={() => setAbierto(true)} style={btnSecundario}><Upload size={16} /> Importar incidencia regional</button>
      </div>
    );
  }

  return (
    <div style={caja}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.gold, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Upload size={16} /> Importar incidencia regional (homicidios dolosos · {REGION})
        </div>
        <X size={20} style={{ cursor: 'pointer', color: C.gray }} onClick={() => { cancelar(); setAbierto(false); }} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={() => setModo('importar')} style={{ ...btn, padding: '8px 16px', minHeight: 40, fontSize: 14, background: modo === 'importar' ? C.navy : 'transparent', color: modo === 'importar' ? '#fff' : C.navy, border: '2px solid ' + C.navy }}>Importar archivo</button>
        <button onClick={() => setModo('revisar')} style={{ ...btn, padding: '8px 16px', minHeight: 40, fontSize: 14, background: modo === 'revisar' ? C.navy : 'transparent', color: modo === 'revisar' ? '#fff' : C.navy, border: '2px solid ' + C.navy }}>Revisar ubicaciones guardadas</button>
      </div>

      {modo === 'revisar' && <RevisarGuardadas leafletListo={leafletListo} onCambio={onImportado} />}

      {modo === 'importar' && msg && (
        <div style={{ background: msg.tipo === 'ok' ? '#e1f5ee' : '#fcebeb', border: '1px solid ' + (msg.tipo === 'ok' ? '#22c55e55' : '#ef444455'), color: msg.tipo === 'ok' ? '#0f6e56' : '#791f1f', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 12 }}>
          {msg.texto}
        </div>
      )}

      {modo === 'importar' && fase === 'inicio' && (
        <div>
          <p style={{ color: C.gray, fontSize: 15, margin: '0 0 12px 0', lineHeight: 1.5 }}>
            Sube el Excel del regional. Se lee la hoja de homicidios dolosos y solo se agregan los casos que aún no estén registrados
            (puedes volver a subir el archivo acumulado del mes sin duplicar). Los casos sin carpeta de investigación real se omiten.
          </p>
          <input type="file" accept=".xlsx,.xls" onChange={cargarArchivo} style={{ ...campo, width: '100%' }} />
        </div>
      )}

      {modo === 'importar' && fase === 'revision' && resumen && (
        <div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, fontSize: 14 }}>
            {[
              ['Casos en el archivo', resumen.leidos, C.navy],
              ['Omitidos sin C.I.', resumen.omitidos, C.guinda],
              ['Ya registrados', resumen.existentes, C.gray],
              ['Nuevos a revisar', resumen.nuevas, C.verde],
              ...(resumen.conCoords > 0 ? [['Con coordenadas del archivo', resumen.conCoords, C.navy]] : []),
            ].map(([t, n, c]) => (
              <span key={t} style={{ background: C.bg, border: '1.5px solid ' + C.border, borderRadius: 8, padding: '8px 12px', fontWeight: 700, color: c }}>{n} · {t}</span>
            ))}
            {resumen.repetidos > 0 && <span style={{ background: '#fdf6ea', border: '1.5px solid ' + C.gold, borderRadius: 8, padding: '8px 12px', fontWeight: 700, color: '#7a5c2e' }}>{resumen.repetidos} · C.I. repetidas en el archivo (se usó la primera)</span>}
          </div>

          {filas.length === 0 ? (
            <div style={{ color: C.gray, fontSize: 15, padding: '10px 0' }}>No hay casos nuevos que importar. Todo lo que trae el archivo ya estaba registrado.</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                <button onClick={ubicarAutomatico} disabled={ubicando} style={{ ...btnSecundario, opacity: ubicando ? 0.6 : 1 }}>
                  <MapPin size={16} /> {ubicando ? `Ubicando… ${progreso}/${filas.length}` : 'Ubicar automáticamente'}
                </button>
                <button onClick={guardar} disabled={guardando || ubicando} style={{ ...btnPrimario, opacity: guardando || ubicando ? 0.6 : 1 }}>
                  <CheckCircle2 size={16} /> {guardando ? 'Guardando…' : `Guardar ${filas.length} casos`}
                </button>
                <button onClick={cancelar} style={{ ...btn, background: 'transparent', color: C.gray, border: '1px solid ' + C.border }}>Cancelar</button>
              </div>
              <div style={{ color: C.gray, fontSize: 13, marginBottom: 12 }}>
                La ubicación automática consulta el servicio público de OpenStreetMap enviando solo el texto de la dirección y el municipio
                (nunca la carpeta, nombres ni otros datos). Toma cerca de 1 segundo por caso. También puedes ubicar a mano: selecciona un caso y haz clic en el mapa.
                {sinUbicar > 0 && <strong style={{ color: C.rojo }}> {sinUbicar} caso(s) sin ubicar no aparecerán en el mapa.</strong>}
              </div>

              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 340px', maxHeight: 440, overflowY: 'auto', border: '1.5px solid ' + C.border, borderRadius: 8 }}>
                  {filas.map((f, i) => {
                    const et = etiquetaPrecision(f);
                    return (
                      <div key={f.ci} onClick={() => seleccionar(i)}
                        style={{ padding: '10px 12px', borderBottom: '1px solid ' + C.border, cursor: 'pointer', background: i === sel ? '#f5ede0' : C.white }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>{f.sector || f.zonaCruda || 'Sin sector'} · {f.fecha || 'sin fecha'}</span>
                          <span style={{ background: et.c, color: '#fff', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{et.t}</span>
                        </div>
                        <div style={{ color: '#374151', fontSize: 13, marginTop: 3 }}>{f.lugar.slice(0, 90)}{f.lugar.length > 90 ? '…' : ''}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          {f.esHospital && <span style={{ background: C.guinda, color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>HOSPITAL</span>}
                          {(!f.sector || !f.fecha) && <span style={{ color: C.rojo, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={12} /> completar {!f.sector ? 'sector' : 'fecha'}</span>}
                          {f.fechaCorregida && <span style={{ color: C.ambar, fontSize: 12, fontWeight: 700 }}>fecha corregida, verifica</span>}
                          {f.ciRara && <span style={{ color: C.ambar, fontSize: 12, fontWeight: 700 }}>C.I. de {f.ci.length} dígitos, verifica</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ flex: '1 1 380px', minWidth: 300 }}>
                  {fSel ? (
                    <div style={{ border: '1.5px solid ' + C.border, borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 14 }}>
                      <div style={{ fontFamily: 'monospace', color: C.gray, fontSize: 12, marginBottom: 6 }}>C.I. {fSel.ci}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        <select value={fSel.sector || ''} onChange={(e) => actualizar(sel, { sector: e.target.value || null })} style={{ ...campo, flex: '1 1 150px' }}>
                          <option value="">— Sector —</option>
                          {SECTORES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input type="date" value={fSel.fecha} onChange={(e) => actualizar(sel, { fecha: e.target.value, fechaCorregida: false })} style={{ ...campo, flex: '1 1 150px' }} />
                      </div>
                      <div style={{ color: '#374151', lineHeight: 1.4 }}><strong>Lugar:</strong> {fSel.lugar}</div>
                      {fSel.obs && <div style={{ color: C.gray, lineHeight: 1.4, marginTop: 4, fontSize: 13 }}><strong>Observaciones:</strong> {fSel.obs}</div>}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                        <button onClick={() => actualizar(sel, { confirmada: true })} disabled={fSel.lat == null || fSel.confirmada}
                          style={{ ...btnSecundario, padding: '8px 14px', fontSize: 13, minHeight: 38, opacity: fSel.lat == null || fSel.confirmada ? 0.45 : 1 }}>Confirmar ubicación</button>
                        <button onClick={() => actualizar(sel, { lat: null, lng: null, confirmada: false, precision: null })} disabled={fSel.lat == null}
                          style={{ ...btn, padding: '8px 14px', fontSize: 13, minHeight: 38, background: 'transparent', color: C.rojo, border: '1px solid ' + C.rojo, opacity: fSel.lat == null ? 0.45 : 1 }}>Quitar ubicación</button>
                      </div>
                      <div style={{ color: C.gray, fontSize: 12, marginTop: 8 }}>Haz clic en el mapa para colocar el punto, o arrastra el marcador.</div>
                    </div>
                  ) : (
                    <div style={{ color: C.gray, fontSize: 14, padding: '4px 2px 10px' }}>Selecciona un caso de la lista para revisarlo en el mapa.</div>
                  )}
                  <div ref={mapEl} style={{ height: 380, borderRadius: 8, border: '1.5px solid ' + C.border }} />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
