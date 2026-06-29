// src/pages/MapaCalor.jsx
// Mapa de Calor v2 — Inteligencia Criminal Basada en Evidencia
// Filtros: fecha, delito, municipio, capas
// Popups con detalles del caso
// Panel de análisis por municipio y delito
// Fuentes: registros_911, escenas_crimen, detenidos, oficios_investigacion

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { RefreshCw, MapPin, Filter, X, Clock, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

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
];

const inputStyle = { padding: '8px 10px', border: '1px solid #e8ecf1', borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
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

export default function MapaCalor() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layerGroup = useRef(null);
  const heatLayer = useRef(null);
  const [puntos, setPuntos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leafletReady, setLeafletReady] = useState(false);
  const [showAnalisis, setShowAnalisis] = useState(false);

  const [filtros, setFiltros] = useState({
    registros_911: true, escenas_crimen: true, detenidos: true, oficios_investigacion: true
  });
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
          fecha: r[f.fecha] || '', delito: r[f.delito] || '', municipio: r[f.muni] || '',
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

  const puntosFiltrados = puntos.filter(function(p) {
    if (!filtros[p.fuente]) return false;
    if (fechaDesde && p.fecha && p.fecha < fechaDesde) return false;
    if (fechaHasta && p.fecha && p.fecha > fechaHasta) return false;
    if (filtroDelito && p.delito.toUpperCase() !== filtroDelito) return false;
    if (filtroMunicipio && p.municipio !== filtroMunicipio) return false;
    return true;
  });

  const analysisPorMunicipio = {};
  const analysisPorDelito = {};
  puntosFiltrados.forEach(function(p) {
    var m = p.municipio || 'Sin municipio';
    analysisPorMunicipio[m] = (analysisPorMunicipio[m] || 0) + 1;
    var d = p.delito || 'Sin tipificar';
    analysisPorDelito[d] = (analysisPorDelito[d] || 0) + 1;
  });
  const topMunicipios = Object.entries(analysisPorMunicipio).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 10);
  const topDelitos = Object.entries(analysisPorDelito).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 10);
  const maxMuni = topMunicipios.length > 0 ? topMunicipios[0][1] : 1;
  const maxDelito = topDelitos.length > 0 ? topDelitos[0][1] : 1;

  useEffect(function() {
    if (!leafletReady || !mapRef.current || !window.L) return;
    if (!mapInstance.current) {
      mapInstance.current = window.L.map(mapRef.current, { center: [17.4, -99.5], zoom: 8, scrollWheelZoom: true });
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(mapInstance.current);
      layerGroup.current = window.L.layerGroup().addTo(mapInstance.current);
    }
    layerGroup.current.clearLayers();
    if (heatLayer.current) { mapInstance.current.removeLayer(heatLayer.current); heatLayer.current = null; }
    var heatData = puntosFiltrados.map(function(p) { return [p.lat, p.lng, 1]; });
    if (heatData.length > 0 && window.L.heatLayer) {
      heatLayer.current = window.L.heatLayer(heatData, {
        radius: 35, blur: 25, maxZoom: 16, max: 0.6, minOpacity: 0.4,
        gradient: { 0.2: '#2196f3', 0.4: '#4caf50', 0.6: '#ffeb3b', 0.8: '#ff9800', 1.0: '#f44336' },
      }).addTo(mapInstance.current);
    }
    puntosFiltrados.forEach(function(p) {
      var popup = '<div style="font-family:Segoe UI,sans-serif;min-width:180px">' +
        '<div style="font-weight:700;font-size:13px;color:' + p.color + ';margin-bottom:4px">' + p.label + '</div>' +
        (p.delito ? '<div style="font-size:12px;color:#b71c1c;font-weight:600">' + p.delito + '</div>' : '') +
        (p.municipio ? '<div style="font-size:11px;color:#666;margin-top:2px">📍 ' + p.municipio + '</div>' : '') +
        (p.fecha ? '<div style="font-size:11px;color:#666">📅 ' + p.fecha + '</div>' : '') +
        (p.descripcion ? '<div style="font-size:11px;color:#333;margin-top:4px;max-width:220px;word-wrap:break-word">' + p.descripcion.substring(0, 120) + (p.descripcion.length > 120 ? '...' : '') + '</div>' : '') +
        '<div style="font-size:10px;color:#999;margin-top:4px">Lat: ' + p.lat.toFixed(5) + ' · Lng: ' + p.lng.toFixed(5) + '</div></div>';
      window.L.circleMarker([p.lat, p.lng], { radius: 8, fillColor: p.color, color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 0.85 }).addTo(layerGroup.current).bindPopup(popup);
    });
    if (puntosFiltrados.length > 0) {
      var bounds = window.L.latLngBounds(puntosFiltrados.map(function(p) { return [p.lat, p.lng]; }));
      mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [leafletReady, puntosFiltrados]);

  useEffect(function() { return function() { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } }; }, []);

  var limpiarFiltros = function() { setFechaDesde(''); setFechaHasta(''); setFiltroDelito(''); setFiltroMunicipio(''); setFiltros({ registros_911: true, escenas_crimen: true, detenidos: true, oficios_investigacion: true }); };
  var hayFiltrosActivos = fechaDesde || fechaHasta || filtroDelito || filtroMunicipio;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={18} color={C.gold} />
          <span style={{ fontWeight: 700, fontSize: 16, color: C.darkBlue }}>Mapa de Calor — Inteligencia Criminal</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {hayFiltrosActivos && (
            <button onClick={limpiarFiltros} style={{ background: '#ffebee', border: '1px solid #dc354530', borderRadius: 7, padding: '6px 12px', color: C.red, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={12} /> Limpiar filtros
            </button>
          )}
          <button onClick={cargarDatos} style={{ background: 'none', border: '1.5px solid #001a4d', borderRadius: 7, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: C.darkBlue, fontSize: 12, fontWeight: 600 }}>
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 14 }}>
        <div style={{ background: C.white, borderRadius: 10, padding: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.darkBlue }}>{puntosFiltrados.length}</div>
          <div style={{ fontSize: 11, color: C.gray }}>Puntos filtrados</div>
        </div>
        {FUENTES.map(function(f) { return (
          <div key={f.key} style={{ background: C.white, borderRadius: 10, padding: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: f.color }}>{puntosFiltrados.filter(function(p) { return p.fuente === f.key; }).length}</div>
            <div style={{ fontSize: 10, color: C.gray }}>{f.label}</div>
          </div>
        ); })}
      </div>

      <div style={{ background: C.white, borderRadius: 10, padding: 14, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase' }}>
          <Filter size={14} /> Filtros de Análisis
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {FUENTES.map(function(f) { return (
            <button key={f.key} onClick={function() { setFiltros(function(p) { var n = {}; Object.assign(n, p); n[f.key] = !p[f.key]; return n; }); }}
              style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1.5px solid ' + (filtros[f.key] ? f.color : C.lightGray), background: filtros[f.key] ? f.color + '15' : C.white, color: filtros[f.key] ? f.color : C.gray }}>
              {filtros[f.key] ? '✓ ' : ''}{f.label}
            </button>
          ); })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: C.gray, display: 'block', marginBottom: 2 }}>Fecha desde</label>
            <input type="date" style={inputStyle} value={fechaDesde} onChange={function(e) { setFechaDesde(e.target.value); }} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: C.gray, display: 'block', marginBottom: 2 }}>Fecha hasta</label>
            <input type="date" style={inputStyle} value={fechaHasta} onChange={function(e) { setFechaHasta(e.target.value); }} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: C.gray, display: 'block', marginBottom: 2 }}>Delito</label>
            <select style={{ ...selectStyle, width: '100%' }} value={filtroDelito} onChange={function(e) { setFiltroDelito(e.target.value); }}>
              <option value="">— Todos —</option>
              {delitosUnicos.map(function(d) { return <option key={d} value={d}>{d}</option>; })}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: C.gray, display: 'block', marginBottom: 2 }}>Municipio</label>
            <select style={{ ...selectStyle, width: '100%' }} value={filtroMunicipio} onChange={function(e) { setFiltroMunicipio(e.target.value); }}>
              <option value="">— Todos —</option>
              {municipiosUnicos.map(function(m) { return <option key={m} value={m}>{m}</option>; })}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ background: C.white, borderRadius: 12, padding: 60, textAlign: 'center', color: C.gray, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <RefreshCw size={28} color={C.gray} /><p style={{ marginTop: 10, fontSize: 14 }}>Cargando datos geográficos...</p>
        </div>
      ) : !leafletReady ? (
        <div style={{ background: C.white, borderRadius: 12, padding: 60, textAlign: 'center', color: C.gray, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <MapPin size={28} color={C.gray} /><p style={{ marginTop: 10, fontSize: 14 }}>Cargando mapa...</p>
        </div>
      ) : (
        <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid ' + C.lightGray }}>
          <div ref={mapRef} style={{ width: '100%', height: 500 }} />
        </div>
      )}

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: C.gray }}>
        <span style={{ fontWeight: 600 }}>Intensidad:</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#2196f3', display: 'inline-block' }} /> Baja</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#4caf50', display: 'inline-block' }} /> Media</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#ffeb3b', display: 'inline-block' }} /> Alta</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#ff9800', display: 'inline-block' }} /> Muy alta</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#f44336', display: 'inline-block' }} /> Crítica</span>
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={function() { setShowAnalisis(!showAnalisis); }} style={{ background: C.lightGold, border: '1px solid #b6905440', borderRadius: 10, padding: '12px 18px', width: '100%', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.darkBlue, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={16} color={C.gold} /> Panel de Análisis — Inteligencia Basada en Evidencia
          </span>
          {showAnalisis ? <ChevronUp size={16} color={C.gold} /> : <ChevronDown size={16} color={C.gold} />}
        </button>

        {showAnalisis && (
          <div style={{ background: C.white, borderRadius: '0 0 10px 10px', border: '1px solid #b6905440', borderTop: 'none', padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.darkBlue, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} color={C.gold} /> Incidencia por Municipio (Top 10)
                </div>
                {topMunicipios.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.gray, textAlign: 'center', padding: 20 }}>Sin datos</div>
                ) : (
                  topMunicipios.map(function(item, i) { var muni = item[0]; var count = item[1]; return (
                    <div key={muni} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.gray, minWidth: 18, textAlign: 'right' }}>#{i + 1}</span>
                      <div style={{ flex: 1, position: 'relative', height: 24, backgroundColor: C.bg, borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: (count / maxMuni * 100) + '%', backgroundColor: i === 0 ? C.red : i < 3 ? C.orange : '#b6905480', borderRadius: 6 }} />
                        <span style={{ position: 'relative', zIndex: 1, fontSize: 11, fontWeight: 600, color: C.darkBlue, padding: '0 8px', lineHeight: '24px' }}>{muni}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.darkBlue, minWidth: 28, textAlign: 'right' }}>{count}</span>
                    </div>
                  ); })
                )}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.darkBlue, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BarChart3 size={14} color={C.red} /> Incidencia por Tipo de Delito (Top 10)
                </div>
                {topDelitos.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.gray, textAlign: 'center', padding: 20 }}>Sin datos</div>
                ) : (
                  topDelitos.map(function(item, i) { var delito = item[0]; var count = item[1]; return (
                    <div key={delito} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.gray, minWidth: 18, textAlign: 'right' }}>#{i + 1}</span>
                      <div style={{ flex: 1, position: 'relative', height: 24, backgroundColor: C.bg, borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: (count / maxDelito * 100) + '%', backgroundColor: i === 0 ? '#b71c1c' : i < 3 ? C.red : '#fd7e1480', borderRadius: 6 }} />
                        <span style={{ position: 'relative', zIndex: 1, fontSize: 10, fontWeight: 600, color: C.darkBlue, padding: '0 8px', lineHeight: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '80%' }}>{delito}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.darkBlue, minWidth: 28, textAlign: 'right' }}>{count}</span>
                    </div>
                  ); })
                )}
              </div>
            </div>

            {puntosFiltrados.length > 0 && (
              <div style={{ marginTop: 16, padding: 14, backgroundColor: C.lightGold, borderRadius: 8, border: '1px solid #b6905440' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, textTransform: 'uppercase', marginBottom: 6 }}>Resumen de Inteligencia</div>
                <div style={{ fontSize: 13, color: C.darkBlue, lineHeight: 1.7 }}>
                  Se analizaron <strong>{puntosFiltrados.length}</strong> incidentes
                  {fechaDesde && fechaHasta ? ' entre ' + fechaDesde + ' y ' + fechaHasta : fechaDesde ? ' desde ' + fechaDesde : fechaHasta ? ' hasta ' + fechaHasta : ''}
                  {filtroMunicipio ? ' en ' + filtroMunicipio : ''}
                  {filtroDelito ? ' del tipo "' + filtroDelito + '"' : ''}.
                  {topMunicipios.length > 0 && <span> El municipio con mayor incidencia es <strong>{topMunicipios[0][0]}</strong> con {topMunicipios[0][1]} evento{topMunicipios[0][1] > 1 ? 's' : ''}.</span>}
                  {topDelitos.length > 0 && <span> El delito más frecuente es <strong>{topDelitos[0][0]}</strong> con {topDelitos[0][1]} registro{topDelitos[0][1] > 1 ? 's' : ''}.</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {stats.total === 0 && !loading && (
        <div style={{ marginTop: 14, padding: 14, background: '#fff3e0', borderRadius: 8, border: '1px solid #ff980030', fontSize: 12, color: '#e65100' }}>
          No hay coordenadas registradas aún. El mapa se poblará automáticamente conforme se capturen registros con coordenadas.
        </div>
      )}
    </div>
  );
}
