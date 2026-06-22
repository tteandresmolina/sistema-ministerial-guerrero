// src/pages/DashboardHistorico.jsx
import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from 'recharts';
import {
  useDetenidosDashboard,
  ROL_LABELS,
} from '../hooks/useDetenidosDashboard';
import {
  BarChart3, Shield, MapPin, Clock, AlertTriangle, Globe,
  RefreshCw, Filter, Calendar, ChevronDown,
} from 'lucide-react';

// ─── Paleta del sistema ──────────────────────────────────────
const C = {
  azulOscuro:   '#001a4d',
  azulMedio:    '#002b80',
  azulClaro:    '#e8eef7',
  dorado:       '#b69054',
  doradoClaro:  '#f5edd8',
  blanco:       '#ffffff',
  fondo:        '#f0f2f5',
  borde:        '#d9dee5',
  textoFuerte:  '#1a1a2e',
  textoNormal:  '#4a5268',
  textoSuave:   '#8892a4',
  verde:        '#22c55e',
  verdeClaro:   '#e1f5ee',
  rojo:         '#ef4444',
  rojoClaro:    '#fde8e8',
  amarillo:     '#f59e0b',
  amarilloClaro:'#fef3c7',
  gris:         '#94a3b8',
  grisClaro:    '#f1f5f9',
};

const COLORES_REGION = ['#001a4d','#0369a1','#7c3aed','#b69054','#ea580c','#059669','#d97706','#6366f1'];

// ─── Componente principal ────────────────────────────────────
export default function DashboardHistorico() {
  const {
    tipoPeriodo, setTipoPeriodo,
    fechaRef, setFechaRef,
    rango,
    detenidos,
    perfil,
    esRolSuperior,
    metricas,
    getEstatus,
    loading,
    error,
    recargar,
  } = useDetenidosDashboard();

  // Datos para Pie de estatus
  const dataPie = useMemo(() => {
    return Object.entries(metricas.porEstatus).map(([clave, value]) => {
      const est = getEstatus(clave);
      return { name: est.nombre, value, color: est.color };
    });
  }, [metricas.porEstatus, getEstatus]);

  // Datos para barras de regiones
  const dataRegiones = useMemo(() => {
    return Object.entries(metricas.porRegion)
      .sort((a, b) => b[1] - a[1])
      .map(([name, cantidad]) => ({
        name,
        cantidad,
        esMia: perfil?.region === name,
      }));
  }, [metricas.porRegion, perfil]);

  return (
    <div style={{ minHeight: '100vh', background: C.fondo, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ─── Header ─────────────────────────────────────── */}
      <div style={{
        background: C.azulOscuro,
        padding: '20px 24px',
        borderRadius: '0 0 12px 12px',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BarChart3 size={22} color={C.dorado} strokeWidth={2} />
              <span style={{ color: C.blanco, fontSize: 18, fontWeight: 700, letterSpacing: 0.5 }}>
                Dashboard Histórico
              </span>
            </div>
            {perfil && (
              <div style={{ color: C.gris, fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Shield size={13} color={C.dorado} />
                <span style={{ color: C.doradoClaro }}>{perfil.nombre_completo}</span>
                <span style={{ color: C.gris }}>·</span>
                <span style={{ color: C.dorado, fontWeight: 600 }}>{ROL_LABELS[perfil.rol] || perfil.rol}</span>
                {!esRolSuperior && perfil.region && (
                  <>
                    <span style={{ color: C.gris }}>·</span>
                    <span style={{ color: C.blanco }}>{perfil.region}</span>
                    <span style={{
                      background: 'rgba(182,144,84,0.2)',
                      color: C.dorado,
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontWeight: 600,
                    }}>
                      Otras regiones: datos generales
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ─── Filtros ─────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Filter size={13} color={C.gris} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <select
                value={tipoPeriodo}
                onChange={(e) => setTipoPeriodo(e.target.value)}
                style={{
                  fontSize: 12, border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 8,
                  padding: '7px 12px 7px 30px', background: 'rgba(255,255,255,0.08)', color: C.blanco,
                  cursor: 'pointer', outline: 'none', appearance: 'none',
                }}
              >
                <option value="quincena1" style={{ color: '#000' }}>Quincena 1 (1–15)</option>
                <option value="quincena2" style={{ color: '#000' }}>Quincena 2 (16–fin)</option>
                <option value="mes" style={{ color: '#000' }}>Mes completo</option>
                <option value="anio" style={{ color: '#000' }}>Año completo</option>
              </select>
            </div>

            <div style={{ position: 'relative' }}>
              <Calendar size={13} color={C.gris} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              {tipoPeriodo !== 'anio' ? (
                <input
                  type="month"
                  value={fechaRef}
                  onChange={(e) => setFechaRef(e.target.value)}
                  style={{
                    fontSize: 12, border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 8,
                    padding: '7px 12px 7px 30px', background: 'rgba(255,255,255,0.08)', color: C.blanco,
                    outline: 'none',
                  }}
                />
              ) : (
                <input
                  type="number"
                  min="2020" max="2030"
                  value={fechaRef.split('-')[0]}
                  onChange={(e) => setFechaRef(`${e.target.value}-01`)}
                  style={{
                    fontSize: 12, border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 8,
                    padding: '7px 12px 7px 30px', background: 'rgba(255,255,255,0.08)', color: C.blanco,
                    width: 90, outline: 'none',
                  }}
                />
              )}
            </div>

            <button
              onClick={recargar}
              disabled={loading}
              style={{
                fontSize: 12, padding: '7px 16px', background: C.dorado, color: C.blanco,
                border: 'none', borderRadius: 8, cursor: loading ? 'wait' : 'pointer',
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s',
              }}
            >
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {loading ? 'Cargando…' : 'Actualizar'}
            </button>
          </div>
        </div>

        {/* Etiqueta del rango */}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <span style={{
            background: 'rgba(182,144,84,0.15)', color: C.dorado,
            fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
          }}>
            {rango.label}
          </span>
          {!esRolSuperior && (
            <span style={{
              background: 'rgba(255,255,255,0.08)', color: C.gris,
              fontSize: 11, padding: '4px 12px', borderRadius: 20,
            }}>
              Incluye historial de otras regiones
            </span>
          )}
        </div>
      </div>

      {/* ─── Contenido ──────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 40px' }}>

        {error && (
          <div style={{
            background: C.rojoClaro, border: `1px solid ${C.rojo}33`, color: C.rojo,
            padding: '12px 16px', borderRadius: 10, fontSize: 13, marginBottom: 16,
          }}>
            Error al cargar datos: {error}
          </div>
        )}

        {/* ─── Tarjetas resumen ───────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          <Tarjeta icono={<BarChart3 size={18} color={C.azulOscuro} />} titulo="Total periodo" valor={metricas.total} color={C.azulOscuro} bgIcon={C.azulClaro} />
          <Tarjeta icono={<MapPin size={18} color={C.dorado} />} titulo="Mi región" valor={metricas.totalMiRegion} color={C.dorado} bgIcon={C.doradoClaro} subtexto={perfil?.region} />
          <Tarjeta icono={<Globe size={18} color={C.azulMedio} />} titulo="Otras regiones" valor={metricas.totalOtraRegion} color={C.azulMedio} bgIcon={C.azulClaro} subtexto="Datos generales" />
          <Tarjeta icono={<Clock size={18} color={C.amarillo} />} titulo="Por vencer (12h)" valor={metricas.alertas.porVencer} color={C.amarillo} bgIcon={C.amarilloClaro} variante={metricas.alertas.porVencer > 0 ? 'alerta' : 'normal'} />
          <Tarjeta icono={<AlertTriangle size={18} color={C.rojo} />} titulo="48h vencidas" valor={metricas.alertas.vencidos} color={C.rojo} bgIcon={C.rojoClaro} variante={metricas.alertas.vencidos > 0 ? 'critico' : 'normal'} />
        </div>

        {/* ─── Gráficas principales ───────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 20 }}>
          {/* Tendencia temporal */}
          <Panel titulo="Detenciones por día" icono={<BarChart3 size={14} color={C.dorado} />}>
            {metricas.serieTemporal.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={metricas.serieTemporal}>
                  <defs>
                    <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.azulOscuro} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={C.azulOscuro} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grisClaro} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: C.textoSuave }}
                    tickFormatter={(v) => { const d = new Date(v + 'T00:00:00'); return `${d.getDate()}/${d.getMonth()+1}`; }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: C.textoSuave }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: `1px solid ${C.borde}` }}
                    labelFormatter={(v) => { const d = new Date(v+'T00:00:00'); return d.toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'}); }}
                  />
                  <Area type="monotone" dataKey="cantidad" stroke={C.azulOscuro} strokeWidth={2} fill="url(#gradArea)" name="Detenciones" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <Vacio loading={loading} />}
          </Panel>

          {/* Pie de estatus */}
          <Panel titulo="Por estatus" icono={<Shield size={14} color={C.dorado} />}>
            {dataPie.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={dataPie} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={2} stroke={C.blanco}>
                      {dataPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 8 }}>
                  {dataPie.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                        <span style={{ color: C.textoNormal }}>{item.name}</span>
                      </span>
                      <span style={{ fontWeight: 700, color: C.textoFuerte }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <Vacio loading={loading} />}
          </Panel>
        </div>

        {/* ─── Regiones + Top delitos ─────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {/* Por región */}
          <Panel titulo="Por región" icono={<MapPin size={14} color={C.dorado} />}>
            {dataRegiones.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dataRegiones} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grisClaro} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: C.textoSuave }} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: C.textoSuave }} width={120} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} name="Detenciones">
                      {dataRegiones.map((entry, i) => (
                        <Cell key={i} fill={entry.esMia ? C.azulOscuro : C.gris} fillOpacity={entry.esMia ? 1 : 0.5} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {!esRolSuperior && (
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 10, color: C.textoSuave }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: C.azulOscuro }} /> Mi región (completo)
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: C.gris, opacity: 0.5 }} /> Otras (generales)
                    </span>
                  </div>
                )}
              </>
            ) : <Vacio loading={loading} />}
          </Panel>

          {/* Top delitos */}
          <Panel titulo="Delitos más frecuentes" icono={<AlertTriangle size={14} color={C.dorado} />}>
            {metricas.topDelitos.length > 0 ? (
              <div>
                {metricas.topDelitos.map((d, i) => {
                  const pct = metricas.total > 0 ? Math.round((d.cantidad / metricas.total) * 100) : 0;
                  return (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: C.textoNormal, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{d.nombre}</span>
                        <span style={{ color: C.textoSuave, whiteSpace: 'nowrap' }}>
                          {d.cantidad} <span style={{ color: C.gris }}>({pct}%)</span>
                        </span>
                      </div>
                      <div style={{ width: '100%', background: C.grisClaro, borderRadius: 10, height: 6 }}>
                        <div style={{
                          height: 6, borderRadius: 10, transition: 'width 0.5s',
                          width: `${pct}%`, background: COLORES_REGION[i % COLORES_REGION.length],
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <Vacio loading={loading} />}
          </Panel>
        </div>

        {/* ─── Tabla de registros ─────────────────────── */}
        <Panel titulo={`Últimos registros del periodo`} icono={<Shield size={14} color={C.dorado} />}
          extra={<span style={{ fontSize: 11, color: C.textoSuave }}>{detenidos.length} registros</span>}>
          <div style={{ overflowX: 'auto' }}>
            <TablaDetenidos
              detenidos={detenidos.slice(0, 25)}
              getEstatus={getEstatus}
              esRolSuperior={esRolSuperior}
              loading={loading}
            />
          </div>
        </Panel>
      </div>

      {/* Keyframe para spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────

function Tarjeta({ icono, titulo, valor, color, bgIcon, subtexto, variante = 'normal' }) {
  const bordeMap = { normal: C.borde, alerta: '#f59e0b44', critico: '#ef444444' };
  const bgMap = { normal: C.blanco, alerta: C.amarilloClaro, critico: C.rojoClaro };
  return (
    <div style={{
      background: bgMap[variante], border: `1px solid ${bordeMap[variante]}`, borderRadius: 12,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bgIcon, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icono}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color, lineHeight: 1 }}>{valor}</div>
      <div style={{ fontSize: 11, color: C.textoSuave, fontWeight: 500 }}>{titulo}</div>
      {subtexto && <div style={{ fontSize: 10, color: C.gris, marginTop: -4 }}>{subtexto}</div>}
    </div>
  );
}

function Panel({ titulo, icono, children, extra }) {
  return (
    <div style={{
      background: C.blanco, border: `1px solid ${C.borde}`, borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 18px', borderBottom: `1px solid ${C.grisClaro}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icono}
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textoFuerte, letterSpacing: 0.3 }}>{titulo}</span>
        </div>
        {extra}
      </div>
      <div style={{ padding: 18 }}>
        {children}
      </div>
    </div>
  );
}

function TablaDetenidos({ detenidos, getEstatus, esRolSuperior, loading }) {
  if (loading) return <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: C.textoSuave }}>Cargando…</div>;
  if (!detenidos.length) return <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: C.textoSuave }}>Sin registros en este periodo</div>;

  const thStyle = {
    padding: '10px 12px', fontSize: 10, fontWeight: 700, color: C.textoSuave,
    textTransform: 'uppercase', letterSpacing: 1, textAlign: 'left',
    borderBottom: `2px solid ${C.grisClaro}`, whiteSpace: 'nowrap',
    background: C.grisClaro,
  };
  const tdBase = { padding: '10px 12px', fontSize: 12, borderBottom: `1px solid ${C.grisClaro}`, verticalAlign: 'middle' };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={thStyle}>Nombre</th>
          <th style={thStyle}>Alias</th>
          <th style={thStyle}>Carpeta Inv.</th>
          <th style={thStyle}>Delito</th>
          <th style={thStyle}>Región</th>
          <th style={thStyle}>Fecha</th>
          <th style={thStyle}>Estatus</th>
          <th style={thStyle}>48h</th>
          <th style={thStyle}>Acceso</th>
        </tr>
      </thead>
      <tbody>
        {detenidos.map((d) => {
          const est = getEstatus(d.estatus_clave);
          const esMia = d.es_mi_region;
          return (
            <tr key={d.id} style={{ background: esMia ? C.blanco : '#fafbfc' }}>
              <td style={{ ...tdBase, fontWeight: 600, color: C.textoFuerte }}>{d.nombre || '—'}</td>
              <td style={{ ...tdBase, color: C.textoNormal }}>{d.alias || '—'}</td>
              <td style={{ ...tdBase, color: C.textoNormal, fontFamily: 'monospace', fontSize: 11 }}>{d.carpeta_investigacion || '—'}</td>
              <td style={{ ...tdBase, color: C.textoNormal, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.delito || '—'}</td>
              <td style={tdBase}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  background: esMia ? C.azulClaro : C.grisClaro,
                  color: esMia ? C.azulOscuro : C.textoSuave,
                  border: esMia ? `1px solid ${C.azulOscuro}22` : `1px solid ${C.borde}`,
                }}>
                  {esMia && <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.azulOscuro }} />}
                  {d.region}
                </span>
              </td>
              <td style={{ ...tdBase, color: C.textoSuave, whiteSpace: 'nowrap' }}>
                {d.fecha_deteccion
                  ? new Date(d.fecha_deteccion + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'}
              </td>
              <td style={tdBase}>
                <span style={{
                  display: 'inline-block', fontSize: 10, fontWeight: 600,
                  padding: '3px 10px', borderRadius: 20,
                  background: est.color + '18', color: est.color,
                  border: `1px solid ${est.color}33`,
                }}>
                  {est.nombre}
                </span>
              </td>
              <td style={{ ...tdBase, fontSize: 11, color: C.textoSuave }}>
                {d.fecha_limite_48h
                  ? new Date(d.fecha_limite_48h).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : (!esMia && !esRolSuperior
                    ? <span style={{ color: C.gris, fontStyle: 'italic', fontSize: 10 }}>restringido</span>
                    : '—')
                }
              </td>
              <td style={tdBase}>
                {esMia || esRolSuperior ? (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: C.verde,
                    background: C.verdeClaro, padding: '3px 10px', borderRadius: 20,
                    border: `1px solid ${C.verde}33`,
                  }}>Completo</span>
                ) : (
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: C.textoSuave,
                    background: C.grisClaro, padding: '3px 10px', borderRadius: 20,
                    border: `1px solid ${C.borde}`,
                  }}>General</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Vacio({ loading }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 150, fontSize: 13, color: C.textoSuave }}>
      {loading ? 'Cargando datos…' : 'Sin datos para este periodo'}
    </div>
  );
}
