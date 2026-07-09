// src/pages/SubcoordAdmin.jsx
// Subcoordinación Administrativa de la Policía Investigadora Ministerial
// Gestión de personal: directorio, adscripción, altas/bajas, bitácora, métricas

import React, { useState, useRef } from 'react';
import {
  Users, User, UserPlus, UserCheck, Shield, Search, ChevronLeft, Clock,
  FileText, Building2, MapPin, Hash, Phone, Mail, Briefcase, Star,
  AlertTriangle, CheckCircle, XCircle, RefreshCw, Eye, ArrowRightLeft,
  ClipboardList, BarChart3, Camera, Flag, Lock, Calendar,
} from 'lucide-react';
import { useSubcoordAdmin } from '../hooks/useSubcoordAdmin';

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

const REGIONES = ['Región Centro','Región Montaña','Región Costa Grande','Región Costa Chica','Región Tierra Caliente','Región Acapulco','Región Norte'];

const FISCALIAS_ESP = [
  'Fiscalía Especializada en Combate a la Corrupción',
  'Fiscalía Especial de Delitos Electorales',
  'Fiscalía Especializada en Materia de Desaparición Forzada y Búsqueda de Personas Desaparecidas',
  'Fiscalía Especializada en Delitos de Narcomenudeo',
  'Fiscalía Especializada Contra el Secuestro y Combate a la Extorsión',
  'Fiscalía Especializada Contra el Robo de Vehículos',
  'Fiscalía Especializada en Delitos Sexuales y Violencia Familiar',
  'Fiscalía Especializada en Investigación del Delito de Feminicidio',
  'Fiscalía Especializada en Justicia para Adolescentes',
  'Fiscalía Especializada Contra la Trata de Personas',
];

export default function SubcoordAdmin({ perfil }) {
  const hook = useSubcoordAdmin(perfil);
  const {
    elementos, bitacora, documentos, loading, error, setError,
    filtroRegion, setFiltroRegion, filtroCargo, setFiltroCargo,
    filtroActivo, setFiltroActivo, busqueda, setBusqueda,
    fetchElementos, fetchBitacora, fetchDocumentos,
    cambiarCargo, cambiarGrado, cambiarRegion, cambiarZona, cambiarEspecializada,
    darDeBaja, reactivar, actualizarDatos, subirFotoCredencial, subirDocumento,
    crearElemento, metricas, esAdmin,
    getCargoLabel, formatFecha,
    GRADOS, CARGOS, TIPOS_DOCUMENTO_RH,
  } = hook;

  const [seccion, setSeccion] = useState('directorio');
  const [elementoSel, setElementoSel] = useState(null);
  const [subTab, setSubTab] = useState('datos');

  // ── Forms de acciones ──────────────────────────────────────────
  const [showCambioCargo, setShowCambioCargo] = useState(false);
  const [showCambioRegion, setShowCambioRegion] = useState(false);
  const [showBaja, setShowBaja] = useState(false);
  const [showSubirDoc, setShowSubirDoc] = useState(false);
  const [formCargo, setFormCargo] = useState({ cargo: '', motivo: '', oficio: '' });
  const [formRegion, setFormRegion] = useState({ region: '', zona: '', especializada: '', motivo: '', oficio: '' });
  const [formBaja, setFormBaja] = useState({ motivo: '' });
  const [formDoc, setFormDoc] = useState({ tipo: '', descripcion: '', fecha: '', vigencia: '' });
  const [archivoDoc, setArchivoDoc] = useState(null);

  // ── Form de alta ───────────────────────────────────────────────
  const emptyAlta = { nombre_completo: '', email: '', numero_empleado: '', cuip: '', grado: 'Agente', cargo: 'agente', region: '', zona: '', coordinacion_especializada: '', telefono_personal: '' };
  const [formAlta, setFormAlta] = useState(emptyAlta);
  const [passTemp, setPassTemp] = useState('');
  const [altaExito, setAltaExito] = useState(null);

  const inputFotoRef = useRef(null);

  if (!esAdmin) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
        <Lock size={40} color="#9ca3af" style={{ marginBottom: 10 }} />
        <div style={{ color: '#9ca3af', fontSize: 14 }}>Acceso restringido a la Subcoordinación Administrativa y Director General.</div>
      </div>
    );
  }

  const abrirFicha = async (elem) => {
    setElementoSel(elem);
    setSeccion('ficha');
    setSubTab('datos');
    setShowCambioCargo(false);
    setShowCambioRegion(false);
    setShowBaja(false);
    setShowSubirDoc(false);
    await fetchBitacora(elem.id);
    await fetchDocumentos(elem.id);
  };

  // ═══════════════════════════════════════════════════════════════
  // MÉTRICAS
  // ═══════════════════════════════════════════════════════════════
  const renderMetricas = () => {
    const cards = [
      { label: 'Total Personal', value: metricas.total, icon: Users, color: COLORS.primary },
      { label: 'Activos', value: metricas.activos, icon: CheckCircle, color: '#10b981' },
      { label: 'Inactivos', value: metricas.inactivos, icon: XCircle, color: '#ef4444' },
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

  // ═══════════════════════════════════════════════════════════════
  // DIRECTORIO DE PERSONAL
  // ═══════════════════════════════════════════════════════════════
  const renderDirectorio = () => (
    <div>
      {renderMetricas()}
      <div style={{ ...cardStyle, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={labelStyle}>Buscar</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: '#9ca3af' }} />
            <input style={{ ...inputStyle, paddingLeft: 32 }} placeholder="Nombre, No. empleado o CUIP" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
        </div>
        <div style={{ flex: '0 0 160px' }}>
          <label style={labelStyle}>Región</label>
          <select style={selectStyle} value={filtroRegion} onChange={e => setFiltroRegion(e.target.value)}>
            <option value="todos">Todas</option>
            {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ flex: '0 0 160px' }}>
          <label style={labelStyle}>Cargo</label>
          <select style={selectStyle} value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)}>
            <option value="todos">Todos</option>
            {CARGOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div style={{ flex: '0 0 130px' }}>
          <label style={labelStyle}>Estatus</label>
          <select style={selectStyle} value={filtroActivo} onChange={e => setFiltroActivo(e.target.value)}>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: COLORS.primary, fontSize: 16 }}><Users size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />Directorio ({elementos.length})</h3>
        <button style={btnPrimary} onClick={() => { setFormAlta(emptyAlta); setPassTemp(''); setAltaExito(null); setSeccion('alta'); }}><UserPlus size={15} /> Alta de Personal</button>
      </div>

      {elementos.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          <Users size={40} style={{ marginBottom: 10, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>No se encontró personal con los filtros actuales</div>
        </div>
      ) : (
        elementos.map(e => (
          <div key={e.id} style={{ ...cardStyle, cursor: 'pointer', borderLeft: `4px solid ${e.activo === false ? '#ef4444' : COLORS.gold}`, transition: 'box-shadow 0.2s' }}
            onClick={() => abrirFicha(e)}
            onMouseOver={ev => ev.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
            onMouseOut={ev => ev.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {e.foto_credencial_url ? (
                <img src={e.foto_credencial_url} alt={e.nombre_completo} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, border: '1px solid #c7cfe0', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: 8, background: '#f9fafb', border: '1px solid #c7cfe0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c7cfe0', flexShrink: 0 }}><User size={22} /></div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.primary }}>{e.nombre_completo}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={badge(COLORS.gold)}>{getCargoLabel(e.cargo || e.rol)}</span>
                      {e.grado && e.grado !== (e.cargo || e.rol) && <span style={badge('#6b7280')}>Grado: {e.grado}</span>}
                      {e.activo === false && <span style={badge('#ef4444')}>Inactivo</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af' }}>
                    {e.numero_empleado && <div>No. {e.numero_empleado}</div>}
                    {e.region && <div>{e.region.replace('Región ', '')}</div>}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  {e.zona && <span>{e.zona} · </span>}
                  {e.coordinacion_especializada && <span style={{ color: '#8b5cf6' }}>{e.coordinacion_especializada} · </span>}
                  {e.cuip && <span style={{ fontFamily: 'monospace' }}>CUIP: {e.cuip}</span>}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // FICHA DEL ELEMENTO
  // ═══════════════════════════════════════════════════════════════
  const renderFicha = () => {
    if (!elementoSel) return null;
    const e = elementoSel;
    const tabs = [
      { key: 'datos', label: 'Datos', icon: User },
      { key: 'adscripcion', label: 'Adscripción', icon: ArrowRightLeft },
      { key: 'expediente', label: `Expediente (${documentos.length})`, icon: FileText },
      { key: 'bitacora', label: `Bitácora (${bitacora.length})`, icon: Clock },
    ];

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button style={{ ...btnSecondary, padding: '6px 12px' }} onClick={() => { setSeccion('directorio'); setElementoSel(null); }}><ChevronLeft size={16} /> Directorio</button>
          <span style={{ fontWeight: 800, fontSize: 16, color: COLORS.primary }}>{e.nombre_completo}</span>
          <span style={badge(COLORS.gold)}>{getCargoLabel(e.cargo || e.rol)}</span>
          {e.activo === false && <span style={badge('#ef4444')}>Inactivo</span>}
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.key} style={{ padding: '8px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, background: subTab === t.key ? COLORS.primary : '#e5e7eb', color: subTab === t.key ? COLORS.white : '#374151', transition: 'all 0.2s' }}
              onClick={() => setSubTab(t.key)}><t.icon size={14} /> {t.label}</button>
          ))}
        </div>

        {subTab === 'datos' && renderDatos()}
        {subTab === 'adscripcion' && renderAdscripcion()}
        {subTab === 'expediente' && renderExpedienteRH()}
        {subTab === 'bitacora' && renderBitacoraElemento()}
      </div>
    );
  };

  // ── Sub: Datos del elemento ────────────────────────────────────
  const renderDatos = () => {
    const e = elementoSel;
    const campos = [
      ['No. Empleado', e.numero_empleado, Hash],
      ['CUIP', e.cuip, Shield],
      ['Grado (escalafonario)', e.grado, Star],
      ['Cargo (comisión actual)', getCargoLabel(e.cargo || e.rol), Briefcase],
      ['Región', e.region, MapPin],
      ['Zona', e.zona, Building2],
      ['Coord. Especializada', e.coordinacion_especializada, Flag],
      ['Correo', e.email || '—', Mail],
      ['Teléfono personal', e.telefono_personal, Phone],
      ['Teléfono institucional', e.telefono_institucional, Phone],
      ['CURP', e.curp_personal, Hash],
      ['RFC', e.rfc, Hash],
      ['Escolaridad', e.escolaridad, ClipboardList],
      ['Estado civil', e.estado_civil, Users],
      ['Tipo de sangre', e.tipo_sangre, AlertTriangle],
      ['Contacto emergencia', e.contacto_emergencia_nombre, Phone],
      ['Tel. emergencia', e.contacto_emergencia_telefono, Phone],
      ['Fecha de alta', formatFecha(e.fecha_alta || e.created_at), Calendar],
      ['Último acceso', formatFecha(e.ultimo_acceso), Clock],
    ];

    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
          {e.foto_credencial_url ? (
            <img src={e.foto_credencial_url} alt={e.nombre_completo} style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 10, border: '2px solid #b69054' }} />
          ) : (
            <div style={{ width: 90, height: 90, borderRadius: 10, background: '#f9fafb', border: '2px dashed #c7cfe0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c7cfe0', flexDirection: 'column', gap: 4 }}>
              <Camera size={24} />
              <span style={{ fontSize: 9 }}>Sin foto</span>
            </div>
          )}
          <div>
            <input ref={inputFotoRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={async (ev) => { const f = ev.target.files[0]; if (f) { await subirFotoCredencial(e, f); const { data } = await fetchElementos(); } ev.target.value = ''; }} />
            <button style={{ ...btnSecondary, padding: '6px 12px', fontSize: 11 }} onClick={() => inputFotoRef.current.click()}>
              <Camera size={13} /> {e.foto_credencial_url ? 'Cambiar foto' : 'Subir credencial'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {campos.filter(f => f[1]).map(([label, value, Icon], i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Icon size={12} /> {label}</div>
              <div style={{ fontSize: 14, color: COLORS.primary, fontWeight: 500, marginTop: 2 }}>{value || '—'}</div>
            </div>
          ))}
        </div>

        {e.domicilio && (
          <div style={{ marginTop: 12, padding: 10, background: '#f9fafb', borderRadius: 7 }}>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>Domicilio</div>
            <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{e.domicilio}</div>
          </div>
        )}

        {e.activo !== false ? (
          <button style={{ ...btnSecondary, marginTop: 14, color: '#ef4444', borderColor: '#ef4444' }} onClick={() => setShowBaja(true)}>
            <XCircle size={14} /> Dar de baja
          </button>
        ) : (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 6 }}>Baja: {formatFecha(e.fecha_baja)} — {e.motivo_baja}</div>
            <button style={{ ...btnPrimary, background: '#10b981' }} onClick={async () => { await reactivar(e, 'Reactivación autorizada'); const { data } = await fetchElementos(); }}>
              <CheckCircle size={14} /> Reactivar elemento
            </button>
          </div>
        )}

        {showBaja && (
          <div style={{ marginTop: 12, padding: 14, background: '#fef2f2', borderRadius: 8, borderLeft: '4px solid #ef4444' }}>
            <label style={labelStyle}>Motivo de la baja *</label>
            <textarea style={textareaStyle} placeholder="Cambio de adscripción, comisión, baja voluntaria..." value={formBaja.motivo} onChange={ev => setFormBaja({ motivo: ev.target.value })} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button style={{ ...btnPrimary, background: '#ef4444' }} onClick={async () => {
                if (!formBaja.motivo) { setError('Escribe el motivo'); return; }
                await darDeBaja(e, formBaja.motivo); setShowBaja(false); setSeccion('directorio');
              }}>Confirmar baja</button>
              <button style={btnSecondary} onClick={() => setShowBaja(false)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Sub: Adscripción ───────────────────────────────────────────
  const renderAdscripcion = () => {
    const e = elementoSel;
    return (
      <div>
        {/* Cambio de cargo */}
        <div style={cardStyle}>
          <div style={tituloSeccion}><Briefcase size={15} /> Cambio de Cargo / Comisión</div>
          <div style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>Cargo actual: <strong>{getCargoLabel(e.cargo || e.rol)}</strong> · Grado: <strong>{e.grado || '—'}</strong></div>
          {!showCambioCargo ? (
            <button style={btnSecondary} onClick={() => { setFormCargo({ cargo: e.cargo || e.rol, motivo: '', oficio: '' }); setShowCambioCargo(true); }}>
              <ArrowRightLeft size={14} /> Cambiar cargo
            </button>
          ) : (
            <div style={{ background: '#fffbeb', borderRadius: 8, padding: 14, borderLeft: `4px solid ${COLORS.gold}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Nuevo cargo *</label>
                  <select style={selectStyle} value={formCargo.cargo} onChange={ev => setFormCargo({ ...formCargo, cargo: ev.target.value })}>
                    {CARGOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>No. oficio de comisión</label><input style={inputStyle} placeholder="Oficio que sustenta" value={formCargo.oficio} onChange={ev => setFormCargo({ ...formCargo, oficio: ev.target.value })} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Motivo</label><input style={inputStyle} placeholder="Comisión temporal, ascenso..." value={formCargo.motivo} onChange={ev => setFormCargo({ ...formCargo, motivo: ev.target.value })} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={btnPrimary} onClick={async () => {
                  const ok = await cambiarCargo(e, formCargo.cargo, formCargo.motivo, formCargo.oficio);
                  if (ok) { setShowCambioCargo(false); abrirFicha({ ...e, cargo: formCargo.cargo }); }
                }} disabled={loading}>Confirmar</button>
                <button style={btnSecondary} onClick={() => setShowCambioCargo(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>

        {/* Cambio de región/zona */}
        <div style={cardStyle}>
          <div style={tituloSeccion}><MapPin size={15} /> Cambio de Adscripción (Región / Zona)</div>
          <div style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>
            Región: <strong>{e.region || '—'}</strong> · Zona: <strong>{e.zona || '—'}</strong>
            {e.coordinacion_especializada && <span> · Especializada: <strong style={{ color: '#8b5cf6' }}>{e.coordinacion_especializada}</strong></span>}
          </div>
          {!showCambioRegion ? (
            <button style={btnSecondary} onClick={() => { setFormRegion({ region: e.region || '', zona: e.zona || '', especializada: e.coordinacion_especializada || '', motivo: '', oficio: '' }); setShowCambioRegion(true); }}>
              <MapPin size={14} /> Cambiar adscripción
            </button>
          ) : (
            <div style={{ background: '#fffbeb', borderRadius: 8, padding: 14, borderLeft: `4px solid ${COLORS.gold}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Nueva región *</label>
                  <select style={selectStyle} value={formRegion.region} onChange={ev => setFormRegion({ ...formRegion, region: ev.target.value })}>
                    <option value="">— Seleccionar —</option>
                    {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Nueva zona</label><input style={inputStyle} placeholder="Zona / Coordinación" value={formRegion.zona} onChange={ev => setFormRegion({ ...formRegion, zona: ev.target.value })} /></div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Coordinación Especializada (si aplica)</label>
                  <select style={selectStyle} value={formRegion.especializada} onChange={ev => setFormRegion({ ...formRegion, especializada: ev.target.value })}>
                    <option value="">— No aplica (Coordinación regular) —</option>
                    {FISCALIAS_ESP.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>No. oficio</label><input style={inputStyle} value={formRegion.oficio} onChange={ev => setFormRegion({ ...formRegion, oficio: ev.target.value })} /></div>
                <div><label style={labelStyle}>Motivo</label><input style={inputStyle} placeholder="Cambio de adscripción, comisión..." value={formRegion.motivo} onChange={ev => setFormRegion({ ...formRegion, motivo: ev.target.value })} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={btnPrimary} onClick={async () => {
                  if (!formRegion.region) { setError('Selecciona la región'); return; }
                  if (formRegion.region !== e.region) await cambiarRegion(e, formRegion.region, formRegion.motivo, formRegion.oficio);
                  if (formRegion.zona !== e.zona) await cambiarZona(e, formRegion.zona, formRegion.motivo);
                  if (formRegion.especializada !== e.coordinacion_especializada) await cambiarEspecializada(e, formRegion.especializada, formRegion.motivo);
                  setShowCambioRegion(false);
                  abrirFicha({ ...e, region: formRegion.region, zona: formRegion.zona, coordinacion_especializada: formRegion.especializada });
                }} disabled={loading}>Confirmar cambio</button>
                <button style={btnSecondary} onClick={() => setShowCambioRegion(false)}>Cancelar</button>
              </div>
              <div style={{ fontSize: 11, color: '#854f0b', marginTop: 8 }}>Al cambiar de región, el RLS automáticamente le mostrará datos de la nueva región y dejará de ver la anterior.</div>
            </div>
          )}
        </div>

        {/* Cambio de grado */}
        <div style={cardStyle}>
          <div style={tituloSeccion}><Star size={15} /> Grado Escalafonario</div>
          <div style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>Grado actual: <strong>{e.grado || '—'}</strong></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {GRADOS.map(g => (
              <button key={g} style={{ ...btnSecondary, padding: '6px 14px', fontSize: 12, background: e.grado === g ? COLORS.primary : 'transparent', color: e.grado === g ? COLORS.white : COLORS.primary }}
                onClick={async () => { if (g !== e.grado) { await cambiarGrado(e, g, 'Cambio de grado'); abrirFicha({ ...e, grado: g }); } }}>
                {g}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>El grado es escalafonario (RH). El cargo/comisión es lo que define los permisos en el sistema.</div>
        </div>
      </div>
    );
  };

  // ── Sub: Expediente RH ─────────────────────────────────────────
  const renderExpedienteRH = () => {
    const e = elementoSel;
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 700, color: COLORS.primary, fontSize: 14 }}>Expediente Digital — {e.nombre_completo}</span>
          <button style={{ ...btnPrimary, padding: '7px 14px', fontSize: 13 }} onClick={() => { setFormDoc({ tipo: '', descripcion: '', fecha: '', vigencia: '' }); setArchivoDoc(null); setShowSubirDoc(!showSubirDoc); }}>
            <FileText size={14} /> {showSubirDoc ? 'Cancelar' : '+ Subir documento'}
          </button>
        </div>

        {showSubirDoc && (
          <div style={{ ...cardStyle, background: '#fffbeb', borderLeft: `4px solid ${COLORS.gold}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Tipo de documento *</label>
                <select style={selectStyle} value={formDoc.tipo} onChange={ev => setFormDoc({ ...formDoc, tipo: ev.target.value })}>
                  <option value="">— Seleccionar —</option>
                  {TIPOS_DOCUMENTO_RH.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Fecha del documento</label><input style={inputStyle} type="date" value={formDoc.fecha} onChange={ev => setFormDoc({ ...formDoc, fecha: ev.target.value })} /></div>
              <div><label style={labelStyle}>Vigencia hasta</label><input style={inputStyle} type="date" value={formDoc.vigencia} onChange={ev => setFormDoc({ ...formDoc, vigencia: ev.target.value })} /></div>
              <div><label style={labelStyle}>Descripción</label><input style={inputStyle} placeholder="Detalle opcional" value={formDoc.descripcion} onChange={ev => setFormDoc({ ...formDoc, descripcion: ev.target.value })} /></div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ border: '2px dashed #c7cfe0', borderRadius: 10, padding: 16, textAlign: 'center', cursor: 'pointer', background: COLORS.bg }}
                onClick={() => document.getElementById('file-rh').click()}>
                <FileText size={22} color="#999" />
                <p style={{ fontSize: 12, color: '#999', margin: '4px 0 0 0' }}>Clic para seleccionar archivo (PDF, JPG, PNG)</p>
                <input id="file-rh" type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={ev => { if (ev.target.files[0]) setArchivoDoc(ev.target.files[0]); }} />
              </div>
              {archivoDoc && <div style={{ marginTop: 6, fontSize: 12, color: '#085041' }}>{archivoDoc.name} ({(archivoDoc.size / 1024).toFixed(0)} KB)</div>}
            </div>
            <button style={{ ...btnPrimary, marginTop: 12, width: '100%' }} onClick={async () => {
              if (!formDoc.tipo || !archivoDoc) { setError('Selecciona tipo y archivo'); return; }
              const ok = await subirDocumento(e, formDoc.tipo, archivoDoc, formDoc.descripcion, formDoc.fecha, formDoc.vigencia);
              if (ok) { setShowSubirDoc(false); setArchivoDoc(null); }
            }} disabled={loading}>Subir documento</button>
          </div>
        )}

        {documentos.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: 30, color: '#9ca3af' }}>Sin documentos en el expediente digital</div>
        ) : (
          documentos.map(d => (
            <a key={d.id} href={d.url_archivo} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...cardStyle, textDecoration: 'none', cursor: 'pointer', marginBottom: 8 }}>
              <div>
                <div style={{ color: COLORS.primary, fontSize: 13, fontWeight: 700 }}>{d.tipo_documento.replace(/_/g, ' ')}</div>
                <div style={{ color: '#6b7280', fontSize: 11 }}>{d.nombre_archivo}{d.descripcion ? ` — ${d.descripcion}` : ''}</div>
                <div style={{ color: '#9ca3af', fontSize: 10, marginTop: 2 }}>
                  {d.fecha_documento && `Fecha: ${d.fecha_documento} · `}
                  {d.vigencia_hasta && `Vigencia: ${d.vigencia_hasta} · `}
                  Subido por: {d.subido_por} · {formatFecha(d.created_at)}
                </div>
              </div>
              <Eye size={16} color={COLORS.gold} />
            </a>
          ))
        )}
      </div>
    );
  };

  // ── Sub: Bitácora del elemento ─────────────────────────────────
  const renderBitacoraElemento = () => (
    <div>
      <div style={{ fontWeight: 700, color: COLORS.primary, fontSize: 14, marginBottom: 10 }}><Clock size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Historial de Cambios</div>
      {bitacora.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 30, color: '#9ca3af' }}>Sin movimientos registrados</div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 2, background: '#d1d5db' }} />
          {bitacora.map((b, i) => {
            const colores = { alta: '#10b981', baja: '#ef4444', reactivacion: '#3b82f6', cambio_cargo: '#f59e0b', cambio_grado: '#8b5cf6', cambio_region: '#ec4899', cambio_zona: '#14b8a6', cambio_especializada: '#6366f1', reset_password: '#6b7280', actualizacion_datos: '#9ca3af' };
            const c = colores[b.tipo_cambio] || '#6b7280';
            return (
              <div key={b.id} style={{ position: 'relative', marginBottom: 10 }}>
                <div style={{ position: 'absolute', left: -20, top: 8, width: 14, height: 14, borderRadius: '50%', background: c, border: `3px solid ${COLORS.white}`, boxShadow: `0 0 0 2px ${c}` }} />
                <div style={{ ...cardStyle, marginBottom: 0, padding: 12, borderLeft: `3px solid ${c}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.primary }}>{b.tipo_cambio.replace(/_/g, ' ').toUpperCase()}</div>
                      {b.campo_modificado && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Campo: {b.campo_modificado}</div>}
                      {b.valor_anterior && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>Anterior: {b.valor_anterior}</div>}
                      {b.valor_nuevo && <div style={{ fontSize: 12, color: '#10b981', marginTop: 2 }}>Nuevo: {b.valor_nuevo}</div>}
                      {b.motivo && <div style={{ fontSize: 12, color: '#374151', marginTop: 4, fontStyle: 'italic' }}>"{b.motivo}"</div>}
                      {b.numero_oficio_comision && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Oficio: {b.numero_oficio_comision}</div>}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af', minWidth: 100 }}>
                      <div>{formatFecha(b.created_at)}</div>
                      <div>{b.autorizado_por}</div>
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

  // ═══════════════════════════════════════════════════════════════
  // ALTA DE PERSONAL
  // ═══════════════════════════════════════════════════════════════
  const renderAlta = () => {
    const generarPass = () => {
      const p = `FGE-${formAlta.numero_empleado || Math.floor(Math.random() * 99999)}-${new Date().getFullYear()}`;
      setPassTemp(p);
    };

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button style={{ ...btnSecondary, padding: '6px 12px' }} onClick={() => setSeccion('directorio')}><ChevronLeft size={16} /> Directorio</button>
          <h3 style={{ margin: 0, color: COLORS.primary }}>Alta de Personal</h3>
        </div>

        {altaExito && (
          <div style={{ ...cardStyle, background: '#f0fdf4', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontWeight: 700, color: '#085041', fontSize: 14, marginBottom: 6 }}>✅ Elemento registrado exitosamente</div>
            <div style={{ fontSize: 13, color: '#374151' }}>Nombre: <strong>{altaExito.nombre}</strong></div>
            <div style={{ fontSize: 13, color: '#374151' }}>Correo: <strong>{altaExito.email}</strong></div>
            <div style={{ fontSize: 13, color: '#dc2626', fontFamily: 'monospace', fontWeight: 700, marginTop: 6 }}>Contraseña temporal: {altaExito.password}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>Entregue estas credenciales al elemento. Al iniciar sesión por primera vez deberá cambiar su contraseña.</div>
          </div>
        )}

        <div style={cardStyle}>
          <div style={tituloSeccion}><UserPlus size={15} /> Datos del nuevo elemento</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Nombre completo *</label><input style={inputStyle} placeholder="Nombre(s) Apellido Paterno Materno" value={formAlta.nombre_completo} onChange={e => setFormAlta({ ...formAlta, nombre_completo: e.target.value })} /></div>
            <div><label style={labelStyle}>Correo electrónico *</label><input style={inputStyle} type="email" placeholder="correo@ejemplo.com" value={formAlta.email} onChange={e => setFormAlta({ ...formAlta, email: e.target.value })} /></div>
            <div><label style={labelStyle}>No. Empleado *</label><input style={inputStyle} placeholder="59793" value={formAlta.numero_empleado} onChange={e => setFormAlta({ ...formAlta, numero_empleado: e.target.value })} /></div>
            <div><label style={labelStyle}>CUIP (20 caracteres)</label><input style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: 1 }} maxLength={20} placeholder="PEGJ850615HGRRZN0801" value={formAlta.cuip} onChange={e => setFormAlta({ ...formAlta, cuip: e.target.value.toUpperCase() })} /></div>
            <div><label style={labelStyle}>Teléfono personal</label><input style={inputStyle} placeholder="7471234567" value={formAlta.telefono_personal} onChange={e => setFormAlta({ ...formAlta, telefono_personal: e.target.value })} /></div>

            <div style={{ gridColumn: '1 / -1', borderTop: '2px solid #e8ecf1', paddingTop: 14 }}>
              <div style={{ fontWeight: 700, color: COLORS.gold, fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Adscripción</div>
            </div>
            <div>
              <label style={labelStyle}>Grado escalafonario</label>
              <select style={selectStyle} value={formAlta.grado} onChange={e => setFormAlta({ ...formAlta, grado: e.target.value })}>
                {GRADOS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Cargo / Comisión *</label>
              <select style={selectStyle} value={formAlta.cargo} onChange={e => setFormAlta({ ...formAlta, cargo: e.target.value })}>
                {CARGOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Región *</label>
              <select style={selectStyle} value={formAlta.region} onChange={e => setFormAlta({ ...formAlta, region: e.target.value })}>
                <option value="">— Seleccionar —</option>
                {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Zona / Coordinación</label><input style={inputStyle} placeholder="Zona Chilpancingo Norte" value={formAlta.zona} onChange={e => setFormAlta({ ...formAlta, zona: e.target.value })} /></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Coordinación Especializada (si aplica)</label>
              <select style={selectStyle} value={formAlta.coordinacion_especializada} onChange={e => setFormAlta({ ...formAlta, coordinacion_especializada: e.target.value })}>
                <option value="">— No aplica (Coordinación regular) —</option>
                {FISCALIAS_ESP.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1', borderTop: '2px solid #e8ecf1', paddingTop: 14 }}>
              <div style={{ fontWeight: 700, color: COLORS.gold, fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Credenciales de acceso</div>
            </div>
            <div>
              <label style={labelStyle}>Contraseña temporal *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inputStyle, fontFamily: 'monospace', flex: 1, width: 'auto' }} value={passTemp} onChange={e => setPassTemp(e.target.value)} placeholder="FGE-59793-2026" />
                <button type="button" style={{ ...btnSecondary, padding: '8px 14px', fontSize: 12, whiteSpace: 'nowrap' }} onClick={generarPass}>Generar</button>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>El elemento deberá cambiar esta contraseña en su primer ingreso.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={() => setSeccion('directorio')}>Cancelar</button>
            <button style={btnPrimary} onClick={async () => {
              if (!formAlta.nombre_completo || !formAlta.email || !formAlta.numero_empleado || !formAlta.region || !passTemp) {
                setError('Nombre, correo, No. empleado, región y contraseña son obligatorios');
                return;
              }
              const user = await crearElemento(formAlta, passTemp);
              if (user) {
                setAltaExito({ nombre: formAlta.nombre_completo, email: formAlta.email, password: passTemp });
                setFormAlta(emptyAlta);
                setPassTemp('');
              }
            }} disabled={loading}>
              <UserPlus size={15} /> {loading ? 'Registrando...' : 'Dar de alta'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER PRINCIPAL
  // ═══════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: '10px 0' }}>
      {error && (
        <div style={{ ...cardStyle, background: '#fef2f2', borderLeft: '4px solid #ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#dc2626', fontSize: 13 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>✕</button>
        </div>
      )}
      {seccion === 'directorio' && renderDirectorio()}
      {seccion === 'ficha' && renderFicha()}
      {seccion === 'alta' && renderAlta()}
      {loading && seccion === 'directorio' && (
        <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>
          <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
