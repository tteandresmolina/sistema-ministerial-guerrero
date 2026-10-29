// src/pages/HomeInicio.jsx
// Pantalla de inicio: lo primero que ve cada persona al entrar.
//  · Saludo con su cargo, su alcance y la fecha.
//  · Cifras de la estadística de homicidios dentro de SU alcance (lo limita la base de datos; si no hay, no se muestran).
//  · Acceso directo a los módulos que su rol puede usar, con Análisis Criminal destacado.
//  · Sus últimos avisos.
// No guarda nada: solo lee y navega.

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Target, TrendingUp, CalendarDays, Bell, ArrowRight, FileText } from 'lucide-react';
import { TarjetaResumen } from './PantallaMapa';
import { ICONOS } from './MenuLateral';
import { haceCuanto } from './Campana';

const C = { navy: '#001a4d', navySoft: '#0a2a63', gold: '#b69054', goldClaro: '#d9bd85', guinda: '#8b1e1e', gray: '#5a6478' };
const CARGO_ETIQUETA = { agente: 'Agente', coordinador_grupo: 'Coordinador de Grupo', coordinador: 'Coordinador de Zona', regional: 'Coordinador Regional', mando: 'Director General', subcoord_admin: 'Subcoordinación Administrativa' };

const DESCRIPCION = {
  sara: 'Mapa de homicidios, zonas de atención y panel de análisis',
  oficialia: 'Documentos y oficios asignados',
  dashoperativo: 'Indicadores operativos',
  detenidos: 'Registro e individualización de detenidos',
  registro911: 'Reportes ciudadanos',
  primerrespondiente: 'Informe policial homologado',
  victimastestigos: 'Víctimas y testigos',
  expediente: 'Expediente policial',
  ordenes: 'Órdenes de aprehensión',
  vehiculos: 'Vehículos con reporte de robo',
  dashboard: 'Tablero para mandos',
  historico: 'Histórico',
  bodega: 'Bodega de indicios',
  busqueda: 'Búsqueda de detenidos',
  escenacrimen: 'Procesamiento del lugar',
  indicios: 'Indicios y evidencias',
  redcriminal: 'Red estatal de contactos',
  subcoord_admin: 'Altas, bajas y directorio de personal',
};
const ORDEN = ['oficialia', 'dashoperativo', 'detenidos', 'registro911', 'primerrespondiente', 'victimastestigos', 'expediente', 'ordenes', 'vehiculos', 'dashboard', 'historico', 'bodega', 'busqueda', 'redcriminal', 'subcoord_admin'];

export function saludoDe(hora) { return hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'; }
const titulo = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');
const fechaCorta = (iso) => { const m = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']; const p = String(iso).slice(0, 10).split('-'); return Number(p[2]) + ' de ' + m[Number(p[1]) - 1]; };

function alcanceDe(perfil) {
  if (!perfil) return '';
  if (perfil.rol === 'mando') return 'Todas las regiones';
  if (perfil.rol === 'regional') return 'Toda ' + (perfil.region || 'tu región');
  if (perfil.zona) return 'Tu coordinación de zona: ' + perfil.zona;
  return perfil.region || '';
}

export default function HomeInicio({ perfil, grupos, onIr }) {
  const [stats, setStats] = useState(null);
  const [avisos, setAvisos] = useState([]);

  useEffect(() => {
    let vivo = true;
    supabase.from('incidencia_regional').select('fecha').order('fecha', { ascending: false }).limit(1500).then(({ data, error }) => {
      if (!vivo || error || !data) return;
      const DIA = 86400000, hoy = Date.now();
      let n30 = 0, nPrev = 0, ultima = '';
      data.forEach((r) => {
        if (!r.fecha) return;
        const f = String(r.fecha).slice(0, 10);
        if (!ultima) ultima = f;
        const d = (hoy - Date.parse(f)) / DIA;
        if (d >= 0 && d < 30) n30++; else if (d >= 30 && d < 60) nPrev++;
      });
      setStats({ total: data.length, n30, nPrev, ultima });
    }).catch(() => {});
    supabase.from('notificaciones').select('*').order('created_at', { ascending: false }).limit(3).then(({ data, error }) => { if (vivo && !error && data) setAvisos(data); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  const disponibles = {};
  (grupos || []).forEach((g) => g.items.forEach((it) => { disponibles[it.id] = it.label; }));
  const tiles = ORDEN.filter((id) => disponibles[id]);
  const sinLeer = avisos.filter((a) => !a.leida).length;
  const ahora = new Date();
  const primerNombre = titulo(String(perfil?.nombre_completo || '').trim().split(/\s+/)[0]);
  const fechaHoy = ahora.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const cambio = stats && stats.nPrev > 0 ? Math.round((stats.n30 / stats.nPrev - 1) * 100) : null;
  const tarjetas = [];
  if (stats && stats.total > 0) {
    tarjetas.push({ icono: Target, color: C.guinda, valor: stats.n30, etiqueta: 'Homicidios en los últimos 30 días' });
    tarjetas.push({ icono: TrendingUp, color: C.gold, valor: cambio === null ? '—' : (cambio >= 0 ? '▲ ' : '▼ ') + Math.abs(cambio) + '%', etiqueta: 'Frente a los 30 días anteriores' });
    tarjetas.push({ icono: CalendarDays, color: C.navy, valor: fechaCorta(stats.ultima), etiqueta: 'Último caso registrado' });
  }
  tarjetas.push({ icono: Bell, color: C.gold, valor: sinLeer, etiqueta: 'Avisos sin leer' });

  return (
    <div>
      {/* Bienvenida */}
      <div style={{ background: 'linear-gradient(90deg, ' + C.navy + ', ' + C.navySoft + ')', borderBottom: '3px solid ' + C.gold, borderRadius: 14, padding: '24px 28px', color: '#fff' }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1.5, color: C.goldClaro, textTransform: 'uppercase' }}>{CARGO_ETIQUETA[perfil?.cargo] || perfil?.cargo || perfil?.rol}</div>
        <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, marginTop: 4 }}>{saludoDe(ahora.getHours())}, {primerNombre}</div>
        <div style={{ fontSize: 17, color: '#dce6f5', marginTop: 6, textTransform: 'capitalize' }}>{fechaHoy}</div>
        {alcanceDe(perfil) && (
          <div style={{ display: 'inline-block', marginTop: 12, fontSize: 15, fontWeight: 600, color: C.goldClaro, border: '1px solid rgba(217,189,133,0.55)', borderRadius: 6, padding: '3px 12px' }}>{alcanceDe(perfil)}</div>
        )}
      </div>

      {/* Cifras */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 18 }}>
        {tarjetas.map((t) => <TarjetaResumen key={t.etiqueta} icono={t.icono} color={t.color} valor={t.valor} etiqueta={t.etiqueta} />)}
      </div>

      {/* Análisis Criminal, destacado */}
      {disponibles.sara && (
        <button onClick={() => onIr('sara')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, width: '100%', textAlign: 'left', marginTop: 18, background: 'linear-gradient(90deg, ' + C.navy + ', ' + C.navySoft + ')', border: '2px solid ' + C.gold, borderRadius: 14, padding: '22px 26px', cursor: 'pointer', color: '#fff' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 58, height: 58, borderRadius: 12, background: 'rgba(217,189,133,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Target size={32} color={C.goldClaro} /></span>
            <span>
              <span style={{ display: 'block', fontSize: 24, fontWeight: 800 }}>Análisis Criminal</span>
              <span style={{ display: 'block', fontSize: 16, color: '#dce6f5', marginTop: 2 }}>{DESCRIPCION.sara}</span>
            </span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 700, color: C.goldClaro, flexShrink: 0 }}>Abrir <ArrowRight size={22} /></span>
        </button>
      )}

      {/* Accesos */}
      {tiles.length > 0 && (
        <>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.navy, margin: '26px 0 10px' }}>Ir a</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {tiles.map((id) => {
              const Icono = ICONOS[id] || FileText;
              return (
                <button key={id} onClick={() => onIr(id)} style={{ textAlign: 'left', background: '#fff', border: '1px solid #e8ecf1', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <span style={{ width: 46, height: 46, borderRadius: 10, background: C.gold + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icono size={24} color={C.gold} /></span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 18, fontWeight: 800, color: C.navy }}>{disponibles[id]}</span>
                    <span style={{ display: 'block', fontSize: 15, color: C.gray, marginTop: 1 }}>{DESCRIPCION[id]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Últimos avisos */}
      {avisos.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginTop: 22, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: C.navy, marginBottom: 8 }}>Tus últimos avisos</div>
          {avisos.map((a) => (
            <div key={a.id} style={{ padding: '8px 0', borderTop: '1px solid #eef1f6' }}>
              <div style={{ fontSize: 16, fontWeight: a.leida ? 600 : 800, color: C.navy }}>{a.titulo}</div>
              {a.mensaje && <div style={{ fontSize: 15, color: '#374151' }}>{a.mensaje}</div>}
              <div style={{ fontSize: 13, color: C.gray }}>{haceCuanto(a.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
