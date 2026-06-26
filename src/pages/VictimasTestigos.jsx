// src/pages/VictimasTestigos.jsx
// Tab 5 — Víctimas y Testigos
// Sistema Ministerial — FGE Guerrero — Módulo 2
// Fundamento: Ley General de Víctimas, Protocolo Nacional PR

import { useState, useEffect } from 'react';
import {
  Users, User, Shield, AlertTriangle, CheckCircle2, Plus, Search, X, Send,
  RefreshCw, Eye, FileText, Phone, Heart, ShieldAlert, Flag, MapPin, Lock,
} from 'lucide-react';
import { useVictimasTestigos } from '../hooks/useVictimasTestigos';

const C = {
  darkBlue: '#001a4d', gold: '#b69054', lightGold: '#f5ede0',
  white: '#ffffff', bg: '#f4f6fb', gray: '#666666', lightGray: '#e8ecf1',
  green: '#28a745', red: '#dc3545', orange: '#fd7e14', pink: '#ec4899', purple: '#6a1b9a',
};

const VULNERABILIDADES = [
  { key: 'es_menor_edad', label: 'Menor de edad', color: '#e65100', icon: '⚠️' },
  { key: 'es_mujer', label: 'Mujer', color: '#ad1457', icon: '♀' },
  { key: 'es_indigena', label: 'Indígena', color: '#4e342e', icon: '🏛' },
  { key: 'es_migrante', label: 'Migrante/Extranjero', color: '#1565c0', icon: '🌐' },
  { key: 'es_discapacidad', label: 'Discapacidad', color: '#00695c', icon: '♿' },
  { key: 'es_adulto_mayor', label: 'Adulto mayor', color: '#546e7a', icon: '👴' },
  { key: 'es_lgbti', label: 'LGBTI+', color: C.purple, icon: '🏳️‍🌈' },
];

const TIPOS_MEDIDA = ['Resguardo domiciliario', 'Traslado seguro', 'Canalización a refugio', 'Orden de protección', 'Vigilancia policial', 'Canalización CEAV', 'Atención psicológica', 'Otra'];
const CALIDADES_TESTIGO = [
  { key: 'presencial', label: 'Presencial', desc: 'Estuvo presente en los hechos' },
  { key: 'referencial', label: 'Referencial', desc: 'Tiene conocimiento por terceros' },
  { key: 'de_oidas', label: 'De oídas', desc: 'Escuchó sobre los hechos' },
  { key: 'perito', label: 'Perito', desc: 'Dictamen técnico o científico' },
];

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
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', borderBottom: `2px solid ${C.lightGray}`, backgroundColor: C.bg, whiteSpace: 'nowrap' },
  td: { padding: '12px 16px', fontSize: 13, borderBottom: `1px solid ${C.lightGray}`, color: C.darkBlue },
  chk: (active, clr) => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${active ? clr : C.lightGray}`, backgroundColor: active ? clr + '12' : 'transparent' }),
};

export default function VictimasTestigos({ perfil }) {
  const { victimas, testigos, escenas, reportes911, loading, stats, crearVictima, crearTestigo, agregarMedida, fetchMedidas, refetch } = useVictimasTestigos(perfil);

  const [vista, setVista] = useState('victimas'); // 'victimas' | 'testigos'
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('victima'); // 'victima' | 'testigo'
  const [showDetail, setShowDetail] = useState(null);
  const [detailType, setDetailType] = useState('victima');
  const [medidas, setMedidas] = useState([]);
  const [showMedForm, setShowMedForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Víctima form
  const emptyVictima = {
    escena_crimen_id: '', registro_911_id: '', carpeta_investigacion: '',
    tipo_agravio: 'identificada', nombre: '', edad: '', sexo: '', domicilio: '', telefono: '',
    es_menor_edad: false, es_mujer: false, es_indigena: false, es_migrante: false,
    es_discapacidad: false, es_adulto_mayor: false, es_lgbti: false, otra_vulnerabilidad: '',
    tiene_lesiones: false, descripcion_lesiones: '', requiere_atencion_medica: false, hospital_canalizada: '',
    lectura_derechos_realizada: false, constancia_firmada: false,
    relacion_con_imputado: '', descripcion_agravio: '',
  };
  const [vForm, setVForm] = useState(emptyVictima);
  const setV = (k, v) => setVForm(p => ({ ...p, [k]: v }));

  // Testigo form
  const emptyTestigo = {
    escena_crimen_id: '', registro_911_id: '', carpeta_investigacion: '',
    nombre: '', edad: '', sexo: '', domicilio: '', telefono: '', correo_electronico: '',
    calidad: 'presencial', relacion_victima: '', relacion_imputado: '',
    tipo_identificacion: '', numero_identificacion: '',
    entrevista_realizada: false, resumen_declaracion: '', disponible_declarar: true,
    requiere_proteccion: false, medida_proteccion: '',
  };
  const [tForm, setTForm] = useState(emptyTestigo);
  const setT = (k, v) => setTForm(p => ({ ...p, [k]: v }));

  // Medida form
  const emptyMedida = { tipo_medida: '', descripcion: '', institucion_responsable: '' };
  const [mForm, setMForm] = useState(emptyMedida);

  useEffect(() => {
    if (showDetail && detailType === 'victima') {
      fetchMedidas(showDetail.id).then(setMedidas);
    }
  }, [showDetail?.id, detailType]);

  const handleSubmitVictima = async () => {
    if (vForm.tipo_agravio === 'identificada' && !vForm.nombre?.trim()) return setMensaje({ tipo: 'error', texto: 'El nombre de la víctima es obligatorio' });
    setSaving(true); setMensaje(null);
    const data = { ...vForm, edad: vForm.edad ? parseInt(vForm.edad) : null, escena_crimen_id: vForm.escena_crimen_id || null, registro_911_id: vForm.registro_911_id || null };
    const result = await crearVictima(data);
    setSaving(false);
    if (result.success) { setMensaje({ tipo: 'ok', texto: 'Víctima registrada' }); setVForm(emptyVictima); setTimeout(() => { setShowForm(false); setMensaje(null); }, 1200); }
    else setMensaje({ tipo: 'error', texto: result.error });
  };

  const handleSubmitTestigo = async () => {
    if (!tForm.nombre?.trim()) return setMensaje({ tipo: 'error', texto: 'El nombre del testigo es obligatorio' });
    setSaving(true); setMensaje(null);
    const data = { ...tForm, edad: tForm.edad ? parseInt(tForm.edad) : null, escena_crimen_id: tForm.escena_crimen_id || null, registro_911_id: tForm.registro_911_id || null };
    const result = await crearTestigo(data);
    setSaving(false);
    if (result.success) { setMensaje({ tipo: 'ok', texto: 'Testigo registrado' }); setTForm(emptyTestigo); setTimeout(() => { setShowForm(false); setMensaje(null); }, 1200); }
    else setMensaje({ tipo: 'error', texto: result.error });
  };

  const handleMedida = async () => {
    if (!mForm.tipo_medida || !mForm.descripcion) { alert('Completa tipo y descripción de la medida.'); return; }
    const result = await agregarMedida(showDetail.id, mForm);
    if (result.success) { const m = await fetchMedidas(showDetail.id); setMedidas(m); setMForm(emptyMedida); setShowMedForm(false); }
    else alert('Error: ' + result.error);
  };

  const listaActual = vista === 'victimas' ? victimas : testigos;
  const filtrada = listaActual.filter(i => { if (!searchTerm) return true; const q = searchTerm.toLowerCase(); return (i.nombre || '').toLowerCase().includes(q) || (i.carpeta_investigacion || '').toLowerCase().includes(q); });

  const hayVulnerabilidad = (v) => VULNERABILIDADES.some(vul => v[vul.key]);

  return (
    <div style={{ padding: 24, fontFamily: 'Segoe UI, Arial, sans-serif', backgroundColor: C.bg, minHeight: '100vh' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.darkBlue, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <Users size={22} color={C.gold} /> Víctimas y Testigos
          </h2>
          <p style={{ fontSize: 13, color: C.gray, margin: '4px 0 0 0' }}>Módulo 2 · Tab 5 · Enfoque diferencial y medidas de protección</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={st.btnOutline} onClick={refetch}><RefreshCw size={15} /></button>
          <button style={st.btn(C.pink, C.white)} onClick={() => { setFormType('victima'); setVForm(emptyVictima); setShowForm(true); setMensaje(null); }}>
            <Plus size={16} /> Víctima
          </button>
          <button style={st.btn(C.darkBlue, C.white)} onClick={() => { setFormType('testigo'); setTForm(emptyTestigo); setShowForm(true); setMensaje(null); }}>
            <Plus size={16} /> Testigo
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Víctimas', value: stats.totalVictimas, color: C.pink, icon: Heart },
          { label: 'Testigos', value: stats.totalTestigos, color: C.darkBlue, icon: Users },
          { label: 'Menores', value: stats.menores, color: C.orange, icon: AlertTriangle },
          { label: 'Con lesiones', value: stats.conLesiones, color: C.red, icon: ShieldAlert },
          { label: 'Con protección', value: stats.conProteccion, color: C.green, icon: Shield },
        ].map((s2, i) => (
          <div key={i} style={{ backgroundColor: C.white, borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: s2.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><s2.icon size={20} color={s2.color} /></div>
            <div><div style={{ fontSize: 22, fontWeight: 700, color: C.darkBlue }}>{s2.value}</div><div style={{ fontSize: 12, color: C.gray }}>{s2.label}</div></div>
          </div>
        ))}
      </div>

      {/* VISTA TOGGLE */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[{ key: 'victimas', label: 'Víctimas', icon: Heart, count: stats.totalVictimas }, { key: 'testigos', label: 'Testigos', icon: Users, count: stats.totalTestigos }].map(t => (
          <button key={t.key} onClick={() => setVista(t.key)} style={{ padding: '10px 20px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, border: vista === t.key ? `2px solid ${C.gold}` : `1px solid ${C.lightGray}`, backgroundColor: vista === t.key ? C.lightGold : C.white, color: vista === t.key ? C.darkBlue : C.gray, fontSize: 14, fontWeight: 700 }}>
            <t.icon size={16} /> {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div style={{ backgroundColor: C.white, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${C.lightGray}` }}>
          <Search size={16} color={C.gray} />
          <input type="text" placeholder="Buscar por nombre, carpeta..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: 14, backgroundColor: 'transparent', flex: 1, fontFamily: 'inherit' }} />
          {searchTerm && <X size={14} color={C.gray} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.gray }}><RefreshCw size={32} /><p>Cargando...</p></div>
        ) : filtrada.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.gray }}>
            <Users size={40} color={C.lightGray} />
            <p style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>No hay {vista} registrados</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={st.th}>Nombre</th>
                {vista === 'victimas' && <th style={st.th}>Agravio</th>}
                {vista === 'testigos' && <th style={st.th}>Calidad</th>}
                <th style={st.th}>Carpeta</th>
                <th style={st.th}>{vista === 'victimas' ? 'Vulnerabilidad' : 'Disponible'}</th>
                <th style={st.th}>Acciones</th>
              </tr></thead>
              <tbody>
                {filtrada.map((r, idx) => (
                  <tr key={r.id} style={{ backgroundColor: idx % 2 === 0 ? C.white : C.bg, cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = C.lightGold}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? C.white : C.bg}
                    onClick={() => { setShowDetail(r); setDetailType(vista === 'victimas' ? 'victima' : 'testigo'); }}>
                    <td style={st.td}>
                      <div style={{ fontWeight: 600 }}>{r.nombre || (r.tipo_agravio === 'sociedad' ? 'La sociedad' : 'Quien resulte')}</div>
                      {r.edad && <span style={{ fontSize: 11, color: C.gray }}>{r.edad} años</span>}
                    </td>
                    {vista === 'victimas' && <td style={st.td}>{r.tipo_agravio === 'identificada' ? 'Persona identificada' : r.tipo_agravio === 'sociedad' ? 'La sociedad' : 'Quien resulte'}</td>}
                    {vista === 'testigos' && <td style={st.td}><span style={st.badge(C.darkBlue + '15', C.darkBlue)}>{CALIDADES_TESTIGO.find(c => c.key === r.calidad)?.label || r.calidad}</span></td>}
                    <td style={{ ...st.td, fontFamily: 'monospace', fontSize: 11 }}>{r.carpeta_investigacion || '—'}</td>
                    {vista === 'victimas' && (
                      <td style={st.td}>
                        {hayVulnerabilidad(r) ? (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {VULNERABILIDADES.filter(v => r[v.key]).map(v => (
                              <span key={v.key} style={{ fontSize: 10 }}>{v.icon}</span>
                            ))}
                          </div>
                        ) : <span style={{ color: C.gray, fontSize: 11 }}>—</span>}
                      </td>
                    )}
                    {vista === 'testigos' && <td style={st.td}>{r.disponible_declarar ? <span style={{ color: C.green }}>✅ Sí</span> : <span style={{ color: C.red }}>❌ No</span>}</td>}
                    <td style={st.td}>
                      <button style={{ ...st.btnOutline, padding: '4px 10px', fontSize: 11 }} onClick={e => { e.stopPropagation(); setShowDetail(r); setDetailType(vista === 'victimas' ? 'victima' : 'testigo'); }}>
                        <Eye size={13} /> Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ FORM MODAL ═══ */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,26,77,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 30, zIndex: 1000, overflowY: 'auto' }} onClick={() => setShowForm(false)}>
          <div style={{ backgroundColor: C.white, borderRadius: 14, width: '100%', maxWidth: 700, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', marginBottom: 40 }} onClick={e => e.stopPropagation()}>

            <div style={{ backgroundColor: formType === 'victima' ? C.pink : C.darkBlue, color: C.white, padding: '18px 24px', borderRadius: '14px 14px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {formType === 'victima' ? <Heart size={20} /> : <Users size={20} />}
                <span style={{ fontSize: 16, fontWeight: 700 }}>{formType === 'victima' ? 'Registrar Víctima' : 'Registrar Testigo'}</span>
              </div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowForm(false)} />
            </div>

            <div style={{ padding: 24 }}>

              {/* Vinculación (ambos) */}
              <div style={{ marginBottom: 20 }}>
                <div style={st.sTitle}><FileText size={15} /> Vinculación</div>
                <div style={st.grid2}>
                  <div style={st.fg}>
                    <label style={st.label}>Vincular a escena</label>
                    <select style={st.select} value={formType === 'victima' ? vForm.escena_crimen_id : tForm.escena_crimen_id} onChange={e => formType === 'victima' ? setV('escena_crimen_id', e.target.value) : setT('escena_crimen_id', e.target.value)}>
                      <option value="">— Sin vincular —</option>
                      {escenas.map(esc => <option key={esc.id} value={esc.id}>{esc.registros_911?.folio_911 || 'Sin folio'} — {(esc.ubicacion_texto || '').substring(0, 30)}</option>)}
                    </select>
                  </div>
                  <div style={st.fg}>
                    <label style={st.label}>Carpeta de investigación</label>
                    <input style={{ ...st.input, fontFamily: 'monospace' }} placeholder="Asignada por MP" value={formType === 'victima' ? vForm.carpeta_investigacion : tForm.carpeta_investigacion} onChange={e => formType === 'victima' ? setV('carpeta_investigacion', e.target.value) : setT('carpeta_investigacion', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* ─── VÍCTIMA FORM ─── */}
              {formType === 'victima' && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <div style={st.sTitle}><Heart size={15} /> Tipo de Agravio</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[{ k: 'identificada', l: 'Persona identificada' }, { k: 'sociedad', l: 'La sociedad' }, { k: 'quien_resulte', l: 'Quien resulte' }].map(t => (
                        <button key={t.k} onClick={() => setV('tipo_agravio', t.k)} style={{ flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', border: vForm.tipo_agravio === t.k ? `2px solid ${C.pink}` : `1px solid ${C.lightGray}`, backgroundColor: vForm.tipo_agravio === t.k ? C.pink + '12' : C.white, color: vForm.tipo_agravio === t.k ? C.pink : C.gray, fontSize: 12, fontWeight: 700 }}>
                          {t.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {vForm.tipo_agravio === 'identificada' && (
                    <>
                      <div style={{ marginBottom: 20 }}>
                        <div style={st.sTitle}><User size={15} /> Datos Personales</div>
                        <div style={st.grid2}>
                          <div style={st.fg}><label style={st.label}>Nombre completo <span style={{ color: C.red }}>*</span></label><input style={st.input} value={vForm.nombre} onChange={e => setV('nombre', e.target.value)} /></div>
                          <div style={st.fg}><label style={st.label}>Edad</label><input type="number" style={st.input} value={vForm.edad} onChange={e => setV('edad', e.target.value)} /></div>
                          <div style={st.fg}><label style={st.label}>Sexo</label><select style={st.select} value={vForm.sexo} onChange={e => setV('sexo', e.target.value)}><option value="">—</option><option value="Femenino">Femenino</option><option value="Masculino">Masculino</option></select></div>
                          <div style={st.fg}><label style={st.label}>Teléfono</label><input style={st.input} value={vForm.telefono} onChange={e => setV('telefono', e.target.value)} /></div>
                          <div style={{ ...st.fg, gridColumn: '1 / -1' }}><label style={st.label}>Domicilio</label><input style={st.input} value={vForm.domicilio} onChange={e => setV('domicilio', e.target.value)} /></div>
                        </div>
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <div style={st.sTitle}><Shield size={15} /> Vulnerabilidad (Enfoque Diferencial)</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {VULNERABILIDADES.map(vul => (
                            <div key={vul.key} style={st.chk(vForm[vul.key], vul.color)} onClick={() => setV(vul.key, !vForm[vul.key])}>
                              <input type="checkbox" checked={vForm[vul.key]} readOnly style={{ width: 14, height: 14 }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: vForm[vul.key] ? vul.color : C.gray }}>{vul.icon} {vul.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <div style={st.sTitle}><ShieldAlert size={15} /> Estado de Salud</div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                          {[{ k: 'tiene_lesiones', l: 'Presenta lesiones', c: C.red }, { k: 'requiere_atencion_medica', l: 'Requiere atención médica', c: C.orange }].map(opt => (
                            <div key={opt.k} style={st.chk(vForm[opt.k], opt.c)} onClick={() => setV(opt.k, !vForm[opt.k])}>
                              <input type="checkbox" checked={vForm[opt.k]} readOnly style={{ width: 14, height: 14 }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: vForm[opt.k] ? opt.c : C.gray }}>{opt.l}</span>
                            </div>
                          ))}
                        </div>
                        {vForm.tiene_lesiones && <div style={st.fg}><label style={st.label}>Descripción de lesiones</label><textarea style={st.textarea} value={vForm.descripcion_lesiones} onChange={e => setV('descripcion_lesiones', e.target.value)} rows={2} /></div>}
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <div style={st.sTitle}><FileText size={15} /> Lectura de Derechos</div>
                        <div style={{ display: 'flex', gap: 12 }}>
                          {[{ k: 'lectura_derechos_realizada', l: 'Lectura de derechos realizada' }, { k: 'constancia_firmada', l: 'Constancia firmada' }].map(opt => (
                            <div key={opt.k} style={st.chk(vForm[opt.k], C.green)} onClick={() => setV(opt.k, !vForm[opt.k])}>
                              <input type="checkbox" checked={vForm[opt.k]} readOnly style={{ width: 14, height: 14 }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: vForm[opt.k] ? '#1b5e20' : C.gray }}>{opt.l}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div style={st.fg}><label style={st.label}>Descripción del agravio</label><textarea style={st.textarea} placeholder="Descripción de lo que sufrió la víctima..." value={vForm.descripcion_agravio} onChange={e => setV('descripcion_agravio', e.target.value)} rows={2} /></div>
                </>
              )}

              {/* ─── TESTIGO FORM ─── */}
              {formType === 'testigo' && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <div style={st.sTitle}><User size={15} /> Datos del Testigo</div>
                    <div style={st.grid2}>
                      <div style={st.fg}><label style={st.label}>Nombre completo <span style={{ color: C.red }}>*</span></label><input style={st.input} value={tForm.nombre} onChange={e => setT('nombre', e.target.value)} /></div>
                      <div style={st.fg}><label style={st.label}>Edad</label><input type="number" style={st.input} value={tForm.edad} onChange={e => setT('edad', e.target.value)} /></div>
                      <div style={st.fg}><label style={st.label}>Teléfono</label><input style={st.input} value={tForm.telefono} onChange={e => setT('telefono', e.target.value)} /></div>
                      <div style={st.fg}><label style={st.label}>Correo</label><input style={st.input} value={tForm.correo_electronico} onChange={e => setT('correo_electronico', e.target.value)} /></div>
                      <div style={{ ...st.fg, gridColumn: '1 / -1' }}><label style={st.label}>Domicilio</label><input style={st.input} value={tForm.domicilio} onChange={e => setT('domicilio', e.target.value)} /></div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={st.sTitle}><Shield size={15} /> Calidad del Testigo</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {CALIDADES_TESTIGO.map(c => (
                        <button key={c.key} onClick={() => setT('calidad', c.key)} style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', border: tForm.calidad === c.key ? `2px solid ${C.gold}` : `1px solid ${C.lightGray}`, backgroundColor: tForm.calidad === c.key ? C.lightGold : C.white }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: tForm.calidad === c.key ? C.darkBlue : C.gray }}>{c.label}</div>
                          <div style={{ fontSize: 11, color: C.gray }}>{c.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={st.chk(tForm.entrevista_realizada, C.green)} onClick={() => setT('entrevista_realizada', !tForm.entrevista_realizada)}>
                        <input type="checkbox" checked={tForm.entrevista_realizada} readOnly style={{ width: 14, height: 14 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: tForm.entrevista_realizada ? '#1b5e20' : C.gray }}>Entrevista realizada</span>
                      </div>
                      <div style={st.chk(!tForm.disponible_declarar, C.red)} onClick={() => setT('disponible_declarar', !tForm.disponible_declarar)}>
                        <input type="checkbox" checked={!tForm.disponible_declarar} readOnly style={{ width: 14, height: 14 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: !tForm.disponible_declarar ? C.red : C.gray }}>No disponible para declarar</span>
                      </div>
                    </div>
                    {tForm.entrevista_realizada && <div style={{ ...st.fg, marginTop: 10 }}><label style={st.label}>Resumen de declaración</label><textarea style={st.textarea} value={tForm.resumen_declaracion} onChange={e => setT('resumen_declaracion', e.target.value)} rows={3} /></div>}
                  </div>
                </>
              )}

              {mensaje && (
                <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: mensaje.tipo === 'ok' ? '#e8f5e9' : '#ffebee', color: mensaje.tipo === 'ok' ? '#1b5e20' : '#b71c1c', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  {mensaje.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {mensaje.texto}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.lightGray}`, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowForm(false)} style={{ backgroundColor: 'transparent', color: C.gray, border: `1px solid ${C.lightGray}`, borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button style={{ ...st.btn(formType === 'victima' ? C.pink : C.gold, C.white), opacity: saving ? 0.6 : 1 }} onClick={formType === 'victima' ? handleSubmitVictima : handleSubmitTestigo} disabled={saving}>
                <Send size={15} /> {saving ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DETAIL PANEL ═══ */}
      {showDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,26,77,0.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }} onClick={() => { setShowDetail(null); setShowMedForm(false); }}>
          <div style={{ backgroundColor: C.white, width: '100%', maxWidth: 500, height: '100%', overflowY: 'auto', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>

            <div style={{ backgroundColor: detailType === 'victima' ? C.pink : C.darkBlue, color: C.white, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{showDetail.nombre || (showDetail.tipo_agravio === 'sociedad' ? 'En agravio de la sociedad' : 'Quien resulte')}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{detailType === 'victima' ? 'Víctima' : 'Testigo'}</div>
              </div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => { setShowDetail(null); setShowMedForm(false); }} />
            </div>

            {/* Vulnerability flags */}
            {detailType === 'victima' && hayVulnerabilidad(showDetail) && (
              <div style={{ padding: '10px 20px', backgroundColor: '#fff3e0', borderBottom: `1px solid ${C.orange}30`, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {VULNERABILIDADES.filter(v => showDetail[v.key]).map(v => (
                  <span key={v.key} style={st.badge(v.color + '20', v.color)}>{v.icon} {v.label}</span>
                ))}
              </div>
            )}

            {/* Detail rows */}
            {[
              { label: 'Carpeta', value: showDetail.carpeta_investigacion },
              { label: 'Edad', value: showDetail.edad ? `${showDetail.edad} años` : null },
              { label: 'Sexo', value: showDetail.sexo },
              { label: 'Teléfono', value: showDetail.telefono },
              { label: 'Domicilio', value: showDetail.domicilio },
              ...(detailType === 'victima' ? [
                { label: 'Lesiones', value: showDetail.tiene_lesiones ? '⚠️ Sí' : 'No' },
                { label: 'Desc. lesiones', value: showDetail.descripcion_lesiones },
                { label: 'Atención médica', value: showDetail.requiere_atencion_medica ? '🏥 Requerida' : null },
                { label: 'Derechos leídos', value: showDetail.lectura_derechos_realizada ? '✅ Sí' : '❌ Pendiente' },
                { label: 'Constancia', value: showDetail.constancia_firmada ? '✅ Firmada' : '❌ Pendiente' },
                { label: 'Agravio', value: showDetail.descripcion_agravio },
              ] : [
                { label: 'Calidad', value: CALIDADES_TESTIGO.find(c => c.key === showDetail.calidad)?.label },
                { label: 'Disponible', value: showDetail.disponible_declarar ? '✅ Sí' : '❌ No' },
                { label: 'Entrevista', value: showDetail.entrevista_realizada ? '✅ Realizada' : '❌ Pendiente' },
                { label: 'Declaración', value: showDetail.resumen_declaracion },
              ]),
            ].filter(r => r.value).map((row, i) => (
              <div key={i} style={{ padding: '10px 20px', borderBottom: `1px solid ${C.lightGray}`, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.gray, textTransform: 'uppercase', minWidth: 110 }}>{row.label}</span>
                <span style={{ fontSize: 14, color: C.darkBlue, textAlign: 'right', flex: 1, wordBreak: 'break-word' }}>{row.value}</span>
              </div>
            ))}

            {/* MEDIDAS DE PROTECCIÓN (solo víctimas) */}
            {detailType === 'victima' && (
              <div style={{ padding: '16px 20px', borderTop: `2px solid ${C.gold}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}><Shield size={15} /> Medidas de Protección ({medidas.length})</div>
                  <button onClick={() => setShowMedForm(v => !v)} style={{ backgroundColor: C.lightGold, border: `1px solid ${C.gold}55`, borderRadius: 8, padding: '6px 12px', color: C.gold, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {showMedForm ? '✕ Cancelar' : '+ Medida'}
                  </button>
                </div>

                {showMedForm && (
                  <div style={{ backgroundColor: C.bg, borderRadius: 8, padding: 14, marginBottom: 14, border: `1px solid ${C.lightGray}` }}>
                    <div style={st.fg}><label style={{ ...st.label, fontSize: 10 }}>Tipo de medida *</label>
                      <select style={{ ...st.select, fontSize: 12 }} value={mForm.tipo_medida} onChange={e => setMForm(p => ({ ...p, tipo_medida: e.target.value }))}>
                        <option value="">— Seleccionar —</option>
                        {TIPOS_MEDIDA.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={{ ...st.fg, marginTop: 8 }}><label style={{ ...st.label, fontSize: 10 }}>Descripción *</label><textarea style={{ ...st.textarea, fontSize: 12 }} value={mForm.descripcion} onChange={e => setMForm(p => ({ ...p, descripcion: e.target.value }))} rows={2} /></div>
                    <div style={{ ...st.fg, marginTop: 8 }}><label style={{ ...st.label, fontSize: 10 }}>Institución responsable</label><input style={{ ...st.input, fontSize: 12 }} value={mForm.institucion_responsable} onChange={e => setMForm(p => ({ ...p, institucion_responsable: e.target.value }))} /></div>
                    <button onClick={handleMedida} style={{ ...st.btn(C.gold, C.white), width: '100%', justifyContent: 'center', marginTop: 10, fontSize: 12 }}><Send size={13} /> Registrar Medida</button>
                  </div>
                )}

                {medidas.length === 0 ? (
                  <div style={{ color: C.red, fontSize: 12, textAlign: 'center', padding: 16, backgroundColor: '#ffebee', borderRadius: 8 }}>⚠ Sin medidas de protección registradas — es obligatorio documentarlas.</div>
                ) : (
                  medidas.map(m => (
                    <div key={m.id} style={{ backgroundColor: C.bg, borderRadius: 8, padding: 12, marginBottom: 8, border: `1px solid ${C.lightGray}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={st.badge(C.green + '20', '#1b5e20')}>{m.tipo_medida}</span>
                        <span style={st.badge(m.estatus === 'activa' ? '#e8f5e9' : '#eceff1', m.estatus === 'activa' ? '#1b5e20' : '#546e7a')}>{m.estatus}</span>
                      </div>
                      <div style={{ fontSize: 13, color: C.darkBlue, marginTop: 6 }}>{m.descripcion}</div>
                      {m.institucion_responsable && <div style={{ fontSize: 11, color: C.gray, marginTop: 4 }}>Responsable: {m.institucion_responsable}</div>}
                      <div style={{ fontSize: 10, color: C.gray, marginTop: 4 }}>{new Date(m.creado_en).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
