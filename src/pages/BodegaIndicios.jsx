// src/pages/BodegaIndicios.jsx
// Bodega de Indicios — Fiscalía Especializada en Delitos de Narcomenudeo
// Libro de Gobierno Digital: entradas, resguardo, salidas, destrucción

import React, { useState } from 'react';
import {
  Package, Plus, ChevronLeft, Clock, Search, RefreshCw, Eye, FileText,
  AlertTriangle, CheckCircle, ArrowRightLeft, User, Hash, MapPin,
  Camera, Shield, Lock, Calendar, Briefcase,
} from 'lucide-react';
import { useBodegaIndicios } from '../hooks/useBodegaIndicios';

const COLORS = { primary: '#001a4d', gold: '#b69054', white: '#ffffff', bg: '#f4f6fb' };
const cardStyle = { background: COLORS.white, borderRadius: 10, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 14 };
const labelStyle = { display: 'block', fontWeight: 600, fontSize: 13, color: COLORS.primary, marginBottom: 4 };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 7, border: '1.5px solid #c7cfe0', fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' };
const selectStyle = { ...inputStyle, background: COLORS.white };
const textareaStyle = { ...inputStyle, minHeight: 60, resize: 'vertical' };
const btnPrimary = { background: COLORS.gold, color: COLORS.white, border: 'none', borderRadius: 7, padding: '10px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 };
const btnSecondary = { ...btnPrimary, background: 'transparent', color: COLORS.primary, border: `1.5px solid ${COLORS.primary}` };
const badge = (color) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, color: COLORS.white, background: color, textTransform: 'uppercase', letterSpacing: 0.5 });
const tituloSeccion = { color: COLORS.gold, fontSize: 13, fontWeight: 800, letterSpacing: 1.5, marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #b69054', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 };

export default function BodegaIndicios({ perfil }) {
  const hook = useBodegaIndicios(perfil);
  const {
    indicios, movimientos, loading, error, setError, esNarco,
    filtroEstatus, setFiltroEstatus, filtroTipo, setFiltroTipo, busqueda, setBusqueda,
    fetchIndicios, registrarEntrada, registrarMovimiento, fetchMovimientos,
    metricas, porTipo,
    getTipoLabel, getMovLabel, getEstatusColor, getTipoColor, formatFecha,
    TIPOS_INDICIO, TIPOS_MOVIMIENTO, UNIDADES,
  } = hook;

  const [vista, setVista] = useState('libro');
  const [indicioSel, setIndicioSel] = useState(null);
  const [showMovimiento, setShowMovimiento] = useState(false);

  const emptyForm = {
    carpeta_investigacion: '', numero_indicio: '', tipo_indicio: 'marihuana',
    descripcion: '', cantidad: '', peso: '', unidad_medida: 'gramos',
    folio_cadena_custodia: '', mp_ordenador: '', auxiliar_mp_entrega: '',
    ubicacion_bodega: '', observaciones_entrada: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [archivo, setArchivo] = useState(null);

  const emptyMov = { tipo_movimiento: 'salida_peritaje', destino: '', nombre_entrega: '', nombre_recibe: '', folio_cadena_custodia: '', observaciones: '' };
  const [formMov, setFormMov] = useState(emptyMov);

  if (!esNarco) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
        <Lock size={40} color="#9ca3af" style={{ marginBottom: 10 }} />
        <div style={{ color: '#9ca3af', fontSize: 14 }}>Acceso restringido a la Fiscalía Especializada en Delitos de Narcomenudeo, Coordinación Regional y Director General.</div>
      </div>
    );
  }

  const abrirDetalle = async (indicio) => {
    setIndicioSel(indicio);
    setVista('detalle');
    setShowMovimiento(false);
    await fetchMovimientos(indicio.id);
  };

  const handleGuardar = async () => {
    if (!form.carpeta_investigacion || !form.tipo_indicio || !form.descripcion) {
      setError('Carpeta de Investigación, tipo de indicio y descripción son obligatorios');
      return;
    }
    const result = await registrarEntrada(form, archivo);
    if (result) { setForm(emptyForm); setArchivo(null); setVista('libro'); }
  };

  const handleMovimiento = async () => {
    if (!formMov.tipo_movimiento || !formMov.nombre_recibe) {
      setError('Tipo de movimiento y nombre de quien recibe son obligatorios');
      return;
    }
    const ok = await registrarMovimiento(indicioSel.id, formMov);
    if (ok) { setFormMov(emptyMov); setShowMovimiento(false); await abrirDetalle({ ...indicioSel }); await fetchIndicios(); }
  };

  // ── MÉTRICAS ─────────────────────────────────────────────────────
  const renderMetricas = () => {
    const cards = [
      { label: 'En Resguardo', value: metricas.resguardados, icon: Package, color: '#10b981' },
      { label: 'En Peritaje', value: metricas.en_peritaje, icon: Search, color: '#3b82f6' },
      { label: 'En Audiencia', value: metricas.en_audiencia, icon: Briefcase, color: '#8b5cf6' },
      { label: 'En Traslado', value: metricas.en_traslado, icon: ArrowRightLeft, color: '#f59e0b' },
      { label: 'Destruidos', value: metricas.destruidos, icon: AlertTriangle, color: '#6b7280' },
      { label: 'Total Registrados', value: metricas.total, icon: Hash, color: COLORS.primary },
    ];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
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

  // ── FILTROS ──────────────────────────────────────────────────────
  const renderFiltros = () => (
    <div style={{ ...cardStyle, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 200px' }}>
        <label style={labelStyle}>Buscar</label>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: '#9ca3af' }} />
          <input style={{ ...inputStyle, paddingLeft: 32 }} placeholder="C.I., folio, descripción..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>
      <div style={{ flex: '0 0 160px' }}>
        <label style={labelStyle}>Estatus</label>
        <select style={selectStyle} value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="resguardado">Resguardado</option>
          <option value="en_peritaje">En peritaje</option>
          <option value="en_audiencia">En audiencia</option>
          <option value="en_traslado">En traslado</option>
          <option value="destruido">Destruido</option>
          <option value="entregado">Entregado</option>
        </select>
      </div>
      <div style={{ flex: '0 0 160px' }}>
        <label style={labelStyle}>Tipo de indicio</label>
        <select style={selectStyle} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="todos">Todos</option>
          {TIPOS_INDICIO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <button style={btnPrimary} onClick={fetchIndicios}><RefreshCw size={15} /> Actualizar</button>
    </div>
  );

  // ── LIBRO DE GOBIERNO (listado) ──────────────────────────────────
  const renderLibro = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: COLORS.primary, fontSize: 16 }}>
          <Package size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Libro de Gobierno — Bodega de Indicios ({indicios.length})
        </h3>
        <button style={btnPrimary} onClick={() => { setForm(emptyForm); setArchivo(null); setVista('entrada'); }}>
          <Plus size={15} /> Registrar Entrada
        </button>
      </div>

      {indicios.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          <Package size={40} style={{ marginBottom: 10, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>No hay indicios registrados con los filtros actuales</div>
        </div>
      ) : (
        indicios.map(ind => (
          <div key={ind.id} style={{ ...cardStyle, cursor: 'pointer', borderLeft: `4px solid ${getEstatusColor(ind.estatus)}`, transition: 'box-shadow 0.2s' }}
            onClick={() => abrirDetalle(ind)}
            onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
            onMouseOut={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: COLORS.primary, fontFamily: 'monospace' }}>{ind.folio_bodega}</span>
                  <span style={badge(getEstatusColor(ind.estatus))}>{(ind.estatus || '').replace('_', ' ')}</span>
                  <span style={badge(getTipoColor(ind.tipo_indicio))}>{getTipoLabel(ind.tipo_indicio)}</span>
                </div>
                <div style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{ind.descripcion}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  <span style={{ fontFamily: 'monospace' }}>C.I. {ind.carpeta_investigacion}</span>
                  {ind.numero_indicio && <span> · Indicio #{ind.numero_indicio}</span>}
                  {ind.peso && <span> · {ind.peso} {ind.unidad_medida}</span>}
                  {ind.cantidad && <span> · Cant: {ind.cantidad}</span>}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  MP: {ind.mp_ordenador || '—'} · Entrega: {ind.auxiliar_mp_entrega || '—'} · Recibe: {ind.pim_recibe || '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 120 }}>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{formatFecha(ind.fecha_entrada)}</div>
                {ind.folio_cadena_custodia && <div style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace', marginTop: 4 }}>CC: {ind.folio_cadena_custodia}</div>}
                {ind.ubicacion_bodega && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{ind.ubicacion_bodega}</div>}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ── FORMULARIO DE ENTRADA ────────────────────────────────────────
  const renderEntrada = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button style={{ ...btnSecondary, padding: '6px 12px' }} onClick={() => setVista('libro')}><ChevronLeft size={16} /> Volver</button>
        <h3 style={{ margin: 0, color: COLORS.primary }}>Registrar Entrada de Indicio</h3>
      </div>

      <div style={cardStyle}>
        <div style={tituloSeccion}><Package size={15} /> Datos del Indicio</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Carpeta de Investigación (C.I.) *</label>
            <input style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: 1 }} maxLength={25}
              placeholder="20 dígitos" value={form.carpeta_investigacion}
              onChange={e => setForm({ ...form, carpeta_investigacion: e.target.value.replace(/\D/g, '') })} />
          </div>
          <div>
            <label style={labelStyle}>Número de Indicio</label>
            <input style={inputStyle} placeholder="1, 2, 3..." value={form.numero_indicio} onChange={e => setForm({ ...form, numero_indicio: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Tipo de Indicio *</label>
            <select style={selectStyle} value={form.tipo_indicio} onChange={e => setForm({ ...form, tipo_indicio: e.target.value })}>
              {TIPOS_INDICIO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Descripción del Indicio *</label>
            <textarea style={textareaStyle} placeholder="Descripción detallada del indicio: apariencia, empaque, estado..." value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <div><label style={labelStyle}>Cantidad</label><input style={inputStyle} placeholder="5 bolsas" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><label style={labelStyle}>Peso</label><input style={inputStyle} placeholder="500" value={form.peso} onChange={e => setForm({ ...form, peso: e.target.value })} /></div>
            <div>
              <label style={labelStyle}>Unidad</label>
              <select style={selectStyle} value={form.unidad_medida} onChange={e => setForm({ ...form, unidad_medida: e.target.value })}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div><label style={labelStyle}>Folio Cadena de Custodia</label><input style={inputStyle} placeholder="Folio CC" value={form.folio_cadena_custodia} onChange={e => setForm({ ...form, folio_cadena_custodia: e.target.value })} /></div>
          <div><label style={labelStyle}>Ubicación en Bodega</label><input style={inputStyle} placeholder="Estante A, Nivel 2" value={form.ubicacion_bodega} onChange={e => setForm({ ...form, ubicacion_bodega: e.target.value })} /></div>

          <div style={{ gridColumn: '1 / -1', borderTop: '2px solid #e8ecf1', paddingTop: 14 }}>
            <div style={{ fontWeight: 700, color: COLORS.gold, fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Entrega — Recepción</div>
          </div>
          <div><label style={labelStyle}>MP que ordena</label><input style={inputStyle} placeholder="Nombre del MP" value={form.mp_ordenador} onChange={e => setForm({ ...form, mp_ordenador: e.target.value })} /></div>
          <div><label style={labelStyle}>Auxiliar del MP que entrega</label><input style={inputStyle} placeholder="Nombre de quien entrega" value={form.auxiliar_mp_entrega} onChange={e => setForm({ ...form, auxiliar_mp_entrega: e.target.value })} /></div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Observaciones de entrada</label>
            <textarea style={textareaStyle} placeholder="Condiciones del indicio al recibirlo, embalaje, sellos..." value={form.observaciones_entrada} onChange={e => setForm({ ...form, observaciones_entrada: e.target.value })} />
          </div>
        </div>

        {/* Foto del indicio */}
        <div style={{ borderTop: '2px solid #e8ecf1', paddingTop: 14, marginTop: 14 }}>
          <div style={{ fontWeight: 700, color: COLORS.gold, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
            <Camera size={14} /> Fotografía del Indicio
          </div>
          <div style={{ border: '2px dashed #c7cfe0', borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer', background: COLORS.bg }}
            onClick={() => document.getElementById('file-bodega').click()}>
            <Camera size={24} color="#999" />
            <p style={{ fontSize: 12, color: '#999', margin: '6px 0 0 0' }}>Clic para tomar o seleccionar foto</p>
            <input id="file-bodega" type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) setArchivo(e.target.files[0]); }} />
          </div>
          {archivo && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #22c55e44', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#085041' }}>{archivo.name} ({(archivo.size / 1024).toFixed(0)} KB)</span>
              <button onClick={() => setArchivo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', fontSize: 12 }}>✕</button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <button style={btnSecondary} onClick={() => setVista('libro')}>Cancelar</button>
          <button style={btnPrimary} onClick={handleGuardar} disabled={loading}>
            <Package size={15} /> {loading ? 'Registrando...' : 'Registrar Entrada'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── DETALLE DEL INDICIO ──────────────────────────────────────────
  const renderDetalle = () => {
    if (!indicioSel) return null;
    const ind = indicioSel;
    const fields = [
      ['Folio Bodega', ind.folio_bodega, Hash],
      ['C.I.', ind.carpeta_investigacion, Hash],
      ['No. Indicio', ind.numero_indicio, Hash],
      ['Tipo', getTipoLabel(ind.tipo_indicio), Package],
      ['Cantidad', ind.cantidad, Package],
      ['Peso', ind.peso ? `${ind.peso} ${ind.unidad_medida}` : null, Package],
      ['Folio CC', ind.folio_cadena_custodia, Shield],
      ['Ubicación Bodega', ind.ubicacion_bodega, MapPin],
      ['MP que ordena', ind.mp_ordenador, User],
      ['Auxiliar MP entrega', ind.auxiliar_mp_entrega, User],
      ['PIM recibe', ind.pim_recibe, User],
      ['Fecha entrada', formatFecha(ind.fecha_entrada), Calendar],
      ['Registró', ind.registrado_por, User],
    ];

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <button style={{ ...btnSecondary, padding: '6px 12px' }} onClick={() => { setVista('libro'); setIndicioSel(null); }}><ChevronLeft size={16} /> Libro</button>
          <span style={{ fontWeight: 800, fontSize: 16, color: COLORS.primary, fontFamily: 'monospace' }}>{ind.folio_bodega}</span>
          <span style={badge(getEstatusColor(ind.estatus))}>{(ind.estatus || '').replace('_', ' ')}</span>
          <span style={badge(getTipoColor(ind.tipo_indicio))}>{getTipoLabel(ind.tipo_indicio)}</span>
        </div>

        {/* Datos y foto */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
            {ind.foto_url ? (
              <a href={ind.foto_url} target="_blank" rel="noopener noreferrer">
                <img src={ind.foto_url} alt="indicio" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10, border: '2px solid #b69054' }} />
              </a>
            ) : (
              <div style={{ width: 100, height: 100, borderRadius: 10, background: '#f9fafb', border: '2px dashed #c7cfe0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c7cfe0' }}><Camera size={30} /></div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary }}>{ind.descripcion}</div>
              {ind.observaciones_entrada && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, fontStyle: 'italic' }}>Obs: {ind.observaciones_entrada}</div>}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {fields.filter(f => f[1]).map(([label, value, Icon], i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Icon size={12} /> {label}</div>
                <div style={{ fontSize: 14, color: COLORS.primary, fontWeight: 500, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones */}
        {ind.estatus !== 'destruido' && ind.estatus !== 'entregado' && (
          <div style={cardStyle}>
            <div style={tituloSeccion}><ArrowRightLeft size={15} /> Registrar Movimiento</div>
            {!showMovimiento ? (
              <button style={btnPrimary} onClick={() => { setFormMov({ ...emptyMov, nombre_entrega: perfil?.nombre_completo || '' }); setShowMovimiento(true); }}>
                <ArrowRightLeft size={15} /> {ind.estatus === 'resguardado' ? 'Registrar Salida' : 'Registrar Retorno / Movimiento'}
              </button>
            ) : (
              <div style={{ background: '#fffbeb', borderRadius: 8, padding: 14, borderLeft: `4px solid ${COLORS.gold}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Tipo de movimiento *</label>
                    <select style={selectStyle} value={formMov.tipo_movimiento} onChange={e => setFormMov({ ...formMov, tipo_movimiento: e.target.value })}>
                      {TIPOS_MOVIMIENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Destino</label><input style={inputStyle} placeholder="Laboratorio, Juzgado, SEMEFO..." value={formMov.destino} onChange={e => setFormMov({ ...formMov, destino: e.target.value })} /></div>
                  <div><label style={labelStyle}>Nombre de quien entrega (PIM)</label><input style={inputStyle} value={formMov.nombre_entrega} onChange={e => setFormMov({ ...formMov, nombre_entrega: e.target.value })} /></div>
                  <div><label style={labelStyle}>Nombre de quien recibe *</label><input style={inputStyle} placeholder="Nombre completo" value={formMov.nombre_recibe} onChange={e => setFormMov({ ...formMov, nombre_recibe: e.target.value })} /></div>
                  <div><label style={labelStyle}>Folio Cadena de Custodia</label><input style={inputStyle} value={formMov.folio_cadena_custodia} onChange={e => setFormMov({ ...formMov, folio_cadena_custodia: e.target.value })} /></div>
                  <div><label style={labelStyle}>Observaciones</label><input style={inputStyle} placeholder="Motivo, condiciones..." value={formMov.observaciones} onChange={e => setFormMov({ ...formMov, observaciones: e.target.value })} /></div>
                </div>
                {formMov.tipo_movimiento === 'salida_destruccion' && (
                  <div style={{ background: '#fef2f2', border: '1px solid #ef444440', borderRadius: 8, padding: 10, marginTop: 10, fontSize: 12, color: '#7f1d1d', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={16} color="#dc2626" />
                    La destrucción es IRREVERSIBLE. El indicio cambiará a estatus "Destruido" permanentemente.
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button style={btnPrimary} onClick={handleMovimiento} disabled={loading}>{loading ? 'Registrando...' : 'Confirmar movimiento'}</button>
                  <button style={btnSecondary} onClick={() => setShowMovimiento(false)}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Historial de movimientos */}
        <div style={cardStyle}>
          <div style={tituloSeccion}><Clock size={15} /> Historial de Movimientos ({movimientos.length})</div>
          {movimientos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 13 }}>Sin movimientos — el indicio permanece en resguardo original.</div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 2, background: '#d1d5db' }} />
              {movimientos.map((m, i) => {
                const esRetorno = m.tipo_movimiento === 'retorno';
                const c = esRetorno ? '#10b981' : '#f59e0b';
                return (
                  <div key={m.id} style={{ position: 'relative', marginBottom: 10 }}>
                    <div style={{ position: 'absolute', left: -20, top: 8, width: 14, height: 14, borderRadius: '50%', background: c, border: `3px solid ${COLORS.white}`, boxShadow: `0 0 0 2px ${c}` }} />
                    <div style={{ ...cardStyle, marginBottom: 0, padding: 12, borderLeft: `3px solid ${c}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.primary }}>{getMovLabel(m.tipo_movimiento)}</div>
                          {m.destino && <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>Destino: {m.destino}</div>}
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Entrega: {m.nombre_entrega} → Recibe: {m.nombre_recibe}</div>
                          {m.folio_cadena_custodia && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, fontFamily: 'monospace' }}>CC: {m.folio_cadena_custodia}</div>}
                          {m.observaciones && <div style={{ fontSize: 12, color: '#374151', marginTop: 4, fontStyle: 'italic' }}>"{m.observaciones}"</div>}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af', minWidth: 100 }}>
                          <div>{formatFecha(m.fecha_movimiento)}</div>
                          <div>{m.registrado_por}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
      {vista === 'libro' && (<>{renderMetricas()}{renderFiltros()}{renderLibro()}</>)}
      {vista === 'entrada' && renderEntrada()}
      {vista === 'detalle' && renderDetalle()}
      {loading && vista === 'libro' && (
        <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>
          <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
