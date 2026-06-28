// src/pages/PrimerRespondiente.jsx
// Tab 2 — Primer Respondiente (IPH Digital)
// Sistema Ministerial — FGE Guerrero — Módulo 2
// Fundamento: Modelo Nacional 1.2(a), Protocolo Nacional de Actuación PR
// v2 — Mejoras: SSPC, sin AEI, Comisión agente, 24h, C.I. vinculación

import { useState } from 'react';
import {
  Shield, Clock, AlertTriangle, CheckCircle2, Plus, Search, Filter,
  X, Send, RefreshCw, Eye, UserCheck, MapPin, Users, Siren,
  FileText, Radio, ChevronDown, Activity, Zap, ShieldAlert, Briefcase,
} from 'lucide-react';
import { usePrimerRespondiente } from '../hooks/usePrimerRespondiente';

const C = {
  darkBlue: '#001a4d', gold: '#b69054', lightGold: '#f5ede0',
  white: '#ffffff', bg: '#f4f6fb', gray: '#666666', lightGray: '#e8ecf1',
  green: '#28a745', yellow: '#ffc107', red: '#dc3545', orange: '#fd7e14',
};

// ═══════════════════════════════════════════════
// CORPORACIONES — Feedback: +SSPC, Policía Ministerial sin AEI
// ═══════════════════════════════════════════════
const CORPORACIONES = [
  'Policía Municipal',
  'Policía Estatal',
  'SSPC — Secretaría de Seguridad y Protección Ciudadana',
  'Guardia Nacional',
  'Policía Ministerial',
  'Ejército Mexicano',
  'Marina',
  'Otra',
];

const APOYO_OPTIONS = [
  'Bomberos', 'Protección Civil', 'Servicios médicos / SAMU',
  'Peritos', 'PCP', 'Policía Ministerial', 'Guardia Nacional', 'Otro',
];

const NIVEL_CONTACTO_CONFIG = {
  simple_inmediacion: { label: 'Simple inmediación', desc: 'Contacto visual, no físico' },
  restriccion_temporal: { label: 'Restricción temporal', desc: 'Control momentáneo sin detención' },
  detencion_estricta: { label: 'Detención estricta', desc: 'Detención formal con candados' },
};

const HORA_DORADA_CONFIG = {
  verde: { bg: '#e8f5e9', border: '#28a745', color: '#1b5e20', label: 'HORA DORADA', icon: '🟢' },
  amarillo: { bg: '#fff8e1', border: '#ffc107', color: '#f57f17', label: 'URGENCIA CRECIENTE', icon: '🟡' },
  rojo: { bg: '#ffebee', border: '#dc3545', color: '#b71c1c', label: 'PLAZO CRÍTICO', icon: '🔴' },
  gris: { bg: '#f5f5f5', border: '#9e9e9e', color: '#616161', label: 'SIN DATO', icon: '⚪' },
};

const ANEXOS_IPH = [
  { key: 'anexo_a', label: 'Anexo A — Detención(es)', trigger: 'Hay persona(s) detenida(s)' },
  { key: 'anexo_b', label: 'Anexo B — Uso de la fuerza', trigger: 'Se empleó uso de la fuerza' },
  { key: 'anexo_c', label: 'Anexo C — Inspección de vehículo', trigger: 'Hay vehículo relacionado' },
  { key: 'anexo_d', label: 'Anexo D — Inventario de armas/objetos', trigger: 'Hay armas u objetos asegurados' },
  { key: 'anexo_e', label: 'Anexo E — Entrevistas', trigger: 'Se realizaron entrevistas en sitio' },
  { key: 'anexo_f', label: 'Anexo F — Entrega-recepción del lugar', trigger: 'Se realizó entrega del lugar al PIM/PCP' },
  { key: 'anexo_g', label: 'Anexo G — Continuación narrativa', trigger: 'La narrativa excede el espacio del IPH' },
];

// ═══════════════════════════════════════════════
// MUNICIPIOS DE GUERRERO (INEGI Clave 12)
// ═══════════════════════════════════════════════
const MUNICIPIOS_GUERRERO = [
  { clave: '001', nombre: 'Acapulco de Juárez' },
  { clave: '002', nombre: 'Ahuacuotzingo' },
  { clave: '003', nombre: 'Ajuchitlán del Progreso' },
  { clave: '004', nombre: 'Alcozauca de Guerrero' },
  { clave: '005', nombre: 'Alpoyeca' },
  { clave: '006', nombre: 'Apaxtla' },
  { clave: '007', nombre: 'Arcelia' },
  { clave: '008', nombre: 'Atenango del Río' },
  { clave: '009', nombre: 'Atlamajalcingo del Monte' },
  { clave: '010', nombre: 'Atlixtac' },
  { clave: '011', nombre: 'Atoyac de Álvarez' },
  { clave: '012', nombre: 'Ayutla de los Libres' },
  { clave: '013', nombre: 'Azoyú' },
  { clave: '014', nombre: 'Benito Juárez' },
  { clave: '015', nombre: 'Buenavista de Cuéllar' },
  { clave: '016', nombre: 'Coahuayutla de José María Izazaga' },
  { clave: '017', nombre: 'Cocula' },
  { clave: '018', nombre: 'Copala' },
  { clave: '019', nombre: 'Copalillo' },
  { clave: '020', nombre: 'Copanatoyac' },
  { clave: '021', nombre: 'Coyuca de Benítez' },
  { clave: '022', nombre: 'Coyuca de Catalán' },
  { clave: '023', nombre: 'Cuajinicuilapa' },
  { clave: '024', nombre: 'Cualác' },
  { clave: '025', nombre: 'Cuautepec' },
  { clave: '026', nombre: 'Cuetzala del Progreso' },
  { clave: '027', nombre: 'Cutzamala de Pinzón' },
  { clave: '028', nombre: 'Chilapa de Álvarez' },
  { clave: '029', nombre: 'Chilpancingo de los Bravo' },
  { clave: '030', nombre: 'Florencio Villarreal' },
  { clave: '031', nombre: 'General Canuto A. Neri' },
  { clave: '032', nombre: 'General Heliodoro Castillo' },
  { clave: '033', nombre: 'Huamuxtitlán' },
  { clave: '034', nombre: 'Huitzuco de los Figueroa' },
  { clave: '035', nombre: 'Iguala de la Independencia' },
  { clave: '036', nombre: 'Igualapa' },
  { clave: '037', nombre: 'Ixcateopan de Cuauhtémoc' },
  { clave: '038', nombre: 'Zihuatanejo de Azueta' },
  { clave: '039', nombre: 'Juan R. Escudero' },
  { clave: '040', nombre: 'Leonardo Bravo' },
  { clave: '041', nombre: 'Malinaltepec' },
  { clave: '042', nombre: 'Mártir de Cuilapan' },
  { clave: '043', nombre: 'Metlatónoc' },
  { clave: '044', nombre: 'Mochitlán' },
  { clave: '045', nombre: 'Olinalá' },
  { clave: '046', nombre: 'Ometepec' },
  { clave: '047', nombre: 'Pedro Ascencio Alquisiras' },
  { clave: '048', nombre: 'Petatlán' },
  { clave: '049', nombre: 'Pilcaya' },
  { clave: '050', nombre: 'Pungarabato' },
  { clave: '051', nombre: 'Quechultenango' },
  { clave: '052', nombre: 'San Luis Acatlán' },
  { clave: '053', nombre: 'San Marcos' },
  { clave: '054', nombre: 'San Miguel Totolapan' },
  { clave: '055', nombre: 'Taxco de Alarcón' },
  { clave: '056', nombre: 'Tecoanapa' },
  { clave: '057', nombre: 'Técpan de Galeana' },
  { clave: '058', nombre: 'Teloloapan' },
  { clave: '059', nombre: 'Tepecoacuilco de Trujano' },
  { clave: '060', nombre: 'Tetipac' },
  { clave: '061', nombre: 'Tixtla de Guerrero' },
  { clave: '062', nombre: 'Tlacoachistlahuaca' },
  { clave: '063', nombre: 'Tlacoapa' },
  { clave: '064', nombre: 'Tlalchapa' },
  { clave: '065', nombre: 'Tlalixtaquilla de Maldonado' },
  { clave: '066', nombre: 'Tlapa de Comonfort' },
  { clave: '067', nombre: 'Tlapehuala' },
  { clave: '068', nombre: 'La Unión de Isidoro Montes de Oca' },
  { clave: '069', nombre: 'Xalpatláhuac' },
  { clave: '070', nombre: 'Xochihuehuetlán' },
  { clave: '071', nombre: 'Xochistlahuaca' },
  { clave: '072', nombre: 'Zapotitlán Tablas' },
  { clave: '073', nombre: 'Zirándaro' },
  { clave: '074', nombre: 'Zitlala' },
  { clave: '075', nombre: 'Eduardo Neri' },
  { clave: '076', nombre: 'Acatepec' },
  { clave: '077', nombre: 'Marquelia' },
  { clave: '078', nombre: 'Cochoapa el Grande' },
  { clave: '079', nombre: 'José Joaquín de Herrera' },
  { clave: '080', nombre: 'Juchitán' },
  { clave: '081', nombre: 'Iliatenco' },
];

// ═══════════════════════════════════════════════
// FORMATO 24 HORAS
// ═══════════════════════════════════════════════
const HORAS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTOS_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function formatDate(d) { if (!d) return '—'; return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }
function formatTime(t) { return t ? t.substring(0, 5) + ' hrs' : '—'; }
function formatHoras(h) { if (h == null) return '—'; return h < 1 ? `${Math.round(h * 60)}min` : `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`; }

function HoraDoradaBadge({ horaDorada }) {
  const cfg = HORA_DORADA_CONFIG[horaDorada.color] || HORA_DORADA_CONFIG.gris;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 20, padding: '4px 12px' }}>
      <span style={{ fontSize: 12 }}>{cfg.icon}</span>
      <span style={{ color: cfg.color, fontSize: 10, fontWeight: 700 }}>{cfg.label}</span>
      {horaDorada.horas != null && <span style={{ color: cfg.color, fontSize: 10 }}>({formatHoras(horaDorada.horas)})</span>}
    </div>
  );
}

// Selector de hora 24h reutilizable
function Hora24Selector({ hh, mm, onChangeHH, onChangeMM, selectStyle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <select style={{ ...selectStyle, flex: 1, textAlign: 'center' }} value={hh} onChange={e => onChangeHH(e.target.value)}>
        {HORAS_24.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span style={{ fontSize: 18, fontWeight: 700, color: C.darkBlue }}>:</span>
      <select style={{ ...selectStyle, flex: 1, textAlign: 'center' }} value={mm} onChange={e => onChangeMM(e.target.value)}>
        {MINUTOS_60.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <span style={{ fontSize: 11, color: C.gray, marginLeft: 4 }}>hrs</span>
    </div>
  );
}

export default function PrimerRespondiente({ perfil }) {
  const {
    registros, reportes911, catalogoIncidencias, loading, error, stats,
    calcularHoraDorada, crearRegistro, actualizarRegistro, refetch,
  } = usePrimerRespondiente(perfil);

  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState(1);

  const nowHH = String(new Date().getHours()).padStart(2, '0');
  const nowMM = String(new Date().getMinutes()).padStart(2, '0');

  const emptyForm = {
    modo: 'vinculado',
    registro_911_id: '',
    carpeta_investigacion: '',
    nombre: '', grado: '', unidad: '', corporacion: 'Policía Municipal',
    comision_agente: '',
    hora_arribo_hh: nowHH,
    hora_arribo_mm: nowMM,
    tiempo_respuesta_min: '',
    verificacion_confirmada: false,
    tipo_evento_confirmado: '',
    discrepancia_reporte: '',
    acordonamiento_realizado: false,
    ruta_entrada_salida: '',
    riesgos_identificados: '',
    apoyo_solicitado: [],
    descripcion_hallazgo: '',
    victimas_count: 0,
    personas_detenidas: false,
    flagrancia: false,
    uso_fuerza: false,
    nivel_contacto: '',
    descripcion_uso_fuerza: '',
    huellas_violencia: false,
    huellas_descripcion: '',
    hora_conocimiento_fecha: new Date().toISOString().split('T')[0],
    hora_conocimiento_hh: nowHH,
    hora_conocimiento_mm: nowMM,
    pim_es_primer_respondiente: false,
    anexos: [],
    municipio_flagrancia: '',
  };
  const [form, setForm] = useState(emptyForm);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleApoyo = (item) => {
    setForm(p => ({
      ...p,
      apoyo_solicitado: p.apoyo_solicitado.includes(item)
        ? p.apoyo_solicitado.filter(a => a !== item)
        : [...p.apoyo_solicitado, item],
    }));
  };

  const toggleAnexo = (key) => {
    setForm(p => ({
      ...p,
      anexos: p.anexos.includes(key)
        ? p.anexos.filter(a => a !== key)
        : [...p.anexos, key],
    }));
  };

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return setMensaje({ tipo: 'error', texto: 'El nombre del primer respondiente es obligatorio' });
    if (form.modo === 'vinculado' && !form.registro_911_id) return setMensaje({ tipo: 'error', texto: 'Selecciona un reporte 911 para vincular' });
    if (!form.hora_arribo_hh) return setMensaje({ tipo: 'error', texto: 'La hora de arribo es obligatoria' });

    setSaving(true);
    setMensaje(null);

    const horaArribo = `${form.hora_arribo_hh}:${form.hora_arribo_mm}`;
    const horaConocimiento = `${form.hora_conocimiento_fecha}T${form.hora_conocimiento_hh}:${form.hora_conocimiento_mm}`;

    const dataToSave = {
      registro_911_id: form.modo === 'vinculado' ? form.registro_911_id : null,
      carpeta_investigacion: form.carpeta_investigacion || null,
      nombre: form.nombre,
      grado: form.grado || null,
      unidad: form.unidad || null,
      corporacion: form.corporacion || null,
      comision_agente: form.comision_agente || null,
      hora_arribo: horaArribo,
      tiempo_respuesta_min: form.tiempo_respuesta_min ? parseInt(form.tiempo_respuesta_min) : null,
      verificacion_confirmada: form.verificacion_confirmada,
      tipo_evento_confirmado: form.tipo_evento_confirmado || null,
      discrepancia_reporte: form.discrepancia_reporte || null,
      acordonamiento_realizado: form.acordonamiento_realizado,
      ruta_entrada_salida: form.ruta_entrada_salida || null,
      riesgos_identificados: form.riesgos_identificados || null,
      apoyo_solicitado: form.apoyo_solicitado.length > 0 ? form.apoyo_solicitado : null,
      descripcion_hallazgo: form.descripcion_hallazgo || null,
      victimas_count: form.victimas_count || 0,
      personas_detenidas: form.personas_detenidas,
      flagrancia: form.flagrancia,
      uso_fuerza: form.uso_fuerza,
      nivel_contacto: form.nivel_contacto || null,
      descripcion_uso_fuerza: form.uso_fuerza ? form.descripcion_uso_fuerza : null,
      huellas_violencia: form.huellas_violencia,
      huellas_descripcion: form.huellas_violencia ? form.huellas_descripcion : null,
      hora_conocimiento_hecho: horaConocimiento,
    };

    if (form.modo === 'independiente') {
      delete dataToSave.registro_911_id;
    }

    const result = await crearRegistro(dataToSave);
    setSaving(false);

    if (result.success) {
      setMensaje({ tipo: 'ok', texto: 'IPH registrado correctamente' });
      setForm(emptyForm);
      setSeccionActiva(1);
      setTimeout(() => { setShowForm(false); setMensaje(null); }, 1500);
    } else {
      setMensaje({ tipo: 'error', texto: result.error || 'Error al guardar' });
    }
  };

  const filtrados = registros.filter(r => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (r.nombre || '').toLowerCase().includes(q) ||
      (r.corporacion || '').toLowerCase().includes(q) ||
      (r.carpeta_investigacion || '').toLowerCase().includes(q) ||
      (r.registros_911?.folio_911 || '').toLowerCase().includes(q) ||
      (r.registros_911?.ubicacion_texto || '').toLowerCase().includes(q);
  });

  const incidenciasPorCategoria = catalogoIncidencias.reduce((acc, inc) => {
    if (!acc[inc.categoria]) acc[inc.categoria] = [];
    acc[inc.categoria].push(inc);
    return acc;
  }, {});

  // ═══════════════════════════════════════════════
  // ESTILOS
  // ═══════════════════════════════════════════════
  const s = {
    container: { padding: 24, fontFamily: 'Segoe UI, Arial, sans-serif', backgroundColor: C.bg, minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
    title: { fontSize: 22, fontWeight: 700, color: C.darkBlue, display: 'flex', alignItems: 'center', gap: 10, margin: 0 },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 },
    statCard: { backgroundColor: C.white, borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 },
    btn: (bg, clr) => ({ backgroundColor: bg, color: clr, border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }),
    btnOutline: { backgroundColor: 'transparent', color: C.darkBlue, border: `2px solid ${C.darkBlue}`, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,26,77,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 30, zIndex: 1000, overflowY: 'auto' },
    card: { backgroundColor: C.white, borderRadius: 14, width: '100%', maxWidth: 750, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', marginBottom: 40 },
    cardHeader: { backgroundColor: C.darkBlue, color: C.white, padding: '18px 24px', borderRadius: '14px 14px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    body: { padding: 24 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
    grid1: { display: 'grid', gridTemplateColumns: '1fr', gap: 14 },
    formGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
    label: { fontSize: 12, fontWeight: 600, color: C.darkBlue },
    req: { color: C.red, marginLeft: 2 },
    input: { padding: '10px 12px', border: `1px solid ${C.lightGray}`, borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit' },
    select: { padding: '10px 12px', border: `1px solid ${C.lightGray}`, borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: C.white, fontFamily: 'inherit', cursor: 'pointer' },
    textarea: { padding: '10px 12px', border: `1px solid ${C.lightGray}`, borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical', minHeight: 70 },
    checkbox: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${C.lightGray}`, backgroundColor: C.bg, whiteSpace: 'nowrap' },
    td: { padding: '12px 16px', fontSize: 13, borderBottom: `1px solid ${C.lightGray}`, color: C.darkBlue },
    badge: (bg, clr) => ({ display: 'inline-block', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: bg, color: clr }),
    tableContainer: { backgroundColor: C.white, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' },
    searchBox: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderRadius: 8, padding: '8px 14px', flex: 1, maxWidth: 350 },
    empty: { textAlign: 'center', padding: '60px 20px', color: C.gray },
    footer: { padding: '16px 24px', borderTop: `1px solid ${C.lightGray}`, display: 'flex', justifyContent: 'flex-end', gap: 12 },
    tabNav: { display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' },
    tabBtn: (active) => ({
      padding: '8px 16px', borderRadius: 8, border: `1px solid ${active ? C.gold : C.lightGray}`,
      backgroundColor: active ? C.lightGold : C.white, color: active ? C.gold : C.gray,
      fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
    }),
  };

  return (
    <div style={s.container}>

      {/* HEADER */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}><Shield size={22} color={C.gold} />Primer Respondiente — IPH Digital</h2>
          <p style={{ fontSize: 13, color: C.gray, margin: '4px 0 0 0' }}>Módulo 2 · Tab 2 · Informe Policial Homologado</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={s.btnOutline} onClick={refetch}><RefreshCw size={15} /> Actualizar</button>
          <button style={s.btn(C.darkBlue, C.white)} onClick={() => { setForm(emptyForm); setSeccionActiva(1); setShowForm(true); setMensaje(null); }}>
            <Plus size={16} /> Nuevo IPH
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={s.statsRow}>
        {[
          { label: 'Total IPH', value: stats.total, color: C.darkBlue, icon: FileText },
          { label: 'Con detenidos', value: stats.con_detenidos, color: C.orange, icon: UserCheck },
          { label: 'Uso de fuerza', value: stats.con_uso_fuerza, color: C.red, icon: ShieldAlert },
          { label: 'Hora Dorada', value: stats.hora_dorada_verde, color: C.green, icon: Clock },
          { label: 'Urgencia', value: stats.hora_dorada_amarillo, color: '#f57f17', icon: AlertTriangle },
          { label: 'Crítico', value: stats.hora_dorada_rojo, color: C.red, icon: Zap },
        ].map((st, i) => (
          <div key={i} style={s.statCard}>
            <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: st.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <st.icon size={20} color={st.color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.darkBlue }}>{st.value}</div>
              <div style={{ fontSize: 12, color: C.gray }}>{st.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div style={s.tableContainer}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.lightGray}`, flexWrap: 'wrap', gap: 10 }}>
          <div style={s.searchBox}>
            <Search size={16} color={C.gray} />
            <input type="text" placeholder="Buscar por nombre, corporación, folio 911, C.I...." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: 14, backgroundColor: 'transparent', flex: 1, fontFamily: 'inherit' }} />
            {searchTerm && <X size={14} color={C.gray} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />}
          </div>
        </div>

        {loading ? (
          <div style={s.empty}><RefreshCw size={32} color={C.gray} /><p>Cargando IPH...</p></div>
        ) : filtrados.length === 0 ? (
          <div style={s.empty}>
            <Shield size={40} color={C.lightGray} />
            <p style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>
              {searchTerm ? 'Sin resultados' : 'No hay IPH registrados'}
            </p>
            <p style={{ fontSize: 13 }}>
              {searchTerm ? 'Intenta con otros criterios' : 'Haz clic en "Nuevo IPH" para comenzar'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>C.I. / Folio</th>
                  <th style={s.th}>Respondiente</th>
                  <th style={s.th}>Corporación</th>
                  <th style={s.th}>Hora arribo</th>
                  <th style={s.th}>Hora Dorada</th>
                  <th style={s.th}>Detenidos</th>
                  <th style={s.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r, idx) => {
                  const hd = calcularHoraDorada(r.hora_conocimiento_hecho);
                  return (
                    <tr key={r.id} style={{ backgroundColor: idx % 2 === 0 ? C.white : C.bg, cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = C.lightGold}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? C.white : C.bg}
                      onClick={() => setShowDetail(r)}>
                      <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>
                        {r.carpeta_investigacion || r.registros_911?.folio_911 || '(Pendiente C.I.)'}
                      </td>
                      <td style={s.td}>
                        <div style={{ fontWeight: 600 }}>{r.nombre}</div>
                        {r.grado && <div style={{ fontSize: 11, color: C.gray }}>{r.grado}</div>}
                      </td>
                      <td style={s.td}><span style={s.badge(C.darkBlue + '15', C.darkBlue)}>{r.corporacion || '—'}</span></td>
                      <td style={s.td}>{formatTime(r.hora_arribo)}</td>
                      <td style={s.td}><HoraDoradaBadge horaDorada={hd} /></td>
                      <td style={s.td}>
                        {r.personas_detenidas ? <span style={s.badge('#fff3e0', '#e65100')}>Sí</span> : <span style={{ color: C.gray, fontSize: 12 }}>No</span>}
                      </td>
                      <td style={s.td}>
                        <button style={{ ...s.btnOutline, padding: '4px 10px', fontSize: 11 }} onClick={e => { e.stopPropagation(); setShowDetail(r); }}>
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

      {/* FORM MODAL */}
      {showForm && (
        <div style={s.overlay} onClick={() => setShowForm(false)}>
          <div style={s.card} onClick={e => e.stopPropagation()}>

            <div style={s.cardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Shield size={20} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>Nuevo IPH — Primer Respondiente</span>
              </div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowForm(false)} />
            </div>

            <div style={s.body}>

              {/* Modo selector */}
              <div style={{ ...s.section, display: 'flex', gap: 8, marginBottom: 20 }}>
                {[
                  { key: 'vinculado', label: 'Vinculado a Reporte 911', icon: Radio },
                  { key: 'independiente', label: 'Flagrancia / Independiente', icon: Siren },
                ].map(m => (
                  <button key={m.key} onClick={() => set('modo', m.key)} style={{
                    flex: 1, padding: '12px', borderRadius: 10, cursor: 'pointer',
                    border: form.modo === m.key ? `2px solid ${C.gold}` : `1px solid ${C.lightGray}`,
                    backgroundColor: form.modo === m.key ? C.lightGold : C.white,
                    color: form.modo === m.key ? C.darkBlue : C.gray,
                    fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    <m.icon size={16} /> {m.label}
                  </button>
                ))}
              </div>

              {/* Section nav */}
              <div style={s.tabNav}>
                {[
                  { n: 1, label: 'Origen', icon: Radio },
                  { n: 2, label: 'Respondiente', icon: Shield },
                  { n: 3, label: 'Verificación', icon: CheckCircle2 },
                  { n: 4, label: 'Situación', icon: AlertTriangle },
                  { n: 5, label: 'Anexos', icon: FileText },
                ].map(t => (
                  <button key={t.n} onClick={() => setSeccionActiva(t.n)} style={s.tabBtn(seccionActiva === t.n)}>
                    <t.icon size={14} /> {t.label}
                  </button>
                ))}
              </div>

              {/* SEC 1: Origen */}
              {seccionActiva === 1 && (
                <div style={s.section}>
                  <div style={s.sectionTitle}><Radio size={15} /> {form.modo === 'vinculado' ? 'Reporte 911 vinculado' : 'Flagrancia / Conocimiento directo'}</div>

                  {form.modo === 'vinculado' ? (
                    <div style={s.formGroup}>
                      <label style={s.label}>Seleccionar reporte 911 <span style={s.req}>*</span></label>
                      <select style={s.select} value={form.registro_911_id} onChange={e => set('registro_911_id', e.target.value)}>
                        <option value="">— Seleccionar reporte —</option>
                        {reportes911.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.folio_911} — {r.catalogo_incidencias?.nombre || r.incidencia_tipo} — {r.ubicacion_texto?.substring(0, 40)}
                          </option>
                        ))}
                      </select>
                      {reportes911.length === 0 && <p style={{ color: C.gray, fontSize: 11 }}>No hay reportes 911 pendientes de atender.</p>}
                    </div>
                  ) : (
                    <div style={s.grid2}>
                      <div style={s.formGroup}>
                        <label style={s.label}>Municipio del hecho</label>
                        <select style={s.select} value={form.municipio_flagrancia} onChange={e => set('municipio_flagrancia', e.target.value)}>
                          <option value="">— Seleccionar municipio —</option>
                          {MUNICIPIOS_GUERRERO.map(m => (
                            <option key={m.clave} value={m.nombre}>{m.clave} — {m.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div style={s.formGroup}>
                        <label style={s.label}>Entidad Federativa</label>
                        <input style={{ ...s.input, backgroundColor: '#f0f0f0' }} value="Guerrero" readOnly />
                      </div>
                    </div>
                  )}

                  {/* Carpeta de Investigación — vinculación principal */}
                  <div style={{ ...s.formGroup, marginTop: 14, padding: 14, backgroundColor: C.lightGold, borderRadius: 10, border: `1px solid ${C.gold}40` }}>
                    <label style={{ ...s.label, color: C.gold, fontSize: 13 }}>
                      <Briefcase size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                      Carpeta de Investigación (C.I.)
                    </label>
                    <p style={{ fontSize: 11, color: C.gray, margin: '4px 0 8px 0' }}>
                      20 dígitos asignados por el Ministerio Público. Se vincula cuando el MP la genera.
                    </p>
                    <input
                      style={{ ...s.input, fontFamily: 'monospace', fontSize: 15, letterSpacing: 1, textAlign: 'center' }}
                      type="text"
                      maxLength={25}
                      placeholder="Ej: 12030290300463130025"
                      value={form.carpeta_investigacion}
                      onChange={e => set('carpeta_investigacion', e.target.value)}
                    />
                  </div>

                  {/* Momento del conocimiento — formato 24h */}
                  <div style={{ ...s.formGroup, marginTop: 14 }}>
                    <label style={s.label}>Fecha del conocimiento del hecho <span style={s.req}>*</span></label>
                    <input type="date" style={s.input} value={form.hora_conocimiento_fecha} onChange={e => set('hora_conocimiento_fecha', e.target.value)} />
                  </div>
                  <div style={{ ...s.formGroup, marginTop: 10 }}>
                    <label style={s.label}>Hora del conocimiento del hecho (24h) <span style={s.req}>*</span></label>
                    <Hora24Selector
                      hh={form.hora_conocimiento_hh} mm={form.hora_conocimiento_mm}
                      onChangeHH={v => set('hora_conocimiento_hh', v)}
                      onChangeMM={v => set('hora_conocimiento_mm', v)}
                      selectStyle={s.select}
                    />
                    {form.hora_conocimiento_fecha && (
                      <div style={{ marginTop: 6 }}>
                        <HoraDoradaBadge horaDorada={calcularHoraDorada(`${form.hora_conocimiento_fecha}T${form.hora_conocimiento_hh}:${form.hora_conocimiento_mm}`)} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SEC 2: Datos del Respondiente */}
              {seccionActiva === 2 && (
                <div style={s.section}>
                  <div style={s.sectionTitle}><Shield size={15} /> Datos del Primer Respondiente</div>

                  <div style={{ ...s.checkbox, backgroundColor: form.pim_es_primer_respondiente ? '#e3f2fd' : 'transparent', border: `1px solid ${form.pim_es_primer_respondiente ? '#1565c0' : C.lightGray}`, marginBottom: 14 }}
                    onClick={() => set('pim_es_primer_respondiente', !form.pim_es_primer_respondiente)}>
                    <input type="checkbox" checked={form.pim_es_primer_respondiente} readOnly style={{ width: 16, height: 16 }} />
                    <span style={{ color: form.pim_es_primer_respondiente ? '#1565c0' : C.gray }}>
                      El PIM (Policía de Investigación Ministerial) fue el primer respondiente
                    </span>
                  </div>

                  <div style={s.grid2}>
                    <div style={s.formGroup}>
                      <label style={s.label}>Nombre completo <span style={s.req}>*</span></label>
                      <input style={s.input} placeholder="Nombre del primer respondiente" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Grado / Rango</label>
                      <input style={s.input} placeholder="Ej: Oficial, Subinspector" value={form.grado} onChange={e => set('grado', e.target.value)} />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Corporación <span style={s.req}>*</span></label>
                      <select style={s.select} value={form.corporacion} onChange={e => set('corporacion', e.target.value)}>
                        {CORPORACIONES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Unidad operativa</label>
                      <input style={s.input} placeholder="Ej: PM-376, PIM-012" value={form.unidad} onChange={e => set('unidad', e.target.value)} />
                    </div>
                  </div>

                  {/* Comisión del agente — campo nuevo */}
                  <div style={{ ...s.formGroup, marginTop: 14 }}>
                    <label style={s.label}>
                      <Briefcase size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      Comisión del agente
                    </label>
                    <p style={{ fontSize: 11, color: C.gray, margin: '2px 0 6px 0' }}>
                      Coordinación, zona o especializada donde está comisionado el agente.
                    </p>
                    <input
                      style={s.input}
                      placeholder="Ej: Coordinación de Zona Renacimiento, Coord. Regional Zihuatanejo, Especializada Narcomenudeo..."
                      value={form.comision_agente}
                      onChange={e => set('comision_agente', e.target.value)}
                    />
                  </div>

                  {/* Hora de arribo — formato 24h */}
                  <div style={{ ...s.grid2, marginTop: 14 }}>
                    <div style={s.formGroup}>
                      <label style={s.label}>Hora de arribo al lugar (24h) <span style={s.req}>*</span></label>
                      <Hora24Selector
                        hh={form.hora_arribo_hh} mm={form.hora_arribo_mm}
                        onChangeHH={v => set('hora_arribo_hh', v)}
                        onChangeMM={v => set('hora_arribo_mm', v)}
                        selectStyle={s.select}
                      />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Tiempo de respuesta (minutos)</label>
                      <input type="number" style={s.input} placeholder="Ej: 15" value={form.tiempo_respuesta_min} onChange={e => set('tiempo_respuesta_min', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* SEC 3: Verificación en sitio */}
              {seccionActiva === 3 && (
                <div style={s.section}>
                  <div style={s.sectionTitle}><CheckCircle2 size={15} /> Verificación y Preservación del Lugar</div>

                  <div style={s.grid2}>
                    <div style={{ ...s.checkbox, backgroundColor: form.verificacion_confirmada ? '#e8f5e9' : 'transparent', border: `1px solid ${form.verificacion_confirmada ? C.green : C.lightGray}` }}
                      onClick={() => set('verificacion_confirmada', !form.verificacion_confirmada)}>
                      <input type="checkbox" checked={form.verificacion_confirmada} readOnly style={{ width: 16, height: 16 }} />
                      <span style={{ color: form.verificacion_confirmada ? '#1b5e20' : C.gray }}>Reporte confirmado en sitio</span>
                    </div>

                    <div style={{ ...s.checkbox, backgroundColor: form.acordonamiento_realizado ? '#e8f5e9' : 'transparent', border: `1px solid ${form.acordonamiento_realizado ? C.green : C.lightGray}` }}
                      onClick={() => set('acordonamiento_realizado', !form.acordonamiento_realizado)}>
                      <input type="checkbox" checked={form.acordonamiento_realizado} readOnly style={{ width: 16, height: 16 }} />
                      <span style={{ color: form.acordonamiento_realizado ? '#1b5e20' : C.gray }}>Acordonamiento realizado</span>
                    </div>
                  </div>

                  <div style={{ ...s.grid2, marginTop: 14 }}>
                    <div style={s.formGroup}>
                      <label style={s.label}>Tipo de evento confirmado</label>
                      <select style={s.select} value={form.tipo_evento_confirmado} onChange={e => set('tipo_evento_confirmado', e.target.value)}>
                        <option value="">— Mismo que el reportado —</option>
                        {Object.entries(incidenciasPorCategoria).map(([cat, items]) => (
                          <optgroup key={cat} label={cat === 'alto_impacto' ? '🔴 ALTO IMPACTO' : cat === 'especial' ? '🟡 ESPECIALES' : '🔵 COMUNES'}>
                            {items.map(inc => <option key={inc.clave} value={inc.clave}>{inc.nombre}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Ruta de entrada/salida</label>
                      <input style={s.input} placeholder="Descripción de accesos" value={form.ruta_entrada_salida} onChange={e => set('ruta_entrada_salida', e.target.value)} />
                    </div>
                  </div>

                  <div style={{ ...s.formGroup, marginTop: 14 }}>
                    <label style={s.label}>Riesgos identificados</label>
                    <textarea style={s.textarea} placeholder="Riesgos físicos, químicos, biológicos, sociales..." value={form.riesgos_identificados} onChange={e => set('riesgos_identificados', e.target.value)} rows={2} />
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <label style={s.label}>Apoyo solicitado</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {APOYO_OPTIONS.map(opt => (
                        <button key={opt} onClick={() => toggleApoyo(opt)} style={{
                          padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          border: form.apoyo_solicitado.includes(opt) ? `1px solid ${C.gold}` : `1px solid ${C.lightGray}`,
                          backgroundColor: form.apoyo_solicitado.includes(opt) ? C.lightGold : C.white,
                          color: form.apoyo_solicitado.includes(opt) ? C.gold : C.gray,
                        }}>
                          {form.apoyo_solicitado.includes(opt) ? '✓ ' : ''}{opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ ...s.formGroup, marginTop: 14 }}>
                    <label style={s.label}>Descripción de hallazgos iniciales</label>
                    <textarea style={s.textarea} placeholder="Qué se encontró al llegar al lugar..." value={form.descripcion_hallazgo} onChange={e => set('descripcion_hallazgo', e.target.value)} rows={3} />
                  </div>
                </div>
              )}

              {/* SEC 4: Situación encontrada */}
              {seccionActiva === 4 && (
                <div style={s.section}>
                  <div style={s.sectionTitle}><AlertTriangle size={15} /> Situación Encontrada</div>

                  <div style={s.grid2}>
                    <div style={s.formGroup}>
                      <label style={s.label}>Número de víctimas identificadas</label>
                      <input type="number" min="0" style={s.input} value={form.victimas_count} onChange={e => set('victimas_count', parseInt(e.target.value) || 0)} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                    {[
                      { key: 'personas_detenidas', label: 'Hay persona(s) detenida(s)', color: C.orange },
                      { key: 'flagrancia', label: 'Detención en flagrancia', color: C.red },
                      { key: 'uso_fuerza', label: 'Se empleó uso legítimo de la fuerza', color: C.red },
                      { key: 'huellas_violencia', label: 'Se observan huellas de violencia', color: '#7b1fa2' },
                    ].map(opt => (
                      <div key={opt.key} style={{ ...s.checkbox, backgroundColor: form[opt.key] ? opt.color + '15' : 'transparent', border: `1px solid ${form[opt.key] ? opt.color : C.lightGray}` }}
                        onClick={() => set(opt.key, !form[opt.key])}>
                        <input type="checkbox" checked={form[opt.key]} readOnly style={{ width: 16, height: 16 }} />
                        <span style={{ color: form[opt.key] ? opt.color : C.gray }}>{opt.label}</span>
                      </div>
                    ))}
                  </div>

                  {form.personas_detenidas && (
                    <div style={{ ...s.formGroup, marginTop: 14 }}>
                      <label style={s.label}>Nivel de contacto</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {Object.entries(NIVEL_CONTACTO_CONFIG).map(([key, cfg]) => (
                          <button key={key} onClick={() => set('nivel_contacto', key)} style={{
                            textAlign: 'left', padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                            border: form.nivel_contacto === key ? `2px solid ${C.gold}` : `1px solid ${C.lightGray}`,
                            backgroundColor: form.nivel_contacto === key ? C.lightGold : C.white,
                          }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: form.nivel_contacto === key ? C.darkBlue : C.gray }}>{cfg.label}</div>
                            <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>{cfg.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.uso_fuerza && (
                    <div style={{ ...s.formGroup, marginTop: 14 }}>
                      <label style={s.label}>Descripción del uso de la fuerza <span style={s.req}>*</span></label>
                      <textarea style={s.textarea} placeholder="Describa las circunstancias del uso de la fuerza..." value={form.descripcion_uso_fuerza} onChange={e => set('descripcion_uso_fuerza', e.target.value)} rows={3} />
                    </div>
                  )}

                  {form.huellas_violencia && (
                    <div style={{ ...s.formGroup, marginTop: 14 }}>
                      <label style={s.label}>Descripción de huellas de violencia</label>
                      <textarea style={s.textarea} placeholder="Describa las huellas de violencia observadas..." value={form.huellas_descripcion} onChange={e => set('huellas_descripcion', e.target.value)} rows={2} />
                    </div>
                  )}
                </div>
              )}

              {/* SEC 5: Anexos IPH */}
              {seccionActiva === 5 && (
                <div style={s.section}>
                  <div style={s.sectionTitle}><FileText size={15} /> Anexos del IPH Aplicables</div>
                  <p style={{ fontSize: 12, color: C.gray, marginBottom: 14 }}>
                    Marca los anexos que aplican a este IPH. Las páginas 1-5 son obligatorias y se generan automáticamente.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ANEXOS_IPH.map(anx => (
                      <div key={anx.key} style={{
                        ...s.checkbox, border: `1px solid ${form.anexos.includes(anx.key) ? C.gold : C.lightGray}`,
                        backgroundColor: form.anexos.includes(anx.key) ? C.lightGold : C.white,
                      }} onClick={() => toggleAnexo(anx.key)}>
                        <input type="checkbox" checked={form.anexos.includes(anx.key)} readOnly style={{ width: 16, height: 16 }} />
                        <div>
                          <div style={{ color: form.anexos.includes(anx.key) ? C.darkBlue : C.gray, fontWeight: 700 }}>{anx.label}</div>
                          <div style={{ fontSize: 11, color: C.gray, fontWeight: 400 }}>{anx.trigger}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!form.pim_es_primer_respondiente && (
                    <div style={{ marginTop: 16, padding: 14, backgroundColor: '#fff8e1', border: '1px solid #ffc10755', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#f57f17', marginBottom: 4 }}>
                        Nota: PIM recibió entrega-recepción
                      </div>
                      <div style={{ fontSize: 12, color: '#795548' }}>
                        El primer respondiente llenará el IPH completo. El PIM solo firma el Anexo F (Entrega-recepción del lugar) y en oficina genera el acta de levantamiento cadavérico e informes de investigación en campo, según corresponda.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mensaje */}
              {mensaje && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  backgroundColor: mensaje.tipo === 'ok' ? '#e8f5e9' : '#ffebee',
                  color: mensaje.tipo === 'ok' ? '#1b5e20' : '#b71c1c',
                  fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
                }}>
                  {mensaje.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  {mensaje.texto}
                </div>
              )}
            </div>

            <div style={s.footer}>
              {seccionActiva > 1 && (
                <button onClick={() => setSeccionActiva(p => p - 1)} style={{ backgroundColor: 'transparent', color: C.gray, border: `1px solid ${C.lightGray}`, borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: 'pointer' }}>
                  ← Anterior
                </button>
              )}
              <div style={{ flex: 1 }} />
              {seccionActiva < 5 ? (
                <button onClick={() => setSeccionActiva(p => p + 1)} style={s.btn(C.darkBlue, C.white)}>
                  Siguiente →
                </button>
              ) : (
                <button style={{ ...s.btn(C.gold, C.white), opacity: saving ? 0.6 : 1 }} onClick={handleSubmit} disabled={saving}>
                  <Send size={15} /> {saving ? 'Guardando...' : 'Registrar IPH'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL PANEL */}
      {showDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,26,77,0.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }} onClick={() => setShowDetail(null)}>
          <div style={{ backgroundColor: C.white, width: '100%', maxWidth: 500, height: '100%', overflowY: 'auto', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>

            <div style={{ backgroundColor: C.darkBlue, color: C.white, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>IPH — {showDetail.nombre}</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{showDetail.corporacion} {showDetail.grado ? `· ${showDetail.grado}` : ''}</div>
              </div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowDetail(null)} />
            </div>

            {/* Hora Dorada badge */}
            <div style={{ padding: 16, borderBottom: `1px solid ${C.lightGray}`, textAlign: 'center' }}>
              <HoraDoradaBadge horaDorada={calcularHoraDorada(showDetail.hora_conocimiento_hecho)} />
            </div>

            {/* Detail rows */}
            {[
              { label: 'Carpeta Inv.', value: showDetail.carpeta_investigacion },
              { label: 'Folio 911', value: showDetail.registros_911?.folio_911 || '(Independiente)' },
              { label: 'Incidencia', value: showDetail.registros_911?.catalogo_incidencias?.nombre },
              { label: 'Ubicación', value: showDetail.registros_911?.ubicacion_texto },
              { label: 'Comisión', value: showDetail.comision_agente },
              { label: 'Unidad', value: showDetail.unidad },
              { label: 'Hora arribo', value: formatTime(showDetail.hora_arribo) },
              { label: 'Tiempo respuesta', value: showDetail.tiempo_respuesta_min ? `${showDetail.tiempo_respuesta_min} min` : null },
              { label: 'Verificado en sitio', value: showDetail.verificacion_confirmada ? '✅ Sí' : '❌ No' },
              { label: 'Acordonamiento', value: showDetail.acordonamiento_realizado ? '✅ Realizado' : '❌ No realizado' },
              { label: 'Víctimas', value: showDetail.victimas_count > 0 ? `${showDetail.victimas_count} identificada(s)` : 'Ninguna' },
              { label: 'Detenidos', value: showDetail.personas_detenidas ? '✅ Sí' : 'No' },
              { label: 'Flagrancia', value: showDetail.flagrancia ? '✅ Sí' : null },
              { label: 'Uso de fuerza', value: showDetail.uso_fuerza ? '⚠️ Sí' : null },
              { label: 'Nivel contacto', value: showDetail.nivel_contacto ? NIVEL_CONTACTO_CONFIG[showDetail.nivel_contacto]?.label : null },
              { label: 'Huellas violencia', value: showDetail.huellas_violencia ? '⚠️ Sí' : null },
              { label: 'Región', value: showDetail.region },
            ].filter(r => r.value).map((row, i) => (
              <div key={i} style={{ padding: '10px 20px', borderBottom: `1px solid ${C.lightGray}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.gray, textTransform: 'uppercase', minWidth: 120 }}>{row.label}</span>
                <span style={{ fontSize: 14, color: C.darkBlue, textAlign: 'right', flex: 1, wordBreak: 'break-word' }}>{row.value}</span>
              </div>
            ))}

            {/* Hallazgos */}
            {showDetail.descripcion_hallazgo && (
              <div style={{ padding: '14px 20px', borderTop: `2px solid ${C.lightGray}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', marginBottom: 8 }}>Hallazgos Iniciales</div>
                <div style={{ fontSize: 14, color: C.darkBlue, lineHeight: 1.6, backgroundColor: C.bg, padding: 12, borderRadius: 8 }}>
                  {showDetail.descripcion_hallazgo}
                </div>
              </div>
            )}

            {showDetail.uso_fuerza && showDetail.descripcion_uso_fuerza && (
              <div style={{ padding: '14px 20px', borderTop: `2px solid ${C.lightGray}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.red, textTransform: 'uppercase', marginBottom: 8 }}>Descripción del Uso de la Fuerza</div>
                <div style={{ fontSize: 14, color: C.darkBlue, lineHeight: 1.6, backgroundColor: '#ffebee', padding: 12, borderRadius: 8 }}>
                  {showDetail.descripcion_uso_fuerza}
                </div>
              </div>
            )}

            {showDetail.apoyo_solicitado && showDetail.apoyo_solicitado.length > 0 && (
              <div style={{ padding: '14px 20px', borderTop: `2px solid ${C.lightGray}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', marginBottom: 8 }}>Apoyo Solicitado</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {showDetail.apoyo_solicitado.map((a, i) => (
                    <span key={i} style={s.badge(C.darkBlue + '15', C.darkBlue)}>{a}</span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
