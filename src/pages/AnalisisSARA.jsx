// src/pages/AnalisisSARA.jsx
// Tab 8 — Análisis SARA (Cross-Case Problem Solving)
// Scanning → Analysis → Response → Assessment

import React, { useState } from 'react';
import {
  Search, BarChart3, Zap, CheckCircle, Plus, ChevronLeft, RefreshCw,
  Target, FileText, MapPin, Clock, Users, AlertTriangle, ArrowRight,
  Filter, Eye, Briefcase, Flag, ChevronDown
} from 'lucide-react';
import { useAnalisisSARA } from '../hooks/useAnalisisSARA';
import MapaCalor from './MapaCalor';
import TrianguloProblema from './TrianguloProblema';
import ChecklistCHEERS from './ChecklistCHEERS';
const COLORS = { primary: '#001a4d', gold: '#b69054', white: '#ffffff' };

const cardStyle = {
  background: COLORS.white, borderRadius: 10, padding: 18,
  boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 14
};
const labelStyle = {
  display: 'block', fontWeight: 600, fontSize: 13, color: COLORS.primary, marginBottom: 4
};
const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 7,
  border: '1.5px solid #c7cfe0', fontSize: 14, boxSizing: 'border-box',
  outline: 'none', fontFamily: 'inherit'
};
const selectStyle = { ...inputStyle, background: COLORS.white };
const textareaStyle = { ...inputStyle, minHeight: 70, resize: 'vertical' };
const btnPrimary = {
  background: COLORS.gold, color: COLORS.white, border: 'none', borderRadius: 7,
  padding: '10px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 7
};
const btnSecondary = {
  ...btnPrimary, background: 'transparent', color: COLORS.primary,
  border: `1.5px solid ${COLORS.primary}`
};
const badge = (color) => ({
  display: 'inline-block', padding: '3px 10px', borderRadius: 12,
  fontSize: 11, fontWeight: 700, color: COLORS.white, background: color,
  textTransform: 'uppercase', letterSpacing: 0.5
});

export default function AnalisisSARA({ user }) {
  const hook = useAnalisisSARA(user);
  const {
    proyectos, loading, error, setError,
    filtroFase, setFiltroFase, filtroPrioridad, setFiltroPrioridad,
    fetchProyectos, crearProyecto, actualizarProyecto, avanzarFase,
    FASES, getPrioridadColor, getFaseInfo, getProgreso, formatFecha
  } = hook;

  const [vista, setVista] = useState('listado');
  const [proyectoActivo, setProyectoActivo] = useState(null);
const [showMapa, setShowMapa] = useState(false);
  const emptyProyecto = {
    titulo: '', descripcion: '', categoria_delito: '', zona_geografica: '',
    prioridad: 'media', scanning_problema: ''
  };
  const [formProyecto, setFormProyecto] = useState(emptyProyecto);

  const handleCrear = async () => {
    if (!formProyecto.titulo || !formProyecto.categoria_delito) {
      setError('Título y categoría de delito son obligatorios');
      return;
    }
    const result = await crearProyecto(formProyecto);
    if (result) {
      setFormProyecto(emptyProyecto);
      setVista('listado');
    }
  };

  const handleVerProyecto = (p) => {
    setProyectoActivo(p);
    setVista('detalle');
  };

  const handleGuardarFase = async (campos) => {
    if (!proyectoActivo) return;
    const ok = await actualizarProyecto(proyectoActivo.id, campos);
    if (ok) {
      setProyectoActivo(prev => ({ ...prev, ...campos }));
    }
  };

  const handleAvanzar = async () => {
    if (!proyectoActivo) return;
    const ok = await avanzarFase(proyectoActivo);
    if (ok) {
      const faseInfo = getFaseInfo(proyectoActivo.fase_actual);
      const orden = FASES.map(f => f.key);
      const idx = orden.indexOf(proyectoActivo.fase_actual);
      const siguiente = orden[idx + 1];
      setProyectoActivo(prev => ({
        ...prev,
        fase_actual: siguiente,
        [`${prev.fase_actual}_completado`]: true,
        [`${prev.fase_actual}_fecha_completado`]: new Date().toISOString()
      }));
    }
  };

  // ============================================================================
  // RENDER: PROGRESO VISUAL
  // ============================================================================
  const renderProgreso = (proyecto) => {
    const progreso = getProgreso(proyecto);
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {FASES.slice(0, 4).map((f, i) => {
          const completada = proyecto[`${f.key}_completado`];
          const esActual = proyecto.fase_actual === f.key;
          return (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 12,
                background: completada ? f.color : esActual ? f.color + '22' : '#e5e7eb',
                color: completada ? COLORS.white : esActual ? f.color : '#9ca3af',
                border: esActual ? `2px solid ${f.color}` : '2px solid transparent',
                fontWeight: 800
              }}>
                {completada ? '✓' : f.icon}
              </div>
              {i < 3 && (
                <div style={{
                  width: 20, height: 2,
                  background: completada ? f.color : '#e5e7eb'
                }} />
              )}
            </div>
          );
        })}
        <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>{progreso}%</span>
      </div>
    );
  };

  // ============================================================================
  // RENDER: LISTADO
  // ============================================================================
  const renderListado = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', color: COLORS.primary, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={22} color={COLORS.gold} />
            Análisis SARA
          </h2>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Problem-Solving Policing · Scanning → Analysis → Response → Assessment
          </div>
        </div>
        {['direccion_general','coordinador_regional','coordinador_zona'].includes(user?.rol) && (
          <button style={btnPrimary} onClick={() => { setFormProyecto(emptyProyecto); setVista('nuevo'); }}>
            <Plus size={15} /> Nuevo Proyecto
          </button>
        )}
      </div>

      {/* Filtros */}
      <div style={{ ...cardStyle, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 160px' }}>
          <label style={labelStyle}>Fase</label>
          <select style={selectStyle} value={filtroFase} onChange={e => setFiltroFase(e.target.value)}>
            <option value="todos">Todas</option>
            {FASES.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>
        <div style={{ flex: '0 0 140px' }}>
          <label style={labelStyle}>Prioridad</label>
          <select style={selectStyle} value={filtroPrioridad} onChange={e => setFiltroPrioridad(e.target.value)}>
            <option value="todos">Todas</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
        <button style={{ ...btnSecondary, padding: '9px 16px' }} onClick={fetchProyectos}>
          <RefreshCw size={14} /> Buscar
        </button>
      </div>

      {/* Resumen por fase */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 14 }}>
        {FASES.slice(0, 4).map(f => {
          const count = proyectos.filter(p => p.fase_actual === f.key).length;
          return (
            <div key={f.key} style={{ ...cardStyle, marginBottom: 0, padding: 12, textAlign: 'center', borderTop: `3px solid ${f.color}`, cursor: 'pointer' }}
              onClick={() => setFiltroFase(filtroFase === f.key ? 'todos' : f.key)}>
              <div style={{ fontSize: 20, marginBottom: 2 }}>{f.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: f.color }}>{count}</div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{f.label}</div>
            </div>
          );
        })}
      </div>

      {/* Lista */}
      {proyectos.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          <Target size={40} style={{ marginBottom: 10, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>No hay proyectos SARA. Crea uno para iniciar el análisis cross-case.</div>
        </div>
      ) : (
        proyectos.map(p => {
          const faseInfo = getFaseInfo(p.fase_actual);
          return (
            <div key={p.id} style={{ ...cardStyle, cursor: 'pointer', borderLeft: `4px solid ${faseInfo.color}`, transition: 'box-shadow 0.2s' }}
              onClick={() => handleVerProyecto(p)}
              onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
              onMouseOut={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: COLORS.primary }}>{p.titulo}</span>
                    <span style={badge(faseInfo.color)}>{faseInfo.icon} {faseInfo.label}</span>
                    <span style={badge(getPrioridadColor(p.prioridad))}>{p.prioridad}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>
                    <strong>Delito:</strong> {p.categoria_delito}
                    {p.zona_geografica && <> · <strong>Zona:</strong> {p.zona_geografica}</>}
                  </div>
                  {p.descripcion && <div style={{ fontSize: 12, color: '#6b7280' }}>{p.descripcion.substring(0, 100)}{p.descripcion.length > 100 ? '...' : ''}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {renderProgreso(p)}
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{formatFecha(p.created_at)}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{p.nombre_creador}</div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  // ============================================================================
  // RENDER: NUEVO PROYECTO
  // ============================================================================
  const renderFormNuevo = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button style={{ ...btnSecondary, padding: '6px 12px' }} onClick={() => setVista('listado')}>
          <ChevronLeft size={16} /> Volver
        </button>
        <h3 style={{ margin: 0, color: COLORS.primary }}>Nuevo Proyecto SARA</h3>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Título del Proyecto *</label>
            <input style={inputStyle} placeholder="Ej: Incremento de robo a transeúnte en Zona Renacimiento"
              value={formProyecto.titulo} onChange={e => setFormProyecto({ ...formProyecto, titulo: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Categoría de Delito *</label>
            <input style={inputStyle} placeholder="Ej: Robo a transeúnte"
              value={formProyecto.categoria_delito} onChange={e => setFormProyecto({ ...formProyecto, categoria_delito: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Zona Geográfica</label>
            <input style={inputStyle} placeholder="Ej: Sector Renacimiento, Acapulco"
              value={formProyecto.zona_geografica} onChange={e => setFormProyecto({ ...formProyecto, zona_geografica: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Prioridad</label>
            <select style={selectStyle} value={formProyecto.prioridad}
              onChange={e => setFormProyecto({ ...formProyecto, prioridad: e.target.value })}>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Problema Inicial (Scanning)</label>
            <input style={inputStyle} placeholder="Describe el patrón detectado"
              value={formProyecto.scanning_problema} onChange={e => setFormProyecto({ ...formProyecto, scanning_problema: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Descripción General</label>
            <textarea style={textareaStyle} placeholder="Contexto y justificación del análisis..."
              value={formProyecto.descripcion} onChange={e => setFormProyecto({ ...formProyecto, descripcion: e.target.value })} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <button style={btnSecondary} onClick={() => setVista('listado')}>Cancelar</button>
          <button style={btnPrimary} onClick={handleCrear} disabled={loading}>
            <Target size={15} /> {loading ? 'Creando...' : 'Crear Proyecto SARA'}
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: DETALLE DEL PROYECTO
  // ============================================================================
  const renderDetalle = () => {
    if (!proyectoActivo) return null;
    const p = proyectoActivo;
    const faseInfo = getFaseInfo(p.fase_actual);

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <button style={{ ...btnSecondary, padding: '6px 12px' }} onClick={() => { setVista('listado'); setProyectoActivo(null); }}>
            <ChevronLeft size={16} /> Volver
          </button>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: COLORS.primary }}>{p.titulo}</span>
            <span style={{ marginLeft: 10, ...badge(faseInfo.color) }}>{faseInfo.icon} {faseInfo.label}</span>
            <span style={{ marginLeft: 6, ...badge(getPrioridadColor(p.prioridad)) }}>{p.prioridad}</span>
          </div>
        </div>

        {/* Progreso visual grande */}
        <div style={{ ...cardStyle, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {FASES.slice(0, 4).map((f, i) => {
              const completada = p[`${f.key}_completado`];
              const esActual = p.fase_actual === f.key;
              return (
                <React.Fragment key={f.key}>
                  <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', margin: '0 auto 6px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 800,
                      background: completada ? f.color : esActual ? f.color + '15' : '#f3f4f6',
                      color: completada ? COLORS.white : esActual ? f.color : '#d1d5db',
                      border: esActual ? `3px solid ${f.color}` : '3px solid transparent',
                      transition: 'all 0.3s'
                    }}>
                      {completada ? '✓' : f.icon}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: esActual ? 800 : 500, color: esActual ? f.color : completada ? f.color : '#9ca3af' }}>
                      {f.label}
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{f.desc}</div>
                    {p[`${f.key}_fecha_completado`] && (
                      <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>
                        {formatFecha(p[`${f.key}_fecha_completado`])}
                      </div>
                    )}
                  </div>
                  {i < 3 && (
                    <div style={{ flex: 1, height: 3, background: completada ? f.color : '#e5e7eb', margin: '0 6px', borderRadius: 2, alignSelf: 'center', marginBottom: 30 }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Contenido de la fase actual */}
        {p.fase_actual === 'scanning' && renderScanning(p)}
        {p.fase_actual === 'analysis' && renderAnalysis(p)}
        {p.fase_actual === 'response' && renderResponse(p)}
        {p.fase_actual === 'assessment' && renderAssessment(p)}
        {p.fase_actual === 'cerrado' && renderCerrado(p)}

        {/* Botón avanzar fase */}
        {p.fase_actual !== 'cerrado' && (
          <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              Cuando completes esta fase, avanza a la siguiente
            </span>
            <button style={{ ...btnPrimary, background: faseInfo.color }} onClick={handleAvanzar}>
              Avanzar a {FASES[FASES.findIndex(f => f.key === p.fase_actual) + 1]?.label || 'Cerrar'} <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    );
  };

  // === FASE: SCANNING ===
  const renderScanning = (p) => {
    const [form, setForm] = useState({
      scanning_problema: p.scanning_problema || '',
      scanning_datos_fuente: p.scanning_datos_fuente || '',
      scanning_periodo_analisis: p.scanning_periodo_analisis || '',
      scanning_patron_identificado: p.scanning_patron_identificado || '',
      scanning_frecuencia: p.scanning_frecuencia || '',
      scanning_zona_concentracion: p.scanning_zona_concentracion || '',
      scanning_victimas_perfil: p.scanning_victimas_perfil || '',
      scanning_sospechosos_perfil: p.scanning_sospechosos_perfil || '',
      scanning_horarios_patron: p.scanning_horarios_patron || ''
    });

    return (
      <div style={{ ...cardStyle, borderLeft: '4px solid #3b82f6' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#3b82f6', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={18} /> Fase 1: Scanning — Identificación del Problema
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Problema Identificado</label>
            <textarea style={textareaStyle} value={form.scanning_problema} onChange={e => setForm({ ...form, scanning_problema: e.target.value })}
              placeholder="Describe el problema criminal persistente identificado..." />
          </div>
          <div>
            <label style={labelStyle}>Fuentes de Datos Consultadas</label>
            <input style={inputStyle} value={form.scanning_datos_fuente} onChange={e => setForm({ ...form, scanning_datos_fuente: e.target.value })}
              placeholder="Reportes 911, oficios MP, estadísticas..." />
          </div>
          <div>
            <label style={labelStyle}>Período de Análisis</label>
            <input style={inputStyle} value={form.scanning_periodo_analisis} onChange={e => setForm({ ...form, scanning_periodo_analisis: e.target.value })}
              placeholder="Ej: Enero-Junio 2026" />
          </div>
          <div>
            <label style={labelStyle}>Patrón Identificado</label>
            <input style={inputStyle} value={form.scanning_patron_identificado} onChange={e => setForm({ ...form, scanning_patron_identificado: e.target.value })}
              placeholder="Ej: Cluster de robos en horario nocturno" />
          </div>
          <div>
            <label style={labelStyle}>Frecuencia del Problema</label>
            <input style={inputStyle} value={form.scanning_frecuencia} onChange={e => setForm({ ...form, scanning_frecuencia: e.target.value })}
              placeholder="Ej: 15 incidentes/mes, tendencia creciente" />
          </div>
          <div>
            <label style={labelStyle}>Zona de Concentración</label>
            <input style={inputStyle} value={form.scanning_zona_concentracion} onChange={e => setForm({ ...form, scanning_zona_concentracion: e.target.value })}
              placeholder="Ej: Blvd. Vicente Guerrero, Col. Renacimiento" />
          </div>
          <div>
            <label style={labelStyle}>Horarios con Mayor Incidencia</label>
            <input style={inputStyle} value={form.scanning_horarios_patron} onChange={e => setForm({ ...form, scanning_horarios_patron: e.target.value })}
              placeholder="Ej: 20:00 - 02:00 hrs" />
          </div>
          <div>
            <label style={labelStyle}>Perfil de Víctimas</label>
            <input style={inputStyle} value={form.scanning_victimas_perfil} onChange={e => setForm({ ...form, scanning_victimas_perfil: e.target.value })}
              placeholder="Ej: Transeúntes, usuarios de cajeros" />
          </div>
          <div>
            <label style={labelStyle}>Perfil de Sospechosos</label>
            <input style={inputStyle} value={form.scanning_sospechosos_perfil} onChange={e => setForm({ ...form, scanning_sospechosos_perfil: e.target.value })}
              placeholder="Ej: Hombres 18-25 años, en motocicleta" />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button style={btnPrimary} onClick={() => handleGuardarFase(form)}>
            <FileText size={14} /> Guardar Scanning
          </button>
        </div>
      </div>
    );
  };

  // === FASE: ANALYSIS ===
  const renderAnalysis = (p) => {
    const [form, setForm] = useState({
      analysis_causas_raiz: p.analysis_causas_raiz || '',
      analysis_factores_contribuyentes: p.analysis_factores_contribuyentes || '',
      analysis_triangulo_delito: p.analysis_triangulo_delito || '',
      analysis_victima_perfil_detallado: p.analysis_victima_perfil_detallado || '',
      analysis_agresor_perfil_detallado: p.analysis_agresor_perfil_detallado || '',
      analysis_lugar_caracteristicas: p.analysis_lugar_caracteristicas || '',
      analysis_oportunidades_intervencion: p.analysis_oportunidades_intervencion || '',
      analysis_hipotesis: p.analysis_hipotesis || ''
    });

    return (
      <div style={{ ...cardStyle, borderLeft: '4px solid #8b5cf6' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#8b5cf6', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={18} /> Fase 2: Analysis — Causas y Factores
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Causas Raíz del Problema</label>
            <textarea style={textareaStyle} value={form.analysis_causas_raiz} onChange={e => setForm({ ...form, analysis_causas_raiz: e.target.value })}
              placeholder="¿Por qué ocurre este problema? Causas estructurales..." />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Factores Contribuyentes</label>
            <textarea style={textareaStyle} value={form.analysis_factores_contribuyentes} onChange={e => setForm({ ...form, analysis_factores_contribuyentes: e.target.value })}
              placeholder="Falta de iluminación, baja presencia policial, falta de cámaras..." />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Triángulo del Delito (Víctima + Agresor + Lugar)</label>
            <textarea style={textareaStyle} value={form.analysis_triangulo_delito} onChange={e => setForm({ ...form, analysis_triangulo_delito: e.target.value })}
              placeholder="Análisis de la convergencia espacio-temporal de víctima, agresor y lugar..." />
          </div>
          <div>
            <label style={labelStyle}>Perfil Detallado de Víctimas</label>
            <textarea style={{ ...textareaStyle, minHeight: 55 }} value={form.analysis_victima_perfil_detallado} onChange={e => setForm({ ...form, analysis_victima_perfil_detallado: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Perfil Detallado de Agresores</label>
            <textarea style={{ ...textareaStyle, minHeight: 55 }} value={form.analysis_agresor_perfil_detallado} onChange={e => setForm({ ...form, analysis_agresor_perfil_detallado: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Características del Lugar</label>
            <textarea style={{ ...textareaStyle, minHeight: 55 }} value={form.analysis_lugar_caracteristicas} onChange={e => setForm({ ...form, analysis_lugar_caracteristicas: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Oportunidades de Intervención</label>
            <textarea style={{ ...textareaStyle, minHeight: 55 }} value={form.analysis_oportunidades_intervencion} onChange={e => setForm({ ...form, analysis_oportunidades_intervencion: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Hipótesis de Trabajo</label>
            <textarea style={textareaStyle} value={form.analysis_hipotesis} onChange={e => setForm({ ...form, analysis_hipotesis: e.target.value })}
              placeholder="Si implementamos X, entonces Y debería reducirse porque Z..." />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button style={{ ...btnPrimary, background: '#8b5cf6' }} onClick={() => handleGuardarFase(form)}>
            <FileText size={14} /> Guardar Analysis
          </button>
        </div>
      </div>
    );
  };

  // === FASE: RESPONSE ===
  const renderResponse = (p) => {
    const [form, setForm] = useState({
      response_estrategia: p.response_estrategia || '',
      response_recursos_necesarios: p.response_recursos_necesarios || '',
      response_coordinacion_externa: p.response_coordinacion_externa || ''
    });

    return (
      <div style={{ ...cardStyle, borderLeft: '4px solid #f59e0b' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#f59e0b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={18} /> Fase 3: Response — Estrategia de Intervención
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Estrategia de Respuesta</label>
            <textarea style={{ ...textareaStyle, minHeight: 90 }} value={form.response_estrategia} onChange={e => setForm({ ...form, response_estrategia: e.target.value })}
              placeholder="Describe la estrategia: patrullaje focalizado, operativos, coordinación con C4..." />
          </div>
          <div>
            <label style={labelStyle}>Recursos Necesarios</label>
            <textarea style={textareaStyle} value={form.response_recursos_necesarios} onChange={e => setForm({ ...form, response_recursos_necesarios: e.target.value })}
              placeholder="Personal, vehículos, tecnología, presupuesto..." />
          </div>
          <div>
            <label style={labelStyle}>Coordinación con Otras Instituciones</label>
            <textarea style={textareaStyle} value={form.response_coordinacion_externa} onChange={e => setForm({ ...form, response_coordinacion_externa: e.target.value })}
              placeholder="Policía Municipal, Guardia Nacional, C4, SSPE..." />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button style={{ ...btnPrimary, background: '#f59e0b' }} onClick={() => handleGuardarFase(form)}>
            <FileText size={14} /> Guardar Response
          </button>
        </div>
      </div>
    );
  };

  // === FASE: ASSESSMENT ===
  const renderAssessment = (p) => {
    const [form, setForm] = useState({
      assessment_resultado_general: p.assessment_resultado_general || '',
      assessment_lecciones_aprendidas: p.assessment_lecciones_aprendidas || '',
      assessment_recomendaciones: p.assessment_recomendaciones || '',
      assessment_requiere_nuevo_ciclo: p.assessment_requiere_nuevo_ciclo || false
    });

    return (
      <div style={{ ...cardStyle, borderLeft: '4px solid #10b981' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#10b981', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={18} /> Fase 4: Assessment — Evaluación de Resultados
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Resultado General de la Intervención</label>
            <textarea style={{ ...textareaStyle, minHeight: 90 }} value={form.assessment_resultado_general} onChange={e => setForm({ ...form, assessment_resultado_general: e.target.value })}
              placeholder="¿Se redujo el problema? ¿En qué porcentaje? ¿Hubo efectos no deseados?" />
          </div>
          <div>
            <label style={labelStyle}>Lecciones Aprendidas</label>
            <textarea style={textareaStyle} value={form.assessment_lecciones_aprendidas} onChange={e => setForm({ ...form, assessment_lecciones_aprendidas: e.target.value })}
              placeholder="¿Qué funcionó? ¿Qué no? ¿Qué se haría diferente?" />
          </div>
          <div>
            <label style={labelStyle}>Recomendaciones para el Futuro</label>
            <textarea style={textareaStyle} value={form.assessment_recomendaciones} onChange={e => setForm({ ...form, assessment_recomendaciones: e.target.value })}
              placeholder="Acciones recomendadas para mantener los resultados o mejorarlos..." />
          </div>
          <div>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.assessment_requiere_nuevo_ciclo}
                onChange={e => setForm({ ...form, assessment_requiere_nuevo_ciclo: e.target.checked })}
                style={{ width: 16, height: 16 }} />
              ¿Requiere un nuevo ciclo SARA? (El problema persiste o se transformó)
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button style={{ ...btnPrimary, background: '#10b981' }} onClick={() => handleGuardarFase(form)}>
            <FileText size={14} /> Guardar Assessment
          </button>
        </div>
      </div>
    );
  };

  // === CERRADO ===
  const renderCerrado = (p) => (
    <div style={{ ...cardStyle, background: '#f9fafb', textAlign: 'center', padding: 30 }}>
      <CheckCircle size={40} color="#10b981" style={{ marginBottom: 10 }} />
      <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.primary, marginBottom: 6 }}>Proyecto SARA Completado</div>
      <div style={{ fontSize: 13, color: '#6b7280' }}>
        Las 4 fases fueron completadas. {p.assessment_requiere_nuevo_ciclo ? 'Se recomienda iniciar un nuevo ciclo SARA.' : 'El problema fue abordado exitosamente.'}
      </div>
    </div>
  );

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================
  return (
    <div style={{ padding: '10px 0' }}>
      {error && (
        <div style={{ ...cardStyle, background: '#fef2f2', borderLeft: '4px solid #ef4444', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#dc2626', fontSize: 13 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>✕</button>
        </div>
      )}

{/* Mapa de Calor */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button onClick={() => setShowMapa(!showMapa)} style={{ ...btnSecondary, padding: '8px 16px', fontSize: 13 }}>
          <MapPin size={15} /> {showMapa ? 'Ocultar Mapa de Calor' : 'Mapa de Calor'}
        </button>
      </div>
      {showMapa && <MapaCalor />}
      <ChecklistCHEERS />
<TrianguloProblema />
      {vista === 'listado' && renderListado()}
      {vista === 'nuevo' && renderFormNuevo()}
      {vista === 'detalle' && renderDetalle()}

      {loading && (
        <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>
          <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
