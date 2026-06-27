// src/pages/DashboardOperativo.jsx
// Tab 7 — Dashboard Operativo (Métricas de Calidad SESNSP)
// Vista de mando para Director General, Regional y Coordinadores de Zona

import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Activity, FileText, Users, Target, Shield, Clock, AlertTriangle,
  CheckCircle, XCircle, Phone, RefreshCw, TrendingUp, BarChart3,
  Calendar, ChevronDown, Briefcase, Eye
} from 'lucide-react';
import { useDashboardOperativo } from '../hooks/useDashboardOperativo';

// ============================================================================
// ESTILOS
// ============================================================================
const COLORS = { primary: '#001a4d', gold: '#b69054', white: '#ffffff', bg: '#f4f6fb' };

const cardStyle = {
  background: COLORS.white, borderRadius: 10, padding: 18,
  boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 14
};
const sectionTitle = {
  fontSize: 15, fontWeight: 800, color: COLORS.primary, marginBottom: 12,
  display: 'flex', alignItems: 'center', gap: 8
};
const selectStyle = {
  padding: '8px 12px', borderRadius: 7, border: '1.5px solid #c7cfe0',
  fontSize: 13, fontFamily: 'inherit', background: COLORS.white, outline: 'none'
};
const inputStyle = {
  padding: '8px 12px', borderRadius: 7, border: '1.5px solid #c7cfe0',
  fontSize: 13, fontFamily: 'inherit', outline: 'none'
};
const btnPrimary = {
  background: COLORS.gold, color: COLORS.white, border: 'none', borderRadius: 7,
  padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6
};
const badge = (color) => ({
  display: 'inline-block', padding: '3px 10px', borderRadius: 12,
  fontSize: 11, fontWeight: 700, color: COLORS.white, background: color,
  textTransform: 'uppercase', letterSpacing: 0.5
});

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function DashboardOperativo({ user }) {
  const hook = useDashboardOperativo(user);
  const {
    loading, error, setError,
    periodo, setPeriodo, fechaInicio, setFechaInicio, fechaFin, setFechaFin,
    metricasOficios, metricasPersonas, metricasAcciones,
    metricas911, metricasDetenidos,
    oficiosVencidos, cargaAgentes,
    oficiosPorPrioridad, accionesPorDia, delitosFrecuentes,
    tasaCumplimiento, tasaVencimiento,
    fetchTodo, COLORES_CHART
  } = hook;

  const [seccionExpandida, setSeccionExpandida] = useState({
    oficios: true, personas: true, acciones: true, agentes: true, vencidos: true
  });

  const toggleSeccion = (key) => {
    setSeccionExpandida(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // === LABEL DE PERÍODO ===
  const periodoLabel = {
    'mes_actual': 'Mes Actual',
    'mes_anterior': 'Mes Anterior',
    'trimestre': 'Último Trimestre',
    'anio': 'Año en Curso',
    'custom': 'Personalizado'
  };

  // === FORMATO DE NÚMEROS ===
  const formatNum = (n) => {
    if (n === undefined || n === null) return '0';
    return n.toLocaleString('es-MX');
  };

  // ============================================================================
  // RENDER: SELECTOR DE PERÍODO
  // ============================================================================
  const renderPeriodo = () => (
    <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
      <Calendar size={18} color={COLORS.primary} />
      <span style={{ fontWeight: 700, color: COLORS.primary, fontSize: 14 }}>Período:</span>
      <select style={selectStyle} value={periodo} onChange={e => setPeriodo(e.target.value)}>
        <option value="mes_actual">Mes Actual</option>
        <option value="mes_anterior">Mes Anterior</option>
        <option value="trimestre">Último Trimestre</option>
        <option value="anio">Año en Curso</option>
        <option value="custom">Personalizado</option>
      </select>
      {periodo === 'custom' && (
        <>
          <input type="date" style={inputStyle} value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
          <span style={{ color: '#9ca3af' }}>a</span>
          <input type="date" style={inputStyle} value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
        </>
      )}
      <button style={btnPrimary} onClick={fetchTodo} disabled={loading}>
        <RefreshCw size={14} /> {loading ? 'Cargando...' : 'Actualizar'}
      </button>
      <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>
        Rol: {(user?.rol || '').replace(/_/g, ' ')} · {user?.region || 'Todas las regiones'}
      </span>
    </div>
  );

  // ============================================================================
  // RENDER: KPI CARDS PRINCIPALES
  // ============================================================================
  const renderKPIs = () => {
    const kpis = [
      { label: 'Reportes 911', value: metricas911.total, icon: Phone, color: '#3b82f6', sub: `${metricas911.atendidos} atendidos` },
      { label: 'Oficios MP', value: metricasOficios.total, icon: FileText, color: COLORS.primary, sub: `${metricasOficios.en_investigacion} activos` },
      { label: 'Detenidos', value: metricasDetenidos.total, icon: Shield, color: '#10b981', sub: `${metricasDetenidos.puestos_disposicion} consignados` },
      { label: 'Personas Investigadas', value: metricasPersonas.total, icon: Users, color: '#8b5cf6', sub: `${metricasPersonas.profugos} prófugos` },
      { label: 'Acciones Inv.', value: metricasAcciones.total, icon: Activity, color: COLORS.gold, sub: `${metricasAcciones.por_agente.length} agentes` },
      { label: 'Tasa Cumplimiento', value: `${tasaCumplimiento}%`, icon: TrendingUp, color: tasaCumplimiento >= 70 ? '#10b981' : tasaCumplimiento >= 40 ? '#f59e0b' : '#ef4444', sub: `${metricasOficios.vencidos} vencidos` }
    ];

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10, marginBottom: 16 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{
            ...cardStyle, marginBottom: 0, padding: 16, textAlign: 'center',
            borderTop: `4px solid ${k.color}`, position: 'relative'
          }}>
            <k.icon size={22} color={k.color} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 26, fontWeight: 900, color: k.color, lineHeight: 1.1 }}>{formatNum(k.value)}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, marginTop: 4 }}>{k.label}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>
    );
  };

  // ============================================================================
  // RENDER: INDICADORES DE EFICIENCIA
  // ============================================================================
  const renderIndicadores = () => {
    const indicadores = [
      {
        label: 'Tasa de Cumplimiento de Oficios',
        valor: tasaCumplimiento,
        color: tasaCumplimiento >= 70 ? '#10b981' : tasaCumplimiento >= 40 ? '#f59e0b' : '#ef4444',
        detalle: `${metricasOficios.cumplimentados} de ${metricasOficios.total} oficios cumplimentados`
      },
      {
        label: 'Tasa de Vencimiento',
        valor: tasaVencimiento,
        color: tasaVencimiento <= 10 ? '#10b981' : tasaVencimiento <= 25 ? '#f59e0b' : '#ef4444',
        detalle: `${metricasOficios.vencidos} oficios vencieron su término`
      },
      {
        label: 'Tasa de Detención',
        valor: metricasPersonas.total > 0 ? Math.round((metricasPersonas.detenidos / metricasPersonas.total) * 100) : 0,
        color: '#3b82f6',
        detalle: `${metricasPersonas.detenidos} de ${metricasPersonas.total} personas investigadas fueron detenidas`
      }
    ];

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, marginBottom: 16 }}>
        {indicadores.map((ind, i) => (
          <div key={i} style={{ ...cardStyle, marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary }}>{ind.label}</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: ind.color }}>{ind.valor}%</span>
            </div>
            <div style={{ background: '#e5e7eb', borderRadius: 6, height: 10, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.min(ind.valor, 100)}%`,
                background: ind.color, borderRadius: 6, transition: 'width 0.5s ease'
              }} />
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>{ind.detalle}</div>
          </div>
        ))}
      </div>
    );
  };

  // ============================================================================
  // RENDER: SECCIÓN COLAPSABLE
  // ============================================================================
  const SeccionColapsable = ({ title, icon: Icon, sectionKey, children }) => (
    <div style={{ ...cardStyle }}>
      <div
        style={{ ...sectionTitle, cursor: 'pointer', marginBottom: seccionExpandida[sectionKey] ? 12 : 0 }}
        onClick={() => toggleSeccion(sectionKey)}
      >
        <Icon size={18} color={COLORS.gold} />
        {title}
        <ChevronDown size={16} style={{
          marginLeft: 'auto', color: '#9ca3af',
          transform: seccionExpandida[sectionKey] ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }} />
      </div>
      {seccionExpandida[sectionKey] && children}
    </div>
  );

  // ============================================================================
  // RENDER: GRÁFICAS DE OFICIOS
  // ============================================================================
  const renderGraficasOficios = () => {
    const estatusData = [
      { name: 'Recibidos', value: metricasOficios.recibidos, fill: '#6b7280' },
      { name: 'Asignados', value: metricasOficios.asignados, fill: '#3b82f6' },
      { name: 'En Inv.', value: metricasOficios.en_investigacion, fill: '#f59e0b' },
      { name: 'Cumplidos', value: metricasOficios.cumplimentados, fill: '#10b981' },
      { name: 'Vencidos', value: metricasOficios.vencidos, fill: '#ef4444' },
      { name: 'Parciales', value: metricasOficios.parciales, fill: '#8b5cf6' }
    ].filter(d => d.value > 0);

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Pie de estatus */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, marginBottom: 8, textAlign: 'center' }}>
            Oficios por Estatus
          </div>
          {estatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={estatusData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={80} innerRadius={35} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`}
                  style={{ fontSize: 10 }}>
                  {estatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>Sin datos</div>
          )}
        </div>
        {/* Bar de prioridad */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, marginBottom: 8, textAlign: 'center' }}>
            Oficios por Prioridad
          </div>
          {oficiosPorPrioridad.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={oficiosPorPrioridad} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" style={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" style={{ fontSize: 11 }} width={75} />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.gold} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>Sin datos</div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: GRÁFICA DE DELITOS FRECUENTES
  // ============================================================================
  const renderDelitosFrecuentes = () => (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, marginBottom: 8 }}>
        Delitos más Frecuentes ({periodoLabel[periodo]})
      </div>
      {delitosFrecuentes.length > 0 ? (
        <ResponsiveContainer width="100%" height={Math.max(180, delitosFrecuentes.length * 32)}>
          <BarChart data={delitosFrecuentes} layout="vertical" margin={{ left: 160 }}>
            <XAxis type="number" style={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" style={{ fontSize: 10 }} width={155} />
            <Tooltip />
            <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13 }}>Sin datos de delitos en el período</div>
      )}
    </div>
  );

  // ============================================================================
  // RENDER: PERSONAS INVESTIGADAS
  // ============================================================================
  const renderPersonasChart = () => {
    const data = [
      { name: 'Sospechosos', value: metricasPersonas.sospechosos, fill: '#f59e0b' },
      { name: 'Identificados', value: metricasPersonas.identificados, fill: '#3b82f6' },
      { name: 'Localizados', value: metricasPersonas.localizados, fill: '#8b5cf6' },
      { name: 'Detenidos', value: metricasPersonas.detenidos, fill: '#10b981' },
      { name: 'Prófugos', value: metricasPersonas.profugos, fill: '#ef4444' },
      { name: 'Descartados', value: metricasPersonas.descartados, fill: '#6b7280' }
    ].filter(d => d.value > 0);

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={75} innerRadius={30} paddingAngle={2}
                  label={({ name, value }) => `${value}`} style={{ fontSize: 11 }}>
                  {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>Sin datos</div>
          )}
        </div>
        <div>
          {data.map((d, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.fill }} />
                <span style={{ fontSize: 13, color: '#374151' }}>{d.name}</span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: d.fill }}>{d.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: 4, borderTop: '2px solid #e5e7eb' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: COLORS.primary }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: COLORS.primary }}>{metricasPersonas.total}</span>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: ACCIONES POR DÍA
  // ============================================================================
  const renderAccionesChart = () => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, marginBottom: 8 }}>
            Acciones de Investigación por Día
          </div>
          {accionesPorDia.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={accionesPorDia}>
                <XAxis dataKey="name" style={{ fontSize: 10 }} />
                <YAxis style={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.gold} radius={[4, 4, 0, 0]} name="Acciones" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>Sin acciones registradas</div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, marginBottom: 8 }}>
            Top Tipos de Acción
          </div>
          {metricasAcciones.por_tipo.slice(0, 6).map((t, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 11, color: '#374151', textTransform: 'capitalize' }}>{t.name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.gold }}>{t.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: CARGA DE AGENTES
  // ============================================================================
  const renderCargaAgentes = () => (
    <div>
      {cargaAgentes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13 }}>Sin datos de carga de agentes</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: COLORS.primary, color: COLORS.white }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', borderRadius: '6px 0 0 0' }}>Agente</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Total</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Activos</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Pendientes</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Urgentes</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Vencidos</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', borderRadius: '0 6px 0 0' }}>Avance</th>
              </tr>
            </thead>
            <tbody>
              {cargaAgentes.map((a, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#f9fafb' : COLORS.white, borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: COLORS.primary }}>
                    {a.nombre_agente_asignado || 'Sin nombre'}
                    <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>{a.zona || a.region || ''}</div>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>{a.total_oficios}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <span style={badge('#f59e0b')}>{a.en_investigacion}</span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <span style={badge('#3b82f6')}>{a.pendientes_iniciar}</span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <span style={badge(a.urgentes > 0 ? '#ef4444' : '#6b7280')}>{a.urgentes}</span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <span style={badge(a.vencidos > 0 ? '#dc2626' : '#10b981')}>{a.vencidos}</span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8, width: 60, display: 'inline-block', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round(a.avance_promedio || 0)}%`, background: COLORS.gold, borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>{Math.round(a.avance_promedio || 0)}%</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // RENDER: ALERTAS DE OFICIOS VENCIDOS
  // ============================================================================
  const renderAlertasVencidos = () => (
    <div>
      {oficiosVencidos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: '#10b981', fontSize: 13 }}>
          <CheckCircle size={24} style={{ marginBottom: 6 }} />
          <div>No hay oficios vencidos ni próximos a vencer</div>
        </div>
      ) : (
        oficiosVencidos.slice(0, 8).map((o, i) => {
          const esVencido = o.alerta_vencimiento === 'vencido';
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', marginBottom: 6, borderRadius: 7,
              background: esVencido ? '#fef2f2' : '#fffbeb',
              borderLeft: `4px solid ${esVencido ? '#ef4444' : '#f59e0b'}`
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: esVencido ? '#dc2626' : '#92400e' }}>
                  Oficio #{o.numero_oficio}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  C.I. {o.carpeta_investigacion} · {o.nombre_agente_asignado || 'Sin asignar'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={badge(esVencido ? '#ef4444' : '#f59e0b')}>
                  {esVencido ? 'VENCIDO' : 'POR VENCER'}
                </span>
                {o.horas_restantes != null && (
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>
                    <Clock size={10} style={{ verticalAlign: 'middle' }} />
                    {o.horas_restantes < 0 ? ` Hace ${Math.abs(Math.round(o.horas_restantes))}h` : ` ${Math.round(o.horas_restantes)}h`}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================
  return (
    <div style={{ padding: '10px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 4px 0', color: COLORS.primary, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={22} color={COLORS.gold} />
          Dashboard Operativo
        </h2>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          Indicadores de gestión y calidad SESNSP · {periodoLabel[periodo]}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ ...cardStyle, background: '#fef2f2', borderLeft: '4px solid #ef4444', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#dc2626', fontSize: 13 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>✕</button>
        </div>
      )}

      {/* Período */}
      {renderPeriodo()}

      {/* KPIs principales */}
      {renderKPIs()}

      {/* Indicadores de eficiencia */}
      {renderIndicadores()}

      {/* Gráficas de Oficios */}
      <SeccionColapsable title="Oficios de Investigación" icon={FileText} sectionKey="oficios">
        {renderGraficasOficios()}
        <div style={{ marginTop: 16 }}>
          {renderDelitosFrecuentes()}
        </div>
      </SeccionColapsable>

      {/* Personas Investigadas */}
      <SeccionColapsable title="Personas Investigadas" icon={Users} sectionKey="personas">
        {renderPersonasChart()}
      </SeccionColapsable>

      {/* Acciones de Investigación */}
      <SeccionColapsable title="Acciones de Investigación" icon={Activity} sectionKey="acciones">
        {renderAccionesChart()}
      </SeccionColapsable>

      {/* Carga por Agente */}
      <SeccionColapsable title="Carga de Trabajo por Agente" icon={Briefcase} sectionKey="agentes">
        {renderCargaAgentes()}
      </SeccionColapsable>

      {/* Alertas de Vencimiento */}
      <SeccionColapsable title="Alertas de Vencimiento" icon={AlertTriangle} sectionKey="vencidos">
        {renderAlertasVencidos()}
      </SeccionColapsable>

      {/* Loading overlay */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>
          <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
