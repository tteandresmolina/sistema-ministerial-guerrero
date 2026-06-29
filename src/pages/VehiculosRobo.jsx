// src/pages/VehiculosRobo.jsx
// Módulo: Consulta de Vehículos con Reporte de Robo
// Búsqueda por NIV (primeros 3 + últimos 5), motor, placas
// Registro + Fotografías + Aseguramiento

import { useState } from 'react';
import {
  Search, Plus, AlertTriangle, CheckCircle2, X, Send, RefreshCw,
  Eye, FileText, ChevronLeft, ChevronRight, Camera, User, Truck,
  Shield, MapPin, Target,
} from 'lucide-react';
import { useVehiculosRobo } from '../hooks/useVehiculosRobo';
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

const MUNICIPIOS_GUERRERO = [
  'Acapulco de Juárez','Ahuacuotzingo','Ajuchitlán del Progreso','Alcozauca de Guerrero','Alpoyeca','Apaxtla','Arcelia','Atenango del Río',
  'Atlamajalcingo del Monte','Atlixtac','Atoyac de Álvarez','Ayutla de los Libres','Azoyú','Benito Juárez','Buenavista de Cuéllar',
  'Coahuayutla','Cocula','Copala','Copalillo','Copanatoyac','Coyuca de Benítez','Coyuca de Catalán','Cuajinicuilapa','Cualác',
  'Cuautepec','Cuetzala del Progreso','Cutzamala de Pinzón','Chilapa de Álvarez','Chilpancingo de los Bravo','Florencio Villarreal',
  'Gral. Canuto A. Neri','Gral. Heliodoro Castillo','Huamuxtitlán','Huitzuco de los Figueroa','Iguala de la Independencia','Igualapa',
  'Ixcateopan de Cuauhtémoc','Zihuatanejo de Azueta','Juan R. Escudero','Leonardo Bravo','Malinaltepec','Mártir de Cuilapan',
  'Metlatónoc','Mochitlán','Olinalá','Ometepec','Pedro Ascencio Alquisiras','Petatlán','Pilcaya','Pungarabato','Quechultenango',
  'San Luis Acatlán','San Marcos','San Miguel Totolapan','Taxco de Alarcón','Tecoanapa','Técpan de Galeana','Teloloapan',
  'Tepecoacuilco de Trujano','Tetipac','Tixtla de Guerrero','Tlacoachistlahuaca','Tlacoapa','Tlalchapa','Tlalixtaquilla de Maldonado',
  'Tlapa de Comonfort','Tlapehuala','La Unión','Xalpatláhuac','Xochihuehuetlán','Xochistlahuaca','Zapotitlán Tablas',
  'Zirándaro','Zitlala','Eduardo Neri','Acatepec','Marquelia','Cochoapa el Grande','José Joaquín de Herrera','Juchitán','Iliatenco',
];

export default function VehiculosRobo({ perfil }) {
  const { vehiculos, loading, stats, buscar, crearVehiculo, actualizarVehiculo, fetchStats } = useVehiculosRobo();

  const [nivInicio, setNivInicio] = useState('');
  const [nivFinal, setNivFinal] = useState('');
  const [busqMotor, setBusqMotor] = useState('');
  const [busqPlacas, setBusqPlacas] = useState('');
  const [modoBusqueda, setModoBusqueda] = useState('niv');
  const [indiceActual, setIndiceActual] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Archivos
  const [fotoVehiculo, setFotoVehiculo] = useState(null);
  const [fotoNiv, setFotoNiv] = useState(null);
  const [fotoMotor, setFotoMotor] = useState(null);
  const [fotoPlacas, setFotoPlacas] = useState(null);
  const [oficioMp, setOficioMp] = useState(null);

  const emptyForm = {
    marca: '', submarca: '', modelo_anio: '', clase: '', tipo: '',
    niv: '', numero_motor: '', placas: '', color: '', origen: 'Nacional',
    num_puertas: '', num_cilindros: '', planta_ensamble: '',
    estatus_robo: 'CON REPORTE DE ROBO', fuente_reporte: 'OFICIO MP',
    fecha_robo: '', hora_robo: '', estado_robo: 'Guerrero', municipio_robo: '',
    colonia_robo: '', tipo_robo: 'Con Violencia', num_asaltantes: '',
    carpeta_investigacion: '', numero_oficio_mp: '',
    aseguradora: '', num_siniestro: '',
    niv_condicion: 'original', niv_observaciones: '',
    observaciones: '',
  };
  const [form, setForm] = useState(emptyForm);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const ejecutarBusqueda = () => {
    if (modoBusqueda === 'niv' && (nivInicio.length >= 2 || nivFinal.length >= 3)) {
      buscar({ niv_inicio: nivInicio, niv_final: nivFinal });
    } else if (modoBusqueda === 'motor' && busqMotor.length >= 3) {
      buscar({ numero_motor: busqMotor });
    } else if (modoBusqueda === 'placas' && busqPlacas.length >= 3) {
      buscar({ placas: busqPlacas });
    }
    setIndiceActual(0);
  };

  const vehiculoActual = vehiculos.length > 0 ? vehiculos[indiceActual] : null;

  const subirArchivo = async (file, carpeta, id) => {
    const ext = file.name.split('.').pop();
    const path = `${carpeta}/${id}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('vehiculos-reporte').upload(path, file);
    if (error) return null;
    const { data } = supabase.storage.from('vehiculos-reporte').getPublicUrl(path);
    return data?.publicUrl || null;
  };

  const handleSubmit = async () => {
    if (!form.niv.trim() && !form.numero_motor.trim()) return setMensaje({ tipo: 'error', texto: 'NIV o número de motor es obligatorio' });
    if (!form.marca.trim()) return setMensaje({ tipo: 'error', texto: 'La marca es obligatoria' });
    setSaving(true); setMensaje(null);
    const payload = {
      ...form,
      num_asaltantes: form.num_asaltantes ? parseInt(form.num_asaltantes) : null,
      fecha_robo: form.fecha_robo || null,
      registrado_por: perfil?.nombre_completo || '',
      region: perfil?.region || '',
    };
    const result = await crearVehiculo(payload);
    if (result.success) {
      const id = result.data.id;
      const updates = {};
      if (fotoVehiculo) { const url = await subirArchivo(fotoVehiculo, 'vehiculo', id); if (url) updates.foto_vehiculo_url = url; }
      if (fotoNiv) { const url = await subirArchivo(fotoNiv, 'niv', id); if (url) updates.foto_niv_url = url; }
      if (fotoMotor) { const url = await subirArchivo(fotoMotor, 'motor', id); if (url) updates.foto_motor_url = url; }
      if (fotoPlacas) { const url = await subirArchivo(fotoPlacas, 'placas', id); if (url) updates.foto_placas_url = url; }
      if (oficioMp) { const url = await subirArchivo(oficioMp, 'oficios', id); if (url) updates.oficio_mp_url = url; }
      if (Object.keys(updates).length > 0) await actualizarVehiculo(id, updates);
      setSaving(false);
      setMensaje({ tipo: 'ok', texto: 'Vehículo registrado con archivos' });
      setForm(emptyForm); setFotoVehiculo(null); setFotoNiv(null); setFotoMotor(null); setFotoPlacas(null); setOficioMp(null);
      setTimeout(() => { setShowForm(false); setMensaje(null); }, 1500);
    } else {
      setSaving(false);
      setMensaje({ tipo: 'error', texto: result.error });
    }
  };

  const limpiarBusqueda = () => {
    setNivInicio(''); setNivFinal(''); setBusqMotor(''); setBusqPlacas('');
    setIndiceActual(0); buscar({ niv_inicio: '', niv_final: '' });
  };

  const FotoSlotUpload = ({ label, icon, file, setFile, inputId }) => (
    <div style={st.fg}>
      <label style={st.label}>{label}</label>
      <div style={{ border: `2px dashed ${file ? C.green : C.lightGray}`, borderRadius: 10, padding: 12, textAlign: 'center', cursor: 'pointer', backgroundColor: file ? '#e8f5e9' : C.bg }}
        onClick={() => document.getElementById(inputId).click()}>
        {file ? <div><CheckCircle2 size={18} color={C.green} /><div style={{ fontSize: 10, color: C.green, marginTop: 4 }}>{file.name}</div></div>
          : <div>{icon}<div style={{ fontSize: 10, color: C.gray, marginTop: 4 }}>Clic para subir</div></div>}
        <input id={inputId} type="file" accept="image/jpeg,image/png,application/pdf" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) setFile(e.target.files[0]); }} />
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, fontFamily: 'Segoe UI, Arial, sans-serif', backgroundColor: C.bg, minHeight: '100vh' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.darkBlue, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <Truck size={22} color={C.gold} /> Vehículos con Reporte de Robo
          </h2>
          <p style={{ fontSize: 13, color: C.gray, margin: '4px 0 0 0' }}>Consulta rápida por NIV, motor o placas</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => fetchStats()} style={st.btnOutline}><RefreshCw size={15} /></button>
          <button style={st.btn(C.darkBlue, C.white)} onClick={() => { setForm(emptyForm); setFotoVehiculo(null); setFotoNiv(null); setFotoMotor(null); setFotoPlacas(null); setOficioMp(null); setShowForm(true); setMensaje(null); }}>
            <Plus size={16} /> Registrar Vehículo
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total registros', value: stats.total, color: C.darkBlue, icon: Truck },
          { label: 'Con reporte', value: stats.conReporte, color: C.red, icon: AlertTriangle },
          { label: 'Asegurados', value: stats.asegurados, color: C.green, icon: Shield },
          { label: 'Sin recuperar', value: stats.sinRecuperar, color: C.orange, icon: Target },
        ].map((s, i) => (
          <div key={i} style={{ backgroundColor: C.white, borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><s.icon size={20} color={s.color} /></div>
            <div><div style={{ fontSize: 22, fontWeight: 700, color: C.darkBlue }}>{s.value}</div><div style={{ fontSize: 12, color: C.gray }}>{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* ═══ CONSULTA RÁPIDA ═══ */}
      <div style={{ backgroundColor: C.white, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 20, marginBottom: 20 }}>
        <div style={st.sTitle}><Search size={16} /> Consulta Rápida en Campo</div>
<div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <a href="https://www2.repuve.gob.mx:8443/ciudadania/" target="_blank" rel="noopener noreferrer" style={{ ...st.btnOutline, textDecoration: 'none', fontSize: 12, padding: '6px 14px', borderColor: C.gold, color: C.gold }}>🔗 Consultar REPUVE Oficial</a>
          <a href="https://www.ocra.com.mx/" target="_blank" rel="noopener noreferrer" style={{ ...st.btnOutline, textDecoration: 'none', fontSize: 12, padding: '6px 14px', borderColor: C.orange, color: C.orange }}>🔗 Consultar OCRA</a>
        </div>
        {/* Modo de búsqueda */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[{ k: 'niv', l: 'Por NIV (serie)' }, { k: 'motor', l: 'Por Motor' }, { k: 'placas', l: 'Por Placas' }].map(m => (
            <button key={m.k} onClick={() => setModoBusqueda(m.k)} style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', border: modoBusqueda === m.k ? `2px solid ${C.gold}` : `1px solid ${C.lightGray}`, backgroundColor: modoBusqueda === m.k ? C.lightGold : C.white, color: modoBusqueda === m.k ? C.darkBlue : C.gray, fontSize: 12, fontWeight: 700 }}>
              {m.l}
            </button>
          ))}
        </div>

        {modoBusqueda === 'niv' && (
          <div>
            <p style={{ fontSize: 12, color: C.gray, marginBottom: 10 }}>Ingresa los primeros 3 caracteres y/o los últimos 5 del NIV grabado en el vehículo.</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...st.label, fontSize: 10 }}>Primeros 3 del NIV</label>
                <input style={{ ...st.input, fontFamily: 'monospace', fontSize: 18, fontWeight: 700, textAlign: 'center', letterSpacing: 3 }}
                  maxLength={5} placeholder="3N6" value={nivInicio}
                  onChange={e => setNivInicio(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') ejecutarBusqueda(); }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 10, fontSize: 20, color: C.gray }}>+</div>
              <div style={{ flex: 1 }}>
                <label style={{ ...st.label, fontSize: 10 }}>Últimos 5 del NIV</label>
                <input style={{ ...st.input, fontFamily: 'monospace', fontSize: 18, fontWeight: 700, textAlign: 'center', letterSpacing: 3 }}
                  maxLength={6} placeholder="55624" value={nivFinal}
                  onChange={e => setNivFinal(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') ejecutarBusqueda(); }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                <button onClick={ejecutarBusqueda} style={st.btn(C.gold, C.white)}><Search size={16} /> Buscar</button>
                {vehiculos.length > 0 && <button onClick={limpiarBusqueda} style={{ ...st.btnOutline, padding: '8px 12px' }}><X size={14} /></button>}
              </div>
            </div>
          </div>
        )}

        {modoBusqueda === 'motor' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input style={{ ...st.input, flex: 1, fontFamily: 'monospace', fontSize: 16, fontWeight: 600 }}
              placeholder="NÚMERO DE MOTOR..." value={busqMotor}
              onChange={e => setBusqMotor(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') ejecutarBusqueda(); }} />
            <button onClick={ejecutarBusqueda} style={st.btn(C.gold, C.white)}><Search size={16} /> Buscar</button>
            {vehiculos.length > 0 && <button onClick={limpiarBusqueda} style={{ ...st.btnOutline, padding: '8px 12px' }}><X size={14} /></button>}
          </div>
        )}

        {modoBusqueda === 'placas' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input style={{ ...st.input, flex: 1, fontFamily: 'monospace', fontSize: 16, fontWeight: 600 }}
              placeholder="PLACAS..." value={busqPlacas}
              onChange={e => setBusqPlacas(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') ejecutarBusqueda(); }} />
            <button onClick={ejecutarBusqueda} style={st.btn(C.gold, C.white)}><Search size={16} /> Buscar</button>
            {vehiculos.length > 0 && <button onClick={limpiarBusqueda} style={{ ...st.btnOutline, padding: '8px 12px' }}><X size={14} /></button>}
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: 20, color: C.gray }}>Buscando...</div>}

        {!loading && vehiculos.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <button onClick={() => setIndiceActual(p => Math.max(0, p - 1))} disabled={indiceActual === 0}
                style={{ ...st.btn(indiceActual === 0 ? C.lightGray : C.darkBlue, C.white), opacity: indiceActual === 0 ? 0.4 : 1 }}>
                <ChevronLeft size={16} /> Anterior
              </button>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.darkBlue }}>
                {indiceActual + 1} de {vehiculos.length} coincidencia{vehiculos.length > 1 ? 's' : ''}
              </span>
              <button onClick={() => setIndiceActual(p => Math.min(vehiculos.length - 1, p + 1))} disabled={indiceActual >= vehiculos.length - 1}
                style={{ ...st.btn(indiceActual >= vehiculos.length - 1 ? C.lightGray : C.darkBlue, C.white), opacity: indiceActual >= vehiculos.length - 1 ? 0.4 : 1 }}>
                Siguiente <ChevronRight size={16} />
              </button>
            </div>

            {vehiculoActual && (
              <div style={{ border: `2px solid ${vehiculoActual.estatus_robo === 'CON REPORTE DE ROBO' ? C.red : C.green}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', backgroundColor: vehiculoActual.estatus_robo === 'CON REPORTE DE ROBO' ? '#ffebee' : '#e8f5e9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: vehiculoActual.estatus_robo === 'CON REPORTE DE ROBO' ? '#b71c1c' : '#2e7d32' }}>
                    {vehiculoActual.estatus_robo === 'CON REPORTE DE ROBO' ? '🔴 CON REPORTE DE ROBO' : '🟢 ' + vehiculoActual.estatus_robo}
                  </span>
                  {vehiculoActual.asegurado && <span style={st.badge('#e8f5e9', '#2e7d32')}>ASEGURADO</span>}
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                    {/* Fotos */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      {vehiculoActual.foto_vehiculo_url ? (
                        <img src={vehiculoActual.foto_vehiculo_url} alt="Vehículo" style={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 10, border: `2px solid ${C.lightGray}` }} />
                      ) : (
                        <div style={{ width: 160, height: 120, borderRadius: 10, backgroundColor: C.bg, border: `2px dashed ${C.lightGray}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.gray }}>
                          <Truck size={40} /><span style={{ fontSize: 10, marginTop: 4 }}>Sin foto</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6 }}>
                        {vehiculoActual.foto_niv_url && <img src={vehiculoActual.foto_niv_url} alt="NIV" style={{ width: 75, height: 55, objectFit: 'cover', borderRadius: 6, border: `1px solid ${C.lightGray}` }} />}
                        {vehiculoActual.foto_motor_url && <img src={vehiculoActual.foto_motor_url} alt="Motor" style={{ width: 75, height: 55, objectFit: 'cover', borderRadius: 6, border: `1px solid ${C.lightGray}` }} />}
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: C.darkBlue }}>{vehiculoActual.marca} {vehiculoActual.submarca}</div>
                      <div style={{ fontSize: 14, color: C.gray, marginBottom: 8 }}>{vehiculoActual.tipo || vehiculoActual.clase} · {vehiculoActual.modelo_anio} · {vehiculoActual.color}</div>

                      <div style={{ padding: 12, backgroundColor: C.bg, borderRadius: 8, marginBottom: 12, fontFamily: 'monospace' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          <div><span style={{ fontSize: 10, color: C.gray }}>NIV:</span> <span style={{ fontSize: 14, fontWeight: 700, color: C.darkBlue }}>{vehiculoActual.niv || '—'}</span></div>
                          <div><span style={{ fontSize: 10, color: C.gray }}>Motor:</span> <span style={{ fontSize: 14, fontWeight: 700, color: C.darkBlue }}>{vehiculoActual.numero_motor || '—'}</span></div>
                          <div><span style={{ fontSize: 10, color: C.gray }}>Placas:</span> <span style={{ fontSize: 14, fontWeight: 700 }}>{vehiculoActual.placas || 'Sin placas'}</span></div>
                          <div><span style={{ fontSize: 10, color: C.gray }}>Origen:</span> <span style={{ fontSize: 13 }}>{vehiculoActual.origen}</span></div>
                        </div>
                        {vehiculoActual.niv_condicion !== 'original' && (
                          <div style={{ marginTop: 8, padding: '6px 10px', backgroundColor: '#ffebee', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#b71c1c' }}>
                            ⚠ NIV: {vehiculoActual.niv_condicion} {vehiculoActual.niv_observaciones ? '— ' + vehiculoActual.niv_observaciones : ''}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        {[
                          { l: 'Fecha Robo', v: vehiculoActual.fecha_robo },
                          { l: 'Tipo', v: vehiculoActual.tipo_robo },
                          { l: 'Municipio', v: vehiculoActual.municipio_robo },
                          { l: 'Estado', v: vehiculoActual.estado_robo },
                          { l: 'Aseguradora', v: vehiculoActual.aseguradora },
                          { l: 'C.I.', v: vehiculoActual.carpeta_investigacion },
                          { l: 'No. Oficio MP', v: vehiculoActual.numero_oficio_mp },
                          { l: 'Fuente', v: vehiculoActual.fuente_reporte },
                        ].filter(r => r.v).map((r, i) => (
                          <div key={i}><div style={{ fontSize: 10, fontWeight: 600, color: C.gray, textTransform: 'uppercase' }}>{r.l}</div><div style={{ fontSize: 13, color: C.darkBlue }}>{r.v}</div></div>
                        ))}
                      </div>

                      {vehiculoActual.observaciones && <div style={{ fontSize: 12, color: C.gray }}>Obs: {vehiculoActual.observaciones}</div>}
                      {vehiculoActual.oficio_mp_url && (
                        <a href={vehiculoActual.oficio_mp_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12, color: C.gold, textDecoration: 'none' }}>
                          <FileText size={13} /> Ver oficio del MP (PDF)
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && (nivInicio || nivFinal || busqMotor || busqPlacas) && vehiculos.length === 0 && (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🟢</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: C.green }}>SIN REPORTE DE ROBO</p>
            <p style={{ fontSize: 13, color: C.gray }}>No se encontraron coincidencias en la base de datos</p>
          </div>
        )}
      </div>

      {/* ═══ FORMULARIO REGISTRO ═══ */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,26,77,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 30, zIndex: 1000, overflowY: 'auto' }} onClick={() => setShowForm(false)}>
          <div style={{ backgroundColor: C.white, borderRadius: 14, width: '100%', maxWidth: 750, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', marginBottom: 40 }} onClick={e => e.stopPropagation()}>
            <div style={{ backgroundColor: C.darkBlue, color: C.white, padding: '18px 24px', borderRadius: '14px 14px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Truck size={20} /><span style={{ fontSize: 16, fontWeight: 700 }}>Registrar Vehículo con Reporte de Robo</span></div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowForm(false)} />
            </div>

            <div style={{ padding: 24 }}>
              <div style={st.sTitle}><Truck size={15} /> Datos del Vehículo</div>
              <div style={st.grid2}>
                <div style={st.fg}><label style={st.label}>Marca *</label><input style={st.input} value={form.marca} onChange={e => set('marca', e.target.value.toUpperCase())} placeholder="NISSAN" /></div>
                <div style={st.fg}><label style={st.label}>Submarca</label><input style={st.input} value={form.submarca} onChange={e => set('submarca', e.target.value.toUpperCase())} placeholder="FRONTIER / NP300" /></div>
                <div style={st.fg}><label style={st.label}>Año Modelo</label><input style={st.input} value={form.modelo_anio} onChange={e => set('modelo_anio', e.target.value)} placeholder="2016" /></div>
                <div style={st.fg}><label style={st.label}>Color</label><input style={st.input} value={form.color} onChange={e => set('color', e.target.value)} placeholder="Blanco, Gris plata..." /></div>
                <div style={st.fg}><label style={st.label}>NIV (No. Serie) *</label><input style={{ ...st.input, fontFamily: 'monospace', fontSize: 15, letterSpacing: 1 }} value={form.niv} onChange={e => set('niv', e.target.value.toUpperCase())} placeholder="3N6AD35C8GK855624" maxLength={17} /></div>
                <div style={st.fg}><label style={st.label}>No. Motor</label><input style={{ ...st.input, fontFamily: 'monospace' }} value={form.numero_motor} onChange={e => set('numero_motor', e.target.value.toUpperCase())} /></div>
                <div style={st.fg}><label style={st.label}>Placas</label><input style={{ ...st.input, fontFamily: 'monospace' }} value={form.placas} onChange={e => set('placas', e.target.value.toUpperCase())} placeholder="Sin placas" /></div>
                <div style={st.fg}><label style={st.label}>Tipo</label><input style={st.input} value={form.tipo} onChange={e => set('tipo', e.target.value)} placeholder="PICK UP, SEDAN, SUV..." /></div>
                <div style={st.fg}><label style={st.label}>Clase</label><input style={st.input} value={form.clase} onChange={e => set('clase', e.target.value)} placeholder="CAMIONETA, AUTOMÓVIL..." /></div>
                <div style={st.fg}>
                  <label style={st.label}>Origen</label>
                  <select style={st.select} value={form.origen} onChange={e => set('origen', e.target.value)}>
                    <option value="Nacional">Nacional</option><option value="Extranjero">Extranjero</option>
                  </select>
                </div>
              </div>



              {/* Datos del robo */}
              <div style={{ ...st.sTitle, marginTop: 20 }}><AlertTriangle size={15} /> Datos del Robo</div>
              <div style={st.grid2}>
                <div style={st.fg}><label style={st.label}>Fecha del robo</label><input style={st.input} type="date" value={form.fecha_robo} onChange={e => set('fecha_robo', e.target.value)} /></div>
                <div style={st.fg}>
                  <label style={st.label}>Tipo de robo</label>
                  <select style={st.select} value={form.tipo_robo} onChange={e => set('tipo_robo', e.target.value)}>
                    <option value="Con Violencia">Con violencia</option><option value="Sin Violencia">Sin violencia</option><option value="Abandono">Abandono</option>
                  </select>
                </div>
                <div style={st.fg}>
                  <label style={st.label}>Municipio del robo</label>
                  <select style={st.select} value={form.municipio_robo} onChange={e => set('municipio_robo', e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {MUNICIPIOS_GUERRERO.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div style={st.fg}>
                  <label style={st.label}>Estado</label>
                  <input style={{ ...st.input, backgroundColor: '#f0f0f0' }} value={form.estado_robo} readOnly />
                </div>
                <div style={st.fg}><label style={st.label}>No. asaltantes</label><input style={st.input} type="number" value={form.num_asaltantes} onChange={e => set('num_asaltantes', e.target.value)} /></div>
                <div style={st.fg}><label style={st.label}>Aseguradora</label><input style={st.input} value={form.aseguradora} onChange={e => set('aseguradora', e.target.value)} placeholder="BANORTE, GNP, QUALITAS..." /></div>
                <div style={st.fg}><label style={st.label}>Carpeta de Investigación</label><input style={{ ...st.input, fontFamily: 'monospace' }} value={form.carpeta_investigacion} onChange={e => set('carpeta_investigacion', e.target.value)} /></div>
                <div style={st.fg}><label style={st.label}>No. Oficio del MP</label><input style={st.input} value={form.numero_oficio_mp} onChange={e => set('numero_oficio_mp', e.target.value)} /></div>
              </div>

              {/* Fotografías */}
              <div style={{ ...st.sTitle, marginTop: 20 }}><Camera size={15} /> Catálogo Fotográfico</div>
              <p style={{ fontSize: 11, color: C.gray, marginBottom: 10 }}>Sube fotos del vehículo, NIV grabado, motor y placas + oficio del MP</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                <FotoSlotUpload label="Vehículo" icon={<Truck size={18} color={C.gray} />} file={fotoVehiculo} setFile={setFotoVehiculo} inputId="f-vehiculo" />
                <FotoSlotUpload label="NIV grabado" icon={<FileText size={18} color={C.gray} />} file={fotoNiv} setFile={setFotoNiv} inputId="f-niv" />
                <FotoSlotUpload label="Motor" icon={<Shield size={18} color={C.gray} />} file={fotoMotor} setFile={setFotoMotor} inputId="f-motor" />
                <FotoSlotUpload label="Placas" icon={<MapPin size={18} color={C.gray} />} file={fotoPlacas} setFile={setFotoPlacas} inputId="f-placas" />
                <FotoSlotUpload label="Oficio MP" icon={<FileText size={18} color={C.gray} />} file={oficioMp} setFile={setOficioMp} inputId="f-oficio" />
              </div>

              <div style={{ ...st.fg, marginTop: 14 }}>
                <label style={st.label}>Observaciones</label>
                <textarea style={st.textarea} value={form.observaciones} onChange={e => set('observaciones', e.target.value)} placeholder="Notas adicionales, características especiales, vehículo modificado..." rows={2} />
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
                <Send size={15} /> {saving ? 'Guardando...' : 'Registrar Vehículo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
