// src/pages/IndiciosEvidencia.jsx
// Tab 4 — Indicios y Evidencia (Cadena de Custodia)
// Sistema Ministerial — FGE Guerrero — Módulo 2
// Fundamento: Guía Nacional de Cadena de Custodia (CNSP)

import { useState, useEffect } from 'react';
import {
  Package, Clock, AlertTriangle, CheckCircle2, Plus, Search, X, Send,
  RefreshCw, Eye, Shield, FileText, Link2, MapPin, ChevronDown, ChevronUp,
  ArrowRight, Crosshair, Zap, Lock,
} from 'lucide-react';
import { useIndiciosEvidencia } from '../hooks/useIndiciosEvidencia';

const C = {
  darkBlue: '#001a4d', gold: '#b69054', lightGold: '#f5ede0',
  white: '#ffffff', bg: '#f4f6fb', gray: '#666666', lightGray: '#e8ecf1',
  green: '#28a745', yellow: '#ffc107', red: '#dc3545', orange: '#fd7e14',
};

const TIPOLOGIAS = [
  { key: 'balistico', label: 'Balístico' }, { key: 'narcoticos', label: 'Narcóticos' },
  { key: 'arma_fuego', label: 'Arma de fuego' }, { key: 'arma_blanca', label: 'Arma blanca' },
  { key: 'tecnologico', label: 'Tecnológico' }, { key: 'vehiculo', label: 'Vehículo' },
  { key: 'documento', label: 'Documento' }, { key: 'biologico', label: 'Biológico' },
  { key: 'huella_dactilar', label: 'Huella dactilar' }, { key: 'huella_calzado', label: 'Huella de calzado' },
  { key: 'fibra_textil', label: 'Fibra textil' }, { key: 'fluido_corporal', label: 'Fluido corporal' },
  { key: 'dinero', label: 'Dinero/Numerario' }, { key: 'digital', label: 'Digital' },
  { key: 'otro', label: 'Otro' },
];

const ORIGENES = [
  { key: 'localizacion', label: 'Localización', desc: 'Ubicado en el lugar de intervención' },
  { key: 'descubrimiento', label: 'Descubrimiento', desc: 'Encontrado en inspección de persona/vehículo/inmueble' },
  { key: 'aportacion', label: 'Aportación', desc: 'Entregado por particular a servidor público' },
];

const ESTATUS_CONFIG = {
  recolectado: { label: 'Recolectado', bg: '#e3f2fd', color: '#1565c0' },
  embalado: { label: 'Embalado', bg: '#e8f5e9', color: '#2e7d32' },
  en_traslado: { label: 'En traslado', bg: '#fff3e0', color: '#e65100' },
  en_laboratorio: { label: 'En laboratorio', bg: '#f3e5f5', color: '#6a1b9a' },
  en_bodega: { label: 'En bodega', bg: '#eceff1', color: '#546e7a' },
  en_juicio: { label: 'En juicio', bg: '#fff8e1', color: '#f57f17' },
  devuelto: { label: 'Devuelto', bg: '#e0f2f1', color: '#00695c' },
  destruido: { label: 'Destruido', bg: '#ffebee', color: '#b71c1c' },
  concluido: { label: 'Concluido', bg: '#f5f5f5', color: '#616161' },
};

const EMBALAJES = ['Bolsa plástica', 'Bolsa de papel', 'Sobre de papel', 'Caja de cartón', 'Tubo de ensayo', 'Frasco', 'Contenedor rígido', 'Bolsa antiestática', 'Otro'];

const s = {
  btn: (bg, clr) => ({ backgroundColor: bg, color: clr, border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }),
  btnOutline: { backgroundColor: 'transparent', color: C.darkBlue, border: `2px solid ${C.darkBlue}`, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  input: { padding: '10px 12px', border: `1px solid ${C.lightGray}`, borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  select: { padding: '10px 12px', border: `1px solid ${C.lightGray}`, borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: C.white, fontFamily: 'inherit', cursor: 'pointer', width: '100%', boxSizing: 'border-box' },
  textarea: { padding: '10px 12px', border: `1px solid ${C.lightGray}`, borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical', minHeight: 70, width: '100%', boxSizing: 'border-box' },
  label: { fontSize: 12, fontWeight: 600, color: C.darkBlue, marginBottom: 4, display: 'block' },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  badge: (bg, clr) => ({ display: 'inline-block', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, backgroundColor: bg, color: clr }),
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', borderBottom: `2px solid ${C.lightGray}`, backgroundColor: C.bg, whiteSpace: 'nowrap' },
  td: { padding: '12px 16px', fontSize: 13, borderBottom: `1px solid ${C.lightGray}`, color: C.darkBlue },
};

export default function IndiciosEvidencia({ perfil }) {
  const { indicios, escenas, loading, stats, crearIndicio, actualizarEstatus, fetchMovimientos, agregarMovimiento, refetch } = useIndiciosEvidencia(perfil);

  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [showMovForm, setShowMovForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [seccion, setSeccion] = useState(1);

  const emptyForm = {
    escena_crimen_id: '', numero_indicio: '', folio_cadena_custodia: '',
    tipo_origen: 'localizacion', tipologia: '', tipologia_otro: '',
    descripcion: '', cantidad: '', color: '', marca: '', numero_serie: '',
    ubicacion_hallazgo: '', metodo_recoleccion: '', tipo_embalaje: '',
    sellado: false, etiquetado: false,
    recolectado_por: perfil?.nombre_completo || '', recolectado_por_cargo: '', recolectado_por_institucion: 'FGE Guerrero',
  };
  const [form, setForm] = useState(emptyForm);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const emptyMov = { nombre_entrega: '', institucion_entrega: 'FGE Guerrero', cargo_entrega: '', nombre_recibe: '', institucion_recibe: '', cargo_recibe: '', actividad_proposito: '', lugar_permanencia: '', estado_embalaje: 'integro', observaciones: '' };
  const [movForm, setMovForm] = useState(emptyMov);
  const setMov = (k, v) => setMovForm(p => ({ ...p, [k]: v }));

  // Cargar movimientos cuando se abre detalle
  useEffect(() => {
    if (showDetail) {
      fetchMovimientos(showDetail.id).then(setMovimientos);
    }
  }, [showDetail?.id]);

  const handleSubmit = async () => {
    if (!form.tipologia) return setMensaje({ tipo: 'error', texto: 'Selecciona la tipología del indicio' });
    if (!form.descripcion.trim()) return setMensaje({ tipo: 'error', texto: 'La descripción es obligatoria' });
    if (!form.numero_indicio.trim()) return setMensaje({ tipo: 'error', texto: 'El número de indicio es obligatorio' });

    setSaving(true); setMensaje(null);
    const data = {
      escena_crimen_id: form.escena_crimen_id || null,
      numero_indicio: form.numero_indicio,
      folio_cadena_custodia: form.folio_cadena_custodia || null,
      tipo_origen: form.tipo_origen,
      tipologia: form.tipologia,
      tipologia_otro: form.tipologia === 'otro' ? form.tipologia_otro : null,
      descripcion: form.descripcion,
      cantidad: form.cantidad || null,
      color: form.color || null,
      marca: form.marca || null,
      numero_serie: form.numero_serie || null,
      ubicacion_hallazgo: form.ubicacion_hallazgo || null,
      metodo_recoleccion: form.metodo_recoleccion || null,
      tipo_embalaje: form.tipo_embalaje || null,
      sellado: form.sellado,
      etiquetado: form.etiquetado,
      recolectado_por: form.recolectado_por || null,
      recolectado_por_cargo: form.recolectado_por_cargo || null,
      recolectado_por_institucion: form.recolectado_por_institucion || null,
    };

    const result = await crearIndicio(data);
    setSaving(false);
    if (result.success) {
      setMensaje({ tipo: 'ok', texto: 'Indicio registrado correctamente' });
      setForm(emptyForm); setSeccion(1);
      setTimeout(() => { setShowForm(false); setMensaje(null); }, 1500);
    } else {
      setMensaje({ tipo: 'error', texto: result.error });
    }
  };

  const handleMovSubmit = async () => {
    if (!movForm.nombre_entrega || !movForm.nombre_recibe || !movForm.actividad_proposito) {
      alert('Completa: quien entrega, quien recibe y propósito.'); return;
    }
    const result = await agregarMovimiento(showDetail.id, movForm);
    if (result.success) {
      const updated = await fetchMovimientos(showDetail.id);
      setMovimientos(updated);
      setMovForm(emptyMov); setShowMovForm(false);
    } else { alert('Error: ' + result.error); }
  };

  const filtrados = indicios.filter(i => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (i.descripcion || '').toLowerCase().includes(q) || (i.numero_indicio || '').toLowerCase().includes(q) || (i.tipologia || '').toLowerCase().includes(q) || (i.folio_cadena_custodia || '').toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: 24, fontFamily: 'Segoe UI, Arial, sans-serif', backgroundColor: C.bg, minHeight: '100vh' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.darkBlue, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <Package size={22} color={C.gold} /> Indicios y Evidencia
          </h2>
          <p style={{ fontSize: 13, color: C.gray, margin: '4px 0 0 0' }}>Módulo 2 · Tab 4 · Cadena de Custodia — Guía Nacional CNSP</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={s.btnOutline} onClick={refetch}><RefreshCw size={15} /> Actualizar</button>
          <button style={s.btn(C.darkBlue, C.white)} onClick={() => { setForm({ ...emptyForm, recolectado_por: perfil?.nombre_completo || '' }); setSeccion(1); setShowForm(true); setMensaje(null); }}>
            <Plus size={16} /> Nuevo Indicio
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total indicios', value: stats.total, color: C.darkBlue, icon: Package },
          { label: 'Recolectados', value: stats.recolectados, color: '#1565c0', icon: Crosshair },
          { label: 'En laboratorio', value: stats.en_laboratorio, color: '#6a1b9a', icon: Zap },
          { label: 'En bodega', value: stats.en_bodega, color: '#546e7a', icon: Lock },
          { label: 'Concluidos', value: stats.concluidos, color: C.green, icon: CheckCircle2 },
        ].map((st2, i) => (
          <div key={i} style={{ backgroundColor: C.white, borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: st2.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <st2.icon size={20} color={st2.color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.darkBlue }}>{st2.value}</div>
              <div style={{ fontSize: 12, color: C.gray }}>{st2.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div style={{ backgroundColor: C.white, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.lightGray}`, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderRadius: 8, padding: '8px 14px', flex: 1, maxWidth: 350 }}>
            <Search size={16} color={C.gray} />
            <input type="text" placeholder="Buscar por descripción, número, tipología..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: 14, backgroundColor: 'transparent', flex: 1, fontFamily: 'inherit' }} />
            {searchTerm && <X size={14} color={C.gray} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.gray }}><RefreshCw size={32} /><p>Cargando indicios...</p></div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.gray }}>
            <Package size={40} color={C.lightGray} />
            <p style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>{searchTerm ? 'Sin resultados' : 'No hay indicios registrados'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={s.th}>No. Indicio</th>
                <th style={s.th}>Tipología</th>
                <th style={s.th}>Descripción</th>
                <th style={s.th}>Origen</th>
                <th style={s.th}>Estatus</th>
                <th style={s.th}>Acciones</th>
              </tr></thead>
              <tbody>
                {filtrados.map((ind, idx) => {
                  const est = ESTATUS_CONFIG[ind.estatus] || ESTATUS_CONFIG.recolectado;
                  const tip = TIPOLOGIAS.find(t => t.key === ind.tipologia);
                  return (
                    <tr key={ind.id} style={{ backgroundColor: idx % 2 === 0 ? C.white : C.bg, cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = C.lightGold}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? C.white : C.bg}
                      onClick={() => setShowDetail(ind)}>
                      <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: 700 }}>{ind.numero_indicio}</td>
                      <td style={s.td}><span style={s.badge(C.darkBlue + '15', C.darkBlue)}>{tip?.label || ind.tipologia}</span></td>
                      <td style={{ ...s.td, maxWidth: 220 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ind.descripcion}</div>
                      </td>
                      <td style={s.td}>{ORIGENES.find(o => o.key === ind.tipo_origen)?.label || ind.tipo_origen}</td>
                      <td style={s.td}><span style={s.badge(est.bg, est.color)}>{est.label}</span></td>
                      <td style={s.td}>
                        <button style={{ ...s.btnOutline, padding: '4px 10px', fontSize: 11 }} onClick={e => { e.stopPropagation(); setShowDetail(ind); }}>
                          <Eye size={13} /> Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ FORM MODAL ═══ */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,26,77,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 30, zIndex: 1000, overflowY: 'auto' }} onClick={() => setShowForm(false)}>
          <div style={{ backgroundColor: C.white, borderRadius: 14, width: '100%', maxWidth: 700, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', marginBottom: 40 }} onClick={e => e.stopPropagation()}>

            <div style={{ backgroundColor: C.darkBlue, color: C.white, padding: '18px 24px', borderRadius: '14px 14px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Package size={20} /><span style={{ fontSize: 16, fontWeight: 700 }}>Nuevo Indicio / Evidencia</span></div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowForm(false)} />
            </div>

            <div style={{ padding: 24 }}>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
                {[{ n: 1, label: 'Identificación', icon: FileText }, { n: 2, label: 'Descripción', icon: Search }, { n: 3, label: 'Embalaje', icon: Package }].map(t => (
                  <button key={t.n} onClick={() => setSeccion(t.n)} style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${seccion === t.n ? C.gold : C.lightGray}`, backgroundColor: seccion === t.n ? C.lightGold : C.white, color: seccion === t.n ? C.gold : C.gray, fontSize: 12, fontWeight: 700 }}>
                    <t.icon size={14} /> {t.label}
                  </button>
                ))}
              </div>

              {seccion === 1 && (
                <div>
                  <div style={s.sectionTitle}><FileText size={15} /> Identificación</div>
                  <div style={s.grid2}>
                    <div style={s.formGroup}>
                      <label style={s.label}>No. de indicio <span style={{ color: C.red }}>*</span></label>
                      <input style={{ ...s.input, fontFamily: 'monospace' }} placeholder="Ej: I-001" value={form.numero_indicio} onChange={e => set('numero_indicio', e.target.value)} />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Folio cadena de custodia</label>
                      <input style={{ ...s.input, fontFamily: 'monospace' }} placeholder="Folio del registro" value={form.folio_cadena_custodia} onChange={e => set('folio_cadena_custodia', e.target.value)} />
                    </div>
                  </div>
                  <div style={{ ...s.formGroup, marginTop: 14 }}>
                    <label style={s.label}>Vincular a escena del crimen (opcional)</label>
                    <select style={s.select} value={form.escena_crimen_id} onChange={e => set('escena_crimen_id', e.target.value)}>
                      <option value="">— Sin vincular —</option>
                      {escenas.map(esc => (
                        <option key={esc.id} value={esc.id}>{esc.registros_911?.folio_911 || 'Sin folio'} — {esc.tipo_escena} — {(esc.ubicacion_texto || '').substring(0, 35)}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <label style={s.label}>Origen del indicio <span style={{ color: C.red }}>*</span></label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                      {ORIGENES.map(o => (
                        <button key={o.key} onClick={() => set('tipo_origen', o.key)} style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', border: form.tipo_origen === o.key ? `2px solid ${C.gold}` : `1px solid ${C.lightGray}`, backgroundColor: form.tipo_origen === o.key ? C.lightGold : C.white }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: form.tipo_origen === o.key ? C.darkBlue : C.gray }}>{o.label}</div>
                          <div style={{ fontSize: 11, color: C.gray }}>{o.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ ...s.formGroup, marginTop: 14 }}>
                    <label style={s.label}>Tipología <span style={{ color: C.red }}>*</span></label>
                    <select style={s.select} value={form.tipologia} onChange={e => set('tipologia', e.target.value)}>
                      <option value="">— Seleccionar —</option>
                      {TIPOLOGIAS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                  </div>
                  {form.tipologia === 'otro' && (
                    <div style={{ ...s.formGroup, marginTop: 10 }}>
                      <label style={s.label}>Especificar</label>
                      <input style={s.input} placeholder="Tipo de indicio" value={form.tipologia_otro} onChange={e => set('tipologia_otro', e.target.value)} />
                    </div>
                  )}
                </div>
              )}

              {seccion === 2 && (
                <div>
                  <div style={s.sectionTitle}><Search size={15} /> Descripción del Indicio</div>
                  <div style={s.formGroup}>
                    <label style={s.label}>Descripción detallada <span style={{ color: C.red }}>*</span></label>
                    <textarea style={s.textarea} placeholder="Descripción completa del indicio: qué es, estado, características..." value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={3} />
                  </div>
                  <div style={{ ...s.grid2, marginTop: 14 }}>
                    <div style={s.formGroup}><label style={s.label}>Cantidad</label><input style={s.input} placeholder="Ej: 3 casquillos" value={form.cantidad} onChange={e => set('cantidad', e.target.value)} /></div>
                    <div style={s.formGroup}><label style={s.label}>Color</label><input style={s.input} placeholder="Ej: Negro metálico" value={form.color} onChange={e => set('color', e.target.value)} /></div>
                    <div style={s.formGroup}><label style={s.label}>Marca</label><input style={s.input} placeholder="Si aplica" value={form.marca} onChange={e => set('marca', e.target.value)} /></div>
                    <div style={s.formGroup}><label style={s.label}>No. de serie</label><input style={{ ...s.input, fontFamily: 'monospace' }} placeholder="Si aplica" value={form.numero_serie} onChange={e => set('numero_serie', e.target.value)} /></div>
                  </div>
                  <div style={{ ...s.formGroup, marginTop: 14 }}>
                    <label style={s.label}>Ubicación del hallazgo dentro de la escena</label>
                    <input style={s.input} placeholder="Ej: Sobre la mesa del comedor, a 2m de la puerta principal" value={form.ubicacion_hallazgo} onChange={e => set('ubicacion_hallazgo', e.target.value)} />
                  </div>
                </div>
              )}

              {seccion === 3 && (
                <div>
                  <div style={s.sectionTitle}><Package size={15} /> Embalaje y Recolección</div>
                  <div style={s.grid2}>
                    <div style={s.formGroup}><label style={s.label}>Método de recolección</label><input style={s.input} placeholder="Ej: Manual con guantes, pinzas" value={form.metodo_recoleccion} onChange={e => set('metodo_recoleccion', e.target.value)} /></div>
                    <div style={s.formGroup}><label style={s.label}>Tipo de embalaje</label>
                      <select style={s.select} value={form.tipo_embalaje} onChange={e => set('tipo_embalaje', e.target.value)}>
                        <option value="">— Seleccionar —</option>
                        {EMBALAJES.map(em => <option key={em} value={em}>{em}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 14 }}>
                    {[{ key: 'sellado', label: 'Sellado realizado' }, { key: 'etiquetado', label: 'Etiquetado realizado' }].map(opt => (
                      <div key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${form[opt.key] ? C.green : C.lightGray}`, backgroundColor: form[opt.key] ? C.green + '12' : 'transparent' }} onClick={() => set(opt.key, !form[opt.key])}>
                        <input type="checkbox" checked={form[opt.key]} readOnly style={{ width: 16, height: 16 }} />
                        <span style={{ color: form[opt.key] ? '#1b5e20' : C.gray, fontWeight: 600, fontSize: 13 }}>{opt.label}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ ...s.sectionTitle, marginTop: 20 }}><Shield size={15} /> Quien Recolectó</div>
                  <div style={s.grid2}>
                    <div style={s.formGroup}><label style={s.label}>Nombre</label><input style={s.input} value={form.recolectado_por} onChange={e => set('recolectado_por', e.target.value)} /></div>
                    <div style={s.formGroup}><label style={s.label}>Cargo</label><input style={s.input} placeholder="Ej: PIM, Perito" value={form.recolectado_por_cargo} onChange={e => set('recolectado_por_cargo', e.target.value)} /></div>
                    <div style={s.formGroup}><label style={s.label}>Institución</label><input style={s.input} value={form.recolectado_por_institucion} onChange={e => set('recolectado_por_institucion', e.target.value)} /></div>
                  </div>
                </div>
              )}

              {mensaje && (
                <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: mensaje.tipo === 'ok' ? '#e8f5e9' : '#ffebee', color: mensaje.tipo === 'ok' ? '#1b5e20' : '#b71c1c', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  {mensaje.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {mensaje.texto}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.lightGray}`, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              {seccion > 1 && <button onClick={() => setSeccion(p => p - 1)} style={{ backgroundColor: 'transparent', color: C.gray, border: `1px solid ${C.lightGray}`, borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: 'pointer' }}>← Anterior</button>}
              <div style={{ flex: 1 }} />
              {seccion < 3 ? (
                <button onClick={() => setSeccion(p => p + 1)} style={s.btn(C.darkBlue, C.white)}>Siguiente →</button>
              ) : (
                <button style={{ ...s.btn(C.gold, C.white), opacity: saving ? 0.6 : 1 }} onClick={handleSubmit} disabled={saving}>
                  <Send size={15} /> {saving ? 'Guardando...' : 'Registrar Indicio'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ DETAIL PANEL WITH CHAIN OF CUSTODY ═══ */}
      {showDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,26,77,0.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }} onClick={() => { setShowDetail(null); setShowMovForm(false); }}>
          <div style={{ backgroundColor: C.white, width: '100%', maxWidth: 520, height: '100%', overflowY: 'auto', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>

            <div style={{ backgroundColor: C.darkBlue, color: C.white, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Indicio {showDetail.numero_indicio}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{TIPOLOGIAS.find(t => t.key === showDetail.tipologia)?.label}</div>
              </div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => { setShowDetail(null); setShowMovForm(false); }} />
            </div>

            {/* Estatus + cambiar */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.lightGray}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              {(() => { const est = ESTATUS_CONFIG[showDetail.estatus] || {}; return <span style={{ ...s.badge(est.bg, est.color), fontSize: 13, padding: '6px 14px' }}>{est.label}</span>; })()}
              <select style={{ ...s.select, width: 'auto', fontSize: 12, padding: '6px 10px' }} value={showDetail.estatus}
                onChange={async e => { await actualizarEstatus(showDetail.id, e.target.value); setShowDetail(p => ({ ...p, estatus: e.target.value })); }}>
                {Object.entries(ESTATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {/* Detail rows */}
            {[
              { label: 'No. indicio', value: showDetail.numero_indicio },
              { label: 'Folio CC', value: showDetail.folio_cadena_custodia },
              { label: 'Origen', value: ORIGENES.find(o => o.key === showDetail.tipo_origen)?.label },
              { label: 'Descripción', value: showDetail.descripcion },
              { label: 'Cantidad', value: showDetail.cantidad },
              { label: 'Color', value: showDetail.color },
              { label: 'Marca', value: showDetail.marca },
              { label: 'No. serie', value: showDetail.numero_serie },
              { label: 'Ubicación hallazgo', value: showDetail.ubicacion_hallazgo },
              { label: 'Embalaje', value: showDetail.tipo_embalaje },
              { label: 'Sellado', value: showDetail.sellado ? '✅' : '❌' },
              { label: 'Etiquetado', value: showDetail.etiquetado ? '✅' : '❌' },
              { label: 'Recolectó', value: showDetail.recolectado_por },
            ].filter(r => r.value).map((row, i) => (
              <div key={i} style={{ padding: '10px 20px', borderBottom: `1px solid ${C.lightGray}`, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.gray, textTransform: 'uppercase', minWidth: 110 }}>{row.label}</span>
                <span style={{ fontSize: 14, color: C.darkBlue, textAlign: 'right', flex: 1, wordBreak: 'break-word' }}>{row.value}</span>
              </div>
            ))}

            {/* ─── CADENA DE CUSTODIA TIMELINE ─── */}
            <div style={{ padding: '16px 20px', borderTop: `2px solid ${C.gold}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Link2 size={15} /> Cadena de Custodia ({movimientos.length})
                </div>
                <button onClick={() => setShowMovForm(v => !v)} style={{ backgroundColor: C.lightGold, border: `1px solid ${C.gold}55`, borderRadius: 8, padding: '6px 12px', color: C.gold, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {showMovForm ? '✕ Cancelar' : '+ Movimiento'}
                </button>
              </div>

              {/* Form nuevo movimiento */}
              {showMovForm && (
                <div style={{ backgroundColor: C.bg, borderRadius: 8, padding: 14, marginBottom: 14, border: `1px solid ${C.lightGray}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.darkBlue, marginBottom: 10 }}>Registrar entrega-recepción</div>
                  <div style={s.grid2}>
                    <div style={s.formGroup}><label style={{ ...s.label, fontSize: 10 }}>Quien entrega *</label><input style={{ ...s.input, fontSize: 12, padding: 8 }} value={movForm.nombre_entrega} onChange={e => setMov('nombre_entrega', e.target.value)} /></div>
                    <div style={s.formGroup}><label style={{ ...s.label, fontSize: 10 }}>Institución</label><input style={{ ...s.input, fontSize: 12, padding: 8 }} value={movForm.institucion_entrega} onChange={e => setMov('institucion_entrega', e.target.value)} /></div>
                    <div style={s.formGroup}><label style={{ ...s.label, fontSize: 10 }}>Quien recibe *</label><input style={{ ...s.input, fontSize: 12, padding: 8 }} value={movForm.nombre_recibe} onChange={e => setMov('nombre_recibe', e.target.value)} /></div>
                    <div style={s.formGroup}><label style={{ ...s.label, fontSize: 10 }}>Institución recibe</label><input style={{ ...s.input, fontSize: 12, padding: 8 }} value={movForm.institucion_recibe} onChange={e => setMov('institucion_recibe', e.target.value)} /></div>
                  </div>
                  <div style={{ ...s.formGroup, marginTop: 10 }}><label style={{ ...s.label, fontSize: 10 }}>Propósito / Actividad *</label><input style={{ ...s.input, fontSize: 12, padding: 8 }} placeholder="Ej: Análisis pericial, almacenamiento..." value={movForm.actividad_proposito} onChange={e => setMov('actividad_proposito', e.target.value)} /></div>
                  <div style={{ ...s.grid2, marginTop: 10 }}>
                    <div style={s.formGroup}><label style={{ ...s.label, fontSize: 10 }}>Lugar de permanencia</label><input style={{ ...s.input, fontSize: 12, padding: 8 }} value={movForm.lugar_permanencia} onChange={e => setMov('lugar_permanencia', e.target.value)} /></div>
                    <div style={s.formGroup}><label style={{ ...s.label, fontSize: 10 }}>Estado del embalaje</label>
                      <select style={{ ...s.select, fontSize: 12, padding: 8 }} value={movForm.estado_embalaje} onChange={e => setMov('estado_embalaje', e.target.value)}>
                        <option value="integro">Íntegro</option>
                        <option value="abierto">Abierto</option>
                        <option value="deteriorado">Deteriorado</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={handleMovSubmit} style={{ ...s.btn(C.gold, C.white), width: '100%', justifyContent: 'center', marginTop: 12, fontSize: 12 }}>
                    <Send size={13} /> Registrar Movimiento
                  </button>
                </div>
              )}

              {/* Timeline */}
              {movimientos.length === 0 ? (
                <div style={{ color: C.gray, fontSize: 12, textAlign: 'center', padding: 20 }}>Sin movimientos registrados. El indicio permanece con quien lo recolectó.</div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, backgroundColor: C.gold + '40' }} />
                  {movimientos.map((m, i) => (
                    <div key={m.id} style={{ position: 'relative', marginBottom: 16, paddingLeft: 16 }}>
                      <div style={{ position: 'absolute', left: -16, top: 4, width: 12, height: 12, borderRadius: '50%', backgroundColor: C.gold, border: `2px solid ${C.white}` }} />
                      <div style={{ backgroundColor: C.bg, borderRadius: 8, padding: 12, border: `1px solid ${C.lightGray}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.gold }}>MOVIMIENTO #{m.numero_movimiento}</span>
                          <span style={{ fontSize: 10, color: C.gray }}>{new Date(m.fecha_hora_entrega).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: C.darkBlue, fontWeight: 600 }}>{m.nombre_entrega}</span>
                          <ArrowRight size={14} color={C.gold} />
                          <span style={{ fontSize: 12, color: C.darkBlue, fontWeight: 600 }}>{m.nombre_recibe}</span>
                        </div>
                        <div style={{ fontSize: 11, color: C.gray }}>{m.actividad_proposito}</div>
                        {m.lugar_permanencia && <div style={{ fontSize: 10, color: C.gray, marginTop: 2 }}>📍 {m.lugar_permanencia}</div>}
                        {m.estado_embalaje && m.estado_embalaje !== 'integro' && (
                          <div style={{ fontSize: 10, color: C.red, marginTop: 2 }}>⚠ Embalaje: {m.estado_embalaje}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
