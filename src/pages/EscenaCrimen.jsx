// src/pages/EscenaCrimen.jsx
// Tab 3 — Escena del Crimen
// Sistema Ministerial — FGE Guerrero — Módulo 2
// Fundamento: Protocolo Nacional de Actuación PR, Guía Nacional Cadena de Custodia

import { useState } from 'react';
import {
  MapPin, Clock, AlertTriangle, CheckCircle2, Plus, Search, X, Send,
  RefreshCw, Eye, Shield, FileText, Radio, Crosshair, Users, Camera,
  ShieldAlert, Lock, Activity, Zap, Flag,
} from 'lucide-react';
import { useEscenasCrimen } from '../hooks/useEscenasCrimen';

const C = {
  darkBlue: '#001a4d', gold: '#b69054', lightGold: '#f5ede0',
  white: '#ffffff', bg: '#f4f6fb', gray: '#666666', lightGray: '#e8ecf1',
  green: '#28a745', yellow: '#ffc107', red: '#dc3545', orange: '#fd7e14',
};

const TIPO_ESCENA = [
  { key: 'abierta', label: 'Abierta', desc: 'Vía pública, terreno, campo abierto' },
  { key: 'cerrada', label: 'Cerrada', desc: 'Domicilio, edificio, vehículo' },
  { key: 'mixta', label: 'Mixta', desc: 'Combina espacios abiertos y cerrados' },
  { key: 'virtual', label: 'Virtual', desc: 'Evidencia digital, ciberdelitos' },
];

const ESTATUS_MINISTERIAL = {
  recibida: { label: 'Recibida', bg: '#e3f2fd', color: '#1565c0' },
  en_procesamiento: { label: 'En procesamiento', bg: '#fff3e0', color: '#e65100' },
  en_investigacion: { label: 'En investigación', bg: '#f3e5f5', color: '#6a1b9a' },
  procesada: { label: 'Procesada', bg: '#e8f5e9', color: '#2e7d32' },
  liberada: { label: 'Liberada', bg: '#eceff1', color: '#546e7a' },
};

const CONDICIONES_CLIMA = ['Despejado', 'Nublado', 'Lluvia ligera', 'Lluvia intensa', 'Viento fuerte', 'Neblina', 'Nocturno sin iluminación', 'Nocturno con iluminación'];

const ESTRATEGIAS = [
  { key: 'espiral', label: 'Espiral', desc: 'Del centro hacia afuera o viceversa' },
  { key: 'franjas', label: 'Franjas paralelas', desc: 'Barrido sistemático en líneas' },
  { key: 'cuadricula', label: 'Cuadrícula', desc: 'Doble barrido perpendicular' },
  { key: 'zonas', label: 'Por zonas / sectores', desc: 'División en áreas designadas' },
  { key: 'punto_a_punto', label: 'Punto a punto', desc: 'De indicio a indicio' },
  { key: 'rueda', label: 'Rueda / radial', desc: 'Desde el centro en líneas radiales' },
];

const PROTOCOLO_FLAGS = [
  { key: 'es_feminicidio', label: 'Protocolo de Feminicidio', color: '#c62828', icon: ShieldAlert, desc: 'Activa protocolo SESNSP de investigación de feminicidio' },
  { key: 'es_violencia_genero', label: 'Violencia de Género', color: '#ad1457', icon: Flag, desc: 'Activa protocolo de actuación policial ante violencia contra mujeres' },
  { key: 'involucra_adolescente', label: 'Involucra Adolescente', color: '#e65100', icon: Users, desc: 'Activa protocolo de investigación ministerial en adolescentes' },
  { key: 'involucra_diversidad_sexual', label: 'Diversidad Sexual (LGBTI+)', color: '#6a1b9a', icon: Shield, desc: 'Activa protocolo LGBTI+ — 7 indicadores de prejuicio CIDH' },
];

function formatDate(d) { if (!d) return '—'; return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }

// Shared styles
const st = {
  btn: (bg, clr) => ({ backgroundColor: bg, color: clr, border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }),
  btnOutline: { backgroundColor: 'transparent', color: C.darkBlue, border: `2px solid ${C.darkBlue}`, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  input: { padding: '10px 12px', border: `1px solid ${C.lightGray}`, borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  select: { padding: '10px 12px', border: `1px solid ${C.lightGray}`, borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: C.white, fontFamily: 'inherit', cursor: 'pointer', width: '100%', boxSizing: 'border-box' },
  textarea: { padding: '10px 12px', border: `1px solid ${C.lightGray}`, borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical', minHeight: 70, width: '100%', boxSizing: 'border-box' },
  label: { fontSize: 12, fontWeight: 600, color: C.darkBlue, marginBottom: 4, display: 'block' },
  req: { color: C.red, marginLeft: 2 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  badge: (bg, clr) => ({ display: 'inline-block', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, backgroundColor: bg, color: clr }),
  checkbox: (active, clr) => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
    border: `1px solid ${active ? clr : C.lightGray}`, backgroundColor: active ? clr + '12' : 'transparent',
  }),
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${C.lightGray}`, backgroundColor: C.bg, whiteSpace: 'nowrap' },
  td: { padding: '12px 16px', fontSize: 13, borderBottom: `1px solid ${C.lightGray}`, color: C.darkBlue },
};

export default function EscenaCrimen({ perfil }) {
  const { escenas, reportes911, loading, stats, crearEscena, actualizarEscena, refetch } = useEscenasCrimen(perfil);

  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [seccion, setSeccion] = useState(1);

  const emptyForm = {
    registro_911_id: '',
    carpeta_investigacion: '',
    tipo_escena: '',
    escena_primaria: true,
    ubicacion_texto: '',
    coordenadas_lat: '',
    coordenadas_lng: '',
    municipio: '',
    fecha_procesamiento: new Date().toISOString().split('T')[0],
    hora_inicio_procesamiento: '',
    hora_fin_procesamiento: '',
    condiciones_climatologicas: '',
    iluminacion: '',
    preservacion_adecuada: false,
    acordonamiento_doble: false,
    contaminacion_detectada: false,
    contaminacion_descripcion: '',
    estrategia_investigacion: '',
    descripcion_escena: '',
    observaciones_iniciales: '',
    estatus_ministerial: 'recibida',
    mp_coordinador: '',
    pim_responsable: '',
    pcp_responsable: '',
    // Protocol flags
    es_feminicidio: false,
    es_violencia_genero: false,
    involucra_adolescente: false,
    involucra_diversidad_sexual: false,
  };
  const [form, setForm] = useState(emptyForm);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.tipo_escena) return setMensaje({ tipo: 'error', texto: 'Selecciona el tipo de escena' });
    if (!form.ubicacion_texto.trim()) return setMensaje({ tipo: 'error', texto: 'La ubicación es obligatoria' });
    if (!form.descripcion_escena.trim()) return setMensaje({ tipo: 'error', texto: 'La descripción de la escena es obligatoria' });

    setSaving(true); setMensaje(null);

    const data = {
      registro_911_id: form.registro_911_id || null,
      carpeta_investigacion: form.carpeta_investigacion || null,
      tipo_escena: form.tipo_escena,
      escena_primaria: form.escena_primaria,
      ubicacion_texto: form.ubicacion_texto,
      coordenadas_lat: form.coordenadas_lat ? parseFloat(form.coordenadas_lat) : null,
      coordenadas_lng: form.coordenadas_lng ? parseFloat(form.coordenadas_lng) : null,
      municipio: form.municipio || null,
      fecha_procesamiento: form.fecha_procesamiento || null,
      hora_inicio_procesamiento: form.hora_inicio_procesamiento || null,
      hora_fin_procesamiento: form.hora_fin_procesamiento || null,
      condiciones_climatologicas: form.condiciones_climatologicas || null,
      iluminacion: form.iluminacion || null,
      preservacion_adecuada: form.preservacion_adecuada,
      acordonamiento_doble: form.acordonamiento_doble,
      contaminacion_detectada: form.contaminacion_detectada,
      contaminacion_descripcion: form.contaminacion_detectada ? form.contaminacion_descripcion : null,
      estrategia_investigacion: form.estrategia_investigacion || null,
      descripcion_escena: form.descripcion_escena,
      observaciones_iniciales: form.observaciones_iniciales || null,
      estatus_ministerial: form.estatus_ministerial,
      mp_coordinador: form.mp_coordinador || null,
      pim_responsable: form.pim_responsable || null,
      pcp_responsable: form.pcp_responsable || null,
      es_feminicidio: form.es_feminicidio,
      es_violencia_genero: form.es_violencia_genero,
      involucra_adolescente: form.involucra_adolescente,
      involucra_diversidad_sexual: form.involucra_diversidad_sexual,
    };

    const result = await crearEscena(data);
    setSaving(false);

    if (result.success) {
      setMensaje({ tipo: 'ok', texto: 'Escena del crimen registrada correctamente' });
      setForm(emptyForm); setSeccion(1);
      setTimeout(() => { setShowForm(false); setMensaje(null); }, 1500);
    } else {
      setMensaje({ tipo: 'error', texto: result.error || 'Error al guardar' });
    }
  };

  const filtradas = escenas.filter(e => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (e.ubicacion_texto || '').toLowerCase().includes(q) ||
      (e.carpeta_investigacion || '').toLowerCase().includes(q) ||
      (e.registros_911?.folio_911 || '').toLowerCase().includes(q) ||
      (e.municipio || '').toLowerCase().includes(q);
  });

  const hayProtocoloActivo = form.es_feminicidio || form.es_violencia_genero || form.involucra_adolescente || form.involucra_diversidad_sexual;

  return (
    <div style={{ padding: 24, fontFamily: 'Segoe UI, Arial, sans-serif', backgroundColor: C.bg, minHeight: '100vh' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.darkBlue, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <Crosshair size={22} color={C.gold} /> Escena del Crimen
          </h2>
          <p style={{ fontSize: 13, color: C.gray, margin: '4px 0 0 0' }}>Módulo 2 · Tab 3 · Procesamiento y documentación de la escena</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={st.btnOutline} onClick={refetch}><RefreshCw size={15} /> Actualizar</button>
          <button style={st.btn(C.darkBlue, C.white)} onClick={() => { setForm(emptyForm); setSeccion(1); setShowForm(true); setMensaje(null); }}>
            <Plus size={16} /> Nueva Escena
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total escenas', value: stats.total, color: C.darkBlue, icon: Crosshair },
          { label: 'Activas', value: stats.activas, color: C.orange, icon: Activity },
          { label: 'Procesadas', value: stats.procesadas, color: C.green, icon: CheckCircle2 },
          { label: 'Feminicidio', value: stats.feminicidio, color: C.red, icon: ShieldAlert },
          { label: 'Alto impacto', value: stats.alto_impacto, color: '#6a1b9a', icon: Zap },
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

      {/* TABLE */}
      <div style={{ backgroundColor: C.white, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.lightGray}`, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderRadius: 8, padding: '8px 14px', flex: 1, maxWidth: 350 }}>
            <Search size={16} color={C.gray} />
            <input type="text" placeholder="Buscar por ubicación, carpeta, folio..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: 14, backgroundColor: 'transparent', flex: 1, fontFamily: 'inherit' }} />
            {searchTerm && <X size={14} color={C.gray} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.gray }}><RefreshCw size={32} /><p>Cargando escenas...</p></div>
        ) : filtradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.gray }}>
            <Crosshair size={40} color={C.lightGray} />
            <p style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>{searchTerm ? 'Sin resultados' : 'No hay escenas registradas'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={st.th}>Folio / Carpeta</th>
                  <th style={st.th}>Tipo</th>
                  <th style={st.th}>Ubicación</th>
                  <th style={st.th}>Estatus</th>
                  <th style={st.th}>Protocolos</th>
                  <th style={st.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((e, idx) => {
                  const em = ESTATUS_MINISTERIAL[e.estatus_ministerial] || ESTATUS_MINISTERIAL.recibida;
                  const protocolos = [
                    e.es_feminicidio && '🔴 FEM',
                    e.es_violencia_genero && '🟣 VG',
                    e.involucra_adolescente && '🟠 ADOL',
                    e.involucra_diversidad_sexual && '🟣 LGBTI+',
                  ].filter(Boolean);
                  return (
                    <tr key={e.id} style={{ backgroundColor: idx % 2 === 0 ? C.white : C.bg, cursor: 'pointer' }}
                      onMouseEnter={ev => ev.currentTarget.style.backgroundColor = C.lightGold}
                      onMouseLeave={ev => ev.currentTarget.style.backgroundColor = idx % 2 === 0 ? C.white : C.bg}
                      onClick={() => setShowDetail(e)}>
                      <td style={st.td}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>
                          {e.registros_911?.folio_911 || '(Sin 911)'}
                        </div>
                        {e.carpeta_investigacion && <div style={{ fontSize: 11, color: C.gray, fontFamily: 'monospace' }}>CI: {e.carpeta_investigacion}</div>}
                      </td>
                      <td style={st.td}><span style={st.badge(C.darkBlue + '15', C.darkBlue)}>{e.tipo_escena || '—'}</span></td>
                      <td style={{ ...st.td, maxWidth: 200 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.ubicacion_texto}</div>
                        {e.municipio && <div style={{ fontSize: 11, color: C.gray }}>{e.municipio}</div>}
                      </td>
                      <td style={st.td}><span style={st.badge(em.bg, em.color)}>{em.label}</span></td>
                      <td style={st.td}>
                        {protocolos.length > 0
                          ? protocolos.map((p, i) => <span key={i} style={{ fontSize: 10, marginRight: 4 }}>{p}</span>)
                          : <span style={{ color: C.gray, fontSize: 11 }}>—</span>
                        }
                      </td>
                      <td style={st.td}>
                        <button style={{ ...st.btnOutline, padding: '4px 10px', fontSize: 11 }} onClick={ev => { ev.stopPropagation(); setShowDetail(e); }}>
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
          <div style={{ backgroundColor: C.white, borderRadius: 14, width: '100%', maxWidth: 750, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', marginBottom: 40 }} onClick={e => e.stopPropagation()}>

            <div style={{ backgroundColor: C.darkBlue, color: C.white, padding: '18px 24px', borderRadius: '14px 14px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Crosshair size={20} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>Nueva Escena del Crimen</span>
              </div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowForm(false)} />
            </div>

            {/* Protocol flags banner */}
            {hayProtocoloActivo && (
              <div style={{ backgroundColor: '#ffebee', borderBottom: `2px solid ${C.red}`, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <ShieldAlert size={16} color={C.red} />
                <span style={{ color: '#b71c1c', fontSize: 12, fontWeight: 700 }}>PROTOCOLOS ESPECIALES ACTIVADOS:</span>
                {PROTOCOLO_FLAGS.filter(f => form[f.key]).map(f => (
                  <span key={f.key} style={st.badge(f.color + '20', f.color)}>{f.label}</span>
                ))}
              </div>
            )}

            <div style={{ padding: 24 }}>

              {/* Tab navigation */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                  { n: 1, label: 'Vinculación', icon: Radio },
                  { n: 2, label: 'Escena', icon: MapPin },
                  { n: 3, label: 'Preservación', icon: Shield },
                  { n: 4, label: 'Procesamiento', icon: Crosshair },
                  { n: 5, label: 'Protocolos', icon: Flag },
                ].map(t => (
                  <button key={t.n} onClick={() => setSeccion(t.n)} style={{
                    padding: '8px 16px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    border: `1px solid ${seccion === t.n ? C.gold : C.lightGray}`,
                    backgroundColor: seccion === t.n ? C.lightGold : C.white,
                    color: seccion === t.n ? C.gold : C.gray, fontSize: 12, fontWeight: 700,
                  }}>
                    <t.icon size={14} /> {t.label}
                  </button>
                ))}
              </div>

              {/* SEC 1: Vinculación */}
              {seccion === 1 && (
                <div>
                  <div style={st.sectionTitle}><Radio size={15} /> Vinculación y Carpeta</div>
                  <div style={st.formGroup}>
                    <label style={st.label}>Vincular a Reporte 911 (opcional)</label>
                    <select style={st.select} value={form.registro_911_id} onChange={e => set('registro_911_id', e.target.value)}>
                      <option value="">— Sin vincular / PIM llegó directo —</option>
                      {reportes911.map(r => (
                        <option key={r.id} value={r.id}>{r.folio_911} — {r.catalogo_incidencias?.nombre || r.incidencia_tipo} — {(r.ubicacion_texto || '').substring(0, 40)}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ ...st.grid2, marginTop: 14 }}>
                    <div style={st.formGroup}>
                      <label style={st.label}>Carpeta de investigación</label>
                      <input style={{ ...st.input, fontFamily: 'monospace' }} placeholder="Asignada por el MP" value={form.carpeta_investigacion} onChange={e => set('carpeta_investigacion', e.target.value)} />
                    </div>
                    <div style={st.formGroup}>
                      <label style={st.label}>Estatus ministerial</label>
                      <select style={st.select} value={form.estatus_ministerial} onChange={e => set('estatus_ministerial', e.target.value)}>
                        {Object.entries(ESTATUS_MINISTERIAL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ ...st.grid2, marginTop: 14 }}>
                    <div style={st.formGroup}>
                      <label style={st.label}>MP coordinador</label>
                      <input style={st.input} placeholder="Nombre del Agente del MP" value={form.mp_coordinador} onChange={e => set('mp_coordinador', e.target.value)} />
                    </div>
                    <div style={st.formGroup}>
                      <label style={st.label}>PIM responsable</label>
                      <input style={st.input} placeholder="Policía de Investigación Ministerial" value={form.pim_responsable} onChange={e => set('pim_responsable', e.target.value)} />
                    </div>
                    <div style={st.formGroup}>
                      <label style={st.label}>PCP responsable</label>
                      <input style={st.input} placeholder="Policía con Capacidades para Procesar" value={form.pcp_responsable} onChange={e => set('pcp_responsable', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* SEC 2: Escena */}
              {seccion === 2 && (
                <div>
                  <div style={st.sectionTitle}><MapPin size={15} /> Clasificación y Ubicación</div>

                  <label style={st.label}>Tipo de escena <span style={st.req}>*</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {TIPO_ESCENA.map(t => (
                      <button key={t.key} onClick={() => set('tipo_escena', t.key)} style={{
                        padding: '12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                        border: form.tipo_escena === t.key ? `2px solid ${C.gold}` : `1px solid ${C.lightGray}`,
                        backgroundColor: form.tipo_escena === t.key ? C.lightGold : C.white,
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: form.tipo_escena === t.key ? C.darkBlue : C.gray }}>{t.label}</div>
                        <div style={{ fontSize: 11, color: C.gray }}>{t.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div style={{ ...st.checkbox(form.escena_primaria, C.green), marginBottom: 14 }} onClick={() => set('escena_primaria', !form.escena_primaria)}>
                    <input type="checkbox" checked={form.escena_primaria} readOnly style={{ width: 16, height: 16 }} />
                    <span style={{ color: form.escena_primaria ? '#1b5e20' : C.gray, fontWeight: 600, fontSize: 13 }}>
                      {form.escena_primaria ? 'Escena primaria (lugar principal de los hechos)' : 'Escena secundaria (lugar relacionado)'}
                    </span>
                  </div>

                  <div style={st.formGroup}>
                    <label style={st.label}>Ubicación / Dirección <span style={st.req}>*</span></label>
                    <input style={st.input} placeholder="Descripción completa del lugar" value={form.ubicacion_texto} onChange={e => set('ubicacion_texto', e.target.value)} />
                  </div>
                  <div style={{ ...st.grid2, marginTop: 10 }}>
                    <div style={st.formGroup}>
                      <label style={st.label}>Municipio</label>
                      <input style={st.input} placeholder="Ej: Acapulco" value={form.municipio} onChange={e => set('municipio', e.target.value)} />
                    </div>
                    <div style={st.formGroup}>
                      <label style={st.label}>Latitud</label>
                      <input type="number" step="0.0000001" style={st.input} placeholder="16.8531" value={form.coordenadas_lat} onChange={e => set('coordenadas_lat', e.target.value)} />
                    </div>
                    <div style={st.formGroup}>
                      <label style={st.label}>Longitud</label>
                      <input type="number" step="0.0000001" style={st.input} placeholder="-99.8237" value={form.coordenadas_lng} onChange={e => set('coordenadas_lng', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* SEC 3: Preservación */}
              {seccion === 3 && (
                <div>
                  <div style={st.sectionTitle}><Shield size={15} /> Preservación del Lugar</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {[
                      { key: 'preservacion_adecuada', label: 'Preservación adecuada del lugar', color: C.green },
                      { key: 'acordonamiento_doble', label: 'Acordonamiento doble (interno y externo)', color: C.green },
                      { key: 'contaminacion_detectada', label: 'Se detectó contaminación de la escena', color: C.red },
                    ].map(opt => (
                      <div key={opt.key} style={st.checkbox(form[opt.key], opt.color)} onClick={() => set(opt.key, !form[opt.key])}>
                        <input type="checkbox" checked={form[opt.key]} readOnly style={{ width: 16, height: 16 }} />
                        <span style={{ color: form[opt.key] ? opt.color : C.gray, fontWeight: 600, fontSize: 13 }}>{opt.label}</span>
                      </div>
                    ))}
                  </div>

                  {form.contaminacion_detectada && (
                    <div style={st.formGroup}>
                      <label style={st.label}>Descripción de la contaminación</label>
                      <textarea style={st.textarea} placeholder="Personas que ingresaron, objetos movidos, condiciones que alteraron la escena..." value={form.contaminacion_descripcion} onChange={e => set('contaminacion_descripcion', e.target.value)} rows={3} />
                    </div>
                  )}

                  <div style={{ ...st.grid2, marginTop: 14 }}>
                    <div style={st.formGroup}>
                      <label style={st.label}>Condiciones climatológicas</label>
                      <select style={st.select} value={form.condiciones_climatologicas} onChange={e => set('condiciones_climatologicas', e.target.value)}>
                        <option value="">— Seleccionar —</option>
                        {CONDICIONES_CLIMA.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={st.formGroup}>
                      <label style={st.label}>Iluminación</label>
                      <select style={st.select} value={form.iluminacion} onChange={e => set('iluminacion', e.target.value)}>
                        <option value="">— Seleccionar —</option>
                        <option value="natural">Natural (diurno)</option>
                        <option value="artificial">Artificial</option>
                        <option value="mixta">Mixta</option>
                        <option value="insuficiente">Insuficiente</option>
                        <option value="sin_iluminacion">Sin iluminación</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* SEC 4: Procesamiento */}
              {seccion === 4 && (
                <div>
                  <div style={st.sectionTitle}><Crosshair size={15} /> Procesamiento y Estrategia</div>
                  <div style={{ ...st.grid2, marginBottom: 14 }}>
                    <div style={st.formGroup}>
                      <label style={st.label}>Fecha de procesamiento</label>
                      <input type="date" style={st.input} value={form.fecha_procesamiento} onChange={e => set('fecha_procesamiento', e.target.value)} />
                    </div>
                    <div style={st.formGroup}>
                      <label style={st.label}>Hora inicio</label>
                      <input type="time" style={st.input} value={form.hora_inicio_procesamiento} onChange={e => set('hora_inicio_procesamiento', e.target.value)} />
                    </div>
                    <div style={st.formGroup}>
                      <label style={st.label}>Hora fin</label>
                      <input type="time" style={st.input} value={form.hora_fin_procesamiento} onChange={e => set('hora_fin_procesamiento', e.target.value)} />
                    </div>
                  </div>

                  <label style={st.label}>Estrategia de búsqueda / procesamiento</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {ESTRATEGIAS.map(e => (
                      <button key={e.key} onClick={() => set('estrategia_investigacion', e.key)} style={{
                        padding: '10px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                        border: form.estrategia_investigacion === e.key ? `2px solid ${C.gold}` : `1px solid ${C.lightGray}`,
                        backgroundColor: form.estrategia_investigacion === e.key ? C.lightGold : C.white,
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: form.estrategia_investigacion === e.key ? C.darkBlue : C.gray }}>{e.label}</div>
                        <div style={{ fontSize: 11, color: C.gray }}>{e.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div style={st.formGroup}>
                    <label style={st.label}>Descripción de la escena <span style={st.req}>*</span></label>
                    <textarea style={st.textarea} placeholder="Descripción detallada de lo que se encontró en la escena..." value={form.descripcion_escena} onChange={e => set('descripcion_escena', e.target.value)} rows={4} />
                  </div>
                  <div style={{ ...st.formGroup, marginTop: 10 }}>
                    <label style={st.label}>Observaciones iniciales</label>
                    <textarea style={st.textarea} placeholder="Observaciones adicionales..." value={form.observaciones_iniciales} onChange={e => set('observaciones_iniciales', e.target.value)} rows={2} />
                  </div>
                </div>
              )}

              {/* SEC 5: Protocolos Especiales */}
              {seccion === 5 && (
                <div>
                  <div style={st.sectionTitle}><Flag size={15} /> Protocolos Especiales</div>
                  <p style={{ fontSize: 12, color: C.gray, marginBottom: 14 }}>
                    Activa los protocolos que aplican. Cada uno agrega campos obligatorios y genera alertas específicas.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {PROTOCOLO_FLAGS.map(pf => (
                      <div key={pf.key} style={{
                        ...st.checkbox(form[pf.key], pf.color),
                        padding: '14px', borderWidth: form[pf.key] ? 2 : 1,
                      }} onClick={() => set(pf.key, !form[pf.key])}>
                        <input type="checkbox" checked={form[pf.key]} readOnly style={{ width: 18, height: 18 }} />
                        <pf.icon size={18} color={form[pf.key] ? pf.color : C.gray} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: form[pf.key] ? pf.color : C.gray }}>{pf.label}</div>
                          <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>{pf.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {form.es_feminicidio && (
                    <div style={{ marginTop: 14, padding: 14, backgroundColor: '#ffebee', border: `1px solid ${C.red}30`, borderRadius: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#b71c1c', marginBottom: 4 }}>⚠ Protocolo de Feminicidio Activado</div>
                      <div style={{ fontSize: 12, color: '#795548', lineHeight: 1.5 }}>
                        Se aplica debida diligencia reforzada. Requiere perspectiva de género en toda la investigación. Personal especializado debe intervenir. Se documentará conforme al Protocolo SESNSP de Investigación en Casos de Feminicidio.
                      </div>
                    </div>
                  )}

                  {form.involucra_diversidad_sexual && (
                    <div style={{ marginTop: 14, padding: 14, backgroundColor: '#f3e5f5', border: `1px solid #6a1b9a30`, borderRadius: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#4a148c', marginBottom: 4 }}>Protocolo LGBTI+ — Indicadores de Prejuicio (CIDH)</div>
                      <div style={{ fontSize: 12, color: '#795548', lineHeight: 1.5 }}>
                        Se evaluarán los 7 indicadores de prejuicio: contexto de discriminación, ensañamiento, exposición pública del cuerpo, discurso de odio, mutilación de atributos identitarios, antecedentes de violencia, y zona de riesgo conocida.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mensaje && (
                <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: mensaje.tipo === 'ok' ? '#e8f5e9' : '#ffebee', color: mensaje.tipo === 'ok' ? '#1b5e20' : '#b71c1c', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  {mensaje.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {mensaje.texto}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.lightGray}`, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              {seccion > 1 && <button onClick={() => setSeccion(p => p - 1)} style={{ backgroundColor: 'transparent', color: C.gray, border: `1px solid ${C.lightGray}`, borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: 'pointer' }}>← Anterior</button>}
              <div style={{ flex: 1 }} />
              {seccion < 5 ? (
                <button onClick={() => setSeccion(p => p + 1)} style={st.btn(C.darkBlue, C.white)}>Siguiente →</button>
              ) : (
                <button style={{ ...st.btn(C.gold, C.white), opacity: saving ? 0.6 : 1 }} onClick={handleSubmit} disabled={saving}>
                  <Send size={15} /> {saving ? 'Guardando...' : 'Registrar Escena'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ DETAIL PANEL ═══ */}
      {showDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,26,77,0.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }} onClick={() => setShowDetail(null)}>
          <div style={{ backgroundColor: C.white, width: '100%', maxWidth: 500, height: '100%', overflowY: 'auto', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>

            <div style={{ backgroundColor: C.darkBlue, color: C.white, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Escena del Crimen</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{showDetail.tipo_escena} — {showDetail.escena_primaria ? 'Primaria' : 'Secundaria'}</div>
              </div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowDetail(null)} />
            </div>

            {/* Protocol flags */}
            {(showDetail.es_feminicidio || showDetail.es_violencia_genero || showDetail.involucra_adolescente || showDetail.involucra_diversidad_sexual) && (
              <div style={{ padding: '10px 20px', backgroundColor: '#ffebee', borderBottom: `1px solid ${C.red}30`, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PROTOCOLO_FLAGS.filter(f => showDetail[f.key]).map(f => (
                  <span key={f.key} style={st.badge(f.color + '20', f.color)}>{f.label}</span>
                ))}
              </div>
            )}

            {/* Estatus */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.lightGray}` }}>
              {(() => { const em = ESTATUS_MINISTERIAL[showDetail.estatus_ministerial] || {}; return <span style={st.badge(em.bg, em.color)}>{em.label}</span>; })()}
            </div>

            {[
              { label: 'Folio 911', value: showDetail.registros_911?.folio_911 },
              { label: 'Carpeta investigación', value: showDetail.carpeta_investigacion },
              { label: 'Tipo de escena', value: showDetail.tipo_escena },
              { label: 'Ubicación', value: showDetail.ubicacion_texto },
              { label: 'Municipio', value: showDetail.municipio },
              { label: 'Coordenadas', value: showDetail.coordenadas_lat && showDetail.coordenadas_lng ? `${showDetail.coordenadas_lat}, ${showDetail.coordenadas_lng}` : null },
              { label: 'Fecha procesamiento', value: formatDate(showDetail.fecha_procesamiento) },
              { label: 'Hora inicio', value: showDetail.hora_inicio_procesamiento },
              { label: 'Hora fin', value: showDetail.hora_fin_procesamiento },
              { label: 'Clima', value: showDetail.condiciones_climatologicas },
              { label: 'Iluminación', value: showDetail.iluminacion },
              { label: 'Preservación', value: showDetail.preservacion_adecuada ? '✅ Adecuada' : '❌ Inadecuada' },
              { label: 'Acordonamiento doble', value: showDetail.acordonamiento_doble ? '✅ Sí' : '❌ No' },
              { label: 'Contaminación', value: showDetail.contaminacion_detectada ? '⚠️ Detectada' : 'No detectada' },
              { label: 'Estrategia', value: showDetail.estrategia_investigacion },
              { label: 'MP coordinador', value: showDetail.mp_coordinador },
              { label: 'PIM responsable', value: showDetail.pim_responsable },
              { label: 'PCP responsable', value: showDetail.pcp_responsable },
              { label: 'Región', value: showDetail.region },
            ].filter(r => r.value).map((row, i) => (
              <div key={i} style={{ padding: '10px 20px', borderBottom: `1px solid ${C.lightGray}`, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.gray, textTransform: 'uppercase', minWidth: 120 }}>{row.label}</span>
                <span style={{ fontSize: 14, color: C.darkBlue, textAlign: 'right', flex: 1, wordBreak: 'break-word' }}>{row.value}</span>
              </div>
            ))}

            {showDetail.descripcion_escena && (
              <div style={{ padding: '14px 20px', borderTop: `2px solid ${C.lightGray}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', marginBottom: 8 }}>Descripción de la Escena</div>
                <div style={{ fontSize: 14, color: C.darkBlue, lineHeight: 1.6, backgroundColor: C.bg, padding: 12, borderRadius: 8 }}>{showDetail.descripcion_escena}</div>
              </div>
            )}

            {showDetail.contaminacion_descripcion && (
              <div style={{ padding: '14px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.red, textTransform: 'uppercase', marginBottom: 8 }}>Contaminación Detectada</div>
                <div style={{ fontSize: 14, color: C.darkBlue, lineHeight: 1.6, backgroundColor: '#ffebee', padding: 12, borderRadius: 8 }}>{showDetail.contaminacion_descripcion}</div>
              </div>
            )}

            {/* Cambiar estatus */}
            <div style={{ padding: '14px 20px', borderTop: `2px solid ${C.lightGray}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', marginBottom: 8 }}>Cambiar Estatus Ministerial</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(ESTATUS_MINISTERIAL).filter(([k]) => k !== showDetail.estatus_ministerial).map(([k, v]) => (
                  <button key={k} style={{ ...st.badge(v.bg, v.color), border: `1px solid ${v.color}30`, cursor: 'pointer', padding: '6px 12px', fontSize: 12 }}
                    onClick={async () => { await actualizarEscena(showDetail.id, { estatus_ministerial: k }); setShowDetail(p => ({ ...p, estatus_ministerial: k })); }}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
