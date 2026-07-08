// src/pages/OficialiaPartes.jsx
// Oficialía de Partes Virtual — Puerta de entrada documental
// Registran/asignan: coordinador de zona, regional, director general
// Flujo: pendiente → ENTERADO (acuse) → en_tramite → concluido

import React, { useState } from 'react';
import {
  Inbox, FileText, Scale, ClipboardList, Plus, ChevronLeft, Clock,
  AlertTriangle, CheckCircle, RefreshCw, Search, User, UserCheck,
  Calendar, Hash, Building2, Flag, ArrowRightLeft, Eye, BellRing,
} from 'lucide-react';
import { useOficialiaPartes } from '../hooks/useOficialiaPartes';

const COLORS = { primary: '#001a4d', gold: '#b69054', white: '#ffffff', bg: '#f4f6fb' };
const cardStyle = { background: COLORS.white, borderRadius: 10, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 14 };
const labelStyle = { display: 'block', fontWeight: 600, fontSize: 13, color: COLORS.primary, marginBottom: 4 };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 7, border: '1.5px solid #c7cfe0', fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' };
const selectStyle = { ...inputStyle, background: COLORS.white };
const textareaStyle = { ...inputStyle, minHeight: 70, resize: 'vertical' };
const btnPrimary = { background: COLORS.gold, color: COLORS.white, border: 'none', borderRadius: 7, padding: '10px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 };
const btnSecondary = { ...btnPrimary, background: 'transparent', color: COLORS.primary, border: `1.5px solid ${COLORS.primary}` };
const badge = (color) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, color: COLORS.white, background: color, textTransform: 'uppercase', letterSpacing: 0.5 });

const TIPOS_DOC = [
  { value: 'oficio_investigacion', label: 'Oficio de Investigación del MP', icon: FileText, desc: 'Instrucciones del MP al PIM — se asigna al agente de guardia' },
  { value: 'oficio_administrativo', label: 'Oficio Administrativo Institucional', icon: ClipboardList, desc: 'Memorándums, circulares, comisiones' },
  { value: 'amparo_judicial', label: 'Amparo / Requerimiento Judicial', icon: Scale, desc: 'URGENTE — plazo legal de respuesta' },
];

export default function OficialiaPartes({ perfil }) {
  const hook = useOficialiaPartes(perfil);
  const {
    documentos, agentes, loading, error, setError,
    filtroTipo, setFiltroTipo, filtroEstatus, setFiltroEstatus,
    fetchDocumentos, crearDocumento, acusarEnterado, actualizarEstatus, reasignar,
    metricas, esMando,
    getTipoLabel, getTipoColor, getEstatusColor, getPrioridadColor, formatFecha, horasRestantes,
  } = hook;

  const [vista, setVista] = useState('bandeja');
  const [docSeleccionado, setDocSeleccionado] = useState(null);
  const [reasignando, setReasignando] = useState(false);
  const [nuevoAgente, setNuevoAgente] = useState('');

  const emptyForm = {
    tipo_documento: 'oficio_investigacion',
    carpeta_investigacion: '', numero_oficio: '', unidad_emisora: '',
    nombre_emisor: '', asunto: '', descripcion: '',
    fecha_documento: new Date().toISOString().split('T')[0],
    prioridad: 'normal', plazo_horas: '', asignado_a: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [archivo, setArchivo] = useState(null);

  const handleGuardar = async () => {
    if (!form.tipo_documento || !form.asunto || !form.asignado_a) {
      setError('Tipo de documento, asunto y agente asignado son obligatorios');
      return;
    }
    if (form.tipo_documento === 'oficio_investigacion' && !form.carpeta_investigacion) {
      setError('Los oficios de investigación requieren Carpeta de Investigación (C.I.)');
      return;
    }
    if (form.tipo_documento === 'amparo_judicial' && !form.plazo_horas) {
      setError('Los amparos y requerimientos judiciales requieren plazo en horas');
      return;
    }
    const result = await crearDocumento(form, archivo);
    if (result) { setForm(emptyForm); setArchivo(null); setVista('bandeja'); }
  };

  const handleAcuse = async (doc) => {
    const ok = await acusarEnterado(doc);
    if (ok && docSeleccionado?.id === doc.id) setDocSeleccionado({ ...doc, estatus: 'enterado', fecha_acuse: new Date().toISOString(), acuse_por: perfil?.nombre_completo });
  };

  const handleEstatus = async (doc, nuevo) => {
    const ok = await actualizarEstatus(doc, nuevo);
    if (ok && docSeleccionado?.id === doc.id) setDocSeleccionado({ ...doc, estatus: nuevo });
  };

  const handleReasignar = async () => {
    if (!nuevoAgente) { setError('Selecciona el agente'); return; }
    const ok = await reasignar(docSeleccionado, nuevoAgente);
    if (ok) { setReasignando(false); setNuevoAgente(''); setVista('bandeja'); setDocSeleccionado(null); }
  };

  // ── MÉTRICAS ─────────────────────────────────────────────────────
  const renderMetricas = () => {
    const cards = [
      { label: 'Pendientes de Acuse', value: metricas.pendientes, icon: BellRing, color: '#f59e0b' },
      { label: 'Enterados', value: metricas.enterados, icon: UserCheck, color: '#3b82f6' },
      { label: 'En Trámite', value: metricas.en_tramite, icon: RefreshCw, color: '#8b5cf6' },
      { label: 'Concluidos', value: metricas.concluidos, icon: CheckCircle, color: '#10b981' },
      { label: 'Vencidos', value: metricas.vencidos, icon: AlertTriangle, color: '#ef4444' },
      { label: 'Amparos Activos', value: metricas.amparos_activos, icon: Scale, color: '#dc2626' },
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

  // ── ALERTA DE VENCIDOS / POR VENCER ──────────────────────────────
  const renderAlertas = () => {
    const criticos = documentos.filter(d => {
      if (d.estatus === 'concluido' || !d.fecha_limite) return false;
      const h = horasRestantes(d.fecha_limite);
      return h !== null && h < 12;
    });
    if (criticos.length === 0) return null;
    return (
      <div style={{ ...cardStyle, background: '#fef2f2', borderLeft: '4px solid #ef4444' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <AlertTriangle size={18} color="#ef4444" />
          <span style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>{criticos.length} documento(s) vencido(s) o por vencer</span>
        </div>
        {criticos.slice(0, 4).map((d, i) => {
          const h = horasRestantes(d.fecha_limite);
          return (
            <div key={i} style={{ fontSize: 12, color: '#7f1d1d', marginBottom: 4 }}>
              <strong>{d.folio_interno}</strong> — {getTipoLabel(d.tipo_documento)} · {d.nombre_asignado || 'Sin asignar'}
              <span style={{ marginLeft: 6, color: h < 0 ? '#dc2626' : '#f59e0b', fontWeight: 700 }}>
                ({h < 0 ? `Venció hace ${Math.abs(Math.round(h))}h` : `${Math.round(h)}h restantes`})
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // ── FILTROS ──────────────────────────────────────────────────────
  const renderFiltros = () => (
    <div style={{ ...cardStyle, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 200px' }}>
        <label style={labelStyle}>Tipo de documento</label>
        <select style={selectStyle} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="oficio_investigacion">Oficio de Investigación</option>
          <option value="oficio_administrativo">Oficio Administrativo</option>
          <option value="amparo_judicial">Amparo / Judicial</option>
        </select>
      </div>
      <div style={{ flex: '0 0 180px' }}>
        <label style={labelStyle}>Estatus</label>
        <select style={selectStyle} value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="pendiente">Pendiente de acuse</option>
          <option value="enterado">Enterado</option>
          <option value="en_tramite">En trámite</option>
          <option value="concluido">Concluido</option>
        </select>
      </div>
      <button style={btnPrimary} onClick={fetchDocumentos}><RefreshCw size={15} /> Actualizar</button>
    </div>
  );

  // ── BANDEJA (listado) ────────────────────────────────────────────
  const renderBandeja = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: COLORS.primary, fontSize: 16 }}>
          <Inbox size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {esMando ? `Bandeja Documental (${documentos.length})` : `Mis Documentos Asignados (${documentos.length})`}
        </h3>
        {esMando && (
          <button style={btnPrimary} onClick={() => { setForm(emptyForm); setArchivo(null); setVista('nuevo'); }}>
            <Plus size={15} /> Registrar Documento
          </button>
        )}
      </div>

      {documentos.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          <Inbox size={40} style={{ marginBottom: 10, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>{esMando ? 'No hay documentos con los filtros actuales' : 'No tienes documentos asignados'}</div>
        </div>
      ) : (
        documentos.map(d => {
          const h = horasRestantes(d.fecha_limite);
          const TipoIcon = TIPOS_DOC.find(t => t.value === d.tipo_documento)?.icon || FileText;
          return (
            <div key={d.id} style={{ ...cardStyle, cursor: 'pointer', borderLeft: `4px solid ${getTipoColor(d.tipo_documento)}`, transition: 'box-shadow 0.2s' }}
              onClick={() => { setDocSeleccionado(d); setVista('detalle'); setReasignando(false); }}
              onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
              onMouseOut={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <TipoIcon size={16} color={getTipoColor(d.tipo_documento)} />
                    <span style={{ fontWeight: 800, fontSize: 14, color: COLORS.primary, fontFamily: 'monospace' }}>{d.folio_interno}</span>
                    <span style={badge(getEstatusColor(d.estatus))}>{(d.estatus || '').replace('_', ' ')}</span>
                    {d.prioridad !== 'normal' && <span style={badge(getPrioridadColor(d.prioridad))}>{d.prioridad}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#374151', fontWeight: 600, marginBottom: 4 }}>{d.asunto}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {getTipoLabel(d.tipo_documento)}
                    {d.carpeta_investigacion && <span style={{ fontFamily: 'monospace' }}> · C.I. {d.carpeta_investigacion}</span>}
                    {d.numero_oficio && <span> · Oficio #{d.numero_oficio}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    <User size={11} style={{ verticalAlign: 'middle' }} /> Asignado: <strong>{d.nombre_asignado || 'Sin asignar'}</strong>
                    {d.fecha_acuse && <span style={{ color: '#3b82f6' }}> · ✓ Enterado {formatFecha(d.fecha_acuse)}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 130 }}>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Recibido: {formatFecha(d.fecha_recepcion)}</div>
                  {d.fecha_limite && d.estatus !== 'concluido' && (
                    <div style={{ fontSize: 11, marginTop: 4, fontWeight: 700, color: h < 0 ? '#dc2626' : h < 12 ? '#f59e0b' : '#6b7280' }}>
                      <Clock size={12} style={{ verticalAlign: 'middle' }} />
                      {h < 0 ? ` Venció hace ${Math.abs(Math.round(h))}h` : ` ${Math.round(h)}h restantes`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  // ── FORMULARIO DE REGISTRO (solo mandos) ─────────────────────────
  const renderFormulario = () => {
    const tipoSel = TIPOS_DOC.find(t => t.value === form.tipo_documento);
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button style={{ ...btnSecondary, padding: '6px 12px' }} onClick={() => setVista('bandeja')}><ChevronLeft size={16} /> Volver</button>
          <h3 style={{ margin: 0, color: COLORS.primary }}>Registrar Documento en Oficialía</h3>
        </div>

        <div style={cardStyle}>
          {/* Selector de tipo */}
          <div style={{ fontWeight: 700, color: COLORS.gold, fontSize: 13, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Tipo de Documento</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
            {TIPOS_DOC.map(t => (
              <button key={t.value} type="button" onClick={() => setForm({ ...form, tipo_documento: t.value })}
                style={{
                  textAlign: 'left', padding: 12, borderRadius: 10, cursor: 'pointer',
                  border: form.tipo_documento === t.value ? `2px solid ${getTipoColor(t.value)}` : '1.5px solid #c7cfe0',
                  background: form.tipo_documento === t.value ? getTipoColor(t.value) + '10' : COLORS.white,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: getTipoColor(t.value) }}>
                  <t.icon size={16} /> {t.label}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{t.desc}</div>
              </button>
            ))}
          </div>

          {form.tipo_documento === 'amparo_judicial' && (
            <div style={{ background: '#fef2f2', border: '1px solid #ef444440', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12, color: '#7f1d1d', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Scale size={16} color="#dc2626" />
              Los amparos y requerimientos judiciales tienen plazo legal obligatorio. Captura el plazo en horas para activar el semáforo.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {form.tipo_documento === 'oficio_investigacion' && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Carpeta de Investigación (C.I.) *</label>
                <input style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: 1 }} maxLength={25}
                  placeholder="20 dígitos" value={form.carpeta_investigacion}
                  onChange={e => setForm({ ...form, carpeta_investigacion: e.target.value.replace(/\D/g, '') })} />
              </div>
            )}
            <div><label style={labelStyle}>Número de Oficio</label><input style={inputStyle} placeholder="6521" value={form.numero_oficio} onChange={e => setForm({ ...form, numero_oficio: e.target.value })} /></div>
            <div><label style={labelStyle}>Fecha del Documento</label><input style={inputStyle} type="date" value={form.fecha_documento} onChange={e => setForm({ ...form, fecha_documento: e.target.value })} /></div>
            <div><label style={labelStyle}>Unidad / Autoridad Emisora</label><input style={inputStyle} placeholder="Unidad de Atención Temprana 3, Juzgado..." value={form.unidad_emisora} onChange={e => setForm({ ...form, unidad_emisora: e.target.value })} /></div>
            <div><label style={labelStyle}>Nombre de quien firma</label><input style={inputStyle} placeholder="Nombre del MP / Juez / Autoridad" value={form.nombre_emisor} onChange={e => setForm({ ...form, nombre_emisor: e.target.value })} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Asunto *</label><input style={inputStyle} placeholder="Se solicita investigación / Requerimiento de informe..." value={form.asunto} onChange={e => setForm({ ...form, asunto: e.target.value })} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Descripción / Instrucciones</label><textarea style={textareaStyle} placeholder="Detalle de las instrucciones contenidas en el documento..." value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>

            <div style={{ gridColumn: '1 / -1', borderTop: '2px solid #e8ecf1', paddingTop: 14 }}>
              <div style={{ fontWeight: 700, color: COLORS.gold, fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Prioridad, Plazo y Asignación</div>
            </div>
            <div>
              <label style={labelStyle}>Prioridad</label>
              <select style={selectStyle} value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })}>
                <option value="normal">Normal</option>
                <option value="urgente">Urgente</option>
                <option value="extraurgente">Extra-Urgente</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Plazo (horas) {form.tipo_documento === 'amparo_judicial' && '*'}</label>
              <input style={inputStyle} type="number" placeholder="48" value={form.plazo_horas} onChange={e => setForm({ ...form, plazo_horas: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Asignar al Agente *</label>
              <select style={selectStyle} value={form.asignado_a} onChange={e => setForm({ ...form, asignado_a: e.target.value })}>
                <option value="">— Seleccionar agente —</option>
                {agentes.map(a => <option key={a.id} value={a.id}>{a.nombre_completo}{a.grado ? ` — ${a.grado}` : ''}{a.zona ? ` (${a.zona})` : ''}</option>)}
              </select>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>El agente recibirá el documento en su bandeja y deberá confirmar ENTERADO.</div>
            </div>
          </div>

          {/* Archivo escaneado */}
          <div style={{ borderTop: '2px solid #e8ecf1', paddingTop: 14, marginTop: 18 }}>
            <div style={{ fontWeight: 700, color: COLORS.gold, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
              <FileText size={14} /> Documento Escaneado
            </div>
            <p style={{ fontSize: 11, color: '#666', marginBottom: 10 }}>Sube el documento debidamente acusado con sellos y firmas. Formatos: PDF, JPG, PNG · Máximo 5MB</p>
            <div style={{ border: '2px dashed #c7cfe0', borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer', background: COLORS.bg }}
              onClick={() => document.getElementById('file-opv').click()}>
              <FileText size={24} color="#999" />
              <p style={{ fontSize: 12, color: '#999', margin: '6px 0 0 0' }}>Clic para seleccionar archivo</p>
              <input id="file-opv" type="file" accept="image/jpeg,image/png,application/pdf" style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files[0];
                  if (f) {
                    if (f.size > 5 * 1024 * 1024) { setError('El archivo excede 5MB'); return; }
                    setArchivo(f);
                  }
                }} />
            </div>
            {archivo && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #22c55e44', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#085041' }}>{archivo.name} ({(archivo.size / 1024).toFixed(0)} KB)</span>
                <button onClick={() => setArchivo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', fontSize: 12 }}>✕</button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={() => setVista('bandeja')}>Cancelar</button>
            <button style={btnPrimary} onClick={handleGuardar} disabled={loading}>
              <Inbox size={15} /> {loading ? 'Registrando...' : 'Registrar y Asignar'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── DETALLE DEL DOCUMENTO ────────────────────────────────────────
  const renderDetalle = () => {
    if (!docSeleccionado) return null;
    const d = docSeleccionado;
    const h = horasRestantes(d.fecha_limite);
    const esAsignado = perfil?.id === d.asignado_a;
    const fields = [
      ['Folio Interno', d.folio_interno, Hash],
      ['Tipo', getTipoLabel(d.tipo_documento), FileText],
      ['C.I.', d.carpeta_investigacion, Hash],
      ['Oficio #', d.numero_oficio, FileText],
      ['Autoridad Emisora', d.unidad_emisora, Building2],
      ['Firma', d.nombre_emisor, User],
      ['Fecha del documento', d.fecha_documento, Calendar],
      ['Recibido en Oficialía', formatFecha(d.fecha_recepcion), Clock],
      ['Registró', d.registrado_por, UserCheck],
      ['Asignado a', d.nombre_asignado, User],
      ['Acuse de enterado', d.fecha_acuse ? `${formatFecha(d.fecha_acuse)} — ${d.acuse_por}` : 'Sin acuse', Flag],
      ['Concluido', d.fecha_conclusion ? formatFecha(d.fecha_conclusion) : null, CheckCircle],
    ];

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <button style={{ ...btnSecondary, padding: '6px 12px' }} onClick={() => { setVista('bandeja'); setDocSeleccionado(null); }}><ChevronLeft size={16} /> Volver</button>
          <span style={{ fontWeight: 800, fontSize: 16, color: COLORS.primary, fontFamily: 'monospace' }}>{d.folio_interno}</span>
          <span style={badge(getEstatusColor(d.estatus))}>{(d.estatus || '').replace('_', ' ')}</span>
          {d.prioridad !== 'normal' && <span style={badge(getPrioridadColor(d.prioridad))}>{d.prioridad}</span>}
        </div>

        {d.fecha_limite && d.estatus !== 'concluido' && (
          <div style={{ ...cardStyle, background: h < 0 ? '#fef2f2' : h < 12 ? '#fffbeb' : '#f0fdf4', borderLeft: `4px solid ${h < 0 ? '#ef4444' : h < 12 ? '#f59e0b' : '#22c55e'}`, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
            <Clock size={16} color={h < 0 ? '#dc2626' : h < 12 ? '#b45309' : '#085041'} />
            <span style={{ fontSize: 13, fontWeight: 700, color: h < 0 ? '#dc2626' : h < 12 ? '#b45309' : '#085041' }}>
              {h < 0 ? `PLAZO VENCIDO hace ${Math.abs(Math.round(h))} horas` : `Plazo: ${Math.round(h)} horas restantes (límite ${formatFecha(d.fecha_limite)})`}
            </span>
          </div>
        )}

        <div style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 10 }}>{d.asunto}</div>
          {d.descripcion && <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 14, padding: 12, background: '#f9fafb', borderRadius: 7 }}>{d.descripcion}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {fields.filter(f => f[1]).map(([label, value, Icon], i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Icon size={12} /> {label}</div>
                <div style={{ fontSize: 14, color: COLORS.primary, fontWeight: 500, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
          {d.archivo_url && (
            <a href={d.archivo_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, background: '#f5ede0', border: '1px solid #b6905440', borderRadius: 7, padding: '10px 16px', color: COLORS.primary, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              <Eye size={15} color={COLORS.gold} /> Ver documento escaneado {d.nombre_archivo ? `(${d.nombre_archivo})` : ''}
            </a>
          )}
        </div>

        {/* ── ACCIONES según rol y estatus ── */}
        <div style={cardStyle}>
          <div style={{ fontWeight: 700, color: COLORS.gold, fontSize: 13, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Acciones</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>

            {esAsignado && d.estatus === 'pendiente' && (
              <button style={{ ...btnPrimary, background: '#3b82f6' }} onClick={() => handleAcuse(d)} disabled={loading}>
                <UserCheck size={15} /> CONFIRMAR ENTERADO
              </button>
            )}

            {esAsignado && d.estatus === 'enterado' && (
              <button style={{ ...btnPrimary, background: '#8b5cf6' }} onClick={() => handleEstatus(d, 'en_tramite')} disabled={loading}>
                <RefreshCw size={15} /> Iniciar Trámite / Investigación
              </button>
            )}

            {(esAsignado || esMando) && (d.estatus === 'en_tramite' || d.estatus === 'enterado') && (
              <button style={{ ...btnPrimary, background: '#10b981' }} onClick={() => handleEstatus(d, 'concluido')} disabled={loading}>
                <CheckCircle size={15} /> Marcar Concluido
              </button>
            )}

            {esMando && d.estatus !== 'concluido' && (
              <button style={btnSecondary} onClick={() => setReasignando(!reasignando)}>
                <ArrowRightLeft size={15} /> {reasignando ? 'Cancelar reasignación' : 'Reasignar'}
              </button>
            )}
          </div>

          {d.estatus === 'pendiente' && !esAsignado && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>Esperando acuse de enterado de <strong>{d.nombre_asignado}</strong>.</div>
          )}

          {reasignando && (
            <div style={{ marginTop: 14, padding: 14, background: '#fffbeb', borderRadius: 8, borderLeft: `4px solid ${COLORS.gold}` }}>
              <label style={labelStyle}>Nuevo agente asignado</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <select style={{ ...selectStyle, flex: '1 1 250px', width: 'auto' }} value={nuevoAgente} onChange={e => setNuevoAgente(e.target.value)}>
                  <option value="">— Seleccionar agente —</option>
                  {agentes.map(a => <option key={a.id} value={a.id}>{a.nombre_completo}{a.grado ? ` — ${a.grado}` : ''}{a.zona ? ` (${a.zona})` : ''}</option>)}
                </select>
                <button style={btnPrimary} onClick={handleReasignar} disabled={loading}><ArrowRightLeft size={15} /> Confirmar</button>
              </div>
              <div style={{ fontSize: 11, color: '#854f0b', marginTop: 6 }}>Al reasignar, el estatus regresa a PENDIENTE y el nuevo agente deberá confirmar enterado.</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── RENDER PRINCIPAL ─────────────────────────────────────────────
  return (
    <div style={{ padding: '10px 0' }}>
      {error && (
        <div style={{ ...cardStyle, background: '#fef2f2', borderLeft: '4px solid #ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#dc2626', fontSize: 13 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>✕</button>
        </div>
      )}
      {vista === 'bandeja' && (<>{renderMetricas()}{renderAlertas()}{renderFiltros()}{renderBandeja()}</>)}
      {vista === 'nuevo' && esMando && renderFormulario()}
      {vista === 'detalle' && renderDetalle()}
      {loading && vista === 'bandeja' && (
        <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>
          <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
