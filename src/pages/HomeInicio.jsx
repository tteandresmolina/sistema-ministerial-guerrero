// src/pages/HomeInicio.jsx
// Inicio ejecutivo: lo primero que ve cada persona al entrar.
//  · "Post-its": un número grande por idea, con su comparación (contra los 30 días previos y contra hace un año) y una mini línea.
//  · Casi sin texto: el resumen escrito queda plegado y se abre si se pide.
//  · Todo se calcula con los casos de SU alcance (lo limita la base de datos); nada sale del sistema ni se redacta con IA.
//  · Paleta cálida (marfil, guinda y dorado): el azul queda para el encabezado y el menú.
// No guarda nada: solo lee y navega.

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Target, ArrowRight, MapPin } from 'lucide-react';
import { haceCuanto } from './Campana';
import Entorno from './Entorno';
import { analizarCasos, construirResumen, construirAtencion, fechaLarga } from './resumenInicio';

// Marca de versión: aparece chica al final del Inicio para saber de un vistazo qué versión está publicada
const VERSION = 'Inicio 5 nov 2026 · culposos';

// "1 cada 19 h": el ritmo dicho en frecuencia, como lo dicen los observatorios.
// Vive aquí (y no se importa) para que el Inicio compile aunque resumenInicio.js todavía no se haya actualizado.
function frecuenciaTexto(porDia) {
  if (!porDia || porDia <= 0) return '—';
  if (porDia >= 1) { const h = Math.round(24 / porDia); return h <= 1 ? '1 por hora' : '1 cada ' + h + ' h'; }
  const d = Math.round(1 / porDia); return '1 cada ' + d + (d === 1 ? ' día' : ' días');
}

const P = { tinta: '#1f2937', gris: '#5a6478', guinda: '#8b1e1e', guindaSuave: '#8e4f54', oro: '#b6905a', oroTexto: '#7a5a22', marfil: '#f7f1e6', borde: '#e8e2d4', verde: '#4a6b3a', fondoItem: '#fbf9f4', numero: '#7b1e3a' };
const PIT = { oro: '#fbf3d9', guinda: '#f6e4e6', arena: '#f1ece0' };
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

// Mini línea de tendencia (sin ejes, base en cero para no exagerar): se lee en un vistazo
function Tendencia({ valores }) {
  if (!valores || valores.length < 2) return null;
  const W = 140, H = 34, p = 4;
  const max = Math.max.apply(null, valores.concat([1]));
  const x = (i) => p + i * (W - 2 * p) / (valores.length - 1);
  const y = (v) => H - p - (H - 2 * p) * (v / max);
  const ult = valores.length - 1;
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" height="34" role="img" aria-label="Tendencia de las últimas semanas" style={{ display: 'block', marginTop: 8 }}>
      <polyline points={valores.map((v, i) => x(i) + ',' + y(v)).join(' ')} fill="none" stroke={P.guindaSuave} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(ult)} cy={y(valores[ult])} r="3.6" fill={P.guindaSuave} />
    </svg>
  );
}

function PostIt({ titulo: t, fondo, children, ayuda }) {
  return (
    <div title={ayuda} style={{ background: fondo || PIT.oro, borderRadius: 12, padding: '12px 14px 14px', boxShadow: '0 2px 6px rgba(90,74,30,0.16)', borderTop: '5px solid ' + (fondo === PIT.guinda ? P.guinda : P.oro), minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.7, color: P.oroTexto, textTransform: 'uppercase', marginBottom: 4 }}>{t}</div>
      {children}
    </div>
  );
}
const NUM = { fontSize: 44, fontWeight: 800, color: P.numero, lineHeight: 1.05 };
const NUM_MEDIO = { fontSize: 32, fontWeight: 800, color: P.numero, lineHeight: 1.1 };
const SUB = { fontSize: 15, color: '#374151', marginTop: 2 };

function Cambio({ pct, texto }) {
  if (pct === null || pct === undefined) return null;
  const sube = pct > 0, igual = pct === 0;
  return <div style={{ fontSize: 14, fontWeight: 800, marginTop: 5, color: igual ? P.gris : sube ? P.guinda : P.verde }}>{igual ? '=' : sube ? '▲' : '▼'} {Math.abs(pct)}% {texto}</div>;
}

const tarjeta = { background: '#fff', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid ' + P.borde };
const h3 = { fontSize: 18, fontWeight: 800, color: P.tinta, margin: '0 0 10px' };

export default function HomeInicio({ perfil, grupos, onIr }) {
  const [casos, setCasos] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const [verTodas, setVerTodas] = useState(false);

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
  const maxZona = a && a.zonas.length ? a.zonas[0][1] : 1;
  const visiblesAtencion = verTodas ? atencion : atencion.slice(0, 4);

  return (
    <div>
      {/* Bienvenida: compacta */}
      <div style={{ background: P.marfil, border: '1px solid ' + P.borde, borderLeft: '6px solid ' + P.oro, borderRadius: 14, padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, color: P.oroTexto, textTransform: 'uppercase' }}>{CARGO_ETIQUETA[perfil?.cargo] || perfil?.cargo || perfil?.rol}</div>
          <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2, color: P.tinta, marginTop: 2 }}>{saludoDe(ahora.getHours())}, <span style={{ color: P.guinda }}>{primerNombre}</span></div>
          <div style={{ fontSize: 15, color: P.gris, marginTop: 2, textTransform: 'capitalize' }}>{fechaHoy}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {alcanceDe(perfil) && <span style={{ fontSize: 14, fontWeight: 700, color: P.oroTexto, border: '1px solid ' + P.oro, borderRadius: 14, padding: '3px 12px', background: '#fff' }}>{alcanceDe(perfil)}</span>}
          {hayDatos && <span style={{ fontSize: 14, fontWeight: 700, color: P.tinta, border: '1px solid ' + P.borde, borderRadius: 14, padding: '3px 12px', background: '#fff' }}>Datos al {fechaLarga(a.ultima)}</span>}
        </div>
      </div>

      {/* Post-its */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginTop: 14 }}>
        {hayDatos && (
          <>
            <PostIt titulo="Últimos 30 días" fondo={PIT.oro}>
              <div style={NUM}>{a.n30}</div>
              <div style={SUB}>homicidios</div>
              <Cambio pct={a.cambioPct} texto="vs 30 días previos" />
              {a.cambioAnioPct != null && <Cambio pct={a.cambioAnioPct} texto={'vs hace un año (' + a.nAnio + ')'} />}
              <Tendencia valores={a.semanas.map((s) => s.n)} />
            </PostIt>
            <PostIt titulo="Ritmo" fondo={PIT.guinda}>
              <div style={NUM_MEDIO}>{frecuenciaTexto(a.n30 / 30)}</div>
              <div style={SUB}>homicidio</div>
              {a.nPrev > 0 && <div style={{ fontSize: 14, color: P.gris, marginTop: 5 }}>antes: {frecuenciaTexto(a.nPrev / 30)}</div>}
            </PostIt>
            <PostIt titulo="Mayor concentración" fondo={PIT.arena}>
              <div style={{ ...NUM_MEDIO, fontSize: 26, wordBreak: 'break-word' }}>{a.topZona ? a.topZona.zona : '—'}</div>
              {a.topZona && <div style={SUB}>{a.topZona.n} casos · {a.topZona.pct}%</div>}
              <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
                {a.zonas.slice(0, 3).map((z) => (
                  <div key={z[0]} aria-hidden="true" style={{ height: 7, borderRadius: 4, background: '#00000010' }}><div style={{ height: 7, borderRadius: 4, width: Math.round(z[1] / maxZona * 100) + '%', background: P.guindaSuave }} /></div>
                ))}
              </div>
            </PostIt>
            {a.hallazgosTotal > 0 && (
              <PostIt titulo="Hallazgos en fosas" fondo={PIT.guinda} ayuda="Cada hallazgo es una carpeta de investigación. Es un dato que conjuga a varias áreas para su localización: búsqueda de personas, periciales y Ministerio Público.">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={26} color={P.guinda} aria-hidden="true" /><div style={NUM}>{a.hallazgos30}</div></div>
                <div style={SUB}>en 30 días</div>
                <div style={{ fontSize: 14, color: P.gris, marginTop: 5 }}>{a.hallazgosTotal} en total · último {fechaLarga(a.ultimoHallazgo)}</div>
              </PostIt>
            )}
            {a.pendientesNecropsia > 0 && (
              <PostIt titulo="En espera de necropsia" fondo={PIT.arena} ayuda="Muertes no constitutivas de delito: no cuentan como homicidio doloso hasta que el Ministerio Público las reclasifique.">
                <div style={NUM}>{a.pendientes30 || 0}</div>
                <div style={SUB}>en 30 días</div>
                <div style={{ fontSize: 14, color: P.gris, marginTop: 5 }}>{a.pendientesNecropsia} en total{a.pendientesViejos > 0 ? ' · ' + a.pendientesViejos + ' con más de 30 días' : ''}</div>
              </PostIt>
            )}
            {(a.culposos || 0) > 0 && (
              <PostIt titulo="Homicidios culposos" fondo={PIT.arena} ayuda="Se llevan aparte: no cuentan como homicidio doloso.">
                <div style={NUM}>{a.culposos30 || 0}</div>
                <div style={SUB}>en 30 días</div>
                <div style={{ fontSize: 14, color: P.gris, marginTop: 5 }}>{a.culposos} en total</div>
              </PostIt>
            )}
            <PostIt titulo="En el mapa" fondo={PIT.oro}>
              <div style={NUM}>{a.pctUbicados}%</div>
              <div style={SUB}>ubicados</div>
              {a.sinUbicar > 0 && <div style={{ fontSize: 14, fontWeight: 700, color: P.oroTexto, marginTop: 5 }}>{a.sinUbicar} sin ubicar</div>}
            </PostIt>
          </>
        )}
        <PostIt titulo="Avisos" fondo={PIT.arena}>
          <div style={NUM}>{sinLeer}</div>
          <div style={SUB}>sin leer</div>
          <div style={{ fontSize: 14, color: P.gris, marginTop: 5 }}>en tu campana</div>
        </PostIt>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginTop: 16, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={tarjeta}>
            <h3 style={h3}>Requiere tu atención</h3>
            {casos === null ? <div style={{ fontSize: 16, color: P.gris }}>Revisando…</div> : visiblesAtencion.map((it, i) => (
              <div key={i} title={it.detalle} style={{ display: 'flex', alignItems: 'center', gap: 10, background: P.fondoItem, border: '1px solid ' + P.borde, borderLeft: '5px solid ' + COLOR_NIVEL[it.nivel], borderRadius: 10, padding: '8px 12px', marginTop: i ? 8 : 0, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: P.tinta }}>{it.titulo}</div>
                  {it.nivel === 'alta' && <div style={{ fontSize: 14, color: P.gris, marginTop: 1 }}>{it.detalle}</div>}
                </div>
                {it.accion && (
                  <button onClick={() => ir(it.accion.seccion, it.accion.tab)} style={{ background: 'none', border: '1.5px solid ' + P.guinda, borderRadius: 8, padding: '6px 11px', color: P.guinda, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40 }}>
                    {it.accion.texto} <ArrowRight size={16} />
                  </button>
                )}
              </div>
            ))}
            {casos !== null && atencion.length > 4 && (
              <button onClick={() => setVerTodas(!verTodas)} style={{ marginTop: 10, background: 'none', border: 'none', color: P.guinda, fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: 36 }}>{verTodas ? 'Ver menos ▲' : 'Ver ' + (atencion.length - 4) + ' más ▼'}</button>
            )}
          </div>

          <details style={{ ...tarjeta, padding: '12px 18px' }}>
            <summary style={{ fontSize: 16, fontWeight: 800, color: P.tinta, cursor: 'pointer', minHeight: 32 }}>Resumen escrito del día</summary>
            <div style={{ marginTop: 10 }}>
              {casos === null ? <div style={{ fontSize: 16, color: P.gris }}>Preparando el resumen…</div> : resumen.map((frase, i) => (
                <p key={i} style={{ fontSize: 16, lineHeight: 1.55, color: P.tinta, margin: '0 0 8px' }}>
                  {frase.map((s, j) => (s.b ? <strong key={j}>{s.t}</strong> : <span key={j}>{s.t}</span>))}
                </p>
              ))}
            </div>
          </details>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {tieneSara && (
            <div style={{ ...tarjeta, borderLeft: '6px solid ' + P.guinda }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 46, height: 46, borderRadius: 12, background: P.marfil, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Target size={26} color={P.guinda} /></span>
                <div style={{ fontSize: 20, fontWeight: 800, color: P.tinta }}>Análisis Criminal</div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <button onClick={() => ir('sara', 'mapa')} style={{ background: P.guinda, border: '2px solid ' + P.guinda, borderRadius: 8, padding: '9px 18px', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44 }}><MapPin size={18} /> Abrir el mapa</button>
                <button onClick={() => ir('sara', 'panel')} style={{ background: '#fff', border: '2px solid ' + P.guinda, borderRadius: 8, padding: '9px 18px', color: P.guinda, fontSize: 16, fontWeight: 700, cursor: 'pointer', minHeight: 44 }}>Panel de análisis</button>
              </div>
            </div>
          )}

          <Entorno perfil={perfil} />

          {avisos.length > 0 && (
            <div style={tarjeta}>
              <h3 style={h3}>Últimos avisos</h3>
              {avisos.slice(0, 2).map((x) => (
                <div key={x.id} style={{ padding: '7px 0', borderTop: '1px solid ' + P.borde, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: x.leida ? 600 : 800, color: P.tinta }}>{x.titulo}</span>
                  <span style={{ fontSize: 13, color: P.gris, whiteSpace: 'nowrap' }}>{haceCuanto(x.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 14, textAlign: 'right', fontSize: 12, color: '#9a9484' }}>{VERSION}</div>
    </div>
  );
}
