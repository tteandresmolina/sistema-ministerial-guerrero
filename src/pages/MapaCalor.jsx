// src/pages/MapaCalor.jsx
// Mapa de Calor — Leaflet.js + leaflet-heat
// Jala coordenadas de registros_911, escenas_crimen, detenidos, oficios_investigacion
// Visualiza zonas calientes de incidencia criminal en Guerrero

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { RefreshCw, MapPin, Filter, X, Eye } from 'lucide-react';

const C = {
  darkBlue: '#001a4d', gold: '#b69054', lightGold: '#f5ede0',
  white: '#ffffff', bg: '#f4f6fb', gray: '#666666', lightGray: '#e8ecf1',
  green: '#28a745', red: '#dc3545', orange: '#fd7e14',
};

const FUENTES = [
  { key: 'registros_911', label: 'Reportes 911', color: '#dc3545', lat: 'coordenadas_lat', lng: 'coordenadas_lng' },
  { key: 'escenas_crimen', label: 'Procesamiento del Lugar', color: '#fd7e14', lat: 'coordenadas_lat', lng: 'coordenadas_lng' },
  { key: 'detenidos', label: 'Detenidos', color: '#001a4d', lat: 'latitud', lng: 'longitud' },
  { key: 'oficios_investigacion', label: 'Oficios de Investigación', color: '#b69054', lat: 'coordenadas_lat', lng: 'coordenadas_lng' },
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

function loadCSS(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = href;
  document.head.appendChild(l);
}

export default function MapaCalor() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const heatLayer = useRef(null);
  const [puntos, setPuntos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ registros_911: true, escenas_crimen: true, detenidos: true, oficios_investigacion: true });
  const [stats, setStats] = useState({ total: 0, por_fuente: {} });
  const [leafletReady, setLeafletReady] = useState(false);

  // Cargar Leaflet dinámicamente
  useEffect(() => {
    loadCSS('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css');
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js')
      .then(() => loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js'))
      .then(() => setLeafletReady(true))
      .catch(e => console.error('Error cargando Leaflet:', e));
  }, []);

  // Cargar datos
  const cargarDatos = async () => {
    setLoading(true);
    const todos = [];
    const porFuente = {};

    for (const f of FUENTES) {
      const { data } = await supabase.from(f.key).select(`${f.lat}, ${f.lng}`).not(f.lat, 'is', null).not(f.lng, 'is', null);
      const coords = (data || []).map(r => ({
        lat: parseFloat(r[f.lat]),
        lng: parseFloat(r[f.lng]),
        fuente: f.key,
      })).filter(p => !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0 && p.lng !== 0);
      porFuente[f.key] = coords.length;
      todos.push(...coords);
    }

    setPuntos(todos);
    setStats({ total: todos.length, por_fuente: porFuente });
    setLoading(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  // Inicializar y actualizar mapa
  useEffect(() => {
    if (!leafletReady || !mapRef.current || !window.L) return;

    if (!mapInstance.current) {
      mapInstance.current = window.L.map(mapRef.current, {
        center: [17.4, -99.5],
        zoom: 8,
        scrollWheelZoom: true,
      });
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
      }).addTo(mapInstance.current);
    }

    // Filtrar puntos activos
    const activos = puntos.filter(p => filtros[p.fuente]);
    const heatData = activos.map(p => [p.lat, p.lng, 1]);

    if (heatLayer.current) {
      mapInstance.current.removeLayer(heatLayer.current);
    }

   if (heatData.length > 0 && window.L.heatLayer) {
      heatLayer.current = window.L.heatLayer(heatData, {
        radius: 35,
        blur: 25,
        maxZoom: 16,
        max: 0.6,
        minOpacity: 0.4,
        gradient: { 0.2: '#2196f3', 0.4: '#4caf50', 0.6: '#ffeb3b', 0.8: '#ff9800', 1.0: '#f44336' },
      }).addTo(mapInstance.current);
    }
    const coloresFuente = { registros_911: '#dc3545', escenas_crimen: '#fd7e14', detenidos: '#001a4d', oficios_investigacion: '#b69054' };
    activos.forEach(p => {
      window.L.circleMarker([p.lat, p.lng], {
        radius: 8, fillColor: coloresFuente[p.fuente] || '#001a4d', color: '#ffffff',
        weight: 2, opacity: 1, fillOpacity: 0.85,
      }).addTo(mapInstance.current).bindPopup(
        '<b style="color:#001a4d">' + FUENTES.find(f => f.key === p.fuente)?.label + '</b><br>Lat: ' + p.lat.toFixed(5) + '<br>Lng: ' + p.lng.toFixed(5)
      );
    });

    // Auto-centrar si hay puntos
    if (activos.length > 0) {
      const bounds = window.L.latLngBounds(activos.map(p => [p.lat, p.lng]));
      mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [leafletReady, puntos, filtros]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={18} color={C.gold} />
          <span style={{ fontWeight: 700, fontSize: 16, color: C.darkBlue }}>Mapa de Calor — Incidencia Criminal</span>
        </div>
        <button onClick={cargarDatos} style={{ background: 'none', border: `1.5px solid ${C.darkBlue}`, borderRadius: 7, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: C.darkBlue, fontSize: 12, fontWeight: 600 }}>
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
        <div style={{ background: C.white, borderRadius: 10, padding: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.darkBlue }}>{stats.total}</div>
          <div style={{ fontSize: 11, color: C.gray }}>Puntos totales</div>
        </div>
        {FUENTES.map(f => (
          <div key={f.key} style={{ background: C.white, borderRadius: 10, padding: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: f.color }}>{stats.por_fuente[f.key] || 0}</div>
            <div style={{ fontSize: 11, color: C.gray }}>{f.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={14} color={C.gray} />
        <span style={{ fontSize: 12, fontWeight: 600, color: C.gray }}>Capas:</span>
        {FUENTES.map(f => (
          <button key={f.key} onClick={() => setFiltros(p => ({ ...p, [f.key]: !p[f.key] }))}
            style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              border: `1.5px solid ${filtros[f.key] ? f.color : C.lightGray}`,
              background: filtros[f.key] ? f.color + '15' : C.white,
              color: filtros[f.key] ? f.color : C.gray,
            }}>
            {filtros[f.key] ? '✓ ' : ''}{f.label}
          </button>
        ))}
      </div>

      {/* Mapa */}
      {loading ? (
        <div style={{ background: C.white, borderRadius: 12, padding: 60, textAlign: 'center', color: C.gray, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <RefreshCw size={28} color={C.gray} />
          <p style={{ marginTop: 10, fontSize: 14 }}>Cargando datos geográficos...</p>
        </div>
      ) : !leafletReady ? (
        <div style={{ background: C.white, borderRadius: 12, padding: 60, textAlign: 'center', color: C.gray, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <MapPin size={28} color={C.gray} />
          <p style={{ marginTop: 10, fontSize: 14 }}>Cargando mapa...</p>
        </div>
      ) : (
        <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: `1px solid ${C.lightGray}` }}>
          <div ref={mapRef} style={{ width: '100%', height: 500 }} />
        </div>
      )}

      {/* Leyenda */}
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: C.gray }}>
        <span style={{ fontWeight: 600 }}>Intensidad:</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#2196f3', display: 'inline-block' }} /> Baja</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#4caf50', display: 'inline-block' }} /> Media</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#ffeb3b', display: 'inline-block' }} /> Alta</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#ff9800', display: 'inline-block' }} /> Muy alta</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#f44336', display: 'inline-block' }} /> Crítica</span>
      </div>

      {stats.total === 0 && !loading && (
        <div style={{ marginTop: 14, padding: 14, background: '#fff3e0', borderRadius: 8, border: '1px solid #ff980030', fontSize: 12, color: '#e65100' }}>
          No hay coordenadas registradas aún. El mapa se poblará automáticamente conforme se capturen registros 911, escenas, detenidos y oficios con coordenadas.
        </div>
      )}
    </div>
  );
}
