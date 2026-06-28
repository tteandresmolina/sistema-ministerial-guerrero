// src/pages/ExpedientePolicial.jsx
// Tab 6 — Expediente de Investigación Policial Digital
// Fundamento: Modelo Nacional UDIC Sección 4, CNPP Art. 132

import React, { useState, useMemo } from 'react';
import {
  FileText, Users, Search, Plus, ChevronLeft, Clock, AlertTriangle,
  CheckCircle, XCircle, Filter, Eye, UserPlus, ClipboardList, Activity,
  ArrowRightLeft, Calendar, MapPin, Shield, Target, Briefcase, Hash,
  ChevronDown, ChevronUp, RefreshCw, Bookmark, Flag, FileSearch
} from 'lucide-react';
import { useExpedientePolicial } from '../hooks/useExpedientePolicial';

// ============================================================================
// ESTILOS BASE
// ============================================================================
const COLORS = { primary: '#001a4d', gold: '#b69054', white: '#ffffff', bg: '#f4f6fb' };

const cardStyle = {
  background: COLORS.white, borderRadius: 10, padding: 18,
  boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 14
};
const labelStyle = {
  display: 'block', fontWeight: 600, fontSize: 13, color: COLORS.primary,
  marginBottom: 4
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

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function ExpedientePolicial({ user }) {
  const hook = useExpedientePolicial(user);
  const {
    oficios, personas, acciones, reasignaciones, timeline,
    metricas, oficiosVencidos, loading, error, setError,
    filtroCarpeta, setFiltroCarpeta, filtroEstatus, setFiltroEstatus,
    filtroPrioridad, setFiltroPrioridad,
    fetchOficios, fetchExpedienteCompleto,
    crearOficio, actualizarOficio, asignarOficio,
    crearPersona, actualizarPersona, crearAccion, crearReasignacion,
    getPrioridadColor, getEstatusColor, getEstatusPersonaColor,
    getTipoEventoIcon, formatFecha, calcularHorasRestantes
  } = hook;

  // === VIEW STATE ===
  const [vista, setVista] = useState('listado'); // listado | detalle | nuevo_oficio
  const [oficioSeleccionado, setOficioSeleccionado] = useState(null);
  const [subTab, setSubTab] = useState('datos'); // datos | personas | acciones | timeline
  const [showFormPersona, setShowFormPersona] = useState(false);
  const [showFormAccion, setShowFormAccion] = useState(false);

  // === FORM: NUEVO OFICIO ===
  const emptyOficio = {
    carpeta_investigacion: '', numero_oficio: '', unidad_emisora: '',
    nombre_mp_emisor: '', dirigido_a: '', delito: '', asunto: '',
    descripcion_hechos: '', nombre_victima: '', nombre_imputado: '',
    lugar_hechos: '', folio_911: '', prioridad: 'normal',
    termino_horas: '', fecha_emision: new Date().toISOString().split('T')[0]
  };
  const [formOficio, setFormOficio] = useState(emptyOficio);

  // === FORM: PERSONA INVESTIGADA ===
  const emptyPersona = {
    nombre_completo: '', alias: '', sexo: 'masculino', edad_aparente: '',
    descripcion_fisica: '', domicilio_conocido: '', telefono: '',
    estatus: 'sospechoso', tipo_identificacion: 'investigacion',
    rol_en_hechos: 'por_determinar', evidencia_vinculante: '',
    ultimo_avistamiento: '', observaciones: '',
    ultimo_avistamiento_fecha: '', ultimo_avistamiento_lugar: '', ultimo_avistamiento_descripcion: ''
  };
  const [formPersona, setFormPersona] = useState(emptyPersona);

  // === FORM: ACCIÓN DE INVESTIGACIÓN ===
  const emptyAccion = {
    tipo_accion: 'inspeccion_ocular', lugar_intervencion: '',
    tecnica_metodologia: '', descripcion_actuacion: '', resultados: '',
    instruccion_numero: '', cumple_instruccion: false
  };
  const [formAccion, setFormAccion] = useState(emptyAccion);

  // === HANDLERS ===
  const handleVerExpediente = async (oficio) => {
    setOficioSeleccionado(oficio);
    setVista('detalle');
    setSubTab('datos');
    await fetchExpedienteCompleto(oficio.carpeta_investigacion);
  };

  const handleGuardarOficio = async () => {
    if (!formOficio.carpeta_investigacion || !formOficio.numero_oficio || !formOficio.delito) {
      setError('Carpeta de Investigación, Número de Oficio y Delito son obligatorios');
      return;
    }
    const payload = {
      ...formOficio,
      termino_horas: formOficio.termino_horas ? parseInt(formOficio.termino_horas) : null
    };
    const result = await crearOficio(payload);
    if (result) {
      setFormOficio(emptyOficio);
      setVista('listado');
    }
  };

  const handleGuardarPersona = async () => {
    if (!formPersona.nombre_completo && !formPersona.alias && !formPersona.descripcion_fisica) {
      setError('Ingrese al menos nombre, alias o descripción física');
      return;
    }
    const payload = {
      ...formPersona,
      carpeta_investigacion: oficioSeleccionado.carpeta_investigacion,
      oficio_id: oficioSeleccionado.id,
      edad_aparente: formPersona.edad_aparente ? parseInt(formPersona.edad_aparente) : null,
      ultimo_avistamiento_fecha: formPersona.ultimo_avistamiento_fecha || null,
      ultimo_avistamiento_lugar: formPersona.ultimo_avistamiento_lugar || null,
      ultimo_avistamiento_descripcion: formPersona.ultimo_avistamiento_descripcion || null
    };
    const result = await crearPersona(payload);
    if (result) {
      setFormPersona(emptyPersona);
      setShowFormPersona(false);
    }
  };
  const handleCambiarEstatusPersona = async (persona, nuevoEstatus) => {
    await actualizarPersona(persona.id, { estatus: nuevoEstatus });
  };

  // === CATÁLOGOS ===
  const TIPOS_ACCION = [
    { value: 'inspeccion_ocular', label: 'Inspección Ocular del Lugar' },
    { value: 'inspeccion_personas', label: 'Inspección a Personas' },
    { value: 'inspeccion_vehiculos', label: 'Inspección de Vehículos' },
    { value: 'entrevista_testigos', label: 'Entrevista a Testigos' },
    { value: 'entrevista_victima', label: 'Entrevista a Víctima' },
    { value: 'localizacion_personas', label: 'Búsqueda y Localización de Personas' },
    { value: 'localizacion_lugares', label: 'Localización de Lugares' },
    { value: 'solicitud_videos', label: 'Solicitud de Videos (C4/C5/Particulares)' },
    { value: 'solicitud_informacion', label: 'Requerimiento de Información' },
    { value: 'vigilancia_seguimiento', label: 'Vigilancia y Seguimiento' },
    { value: 'cateo', label: 'Cateo (con Orden Judicial)' },
    { value: 'reconstruccion_hechos', label: 'Reconstrucción de Hechos' },
    { value: 'detencion', label: 'Detención de Persona' },
    { value: 'aseguramiento_bienes', label: 'Aseguramiento de Bienes/Vehículos' },
    { value: 'cumplimiento_orden', label: 'Cumplimiento de Orden de Aprehensión' },
    { value: 'acta_levantamiento', label: 'Acta de Levantamiento de Cadáver' },
    { value: 'acta_aseguramiento', label: 'Acta de Aseguramiento' },
    { value: 'entrega_recepcion_lugar', label: 'Entrega y Recepción del Lugar' },
    { value: 'informe_actividades', label: 'Informe de Actividades' },
    { value: 'entrega_medidas_proteccion', label: 'Entrega de Medidas de Protección' },
    { value: 'coordinacion_mp', label: 'Coordinación con el MP' },
    { value: 'coordinacion_peritos', label: 'Coordinación con Peritos' },
    { value: 'informe_mando', label: 'Informe al Mando Superior' },
    { value: 'otra_accion', label: 'Otra Acción' }
  ];

  // ============================================================================
  // RENDER: MÉTRICAS SUPERIORES
  // ============================================================================
  const renderMetricas = () => {
    if (!metricas) return null;
    const cards = [
      { label: 'Oficios Activos', value: metricas.oficios_activos || 0, icon: FileText, color: '#3b82f6' },
      { label: 'Sin Asignar', value: metricas.oficios_sin_asignar || 0, icon: AlertTriangle, color: '#f59e0b' },
      { label: 'Vencidos', value: metricas.oficios_vencidos || 0, icon: XCircle, color: '#ef4444' },
      { label: 'Cumplidos', value: metricas.oficios_cumplidos || 0, icon: CheckCircle, color: '#10b981' },
      { label: 'Prófugos', value: metricas.personas_profugas || 0, icon: Target, color: '#dc2626' },
      { label: 'Carpetas', value: metricas.carpetas_activas || 0, icon: Briefcase, color: COLORS.primary }
    ];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ ...cardStyle, padding: 14, textAlign: 'center', borderLeft: `4px solid ${c.color}`, marginBottom: 0 }}>
            <c.icon size={20} color={c.color} style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{c.label}</div>
          </div>
        ))}
      </div>
    );
  };

  // ============================================================================
  // RENDER: ALERTA OFICIOS VENCIDOS
  // ============================================================================
  const renderAlertaVencidos = () => {
    const vencidos = oficiosVencidos.filter(o => o.alerta_vencimiento === 'vencido' || o.alerta_vencimiento === 'por_vencer');
    if (vencidos.length === 0) return null;
    return (
      <div style={{ ...cardStyle, background: '#fef2f2', borderLeft: '4px solid #ef4444', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <AlertTriangle size={18} color="#ef4444" />
          <span style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>
            {vencidos.length} oficio(s) vencido(s) o por vencer
          </span>
        </div>
        {vencidos.slice(0, 3).map((o, i) => (
          <div key={i} style={{ fontSize: 12, color: '#7f1d1d', marginBottom: 4 }}>
            <strong>Oficio #{o.numero_oficio}</strong> — C.I. {o.carpeta_investigacion}
            {' · '}{o.nombre_agente_asignado || 'Sin asignar'}
            {o.horas_restantes != null && (
              <span style={{ marginLeft: 6, color: o.horas_restantes < 0 ? '#dc2626' : '#f59e0b' }}>
                ({o.horas_restantes < 0 ? `Venció hace ${Math.abs(Math.round(o.horas_restantes))}h` : `${Math.round(o.horas_restantes)}h restantes`})
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ============================================================================
  // RENDER: FILTROS
  // ============================================================================
  const renderFiltros = () => (
    <div style={{ ...cardStyle, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 200px' }}>
        <label style={labelStyle}>Buscar Carpeta de Investigación</label>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: '#9ca3af' }} />
          <input
            style={{ ...inputStyle, paddingLeft: 32 }}
            placeholder="20 dígitos de la C.I."
            value={filtroCarpeta}
            onChange={e => setFiltroCarpeta(e.target.value)}
          />
        </div>
      </div>
      <div style={{ flex: '0 0 160px' }}>
        <label style={labelStyle}>Estatus</label>
        <select style={selectStyle} value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="recibido">Recibido</option>
          <option value="asignado">Asignado</option>
          <option value="en_investigacion">En Investigación</option>
          <option value="cumplimentado">Cumplimentado</option>
          <option value="vencido">Vencido</option>
          <option value="parcial">Parcial</option>
        </select>
      </div>
      <div style={{ flex: '0 0 160px' }}>
        <label style={labelStyle}>Prioridad</label>
        <select style={selectStyle} value={filtroPrioridad} onChange={e => setFiltroPrioridad(e.target.value)}>
          <option value="todos">Todas</option>
          <option value="normal">Normal</option>
          <option value="urgente">Urgente</option>
          <option value="extraurgente">Extra-Urgente</option>
          <option value="con_termino">Con Término</option>
          <option value="con_multa">Con Multa</option>
        </select>
      </div>
      <button style={btnPrimary} onClick={fetchOficios}>
        <RefreshCw size={15} /> Buscar
      </button>
    </div>
  );

  // ============================================================================
  // RENDER: LISTADO DE OFICIOS
  // ============================================================================
  const renderListadoOficios = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: COLORS.primary, fontSize: 16 }}>
          <FileText size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Oficios de Investigación ({oficios.length})
        </h3>
        {['direccion_general','coordinador_regional','coordinador_zona'].includes(user?.rol) && (
          <button style={btnPrimary} onClick={() => { setFormOficio(emptyOficio); setVista('nuevo_oficio'); }}>
            <Plus size={15} /> Registrar Oficio
          </button>
        )}
      </div>

      {oficios.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          <FileSearch size={40} style={{ marginBottom: 10, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>No se encontraron oficios con los filtros actuales</div>
        </div>
      ) : (
        oficios.map(o => {
          const horasRest = calcularHorasRestantes(o.fecha_vencimiento);
          return (
            <div key={o.id} style={{ ...cardStyle, cursor: 'pointer', borderLeft: `4px solid ${getPrioridadColor(o.prioridad)}`, transition: 'box-shadow 0.2s' }}
              onClick={() => handleVerExpediente(o)}
              onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
              onMouseOut={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: COLORS.primary }}>
                      Oficio #{o.numero_oficio}
                    </span>
                    <span style={badge(getPrioridadColor(o.prioridad))}>{o.prioridad.replace('_', ' ')}</span>
                    <span style={badge(getEstatusColor(o.estatus))}>{o.estatus.replace('_', ' ')}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>
                    <strong>C.I.:</strong> {o.carpeta_investigacion}
                    {' · '}<strong>Delito:</strong> {o.delito}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    <strong>Víctima:</strong> {o.nombre_victima || '—'}
                    {' · '}<strong>Agente:</strong> {o.nombre_agente_asignado || 'Sin asignar'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{formatFecha(o.fecha_recepcion)}</div>
                  {o.termino_horas && (
                    <div style={{ fontSize: 11, marginTop: 4, color: horasRest < 0 ? '#dc2626' : horasRest < 12 ? '#f59e0b' : '#6b7280' }}>
                      <Clock size={12} style={{ verticalAlign: 'middle' }} />
                      {horasRest < 0 ? ` Venció hace ${Math.abs(Math.round(horasRest))}h` : ` ${Math.round(horasRest)}h restantes`}
                    </div>
                  )}
                  <div style={{ marginTop: 6, background: '#e5e7eb', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${o.porcentaje_avance}%`, background: o.porcentaje_avance >= 100 ? '#10b981' : COLORS.gold, borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{o.porcentaje_avance}% avance</div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  // ============================================================================
  // RENDER: FORMULARIO NUEVO OFICIO
  // ============================================================================
  const renderFormularioOficio = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button style={{ ...btnSecondary, padding: '6px 12px' }} onClick={() => setVista('listado')}>
          <ChevronLeft size={16} /> Volver
        </button>
        <h3 style={{ margin: 0, color: COLORS.primary }}>Registrar Oficio de Investigación</h3>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Carpeta de Investigación (20 dígitos) *</label>
            <input style={inputStyle} maxLength={20} placeholder="12030290300463130025"
              value={formOficio.carpeta_investigacion}
              onChange={e => setFormOficio({ ...formOficio, carpeta_investigacion: e.target.value.replace(/\D/g, '') })} />
          </div>
          <div>
            <label style={labelStyle}>Número de Oficio *</label>
            <input style={inputStyle} placeholder="6521"
              value={formOficio.numero_oficio}
              onChange={e => setFormOficio({ ...formOficio, numero_oficio: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Unidad Emisora (MP) *</label>
            <input style={inputStyle} placeholder="Unidad de Atención Temprana 3"
              value={formOficio.unidad_emisora}
              onChange={e => setFormOficio({ ...formOficio, unidad_emisora: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Nombre del Agente del MP</label>
            <input style={inputStyle} placeholder="Nombre del MP que firma"
              value={formOficio.nombre_mp_emisor}
              onChange={e => setFormOficio({ ...formOficio, nombre_mp_emisor: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Dirigido a</label>
            <input style={inputStyle} placeholder="C. Coordinador de Zona del Sector Renacimiento"
              value={formOficio.dirigido_a}
              onChange={e => setFormOficio({ ...formOficio, dirigido_a: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Delito *</label>
            <input style={inputStyle} placeholder="Robo a transeúnte en espacio abierto al público"
              value={formOficio.delito}
              onChange={e => setFormOficio({ ...formOficio, delito: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Asunto</label>
            <input style={inputStyle} placeholder="Se solicita investigación"
              value={formOficio.asunto}
              onChange={e => setFormOficio({ ...formOficio, asunto: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Nombre de la Víctima</label>
            <input style={inputStyle} placeholder="Fernando García Calvo"
              value={formOficio.nombre_victima}
              onChange={e => setFormOficio({ ...formOficio, nombre_victima: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Nombre del Imputado (si se conoce)</label>
            <input style={inputStyle} placeholder="Quien resulte responsable"
              value={formOficio.nombre_imputado}
              onChange={e => setFormOficio({ ...formOficio, nombre_imputado: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Lugar de los Hechos</label>
            <input style={inputStyle} placeholder="Cajero Banco Azteca, Blvd. Vicente Guerrero S/N, Col. Renacimiento"
              value={formOficio.lugar_hechos}
              onChange={e => setFormOficio({ ...formOficio, lugar_hechos: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Descripción de los Hechos</label>
            <textarea style={textareaStyle} placeholder="Narrativa de los hechos según el oficio del MP..."
              value={formOficio.descripcion_hechos}
              onChange={e => setFormOficio({ ...formOficio, descripcion_hechos: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Prioridad</label>
            <select style={selectStyle} value={formOficio.prioridad}
              onChange={e => setFormOficio({ ...formOficio, prioridad: e.target.value })}>
              <option value="normal">Normal</option>
              <option value="urgente">Urgente</option>
              <option value="extraurgente">Extra-Urgente</option>
              <option value="con_termino">Con Término</option>
              <option value="con_multa">Con Multa (CNPP)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Término (horas)</label>
            <input style={inputStyle} type="number" placeholder="48"
              value={formOficio.termino_horas}
              onChange={e => setFormOficio({ ...formOficio, termino_horas: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Fecha de Emisión del Oficio *</label>
            <input style={inputStyle} type="date" value={formOficio.fecha_emision}
              onChange={e => setFormOficio({ ...formOficio, fecha_emision: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Folio 911 (si aplica)</label>
            <input style={inputStyle} placeholder="Folio del reporte 911"
              value={formOficio.folio_911}
              onChange={e => setFormOficio({ ...formOficio, folio_911: e.target.value })} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <button style={btnSecondary} onClick={() => setVista('listado')}>Cancelar</button>
          <button style={btnPrimary} onClick={handleGuardarOficio} disabled={loading}>
            <FileText size={15} /> {loading ? 'Guardando...' : 'Registrar Oficio'}
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: DETALLE DEL EXPEDIENTE
  // ============================================================================
  const renderDetalleExpediente = () => {
    if (!oficioSeleccionado) return null;
    const o = oficioSeleccionado;
    const subTabs = [
      { key: 'datos', label: 'Datos del Oficio', icon: FileText },
      { key: 'personas', label: `Personas (${personas.length})`, icon: Users },
      { key: 'acciones', label: `Acciones (${acciones.length})`, icon: Activity },
      { key: 'timeline', label: 'Timeline', icon: Clock }
    ];

    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <button style={{ ...btnSecondary, padding: '6px 12px' }} onClick={() => { setVista('listado'); setOficioSeleccionado(null); }}>
            <ChevronLeft size={16} /> Volver
          </button>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: COLORS.primary }}>
              Expediente — C.I. {o.carpeta_investigacion}
            </span>
            <span style={{ marginLeft: 10, ...badge(getPrioridadColor(o.prioridad)) }}>{o.prioridad.replace('_',' ')}</span>
            <span style={{ marginLeft: 6, ...badge(getEstatusColor(o.estatus)) }}>{o.estatus.replace('_',' ')}</span>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
          {subTabs.map(t => (
            <button key={t.key}
              style={{
                padding: '8px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                background: subTab === t.key ? COLORS.primary : '#e5e7eb',
                color: subTab === t.key ? COLORS.white : '#374151',
                transition: 'all 0.2s'
              }}
              onClick={() => setSubTab(t.key)}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* Sub-tab content */}
        {subTab === 'datos' && renderDatosOficio()}
        {subTab === 'personas' && renderPersonasInvestigadas()}
        {subTab === 'acciones' && renderAccionesInvestigacion()}
        {subTab === 'timeline' && renderTimeline()}
      </div>
    );
  };

  // === SUB: DATOS DEL OFICIO ===
  const renderDatosOficio = () => {
    const o = oficioSeleccionado;
    const fields = [
      ['Carpeta de Investigación', o.carpeta_investigacion, Hash],
      ['Oficio #', o.numero_oficio, FileText],
      ['Unidad Emisora', o.unidad_emisora, Shield],
      ['Agente del MP', o.nombre_mp_emisor, Users],
      ['Dirigido a', o.dirigido_a, Bookmark],
      ['Delito', o.delito, AlertTriangle],
      ['Víctima', o.nombre_victima, Users],
      ['Imputado', o.nombre_imputado, Target],
      ['Lugar de los Hechos', o.lugar_hechos, MapPin],
      ['Fecha Emisión', o.fecha_emision, Calendar],
      ['Fecha Recepción', formatFecha(o.fecha_recepcion), Clock],
      ['Agente Asignado', o.nombre_agente_asignado || 'Sin asignar', Users],
      ['Avance', `${o.porcentaje_avance}%`, Activity]
    ];

    return (
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {fields.map(([label, value, Icon], i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon size={12} /> {label}
              </div>
              <div style={{ fontSize: 14, color: COLORS.primary, fontWeight: 500, marginTop: 2 }}>
                {value || '—'}
              </div>
            </div>
          ))}
        </div>
        {o.descripcion_hechos && (
          <div style={{ marginTop: 14, padding: 12, background: '#f9fafb', borderRadius: 7 }}>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>Descripción de los Hechos</div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{o.descripcion_hechos}</div>
          </div>
        )}

        {/* Botones de acción para mandos */}
        {o.estatus !== 'cumplimentado' && ['direccion_general','coordinador_regional','coordinador_zona'].includes(user?.rol) && (
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button style={{ ...btnPrimary, background: '#10b981' }}
              onClick={() => actualizarOficio(o.id, { estatus: 'cumplimentado', porcentaje_avance: 100, fecha_cumplimiento: new Date().toISOString() }).then(() => handleVerExpediente({ ...o, estatus: 'cumplimentado', porcentaje_avance: 100 }))}>
              <CheckCircle size={15} /> Marcar Cumplimentado
            </button>
            <button style={{ ...btnPrimary, background: '#3b82f6' }}
              onClick={() => actualizarOficio(o.id, { estatus: 'en_investigacion' }).then(() => handleVerExpediente({ ...o, estatus: 'en_investigacion' }))}>
              <Activity size={15} /> Iniciar Investigación
            </button>
          </div>
        )}
      </div>
    );
  };

  // === SUB: PERSONAS INVESTIGADAS ===
  const renderPersonasInvestigadas = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, color: COLORS.primary, fontSize: 14 }}>
          Personas Investigadas ({personas.length})
        </span>
        <button style={{ ...btnPrimary, padding: '7px 14px', fontSize: 13 }}
          onClick={() => { setFormPersona(emptyPersona); setShowFormPersona(!showFormPersona); }}>
          <UserPlus size={14} /> {showFormPersona ? 'Cancelar' : 'Agregar Persona'}
        </button>
      </div>

      {showFormPersona && (
        <div style={{ ...cardStyle, background: '#fffbeb', borderLeft: '4px solid ' + COLORS.gold }}>
          <div style={{ fontWeight: 700, color: COLORS.primary, marginBottom: 10, fontSize: 14 }}>
            Nueva Persona Investigada
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Nombre Completo</label>
              <input style={inputStyle} placeholder="Nombre o 'No identificado'"
                value={formPersona.nombre_completo} onChange={e => setFormPersona({ ...formPersona, nombre_completo: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Alias</label>
              <input style={inputStyle} placeholder="Apodo conocido"
                value={formPersona.alias} onChange={e => setFormPersona({ ...formPersona, alias: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Sexo</label>
              <select style={selectStyle} value={formPersona.sexo} onChange={e => setFormPersona({ ...formPersona, sexo: e.target.value })}>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="no_binario">No binario</option>
                <option value="no_especificado">No especificado</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Edad Aparente</label>
              <input style={inputStyle} type="number" placeholder="25"
                value={formPersona.edad_aparente} onChange={e => setFormPersona({ ...formPersona, edad_aparente: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Estatus</label>
              <select style={selectStyle} value={formPersona.estatus} onChange={e => setFormPersona({ ...formPersona, estatus: e.target.value })}>
                <option value="sospechoso">Sospechoso</option>
                <option value="identificado">Identificado</option>
                <option value="localizado">Localizado</option>
                <option value="detenido">Detenido</option>
                <option value="profugo">Prófugo</option>
                <option value="descartado">Descartado</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tipo de Identificación</label>
              <select style={selectStyle} value={formPersona.tipo_identificacion} onChange={e => setFormPersona({ ...formPersona, tipo_identificacion: e.target.value })}>
                <option value="flagrancia">Flagrancia</option>
                <option value="testigo_ocular">Testigo Ocular</option>
                <option value="video_evidencia">Video / Evidencia</option>
                <option value="investigacion">Investigación del PIM</option>
                <option value="denuncia">Denuncia</option>
                <option value="confesion">Confesión de co-partícipe</option>
                <option value="forense">Evidencia Forense</option>
                <option value="inteligencia">Trabajo de Inteligencia</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Rol en los Hechos</label>
              <select style={selectStyle} value={formPersona.rol_en_hechos} onChange={e => setFormPersona({ ...formPersona, rol_en_hechos: e.target.value })}>
                <option value="por_determinar">Por Determinar</option>
                <option value="autor_material">Autor Material</option>
                <option value="coautor">Coautor</option>
                <option value="complice">Cómplice</option>
                <option value="instigador">Instigador</option>
                <option value="encubridor">Encubridor</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Domicilio Conocido</label>
              <input style={inputStyle} placeholder="Dirección"
                value={formPersona.domicilio_conocido} onChange={e => setFormPersona({ ...formPersona, domicilio_conocido: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Descripción Física / Media Filiación</label>
              <textarea style={textareaStyle} placeholder="Complexión, tez, estatura, cabello, señas particulares..."
                value={formPersona.descripcion_fisica} onChange={e => setFormPersona({ ...formPersona, descripcion_fisica: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Evidencia que lo Vincula</label>
              <textarea style={textareaStyle} placeholder="Describe la evidencia que vincula a esta persona..."
                value={formPersona.evidencia_vinculante} onChange={e => setFormPersona({ ...formPersona, evidencia_vinculante: e.target.value })} />
            </div>

            {/* Último avistamiento */}
            <div style={{ gridColumn: '1 / -1', borderTop: '2px solid #e8ecf1', paddingTop: 12, marginTop: 4 }}>
              <div style={{ fontWeight: 700, color: COLORS.gold, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} /> ÚLTIMO AVISTAMIENTO
              </div>
            </div>
            <div>
              <label style={labelStyle}>Fecha del avistamiento</label>
              <input style={inputStyle} type="date" value={formPersona.ultimo_avistamiento_fecha} onChange={e => setFormPersona({ ...formPersona, ultimo_avistamiento_fecha: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Lugar del avistamiento</label>
              <input style={inputStyle} placeholder="Colonia, calle, municipio..."
                value={formPersona.ultimo_avistamiento_lugar} onChange={e => setFormPersona({ ...formPersona, ultimo_avistamiento_lugar: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Descripción / Circunstancias</label>
              <textarea style={textareaStyle} placeholder="Cómo fue visto, con quién, en qué vehículo, actividad..."
                value={formPersona.ultimo_avistamiento_descripcion} onChange={e => setFormPersona({ ...formPersona, ultimo_avistamiento_descripcion: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button style={btnPrimary} onClick={handleGuardarPersona} disabled={loading}>
              <UserPlus size={15} /> {loading ? 'Guardando...' : 'Registrar Persona'}
            </button>
          </div>
        </div>
      )}

      {personas.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 30, color: '#9ca3af' }}>
          No hay personas investigadas registradas en esta carpeta
        </div>
      ) : (
        personas.map(p => (
          <div key={p.id} style={{ ...cardStyle, borderLeft: `4px solid ${getEstatusPersonaColor(p.estatus)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.primary, marginBottom: 4 }}>
                  {p.nombre_completo || p.alias || 'No identificado'}
                  {p.alias && p.nombre_completo && <span style={{ fontWeight: 400, color: '#6b7280' }}> alias "{p.alias}"</span>}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={badge(getEstatusPersonaColor(p.estatus))}>{p.estatus}</span>
                  <span>Rol: {(p.rol_en_hechos || 'por_determinar').replace(/_/g, ' ')}</span>
                  <span>ID: {(p.tipo_identificacion || '—').replace(/_/g, ' ')}</span>
                </div>
                {p.descripcion_fisica && <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>{p.descripcion_fisica}</div>}
                {p.evidencia_vinculante && <div style={{ fontSize: 12, color: '#374151', marginTop: 4, fontStyle: 'italic' }}>Evidencia: {p.evidencia_vinculante}</div>}
                {(p.ultimo_avistamiento_fecha || p.ultimo_avistamiento_lugar) && (
                  <div style={{ fontSize: 12, color: '#92400e', marginTop: 6, padding: '6px 10px', background: '#fffbeb', borderRadius: 6, border: '1px solid #fbbf2440', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={12} />
                    <span style={{ fontWeight: 600 }}>Último avistamiento:</span>
                    {p.ultimo_avistamiento_fecha && <span>{p.ultimo_avistamiento_fecha}</span>}
                    {p.ultimo_avistamiento_lugar && <span>— {p.ultimo_avistamiento_lugar}</span>}
                    {p.ultimo_avistamiento_descripcion && <span style={{ fontStyle: 'italic' }}>({p.ultimo_avistamiento_descripcion})</span>}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af', minWidth: 80 }}>
                {p.sexo !== 'no_especificado' && <div>{p.sexo === 'masculino' ? '♂' : p.sexo === 'femenino' ? '♀' : '⚧'} {p.edad_aparente && `~${p.edad_aparente} años`}</div>}
                <div>{formatFecha(p.created_at)}</div>
              </div>
            </div>

            {/* Cambiar estatus */}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e8ecf1', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Cambiar estatus:</span>
              {['sospechoso', 'identificado', 'localizado', 'detenido', 'profugo', 'descartado'].filter(s => s !== p.estatus).map(s => (
                <button key={s} onClick={() => handleCambiarEstatusPersona(p, s)}
                  style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: `1px solid ${getEstatusPersonaColor(s)}30`, background: getEstatusPersonaColor(s) + '15', color: getEstatusPersonaColor(s), textTransform: 'uppercase' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

  // === SUB: ACCIONES DE INVESTIGACIÓN ===
  const renderAccionesInvestigacion = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, color: COLORS.primary, fontSize: 14 }}>
          Acciones de Investigación ({acciones.length})
        </span>
        <button style={{ ...btnPrimary, padding: '7px 14px', fontSize: 13 }}
          onClick={() => { setFormAccion(emptyAccion); setShowFormAccion(!showFormAccion); }}>
          <ClipboardList size={14} /> {showFormAccion ? 'Cancelar' : 'Nueva Acción'}
        </button>
      </div>

      {/* Form */}
      {showFormAccion && (
        <div style={{ ...cardStyle, background: '#f0fdf4', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontWeight: 700, color: COLORS.primary, marginBottom: 10, fontSize: 14 }}>
            Registrar Acción de Investigación (Modelo Nacional UDIC)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Tipo de Acción (CNPP Art. 132) *</label>
              <select style={selectStyle} value={formAccion.tipo_accion}
                onChange={e => setFormAccion({ ...formAccion, tipo_accion: e.target.value })}>
                {TIPOS_ACCION.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Lugar de Intervención *</label>
              <input style={inputStyle} placeholder="Dónde se realizó la acción"
                value={formAccion.lugar_intervencion} onChange={e => setFormAccion({ ...formAccion, lugar_intervencion: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Técnica / Metodología Aplicada</label>
              <input style={inputStyle} placeholder="Ej: Entrevista directa, revisión documental..."
                value={formAccion.tecnica_metodologia} onChange={e => setFormAccion({ ...formAccion, tecnica_metodologia: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Instrucción # del Oficio que Cumple</label>
              <input style={inputStyle} type="number" placeholder="1, 2, 3..."
                value={formAccion.instruccion_numero} onChange={e => setFormAccion({ ...formAccion, instruccion_numero: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Descripción de la Actuación *</label>
              <textarea style={{ ...textareaStyle, minHeight: 90 }} placeholder="Describa detalladamente la acción realizada, conforme al Modelo Nacional..."
                value={formAccion.descripcion_actuacion} onChange={e => setFormAccion({ ...formAccion, descripcion_actuacion: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Resultados Obtenidos</label>
              <textarea style={textareaStyle} placeholder="Resultados de la acción..."
                value={formAccion.resultados} onChange={e => setFormAccion({ ...formAccion, resultados: e.target.value })} />
            </div>
            <div>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={formAccion.cumple_instruccion}
                  onChange={e => setFormAccion({ ...formAccion, cumple_instruccion: e.target.checked })} />
                Esta acción cumplimenta una instrucción del MP
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button style={btnPrimary} onClick={handleGuardarAccion} disabled={loading}>
              <ClipboardList size={15} /> {loading ? 'Guardando...' : 'Registrar Acción'}
            </button>
          </div>
        </div>
      )}

      {/* Lista cronológica */}
      {acciones.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 30, color: '#9ca3af' }}>
          No hay acciones de investigación registradas
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          {/* Línea vertical del timeline */}
          <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 2, background: '#d1d5db' }} />
          {acciones.map((a, i) => (
            <div key={a.id} style={{ position: 'relative', marginBottom: 12 }}>
              {/* Dot */}
              <div style={{
                position: 'absolute', left: -20, top: 8, width: 14, height: 14,
                borderRadius: '50%', background: a.cumple_instruccion ? '#10b981' : COLORS.gold,
                border: '3px solid ' + COLORS.white, boxShadow: '0 0 0 2px ' + (a.cumple_instruccion ? '#10b981' : COLORS.gold)
              }} />
              <div style={{ ...cardStyle, marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.primary, marginBottom: 4 }}>
                      #{i + 1} — {TIPOS_ACCION.find(t => t.value === a.tipo_accion)?.label || a.tipo_accion}
                      {a.cumple_instruccion && <span style={{ ...badge('#10b981'), marginLeft: 8 }}>Instrucción #{a.instruccion_numero} cumplida</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>{a.descripcion_actuacion}</div>
                    {a.resultados && <div style={{ fontSize: 12, color: '#059669', fontStyle: 'italic' }}>Resultados: {a.resultados}</div>}
                    {a.tecnica_metodologia && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Técnica: {a.tecnica_metodologia}</div>}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af', minWidth: 100 }}>
                    <div>{formatFecha(a.fecha_hora_inicio)}</div>
                    <div><MapPin size={10} style={{ verticalAlign: 'middle' }} /> {a.lugar_intervencion}</div>
                    <div>{a.nombre_agente}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // === SUB: TIMELINE UNIFICADO ===
  const renderTimeline = () => (
    <div>
      <div style={{ fontWeight: 700, color: COLORS.primary, fontSize: 14, marginBottom: 10 }}>
        <Clock size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
        Timeline Cronológico del Expediente
      </div>
      {timeline.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 30, color: '#9ca3af' }}>
          Sin eventos registrados en esta carpeta
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 30 }}>
          <div style={{ position: 'absolute', left: 14, top: 0, bottom: 0, width: 2, background: '#d1d5db' }} />
          {timeline.map((ev, i) => {
            const colorMap = {
              'oficio_mp': COLORS.primary,
              'accion_investigacion': COLORS.gold,
              'persona_investigada': '#8b5cf6',
              'reasignacion': '#6366f1'
            };
            const dotColor = colorMap[ev.tipo_evento] || '#6b7280';
            return (
              <div key={i} style={{ position: 'relative', marginBottom: 10 }}>
                <div style={{
                  position: 'absolute', left: -22, top: 8, width: 16, height: 16,
                  borderRadius: '50%', background: dotColor, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 10
                }}>
                  <span style={{ color: COLORS.white, fontSize: 9 }}>{getTipoEventoIcon(ev.tipo_evento)}</span>
                </div>
                <div style={{ ...cardStyle, marginBottom: 0, padding: 12, borderLeft: `3px solid ${dotColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.primary }}>{ev.titulo}</div>
                      {ev.descripcion && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{ev.descripcion}</div>}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af', minWidth: 90 }}>
                      <div>{formatFecha(ev.fecha_evento)}</div>
                      <div>{ev.responsable || '—'}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================
  return (
    <div style={{ padding: '10px 0' }}>
      {/* Error banner */}
      {error && (
        <div style={{ ...cardStyle, background: '#fef2f2', borderLeft: '4px solid #ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#dc2626', fontSize: 13 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>✕</button>
        </div>
      )}

      {vista === 'listado' && (
        <>
          {renderMetricas()}
          {renderAlertaVencidos()}
          {renderFiltros()}
          {renderListadoOficios()}
        </>
      )}
      {vista === 'nuevo_oficio' && renderFormularioOficio()}
      {vista === 'detalle' && renderDetalleExpediente()}

      {loading && (
        <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>
          <RefreshCw size={20} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
