// src/pages/Registro911.jsx
// Tab 1 — Registro 911 (Crime Report Intake)
// Sistema Ministerial — FGE Guerrero — Módulo 2
// Fundamento: Modelo Nacional 1.1(a)(ii) — Recepción de denuncias
// v2 — Mejoras: Detonaciones arma de fuego, Google Maps, Municipios Guerrero,
//       Formato 24h, Sección fotografías/documentos

import { useState } from 'react';
import {
  Phone, FileText, MapPin, Clock, AlertTriangle, CheckCircle2,
  Plus, Search, Filter, ChevronDown, ChevronUp, X, Send,
  Radio, Eye, Shield, RefreshCw, Hash, ExternalLink, Camera,
  Upload, Image, Trash2
} from 'lucide-react';
import { useRegistros911 } from '../hooks/useRegistros911';
import { supabase } from '../supabaseClient';

// ═══════════════════════════════════════════════
// PALETTE
// ═══════════════════════════════════════════════
const COLORS = {
  darkBlue: '#001a4d',
  gold: '#b69054',
  lightGold: '#f5ede0',
  white: '#ffffff',
  bg: '#f4f6fb',
  gray: '#666666',
  lightGray: '#e8ecf1',
  green: '#28a745',
  yellow: '#ffc107',
  red: '#dc3545',
  orange: '#fd7e14',
};

// ═══════════════════════════════════════════════
// CATÁLOGO DE MUNICIPIOS DE GUERRERO (INEGI Clave 12)
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
// ESTILOS COMUNES
// ═══════════════════════════════════════════════
const styles = {
  container: {
    padding: '24px',
    fontFamily: 'Segoe UI, Arial, sans-serif',
    backgroundColor: COLORS.bg,
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: COLORS.darkBlue,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: COLORS.gray,
    margin: '4px 0 0 0',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '14px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: '10px',
    padding: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: '22px',
    fontWeight: '700',
    color: COLORS.darkBlue,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '12px',
    color: COLORS.gray,
    marginTop: '2px',
  },
  btnPrimary: {
    backgroundColor: COLORS.darkBlue,
    color: COLORS.white,
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  btnGold: {
    backgroundColor: COLORS.gold,
    color: COLORS.white,
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  btnOutline: {
    backgroundColor: 'transparent',
    color: COLORS.darkBlue,
    border: `2px solid ${COLORS.darkBlue}`,
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  btnCancel: {
    backgroundColor: 'transparent',
    color: COLORS.gray,
    border: `1px solid ${COLORS.lightGray}`,
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  formOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,26,77,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: '40px',
    zIndex: 1000,
    overflowY: 'auto',
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: '14px',
    width: '100%',
    maxWidth: '700px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    marginBottom: '40px',
  },
  formHeader: {
    backgroundColor: COLORS.darkBlue,
    color: COLORS.white,
    padding: '18px 24px',
    borderRadius: '14px 14px 0 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formBody: {
    padding: '24px',
  },
  formSection: {
    marginBottom: '20px',
  },
  formSectionTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: COLORS.gold,
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
  },
  formGridFull: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '14px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: COLORS.darkBlue,
  },
  labelRequired: {
    color: COLORS.red,
    marginLeft: '2px',
  },
  input: {
    padding: '10px 12px',
    border: `1px solid ${COLORS.lightGray}`,
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  select: {
    padding: '10px 12px',
    border: `1px solid ${COLORS.lightGray}`,
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: COLORS.white,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  textarea: {
    padding: '10px 12px',
    border: `1px solid ${COLORS.lightGray}`,
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '80px',
  },
  formFooter: {
    padding: '16px 24px',
    borderTop: `1px solid ${COLORS.lightGray}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  tableContainer: {
    backgroundColor: COLORS.white,
    borderRadius: '12px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  tableHeader: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1px solid ${COLORS.lightGray}`,
    flexWrap: 'wrap',
    gap: '10px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: COLORS.bg,
    borderRadius: '8px',
    padding: '8px 14px',
    flex: '1',
    maxWidth: '350px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    backgroundColor: 'transparent',
    flex: '1',
    fontFamily: 'inherit',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '700',
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: `2px solid ${COLORS.lightGray}`,
    backgroundColor: COLORS.bg,
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 16px',
    fontSize: '13px',
    borderBottom: `1px solid ${COLORS.lightGray}`,
    color: COLORS.darkBlue,
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: COLORS.gray,
  },
  detailOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,26,77,0.5)',
    display: 'flex',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  detailPanel: {
    backgroundColor: COLORS.white,
    width: '100%',
    maxWidth: '480px',
    height: '100%',
    overflowY: 'auto',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
  },
  detailHeader: {
    backgroundColor: COLORS.darkBlue,
    color: COLORS.white,
    padding: '18px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRow: {
    padding: '10px 20px',
    borderBottom: `1px solid ${COLORS.lightGray}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  detailLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
    minWidth: '120px',
  },
  detailValue: {
    fontSize: '14px',
    color: COLORS.darkBlue,
    textAlign: 'right',
    flex: 1,
    wordBreak: 'break-word',
  },
};

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
const ESTATUS_CONFIG = {
  recibido:      { label: 'Recibido',      bg: '#e3f2fd', color: '#1565c0' },
  verificado:    { label: 'Verificado',    bg: '#e8f5e9', color: '#2e7d32' },
  falso_reporte: { label: 'Falso reporte', bg: '#fce4ec', color: '#c62828' },
  en_atencion:   { label: 'En atención',   bg: '#fff3e0', color: '#e65100' },
  canalizado_mp: { label: 'Canalizado MP', bg: '#f3e5f5', color: '#6a1b9a' },
  cerrado:       { label: 'Cerrado',       bg: '#eceff1', color: '#546e7a' },
};

const FUENTE_CONFIG = {
  '911':              { label: '911',              icon: Phone },
  '089':              { label: '089',              icon: Shield },
  'denuncia_directa': { label: 'Denuncia directa', icon: FileText },
  'flagrancia':       { label: 'Flagrancia',       icon: AlertTriangle },
  'hallazgo':         { label: 'Hallazgo',         icon: Eye },
  'redes_sociales':   { label: 'Redes sociales',   icon: Radio },
  'patrullaje':       { label: 'Patrullaje',       icon: Shield },
};

const CALIF_FUENTE = {
  A: 'A — Totalmente fiable',
  B: 'B — Normalmente fiable',
  C: 'C — Normalmente no fiable',
  D: 'D — No evaluable',
};

const CALIF_INFO = {
  '1': '1 — Sin duda de exactitud',
  '2': '2 — Conocida por la fuente, no verificada',
  '3': '3 — No conocida por la fuente, corroborada',
  '4': '4 — No evaluable',
};

// Horas 00–23 para selector de formato 24h obligatorio
const HORAS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTOS_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime24(timeStr) {
  if (!timeStr) return '—';
  return timeStr.substring(0, 5);
}

function buildGoogleMapsUrl(lat, lng) {
  if (!lat || !lng) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// ═══════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════
export default function Registro911({ perfil }) {
  const {
    registros, catalogoIncidencias, loading, error, stats,
    crearRegistro, actualizarEstatus, refetch,
  } = useRegistros911(perfil);

  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstatus, setFilterEstatus] = useState('todos');
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [archivos, setArchivos] = useState([]);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  const nowHour = String(new Date().getHours()).padStart(2, '0');
  const nowMin = String(new Date().getMinutes()).padStart(2, '0');

  const emptyForm = {
    folio_911: '',
    fecha_reporte: new Date().toISOString().split('T')[0],
    hora_reporte_hh: nowHour,
    hora_reporte_mm: nowMin,
    fuente: '911',
    incidencia_tipo: '',
    incidencia_otro: '',
    ubicacion_texto: '',
    coordenadas_lat: '',
    coordenadas_lng: '',
    municipio: '',
    entidad_federativa: 'Guerrero',
    sintesis: '',
    estatus: 'recibido',
    calificacion_fuente: '',
    calificacion_info: '',
  };
  const [form, setForm] = useState(emptyForm);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // ── Manejo de archivos (fotos/documentos) ──
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const maxSize = 5 * 1024 * 1024; // 5MB por archivo (límite Supabase free)
    const formatosPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4'];

    for (const file of files) {
      if (file.size > maxSize) {
        setMensaje({ tipo: 'error', texto: `"${file.name}" excede el límite de 5MB` });
        return;
      }
      if (!formatosPermitidos.includes(file.type)) {
        setMensaje({ tipo: 'error', texto: `"${file.name}" — formato no soportado. Use JPG, PNG, PDF o MP4` });
        return;
      }
    }

    setArchivos(prev => [...prev, ...files.map(f => ({
      file: f,
      nombre: f.name,
      tipo: f.type,
      tamano: f.size,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    }))]);
  };

  const removeArchivo = (index) => {
    setArchivos(prev => {
      const updated = [...prev];
      if (updated[index].preview) URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const subirArchivos = async (registroId) => {
    const urls = [];
    for (const arch of archivos) {
      const ext = arch.nombre.split('.').pop();
      const path = `911/${registroId}/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('archivos-911')
        .upload(path, arch.file);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('archivos-911').getPublicUrl(path);
        urls.push({ nombre: arch.nombre, tipo: arch.tipo, tamano: arch.tamano, url: urlData.publicUrl });
      }
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!form.folio_911.trim()) return setMensaje({ tipo: 'error', texto: 'El folio 911 es obligatorio' });
    if (!form.incidencia_tipo) return setMensaje({ tipo: 'error', texto: 'Selecciona el tipo de incidencia' });
    if (!form.ubicacion_texto.trim()) return setMensaje({ tipo: 'error', texto: 'La ubicación es obligatoria' });
    if (!form.sintesis.trim()) return setMensaje({ tipo: 'error', texto: 'La síntesis del reporte es obligatoria' });
    if (!form.municipio) return setMensaje({ tipo: 'error', texto: 'Selecciona el municipio' });

    setSaving(true);
    setMensaje(null);

    const horaCompleta = `${form.hora_reporte_hh}:${form.hora_reporte_mm}`;

    const dataToSave = {
      folio_911: form.folio_911,
      fecha_reporte: form.fecha_reporte,
      hora_reporte: horaCompleta,
      fuente: form.fuente,
      incidencia_tipo: form.incidencia_tipo,
      incidencia_otro: form.incidencia_tipo === 'otro' ? form.incidencia_otro : null,
      ubicacion_texto: form.ubicacion_texto,
      coordenadas_lat: form.coordenadas_lat ? parseFloat(form.coordenadas_lat) : null,
      coordenadas_lng: form.coordenadas_lng ? parseFloat(form.coordenadas_lng) : null,
      municipio: form.municipio,
      entidad_federativa: form.entidad_federativa,
      sintesis: form.sintesis,
      estatus: form.estatus,
      calificacion_fuente: form.calificacion_fuente || null,
      calificacion_info: form.calificacion_info || null,
    };

    const result = await crearRegistro(dataToSave);
    setSaving(false);

    if (result.success) {
      // Subir archivos si hay
      if (archivos.length > 0 && result.data?.id) {
        setSubiendoArchivo(true);
        await subirArchivos(result.data.id);
        setSubiendoArchivo(false);
      }
      setMensaje({ tipo: 'ok', texto: 'Registro 911 creado correctamente' });
      setForm(emptyForm);
      setArchivos([]);
      setTimeout(() => {
        setShowForm(false);
        setMensaje(null);
      }, 1500);
    } else {
      setMensaje({ tipo: 'error', texto: result.error || 'Error al guardar' });
    }
  };

  // Filtrado
  const registrosFiltrados = registros.filter(r => {
    const matchSearch = searchTerm === '' ||
      r.folio_911?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ubicacion_texto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.sintesis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.municipio?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstatus = filterEstatus === 'todos' || r.estatus === filterEstatus;
    return matchSearch && matchEstatus;
  });

  // Agrupación por categoría
  const incidenciasPorCategoria = catalogoIncidencias.reduce((acc, inc) => {
    if (!acc[inc.categoria]) acc[inc.categoria] = [];
    acc[inc.categoria].push(inc);
    return acc;
  }, {});

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  return (
    <div style={styles.container}>

      {/* ── HEADER ── */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            <Phone size={22} color={COLORS.gold} />
            Registro 911 — Reportes
          </h2>
          <p style={styles.subtitle}>
            Módulo 2 · Tab 1 · Captura de reportes ciudadanos
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button style={styles.btnOutline} onClick={refetch}>
            <RefreshCw size={15} /> Actualizar
          </button>
          <button style={styles.btnPrimary} onClick={() => { setForm(emptyForm); setArchivos([]); setShowForm(true); setMensaje(null); }}>
            <Plus size={16} /> Nuevo Reporte
          </button>
        </div>
      </div>

      {/* ── STATS CARDS ── */}
      <div style={styles.statsRow}>
        {[
          { label: 'Hoy', value: stats.hoy, color: COLORS.gold, icon: Clock },
          { label: 'Recibidos', value: stats.recibidos, color: '#1565c0', icon: Radio },
          { label: 'Verificados', value: stats.verificados, color: COLORS.green, icon: CheckCircle2 },
          { label: 'En atención', value: stats.en_atencion, color: COLORS.orange, icon: AlertTriangle },
          { label: 'Total', value: stats.total, color: COLORS.darkBlue, icon: FileText },
        ].map((s, i) => (
          <div key={i} style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: s.color + '18' }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div>
              <div style={styles.statValue}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── TABLE ── */}
      <div style={styles.tableContainer}>
        <div style={styles.tableHeader}>
          <div style={styles.searchBox}>
            <Search size={16} color={COLORS.gray} />
            <input
              type="text"
              placeholder="Buscar por folio, ubicación, síntesis..."
              style={styles.searchInput}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <X size={14} color={COLORS.gray} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Filter size={14} color={COLORS.gray} />
            <select
              style={{ ...styles.select, padding: '6px 10px', fontSize: '13px' }}
              value={filterEstatus}
              onChange={e => setFilterEstatus(e.target.value)}
            >
              <option value="todos">Todos los estatus</option>
              {Object.entries(ESTATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={styles.emptyState}>
            <RefreshCw size={32} color={COLORS.gray} style={{ animation: 'spin 1s linear infinite' }} />
            <p>Cargando reportes...</p>
          </div>
        ) : error ? (
          <div style={styles.emptyState}>
            <AlertTriangle size={32} color={COLORS.red} />
            <p style={{ color: COLORS.red }}>{error}</p>
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div style={styles.emptyState}>
            <Phone size={40} color={COLORS.lightGray} />
            <p style={{ fontSize: '16px', fontWeight: '600', marginTop: '12px' }}>
              {searchTerm || filterEstatus !== 'todos' ? 'Sin resultados para los filtros aplicados' : 'No hay reportes registrados'}
            </p>
            <p style={{ fontSize: '13px' }}>
              {searchTerm || filterEstatus !== 'todos' ? 'Intenta con otros criterios de búsqueda' : 'Haz clic en "Nuevo Reporte" para comenzar'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Folio</th>
                  <th style={styles.th}>Fecha / Hora</th>
                  <th style={styles.th}>Fuente</th>
                  <th style={styles.th}>Incidencia</th>
                  <th style={styles.th}>Ubicación</th>
                  <th style={styles.th}>Estatus</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((r, idx) => {
                  const estatusCfg = ESTATUS_CONFIG[r.estatus] || ESTATUS_CONFIG.recibido;
                  const fuenteCfg = FUENTE_CONFIG[r.fuente] || {};
                  return (
                    <tr
                      key={r.id}
                      style={{
                        backgroundColor: idx % 2 === 0 ? COLORS.white : COLORS.bg,
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = COLORS.lightGold}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? COLORS.white : COLORS.bg}
                      onClick={() => setShowDetail(r)}
                    >
                      <td style={{ ...styles.td, fontWeight: '700', fontFamily: 'monospace', fontSize: '13px' }}>
                        {r.folio_911}
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontSize: '13px' }}>{formatDate(r.fecha_reporte)}</div>
                        <div style={{ fontSize: '11px', color: COLORS.gray }}>{formatTime24(r.hora_reporte)} hrs</div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {fuenteCfg.icon && <fuenteCfg.icon size={14} color={COLORS.gold} />}
                          <span style={{ fontSize: '12px' }}>{fuenteCfg.label || r.fuente}</span>
                        </div>
                      </td>
                      <td style={{ ...styles.td, maxWidth: '180px' }}>
                        <div style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.catalogo_incidencias?.nombre || r.incidencia_tipo}
                        </div>
                        {r.catalogo_incidencias?.categoria === 'alto_impacto' && (
                          <span style={{ ...styles.badge, backgroundColor: '#fce4ec', color: '#c62828', fontSize: '10px', marginTop: '2px' }}>
                            Alto impacto
                          </span>
                        )}
                      </td>
                      <td style={{ ...styles.td, maxWidth: '200px' }}>
                        <div style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.ubicacion_texto}
                        </div>
                        {r.municipio && (
                          <div style={{ fontSize: '11px', color: COLORS.gray }}>{r.municipio}, Guerrero</div>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: estatusCfg.bg,
                          color: estatusCfg.color,
                        }}>
                          {estatusCfg.label}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          style={{ ...styles.btnOutline, padding: '4px 10px', fontSize: '11px' }}
                          onClick={e => { e.stopPropagation(); setShowDetail(r); }}
                        >
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

      {/* ══════════════════════════════════════════
           FORM MODAL — NUEVO REPORTE
         ══════════════════════════════════════════ */}
      {showForm && (
        <div style={styles.formOverlay} onClick={() => setShowForm(false)}>
          <div style={styles.formCard} onClick={e => e.stopPropagation()}>

            <div style={styles.formHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Phone size={20} />
                <span style={{ fontSize: '16px', fontWeight: '700' }}>Nuevo Reporte 911</span>
              </div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowForm(false)} />
            </div>

            <div style={styles.formBody}>

              {/* ── Identificación ── */}
              <div style={styles.formSection}>
                <div style={styles.formSectionTitle}>
                  <Hash size={15} /> Identificación del Reporte
                </div>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Folio 911 <span style={styles.labelRequired}>*</span>
                    </label>
                    <input
                      style={styles.input}
                      type="text"
                      placeholder="Ej: ACA-2026-001234"
                      value={form.folio_911}
                      onChange={e => handleChange('folio_911', e.target.value)}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Fuente del conocimiento <span style={styles.labelRequired}>*</span></label>
                    <select
                      style={styles.select}
                      value={form.fuente}
                      onChange={e => handleChange('fuente', e.target.value)}
                    >
                      {Object.entries(FUENTE_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Fecha del reporte <span style={styles.labelRequired}>*</span></label>
                    <input
                      style={styles.input}
                      type="date"
                      value={form.fecha_reporte}
                      onChange={e => handleChange('fecha_reporte', e.target.value)}
                    />
                  </div>
                  {/* ── HORA EN FORMATO 24H CON SELECTORES ── */}
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Hora del reporte (24h) <span style={styles.labelRequired}>*</span></label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <select
                        style={{ ...styles.select, flex: 1, textAlign: 'center' }}
                        value={form.hora_reporte_hh}
                        onChange={e => handleChange('hora_reporte_hh', e.target.value)}
                      >
                        {HORAS_24.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: COLORS.darkBlue }}>:</span>
                      <select
                        style={{ ...styles.select, flex: 1, textAlign: 'center' }}
                        value={form.hora_reporte_mm}
                        onChange={e => handleChange('hora_reporte_mm', e.target.value)}
                      >
                        {MINUTOS_60.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <span style={{ fontSize: '11px', color: COLORS.gray, marginLeft: '4px' }}>hrs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Clasificación ── */}
              <div style={styles.formSection}>
                <div style={styles.formSectionTitle}>
                  <AlertTriangle size={15} /> Clasificación — Tipo de Incidencia
                </div>
                <div style={styles.formGridFull}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Tipo de incidencia <span style={styles.labelRequired}>*</span>
                    </label>
                    <select
                      style={styles.select}
                      value={form.incidencia_tipo}
                      onChange={e => handleChange('incidencia_tipo', e.target.value)}
                    >
                      <option value="">— Seleccionar tipo de incidencia —</option>
                      {Object.entries(incidenciasPorCategoria).map(([cat, items]) => (
                        <optgroup key={cat} label={cat === 'alto_impacto' ? '🔴 ALTO IMPACTO' : cat === 'especial' ? '🟡 ESPECIALES' : '🔵 COMUNES'}>
                          {items.map(inc => (
                            <option key={inc.clave} value={inc.clave}>{inc.nombre}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  {form.incidencia_tipo === 'otro' && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Especificar otro tipo</label>
                      <input
                        style={styles.input}
                        type="text"
                        placeholder="Describe el tipo de incidencia"
                        value={form.incidencia_otro}
                        onChange={e => handleChange('incidencia_otro', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Ubicación ── */}
              <div style={styles.formSection}>
                <div style={styles.formSectionTitle}>
                  <MapPin size={15} /> Ubicación del Hecho
                </div>
                <div style={styles.formGridFull}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Dirección / Descripción del lugar <span style={styles.labelRequired}>*</span></label>
                    <input
                      style={styles.input}
                      type="text"
                      placeholder="Ej: Av. Costera Miguel Alemán #123, col. Centro"
                      value={form.ubicacion_texto}
                      onChange={e => handleChange('ubicacion_texto', e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ ...styles.formGrid, marginTop: '10px' }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Municipio <span style={styles.labelRequired}>*</span></label>
                    <select
                      style={styles.select}
                      value={form.municipio}
                      onChange={e => handleChange('municipio', e.target.value)}
                    >
                      <option value="">— Seleccionar municipio —</option>
                      {MUNICIPIOS_GUERRERO.map(m => (
                        <option key={m.clave} value={m.nombre}>{m.clave} — {m.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Entidad Federativa</label>
                    <input
                      style={{ ...styles.input, backgroundColor: '#f0f0f0' }}
                      type="text"
                      value={form.entidad_federativa}
                      readOnly
                    />
                  </div>
                </div>
                <div style={{ ...styles.formGrid, marginTop: '10px' }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Latitud</label>
                    <input
                      style={styles.input}
                      type="number"
                      step="0.0000001"
                      placeholder="Ej: 16.8531"
                      value={form.coordenadas_lat}
                      onChange={e => handleChange('coordenadas_lat', e.target.value)}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Longitud</label>
                    <input
                      style={styles.input}
                      type="number"
                      step="0.0000001"
                      placeholder="Ej: -99.8237"
                      value={form.coordenadas_lng}
                      onChange={e => handleChange('coordenadas_lng', e.target.value)}
                    />
                  </div>
                </div>
                {/* Link Google Maps cuando hay coordenadas */}
                {form.coordenadas_lat && form.coordenadas_lng && (
                  <div style={{ marginTop: '8px' }}>
                    <a
                      href={buildGoogleMapsUrl(form.coordenadas_lat, form.coordenadas_lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '12px', color: COLORS.gold, display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                    >
                      <ExternalLink size={13} /> Ver ubicación en Google Maps
                    </a>
                  </div>
                )}
              </div>

              {/* ── Síntesis ── */}
              <div style={styles.formSection}>
                <div style={styles.formSectionTitle}>
                  <FileText size={15} /> Síntesis del Reporte
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Relato del ciudadano <span style={styles.labelRequired}>*</span>
                  </label>
                  <textarea
                    style={styles.textarea}
                    placeholder="Describe los hechos tal como los reporta el ciudadano..."
                    value={form.sintesis}
                    onChange={e => handleChange('sintesis', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>

              {/* ── Fotografías y Documentos ── */}
              <div style={styles.formSection}>
                <div style={styles.formSectionTitle}>
                  <Camera size={15} /> Fotografías y Documentos
                </div>
                <p style={{ fontSize: '11px', color: COLORS.gray, margin: '0 0 10px 0' }}>
                  Formatos: JPG, PNG, PDF, MP4 · Máximo 5MB por archivo
                </p>
                <div style={{
                  border: `2px dashed ${COLORS.lightGray}`,
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: COLORS.bg,
                  transition: 'border-color 0.2s',
                }}
                  onClick={() => document.getElementById('file-input-911').click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = COLORS.gold; }}
                  onDragLeave={e => { e.currentTarget.style.borderColor = COLORS.lightGray; }}
                  onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = COLORS.lightGray; handleFileSelect({ target: { files: e.dataTransfer.files } }); }}
                >
                  <Upload size={28} color={COLORS.gray} />
                  <p style={{ fontSize: '13px', color: COLORS.gray, margin: '8px 0 0 0' }}>
                    Arrastra archivos aquí o haz clic para seleccionar
                  </p>
                  <input
                    id="file-input-911"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                </div>

                {/* Lista de archivos seleccionados */}
                {archivos.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {archivos.map((arch, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 12px', backgroundColor: COLORS.bg, borderRadius: '8px',
                        border: `1px solid ${COLORS.lightGray}`,
                      }}>
                        {arch.preview ? (
                          <img src={arch.preview} alt="" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: COLORS.lightGray, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={18} color={COLORS.gray} />
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: COLORS.darkBlue }}>{arch.nombre}</div>
                          <div style={{ fontSize: '11px', color: COLORS.gray }}>
                            {(arch.tamano / 1024).toFixed(0)} KB · {arch.tipo.split('/')[1]?.toUpperCase()}
                          </div>
                        </div>
                        <button
                          onClick={() => removeArchivo(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={16} color={COLORS.red} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Evaluación 4x4 ── */}
              <div style={styles.formSection}>
                <div style={styles.formSectionTitle}>
                  <Shield size={15} /> Evaluación de la Información (Sistema 4x4)
                </div>
                <p style={{ fontSize: '12px', color: COLORS.gray, margin: '0 0 10px 0' }}>
                  Opcional — Califica la confiabilidad de la fuente y la exactitud de la información.
                </p>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Calificación de fuente</label>
                    <select
                      style={styles.select}
                      value={form.calificacion_fuente}
                      onChange={e => handleChange('calificacion_fuente', e.target.value)}
                    >
                      <option value="">— Sin calificar —</option>
                      {Object.entries(CALIF_FUENTE).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Calificación de información</label>
                    <select
                      style={styles.select}
                      value={form.calificacion_info}
                      onChange={e => handleChange('calificacion_info', e.target.value)}
                    >
                      <option value="">— Sin calificar —</option>
                      {Object.entries(CALIF_INFO).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Mensaje */}
              {mensaje && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: mensaje.tipo === 'ok' ? '#e8f5e9' : '#fce4ec',
                  color: mensaje.tipo === 'ok' ? '#2e7d32' : '#c62828',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '8px',
                }}>
                  {mensaje.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  {mensaje.texto}
                </div>
              )}
            </div>

            <div style={styles.formFooter}>
              <button style={styles.btnCancel} onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button
                style={{ ...styles.btnGold, opacity: saving || subiendoArchivo ? 0.6 : 1 }}
                onClick={handleSubmit}
                disabled={saving || subiendoArchivo}
              >
                <Send size={15} />
                {subiendoArchivo ? 'Subiendo archivos...' : saving ? 'Guardando...' : 'Registrar Reporte'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
           DETAIL PANEL
         ══════════════════════════════════════════ */}
      {showDetail && (
        <div style={styles.detailOverlay} onClick={() => setShowDetail(null)}>
          <div style={styles.detailPanel} onClick={e => e.stopPropagation()}>

            <div style={styles.detailHeader}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700' }}>
                  Folio: {showDetail.folio_911}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
                  Detalle del reporte
                </div>
              </div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowDetail(null)} />
            </div>

            {/* Estatus badge */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${COLORS.lightGray}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                ...styles.badge,
                backgroundColor: (ESTATUS_CONFIG[showDetail.estatus] || {}).bg,
                color: (ESTATUS_CONFIG[showDetail.estatus] || {}).color,
                fontSize: '13px',
                padding: '6px 14px',
              }}>
                {(ESTATUS_CONFIG[showDetail.estatus] || {}).label}
              </span>
              {showDetail.catalogo_incidencias?.categoria === 'alto_impacto' && (
                <span style={{ ...styles.badge, backgroundColor: '#fce4ec', color: '#c62828' }}>
                  Alto impacto
                </span>
              )}
            </div>

            {/* Detail rows */}
            {[
              { label: 'Folio 911', value: showDetail.folio_911 },
              { label: 'Fecha', value: formatDate(showDetail.fecha_reporte) },
              { label: 'Hora', value: showDetail.hora_reporte ? formatTime24(showDetail.hora_reporte) + ' hrs' : null },
              { label: 'Fuente', value: (FUENTE_CONFIG[showDetail.fuente] || {}).label || showDetail.fuente },
              { label: 'Incidencia', value: showDetail.catalogo_incidencias?.nombre || showDetail.incidencia_tipo },
              { label: 'Ubicación', value: showDetail.ubicacion_texto },
              { label: 'Municipio', value: showDetail.municipio },
              { label: 'Estado', value: showDetail.entidad_federativa || 'Guerrero' },
              { label: 'Región', value: showDetail.region },
              { label: 'Zona', value: showDetail.zona },
              { label: 'Calif. Fuente', value: showDetail.calificacion_fuente ? CALIF_FUENTE[showDetail.calificacion_fuente] : null },
              { label: 'Calif. Info', value: showDetail.calificacion_info ? CALIF_INFO[showDetail.calificacion_info] : null },
            ].filter(row => row.value).map((row, i) => (
              <div key={i} style={styles.detailRow}>
                <span style={styles.detailLabel}>{row.label}</span>
                <span style={styles.detailValue}>{row.value}</span>
              </div>
            ))}

            {/* ── Coordenadas con link a Google Maps ── */}
            {showDetail.coordenadas_lat && showDetail.coordenadas_lng && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Coordenadas</span>
                <div style={{ textAlign: 'right', flex: 1 }}>
                  <div style={{ fontSize: '14px', color: COLORS.darkBlue }}>
                    {showDetail.coordenadas_lat}, {showDetail.coordenadas_lng}
                  </div>
                  <a
                    href={buildGoogleMapsUrl(showDetail.coordenadas_lat, showDetail.coordenadas_lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '4px',
                      padding: '4px 10px',
                      backgroundColor: COLORS.lightGold,
                      color: COLORS.darkBlue,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={12} /> Abrir en Google Maps
                  </a>
                </div>
              </div>
            )}

            {/* Síntesis */}
            <div style={{ padding: '14px 20px', borderTop: `2px solid ${COLORS.lightGray}` }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: COLORS.gray, textTransform: 'uppercase', marginBottom: '8px' }}>
                Síntesis del Reporte
              </div>
              <div style={{ fontSize: '14px', color: COLORS.darkBlue, lineHeight: '1.6', backgroundColor: COLORS.bg, padding: '12px', borderRadius: '8px' }}>
                {showDetail.sintesis}
              </div>
            </div>

            {/* Cambiar estatus */}
            <div style={{ padding: '14px 20px', borderTop: `2px solid ${COLORS.lightGray}` }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: COLORS.gray, textTransform: 'uppercase', marginBottom: '8px' }}>
                Cambiar Estatus
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.entries(ESTATUS_CONFIG)
                  .filter(([key]) => key !== showDetail.estatus)
                  .map(([key, cfg]) => (
                    <button
                      key={key}
                      style={{
                        ...styles.badge,
                        backgroundColor: cfg.bg,
                        color: cfg.color,
                        border: `1px solid ${cfg.color}30`,
                        cursor: 'pointer',
                        padding: '6px 12px',
                        fontSize: '12px',
                      }}
                      onClick={async () => {
                        await actualizarEstatus(showDetail.id, key);
                        setShowDetail(prev => ({ ...prev, estatus: key }));
                      }}
                    >
                      {cfg.label}
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
