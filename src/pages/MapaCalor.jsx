// src/pages/MapaCalor.jsx
// Mapa de Calor v2 — Inteligencia Criminal Basada en Evidencia
// Filtros: fecha, delito, municipio, capas
// Popups con detalles del caso
// Panel de análisis por municipio y delito
// Fuentes: registros_911, escenas_crimen, detenidos, oficios_investigacion

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { RefreshCw, MapPin, Filter, X, Clock, BarChart3, ChevronDown, ChevronUp, Upload, Maximize2, Target, Flag } from 'lucide-react';
import { TarjetaResumen, BarraSuperior, CapasPantalla } from './PantallaMapa';
import ImportarIncidenciaRegional from './ImportarIncidenciaRegional';
import ZonasAtencion from './ZonasAtencion';
import ReglaMapa, { tiempoEntre, textoDistancia } from './ReglaMapa';
import RadioMapa from './RadioMapa';
import ReproducirMes from './ReproducirMes';
import SelectorPeriodo, { textoPeriodo as textoPeriodoFiltro } from './SelectorPeriodo';
import { clasificarDelito, MEDIOS_ORDEN, COLOR_MEDIO } from './clasificarDelito';

const C = {
  darkBlue: '#001a4d', gold: '#b69054', lightGold: '#f5ede0',
  white: '#ffffff', bg: '#f4f6fb', gray: '#666666', lightGray: '#e8ecf1',
  green: '#28a745', red: '#dc3545', orange: '#fd7e14',
};

const FUENTES = [
  { key: 'registros_911', label: 'Reportes 911', color: '#dc3545', lat: 'coordenadas_lat', lng: 'coordenadas_lng', fecha: 'fecha_reporte', delito: 'incidencia_tipo', muni: 'municipio', desc: 'ubicacion_texto' },
  { key: 'escenas_crimen', label: 'Procesamiento del Lugar', color: '#fd7e14', lat: 'coordenadas_lat', lng: 'coordenadas_lng', fecha: 'fecha_procesamiento', delito: 'tipo_escena', muni: 'municipio', desc: 'descripcion_escena' },
  { key: 'detenidos', label: 'Detenidos', color: '#001a4d', lat: 'latitud', lng: 'longitud', fecha: 'fecha_deteccion', delito: 'delito', muni: 'region', desc: 'lugar_deteccion' },
  { key: 'oficios_investigacion', label: 'Oficios de Investigación', color: '#b69054', lat: 'coordenadas_lat', lng: 'coordenadas_lng', fecha: 'fecha_emision', delito: 'delito', muni: 'municipio', desc: 'lugar_hechos' },
  { key: 'incidencia_regional', label: 'Homicidios dolosos', color: '#8b1e1e', lat: 'coordenadas_lat', lng: 'coordenadas_lng', fecha: 'fecha', delito: 'delito', muni: 'zona', desc: 'lugar_hechos', region: 'region', hora: 'hora_conocimiento', conf: 'ubicacion_confirmada', arma: 'arma_calibre' },
];

// Las fuentes se muestran en dos grupos: lo que se captura en el sistema (por C.I.) y la estadística regional que llega en Excel
const GRUPOS_FUENTES = [
  { titulo: 'Captura del sistema', detalle: '911 y oficios, por C.I.', keys: ['registros_911', 'escenas_crimen', 'detenidos', 'oficios_investigacion'] },
  { titulo: 'Estadística regional', detalle: 'Excel mensual por región', keys: ['incidencia_regional'], importador: true },
];

// Calor tipo semáforo. El mapa y la leyenda usan los mismos colores y niveles:
// 1 caso verde, 2 amarillo, 3 naranja, 4 o más rojo (probado con el motor de dibujo real de leaflet.heat).
const NIVELES_CALOR = [
  { color: '#43a047', label: 'Baja', casos: '1 caso' },
  { color: '#fdd835', label: 'Media', casos: '2 casos' },
  { color: '#fb8c00', label: 'Alta', casos: '3 casos' },
  { color: '#e53935', label: 'Crítica', casos: '4 o más' },
];
const GRADIENTE_CALOR = { 0.30: NIVELES_CALOR[0].color, 0.51: NIVELES_CALOR[1].color, 0.66: NIVELES_CALOR[2].color, 0.76: NIVELES_CALOR[3].color };

// Radio del resplandor en píxeles. Sigue la distancia elegida (1 o 2 km): núcleo de un cuarto de la distancia en metros,
// pero nunca menor a 14 px por km, para que el resplandor se vea también en la vista de toda la ciudad.
function radioCalorPx(mapa, km) {
  var lat = mapa.getCenter().lat;
  var mpp = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, mapa.getZoom());
  return Math.max(14 * km, Math.min(120, (km * 250) / mpp));
}

function distanciaMetros(a, b) {
  var R = 6371000, rad = Math.PI / 180;
  var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Casos de la misma capa a no más de radioM metros de cada punto (contándose él mismo). Con rejilla, para que escale a miles de casos.
export function contarCercanos(puntos, radioM) {
  var cuenta = new Array(puntos.length);
  if (puntos.length === 0) return cuenta;
  var kx = 111320 * Math.cos(puntos[0].lat * Math.PI / 180), ky = 110540, celda = radioM * 1.05;
  var xs = [], ys = [], rejilla = {}, i, j;
  for (i = 0; i < puntos.length; i++) {
    xs[i] = puntos[i].lng * kx; ys[i] = puntos[i].lat * ky;
    var k = Math.floor(xs[i] / celda) + ',' + Math.floor(ys[i] / celda) + ',' + puntos[i].fuente;
    (rejilla[k] = rejilla[k] || []).push(i);
  }
  for (i = 0; i < puntos.length; i++) {
    var cx = Math.floor(xs[i] / celda), cy = Math.floor(ys[i] / celda), n = 0;
    for (var dx = -1; dx <= 1; dx++) {
      for (var dy = -1; dy <= 1; dy++) {
        var lista = rejilla[(cx + dx) + ',' + (cy + dy) + ',' + puntos[i].fuente];
        if (!lista) continue;
        for (j = 0; j < lista.length; j++) { if (distanciaMetros(puntos[i], puntos[lista[j]]) <= radioM) n++; }
      }
    }
    cuenta[i] = n;
  }
  return cuenta;
}

// Las colonias/sectores del reporte regional pertenecen al municipio de Acapulco de Juárez,
// salvo Coyuca de Benítez y San Marcos, que son municipios aparte. Se amplía cuando lleguen otras regiones.
const MUNICIPIO_DE_SECTOR_APARTE = { 'coyuca de benítez': 'Coyuca de Benítez', 'coyuca de benitez': 'Coyuca de Benítez', 'san marcos': 'San Marcos' };
function municipioDeSector(sector, region) {
  var k = String(sector || '').trim().toLowerCase();
  if (!k) return '';
  if (region && region !== 'Región Acapulco') return ''; // otras regiones: su catálogo se carga cuando llegue su estadística
  return MUNICIPIO_DE_SECTOR_APARTE[k] || 'Acapulco de Juárez';
}

// Color suave tipo semáforo según el peso de la barra frente a la mayor
function colorSuave(valor, max) {
  var r = max > 0 ? valor / max : 0;
  return r >= 0.67 ? '#b98386' : r >= 0.34 ? '#d2b27a' : '#dfd2b5';
}

// Ranking en barras: la etiqueta completa va arriba de la barra para que siempre se lea
function RankingBarras({ titulo, icono, items, numerar }) {
  var max = items.length > 0 ? Math.max.apply(null, items.map(function(i) { return i[1]; })) : 1;
  return (
    <div>
      <div style={{ fontSize: 19, fontWeight: 700, color: C.darkBlue, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>{icono} {titulo}</div>
      {items.length === 0 ? (
        <div style={{ fontSize: 16, color: C.gray, textAlign: 'center', padding: 20 }}>Sin datos</div>
      ) : (
        items.map(function(item, i) { return (
          <div key={item[0]} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 17, fontWeight: 600, color: '#1f2937', lineHeight: 1.3 }}>
              <span>{numerar !== false && <span style={{ color: C.gray, fontWeight: 700 }}>#{i + 1} </span>}{item[0]}</span>
              <span style={{ fontWeight: 800, fontSize: 19 }}>{item[1]}</span>
            </div>
            <div style={{ height: 14, background: C.bg, borderRadius: 7, overflow: 'hidden', marginTop: 5 }}>
              <div style={{ width: (item[1] / max * 100) + '%', height: '100%', background: colorSuave(item[1], max), borderRadius: 7 }} />
            </div>
          </div>
        ); })
      )}
    </div>
  );
}

// Estado inicial de las capas: todas activas (se arma desde FUENTES para no repetir la lista)
function filtrosIniciales() {
  var f = {};
  FUENTES.forEach(function(x) { f[x.key] = true; });
  return f;
}

// Los textos de la base (incluye los que llegan de Excel) se escapan antes de entrar al popup HTML
function esc(t) {
  return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const inputStyle = { padding: '13px 14px', border: '2px solid #e8ecf1', borderRadius: 7, fontSize: 16, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', minHeight: 44 };
const selectStyle = { ...inputStyle, backgroundColor: '#ffffff', cursor: 'pointer' };

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

// El plugin de calor falla (y tumba la pantalla) si se le pide dibujar sobre un mapa de tamaño 0, que es lo que pasa
// con el mapa oculto en otra pestaña. Se le indica que en ese caso no dibuje nada.
function protegerCalorOculto() {
  if (!window.L || !window.L.HeatLayer || window.L.HeatLayer.prototype._protegido) return;
  var original = window.L.HeatLayer.prototype._redraw;
  window.L.HeatLayer.prototype._redraw = function() {
    var t = this._map && this._map.getSize();
    if (!t || !t.x || !t.y) { this._frame = null; return; }
    return original.apply(this, arguments);
  };
  window.L.HeatLayer.prototype._protegido = true;
}

function loadCSS(href) {
  if (document.querySelector('link[href="' + href + '"]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = href;
  document.head.appendChild(l);
}

function TarjetaDato({ etiqueta, valor, detalle }) {
  return (
    <div style={{ background: C.lightGold, border: '1px solid #b6905440', borderRadius: 12, padding: '14px 18px' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.gray }}>{etiqueta}</div>
      <div style={{ fontSize: 34, fontWeight: 800, color: C.darkBlue, lineHeight: 1.15, wordBreak: 'break-word' }}>{valor}</div>
      {detalle && <div style={{ fontSize: 16, color: '#374151', marginTop: 3 }}>{detalle}</div>}
    </div>
  );
}

// Una sola barra dividida por medio: se lee en segundos
function BarraMedios({ porMedio, total }) {
  var orden = MEDIOS_ORDEN.filter(function(m) { return porMedio[m]; });
  return (
    <div>
      <div style={{ display: 'flex', height: 56, borderRadius: 10, overflow: 'hidden' }}>
        {orden.map(function(m) { return (
          <div key={m} title={m + ': ' + porMedio[m]} style={{ width: (porMedio[m] / total * 100) + '%', minWidth: 44, background: COLOR_MEDIO[m].bg, color: COLOR_MEDIO[m].tx, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800 }}>{porMedio[m]}</div>
        ); })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 26px', marginTop: 12, fontSize: 17, color: '#1f2937' }}>
        {orden.map(function(m) { return (
          <span key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 18, height: 18, borderRadius: 4, background: COLOR_MEDIO[m].bg, display: 'inline-block', border: '1px solid #00000020' }} />
            {m} · <strong>{porMedio[m]}</strong> ({Math.round(porMedio[m] / total * 100)}%)
          </span>
        ); })}
      </div>
    </div>
  );
}

function ColumnasSimples({ items, subtitulos, resaltadas, picos }) {
  var max = Math.max.apply(null, items.map(function(i) { return i[1]; }).concat([1]));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 190, borderBottom: '1px solid #d9dee5', padding: '0 4px' }}>
        {items.map(function(it, ix) { return (
          <div key={it[0]} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#374151', marginBottom: 4 }}>{it[1]}</span>
            <div style={{ width: '100%', maxWidth: 80, height: (it[1] / max * 74) + '%', minHeight: 5, background: resaltadas && !resaltadas[ix] ? '#e3d3d4' : picos && picos[ix] ? '#8e4f54' : '#b98386', borderRadius: '5px 5px 0 0' }} />
          </div>
        ); })}
      </div>
      <div style={{ display: 'flex', gap: 14, padding: '8px 4px 0' }}>
        {items.map(function(it, i) { return (
          <div key={it[0]} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#374151' }}>{it[0]}</div>
            {subtitulos && subtitulos[i] && <div style={{ fontSize: 15, color: C.gray }}>{subtitulos[i]}</div>}
          </div>
        ); })}
      </div>
    </div>
  );
}

// Línea de casos por semana en todo el historial (el pico se resalta con un aro dorado)
function LineaHistorica({ items }) {
  var W = 720, H = 250, pl = 30, pr = 24, pt = 34, pb = 46;
  var max = Math.max.apply(null, items.map(function(i) { return i[1]; }).concat([1]));
  var paso = items.length > 1 ? (W - pl - pr) / (items.length - 1) : 0;
  var pts = items.map(function(it, i) { return { x: items.length > 1 ? pl + i * paso : W / 2, y: pt + (H - pt - pb) * (1 - it[1] / max), n: it[1], l: it[0] }; });
  var cadaX = items.length > 14 ? 2 : 1;
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} style={{ width: '100%', display: 'block' }} role="img" aria-label="Casos por semana en todo el historial">
      <line x1={pl} y1={H - pb} x2={W - pr} y2={H - pb} stroke="#d9dee5" strokeWidth="1.5" />
      <polyline points={pts.map(function(p) { return p.x + ',' + p.y; }).join(' ')} fill="none" stroke="#9a5a5e" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(function(p, i) { return (
        <g key={i}>
          {p.n === max && items.length > 1 && <circle cx={p.x} cy={p.y} r="12" fill="none" stroke="#b6905a" strokeWidth="3" />}
          <circle cx={p.x} cy={p.y} r="6" fill="#9a5a5e" />
          <text x={p.x} y={p.y - 16} textAnchor="middle" fontSize="19" fontWeight="800" fill="#374151">{p.n}</text>
          {i % cadaX === 0 && <text x={p.x} y={H - pb + 26} textAnchor="middle" fontSize="16" fill="#555">{p.l}</text>}
        </g>
      ); })}
    </svg>
  );
}

// Meses con datos: una casilla por mes hasta 12
function MedidorMeses({ n, meta }) {
  var casillas = [];
  for (var i = 0; i < meta; i++) casillas.push(i);
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {casillas.map(function(i) { return <div key={i} style={{ width: 34, height: 26, borderRadius: 5, background: i < n ? '#b98386' : '#ece6d8', border: '1px solid #00000015' }} />; })}
    </div>
  );
}

function fechaLarga(iso) {
  var p = String(iso).slice(0, 10).split('-');
  var m = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return Number(p[2]) + ' de ' + (m[Number(p[1]) - 1] || p[1]);
}

// Para filtrar: en homicidios se usa la categoría (arma de fuego, torniquete...), no cada forma distinta de escribirla
function etiquetaDelito(p) {
  return p.fuente === 'incidencia_regional' ? clasificarDelito(p.delito).medio.toUpperCase() : String(p.delito || '').toUpperCase();
}

// "del 15 al 21 de octubre" / "del 29 de septiembre al 5 de octubre" / "el 26 de octubre"
function rangoLargo(a, b) {
  var m = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var pa = a.split('-'), pb = b.split('-');
  if (a === b) return 'el ' + Number(pa[2]) + ' de ' + m[Number(pa[1]) - 1];
  if (pa[1] === pb[1]) return 'del ' + Number(pa[2]) + ' al ' + Number(pb[2]) + ' de ' + m[Number(pa[1]) - 1];
  return 'del ' + Number(pa[2]) + ' de ' + m[Number(pa[1]) - 1] + ' al ' + Number(pb[2]) + ' de ' + m[Number(pb[1]) - 1];
}

function nombreMes(k) {
  var m = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var p = String(k).split('-');
  var n = m[Number(p[1]) - 1] || p[1];
  return n.charAt(0).toUpperCase() + n.slice(1) + ' ' + p[0];
}

export default function MapaCalor({ user, onIniciarProyecto, onImportar, seccion = 'mapa' }) {
  const mapRef = useRef(null);
  const [zonas, setZonas] = useState([]); // zonas de atención calculadas por el panel (se marcan siempre en el mapa)
  const [distanciaKm, setDistanciaKm] = useState(2); // distancia compartida: zonas, color de los puntos y resplandor
  const distanciaRef = useRef(2);
  distanciaRef.current = distanciaKm;
  const [focoSel, setFocoSel] = useState(null); // zona de atención elegida en el panel (para dibujarla en el mapa)
  const mapInstance = useRef(null);
  const layerGroup = useRef(null);
  const heatLayer = useRef(null);
  const [puntos, setPuntos] = useState([]);
  const [pendientes, setPendientes] = useState([]); // muertes no constitutivas de delito: aún no cuentan como homicidio doloso
  const [sinUbicar, setSinUbicar] = useState([]); // casos regionales sin coordenadas: no van al mapa, sí al panel de análisis
  const [loading, setLoading] = useState(true);
  const [leafletReady, setLeafletReady] = useState(false);

  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroDelito, setFiltroDelito] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [presentacion, setPresentacion] = useState(false); // pantalla completa del mapa (para presentar)
  const [, setTick] = useState(0);
  const [reproDia, setReproDia] = useState(null); // reproducción del periodo: muestra los casos hasta este día (null = todos)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false); // los filtros se muestran como una línea resumen y se abren si se piden
  const [capasAbiertas, setCapasAbiertas] = useState(false); // las capas del mapa se muestran solo si se piden
  const [soloConfirmadas, setSoloConfirmadas] = useState(true); // el mapa y las zonas usan solo ubicaciones confirmadas; el panel cuenta todos los casos

  // Pantalla completa del mapa: Esc la cierra, y si el navegador salió de pantalla completa también se cierra
  const entrarPresentacion = function() {
    setPresentacion(true);
    try { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function() {}); } catch (e) { /* sin pantalla completa del navegador: se usa la del sistema */ }
  };
  const salirPresentacion = function() {
    setPresentacion(false);
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function() {}); } catch (e) { /* nada */ }
  };
  useEffect(function() {
    if (!presentacion) return;
    var alTeclear = function(ev) { if (ev.key === 'Escape') setPresentacion(false); };
    var alCambiarPantalla = function() { if (!document.fullscreenElement) setPresentacion(false); };
    window.addEventListener('keydown', alTeclear);
    document.addEventListener('fullscreenchange', alCambiarPantalla);
    return function() { window.removeEventListener('keydown', alTeclear); document.removeEventListener('fullscreenchange', alCambiarPantalla); };
  }, [presentacion]);
  // El mapa cambia de tamaño al entrar o salir: se recalcula y se vuelve a encuadrar
  useEffect(function() {
    var t = setTimeout(function() { if (mapInstance.current) { mapInstance.current.invalidateSize(); setTick(function(x) { return x + 1; }); } }, 150);
    return function() { clearTimeout(t); };
  }, [presentacion]);

  const [stats, setStats] = useState({ total: 0, por_fuente: {} });
  const [delitosUnicos, setDelitosUnicos] = useState([]);
  const [municipiosUnicos, setMunicipiosUnicos] = useState([]);

  useEffect(() => {
    loadCSS('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css');
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js')
      .then(function() { return loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js'); })
      .then(function() { protegerCalorOculto(); setLeafletReady(true); })
      .catch(function(e) { console.error('Error cargando Leaflet:', e); });
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    const todos = [];
    const porFuente = {};
    const delitos = new Set();
    const municipios = new Set();
    let listaSinUbicar = [];
    let listaPendientes = [];

    for (const f of FUENTES) {
      const campos = f.lat + ', ' + f.lng + ', ' + f.fecha + ', ' + f.delito + ', ' + f.muni + ', ' + f.desc + (f.region ? ', ' + f.region : '');
      let resp = await supabase.from(f.key).select(campos + (f.hora ? ', ' + f.hora : '') + (f.conf ? ', ' + f.conf : '') + (f.arma ? ', ' + f.arma : '')).not(f.lat, 'is', null).not(f.lng, 'is', null);
      // Si la columna opcional de hora todavía no existe en la base, se reintenta sin ella: el mapa nunca debe quedar vacío
      if (resp.error && (f.hora || f.conf || f.arma)) resp = await supabase.from(f.key).select(campos).not(f.lat, 'is', null).not(f.lng, 'is', null);
      const data = resp.data;
      const coordsTodas = (data || []).map(function(r) {
        return {
          lat: parseFloat(r[f.lat]), lng: parseFloat(r[f.lng]), fuente: f.key,
          fecha: r[f.fecha] || '', delito: r[f.delito] || '', municipio: f.key === 'incidencia_regional' ? municipioDeSector(r[f.muni], r[f.region]) : (r[f.muni] || ''), sector: f.key === 'incidencia_regional' ? (r[f.muni] || '') : '', region: f.region ? (r[f.region] || '') : '', hora: f.hora ? String(r[f.hora] || '').slice(0, 5) : '', confirmada: f.conf ? r[f.conf] : null, arma: f.arma ? String(r[f.arma] || '').trim().toUpperCase() : '',
          descripcion: r[f.desc] || '', label: f.label, color: f.color,
        };
      }).filter(function(p) { return !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0 && p.lng !== 0; });

      // Muerte no constitutiva de delito: se aparta (no cuenta como homicidio doloso hasta que el MP la reclasifique)
      const esPend = function(c) { return f.key === 'incidencia_regional' && clasificarDelito(c.delito).pendiente; };
      const coords = coordsTodas.filter(function(c) { return !esPend(c); });
      listaPendientes.push.apply(listaPendientes, coordsTodas.filter(esPend));
      coords.forEach(function(c) {
        if (c.delito) delitos.add(etiquetaDelito(c));
        if (c.municipio) municipios.add(c.municipio);
      });
      if (f.key === 'incidencia_regional') {
        // Casos del reporte regional que aún no tienen coordenadas: no se dibujan en el mapa, pero sí cuentan en el panel de análisis
        const base = f.fecha + ', ' + f.delito + ', ' + f.muni + ', ' + f.desc + ', ' + f.region;
        const filtroSU = f.lat + '.is.null,' + f.lng + '.is.null';
        let su = await supabase.from(f.key).select(base + ', ' + f.hora + ', ' + f.arma).or(filtroSU);
        if (su.error) su = await supabase.from(f.key).select(base).or(filtroSU);
        listaSinUbicar = (su.data || []).map(function(r) {
          return {
            lat: null, lng: null, sinUbicar: true, fuente: f.key, fecha: r[f.fecha] || '', delito: r[f.delito] || '',
            municipio: municipioDeSector(r[f.muni], r[f.region]), sector: r[f.muni] || '', region: r[f.region] || '',
            hora: r[f.hora] ? String(r[f.hora]).slice(0, 5) : '', arma: r[f.arma] ? String(r[f.arma]).trim().toUpperCase() : '',
            descripcion: r[f.desc] || '', label: f.label, color: f.color,
          };
        });
        listaPendientes.push.apply(listaPendientes, listaSinUbicar.filter(function(c) { return clasificarDelito(c.delito).pendiente; }));
        listaSinUbicar = listaSinUbicar.filter(function(c) { return !clasificarDelito(c.delito).pendiente; });
        listaSinUbicar.forEach(function(c) {
          if (c.delito) delitos.add(etiquetaDelito(c));
          if (c.municipio) municipios.add(c.municipio);
        });
      }
      porFuente[f.key] = coords.length;
      todos.push.apply(todos, coords);
    }

    setPuntos(todos);
    setSinUbicar(listaSinUbicar);
    setPendientes(listaPendientes);
    setStats({ total: todos.length, por_fuente: porFuente });
    setDelitosUnicos(Array.from(delitos).sort());
    setMunicipiosUnicos(Array.from(municipios).sort());
    setLoading(false);
  };

  useEffect(function() { cargarDatos(); }, []);

  const pasaDemas = function(p) {
    if (filtroDelito && etiquetaDelito(p) !== filtroDelito) return false;
    if (filtroMunicipio && p.municipio !== filtroMunicipio) return false;
    return true;
  };
  const pasaFiltros = function(p) {
    if (fechaDesde && p.fecha && p.fecha < fechaDesde) return false;
    if (fechaHasta && p.fecha && p.fecha > fechaHasta) return false;
    return pasaDemas(p);
  };
  const puntosConUbicacion = puntos.filter(function(p) { return filtros[p.fuente] && pasaFiltros(p); });
  // Las ubicaciones aproximadas (colonia, sector, hospital, coordenada repetida) no son el lugar del hecho: dibujarlas
  // juntaría casos en un mismo punto y marcaría zonas calientes que no existen. Por eso, por defecto no se dibujan ni entran a las zonas.
  const puntosFiltrados = soloConfirmadas ? puntosConUbicacion.filter(function(p) { return p.confirmada !== false; }) : puntosConUbicacion;
  const nAproxOcultos = puntosConUbicacion.length - puntosFiltrados.length;

  const analysisPorMunicipio = {};
  const analysisPorDelito = {};
  const analysisPorSector = {};
  const analysisPorArma = {};
  const analysisPorMes = {};
  // El panel cuenta todos los casos, con o sin ubicación; el mapa solo dibuja los ubicados
  const sinUbicarFiltrados = sinUbicar.filter(function(p) { return filtros[p.fuente] && pasaFiltros(p); });
  const puntosAnalisis = puntosConUbicacion.concat(sinUbicarFiltrados);   // el panel cuenta TODOS los casos, con o sin ubicación confirmada
  const pendientesFiltrados = pendientes.filter(function(p) { return filtros[p.fuente] && pasaFiltros(p); });
  const avisoPendientes = pendientesFiltrados.length > 0 ? (
    <div style={{ marginTop: 8, fontSize: 15, color: '#3f4a63', background: '#eef1f6', border: '1px solid #c9d1e0', borderRadius: 8, padding: '8px 12px' }}>
      <strong>{pendientesFiltrados.length} caso{pendientesFiltrados.length > 1 ? 's' : ''} en espera de necropsia</strong> (muerte no constitutiva de delito): no se cuenta{pendientesFiltrados.length > 1 ? 'n' : ''} como homicidio doloso hasta que el Ministerio Público los reclasifique.
    </div>
  ) : null;
  puntosAnalisis.forEach(function(p) {
    if (p.arma) analysisPorArma[p.arma] = (analysisPorArma[p.arma] || 0) + 1;
    var mk = p.fecha ? String(p.fecha).slice(0, 7) : '';
    if (mk) analysisPorMes[mk] = (analysisPorMes[mk] || 0) + 1;
    var m = p.municipio || 'Sin municipio';
    analysisPorMunicipio[m] = (analysisPorMunicipio[m] || 0) + 1;
    var d = p.delito || 'Sin tipificar';
    analysisPorDelito[d] = (analysisPorDelito[d] || 0) + 1;
    if (p.sector) analysisPorSector[p.sector] = (analysisPorSector[p.sector] || 0) + 1;
  });
  const topMunicipios = Object.entries(analysisPorMunicipio).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 10);
  const topDelitos = Object.entries(analysisPorDelito).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 10);
  const topSectores = Object.entries(analysisPorSector).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 10);
  const topArmas = Object.entries(analysisPorArma).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 10);
  const casosPorMes = Object.keys(analysisPorMes).sort().map(function(k) { return [nombreMes(k), analysisPorMes[k]]; });

  // Cómo ocurrieron los homicidios (la tipificación del MP se agrupa en categorías de análisis; el texto original no se toca)
  const homicidios = puntosAnalisis.filter(function(p) { return p.fuente === 'incidencia_regional'; });
  const porMedio = {}, variantesMedio = {};
  let nFosa = 0;
  homicidios.forEach(function(p) {
    var c = clasificarDelito(p.delito);
    porMedio[c.medio] = (porMedio[c.medio] || 0) + 1;
    var t = String(p.delito || '').trim() || '(sin tipificación)';
    variantesMedio[c.medio] = variantesMedio[c.medio] || {};
    variantesMedio[c.medio][t] = (variantesMedio[c.medio][t] || 0) + 1;
    if (c.hallazgo) nFosa++;
  });
  const medioTop = Object.entries(porMedio).filter(function(e) { return e[0] !== 'Por determinar'; }).sort(function(a, b) { return b[1] - a[1]; })[0] || null;

  // Historial completo: no depende de las fechas del filtro (sí de las capas, el delito y el municipio)
  const histFechas = puntos.concat(sinUbicar).filter(function(p) { return filtros[p.fuente] && pasaDemas(p) && p.fecha; }).map(function(p) { return String(p.fecha).slice(0, 10); }).sort();
  const histFin = histFechas[histFechas.length - 1] || '';
  const histIni = histFechas[0] ? histFechas[0].slice(0, 8) + '01' : '';
  const DIAH = 86400000;
  const porMesHist = {};
  histFechas.forEach(function(d) { var k = d.slice(0, 7); porMesHist[k] = (porMesHist[k] || 0) + 1; });
  const mesesHist = Object.keys(porMesHist).sort().map(function(k, i, arr) {
    var diasMes = new Date(Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)), 0)).getUTCDate();
    var ultimo = i === arr.length - 1;
    var dias = ultimo ? Math.min(diasMes, Number(histFin.slice(8, 10))) : diasMes;
    return { clave: k, nombre: nombreMes(k).split(' ')[0], n: porMesHist[k], dias: dias, parcial: ultimo && dias < diasMes };
  });
  const cambioRitmo = mesesHist.length >= 2 ? (function() {
    var a = mesesHist[mesesHist.length - 2], b = mesesHist[mesesHist.length - 1];
    return { pct: Math.round(((b.n / b.dias) / (a.n / a.dias) - 1) * 100), contra: a.nombre, actual: b };
  })() : null;
  // La línea por semana sigue el periodo elegido; sin periodo muestra todo el historial
  const hayFechas = !!(fechaDesde || fechaHasta);
  const semIni = hayFechas ? (fechaDesde && fechaDesde >= histIni ? fechaDesde : histIni) : histIni;
  const semFin = hayFechas ? (fechaHasta && fechaHasta < histFin ? fechaHasta : histFin) : histFin;
  let semHist = [], semMeta = [], ultimaSemanaParcial = false;
  if (semIni && semFin && semIni <= semFin) {
    var nSem = Math.floor((Date.parse(semFin) - Date.parse(semIni)) / (7 * DIAH)) + 1;
    var cs = []; for (var q = 0; q < nSem; q++) cs.push(0);
    histFechas.forEach(function(d) { if (d < semIni || d > semFin) return; var i = Math.floor((Date.parse(d) - Date.parse(semIni)) / (7 * DIAH)); if (i >= 0 && i < nSem) cs[i]++; });
    var abr = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    semMeta = cs.map(function(n, i) {
      var f1 = new Date(Date.parse(semIni) + 7 * i * DIAH), f2 = new Date(Math.min(Date.parse(semIni) + (7 * i + 6) * DIAH, Date.parse(semFin)));
      var et = f1.getUTCMonth() === f2.getUTCMonth()
        ? (f1.getUTCDate() === f2.getUTCDate() ? '' + f1.getUTCDate() : f1.getUTCDate() + '–' + f2.getUTCDate()) + ' ' + abr[f1.getUTCMonth()]
        : f1.getUTCDate() + ' ' + abr[f1.getUTCMonth()] + '–' + f2.getUTCDate() + ' ' + abr[f2.getUTCMonth()];
      return { ini: f1.toISOString().slice(0, 10), fin: f2.toISOString().slice(0, 10), n: n, et: et };
    }).slice(-26);
    semHist = semMeta.map(function(m) { return [m.et, m.n]; });
    ultimaSemanaParcial = (Math.floor((Date.parse(semFin) - Date.parse(semIni)) / DIAH) % 7) < 6 && (!fechaHasta || fechaHasta >= histFin);
  }
  const maxSem = Math.max.apply(null, semHist.map(function(x) { return x[1]; }).concat([0]));
  const nPicos = semHist.filter(function(x) { return x[1] === maxSem && maxSem > 0; }).length;
  const picosMeta = semMeta.filter(function(m) { return m.n === maxSem && maxSem > 0; });
  // Repunte: semana con al menos 50% más casos que el promedio de las semanas completas (y mínimo 3 casos). Solo con 4 o más semanas
  const semCompletas = semMeta.filter(function(m, i) { return !(i === semMeta.length - 1 && ultimaSemanaParcial); });
  const promSem = semCompletas.length ? semCompletas.reduce(function(a, m) { return a + m.n; }, 0) / semCompletas.length : 0;
  const hayRepuntes = semMeta.length >= 4;
  const repuntes = hayRepuntes ? semMeta.filter(function(m) { return m.n >= promSem * 1.5 && m.n >= 3; }) : [];
  const semPicos = hayRepuntes
    ? semMeta.map(function(m) { return repuntes.indexOf(m) >= 0; })
    : semHist.map(function(x) { return semHist.length > 1 && maxSem > 0 && x[1] === maxSem; });
  const semSub = semMeta.map(function(m, i) { return hayRepuntes && repuntes.indexOf(m) >= 0 ? '▲ repunte' : (i === semMeta.length - 1 && ultimaSemanaParcial ? 'incompleta' : null); });
  // Meses que caen dentro del periodo elegido (se resaltan en las columnas por mes)
  const mesesResaltados = hayFechas ? mesesHist.map(function(m) { return m.clave >= (fechaDesde || '0000-00').slice(0, 7) && m.clave <= (fechaHasta || '9999-99').slice(0, 7); }) : null;

  // Periodo, ritmo y serie en el tiempo
  const fechasAn = puntosAnalisis.map(function(p) { return p.fecha ? String(p.fecha).slice(0, 10) : ''; }).filter(Boolean).sort();
  const iniPeriodo = fechaDesde || fechasAn[0] || '';
  const finPeriodo = fechaHasta || fechasAn[fechasAn.length - 1] || '';
  const DIA = 86400000;
  const diasPeriodo = iniPeriodo && finPeriodo ? Math.round((Date.parse(finPeriodo) - Date.parse(iniPeriodo)) / DIA) + 1 : 0;
  const ritmo = puntosAnalisis.length >= 2 && diasPeriodo > 0 ? diasPeriodo / puntosAnalisis.length : null;
  const variosMeses = casosPorMes.length > 1;
  let serie = [];
  if (variosMeses) {
    var anios = {}; Object.keys(analysisPorMes).forEach(function(k) { anios[k.slice(0, 4)] = 1; });
    serie = casosPorMes.map(function(m) { return [Object.keys(anios).length > 1 ? m[0] : m[0].split(' ')[0], m[1]]; });
  } else if (iniPeriodo && diasPeriodo > 0) {
    var nBloques = Math.ceil(diasPeriodo / 7);
    var cuentas = []; for (var b = 0; b < nBloques; b++) cuentas.push(0);
    fechasAn.forEach(function(d) { var i = Math.floor((Date.parse(d) - Date.parse(iniPeriodo)) / (7 * DIA)); if (i >= 0 && i < nBloques) cuentas[i]++; });
    serie = cuentas.map(function(n, i) {
      var a = new Date(Date.parse(iniPeriodo) + 7 * i * DIA), z = new Date(Math.min(Date.parse(iniPeriodo) + (7 * i + 6) * DIA, Date.parse(finPeriodo)));
      return [a.getUTCDate() + ' al ' + z.getUTCDate(), n];
    });
  }

  useEffect(function() {
    if (!leafletReady || !mapRef.current || !window.L) return;
    // Mapa oculto (otra pestaña): mide 0 x 0 y el plugin de calor falla al dibujar. Se redibuja al volver.
    if (!mapRef.current.clientWidth || !mapRef.current.clientHeight) return;
    // Si el contenedor del mapa se volvió a crear (p. ej. tras "Actualizar" o tras importar), el mapa
    // anterior quedó pegado a un nodo que ya no existe: se descarta y se arma de nuevo sobre el actual.
    if (mapInstance.current && mapInstance.current.getContainer() !== mapRef.current) {
      try { mapInstance.current.remove(); } catch (e) { /* el nodo ya no existe */ }
      mapInstance.current = null; layerGroup.current = null; heatLayer.current = null;
    }
    if (!mapInstance.current) {
      mapInstance.current = window.L.map(mapRef.current, { center: [17.4, -99.5], zoom: 8, scrollWheelZoom: true });
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(mapInstance.current);
      layerGroup.current = window.L.layerGroup().addTo(mapInstance.current);
      // Al hacer zoom, el calor sigue cubriendo los mismos metros (los colores no dependen del acercamiento)
      mapInstance.current.on('zoomend', function() {
        if (heatLayer.current && heatLayer.current.setOptions && mapInstance.current) {
          var r = radioCalorPx(mapInstance.current, distanciaRef.current);
          heatLayer.current.setOptions({ radius: r, blur: r * 0.6 });
        }
      });
    }
    mapInstance.current.invalidateSize(false);
    layerGroup.current.clearLayers();
    if (heatLayer.current) { mapInstance.current.removeLayer(heatLayer.current); heatLayer.current = null; }
    // El resplandor aparece SOLO donde hay una zona de atención prioritaria (4 o más homicidios en un mes dentro de la
    // distancia elegida). Los demás puntos conservan su color de semáforo, sin resplandor.
    var heatData = [];
    (zonas || []).forEach(function(z) { (z.miembros || []).forEach(function(m) { heatData.push([m.lat, m.lng, 1]); }); });
    if (heatData.length > 0 && window.L.heatLayer) {
      heatLayer.current = window.L.heatLayer(heatData, {
        radius: radioCalorPx(mapInstance.current, distanciaKm), blur: radioCalorPx(mapInstance.current, distanciaKm) * 0.6,
        maxZoom: 1, max: 3.33, minOpacity: 0.05,
        gradient: GRADIENTE_CALOR,
      }).addTo(mapInstance.current);
    }
    // Con la reproducción activa solo se dibujan los casos hasta ese día (la numeración y los colores se calculan con lo visible)
    var vis = [], visPos = {};
    puntosFiltrados.forEach(function(p, i) { if (!reproDia || !p.fecha || String(p.fecha).slice(0, 10) <= reproDia) { visPos[i] = vis.length; vis.push(p); } });
    var cercVis = contarCercanos(vis, distanciaKm * 1000);
    // Numeración consecutiva de los homicidios: 1 = el más antiguo del periodo mostrado (por fecha y hora de conocimiento)
    var numeroDe = {}, anteriorDe = {}, homicidios = [];
    puntosFiltrados.forEach(function(p, i) { if (p.fuente === 'incidencia_regional') homicidios.push(i); });
    var llaveOrden = function(p) { return (p.fecha ? String(p.fecha).slice(0, 10) : '9999-99-99') + ' ' + (p.hora || '00:00'); };
    homicidios.sort(function(a, b) { var ka = llaveOrden(puntosFiltrados[a]), kb = llaveOrden(puntosFiltrados[b]); return ka < kb ? -1 : ka > kb ? 1 : a - b; });
    homicidios.forEach(function(i, k) { numeroDe[i] = k + 1; if (k > 0) anteriorDe[i] = homicidios[k - 1]; });
    puntosFiltrados.forEach(function(p, idx) {
      if (visPos[idx] === undefined) return;
      var nCercanos = cercVis[visPos[idx]];
      var nivel = NIVELES_CALOR[Math.min(nCercanos, 4) - 1];
      var num = numeroDe[idx];
      var ant = anteriorDe[idx] !== undefined ? puntosFiltrados[anteriorDe[idx]] : null;
      var enlaceAnterior = '';
      if (num && ant) {
        var dAnt = distanciaMetros({ lat: p.lat, lng: p.lng }, { lat: ant.lat, lng: ant.lng });
        var tAnt = tiempoEntre(ant, p);
        enlaceAnterior = '<div style="margin-top:6px;padding:6px 8px;background:#f3f5fa;border-left:4px solid #001a4d;border-radius:4px;font-size:13px;color:#1f2937">' +
          '<strong>Respecto al caso anterior (No. ' + (num - 1) + '):</strong><br>' + textoDistancia(dAnt) + (tAnt ? ' · ' + tAnt.texto + (tAnt.soloFechas ? ' (solo fechas)' : '') : '') + '</div>';
      }
      var popup = '<div style="font-family:Segoe UI,sans-serif;min-width:200px">' +
        (num ? '<div style="font-weight:800;font-size:16px;color:#001a4d;margin-bottom:2px">Homicidio No. ' + num + ' de ' + homicidios.length + '</div>' : '') +
        '<div style="font-weight:700;font-size:13px;color:' + p.color + ';margin-bottom:4px">' + esc(p.label) + '</div>' +
        (p.delito ? '<div style="font-size:12px;color:#b71c1c;font-weight:600">' + esc(p.delito) + '</div>' : '') +
        (p.municipio ? '<div style="font-size:11px;color:#666;margin-top:2px">📍 ' + esc(p.municipio) + '</div>' : '') +
        (p.fecha ? '<div style="font-size:11px;color:#666">📅 ' + esc(p.fecha) + (p.hora ? ' · ' + esc(p.hora) + ' h' : '') + '</div>' : '') +
        '<div style="font-size:12px;font-weight:700;color:#374151;margin-top:3px">Casos en un radio de ' + distanciaKm + ' km: ' + nCercanos + ' (' + nivel.label + ')</div>' +
        enlaceAnterior +
        (p.descripcion ? '<div style="font-size:11px;color:#333;margin-top:4px;max-width:220px;word-wrap:break-word">' + esc(p.descripcion.substring(0, 120)) + (p.descripcion.length > 120 ? '...' : '') + '</div>' : '') +
        '<div style="font-size:10px;color:#999;margin-top:4px">Lat: ' + p.lat.toFixed(5) + ' · Lng: ' + p.lng.toFixed(5) + '</div></div>';
      window.L.circleMarker([p.lat, p.lng], { radius: num ? 13 : 8, fillColor: nivel.color, color: p.color, weight: 2.5, opacity: 1, fillOpacity: 0.95, fecha: p.fecha, hora: p.hora, confirmada: p.confirmada, num: num, sector: p.sector, delito: p.delito }).addTo(layerGroup.current).bindPopup(popup);
      if (num) {
        window.L.marker([p.lat, p.lng], { interactive: false, keyboard: false, icon: window.L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13],
          html: '<div style="width:26px;height:26px;line-height:26px;text-align:center;font:800 13px Segoe UI,sans-serif;color:#111;text-shadow:0 0 3px #fff,0 0 3px #fff">' + num + '</div>' }) }).addTo(layerGroup.current);
      }
    });
    // Todas las zonas de atención se marcan siempre (círculo punteado + etiqueta); la elegida se resalta
    (zonas || []).forEach(function(z) {
      var activa = focoSel && focoSel.clave === z.clave;
      var radio = Math.max(z.radioM + 150, 300);
      window.L.circle([z.centro.lat, z.centro.lng], { radius: radio, color: '#8b1e1e', weight: activa ? 3 : 2, opacity: activa ? 1 : 0.8, dashArray: activa ? '8 6' : '4 8', fillColor: '#8b1e1e', fillOpacity: activa ? 0.1 : 0.03, interactive: false }).addTo(layerGroup.current);
      var etiqueta = '<div style="transform:translate(-50%,-100%);background:#8b1e1e;color:#fff;font:700 12px Segoe UI,sans-serif;padding:2px 9px;border-radius:10px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.35)">Zona ' + z.numero + ' · ' + z.n + ' casos</div>';
      window.L.marker([z.centro.lat + radio / 111320, z.centro.lng], { interactive: false, keyboard: false, icon: window.L.divIcon({ className: '', iconSize: [0, 0], html: etiqueta }) }).addTo(layerGroup.current);
    });
    if (focoSel) {
      mapInstance.current.fitBounds(window.L.latLngBounds(focoSel.miembros.map(function(m) { return [m.lat, m.lng]; })), { padding: [70, 70], maxZoom: 15 });
    } else if (!reproDia && puntosFiltrados.length > 0) {
      var bounds = window.L.latLngBounds(puntosFiltrados.map(function(p) { return [p.lat, p.lng]; }));
      mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [leafletReady, puntosFiltrados, reproDia]);

  // Si cambian los filtros o las capas, la zona elegida ya no corresponde: se quita
  useEffect(function() { setFocoSel(null); setReproDia(null); }, [fechaDesde, fechaHasta, filtroDelito, filtroMunicipio, filtros]);

  // Al abrir la pestaña Importar, los mapas pequeños del importador (estuvieron ocultos) recalculan su tamaño
  useEffect(function() {
    if (seccion !== 'importar') return;
    var t = setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 80);
    return function() { clearTimeout(t); };
  }, [seccion]);

  // Al volver a la pestaña del mapa, Leaflet recalcula su tamaño
  useEffect(function() {
    if (seccion !== 'mapa') return;
    var t = setTimeout(function() { if (mapInstance.current) mapInstance.current.invalidateSize(false); }, 60);
    return function() { clearTimeout(t); };
  }, [seccion]);

  useEffect(function() { return function() { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } }; }, []);

  var limpiarFiltros = function() { setFechaDesde(''); setFechaHasta(''); setFiltroDelito(''); setFiltroMunicipio(''); setFiltros(filtrosIniciales()); };
  var hayFiltrosActivos = fechaDesde || fechaHasta || filtroDelito || filtroMunicipio;
  var puntosMapa = reproDia ? puntosFiltrados.filter(function(p) { return !p.fecha || String(p.fecha).slice(0, 10) <= reproDia; }) : puntosFiltrados;
  var cuentaMes = {};
  puntos.concat(sinUbicar).forEach(function(p) { if (p.fecha) { var k = String(p.fecha).slice(0, 7); cuentaMes[k] = (cuentaMes[k] || 0) + 1; } });
  var mesesChips = Object.keys(cuentaMes).sort().map(function(k) { return { clave: k, n: cuentaMes[k] }; });
  var textoPeriodo = textoPeriodoFiltro(fechaDesde, fechaHasta);
  // Cifras al estilo de los módulos 911 y Primer Respondiente; se usan en la vista normal y en la pantalla completa
  var tarjetasResumen = [
    { icono: MapPin, color: '#b69054', valor: puntosMapa.length, etiqueta: 'Casos en el mapa' },
    { icono: Target, color: '#8b1e1e', valor: (zonas || []).length, etiqueta: 'Zonas de atención' },
    { icono: Clock, color: '#b69054', valor: ritmo ? (ritmo < 1 ? 'Más de 1 al día' : 'Cada ' + ritmo.toFixed(1) + ' días') : '—', etiqueta: 'Ritmo de homicidios' },
    { icono: Flag, color: '#001a4d', valor: topSectores[0] ? topSectores[0][0] : '—', etiqueta: 'Colonia con más casos' },
  ];
  // El título describe lo que se ve (la región de los casos), no la región del perfil de quien mira
  var regionesDatos = {};
  puntos.concat(sinUbicar).forEach(function(p) { if (p.fuente === 'incidencia_regional' && p.region) regionesDatos[p.region] = true; });
  var listaRegiones = Object.keys(regionesDatos);
  var alcancePantalla = (user && (user.rol === 'coordinador' || user.rol === 'agente') && user.zona) ? 'Coordinación ' + user.zona
    : listaRegiones.length === 1 ? listaRegiones[0]
    : listaRegiones.length > 1 ? 'Todas las regiones'
    : 'Estadística de homicidios';
  var textoDelito = filtroDelito ? filtroDelito.charAt(0) + filtroDelito.slice(1).toLowerCase() : 'Todos los delitos';

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: seccion === 'importar' ? 'none' : 'block' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {hayFiltrosActivos && (
            <button onClick={limpiarFiltros} style={{ background: '#ffebee', border: '1px solid #dc354530', borderRadius: 7, padding: '6px 12px', color: C.red, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={12} /> Limpiar filtros
            </button>
          )}
          <button onClick={cargarDatos} style={{ background: 'none', border: '1.5px solid #001a4d', borderRadius: 7, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: C.darkBlue, fontSize: 16, fontWeight: 600 }}>
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>
      </div>

      {seccion === 'mapa' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
          {tarjetasResumen.map(function(t) { return <TarjetaResumen key={t.etiqueta} icono={t.icono} color={t.color} valor={t.valor} etiqueta={t.etiqueta} />; })}
        </div>
      )}
      {seccion === 'mapa' && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <button onClick={function() { setCapasAbiertas(!capasAbiertas); }} aria-expanded={capasAbiertas}
              style={{ background: 'none', border: '1.5px solid #c7cfe0', borderRadius: 7, padding: '6px 14px', color: C.gray, fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40 }}>
              Capas del mapa {capasAbiertas ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button onClick={entrarPresentacion} aria-label="Ver el mapa en pantalla completa"
              style={{ marginLeft: 'auto', background: C.darkBlue, border: '2px solid ' + C.darkBlue, borderRadius: 8, padding: '8px 18px', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
              <Maximize2 size={18} /> Pantalla completa
            </button>
          </div>
          {capasAbiertas && (
            <div style={{ marginTop: 10, background: C.white, borderRadius: 10, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {FUENTES.filter(function(f) { return puntos.some(function(p) { return p.fuente === f.key; }); }).map(function(f) {
                  var n = puntos.filter(function(p) { return p.fuente === f.key && pasaFiltros(p); }).length;
                  var on = filtros[f.key];
                  return (
                    <button key={f.key} onClick={function() { setFiltros(function(p) { var x = {}; Object.assign(x, p); x[f.key] = !p[f.key]; return x; }); }}
                      style={{ padding: '8px 14px', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer', minHeight: 40, border: '1.5px solid ' + (on ? f.color : C.lightGray), background: on ? f.color + '15' : C.white, color: on ? f.color : C.gray }}>
                      {on ? '✓ ' : ''}{f.label} · {n}
                    </button>
                  );
                })}
              </div>
              {FUENTES.some(function(f) { return !puntos.some(function(p) { return p.fuente === f.key; }); }) && (
                <div style={{ fontSize: 15, color: C.gray, marginTop: 10 }}>
                  Sin datos todavía: {FUENTES.filter(function(f) { return !puntos.some(function(p) { return p.fuente === f.key; }); }).map(function(f) { return f.label; }).join(', ')}.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ background: hayFiltrosActivos ? C.lightGold : C.white, border: hayFiltrosActivos ? '1px solid #b6905440' : '1px solid transparent', borderRadius: 10, padding: 14, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 17, color: C.darkBlue, lineHeight: 1.5 }}>
            <Filter size={17} color={C.gold} style={{ verticalAlign: -3, marginRight: 8 }} />
            <strong>Filtros:</strong> {textoPeriodo} · {textoDelito} · {filtroMunicipio || 'Todos los municipios'}
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: C.darkBlue, cursor: 'pointer' }}>
            <input type="checkbox" checked={soloConfirmadas} onChange={function(e) { setSoloConfirmadas(e.target.checked); }} style={{ width: 18, height: 18 }} />
            Mapa y zonas: solo ubicaciones confirmadas
          </label>
          <button onClick={function() { setFiltrosAbiertos(!filtrosAbiertos); }} aria-expanded={filtrosAbiertos}
            style={{ background: 'none', border: '1.5px solid #c7cfe0', borderRadius: 7, padding: '6px 14px', color: C.darkBlue, fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40 }}>
            {filtrosAbiertos ? 'Ocultar filtros' : 'Cambiar filtros'} {filtrosAbiertos ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        {filtrosAbiertos && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <SelectorPeriodo desde={fechaDesde} hasta={fechaHasta} meses={mesesChips} onCambiar={function(d, h) { setFechaDesde(d); setFechaHasta(h); }} />
          </div>
          <div>
            <label style={{ fontSize: 15, fontWeight: 600, color: C.gray, display: 'block', marginBottom: 2 }}>Delito</label>
            <select style={{ ...selectStyle, width: '100%' }} value={filtroDelito} onChange={function(e) { setFiltroDelito(e.target.value); }}>
              <option value="">— Todos —</option>
              {delitosUnicos.map(function(d) { return <option key={d} value={d}>{d}</option>; })}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 15, fontWeight: 600, color: C.gray, display: 'block', marginBottom: 2 }}>Municipio</label>
            <select style={{ ...selectStyle, width: '100%' }} value={filtroMunicipio} onChange={function(e) { setFiltroMunicipio(e.target.value); }}>
              <option value="">— Todos —</option>
              {municipiosUnicos.map(function(m) { return <option key={m} value={m}>{m}</option>; })}
            </select>
          </div>
        </div>
        )}
      </div>
      </div>

      <div style={{ display: seccion === 'mapa' ? 'block' : 'none' }}>
      {loading ? (
        <div style={{ background: C.white, borderRadius: 12, padding: 60, textAlign: 'center', color: C.gray, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <RefreshCw size={28} color={C.gray} /><p style={{ marginTop: 10, fontSize: 16 }}>Cargando datos geográficos...</p>
        </div>
      ) : !leafletReady ? (
        <div style={{ background: C.white, borderRadius: 12, padding: 60, textAlign: 'center', color: C.gray, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <MapPin size={28} color={C.gray} /><p style={{ marginTop: 10, fontSize: 16 }}>Cargando mapa...</p>
        </div>
      ) : (
        <div style={presentacion
          ? { position: 'fixed', inset: 0, zIndex: 90, background: '#001a4d', display: 'flex', flexDirection: 'column' }
          : { borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid ' + C.lightGray }}>
          {presentacion && <BarraSuperior alcance={alcancePantalla} periodo={textoPeriodo} onSalir={salirPresentacion} />}
          <div style={presentacion ? { position: 'relative', flex: 1, minHeight: 0 } : undefined}>
            <div ref={mapRef} style={{ width: '100%', height: presentacion ? '100%' : 500 }} />
            {presentacion && (
              <CapasPantalla tarjetas={tarjetasResumen} niveles={NIVELES_CALOR} distanciaKm={distanciaKm} zonas={zonas}
                reproductor={<ReproducirMes fechas={puntosFiltrados.map(function(p) { return p.fecha; })} dia={reproDia} onDia={setReproDia} visibles={puntosMapa.length} total={puntosFiltrados.length} />} />
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 18, fontSize: 14, color: C.gray, flexWrap: 'wrap' }} title="Cada punto toma su color según cuántos casos hay a menos de esa distancia">
        <span style={{ fontWeight: 600 }}>Concentración (casos en un radio de {distanciaKm} km):</span>
        {NIVELES_CALOR.map(function(n) { return (
          <span key={n.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: n.color, display: 'inline-block' }} />
            <span><strong style={{ color: '#374151' }}>{n.label}</strong> · {n.casos}</span>
          </span>
        ); })}
        <span style={{ color: '#8b1e1e', fontWeight: 600 }}>Resplandor: solo en zonas de atención prioritaria</span>
        <span style={{ color: '#001a4d', fontWeight: 600 }}>El número en cada punto es el orden cronológico (1 = el más antiguo del periodo mostrado)</span>
      </div>
      {sinUbicarFiltrados.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 15, color: '#7a4b00', background: '#fff8e1', border: '1px solid #f0d58a', borderRadius: 8, padding: '8px 12px' }}>
          <strong>{sinUbicarFiltrados.length} caso{sinUbicarFiltrados.length > 1 ? 's' : ''} sin ubicación</strong> no aparece{sinUbicarFiltrados.length > 1 ? 'n' : ''} en el mapa, pero sí cuenta{sinUbicarFiltrados.length > 1 ? 'n' : ''} en el panel de análisis. Para ubicarlos, usa la pestaña Importar.
        </div>
      )}
      {avisoPendientes}

      {soloConfirmadas && nAproxOcultos > 0 && (
        <div role="status" style={{ marginTop: 10, background: '#fbf3e0', border: '1px solid #c9a24b', borderRadius: 8, padding: '8px 12px', fontSize: 15, color: '#5a4a1e', lineHeight: 1.45 }}>
          <strong>{nAproxOcultos}</strong> {nAproxOcultos === 1 ? 'caso tiene' : 'casos tienen'} ubicación aproximada o sin confirmar: no se dibujan ni cuentan para las zonas, pero sí están en las cifras del análisis. Se confirman en <em>Revisar ubicaciones</em>.
        </div>
      )}
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <ReglaMapa obtenerMapa={function() { return mapInstance.current; }} />
        <RadioMapa obtenerMapa={function() { return mapInstance.current; }} />
      </div>
      <div style={{ marginTop: 12 }}>
        <ReproducirMes
          fechas={puntosFiltrados.map(function(p) { return p.fecha; })}
          dia={reproDia} onDia={setReproDia}
          visibles={puntosMapa.length} total={puntosFiltrados.length} />
      </div>

      <div style={{ marginTop: 16 }}>
        <ZonasAtencion
          puntos={puntosMapa.filter(function(p) { return p.fuente === 'incidencia_regional'; })}
          seleccionada={focoSel && focoSel.clave}
          onSeleccionar={setFocoSel}
          onIniciarProyecto={onIniciarProyecto}
          onZonas={setZonas}
          km={distanciaKm}
          onKm={setDistanciaKm}
        />
      </div>
      </div>

      <div style={{ display: seccion === 'panel' ? 'block' : 'none' }}>
        <div style={{ background: C.white, borderRadius: 10, border: '1px solid #b6905440', padding: 22 }}>
          {puntosAnalisis.length === 0 ? (
            <div style={{ fontSize: 17, color: C.gray, textAlign: 'center', padding: 20 }}>Sin datos con estos filtros.</div>
          ) : (
            <>
              <div style={{ padding: 16, backgroundColor: C.lightGold, borderRadius: 10, border: '1px solid #b6905440' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.gold, textTransform: 'uppercase', marginBottom: 6 }}>Lo más importante</div>
                <div style={{ fontSize: 19, color: C.darkBlue, lineHeight: 1.65 }}>
                  Se analizaron <strong>{puntosAnalisis.length}</strong> incidentes
                  {fechaDesde && fechaHasta ? ' entre ' + fechaLarga(fechaDesde) + ' y ' + fechaLarga(fechaHasta) : fechaDesde ? ' desde el ' + fechaLarga(fechaDesde) : fechaHasta ? ' hasta el ' + fechaLarga(fechaHasta) : ''}
                  {filtroMunicipio ? ' en ' + filtroMunicipio : ''}
                  {filtroDelito ? ' del tipo "' + filtroDelito + '"' : ''}.
                  {topSectores.length > 0 && <span> La colonia con más casos es <strong>{topSectores[0][0]}</strong> con {topSectores[0][1]}.</span>}
                  {medioTop && <span> Predomina el homicidio por <strong>{medioTop[0].toLowerCase()}</strong> ({medioTop[1]} de {homicidios.length}).</span>}
                  {sinUbicarFiltrados.length > 0 && <span> {sinUbicarFiltrados.length} todavía no tienen ubicación en el mapa.</span>}
                </div>
              </div>

              {avisoPendientes}
              <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
                <TarjetaDato etiqueta="Casos en el periodo" valor={puntosAnalisis.length} detalle={iniPeriodo && finPeriodo ? 'Del ' + fechaLarga(iniPeriodo) + ' al ' + fechaLarga(finPeriodo) : null} />
                <TarjetaDato etiqueta="Ritmo" valor={ritmo ? (ritmo < 1 ? 'Más de uno por día' : 'Uno cada ' + ritmo.toFixed(1) + ' días') : '—'} detalle={diasPeriodo > 0 ? diasPeriodo + ' días analizados' : null} />
                <TarjetaDato etiqueta="Colonia con más casos" valor={topSectores[0] ? topSectores[0][0] : (topMunicipios[0] ? topMunicipios[0][0] : '—')} detalle={topSectores[0] ? topSectores[0][1] + ' de ' + puntosAnalisis.length : null} />
                {homicidios.length > 0 && <TarjetaDato etiqueta="Cómo ocurrieron" valor={medioTop ? medioTop[0] : 'Por determinar'} detalle={medioTop ? medioTop[1] + ' de ' + homicidios.length + ' (' + Math.round(medioTop[1] / homicidios.length * 100) + '%)' : null} />}
                {cambioRitmo && <TarjetaDato etiqueta={'Frente a ' + cambioRitmo.contra.toLowerCase()} valor={(cambioRitmo.pct >= 0 ? '▲ ' : '▼ ') + Math.abs(cambioRitmo.pct) + '%'} detalle={'casos por día en ' + cambioRitmo.actual.nombre.toLowerCase() + (cambioRitmo.actual.parcial ? ' (hasta el ' + Number(histFin.slice(8, 10)) + ')' : '')} />}
              </div>

              {homicidios.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.darkBlue, marginBottom: 12 }}>Cómo ocurrieron los homicidios</div>
                  <BarraMedios porMedio={porMedio} total={homicidios.length} />
                  {porMedio['Por determinar'] > 0 && <div style={{ fontSize: 16, color: C.gray, marginTop: 10 }}>"Por determinar": la tipificación del MP todavía no menciona el medio (por ejemplo, cuando falta el dictamen del perito).</div>}
                  {nFosa > 0 && <div style={{ fontSize: 16, color: C.gray, marginTop: 4 }}>{nFosa} caso{nFosa > 1 ? 's' : ''} correspondiente{nFosa > 1 ? 's' : ''} a hallazgo en fosa.</div>}
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: 'pointer', fontSize: 17, fontWeight: 600, color: C.darkBlue }}>Ver cómo lo escribió el Ministerio Público</summary>
                    <div style={{ marginTop: 10, fontSize: 16, color: '#374151', lineHeight: 1.6 }}>
                      {MEDIOS_ORDEN.filter(function(m) { return variantesMedio[m]; }).map(function(m) { return (
                        <div key={m} style={{ marginBottom: 10 }}>
                          <strong style={{ color: C.darkBlue }}>{m}</strong>
                          {Object.entries(variantesMedio[m]).sort(function(a, b) { return b[1] - a[1]; }).map(function(e) { return <div key={e[0]} style={{ paddingLeft: 14 }}>{e[1]} · {e[0]}</div>; })}
                        </div>
                      ); })}
                    </div>
                  </details>
                </div>
              )}

              <div style={{ marginTop: 32, paddingTop: 22, borderTop: '2px solid #b6905440' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.darkBlue, marginBottom: 4 }}>Cómo ha cambiado</div>
                <div style={{ fontSize: 16, color: C.gray, marginBottom: 14 }}>La línea sigue el periodo que elijas. Las columnas por mes muestran todo el historial y resaltan el mes elegido.</div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.darkBlue, marginBottom: 6 }}>Casos por semana · {hayFechas ? textoPeriodo : 'todo el historial'}</div>
                  {semHist.length > 0 ? (
                    <>
                      <div style={{ fontSize: 16, color: C.gray, marginBottom: 10 }}>Cada columna suma los casos de esos 7 días (por ejemplo, "{semHist[0][0]}").</div>
                      <ColumnasSimples items={semHist} subtitulos={semSub} picos={semPicos} />
                      {semHist.length > 1 && maxSem > 0 && (
                        <div style={{ fontSize: 18, color: C.darkBlue, marginTop: 12, lineHeight: 1.5 }}>
                          {picosMeta.length === 1
                            ? <span>La semana con más casos fue <strong>{rangoLargo(picosMeta[0].ini, picosMeta[0].fin)}</strong>, con <strong>{maxSem}</strong>.</span>
                            : <span>Hay <strong>{picosMeta.length}</strong> semanas empatadas con más casos (<strong>{maxSem}</strong>): {picosMeta.map(function(m) { return rangoLargo(m.ini, m.fin); }).join('; ')}.</span>}
                        </div>
                      )}
                      {hayRepuntes && (
                        <div style={{ fontSize: 18, color: C.darkBlue, marginTop: 8, lineHeight: 1.5 }}>
                          {repuntes.length === 0
                            ? <span>No hubo repuntes: ninguna semana superó en 50% el promedio de <strong>{promSem.toFixed(1)}</strong> casos por semana.</span>
                            : <span>{repuntes.length === 1 ? 'Hubo 1 repunte' : 'Hubo ' + repuntes.length + ' repuntes'} (semana con al menos 50% más casos que el promedio de <strong>{promSem.toFixed(1)}</strong> por semana): {repuntes.map(function(m) { return rangoLargo(m.ini, m.fin) + ' (' + m.n + ')'; }).join('; ')}.</span>}
                        </div>
                      )}
                      {ultimaSemanaParcial && <div style={{ fontSize: 15, color: C.gray, marginTop: 4 }}>La última columna es una semana incompleta y no entra en el promedio.</div>}
                    </>
                  ) : (
                    <div style={{ fontSize: 17, color: C.gray, padding: '16px 0' }}>No hay casos en el periodo elegido.</div>
                  )}
                </div>
                <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28 }}>
                  {mesesHist.length > 0 && (
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: C.darkBlue, marginBottom: 10 }}>Casos por mes</div>
                      <ColumnasSimples items={mesesHist.map(function(m) { return [m.nombre, m.n]; })} subtitulos={mesesHist.map(function(m, i) { var partes = []; if (i > 0) { var ant = mesesHist[i - 1]; var pc = Math.round(((m.n / m.dias) / (ant.n / ant.dias) - 1) * 100); partes.push((pc >= 0 ? '▲ ' : '▼ ') + Math.abs(pc) + '%'); } if (m.parcial) partes.push('hasta el ' + Number(histFin.slice(8, 10))); return partes.length ? partes.join(' · ') : null; })} resaltadas={mesesResaltados} />
                    </div>
                  )}
                  <RankingBarras titulo="Colonias con más casos" icono={<MapPin size={20} color={C.gold} />} items={topSectores.slice(0, 8)} />
                </div>
              </div>

              <div style={{ marginTop: 30, padding: 18, background: '#f6f3ec', border: '1px solid #b6905440', borderRadius: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.darkBlue, marginBottom: 8 }}>Proyección</div>
                <MedidorMeses n={mesesHist.length} meta={12} />
                <div style={{ fontSize: 18, color: C.darkBlue, marginTop: 10 }}>Meses con datos: <strong>{mesesHist.length} de 12</strong></div>
                <div style={{ fontSize: 16, color: '#374151', marginTop: 4, lineHeight: 1.5 }}>La proyección se activa con 12 meses de historia. Con menos, sería una suposición y no un dato en el que un mando pueda apoyarse.</div>
              </div>

              <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28 }}>
                {topMunicipios.length > 1 && <RankingBarras titulo="Municipios" icono={<MapPin size={20} color={C.gold} />} items={topMunicipios} />}
                {topArmas.length > 0 && <RankingBarras titulo="Arma o calibre" icono={<BarChart3 size={20} color={C.gold} />} items={topArmas} />}
              </div>

              <details style={{ marginTop: 24 }}>
                <summary style={{ cursor: 'pointer', fontSize: 17, fontWeight: 600, color: C.darkBlue }}>Ver la tipificación original completa (Top 10)</summary>
                <div style={{ marginTop: 12 }}>
                  <RankingBarras titulo="Tal como la escribió el MP" icono={<BarChart3 size={20} color={C.gold} />} items={topDelitos} />
                </div>
              </details>
            </>
          )}
        </div>
      </div>

      <div style={{ display: seccion === 'importar' ? 'block' : 'none' }}>
        {user && user.rol === 'mando' && <ImportarIncidenciaRegional enPestana perfil={user} onImportado={cargarDatos} leafletListo={leafletReady} />}
      </div>

      {stats.total === 0 && !loading && (
        <div style={{ marginTop: 14, padding: 14, background: '#fff3e0', borderRadius: 8, border: '1px solid #ff980030', fontSize: 14, color: '#e65100' }}>
          No hay coordenadas registradas aún. El mapa se poblará automáticamente conforme se capturen registros con coordenadas.
        </div>
      )}
    </div>
  );
}
