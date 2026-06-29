// src/pages/OrdenesAprehension.jsx
// Módulo: Órdenes de Aprehensión y Reaprehensión
// Consulta rápida por apellidos + Registro con fotos e identificación visual
// Fundamento: CNPP, Mandamientos Ministeriales FGE Guerrero

import { useState, useEffect } from 'react';
import {
  Search, Plus, User, AlertTriangle, CheckCircle2, X, Send, RefreshCw,
  Eye, FileText, Shield, ChevronLeft, ChevronRight, Camera, Upload,
  Trash2, MapPin, Briefcase, Target,
} from 'lucide-react';
import { useOrdenesAprehension } from '../hooks/useOrdenesAprehension';
import { supabase } from '../supabaseClient';

const C = {
  darkBlue: '#001a4d', gold: '#b69054', lightGold: '#f5ede0',
  white: '#ffffff', bg: '#f4f6fb', gray: '#666666', lightGray: '#e8ecf1',
  green: '#28a745', red: '#dc3545', orange: '#fd7e14',
};

const st = {
  btn: (bg, clr) => ({ backgroundColor: bg, color: clr, border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }),
  btnOutline: { backgroundColor: 'transparent', color: C.darkBlue, border: `2px solid ${C.darkBlue}`, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  input: { padding: '10px 12px', border: `1px solid ${C.lightGray}`, borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  select: { padding: '10px 12px', border: `1px solid ${C.lightGray}`, borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: C.white, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', cursor: 'pointer' },
  textarea: { padding: '10px 12px', border: `1px solid ${C.lightGray}`, borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical', minHeight: 70, width: '100%', boxSizing: 'border-box' },
  label: { fontSize: 12, fontWeight: 600, color: C.darkBlue, marginBottom: 4, display: 'block' },
  sTitle: { fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  fg: { display: 'flex', flexDirection: 'column', gap: 4 },
  badge: (bg, clr) => ({ display: 'inline-block', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, backgroundColor: bg, color: clr }),
};

const RESOLUCIONES = {
  'FALTA POR CUMPLIR': { bg: '#ffebee', color: '#b71c1c' },
  'CUMPLIDA': { bg: '#e8f5e9', color: '#2e7d32' },
  'CANCELADA': { bg: '#eceff1', color: '#546e7a' },
  'PRESCRITA': { bg: '#fff3e0', color: '#e65100' },
};

export default function OrdenesAprehension({ perfil }) {
  const { ordenes, loading, stats, buscarPorApellidos, crearOrden, actualizarOrden, fetchStats } = useOrdenesAprehension();

  const [vista, setVista] = useState('consulta');
  const [busqueda, setBusqueda] = useState('');
  const [indiceActual, setIndiceActual] = useState(0);
  const [showForm, setShowForm] = useState(false);
const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [fotoFrente, setFotoFrente] = useState(null);
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [oficioArchivo, setOficioArchivo] = useState(null);

  const emptyForm = {
    anio: new Date().getFullYear(), folio: '', comandancia: '',
    mandato_judicial: 'APREHENSION', causa_penal: '',
    fecha_emision: '', fecha_ejecucion: '', numero_oficio: '',
    resolucion: 'FALTA POR CUMPLIR', av_previa: '',
    delito: '', delito2: '', agraviado: '', inculpado: '',
    sexo: '', edad_aproximada: '', estatura: '', complexion: '', tez: '',
    cabello: '', senas_particulares: '', descripcion_fisica: '',
    observaciones: '',
  };
  const [form, setForm] = useState(emptyForm);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Búsqueda tipo Ctrl+B
  const ejecutarBusqueda = () => {
    if (busqueda.trim().length >= 2) {
      buscarPorApellidos(busqueda);
      setIndiceActual(0);
    }
  };

  const ordenActual = ordenes.length > 0 ? ordenes[indiceActual] : null;

const subirArchivo = async (file, carpeta, id) => {
    const ext = file.name.split('.').pop();
    const path = `${carpeta}/${id}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('ordenes-aprehension').upload(path, file);
    if (error) return null;
    const { data } = supabase.storage.from('ordenes-aprehension').getPublicUrl(path);
    return data?.publicUrl || null;
  };

  const handleSubmit = async () => {
    if (!form.inculpado.trim()) return setMensaje({ tipo: 'error', texto: 'El nombre del inculpado es obligatorio' });
    if (!form.delito.trim()) return setMensaje({ tipo: 'error', texto: 'El delito es obligatorio' });
    setSaving(true); setMensaje(null);
    const payload = {
      ...form,
      anio: form.anio ? parseInt(form.anio) : null,
      edad_aproximada: form.edad_aproximada ? parseInt(form.edad_aproximada) : null,
      registrado_por: perfil?.nombre_completo || '',
      region: perfil?.region || '',
    };
    const result = await crearOrden(payload);
    if (result.success) {
      const id = result.data.id;
      const updates = {};
      if (fotoFrente) { const url = await subirArchivo(fotoFrente, 'fotos_frente', id); if (url) updates.foto_frente_url = url; }
      if (fotoPerfil) { const url = await subirArchivo(fotoPerfil, 'fotos_perfil', id); if (url) updates.foto_perfil_url = url; }
      if (oficioArchivo) { const url = await subirArchivo(oficioArchivo, 'oficios', id); if (url) updates.oficio_mp_juez_url = url; }
      if (Object.keys(updates).length > 0) await actualizarOrden(id, updates);
      setSaving(false);
      setMensaje({ tipo: 'ok', texto: 'Orden registrada con archivos adjuntos' });
      setForm(emptyForm); setFotoFrente(null); setFotoPerfil(null); setOficioArchivo(null);
      setTimeout(() => { setShowForm(false); setMensaje(null); }, 1500);
    } else {
      setSaving(false);
      setMensaje({ tipo: 'error', texto: result.error });
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'Segoe UI, Arial, sans-serif', backgroundColor: C.bg, minHeight: '100vh' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.darkBlue, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <Target size={22} color={C.gold} /> Órdenes de Aprehensión
          </h2>
          <p style={{ fontSize: 13, color: C.gray, margin: '4px 0 0 0' }}>Consulta rápida y registro · Mandamientos Ministeriales</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => fetchStats()} style={st.btnOutline}><RefreshCw size={15} /></button>
          <button style={st.btn(C.darkBlue, C.white)} onClick={() => { setForm(emptyForm); setShowForm(true); setMensaje(null); }}>
            <Plus size={16} /> Registrar Orden
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total órdenes', value: stats.total, color: C.darkBlue, icon: FileText },
          { label: 'Falta por cumplir', value: stats.pendientes, color: C.red, icon: AlertTriangle },
          { label: 'Cumplidas', value: stats.cumplidas, color: C.green, icon: CheckCircle2 },
          { label: 'Reaprehensión', value: stats.reaprehension, color: C.orange, icon: Target },
        ].map((s, i) => (
          <div key={i} style={{ backgroundColor: C.white, borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.darkBlue }}>{s.value}</div>
              <div style={{ fontSize: 12, color: C.gray }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ CONSULTA RÁPIDA ═══ */}
      <div style={{ backgroundColor: C.white, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 20, marginBottom: 20 }}>
        <div style={st.sTitle}><Search size={16} /> Consulta Rápida por Apellidos</div>
        <p style={{ fontSize: 12, color: C.gray, marginBottom: 12 }}>Escribe los apellidos y presiona Buscar. Navega entre coincidencias con ◄ Anterior y Siguiente ►</p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input style={{ ...st.input, flex: 1, fontSize: 16, fontWeight: 600, letterSpacing: 0.5 }}
            placeholder="APELLIDO PATERNO MATERNO..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') ejecutarBusqueda(); }} />
          <button onClick={ejecutarBusqueda} style={st.btn(C.gold, C.white)}>
            <Search size={16} /> Buscar
          </button>
          {ordenes.length > 0 && (
            <button onClick={() => { setBusqueda(''); setIndiceActual(0); buscarPorApellidos(''); }} style={{ ...st.btnOutline, padding: '8px 12px' }}>
              <X size={14} /> Limpiar
            </button>
          )}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 20, color: C.gray }}>Buscando...</div>}

        {!loading && ordenes.length > 0 && (
          <div>
            {/* Navegación Anterior / Siguiente */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <button onClick={() => setIndiceActual(p => Math.max(0, p - 1))} disabled={indiceActual === 0}
                style={{ ...st.btn(indiceActual === 0 ? C.lightGray : C.darkBlue, C.white), opacity: indiceActual === 0 ? 0.4 : 1 }}>
                <ChevronLeft size={16} /> Anterior
              </button>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.darkBlue }}>
                {indiceActual + 1} de {ordenes.length} coincidencia{ordenes.length > 1 ? 's' : ''}
              </span>
              <button onClick={() => setIndiceActual(p => Math.min(ordenes.length - 1, p + 1))} disabled={indiceActual >= ordenes.length - 1}
                style={{ ...st.btn(indiceActual >= ordenes.length - 1 ? C.lightGray : C.darkBlue, C.white), opacity: indiceActual >= ordenes.length - 1 ? 0.4 : 1 }}>
                Siguiente <ChevronRight size={16} />
              </button>
            </div>

            {/* Resultado actual */}
            {ordenActual && (
              <div style={{ border: `2px solid ${ordenActual.resolucion === 'FALTA POR CUMPLIR' ? C.red : C.green}`, borderRadius: 12, overflow: 'hidden' }}>
                {/* Banner de resolución */}
                <div style={{ padding: '10px 16px', backgroundColor: ordenActual.resolucion === 'FALTA POR CUMPLIR' ? '#ffebee' : '#e8f5e9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: ordenActual.resolucion === 'FALTA POR CUMPLIR' ? '#b71c1c' : '#2e7d32' }}>
                    {ordenActual.resolucion === 'FALTA POR CUMPLIR' ? '⚠ ORDEN VIGENTE — FALTA POR CUMPLIR' : '✅ ' + ordenActual.resolucion}
                  </span>
                  <span style={st.badge(C.darkBlue + '15', C.darkBlue)}>{ordenActual.mandato_judicial}</span>
                </div>

                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                    {/* Fotos */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      {ordenActual.foto_frente_url ? (
                        <img src={ordenActual.foto_frente_url} alt="Frente" style={{ width: 120, height: 150, objectFit: 'cover', borderRadius: 10, border: `2px solid ${C.lightGray}` }} />
                      ) : (
                        <div style={{ width: 120, height: 150, borderRadius: 10, backgroundColor: C.bg, border: `2px dashed ${C.lightGray}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.gray }}>
                          <User size={40} />
                          <span style={{ fontSize: 10, marginTop: 4 }}>Sin foto</span>
                        </div>
                      )}
                      {ordenActual.foto_perfil_url && (
                        <img src={ordenActual.foto_perfil_url} alt="Perfil" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.lightGray}` }} />
                      )}
                    </div>

                    {/* Datos principales */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: C.darkBlue, marginBottom: 4 }}>{ordenActual.inculpado}</div>
                      <div style={{ fontSize: 14, color: C.red, fontWeight: 600, marginBottom: 8 }}>{ordenActual.delito}{ordenActual.delito2 ? ' / ' + ordenActual.delito2 : ''}</div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        {[
                          { l: 'Causa Penal', v: ordenActual.causa_penal },
                          { l: 'No. Oficio', v: ordenActual.numero_oficio },
                          { l: 'Fecha Emisión', v: ordenActual.fecha_emision },
                          { l: 'A.V. Previa', v: ordenActual.av_previa },
                          { l: 'Folio', v: ordenActual.folio ? `${ordenActual.anio}/${ordenActual.folio}` : null },
                          { l: 'Comandancia', v: ordenActual.comandancia },
                          { l: 'Agraviado', v: ordenActual.agraviado },
                        ].filter(r => r.v).map((r, i) => (
                          <div key={i}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: C.gray, textTransform: 'uppercase' }}>{r.l}</div>
                            <div style={{ fontSize: 13, color: C.darkBlue, fontWeight: 500 }}>{r.v}</div>
                          </div>
                        ))}
                      </div>

                      {/* Descripción física */}
                      {(ordenActual.descripcion_fisica || ordenActual.senas_particulares || ordenActual.complexion) && (
                        <div style={{ padding: 12, backgroundColor: C.lightGold, borderRadius: 8, border: `1px solid ${C.gold}40` }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: 'uppercase', marginBottom: 6 }}>Descripción Física</div>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: C.darkBlue }}>
                            {ordenActual.sexo && <span>Sexo: {ordenActual.sexo}</span>}
                            {ordenActual.edad_aproximada && <span>Edad: ~{ordenActual.edad_aproximada}</span>}
                            {ordenActual.estatura && <span>Estatura: {ordenActual.estatura}</span>}
                            {ordenActual.complexion && <span>Complexión: {ordenActual.complexion}</span>}
                            {ordenActual.tez && <span>Tez: {ordenActual.tez}</span>}
                            {ordenActual.cabello && <span>Cabello: {ordenActual.cabello}</span>}
                          </div>
                          {ordenActual.senas_particulares && <div style={{ fontSize: 12, color: C.darkBlue, marginTop: 6 }}>Señas: {ordenActual.senas_particulares}</div>}
                          {ordenActual.descripcion_fisica && <div style={{ fontSize: 12, color: C.darkBlue, marginTop: 4, fontStyle: 'italic' }}>{ordenActual.descripcion_fisica}</div>}
                        </div>
                      )}

                      {ordenActual.observaciones && (
                        <div style={{ marginTop: 10, fontSize: 12, color: C.gray }}>Obs: {ordenActual.observaciones}</div>
                      )}

                      {ordenActual.oficio_mp_juez_url && (
                        <a href={ordenActual.oficio_mp_juez_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 12, color: C.gold, textDecoration: 'none' }}>
                          <FileText size={13} /> Ver oficio MP→Juez (PDF)
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && busqueda && ordenes.length === 0 && (
          <div style={{ textAlign: 'center', padding: 30, color: C.gray }}>
            <User size={40} color={C.lightGray} />
            <p style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>No se encontraron coincidencias para "{busqueda}"</p>
          </div>
        )}
      </div>

      {/* ═══ FORMULARIO REGISTRO ═══ */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,26,77,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 30, zIndex: 1000, overflowY: 'auto' }} onClick={() => setShowForm(false)}>
          <div style={{ backgroundColor: C.white, borderRadius: 14, width: '100%', maxWidth: 750, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', marginBottom: 40 }} onClick={e => e.stopPropagation()}>

            <div style={{ backgroundColor: C.darkBlue, color: C.white, padding: '18px 24px', borderRadius: '14px 14px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Target size={20} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>Registrar Orden de Aprehensión</span>
              </div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowForm(false)} />
            </div>

            <div style={{ padding: 24 }}>

              {/* Datos del mandato */}
              <div style={st.sTitle}><FileText size={15} /> Datos del Mandato Judicial</div>
              <div style={st.grid2}>
                <div style={st.fg}><label style={st.label}>Inculpado (nombre completo) *</label><input style={{ ...st.input, fontSize: 16, fontWeight: 600 }} value={form.inculpado} onChange={e => set('inculpado', e.target.value.toUpperCase())} placeholder="APELLIDO PATERNO MATERNO NOMBRE(S)" /></div>
                <div style={st.fg}>
                  <label style={st.label}>Mandato Judicial</label>
                  <select style={st.select} value={form.mandato_judicial} onChange={e => set('mandato_judicial', e.target.value)}>
                    <option value="APREHENSION">Aprehensión</option>
                    <option value="REAPREHENSION">Reaprehensión</option>
                  </select>
                </div>
                <div style={st.fg}><label style={st.label}>Delito *</label><input style={st.input} value={form.delito} onChange={e => set('delito', e.target.value.toUpperCase())} placeholder="HOMICIDIO CALIFICADO" /></div>
                <div style={st.fg}><label style={st.label}>Delito 2 (si aplica)</label><input style={st.input} value={form.delito2} onChange={e => set('delito2', e.target.value.toUpperCase())} /></div>
                <div style={st.fg}><label style={st.label}>Causa Penal</label><input style={st.input} value={form.causa_penal} onChange={e => set('causa_penal', e.target.value)} placeholder="17/2018-I" /></div>
                <div style={st.fg}><label style={st.label}>No. de Oficio</label><input style={st.input} value={form.numero_oficio} onChange={e => set('numero_oficio', e.target.value)} placeholder="235/2" /></div>
                <div style={st.fg}><label style={st.label}>Fecha de Emisión</label><input style={st.input} type="date" value={form.fecha_emision} onChange={e => set('fecha_emision', e.target.value)} /></div>
                <div style={st.fg}><label style={st.label}>A.V. Previa</label><input style={st.input} value={form.av_previa} onChange={e => set('av_previa', e.target.value)} placeholder="TAB/COY/02/0225/2013" /></div>
                <div style={st.fg}><label style={st.label}>Agraviado</label><input style={st.input} value={form.agraviado} onChange={e => set('agraviado', e.target.value.toUpperCase())} placeholder="NOMBRE DEL AGRAVIADO" /></div>
                <div style={st.fg}><label style={st.label}>Comandancia</label><input style={st.input} value={form.comandancia} onChange={e => set('comandancia', e.target.value)} placeholder="Coyuca de Benítez" /></div>
                <div style={st.fg}><label style={st.label}>Año</label><input style={st.input} type="number" value={form.anio} onChange={e => set('anio', e.target.value)} /></div>
                <div style={st.fg}><label style={st.label}>Folio</label><input style={st.input} value={form.folio} onChange={e => set('folio', e.target.value)} placeholder="0716" /></div>
                <div style={st.fg}>
                  <label style={st.label}>Resolución</label>
                  <select style={st.select} value={form.resolucion} onChange={e => set('resolucion', e.target.value)}>
                    <option value="FALTA POR CUMPLIR">Falta por cumplir</option>
                    <option value="CUMPLIDA">Cumplida</option>
                    <option value="CANCELADA">Cancelada</option>
                    <option value="PRESCRITA">Prescrita</option>
                  </select>
                </div>
              </div>

              {/* Descripción física */}
              <div style={{ ...st.sTitle, marginTop: 20 }}><User size={15} /> Identificación Visual del Inculpado</div>
              <div style={st.grid2}>
                <div style={st.fg}>
                  <label style={st.label}>Sexo</label>
                  <select style={st.select} value={form.sexo} onChange={e => set('sexo', e.target.value)}>
                    <option value="">—</option><option value="Masculino">Masculino</option><option value="Femenino">Femenino</option>
                  </select>
                </div>
                <div style={st.fg}><label style={st.label}>Edad aproximada</label><input style={st.input} type="number" value={form.edad_aproximada} onChange={e => set('edad_aproximada', e.target.value)} placeholder="35" /></div>
                <div style={st.fg}><label style={st.label}>Estatura</label><input style={st.input} value={form.estatura} onChange={e => set('estatura', e.target.value)} placeholder="1.75 m" /></div>
                <div style={st.fg}>
                  <label style={st.label}>Complexión</label>
                  <select style={st.select} value={form.complexion} onChange={e => set('complexion', e.target.value)}>
                    <option value="">—</option><option value="Delgada">Delgada</option><option value="Media">Media</option><option value="Robusta">Robusta</option><option value="Obesa">Obesa</option>
                  </select>
                </div>
                <div style={st.fg}>
                  <label style={st.label}>Tez</label>
                  <select style={st.select} value={form.tez} onChange={e => set('tez', e.target.value)}>
                    <option value="">—</option><option value="Blanca">Blanca</option><option value="Clara">Clara</option><option value="Media">Media</option><option value="Morena clara">Morena clara</option><option value="Morena">Morena</option><option value="Morena oscura">Morena oscura</option>
                  </select>
                </div>
                <div style={st.fg}><label style={st.label}>Cabello</label><input style={st.input} value={form.cabello} onChange={e => set('cabello', e.target.value)} placeholder="Negro, corto, lacio" /></div>
                <div style={{ ...st.fg, gridColumn: '1 / -1' }}><label style={st.label}>Señas particulares</label><input style={st.input} value={form.senas_particulares} onChange={e => set('senas_particulares', e.target.value)} placeholder="Cicatriz en ceja izquierda, tatuaje en antebrazo derecho..." /></div>
                <div style={{ ...st.fg, gridColumn: '1 / -1' }}><label style={st.label}>Descripción física general</label><textarea style={st.textarea} value={form.descripcion_fisica} onChange={e => set('descripcion_fisica', e.target.value)} placeholder="Media filiación completa..." rows={2} /></div>
              </div>
{/* Archivos adjuntos */}
              <div style={{ ...st.sTitle, marginTop: 20 }}><Camera size={15} /> Fotografías y Oficio Escaneado</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div style={st.fg}>
                  <label style={st.label}>Foto de Frente</label>
                  <div style={{ border: `2px dashed ${fotoFrente ? C.green : C.lightGray}`, borderRadius: 10, padding: 14, textAlign: 'center', cursor: 'pointer', backgroundColor: fotoFrente ? '#e8f5e9' : C.bg }}
                    onClick={() => document.getElementById('foto-frente-oa').click()}>
                    {fotoFrente ? <div><CheckCircle2 size={20} color={C.green} /><div style={{ fontSize: 11, color: C.green, marginTop: 4 }}>{fotoFrente.name}</div></div> : <div><Camera size={20} color={C.gray} /><div style={{ fontSize: 10, color: C.gray, marginTop: 4 }}>Clic para subir</div></div>}
                    <input id="foto-frente-oa" type="file" accept="image/jpeg,image/png" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) setFotoFrente(e.target.files[0]); }} />
                  </div>
                </div>
                <div style={st.fg}>
                  <label style={st.label}>Foto de Perfil</label>
                  <div style={{ border: `2px dashed ${fotoPerfil ? C.green : C.lightGray}`, borderRadius: 10, padding: 14, textAlign: 'center', cursor: 'pointer', backgroundColor: fotoPerfil ? '#e8f5e9' : C.bg }}
                    onClick={() => document.getElementById('foto-perfil-oa').click()}>
                    {fotoPerfil ? <div><CheckCircle2 size={20} color={C.green} /><div style={{ fontSize: 11, color: C.green, marginTop: 4 }}>{fotoPerfil.name}</div></div> : <div><User size={20} color={C.gray} /><div style={{ fontSize: 10, color: C.gray, marginTop: 4 }}>Clic para subir</div></div>}
                    <input id="foto-perfil-oa" type="file" accept="image/jpeg,image/png" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) setFotoPerfil(e.target.files[0]); }} />
                  </div>
                </div>
                <div style={st.fg}>
                  <label style={st.label}>Oficio MP→Juez (PDF)</label>
                  <div style={{ border: `2px dashed ${oficioArchivo ? C.green : C.lightGray}`, borderRadius: 10, padding: 14, textAlign: 'center', cursor: 'pointer', backgroundColor: oficioArchivo ? '#e8f5e9' : C.bg }}
                    onClick={() => document.getElementById('oficio-oa').click()}>
                    {oficioArchivo ? <div><CheckCircle2 size={20} color={C.green} /><div style={{ fontSize: 11, color: C.green, marginTop: 4 }}>{oficioArchivo.name}</div></div> : <div><FileText size={20} color={C.gray} /><div style={{ fontSize: 10, color: C.gray, marginTop: 4 }}>Clic para subir</div></div>}
                    <input id="oficio-oa" type="file" accept="image/jpeg,image/png,application/pdf" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) setOficioArchivo(e.target.files[0]); }} />
                  </div>
                </div>
              </div>
              {/* Observaciones */}
              <div style={{ ...st.fg, marginTop: 14 }}>
                <label style={st.label}>Observaciones</label>
                <textarea style={st.textarea} value={form.observaciones} onChange={e => set('observaciones', e.target.value)} placeholder="Juez emisor, juzgado, notas adicionales..." rows={2} />
              </div>

              {mensaje && (
                <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: mensaje.tipo === 'ok' ? '#e8f5e9' : '#ffebee', color: mensaje.tipo === 'ok' ? '#1b5e20' : '#b71c1c', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  {mensaje.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {mensaje.texto}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.lightGray}`, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowForm(false)} style={{ backgroundColor: 'transparent', color: C.gray, border: `1px solid ${C.lightGray}`, borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button style={{ ...st.btn(C.gold, C.white), opacity: saving ? 0.6 : 1 }} onClick={handleSubmit} disabled={saving}>
                <Send size={15} /> {saving ? 'Guardando...' : 'Registrar Orden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
