// src/pages/HomeInicio.jsx
// Inicio ejecutivo: lo primero que ve cada persona al entrar.
//  · Cifras con tendencia, un resumen del día en lenguaje natural y los asuntos que requieren atención.
//  · Todo se calcula con los casos de SU alcance (lo limita la base de datos); nada sale del sistema ni se redacta con IA.
//  · Paleta cálida (marfil, guinda y dorado): el azul queda para el encabezado y el menú.
// No guarda nada: solo lee y navega.

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Target, ArrowRight } from 'lucide-react';
import { haceCuanto } from './Campana';
import { analizarCasos, construirResumen, construirAtencion, fechaLarga } from './resumenInicio';

const P = { tinta: '#1f2937', gris: '#5a6478', guinda: '#8b1e1e', guindaSuave: '#9a5a5e', oro: '#b6905a', oroTexto: '#7a5a22', marfil: '#f7f1e6', borde: '#e8e2d4', verde: '#4a6b3a', fondoItem: '#fbf9f4' };
const CARGO_ETIQUETA = { agente: 'Agente', coordinador_grupo: 'Coordinador de Grupo', coordinador: 'Coordinador de Zona', regional: 'Coordinador Regional', mando: 'Director General', subcoord_admin: 'Subcoordinación Administrativa' };
const COLOR_NIVEL = { alta: P.guinda, media: P.oro, info: '#c9c2b2', ok: P.verde };

export function saludoDe(hora) { return hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'; }
const titulo = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');

function alcanceDe(perfil) {
  if (!perfil) return '';
  if (perfil.rol === 'mando') return 'Todas las regiones';
  if (perfil.rol === 'regional') return 'Toda ' + (perfil.region || 'tu región');
  if (perfil.zona) return 'Tu coordinación de zona: ' + perfil.zona;
  return perfil.region || '';
}

// Línea de tendencia mínima (sin ejes: se lee en un vistazo)
function Tendencia({ valores, color }) {
  if (!valores || valores.length < 2) return null;
  const max = Math.max.apply(null, valores.concat([1]));
  const pts = valores.map((v, i) => (2 + i * (116 / (valores.length - 1))).toFixed(1) + ',' + (26 - (v / max) * 22).toFixed(1)).join(' ');
  return (
    <svg viewBox="0 0 120 28" width="100%" height="30" aria-hidden="true" style={{ display: 'block', marginTop: 8 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Cifra({ etiqueta, valor, detalle, colorDetalle, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid ' + P.borde }}>
      <div style={{ fontSize: 14, color: P.gris, fontWeight: 600 }}>{etiqueta}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: P.tinta, lineHeight: 1.15, marginTop: 2, wordBreak: 'break-word' }}>{valor}</div>
      {detalle && <div style={{ fontSize: 14, color: colorDetalle || P.gris, marginTop: 2, fontWeight: colorDetalle ? 700 : 400 }}>{detalle}</div>}
      {children}
    </div>
  );
}

const tarjeta = { background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid ' + P.borde };
const h3 = { fontSize: 19, fontWeight: 800, color: P.tinta, margin: '0 0 10px' };

export default function HomeInicio({ perfil, grupos, onIr }) {
  const [casos, setCasos] = useState(null);
  const [avisos, setAvisos] = useState([]);

  useEffect(() => {
    let vivo = true;
    const cols = 'fecha, zona, delito, coordenadas_lat, ubicacion_confirmada';
    (async () => {
      let { data, error } = await supabase.from('incidencia_regional').select(cols + ', hora_conocimiento').order('fecha', { ascending: false }).limit(2000);
      if (error) ({ data, error } = await supabase.from('incidencia_regional').select(cols).order('fecha', { ascending: false }).limit(2000));
      if (vivo) setCasos(error || !data ? [] : data);
    })().catch(() => { if (vivo) setCasos([]); });
    supabase.from('notificaciones').select('*').order('created_at', { ascending: false }).limit(3).then(({ data, error }) => { if (vivo && !error && data) setAvisos(data); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  const ahora = new Date();
  const a = casos ? analizarCasos(casos, ahora) : null;
  const sinLeer = avisos.filter((x) => !x.leida).length;
  const resumen = a ? construirResumen(a) : [];
  const atencion = a ? construirAtencion(a, { rol: perfil?.rol, hoy: ahora, avisosSinLeer: sinLeer }) : [];
  const tieneSara = (grupos || []).some((g) => g.items.some((it) => it.id === 'sara'));
  const primerNombre = titulo(String(perfil?.nombre_completo || '').trim().split(/\s+/)[0]);
  const fechaHoy = ahora.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hayDatos = a && a.total > 0;

  const ir = (seccion, tab) => { try { if (tab) sessionStorage.setItem('saraTab', tab); } catch (e) { /* sin almacenamiento */ } onIr(seccion); };

  const flecha = a && a.cambioPct !== null ? (a.cambioPct > 0 ? '▲ ' : a.cambioPct < 0 ? '▼ ' : '= ') : '';
  const maxZona = a && a.zonas.length ? a.zonas[0][1] : 1;

  return (
    <div>
      {/* Bienvenida */}
      <div style={{ background: P.marfil, border: '1px solid ' + P.borde, borderLeft: '6px solid ' + P.oro, borderRadius: 14, padding: '20px 26px', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.5, color: P.oroTexto, textTransform: 'uppercase' }}>{CARGO_ETIQUETA[perfil?.cargo] || perfil?.cargo || perfil?.rol}</div>
          <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, color: P.tinta, marginTop: 2 }}>{saludoDe(ahora.getHours())}, <span style={{ color: P.guinda }}>{primerNombre}</span></div>
          <div style={{ fontSize: 16, color: P.gris, marginTop: 4, textTransform: 'capitalize' }}>{fechaHoy}</div>
          {alcanceDe(perfil) && <div style={{ display: 'inline-block', marginTop: 10, fontSize: 14, fontWeight: 700, color: P.oroTexto, border: '1px solid ' + P.oro, borderRadius: 6, padding: '2px 12px' }}>{alcanceDe(perfil)}</div>}
        </div>
        {hayDatos && (
          <div style={{ textAlign: 'right', fontSize: 14, color: P.gris }}>
            Estadística al<br /><strong style={{ fontSize: 20, color: P.tinta }}>{fechaLarga(a.ultima)}</strong>
          </div>
        )}
      </div>

      {/* Cifras con tendencia */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginTop: 16 }}>
        {hayDatos && (
          <>
            <Cifra etiqueta="Homicidios · últimos 30 días" valor={a.n30}
              detalle={a.cambioPct === null ? 'Sin periodo previo para comparar' : flecha + Math.abs(a.cambioPct) + '% frente a los 30 días previos'}
              colorDetalle={a.cambioPct === null ? null : a.cambioPct > 0 ? P.guinda : a.cambioPct < 0 ? P.verde : P.gris}>
              <Tendencia valores={a.semanas.map((s) => s.n)} color={P.guindaSuave} />
            </Cifra>
            <Cifra etiqueta="Ritmo" valor={a.ritmo === null ? '—' : a.ritmo < 1 ? 'Más de 1 al día' : 'Uno cada ' + a.ritmo.toFixed(1) + ' días'}
              detalle={a.ritmoPrev ? 'Antes: uno cada ' + a.ritmoPrev.toFixed(1) + ' días' : null} />
            <Cifra etiqueta="Coordinación con más casos" valor={a.topZona ? a.topZona.zona : '—'} detalle={a.topZona ? a.topZona.n + ' casos · ' + a.topZona.pct + '%' : null}>
              <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
                {a.zonas.slice(0, 3).map((z) => (
                  <div key={z[0]} aria-hidden="true" style={{ height: 6, borderRadius: 3, background: '#efe9db' }}><div style={{ height: 6, borderRadius: 3, width: Math.round(z[1] / maxZona * 100) + '%', background: P.oro }} /></div>
                ))}
              </div>
            </Cifra>
            <Cifra etiqueta="Datos ubicados en el mapa" valor={a.pctUbicados + '%'} detalle={a.sinUbicar > 0 ? a.sinUbicar + ' sin ubicar' : 'Todos ubicados'}>
              <div aria-hidden="true" style={{ height: 6, borderRadius: 3, background: '#efe9db', marginTop: 10 }}><div style={{ height: 6, borderRadius: 3, width: a.pctUbicados + '%', background: P.oro }} /></div>
            </Cifra>
          </>
        )}
        <Cifra etiqueta="Avisos sin leer" valor={sinLeer} detalle="En tu campana, arriba a la derecha" />
      </div>

      {/* Resumen, atención y Análisis Criminal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginTop: 16, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={tarjeta}>
            <h3 style={h3}>Resumen del día</h3>
            {casos === null ? <div style={{ fontSize: 16, color: P.gris }}>Preparando el resumen…</div> : resumen.map((frase, i) => (
              <p key={i} style={{ fontSize: 17, lineHeight: 1.6, color: P.tinta, margin: '0 0 8px' }}>
                {frase.map((s, j) => (s.b ? <strong key={j}>{s.t}</strong> : <span key={j}>{s.t}</span>))}
              </p>
            ))}
          </div>

          <div style={tarjeta}>
            <h3 style={h3}>Requiere tu atención</h3>
            {casos === null ? <div style={{ fontSize: 16, color: P.gris }}>Revisando…</div> : atencion.map((it, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: P.fondoItem, border: '1px solid ' + P.borde, borderLeft: '5px solid ' + COLOR_NIVEL[it.nivel], borderRadius: 10, padding: '10px 14px', marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: P.tinta }}>{it.titulo}</div>
                  <div style={{ fontSize: 14, color: P.gris, marginTop: 1 }}>{it.detalle}</div>
                </div>
                {it.accion && (
                  <button onClick={() => ir(it.accion.seccion, it.accion.tab)} style={{ background: 'none', border: '1.5px solid ' + P.guinda, borderRadius: 8, padding: '7px 12px', color: P.guinda, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40 }}>
                    {it.accion.texto} <ArrowRight size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {tieneSara && (
            <div style={{ ...tarjeta, borderLeft: '6px solid ' + P.guinda }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ width: 52, height: 52, borderRadius: 12, background: P.marfil, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Target size={28} color={P.guinda} /></span>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: P.tinta }}>Análisis Criminal</div>
                  <div style={{ fontSize: 15, color: P.gris, marginTop: 1 }}>Mapa de homicidios, zonas de atención y panel de análisis</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                <button onClick={() => ir('sara', 'mapa')} style={{ background: P.guinda, border: '2px solid ' + P.guinda, borderRadius: 8, padding: '9px 18px', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44 }}>Abrir el mapa <ArrowRight size={18} /></button>
                <button onClick={() => ir('sara', 'panel')} style={{ background: '#fff', border: '2px solid ' + P.guinda, borderRadius: 8, padding: '9px 18px', color: P.guinda, fontSize: 16, fontWeight: 700, cursor: 'pointer', minHeight: 44 }}>Panel de análisis</button>
              </div>
            </div>
          )}

          {avisos.length > 0 && (
            <div style={tarjeta}>
              <h3 style={h3}>Tus últimos avisos</h3>
              {avisos.map((x) => (
                <div key={x.id} style={{ padding: '8px 0', borderTop: '1px solid ' + P.borde }}>
                  <div style={{ fontSize: 16, fontWeight: x.leida ? 600 : 800, color: P.tinta }}>{x.titulo}</div>
                  {x.mensaje && <div style={{ fontSize: 15, color: '#374151' }}>{x.mensaje}</div>}
                  <div style={{ fontSize: 13, color: P.gris }}>{haceCuanto(x.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
