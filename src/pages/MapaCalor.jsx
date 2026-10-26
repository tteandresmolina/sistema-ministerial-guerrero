// src/pages/MapaCalor.jsx
// Mapa de Calor v2 — Inteligencia Criminal Basada en Evidencia
// Filtros: fecha, delito, municipio, capas
// Popups con detalles del caso
// Panel de análisis por municipio y delito
// Fuentes: registros_911, escenas_crimen, detenidos, oficios_investigacion

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { RefreshCw, MapPin, Filter, X, Clock, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import ImportarIncidenciaRegional from './ImportarIncidenciaRegional';
import ZonasAtencion from './ZonasAtencion';

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
  { key: 'incidencia_regional', label: 'Homicidios (Acapulco)', color: '#8b1e1e', lat: 'coordenadas_lat', lng: 'coordenadas_lng', fecha: 'fecha', delito: 'delito', muni: 'zona', desc: 'lugar_hechos' },
];

// Las fuentes se muestran en dos grupos: lo que se captura en el sistema (por C.I.) y la estadística regional que llega en Excel
const GRUPOS_FUENTES = [
  { titulo: 'Captura del sistema', detalle: '911 y oficios de investigación, por carpeta (C.I.)', keys: ['registros_911', 'escenas_crimen', 'detenidos', 'oficios_investigacion'] },
  { titulo: 'Estadística regional', detalle: 'Reporte mensual en Excel · solo casos con carpeta de investigación', keys: ['incidencia_regional'], importador: true },
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
const RADIO_CALOR_M = 300; // radio del núcleo de cada caso en metros; con el difuminado cubre unos 500 m

// Radio del calor en píxeles para el zoom actual, de modo que cubra siempre los mismos metros
function radioCalorPx(mapa) {
  var lat = mapa.getCenter().lat;
  var mpp = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, mapa.getZoom());
  return Math.max(6, Math.min(120, RADIO_CALOR_M / mpp));
}

// Las colonias/sectores del reporte regional pertenecen al municipio de Acapulco de Juárez,
// salvo Coyuca de Benítez y San Marcos, que son municipios aparte. Se amplía cuando lleguen otras regiones.
const MUNICIPIO_DE_SECTOR_APARTE = { 'coyuca de benítez': 'Coyuca de Benítez', 'coyuca de benitez': 'Coyuca de Benítez', 'san marcos': 'San Marcos' };
function municipioDeSector(sector) {
  var k = String(sector || '').trim().toLowerCase();
  if (!k) return '';
  return MUNICIPIO_DE_SECTOR_APARTE[k] || 'Acapulco de Juárez';
}

// Color suave tipo semáforo según el peso de la barra frente a la mayor
function colorSuave(valor, max) {
  var r = max > 0 ? valor / max : 0;
  return r >= 0.67 ? '#f2b8b0' : r >= 0.34 ? '#f8dc9b' : '#bfe0b8';
}

// Ranking en barras: la etiqueta completa va arriba de la barra para que siempre se lea
function RankingBarras({ titulo, icono, items }) {
  var max = items.length > 0 ? items[0][1] : 1;
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.darkBlue, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>{icono} {titulo}</div>
      {items.length === 0 ? (
        <div style={{ fontSize: 14, color: C.gray, textAlign: 'center', padding: 20 }}>Sin datos</div>
      ) : (
        items.map(function(item, i) { return (
          <div key={item[0]} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14, fontWeight: 600, color: '#1f2937', lineHeight: 1.3 }}>
              <span><span style={{ color: C.gray, fontWeight: 700 }}>#{i + 1}</span> {item[0]}</span>
              <span style={{ fontWeight: 800, fontSize: 15 }}>{item[1]}</span>
            </div>
            <div style={{ height: 10, background: C.bg, borderRadius: 5, overflow: 'hidden', marginTop: 4 }}>
              <div style={{ width: (item[1] / max * 100) + '%', height: '100%', background: colorSuave(item[1], max), borderRadius: 5 }} />
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

const inputStyle = { padding: '13px 14px', border: '2px solid #e8ecf1', borderRadius: 7, fontSize: 15, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', minHeight: 44 };
const selectStyle = { ...inputStyle, backgroundColor: '#ffffff', cursor: 'pointer' };

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

export default function MapaCalor({ user, onIniciarProyecto, seccion = 'mapa' }) {
  const mapRef = useRef(null);
  const [zonas, setZonas] = useState([]); // zonas de atención calculadas por el panel (se marcan siempre en el mapa)
  const [focoSel, setFocoSel] = useState(null); // zona de atención elegida en el panel (para dibujarla en el mapa)
  const mapInstance = useRef(null);
  const layerGroup = useRef(null);
  const heatLayer = useRef(null);
  const [puntos, setPuntos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leafletReady, setLeafletReady] = useState(false);

  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroDelito, setFiltroDelito] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('');

  const [stats, setStats] = useState({ total: 0, por_fuente: {} });
  const [delitosUnicos, setDelitosUnicos] = useState([]);
  const [municipiosUnicos, setMunicipiosUnicos] = useState([]);

  useEffect(() => {
    loadCSS('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css');
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js')
      .then(function() { return loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js'); })
      .then(function() { setLeafletReady(true); })
      .catch(function(e) { console.error('Error cargando Leaflet:', e); });
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    const todos = [];
    const porFuente = {};
    const delitos = new Set();
    const municipios = new Set();

    for (const f of FUENTES) {
      const campos = f.lat + ', ' + f.lng + ', ' + f.fecha + ', ' + f.delito + ', ' + f.muni + ', ' + f.desc;
      const { data } = await supabase.from(f.key).select(campos).not(f.lat, 'is', null).not(f.lng, 'is', null);
      const coords = (data || []).map(function(r) {
        return {
          lat: parseFloat(r[f.lat]), lng: parseFloat(r[f.lng]), fuente: f.key,
          fecha: r[f.fecha] || '', delito: r[f.delito] || '', municipio: f.key === 'incidencia_regional' ? municipioDeSector(r[f.muni]) : (r[f.muni] || ''), sector: f.key === 'incidencia_regional' ? (r[f.muni] || '') : '',
          descripcion: r[f.desc] || '', label: f.label, color: f.color,
        };
      }).filter(function(p) { return !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0 && p.lng !== 0; });

      coords.forEach(function(c) {
        if (c.delito) delitos.add(c.delito.toUpperCase());
        if (c.municipio) municipios.add(c.municipio);
      });
      porFuente[f.key] = coords.length;
      todos.push.apply(todos, coords);
    }

    setPuntos(todos);
    setStats({ total: todos.length, por_fuente: porFuente });
    setDelitosUnicos(Array.from(delitos).sort());
    setMunicipiosUnicos(Array.from(municipios).sort());
    setLoading(false);
  };

  useEffect(function() { cargarDatos(); }, []);

  const pasaFiltros = function(p) {
    if (fechaDesde && p.fecha && p.fecha < fechaDesde) return false;
    if (fechaHasta && p.fecha && p.fecha > fechaHasta) return false;
    if (filtroDelito && p.delito.toUpperCase() !== filtroDelito) return false;
    if (filtroMunicipio && p.municipio !== filtroMunicipio) return false;
    return true;
  };
  const puntosFiltrados = puntos.filter(function(p) { return filtros[p.fuente] && pasaFiltros(p); });

  const analysisPorMunicipio = {};
  const analysisPorDelito = {};
  const analysisPorSector = {};
  puntosFiltrados.forEach(function(p) {
    var m = p.municipio || 'Sin municipio';
    analysisPorMunicipio[m] = (analysisPorMunicipio[m] || 0) + 1;
    var d = p.delito || 'Sin tipificar';
    analysisPorDelito[d] = (analysisPorDelito[d] || 0) + 1;
    if (p.sector) analysisPorSector[p.sector] = (analysisPorSector[p.sector] || 0) + 1;
  });
  const topMunicipios = Object.entries(analysisPorMunicipio).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 10);
  const topDelitos = Object.entries(analysisPorDelito).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 10);
  const topSectores = Object.entries(analysisPorSector).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 10);

  useEffect(function() {
    if (!leafletReady || !mapRef.current || !window.L) return;
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
          var r = radioCalorPx(mapInstance.current);
          heatLayer.current.setOptions({ radius: r, blur: r * 0.6 });
        }
      });
    }
    mapInstance.current.invalidateSize(false);
    layerGroup.current.clearLayers();
    if (heatLayer.current) { mapInstance.current.removeLayer(heatLayer.current); heatLayer.current = null; }
    var heatData = puntosFiltrados.map(function(p) { return [p.lat, p.lng, 1]; });
    if (heatData.length > 0 && window.L.heatLayer) {
      heatLayer.current = window.L.heatLayer(heatData, {
        radius: radioCalorPx(mapInstance.current), blur: radioCalorPx(mapInstance.current) * 0.6,
        maxZoom: 1, max: 3.33, minOpacity: 0.05,
        gradient: GRADIENTE_CALOR,
      }).addTo(mapInstance.current);
    }
    puntosFiltrados.forEach(function(p) {
      var popup = '<div style="font-family:Segoe UI,sans-serif;min-width:180px">' +
        '<div style="font-weight:700;font-size:13px;color:' + p.color + ';margin-bottom:4px">' + esc(p.label) + '</div>' +
        (p.delito ? '<div style="font-size:12px;color:#b71c1c;font-weight:600">' + esc(p.delito) + '</div>' : '') +
        (p.municipio ? '<div style="font-size:11px;color:#666;margin-top:2px">📍 ' + esc(p.municipio) + '</div>' : '') +
        (p.fecha ? '<div style="font-size:11px;color:#666">📅 ' + esc(p.fecha) + '</div>' : '') +
        (p.descripcion ? '<div style="font-size:11px;color:#333;margin-top:4px;max-width:220px;word-wrap:break-word">' + esc(p.descripcion.substring(0, 120)) + (p.descripcion.length > 120 ? '...' : '') + '</div>' : '') +
        '<div style="font-size:10px;color:#999;margin-top:4px">Lat: ' + p.lat.toFixed(5) + ' · Lng: ' + p.lng.toFixed(5) + '</div></div>';
      window.L.circleMarker([p.lat, p.lng], { radius: 8, fillColor: p.color, color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 0.85 }).addTo(layerGroup.current).bindPopup(popup);
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
    } else if (puntosFiltrados.length > 0) {
      var bounds = window.L.latLngBounds(puntosFiltrados.map(function(p) { return [p.lat, p.lng]; }));
      mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [leafletReady, puntosFiltrados]);

  // Si cambian los filtros o las capas, la zona elegida ya no corresponde: se quita
  useEffect(function() { setFocoSel(null); }, [fechaDesde, fechaHasta, filtroDelito, filtroMunicipio, filtros]);

  // Al volver a la pestaña del mapa, Leaflet recalcula su tamaño
  useEffect(function() {
    if (seccion !== 'mapa') return;
    var t = setTimeout(function() { if (mapInstance.current) mapInstance.current.invalidateSize(false); }, 60);
    return function() { clearTimeout(t); };
  }, [seccion]);

  useEffect(function() { return function() { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } }; }, []);

  var limpiarFiltros = function() { setFechaDesde(''); setFechaHasta(''); setFiltroDelito(''); setFiltroMunicipio(''); setFiltros(filtrosIniciales()); };
  var hayFiltrosActivos = fechaDesde || fechaHasta || filtroDelito || filtroMunicipio;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {hayFiltrosActivos && (
            <button onClick={limpiarFiltros} style={{ background: '#ffebee', border: '1px solid #dc354530', borderRadius: 7, padding: '6px 12px', color: C.red, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={12} /> Limpiar filtros
            </button>
          )}
          <button onClick={cargarDatos} style={{ background: 'none', border: '1.5px solid #001a4d', borderRadius: 7, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: C.darkBlue, fontSize: 14, fontWeight: 600 }}>
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, color: C.darkBlue, marginBottom: 8 }}><strong style={{ fontSize: 24 }}>{puntosFiltrados.length}</strong> puntos en el mapa</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          {GRUPOS_FUENTES.map(function(g) { return (
            <div key={g.titulo} style={{ background: C.white, borderRadius: 10, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.darkBlue }}>{g.titulo}</div>
              <div style={{ fontSize: 13, color: C.gray, margin: '2px 0 10px' }}>{g.detalle}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {FUENTES.filter(function(f) { return g.keys.indexOf(f.key) >= 0; }).map(function(f) {
                  var n = puntos.filter(function(p) { return p.fuente === f.key && pasaFiltros(p); }).length;
                  var on = filtros[f.key];
                  return (
                    <button key={f.key} onClick={function() { setFiltros(function(p) { var x = {}; Object.assign(x, p); x[f.key] = !p[f.key]; return x; }); }}
                      style={{ padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 40, border: '1.5px solid ' + (on ? f.color : C.lightGray), background: on ? f.color + '15' : C.white, color: on ? f.color : C.gray }}>
                      {on ? '✓ ' : ''}{f.label} · {n}
                    </button>
                  );
                })}
              </div>
              {g.importador && user && user.rol === 'mando' && (
                <div style={{ marginTop: 12 }}>
                  <ImportarIncidenciaRegional perfil={user} onImportado={cargarDatos} leafletListo={leafletReady} />
                </div>
              )}
            </div>
          ); })}
        </div>
      </div>

      <div style={{ background: C.white, borderRadius: 10, padding: 14, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase' }}>
          <Filter size={14} /> Filtros de Análisis
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.gray, display: 'block', marginBottom: 2 }}>Fecha desde</label>
            <input type="date" style={inputStyle} value={fechaDesde} onChange={function(e) { setFechaDesde(e.target.value); }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.gray, display: 'block', marginBottom: 2 }}>Fecha hasta</label>
            <input type="date" style={inputStyle} value={fechaHasta} onChange={function(e) { setFechaHasta(e.target.value); }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.gray, display: 'block', marginBottom: 2 }}>Delito</label>
            <select style={{ ...selectStyle, width: '100%' }} value={filtroDelito} onChange={function(e) { setFiltroDelito(e.target.value); }}>
              <option value="">— Todos —</option>
              {delitosUnicos.map(function(d) { return <option key={d} value={d}>{d}</option>; })}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.gray, display: 'block', marginBottom: 2 }}>Municipio</label>
            <select style={{ ...selectStyle, width: '100%' }} value={filtroMunicipio} onChange={function(e) { setFiltroMunicipio(e.target.value); }}>
              <option value="">— Todos —</option>
              {municipiosUnicos.map(function(m) { return <option key={m} value={m}>{m}</option>; })}
            </select>
          </div>
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
        <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid ' + C.lightGray }}>
          <div ref={mapRef} style={{ width: '100%', height: 500 }} />
        </div>
      )}

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 18, fontSize: 14, color: C.gray, flexWrap: 'wrap' }} title="Casos juntos, a menos de unos 500 m uno de otro">
        <span style={{ fontWeight: 600 }}>Concentración:</span>
        {NIVELES_CALOR.map(function(n) { return (
          <span key={n.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: n.color, display: 'inline-block' }} />
            <span><strong style={{ color: '#374151' }}>{n.label}</strong> · {n.casos}</span>
          </span>
        ); })}
      </div>

      <div style={{ marginTop: 16 }}>
        <ZonasAtencion
          puntos={puntosFiltrados.filter(function(p) { return p.fuente === 'incidencia_regional'; })}
          seleccionada={focoSel && focoSel.clave}
          onSeleccionar={setFocoSel}
          onIniciarProyecto={onIniciarProyecto}
          onZonas={setZonas}
        />
      </div>
      </div>

      <div style={{ display: seccion === 'panel' ? 'block' : 'none' }}>
        <div style={{ background: C.white, borderRadius: 10, border: '1px solid #b6905440', padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              <RankingBarras titulo="Incidencia por Municipio (Top 10)" icono={<MapPin size={14} color={C.gold} />} items={topMunicipios} />
              <RankingBarras titulo="Incidencia por Colonia (Top 10)" icono={<MapPin size={14} color={C.gold} />} items={topSectores} />
            </div>
            <div style={{ marginTop: 22 }}>
              <RankingBarras titulo="Incidencia por Tipo de Delito (Top 10)" icono={<BarChart3 size={14} color={C.red} />} items={topDelitos} />
            </div>

            {puntosFiltrados.length > 0 && (
              <div style={{ marginTop: 16, padding: 14, backgroundColor: C.lightGold, borderRadius: 8, border: '1px solid #b6905440' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.gold, textTransform: 'uppercase', marginBottom: 6 }}>Resumen de Inteligencia</div>
                <div style={{ fontSize: 15, color: C.darkBlue, lineHeight: 1.7 }}>
                  Se analizaron <strong>{puntosFiltrados.length}</strong> incidentes
                  {fechaDesde && fechaHasta ? ' entre ' + fechaDesde + ' y ' + fechaHasta : fechaDesde ? ' desde ' + fechaDesde : fechaHasta ? ' hasta ' + fechaHasta : ''}
                  {filtroMunicipio ? ' en ' + filtroMunicipio : ''}
                  {filtroDelito ? ' del tipo "' + filtroDelito + '"' : ''}.
                  {topMunicipios.length > 0 && <span> El municipio con mayor incidencia es <strong>{topMunicipios[0][0]}</strong> con {topMunicipios[0][1]} evento{topMunicipios[0][1] > 1 ? 's' : ''}.</span>}
                  {topSectores.length > 0 && <span> La colonia con mayor incidencia es <strong>{topSectores[0][0]}</strong> con {topSectores[0][1]} evento{topSectores[0][1] > 1 ? 's' : ''}.</span>}
                  {topDelitos.length > 0 && <span> El delito más frecuente es <strong>{topDelitos[0][0]}</strong> con {topDelitos[0][1]} registro{topDelitos[0][1] > 1 ? 's' : ''}.</span>}
                </div>
              </div>
            )}
        </div>
      </div>

      {stats.total === 0 && !loading && (
        <div style={{ marginTop: 14, padding: 14, background: '#fff3e0', borderRadius: 8, border: '1px solid #ff980030', fontSize: 14, color: '#e65100' }}>
          No hay coordenadas registradas aún. El mapa se poblará automáticamente conforme se capturen registros con coordenadas.
        </div>
      )}
    </div>
  );
}
