// src/pages/Detenidos.jsx
// Módulo 1 — Individualización de Detenidos
// Extraído de App.jsx y homologado visualmente al estilo del Módulo 2

import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import {
  Shield, MapPin, Camera, FileText, Package, Users, User, FolderKanban,
  Search, ClipboardList, BadgeCheck, Phone, Crosshair,
  Pill, Laptop, Car, Home, Banknote, ShieldAlert,
  CircleCheck, Lock, Link2, Building2, UserCheck, Briefcase,
  Calendar, Clock, FilePenLine, HelpCircle,
} from "lucide-react";

// ============================================================================
// CONSTANTES Y CATÁLOGOS
// ============================================================================
export const REGIONES = ["Región Centro","Región Montaña","Región Costa Grande","Región Costa Chica","Región Tierra Caliente","Región Acapulco","Región Norte"];
const COMPLEXIONES = ["Delgada","Regular","Robusta","Obesa"];
const TEZ = ["Blanca","Morena clara","Morena","Morena oscura","Negra"];
const ESTADOS_CIVILES = ["Soltero(a)","Casado(a)","Unión libre","Divorciado(a)","Viudo(a)"];
const IDENTIFICACIONES = ["INE","Pasaporte","Licencia","Cédula profesional","No proporcionó","Otro"];
const TIPOS_DOCUMENTO = ["Boleta de Internamiento","Oficio de Investigación","Pase de Visitas","Oficio de Solicitud a Plataforma México","Oficio de Solicitud a Otras Dependencias","Oficio de Solicitud de Cámaras C2, C4 y C5","Boleta de Libertad Bajo Reservas de Ley","Solicitud de Audiencia (Fecha y Hora Programada)","Otros"];
const TIPOLOGIAS_INDICIO = ["Balístico","Narcóticos","Tecnológico","Vehículo","Bien Inmueble","Arma","Dinero","Otro"];
const DESTINOS_MOVIMIENTO = ["Laboratorio","Bodega de Indicios","Perito","Ministerio Público","Juzgado","Otra autoridad","Devolución al lugar de origen","Otro"];
const TIPOS_DETENCION = ["Flagrancia","Mandamiento Judicial / Orden de Aprehensión","Caso Urgente","Mandamiento Ministerial"];
const SITUACIONES_MIGRATORIAS = ["No aplica", "Regular", "Irregular", "En trámite"];
const tipologiaIcono = { "Balístico": Crosshair, "Narcóticos": Pill, "Tecnológico": Laptop, "Vehículo": Car, "Bien Inmueble": Home, "Arma": ShieldAlert, "Dinero": Banknote, "Otro": Package };
const tipologiaColor = { "Balístico": "#ef4444", "Narcóticos": "#a78bfa", "Tecnológico": "#001a4d", "Vehículo": "#f59e0b", "Bien Inmueble": "#14b8a6", "Arma": "#7f1d1d", "Dinero": "#22c55e", "Otro": "#6b7280" };

// ============================================================================
// ESTILOS BASE — HOMOLOGADOS AL MÓDULO 2
// ============================================================================
const COLORS = { primary: '#001a4d', gold: '#b69054', white: '#ffffff', bg: '#f4f6fb' };
const cardStyle = { background: COLORS.white, borderRadius: 10, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 14 };
const labelStyle = { display: 'block', fontWeight: 600, fontSize: 13, color: COLORS.primary, marginBottom: 4 };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 7, border: '1.5px solid #c7cfe0', fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', color: '#33394d', background: COLORS.white };
const selectStyle = { ...inputStyle };
const textareaStyle = { ...inputStyle, minHeight: 60, resize: 'vertical' };
const btnPrimary = { background: COLORS.gold, color: COLORS.white, border: 'none', borderRadius: 7, padding: '10px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, justifyContent: 'center' };
const btnSecondary = { ...btnPrimary, background: 'transparent', color: COLORS.primary, border: `1.5px solid ${COLORS.primary}` };
const tituloSeccion = { color: COLORS.gold, fontSize: 13, fontWeight: 800, letterSpacing: 1.5, marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #b69054', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 };

// ============================================================================
// SEMÁFORO DE 48 HORAS
// ============================================================================
export const SEMAFORO = {
  verde:   { bg: "#e1f5ee", border: "#22c55e", dot: "#22c55e", texto: "#085041", label: "En Proceso" },
  amarillo:{ bg: "#faeeda", border: "#eab308", dot: "#eab308", texto: "#854f0b", label: "En Proceso" },
  naranja: { bg: "#faeeda", border: "#f97316", dot: "#f97316", texto: "#854f0b", label: "Alerta por Vencer" },
  rojo:    { bg: "#fcebeb", border: "#ef4444", dot: "#ef4444", texto: "#791f1f", label: "Por vencer" },
  negro:   { bg: "#f1efe8", border: "#7f1d1d", dot: "#6b7280", texto: "#5f5e5a", label: "Omisión de Plazo" },
};

export function calcularSemaforo(detenido) {
  if (detenido.estatus_clave && detenido.estatus_clave !== "en_proceso") {
    if (detenido.estatus_clave === "omision_plazo") return { ...SEMAFORO.negro, label: "Omisión de Plazo" };
    if (detenido.estatus_clave === "finalizado") return { bg: "#1a1a1a", border: "#6b7280", dot: "#5f5e5a", texto: "#d1d5db", label: "Finalizado" };
    return { bg: "#ffffff", border: "#001a4d", dot: "#001a4d", texto: "#dce6f5", label: detenido.estatus_clave.replace(/_/g, " ") };
  }
  if (!detenido.fecha_limite_48h) return { ...SEMAFORO.verde, label: "En Proceso" };
  const limite = new Date(detenido.fecha_limite_48h).getTime();
  const ahora = Date.now();
  const horasRestantes = (limite - ahora) / (1000 * 60 * 60);
  if (horasRestantes <= 0) return { ...SEMAFORO.negro, label: "Omisión de Plazo" };
  if (horasRestantes <= 3) return { ...SEMAFORO.naranja, label: "Alerta por Vencer" };
  if (horasRestantes <= 12) return { ...SEMAFORO.amarillo, label: "En Proceso" };
  return { ...SEMAFORO.verde, label: "En Proceso" };
}

function tiempoRestanteTexto(fechaLimite) {
  if (!fechaLimite) return "—";
  const limite = new Date(fechaLimite).getTime();
  const diffMs = limite - Date.now();
  if (diffMs <= 0) {
    const horasVencidas = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
    return `Vencido hace ${horasVencidas}h`;
  }
  const horas = Math.floor(diffMs / (1000 * 60 * 60));
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${horas}h ${minutos}m restantes`;
}

export function SemaforoBadge({ detenido }) {
  const s = calcularSemaforo(detenido);
  const esNegro = s.dot === SEMAFORO.negro.dot && s.label === "Omisión de Plazo";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20, padding: "4px 10px" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot, display: "inline-block",
        animation: esNegro ? "none" : (s.label === "Alerta por Vencer" ? "parpadeo 1s infinite" : "none") }} />
      <span style={{ color: s.texto, fontSize: 10, fontWeight: 700 }}>{s.label}</span>
    </div>
  );
}

const FOTO_SLOTS = [
  { key: "foto_frente", label: "Frente (cara y cuello)", icono: User, multiple: false, guia: "Captura de cara y cuello, fondo neutro, buena iluminación, sin lentes ni gorra — esta foto se usa para el Reconocimiento Facial con IA" },
  { key: "foto_perfil_izq", label: "Perfil izquierdo", icono: User, multiple: false },
  { key: "foto_perfil_der", label: "Perfil derecho", icono: User, multiple: false },
  { key: "foto_tatuaje", label: "Tatuajes / señas", icono: Search, multiple: true },
  { key: "foto_entrega_autoridades", label: "Entrega con autoridades", icono: UserCheck, multiple: true },
];

// ============================================================================
// COMPONENTES BASE — HOMOLOGADOS AL MÓDULO 2
// ============================================================================
export function Input({ label, value, onChange, placeholder = "", type = "text", required = false }) {
  return (
    <div>
      <label style={labelStyle}>{label} {required && <span style={{ color: "#ef4444" }}>*</span>}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

export function Select({ label, value, onChange, options, required = false }) {
  return (
    <div>
      <label style={labelStyle}>{label} {required && <span style={{ color: "#ef4444" }}>*</span>}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
        <option value="">— Seleccionar —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export function TextArea({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} style={textareaStyle} />
    </div>
  );
}

// ─── CALENDARIO VISUAL (DatePicker propio) ─────────────────────────────────────
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_SEMANA = ["D","L","M","M","J","V","S"];

function formatearFechaLegible(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

function DatePicker({ label, value, onChange, required = false }) {
  const [abierto, setAbierto] = useState(false);
  const hoy = new Date();
  const fechaSeleccionada = value ? new Date(value + "T00:00:00") : null;
  const [mesVista, setMesVista] = useState(fechaSeleccionada ? fechaSeleccionada.getMonth() : hoy.getMonth());
  const [anioVista, setAnioVista] = useState(fechaSeleccionada ? fechaSeleccionada.getFullYear() : hoy.getFullYear());
  const ref = useRef(null);

  useEffect(() => {
    const cerrarFuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", cerrarFuera);
    return () => document.removeEventListener("mousedown", cerrarFuera);
  }, []);

  const primerDiaMes = new Date(anioVista, mesVista, 1).getDay();
  const diasEnMes = new Date(anioVista, mesVista + 1, 0).getDate();
  const celdas = [];
  for (let i = 0; i < primerDiaMes; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  const cambiarMes = (delta) => {
    let m = mesVista + delta, a = anioVista;
    if (m < 0) { m = 11; a -= 1; }
    if (m > 11) { m = 0; a += 1; }
    setMesVista(m); setAnioVista(a);
  };

  const seleccionarDia = (dia) => {
    const mm = String(mesVista + 1).padStart(2, "0");
    const dd = String(dia).padStart(2, "0");
    onChange(`${anioVista}-${mm}-${dd}`);
    setAbierto(false);
  };

  const esHoy = (dia) => dia === hoy.getDate() && mesVista === hoy.getMonth() && anioVista === hoy.getFullYear();
  const esSeleccionado = (dia) => fechaSeleccionada && dia === fechaSeleccionada.getDate() && mesVista === fechaSeleccionada.getMonth() && anioVista === fechaSeleccionada.getFullYear();

  const anios = [];
  for (let a = hoy.getFullYear(); a >= hoy.getFullYear() - 90; a--) anios.push(a);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <label style={labelStyle}>{label} {required && <span style={{ color: "#ef4444" }}>*</span>}</label>
      <button type="button" onClick={() => setAbierto((v) => !v)}
        style={{ ...inputStyle, color: value ? "#33394d" : "#9ca3af", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{value ? formatearFechaLegible(value) : "Seleccionar fecha"}</span>
        <Calendar size={15} style={{ color: COLORS.gold }} />
      </button>

      {abierto && (
        <div style={{ position: "absolute", zIndex: 50, top: "calc(100% + 6px)", left: 0, background: COLORS.white, border: "1.5px solid #c7cfe0", borderRadius: 10, padding: 14, width: 280, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 6 }}>
            <button type="button" onClick={() => cambiarMes(-1)} style={{ background: "#eef1f6", border: "none", borderRadius: 6, width: 28, height: 28, color: "#33394d", cursor: "pointer", fontSize: 14 }}>‹</button>
            <select value={mesVista} onChange={(e) => setMesVista(Number(e.target.value))}
              style={{ background: COLORS.white, border: "1.5px solid #c7cfe0", borderRadius: 6, padding: "4px 6px", color: "#33394d", fontSize: 12, flex: 1 }}>
              {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select value={anioVista} onChange={(e) => setAnioVista(Number(e.target.value))}
              style={{ background: COLORS.white, border: "1.5px solid #c7cfe0", borderRadius: 6, padding: "4px 6px", color: "#33394d", fontSize: 12 }}>
              {anios.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <button type="button" onClick={() => cambiarMes(1)} style={{ background: "#eef1f6", border: "none", borderRadius: 6, width: 28, height: 28, color: "#33394d", cursor: "pointer", fontSize: 14 }}>›</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
            {DIAS_SEMANA.map((d, i) => (
              <div key={i} style={{ textAlign: "center", color: "#6b7280", fontSize: 10, fontWeight: 700, padding: "4px 0" }}>{d}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {celdas.map((dia, i) => (
              <button key={i} type="button" disabled={!dia} onClick={() => dia && seleccionarDia(dia)}
                style={{
                  background: esSeleccionado(dia) ? COLORS.primary : "transparent",
                  border: esHoy(dia) && !esSeleccionado(dia) ? `1px solid ${COLORS.primary}` : "1px solid transparent",
                  borderRadius: 6, height: 30, color: !dia ? "transparent" : esSeleccionado(dia) ? "#ffffff" : "#4a5268",
                  fontSize: 12, cursor: dia ? "pointer" : "default", fontWeight: esSeleccionado(dia) ? 700 : 400,
                }}>
                {dia || ""}
              </button>
            ))}
          </div>

          <button type="button" onClick={() => { onChange(""); setAbierto(false); }}
            style={{ marginTop: 10, width: "100%", background: "none", border: "1px solid #ef444444", borderRadius: 6, padding: "6px", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>
            Limpiar fecha
          </button>
        </div>
      )}
    </div>
  );
}

// ─── SELECTOR DE FECHA + HORA EN FORMATO 24 HORAS (00-23) ──────────────────────
function DateTimePicker24({ label, value, onChange, required = false }) {
  const [fechaParte, horaParteRaw] = value ? value.split("T") : ["", ""];
  const horaParte = horaParteRaw || "";
  const [hh, mm] = horaParte ? horaParte.split(":") : ["", ""];

  const actualizar = (nuevaFecha, nuevaHH, nuevaMM) => {
    const f = nuevaFecha !== undefined ? nuevaFecha : fechaParte;
    const h = nuevaHH !== undefined ? nuevaHH : (hh || "00");
    const m = nuevaMM !== undefined ? nuevaMM : (mm || "00");
    if (!f) { onChange(""); return; }
    onChange(`${f}T${h}:${m}`);
  };

  const horas = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutos = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

  return (
    <div>
      <label style={labelStyle}>{label} {required && <span style={{ color: "#ef4444" }}>*</span>}</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "end" }}>
        <DatePicker label="" value={fechaParte} onChange={(v) => actualizar(v, undefined, undefined)} />
        <div>
          <select value={hh} onChange={(e) => actualizar(undefined, e.target.value, undefined)}
            style={{ ...inputStyle, width: "auto", padding: "9px 8px" }}>
            <option value="">HH</option>
            {horas.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <select value={mm} onChange={(e) => actualizar(undefined, undefined, e.target.value)}
            style={{ ...inputStyle, width: "auto", padding: "9px 8px" }}>
            <option value="">MM</option>
            {minutos.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      {hh && (
        <div style={{ color: "#6b7280", fontSize: 10, marginTop: 4 }}>
          Formato 24 horas — {hh}:{mm || "00"} {parseInt(hh) < 12 ? "(antes del mediodía)" : parseInt(hh) === 12 ? "(mediodía)" : "(después del mediodía)"}
        </div>
      )}
    </div>
  );
}

function InputCarpeta20({ value, onChange }) {
  const soloDigitos = (value || "").replace(/\D/g, "");
  const completos = soloDigitos.length === 20;
  return (
    <div>
      <label style={labelStyle}>Carpeta de investigación (20 dígitos) <span style={{ color: "#ef4444" }}>*</span></label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, 20))}
        placeholder="12030290200280050523"
        style={{ ...inputStyle, border: `1.5px solid ${completos ? "#22c55e" : "#c7cfe0"}`, fontFamily: "monospace", letterSpacing: 1 }}
      />
      <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: completos ? "#22c55e" : "#6b7280", fontSize: 10 }}>{completos ? "✓ " : ""}{soloDigitos.length}/20 dígitos {value ? `→ ${soloDigitos}*` : ""}</span>
      </div>
    </div>
  );
}

function InputCURP({ value, onChange }) {
  const limpio = (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const completo = limpio.length === 18;
  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <label style={labelStyle}>CURP (18 caracteres) <span style={{ color: "#ef4444" }}>*</span></label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 18))}
          placeholder="MOPE920630HS7MCLLD05"
          style={{ ...inputStyle, flex: 1, width: "auto", border: `1.5px solid ${completo ? "#22c55e" : "#c7cfe0"}`, fontFamily: "monospace", letterSpacing: 1 }}
        />
        <a href="https://www.gob.mx/curp/" target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 5, background: "#f5ede0", border: "1px solid #b6905440", borderRadius: 7, padding: "0 12px", color: COLORS.primary, fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
          <Search size={13} />RENAPO
        </a>
      </div>
      <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: completo ? "#22c55e" : "#6b7280", fontSize: 10 }}>{completo ? "✓ " : ""}{limpio.length}/18 caracteres</span>
        <span style={{ color: "#7c8494", fontSize: 9 }}>Sin INE: generar CURP en gob.mx con nombre, fecha de nacimiento y estado de registro</span>
      </div>
    </div>
  );
}

function BotonMapa({ latitud, longitud, compacto }) {
  if (!latitud || !longitud) return null;
  const url = `https://www.google.com/maps?q=${latitud},${longitud}`;
  if (compacto) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
        style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#e1f5ee", border: "1px solid #5dcaa599", borderRadius: 6, padding: "3px 9px", color: "#085041", fontSize: 10, fontWeight: 700, textDecoration: "none" }}>
        <MapPin size={11} style={{ marginRight: 3, verticalAlign: -2 }} />Mapa
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#e1f5ee", border: "1px solid #22c55e55", borderRadius: 7, padding: "8px 14px", color: "#085041", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
      <MapPin size={14} style={{ marginRight: 4, verticalAlign: -2 }} />Ver en Google Maps
    </a>
  );
}

function Badge({ text, color }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 4, padding: "2px 9px", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>{text}</span>;
}

function Seccion({ titulo, icon: Icon, children }) {
  return (
    <div style={cardStyle}>
      <div style={tituloSeccion}>
        {Icon && <Icon size={16} strokeWidth={2} />}
        {titulo}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>
    </div>
  );
}

// ============================================================================
// RECONOCIMIENTO FACIAL / HUELLAS (versión PRO — placeholder)
// ============================================================================
function VerificarRostro() {
  return (
    <div style={{ ...cardStyle, padding: 14, marginTop: 10, marginBottom: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#6b7280", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}><Search size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Reconocimiento Facial con IA</div>
          <div style={{ color: "#6b7280", fontSize: 10, marginTop: 2 }}>Identifica coincidencias con detenidos ya registrados</div>
        </div>
        <button disabled style={{ background: "#f1efe8", border: "1px solid #d3d1c7", borderRadius: 7, padding: "8px 14px", color: "#6b7280", fontSize: 11, fontWeight: 700, cursor: "not-allowed", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
          <Lock size={12} style={{ marginRight: 4, verticalAlign: -2 }} />Disponible en versión PRO
        </button>
      </div>
    </div>
  );
}

function CapturaHuellasPRO() {
  return (
    <div style={{ ...cardStyle, padding: 14, marginTop: 10, marginBottom: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#6b7280", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}><BadgeCheck size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Captura de Huellas Dactilares</div>
          <div style={{ color: "#6b7280", fontSize: 10, marginTop: 2 }}>Sistema Vucetich — identificación decadactilar AFIS</div>
        </div>
        <button disabled style={{ background: "#f1efe8", border: "1px solid #d3d1c7", borderRadius: 7, padding: "8px 14px", color: "#6b7280", fontSize: 11, fontWeight: 700, cursor: "not-allowed", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
          <Lock size={12} style={{ marginRight: 4, verticalAlign: -2 }} />Disponible en versión PRO
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SUBIDA DE UN SLOT DE FOTO
// ============================================================================
function FotoSlot({ slot, detenidoId, perfil, archivos, onSubido }) {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const existentes = archivos.filter((a) => a.categoria === slot.key);

  const subirArchivo = async (file) => {
    setSubiendo(true);
    const ext = file.name.split(".").pop();
    const nombreUnico = `${detenidoId}/${slot.key}_${Date.now()}.${ext}`;

    const { error: errorSubida } = await supabase.storage.from("expedientes").upload(nombreUnico, file);
    if (errorSubida) { alert("Error al subir: " + errorSubida.message); setSubiendo(false); return; }

    const { data: urlData } = supabase.storage.from("expedientes").getPublicUrl(nombreUnico);

    const { error: errorInsert } = await supabase.from("documentos_expediente").insert([{
      detenido_id: detenidoId,
      categoria: slot.key,
      url_archivo: urlData.publicUrl,
      nombre_archivo: file.name,
      subido_por: perfil?.nombre_completo || "",
      subido_por_id: perfil?.id || null,
    }]);
    if (errorInsert) alert("Error al registrar archivo: " + errorInsert.message);

    setSubiendo(false);
    onSubido();
  };

  return (
    <div style={{ background: "#f9fafb", border: "1px solid #e8ecf1", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ color: COLORS.primary, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}><slot.icono size={14} />{slot.label}</div>
        {existentes.length > 0 && <span style={{ color: "#22c55e", fontSize: 11 }}>✓ {existentes.length}</span>}
      </div>

      {existentes.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {existentes.map((a) => (
            <img key={a.id} src={a.url_archivo} alt={slot.label} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid #c7cfe0" }} />
          ))}
        </div>
      )}

      {slot.guia && existentes.length === 0 && (
        <div style={{ background: "#f5ede0", borderRadius: 6, padding: 8, marginBottom: 8, color: "#6b7280", fontSize: 10, lineHeight: 1.4 }}>{slot.guia}</div>
      )}

      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple={slot.multiple} style={{ display: "none" }}
        onChange={(e) => { Array.from(e.target.files).forEach(subirArchivo); e.target.value = ""; }} />
      <button onClick={() => inputRef.current.click()} disabled={subiendo}
        style={{ width: "100%", background: COLORS.gold, border: "none", borderRadius: 7, padding: "8px", color: COLORS.white, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
        {subiendo ? "Subiendo…" : (slot.multiple ? "+ Agregar foto" : existentes.length > 0 ? "Reemplazar" : "Tomar / Subir foto")}
      </button>
    </div>
  );
}

// ============================================================================
// DOCUMENTOS DEL EXPEDIENTE
// ============================================================================
function DocumentosExpediente({ detenidoId, perfil, archivos, onSubido }) {
  const inputRef = useRef(null);
  const [tipoSeleccionado, setTipoSeleccionado] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const documentos = archivos.filter((a) => a.categoria === "documento");

  const subirDocumento = async (file) => {
    if (!tipoSeleccionado) { alert("Selecciona primero el tipo de documento."); return; }
    setSubiendo(true);
    const ext = file.name.split(".").pop();
    const tipoLimpio = tipoSeleccionado
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    const nombreUnico = `${detenidoId}/doc_${tipoLimpio}_${Date.now()}.${ext}`;

    const { error: errorSubida } = await supabase.storage.from("expedientes").upload(nombreUnico, file);
    if (errorSubida) { alert("Error al subir: " + errorSubida.message); setSubiendo(false); return; }

    const { data: urlData } = supabase.storage.from("expedientes").getPublicUrl(nombreUnico);

    const { error: errorInsert } = await supabase.from("documentos_expediente").insert([{
      detenido_id: detenidoId,
      categoria: "documento",
      tipo_documento: tipoSeleccionado,
      url_archivo: urlData.publicUrl,
      nombre_archivo: file.name,
      subido_por: perfil?.nombre_completo || "",
      subido_por_id: perfil?.id || null,
    }]);
    if (errorInsert) alert("Error al registrar archivo: " + errorInsert.message);

    setSubiendo(false);
    setTipoSeleccionado("");
    onSubido();
  };

  return (
    <div style={cardStyle}>
      <div style={tituloSeccion}><FileText size={15} />Documentos del Expediente</div>
      <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 14 }}>Integra los documentos conforme se generen dentro del plazo constitucional de 48 horas.</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px" }}>
          <Select label="Tipo de documento" value={tipoSeleccionado} onChange={setTipoSeleccionado} options={TIPOS_DOCUMENTO} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <input ref={inputRef} type="file" accept="image/*,.pdf" style={{ display: "none" }}
            onChange={(e) => { if (e.target.files[0]) subirDocumento(e.target.files[0]); e.target.value = ""; }} />
          <button onClick={() => tipoSeleccionado ? inputRef.current.click() : alert("Selecciona primero el tipo de documento.")} disabled={subiendo}
            style={{ ...btnPrimary, padding: "9px 16px", fontSize: 12, whiteSpace: "nowrap" }}>
            {subiendo ? "Subiendo…" : "+ Subir documento"}
          </button>
        </div>
      </div>

      {documentos.length === 0 ? (
        <div style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", padding: 16 }}>Aún no se han integrado documentos a este expediente.</div>
      ) : (
        documentos.map((d) => (
          <a key={d.id} href={d.url_archivo} target="_blank" rel="noreferrer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb", borderRadius: 8, padding: "10px 12px", marginBottom: 6, textDecoration: "none", border: "1px solid #e8ecf1" }}>
            <div>
              <div style={{ color: COLORS.primary, fontSize: 12, fontWeight: 600 }}>{d.tipo_documento}</div>
              <div style={{ color: "#6b7280", fontSize: 10 }}>{d.nombre_archivo}</div>
            </div>
            <span style={{ color: COLORS.gold, fontSize: 11, fontWeight: 700 }}>Ver →</span>
          </a>
        ))
      )}
    </div>
  );
}

// ============================================================================
// INDICIOS ASEGURADOS
// ============================================================================
function IndicioCard({ indicio, perfil, detenidoId, onActualizado }) {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [archivos, setArchivos] = useState(indicio._archivos || []);
  const [expandido, setExpandido] = useState(false);
  const [movimientos, setMovimientos] = useState([]);
  const [mostrarFormMov, setMostrarFormMov] = useState(false);
  const [nombreRecibe, setNombreRecibe] = useState("");
  const [motivoMov, setMotivoMov] = useState("");
  const [destinoMov, setDestinoMov] = useState("");
  const [guardandoMov, setGuardandoMov] = useState(false);

  const cargarMovimientos = async () => {
    const { data } = await supabase.from("indicios_movimientos").select("*").eq("indicio_id", indicio.id).order("creado_en", { ascending: false });
    setMovimientos(data || []);
  };

  useEffect(() => { if (expandido) cargarMovimientos(); }, [expandido]);

  const registrarMovimiento = async () => {
    if (!nombreRecibe || !motivoMov || !destinoMov) { alert("Completa nombre, motivo y destino."); return; }
    setGuardandoMov(true);
    const { error } = await supabase.from("indicios_movimientos").insert([{
      indicio_id: indicio.id,
      nombre_recibe: nombreRecibe, motivo: motivoMov, destino: destinoMov,
      registrado_por: perfil?.nombre_completo || "", registrado_por_id: perfil?.id || null,
    }]);
    setGuardandoMov(false);
    if (error) { alert("Error al registrar movimiento: " + error.message); return; }
    setNombreRecibe(""); setMotivoMov(""); setDestinoMov(""); setMostrarFormMov(false);
    cargarMovimientos();
  };

  const subirArchivo = async (file) => {
    setSubiendo(true);
    const esVideo = file.type.startsWith("video/");
    const ext = file.name.split(".").pop();
    const nombreUnico = `${detenidoId}/indicio_${indicio.id}_${Date.now()}.${ext}`;

    const { error: errorSubida } = await supabase.storage.from("expedientes").upload(nombreUnico, file);
    if (errorSubida) { alert("Error al subir: " + errorSubida.message); setSubiendo(false); return; }

    const { data: urlData } = supabase.storage.from("expedientes").getPublicUrl(nombreUnico);

    const { data: nuevoArchivo, error: errorInsert } = await supabase.from("indicios_archivos").insert([{
      indicio_id: indicio.id,
      tipo_archivo: esVideo ? "video" : "foto",
      url_archivo: urlData.publicUrl,
      nombre_archivo: file.name,
      subido_por: perfil?.nombre_completo || "",
      subido_por_id: perfil?.id || null,
    }]).select().single();

    if (errorInsert) alert("Error al registrar archivo: " + errorInsert.message);
    else setArchivos((prev) => [...prev, nuevoArchivo]);

    setSubiendo(false);
    if (onActualizado) onActualizado();
  };

  const color = tipologiaColor[indicio.tipologia] || "#6b7280";

  return (
    <div style={{ background: "#f9fafb", border: `1px solid ${color}44`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }} onClick={() => setExpandido((v) => !v)}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          {(() => { const TipIcon = tipologiaIcono[indicio.tipologia] || Package; return <TipIcon size={22} style={{ color: tipologiaColor[indicio.tipologia] || "#6b7280" }} />; })()}
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{indicio.tipologia}</span>
              {indicio.cantidad && <span style={{ color: "#7c8494", fontSize: 11 }}>Cant: {indicio.cantidad}</span>}
            </div>
            <div style={{ color: "#1a1a2e", fontSize: 13, marginTop: 4 }}>{indicio.descripcion}</div>
            {indicio.folio_cadena_custodia && <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>Folio cadena de custodia: {indicio.folio_cadena_custodia}</div>}
          </div>
        </div>
        <span style={{ color: "#6b7280", fontSize: 14 }}>{expandido ? "▲" : "▼"}</span>
      </div>

      {expandido && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e8ecf1" }}>
          {archivos.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {archivos.map((a) => (
                a.tipo_archivo === "video" ? (
                  <video key={a.id} src={a.url_archivo} controls style={{ width: 100, height: 70, borderRadius: 6, border: "1px solid #c7cfe0" }} />
                ) : (
                  <img key={a.id} src={a.url_archivo} alt="indicio" style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 6, border: "1px solid #c7cfe0" }} />
                )
              ))}
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*,video/*" style={{ display: "none" }}
            onChange={(e) => { if (e.target.files[0]) subirArchivo(e.target.files[0]); e.target.value = ""; }} />
          <button onClick={() => inputRef.current.click()} disabled={subiendo}
            style={{ ...btnSecondary, padding: "7px 14px", fontSize: 11 }}>
            {subiendo ? "Subiendo…" : "Agregar foto o video"}
          </button>

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #e8ecf1" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ color: COLORS.gold, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}><Link2 size={12} style={{ marginRight: 6, verticalAlign: -2 }} />Cadena de Custodia</div>
              <button onClick={() => setMostrarFormMov((v) => !v)} style={{ ...btnSecondary, padding: "5px 10px", fontSize: 10 }}>
                {mostrarFormMov ? "✕ Cancelar" : "+ Registrar movimiento"}
              </button>
            </div>

            {mostrarFormMov && (
              <div style={{ background: COLORS.white, borderRadius: 7, padding: 10, marginBottom: 10, border: "1px solid #e8ecf1" }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <Input label="Nombre de quien recibe" value={nombreRecibe} onChange={setNombreRecibe} required />
                  <Input label="Motivo del traslado" value={motivoMov} onChange={setMotivoMov} placeholder="Ej. Análisis pericial" required />
                  <Select label="Destino" value={destinoMov} onChange={setDestinoMov} options={DESTINOS_MOVIMIENTO} required />
                </div>
                <button onClick={registrarMovimiento} disabled={guardandoMov} style={{ ...btnPrimary, marginTop: 10, width: "100%", padding: 8, fontSize: 11 }}>
                  {guardandoMov ? "Guardando…" : "Guardar movimiento"}
                </button>
              </div>
            )}

            {movimientos.length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: 11 }}>Sin movimientos registrados. El indicio permanece en su ubicación original.</div>
            ) : (
              movimientos.map((m) => (
                <div key={m.id} style={{ background: COLORS.white, borderRadius: 6, padding: 8, marginBottom: 6, border: "1px solid #e8ecf1" }}>
                  <div style={{ color: "#1a1a2e", fontSize: 11, fontWeight: 600 }}>→ {m.destino}</div>
                  <div style={{ color: "#7c8494", fontSize: 10, marginTop: 2 }}>Recibe: {m.nombre_recibe} · {m.motivo}</div>
                  <div style={{ color: "#6b7280", fontSize: 9, marginTop: 2 }}>{new Date(m.creado_en).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })} · Registró: {m.registrado_por}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function IndiciosAsegurados({ detenidoId, perfil }) {
  const [indicios, setIndicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [tipologia, setTipologia] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [folio, setFolio] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargarIndicios = async () => {
    setCargando(true);
    const { data: indiciosData } = await supabase.from("indicios_asegurados").select("*").eq("detenido_id", detenidoId).order("creado_en", { ascending: false });
    if (indiciosData && indiciosData.length > 0) {
      const ids = indiciosData.map((i) => i.id);
      const { data: archivosData } = await supabase.from("indicios_archivos").select("*").in("indicio_id", ids);
      const conArchivos = indiciosData.map((i) => ({ ...i, _archivos: (archivosData || []).filter((a) => a.indicio_id === i.id) }));
      setIndicios(conArchivos);
    } else {
      setIndicios([]);
    }
    setCargando(false);
  };

  useEffect(() => { cargarIndicios(); }, [detenidoId]);

  const guardarIndicio = async () => {
    if (!tipologia || !descripcion) { alert("Tipología y descripción son obligatorias."); return; }
    setGuardando(true);
    const { error } = await supabase.from("indicios_asegurados").insert([{
      detenido_id: detenidoId,
      tipologia, cantidad, descripcion,
      folio_cadena_custodia: folio,
      registrado_por: perfil?.nombre_completo || "",
      registrado_por_id: perfil?.id || null,
    }]);
    setGuardando(false);
    if (error) { alert("Error al guardar: " + error.message); return; }
    setTipologia(""); setCantidad(""); setDescripcion(""); setFolio(""); setMostrarForm(false);
    cargarIndicios();
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottom: "2px solid #b69054" }}>
        <div style={{ color: COLORS.gold, fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}><Package size={15} />Indicios Asegurados</div>
        <button onClick={() => setMostrarForm((v) => !v)} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 11 }}>
          {mostrarForm ? "✕ Cancelar" : "+ Agregar indicio"}
        </button>
      </div>

      {mostrarForm && (
        <div style={{ background: "#fffbeb", borderRadius: 8, padding: 14, marginBottom: 14, borderLeft: `4px solid ${COLORS.gold}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <Select label="Tipología" value={tipologia} onChange={setTipologia} options={TIPOLOGIAS_INDICIO} required />
            <Input label="Cantidad" value={cantidad} onChange={setCantidad} placeholder="Ej. 1 pieza, 50 gramos" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <TextArea label="Descripción del indicio" value={descripcion} onChange={setDescripcion} rows={2} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <Input label="Folio de cadena de custodia" value={folio} onChange={setFolio} placeholder="Opcional" />
          </div>
          <button onClick={guardarIndicio} disabled={guardando} style={{ ...btnPrimary, width: "100%" }}>
            {guardando ? "GUARDANDO…" : "GUARDAR INDICIO"}
          </button>
        </div>
      )}

      {cargando ? (
        <div style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", padding: 16 }}>Cargando…</div>
      ) : indicios.length === 0 ? (
        <div style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", padding: 16 }}>Aún no se han registrado indicios para este expediente.</div>
      ) : (
        indicios.map((ind) => <IndicioCard key={ind.id} indicio={ind} perfil={perfil} detenidoId={detenidoId} onActualizado={cargarIndicios} />)
      )}
    </div>
  );
}

// ============================================================================
// CO-DETENIDOS DE LA MISMA CARPETA
// ============================================================================
function CoDetenidos({ detenido, perfil, onActualizado }) {
  const [vinculados, setVinculados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  const cargarVinculados = async () => {
    setCargando(true);
    const { data } = await supabase.from("detenidos_vinculados").select("*, vinculado:vinculado_a_id(id, nombre, alias, delito)").eq("detenido_id", detenido.id);
    setVinculados(data || []);
    setCargando(false);
  };

  useEffect(() => { cargarVinculados(); }, [detenido.id]);

  const buscar = async (texto) => {
    setBusqueda(texto);
    if (texto.length < 2) { setResultados([]); return; }
    setBuscando(true);
    const { data } = await supabase.from("detenidos").select("id, nombre, alias, delito").ilike("nombre", `%${texto}%`).neq("id", detenido.id).limit(8);
    setResultados(data || []);
    setBuscando(false);
  };

  const vincular = async (otroDetenido) => {
    const { error } = await supabase.from("detenidos_vinculados").insert([
      { detenido_id: detenido.id, vinculado_a_id: otroDetenido.id, registrado_por: perfil?.nombre_completo || "" },
      { detenido_id: otroDetenido.id, vinculado_a_id: detenido.id, registrado_por: perfil?.nombre_completo || "" },
    ]);
    if (error && !error.message.includes("duplicate")) { alert("Error al vincular: " + error.message); return; }
    setBusqueda(""); setResultados([]);
    cargarVinculados();
    if (onActualizado) onActualizado();
  };

  return (
    <div style={cardStyle}>
      <div style={tituloSeccion}><Users size={15} />Co-detenidos de la misma carpeta</div>

      {detenido.codetenidos_nombres && (
        <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, marginBottom: 12, border: "1px solid #e8ecf1" }}>
          <div style={{ color: "#6b7280", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Nombres anotados al registrar (sin vincular aún)</div>
          {detenido.codetenidos_nombres.split("\n").filter(Boolean).map((n, i) => (
            <div key={i} style={{ color: "#4a5268", fontSize: 13 }}>• {n}</div>
          ))}
        </div>
      )}

      {!cargando && vinculados.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {vinculados.map((v) => (
            <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb", borderRadius: 8, padding: "10px 12px", marginBottom: 6, border: "1px solid #e8ecf1" }}>
              <div>
                <div style={{ color: COLORS.primary, fontSize: 13, fontWeight: 600 }}>{v.vinculado?.nombre}</div>
                <div style={{ color: "#7c8494", fontSize: 11 }}>{v.vinculado?.alias} · {v.vinculado?.delito}</div>
              </div>
              <Link2 size={16} style={{ color: COLORS.gold }} />
            </div>
          ))}
        </div>
      )}

      <div style={{ position: "relative" }}>
        <input value={busqueda} onChange={(e) => buscar(e.target.value)} placeholder="Buscar detenido ya registrado por nombre…"
          style={inputStyle} />
        {busqueda.length >= 2 && (
          <div style={{ background: COLORS.white, border: "1.5px solid #c7cfe0", borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            {buscando ? (
              <div style={{ color: "#6b7280", fontSize: 12, padding: 10 }}>Buscando…</div>
            ) : resultados.length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: 12, padding: 10 }}>Sin resultados.</div>
            ) : (
              resultados.map((r) => (
                <div key={r.id} onClick={() => vincular(r)} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #e8ecf1" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f5ede0"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <div style={{ color: COLORS.primary, fontSize: 13 }}>{r.nombre}</div>
                  <div style={{ color: "#7c8494", fontSize: 11 }}>{r.alias} · {r.delito}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// VÍCTIMAS — en quién recae el delito
// ============================================================================
const TIPOS_AGRAVIO = [
  { value: "identificada", label: "Persona identificada", icono: User },
  { value: "sociedad", label: "La sociedad (sin víctima individual)", icono: Building2 },
  { value: "quien_resulte", label: "Quien resulte (víctima desconocida)", icono: HelpCircle },
];

function Victimas({ detenido, perfil }) {
  const [victimas, setVictimas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [tipoAgravio, setTipoAgravio] = useState("identificada");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [esMenor, setEsMenor] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargarVictimas = async () => {
    setCargando(true);
    const { data } = await supabase.from("victimas").select("*").eq("detenido_id", detenido.id).order("creado_en", { ascending: false });
    setVictimas(data || []);
    setCargando(false);
  };

  useEffect(() => { cargarVictimas(); }, [detenido.id]);

  const guardarVictima = async () => {
    if (tipoAgravio === "identificada" && !nombre) { alert("Escribe el nombre de la víctima identificada."); return; }
    setGuardando(true);
    const { error } = await supabase.from("victimas").insert([{
      detenido_id: detenido.id,
      tipo_agravio: tipoAgravio,
      nombre: tipoAgravio === "identificada" ? nombre : null,
      telefono_contacto: tipoAgravio === "identificada" ? telefono : null,
      es_menor_edad: tipoAgravio === "identificada" ? esMenor : false,
      registrado_por: perfil?.nombre_completo || "", registrado_por_id: perfil?.id || null,
    }]);
    setGuardando(false);
    if (error) { alert("Error al guardar: " + error.message); return; }
    setNombre(""); setTelefono(""); setEsMenor(false); setTipoAgravio("identificada"); setMostrarForm(false);
    cargarVictimas();
  };

  const etiquetaAgravio = (v) => {
    if (v.tipo_agravio === "sociedad") return "En agravio de la sociedad";
    if (v.tipo_agravio === "quien_resulte") return "En agravio de quien resulte";
    return v.nombre;
  };
  const iconoAgravio = (v) => TIPOS_AGRAVIO.find((t) => t.value === v.tipo_agravio)?.icono || User;

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottom: "2px solid #b69054" }}>
        <div style={{ color: COLORS.gold, fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}><User size={15} />Víctima(s) — en quién recae el delito</div>
        <button onClick={() => setMostrarForm((v) => !v)} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 11 }}>
          {mostrarForm ? "✕ Cancelar" : "+ Agregar víctima"}
        </button>
      </div>

      {mostrarForm && (
        <div style={{ background: "#fffbeb", borderRadius: 8, padding: 14, marginBottom: 14, borderLeft: `4px solid ${COLORS.gold}` }}>
          <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
            <label style={labelStyle}>Cometido en agravio de</label>
            {TIPOS_AGRAVIO.map((t) => (
              <button key={t.value} type="button" onClick={() => setTipoAgravio(t.value)}
                style={{ textAlign: "left", background: tipoAgravio === t.value ? "#f5ede0" : COLORS.white, border: `1.5px solid ${tipoAgravio === t.value ? COLORS.gold : "#c7cfe0"}`, borderRadius: 7, padding: "9px 12px", color: tipoAgravio === t.value ? COLORS.primary : "#7c8494", fontSize: 12, cursor: "pointer", fontWeight: tipoAgravio === t.value ? 700 : 400 }}>
                <t.icono size={14} style={{ marginRight: 6, verticalAlign: -3 }} />{t.label}
              </button>
            ))}
          </div>

          {tipoAgravio === "identificada" && (
            <div style={{ display: "grid", gap: 10 }}>
              <Input label="Nombre completo de la víctima" value={nombre} onChange={setNombre} required />
              <Input label="Teléfono de contacto" value={telefono} onChange={setTelefono} placeholder="Opcional" />
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: esMenor ? "#fcebeb" : "transparent", borderRadius: 7, padding: esMenor ? "8px 10px" : 0 }}>
                <input type="checkbox" checked={esMenor} onChange={(e) => setEsMenor(e.target.checked)} style={{ width: 16, height: 16 }} />
                <label style={{ color: "#ef4444", fontSize: 12, fontWeight: 700 }}>⚠ Es persona menor de edad</label>
              </div>
              {esMenor && <div style={{ color: "#791f1f", fontSize: 10 }}>Dato sensible: se manejará conforme a los protocolos de protección de menores vigentes.</div>}
            </div>
          )}

          <button onClick={guardarVictima} disabled={guardando} style={{ ...btnPrimary, marginTop: 12, width: "100%" }}>
            {guardando ? "GUARDANDO…" : "GUARDAR VÍCTIMA"}
          </button>
        </div>
      )}

      {cargando ? (
        <div style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", padding: 16 }}>Cargando…</div>
      ) : victimas.length === 0 ? (
        <div style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", padding: 16 }}>Aún no se han registrado víctimas para este expediente.</div>
      ) : (
        victimas.map((v) => (
          <div key={v.id} style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 12px", marginBottom: 6, border: v.es_menor_edad ? "1px solid #ef444444" : "1px solid #e8ecf1" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: COLORS.primary, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>{(() => { const AgravioIcon = iconoAgravio(v); return <AgravioIcon size={14} />; })()}{etiquetaAgravio(v)}</div>
              {v.es_menor_edad && <span style={{ background: "#ef444422", color: "#791f1f", border: "1px solid #ef444455", borderRadius: 4, padding: "2px 8px", fontSize: 9, fontWeight: 700 }}>MENOR DE EDAD</span>}
            </div>
            {v.telefono_contacto && <div style={{ color: "#7c8494", fontSize: 11, marginTop: 2 }}>Tel: {v.telefono_contacto}</div>}
          </div>
        ))
      )}
    </div>
  );
}

// ============================================================================
// BITÁCORA / LÍNEA DE TIEMPO
// ============================================================================
function Bitacora({ archivos }) {
  const ordenados = [...archivos].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
  const etiqueta = { foto_frente: "Foto de frente", foto_perfil_izq: "Foto perfil izquierdo", foto_perfil_der: "Foto perfil derecho", foto_tatuaje: "Foto de tatuaje", foto_entrega_autoridades: "Foto entrega con autoridades" };

  if (ordenados.length === 0) return null;

  return (
    <div style={cardStyle}>
      <div style={tituloSeccion}><Clock size={15} />Bitácora del Expediente</div>
      {ordenados.map((a) => (
        <div key={a.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ color: "#9ca3af", fontSize: 11, whiteSpace: "nowrap" }}>{new Date(a.creado_en).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</div>
          <div style={{ color: "#4a5268", fontSize: 12 }}>
            <strong style={{ color: COLORS.primary }}>{a.subido_por || "Agente"}</strong> subió {a.categoria === "documento" ? a.tipo_documento : etiqueta[a.categoria]}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// FORMULARIO DE DETENIDOS
// ============================================================================
const initialForm = {
  region: "", zona: "", fecha_deteccion: "", delito: "", lugar_deteccion: "", tipo_deteccion: "",
  latitud: "", longitud: "", codetenidos_nombres: "",
  carpeta_investigacion: "", carpeta_judicial: "", rnd: "",
  oficio_numero: "", hechos_fecha: "", hechos_descripcion: "", mp_firma_nombre: "",
  nombre: "", alias: "", fecha_nacimiento: "", lugar_nacimiento: "", lugar_residencia: "",
  ocupacion: "", sexo: "Masculino", estatura: "", complexion: "", color_piel: "",
  estado_civil: "", escolaridad: "", enfermedades: "", alergias: "", identificacion: "",
  nombre_padre: "", nombre_madre: "", pareja_sentimental: "", telefono_contacto: "",
  vestimenta: "", senas_particulares: "", tatuajes: "", domicilios: "",
  red_facebook: "", red_instagram: "", red_tiktok: "", red_x: "",
};

// ============================================================================
// INTERFAZ AVANZADA DE ROBUSTECIMIENTO (4 pestañas)
// ============================================================================
function InterfazAvanzada({ detenido, perfil, onActualizado }) {
  const [tab, setTab] = useState("datos");
  const [form, setForm] = useState({
    curp: detenido.curp || "",
    nacionalidad: detenido.nacionalidad || "Mexicana",
    situacion_migratoria: detenido.situacion_migratoria || "",
    lengua_nativa: detenido.lengua_nativa || "",
    alerta_delincuencia_organizada: detenido.alerta_delincuencia_organizada || false,
    historial_salud: detenido.historial_salud || "",
    nombre_padre: detenido.nombre_padre || "",
    nombre_madre: detenido.nombre_madre || "",
    pareja_sentimental: detenido.pareja_sentimental || "",
    telefono_contacto: detenido.telefono_contacto || "",
    agencia_mp_receptora: detenido.agencia_mp_receptora || "",
    clave_mp_receptor: detenido.clave_mp_receptor || "",
    fecha_puesta_disposicion: detenido.fecha_puesta_disposicion ? detenido.fecha_puesta_disposicion.slice(0, 16) : "",
    aprehensor_id: detenido.aprehensor_id || "",
    aprehensorTipo: detenido.aprehensor_externo_nombre ? "externo" : "rh",
    aprehensor_externo_nombre: detenido.aprehensor_externo_nombre || "",
    aprehensor_externo_corporacion: detenido.aprehensor_externo_corporacion || "",
    tipo_deteccion: detenido.tipo_deteccion || "",
    red_facebook: detenido.red_facebook || "",
    red_instagram: detenido.red_instagram || "",
    red_tiktok: detenido.red_tiktok || "",
    red_x: detenido.red_x || "",
  });
  const [agentes, setAgentes] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    supabase.from("perfiles").select("id, nombre_completo, grado, region, zona").eq("activo", true)
      .then(({ data }) => setAgentes(data || []));
  }, []);

  const completitud = () => ({
    datos: !!(form.curp && form.nacionalidad),
    contacto: !!(form.nombre_padre || form.nombre_madre || form.telefono_contacto),
    disposicion: !!(form.agencia_mp_receptora && form.fecha_puesta_disposicion),
    aprehensor: form.aprehensorTipo === "externo"
      ? !!(form.aprehensor_externo_nombre && form.aprehensor_externo_corporacion)
      : !!form.aprehensor_id,
  });
  const estado = completitud();
  const todasCompletas = Object.values(estado).every(Boolean);

  const guardar = async (mostrarMensaje = true) => {
    setGuardando(true);
    const esExterno = form.aprehensorTipo === "externo";
    const payload = {
      curp: form.curp, nacionalidad: form.nacionalidad, situacion_migratoria: form.situacion_migratoria,
      lengua_nativa: form.lengua_nativa, alerta_delincuencia_organizada: form.alerta_delincuencia_organizada,
      historial_salud: form.historial_salud,
      nombre_padre: form.nombre_padre, nombre_madre: form.nombre_madre,
      pareja_sentimental: form.pareja_sentimental, telefono_contacto: form.telefono_contacto,
      agencia_mp_receptora: form.agencia_mp_receptora, clave_mp_receptor: form.clave_mp_receptor,
      fecha_puesta_disposicion: form.fecha_puesta_disposicion || null,
      aprehensor_id: esExterno ? null : (form.aprehensor_id || null),
      aprehensor_externo_nombre: esExterno ? form.aprehensor_externo_nombre : null,
      aprehensor_externo_corporacion: esExterno ? form.aprehensor_externo_corporacion : null,
      tipo_deteccion: form.tipo_deteccion || null,
      red_facebook: form.red_facebook || null,
      red_instagram: form.red_instagram || null,
      red_tiktok: form.red_tiktok || null,
      red_x: form.red_x || null,
    };
    const { error } = await supabase.from("detenidos").update(payload).eq("id", detenido.id);
    setGuardando(false);
    if (error) { setMensaje({ tipo: "error", texto: "Error al guardar: " + error.message }); return false; }
    if (mostrarMensaje) setMensaje({ tipo: "ok", texto: "✅ Información actualizada." });
    if (onActualizado) onActualizado();
    return true;
  };

  const finalizarEvento = async () => {
    if (!todasCompletas) {
      setMensaje({ tipo: "error", texto: "⚠ Debes completar las 4 pestañas antes de Finalizar el evento." });
      return;
    }
    const ok = await guardar(false);
    if (!ok) return;
    const { error } = await supabase.from("detenidos").update({ estatus_clave: "finalizado" }).eq("id", detenido.id);
    if (error) { setMensaje({ tipo: "error", texto: "Error al finalizar: " + error.message }); return; }
    setMensaje({ tipo: "ok", texto: "✅ Evento finalizado correctamente." });
    if (onActualizado) onActualizado();
  };

  const tabs = [
    { key: "datos", label: "1. Datos", icono: BadgeCheck, ok: estado.datos },
    { key: "contacto", label: "2. Contacto", icono: Phone, ok: estado.contacto },
    { key: "disposicion", label: "3. Disposición", icono: ClipboardList, ok: estado.disposicion },
    { key: "aprehensor", label: "4. Aprehensor", icono: UserCheck, ok: estado.aprehensor },
  ];

  return (
    <div style={cardStyle}>
      <div style={tituloSeccion}><FolderKanban size={15} />Interfaz Avanzada de Robustecimiento</div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: tab === t.key ? COLORS.primary : "#eef1f6",
            border: `1px solid ${t.ok ? "#22c55e55" : "#c7cfe0"}`,
            borderRadius: 8, padding: "8px 12px", color: tab === t.key ? COLORS.white : "#7c8494",
            fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
          }}>
            <t.icono size={14} /><span>{t.label}</span>
            {t.ok && <CircleCheck size={13} style={{ color: "#22c55e" }} />}
          </button>
        ))}
      </div>

      {tab === "datos" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <InputCURP value={form.curp} onChange={(v) => set("curp", v)} />
          <Input label="Nacionalidad" value={form.nacionalidad} onChange={(v) => set("nacionalidad", v)} required />
          <Select label="Situación migratoria" value={form.situacion_migratoria} onChange={(v) => set("situacion_migratoria", v)} options={SITUACIONES_MIGRATORIAS} />
          <Input label="Lengua nativa" value={form.lengua_nativa} onChange={(v) => set("lengua_nativa", v)} placeholder="Español" />
          <div style={{ gridColumn: "1 / -1" }}>
            <TextArea label="Historial de salud relevante" value={form.historial_salud} onChange={(v) => set("historial_salud", v)} rows={2} />
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={form.alerta_delincuencia_organizada} onChange={(e) => set("alerta_delincuencia_organizada", e.target.checked)} style={{ width: 16, height: 16 }} />
            <label style={{ color: "#ef4444", fontSize: 12, fontWeight: 700 }}>⚠ Alerta de delincuencia organizada</label>
          </div>
          <div style={{ gridColumn: "1 / -1", paddingTop: 10, borderTop: "1px solid #e8ecf1" }}>
            <div style={{ color: COLORS.gold, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}><UserCheck size={13} style={{ marginRight: 5, verticalAlign: -2 }} />Redes Sociales (si se proporcionan después)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Facebook" value={form.red_facebook} onChange={(v) => set("red_facebook", v)} placeholder="Usuario o enlace de perfil" />
              <Input label="Instagram" value={form.red_instagram} onChange={(v) => set("red_instagram", v)} placeholder="Usuario o enlace de perfil" />
              <Input label="TikTok" value={form.red_tiktok} onChange={(v) => set("red_tiktok", v)} placeholder="Usuario o enlace de perfil" />
              <Input label="X (Twitter)" value={form.red_x} onChange={(v) => set("red_x", v)} placeholder="Usuario o enlace de perfil" />
            </div>
          </div>
        </div>
      )}

      {tab === "contacto" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Nombre del padre" value={form.nombre_padre} onChange={(v) => set("nombre_padre", v)} />
          <Input label="Nombre de la madre" value={form.nombre_madre} onChange={(v) => set("nombre_madre", v)} />
          <Input label="Pareja sentimental / Cónyuge" value={form.pareja_sentimental} onChange={(v) => set("pareja_sentimental", v)} placeholder="Ej. Alejandra Serrano López" />
          <Input label="Teléfono de contacto directo" value={form.telefono_contacto} onChange={(v) => set("telefono_contacto", v)} />
        </div>
      )}

      {tab === "disposicion" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Agencia del MP receptora" value={form.agencia_mp_receptora} onChange={(v) => set("agencia_mp_receptora", v)} required />
          <Input label="Clave del MP receptor" value={form.clave_mp_receptor} onChange={(v) => set("clave_mp_receptor", v)} />
          <div style={{ gridColumn: "1 / -1" }}>
            <DateTimePicker24 label="Fecha y hora de puesta a disposición" value={form.fecha_puesta_disposicion} onChange={(v) => set("fecha_puesta_disposicion", v)} required />
          </div>
        </div>
      )}

      {tab === "aprehensor" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button type="button" onClick={() => set("aprehensorTipo", "rh")} style={{ flex: 1, background: (form.aprehensorTipo || "rh") === "rh" ? COLORS.primary : "#eef1f6", border: "1px solid #c7cfe0", borderRadius: 7, padding: "8px", color: (form.aprehensorTipo || "rh") === "rh" ? COLORS.white : "#7c8494", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              <UserCheck size={14} style={{ marginRight: 5, verticalAlign: -3 }} />Personal FGE (buscar en RH)
            </button>
            <button type="button" onClick={() => set("aprehensorTipo", "externo")} style={{ flex: 1, background: form.aprehensorTipo === "externo" ? COLORS.primary : "#eef1f6", border: "1px solid #c7cfe0", borderRadius: 7, padding: "8px", color: form.aprehensorTipo === "externo" ? COLORS.white : "#7c8494", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              <Building2 size={14} style={{ marginRight: 5, verticalAlign: -3 }} />Otra corporación
            </button>
          </div>

          {(form.aprehensorTipo || "rh") === "rh" ? (
            <>
              <label style={labelStyle}>Agente aprehensor (verificado contra RH) <span style={{ color: "#ef4444" }}>*</span></label>
              <select value={form.aprehensor_id} onChange={(e) => set("aprehensor_id", e.target.value)}
                style={selectStyle}>
                <option value="">— Seleccionar agente —</option>
                {agentes.map((a) => <option key={a.id} value={a.id}>{a.nombre_completo} {a.grado ? `— ${a.grado}` : ""}</option>)}
              </select>
              {agentes.length === 0 && <div style={{ color: "#6b7280", fontSize: 11, marginTop: 8 }}>No hay agentes registrados aún en el sistema.</div>}
            </>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <Input label="Nombre del aprehensor" value={form.aprehensor_externo_nombre} onChange={(v) => set("aprehensor_externo_nombre", v)} required />
              <Select label="Corporación" value={form.aprehensor_externo_corporacion} onChange={(v) => set("aprehensor_externo_corporacion", v)}
                options={["Secretaría de Seguridad Pública del Estado", "Secretaría de Seguridad Pública Municipal", "SSPC Federal", "Guardia Nacional", "Otra"]} required />
            </div>
          )}
        </div>
      )}

      {mensaje && (
        <div style={{ background: mensaje.tipo === "ok" ? "#e1f5ee" : "#fcebeb", border: `1px solid ${mensaje.tipo === "ok" ? "#22c55e44" : "#ef444444"}`, borderRadius: 8, padding: 10, marginTop: 14, color: mensaje.tipo === "ok" ? "#0f6e56" : "#791f1f", fontSize: 12 }}>
          {mensaje.texto}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={() => guardar(true)} disabled={guardando} style={{ ...btnSecondary, flex: 1 }}>
          {guardando ? "Guardando…" : "Guardar avance"}
        </button>
        <button onClick={finalizarEvento} disabled={guardando} style={{ ...btnPrimary, flex: 1, background: todasCompletas ? "#0f6e56" : "#e4e2da", color: todasCompletas ? COLORS.white : "#888780" }}>
          {todasCompletas ? "✓ FINALIZAR EVENTO" : "Finalizar (faltan pestañas)"}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SECCIÓN A — BÚSQUEDA OPERATIVA RÁPIDA
// ============================================================================
export function BusquedaOperativa({ perfil, onAbrirDetenido }) {
  const [detenidos, setDetenidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState("");
  const [filtroDelito, setFiltroDelito] = useState("");
  const [filtroRegion, setFiltroRegion] = useState("Todas");

  const cargarDatos = async () => {
    setCargando(true);
    const { data } = await supabase.from("detenidos").select("*").order("creado_en", { ascending: false });
    const lista = data || [];
    if (lista.length > 0) {
      const ids = lista.map((d) => d.id);
      const { data: fotos } = await supabase.from("documentos_expediente").select("detenido_id, url_archivo").eq("categoria", "foto_frente").in("detenido_id", ids);
      const mapaFotos = {};
      (fotos || []).forEach((f) => { if (!mapaFotos[f.detenido_id]) mapaFotos[f.detenido_id] = f.url_archivo; });
      setDetenidos(lista.map((d) => ({ ...d, _fotoFrente: mapaFotos[d.id] })));
    } else {
      setDetenidos(lista);
    }
    setCargando(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  const resultados = detenidos.filter((d) => {
    const q = texto.toLowerCase();
    const matchTexto = !q || (d.nombre || "").toLowerCase().includes(q) || (d.alias || "").toLowerCase().includes(q);
    const matchDelito = !filtroDelito || (d.delito || "").toLowerCase().includes(filtroDelito.toLowerCase());
    const matchRegion = filtroRegion === "Todas" || d.region === filtroRegion;
    return matchTexto && matchDelito && matchRegion;
  });

  const hayFiltros = texto || filtroDelito || filtroRegion !== "Todas";

  return (
    <div>
      <h3 style={{ margin: "0 0 16px 0", color: COLORS.primary, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}><Search size={18} />Búsqueda Operativa Rápida</h3>

      <div style={cardStyle}>
        <div style={{ marginBottom: 12 }}>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre o alias…" autoFocus
            style={{ ...inputStyle, padding: "12px 14px", fontSize: 15 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input value={filtroDelito} onChange={(e) => setFiltroDelito(e.target.value)} placeholder="Filtrar por delito…"
            style={inputStyle} />
          <select value={filtroRegion} onChange={(e) => setFiltroRegion(e.target.value)}
            style={selectStyle}>
            <option value="Todas">Todas las regiones</option>
            {REGIONES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {hayFiltros && (
          <button onClick={() => { setTexto(""); setFiltroDelito(""); setFiltroRegion("Todas"); }}
            style={{ marginTop: 10, background: "none", border: "1px solid #ef444444", borderRadius: 6, padding: "5px 12px", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>
            ✕ Limpiar filtros
          </button>
        )}
      </div>

      {!hayFiltros ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 50, color: "#9ca3af" }}>
          <Search size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
          <div style={{ fontSize: 13 }}>Escribe un nombre, alias, delito o filtra por región para buscar.</div>
        </div>
      ) : cargando ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Buscando…</div>
      ) : resultados.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 40, color: "#9ca3af" }}>Sin resultados para esta búsqueda.</div>
      ) : (
        <>
          <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 10 }}>{resultados.length} resultado(s)</div>
          {resultados.map((d) => {
            return (
              <div key={d.id} onClick={() => onAbrirDetenido(d)} style={{ ...cardStyle, cursor: "pointer", marginBottom: 8, transition: "box-shadow 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"}>
                <div style={{ display: "flex", gap: 12 }}>
                  {d._fotoFrente ? (
                    <img src={d._fotoFrente} alt={d.nombre} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, border: "1px solid #c7cfe0", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: "#f9fafb", border: "1px solid #c7cfe0", display: "flex", alignItems: "center", justifyContent: "center", color: "#c7cfe0", flexShrink: 0 }}><User size={20} /></div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ color: COLORS.primary, fontSize: 14, fontWeight: 700 }}>{d.nombre}</div>
                        <div style={{ color: COLORS.gold, fontSize: 12 }}>{d.alias}</div>
                      </div>
                      <SemaforoBadge detenido={d} />
                    </div>
                    <div style={{ color: "#4a5268", fontSize: 12, marginTop: 6 }}>{d.delito || "—"} · {(d.region || "—").replace("Región ", "")}</div>
                    {(d.carpeta_investigacion || d.rnd) && (
                      <div style={{ color: "#7c8494", fontSize: 10, marginTop: 4, fontFamily: "monospace" }}>
                        {d.carpeta_investigacion && <>Carpeta: {d.carpeta_investigacion}* </>}
                        {d.rnd && <>· R.N.D.: {d.rnd}</>}
                      </div>
                    )}
                  </div>
                </div>
                {(d.latitud && d.longitud) && (
                  <div style={{ marginTop: 6 }}><BotonMapa latitud={d.latitud} longitud={d.longitud} compacto /></div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ============================================================================
// SECCIÓN C — FICHA BÁSICA RESTRINGIDA (consulta histórica)
// ============================================================================
function FichaBasicaRestringida({ detenido, perfil, onVolver }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoSol, setCargandoSol] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [justificacion, setJustificacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    supabase.from("consultas_expediente").insert([{
      detenido_id: detenido.id,
      consultado_por: perfil?.nombre_completo || "",
      consultado_por_id: perfil?.id || null,
      rol_consultor: perfil?.rol || "",
    }]);
  }, [detenido.id]);

  const cargarSolicitudes = async () => {
    setCargandoSol(true);
    const { data } = await supabase.from("solicitudes_edicion").select("*").eq("detenido_id", detenido.id).order("creado_en", { ascending: false });
    setSolicitudes(data || []);
    setCargandoSol(false);
  };

  useEffect(() => { cargarSolicitudes(); }, [detenido.id]);

  const enviarSolicitud = async () => {
    if (!justificacion.trim()) { alert("Escribe la justificación de tu solicitud."); return; }
    setEnviando(true);
    const { error } = await supabase.from("solicitudes_edicion").insert([{
      detenido_id: detenido.id,
      solicitado_por: perfil?.nombre_completo || "",
      solicitado_por_id: perfil?.id || null,
      justificacion,
    }]);
    setEnviando(false);
    if (error) { setMensaje({ tipo: "error", texto: "Error: " + error.message }); return; }
    setJustificacion(""); setMostrarForm(false);
    setMensaje({ tipo: "ok", texto: "✅ Solicitud enviada. Un Coordinador Regional o Director General debe autorizarla." });
    cargarSolicitudes();
  };

  const estadoColor = { pendiente: "#f59e0b", autorizada: "#22c55e", rechazada: "#ef4444" };
  const hayPendiente = solicitudes.some((s) => s.estado === "pendiente");
  const hayAutorizada = solicitudes.some((s) => s.estado === "autorizada");

  return (
    <div>
      <button onClick={onVolver} style={{ ...btnSecondary, padding: "6px 12px", marginBottom: 14 }}>← Volver</button>

      <div style={{ ...cardStyle, background: "#fffbeb", borderLeft: "4px solid #f59e0b", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
        <Lock size={16} color="#854f0b" />
        <span style={{ color: "#854f0b", fontSize: 12 }}>Expediente finalizado — vista de consulta histórica básica. Esta consulta ha quedado registrada.</span>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          {detenido._fotoFrente ? (
            <img src={detenido._fotoFrente} alt="frente" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #c7cfe0" }} />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: 8, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", color: "#c7cfe0" }}><User size={32} /></div>
          )}
          <div>
            <div style={{ color: "#ef4444", fontSize: 11, fontWeight: 700 }}>{detenido.id?.slice(0, 8)}</div>
            <div style={{ color: COLORS.primary, fontSize: 18, fontWeight: 700, marginTop: 2 }}>{detenido.nombre}</div>
            <div style={{ color: COLORS.gold, fontSize: 13 }}>{detenido.alias}</div>
            <div style={{ marginTop: 6 }}><Badge text="Finalizado" color="#6b7280" /></div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
          {[["Delito", detenido.delito], ["Región", detenido.region], ["Fecha de detención", detenido.fecha_deteccion], ["Tipo de detención", detenido.tipo_deteccion]].map(([k, v]) => (
            <div key={k}>
              <div style={{ color: "#9ca3af", fontSize: 11, fontWeight: 600 }}>{k}</div>
              <div style={{ color: COLORS.primary, fontSize: 14, fontWeight: 500, marginTop: 2 }}>{v || "—"}</div>
            </div>
          ))}
        </div>

        {detenido.senas_particulares && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
            <div style={{ color: "#9ca3af", fontSize: 11, fontWeight: 600 }}>Señas particulares</div>
            <div style={{ color: "#374151", fontSize: 13, marginTop: 2 }}>{detenido.senas_particulares}</div>
          </div>
        )}

        {detenido.tatuajes && detenido.tatuajes.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ color: "#9ca3af", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Tatuajes</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {detenido.tatuajes.map((t, i) => <Badge key={i} text={t} color="#a78bfa" />)}
            </div>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 10, borderBottom: "2px solid #b69054" }}>
          <div style={{ color: COLORS.gold, fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}><FilePenLine size={15} />Solicitud de Edición Justificada</div>
          {!hayPendiente && !hayAutorizada && (
            <button onClick={() => setMostrarForm((v) => !v)} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 11 }}>
              {mostrarForm ? "✕ Cancelar" : "+ Solicitar edición"}
            </button>
          )}
        </div>

        {hayAutorizada && (
          <div style={{ background: "#e1f5ee", border: "1px solid #22c55e44", borderRadius: 7, padding: 10, marginBottom: 10, color: "#085041", fontSize: 12 }}>
            ✅ Tu solicitud fue autorizada. Ya puedes regresar y editar este expediente con normalidad.
          </div>
        )}
        {hayPendiente && (
          <div style={{ background: "#fffbeb", border: "1px solid #eab30844", borderRadius: 7, padding: 10, marginBottom: 10, color: "#854f0b", fontSize: 12 }}>
            ⏳ Hay una solicitud pendiente de autorización por un Coordinador Regional o Director General.
          </div>
        )}

        {mostrarForm && (
          <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, marginBottom: 12, border: "1px solid #e8ecf1" }}>
            <TextArea label="Justificación de la solicitud" value={justificacion} onChange={setJustificacion} rows={3} />
            <button onClick={enviarSolicitud} disabled={enviando} style={{ ...btnPrimary, marginTop: 10, width: "100%" }}>
              {enviando ? "Enviando…" : "Enviar solicitud"}
            </button>
          </div>
        )}

        {mensaje && (
          <div style={{ background: mensaje.tipo === "ok" ? "#e1f5ee" : "#fcebeb", border: `1px solid ${mensaje.tipo === "ok" ? "#22c55e44" : "#ef444444"}`, borderRadius: 7, padding: 10, marginBottom: 10, color: mensaje.tipo === "ok" ? "#0f6e56" : "#791f1f", fontSize: 12 }}>
            {mensaje.texto}
          </div>
        )}

        {!cargandoSol && solicitudes.length > 0 && (
          <div>
            <div style={{ color: "#6b7280", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Historial de solicitudes</div>
            {solicitudes.map((s) => (
              <div key={s.id} style={{ background: "#f9fafb", borderRadius: 6, padding: 8, marginBottom: 6, border: "1px solid #e8ecf1" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#4a5268", fontSize: 11 }}>{s.solicitado_por}</span>
                  <Badge text={s.estado} color={estadoColor[s.estado]} />
                </div>
                <div style={{ color: "#7c8494", fontSize: 11, marginTop: 2 }}>{s.justificacion}</div>
                <div style={{ color: "#9ca3af", fontSize: 9, marginTop: 2 }}>{new Date(s.creado_en).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXPEDIENTE POLICIAL VINCULADO POR C.I.
// ============================================================================
function ExpedienteVinculado({ carpeta }) {
  const [oficios, setOficios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [expandido, setExpandido] = useState(false);
  useEffect(() => {
    supabase.from('oficios_investigacion').select('*').eq('carpeta_investigacion', carpeta).order('created_at', { ascending: false })
      .then(({ data }) => { setOficios(data || []); setCargando(false); });
  }, [carpeta]);
  if (cargando) return <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>Buscando expediente...</div>;
  if (oficios.length === 0) return null;
  return (
    <div style={{ background: '#f5ede0', border: '1px solid #b6905440', borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpandido(!expandido)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Briefcase size={18} color="#b69054" />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#001a4d' }}>Expediente Policial Vinculado ({oficios.length} oficio{oficios.length > 1 ? 's' : ''})</span>
        </div>
        <span style={{ fontSize: 12, color: '#b69054', fontWeight: 700 }}>{expandido ? '▲ Cerrar' : '▼ Ver expediente'}</span>
      </div>
      <div style={{ fontSize: 11, color: '#666', marginTop: 4, fontFamily: 'monospace' }}>C.I. {carpeta}</div>
      {expandido && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {oficios.map(o => (
            <div key={o.id} style={{ background: '#ffffff', borderRadius: 8, padding: 14, border: '1px solid #e8ecf1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#001a4d' }}>Oficio #{o.numero_oficio} — {o.delito}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{o.asunto || 'Se solicita investigación'}</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>MP: {o.nombre_mp_emisor || '—'} · Unidad: {o.unidad_emisora || '—'}</div>
                  {o.lugar_hechos && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Lugar: {o.lugar_hechos}{o.municipio ? ', ' + o.municipio : ''}</div>}
                  {o.agente_recibe && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Recibe: {o.agente_recibe}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: o.estatus === 'cumplimentado' ? '#e8f5e9' : o.estatus === 'vencido' ? '#ffebee' : '#fff3e0', color: o.estatus === 'cumplimentado' ? '#2e7d32' : o.estatus === 'vencido' ? '#b71c1c' : '#e65100', display: 'inline-block', textTransform: 'uppercase' }}>{o.estatus || 'recibido'}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{o.fecha_emision || '—'}</div>
                  {o.prioridad && o.prioridad !== 'normal' && <div style={{ fontSize: 10, color: '#dc3545', fontWeight: 700, marginTop: 2 }}>{o.prioridad.toUpperCase()}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MÓDULO PRINCIPAL DE DETENIDOS
// ============================================================================
export default function ModuloDetenidos({ perfil, detenidoInicial, onDetenidoInicialUsado }) {
  const [form, setForm] = useState(initialForm);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [vista, setVista] = useState("nuevo");
  const [detenidos, setDetenidos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [detenidoActivo, setDetenidoActivo] = useState(null);
  const [archivos, setArchivos] = useState([]);
  const [tieneAutorizacion, setTieneAutorizacion] = useState(false);
  const [verificandoAutorizacion, setVerificandoAutorizacion] = useState(true);

  useEffect(() => {
    if (detenidoInicial) {
      setDetenidoActivo(detenidoInicial);
      if (onDetenidoInicialUsado) onDetenidoInicialUsado();
    }
  }, [detenidoInicial]);

  useEffect(() => {
    if (!detenidoActivo) { setTieneAutorizacion(false); return; }
    setVerificandoAutorizacion(true);
    supabase.from("solicitudes_edicion").select("id").eq("detenido_id", detenidoActivo.id).eq("estado", "autorizada").limit(1)
      .then(({ data }) => {
        setTieneAutorizacion((data || []).length > 0);
        setVerificandoAutorizacion(false);
      });
  }, [detenidoActivo?.id]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const cargarDetenidos = async () => {
    setCargando(true);
    const { data } = await supabase.from("detenidos").select("*").order("creado_en", { ascending: false });
    const lista = data || [];
    if (lista.length > 0) {
      const ids = lista.map((d) => d.id);
      const { data: fotos } = await supabase.from("documentos_expediente").select("detenido_id, url_archivo").eq("categoria", "foto_frente").in("detenido_id", ids);
      const mapaFotos = {};
      (fotos || []).forEach((f) => { if (!mapaFotos[f.detenido_id]) mapaFotos[f.detenido_id] = f.url_archivo; });
      setDetenidos(lista.map((d) => ({ ...d, _fotoFrente: mapaFotos[d.id] })));
    } else {
      setDetenidos(lista);
    }
    setCargando(false);
  };

  const cargarArchivos = async (detenidoId) => {
    const { data } = await supabase.from("documentos_expediente").select("*").eq("detenido_id", detenidoId).order("creado_en", { ascending: false });
    setArchivos(data || []);
  };

  useEffect(() => { if (vista === "lista") cargarDetenidos(); }, [vista]);
  useEffect(() => { if (detenidoActivo) cargarArchivos(detenidoActivo.id); }, [detenidoActivo]);

  const [antecedentes, setAntecedentes] = useState([]);
  useEffect(() => {
    if (!detenidoActivo?.nombre) { setAntecedentes([]); return; }
    const palabras = detenidoActivo.nombre.trim().split(/\s+/).filter(p => p.length > 2);
    if (palabras.length < 2) { setAntecedentes([]); return; }
    supabase.from("detenidos").select("id, nombre, alias, delito, carpeta_investigacion, fecha_deteccion, region")
      .neq("id", detenidoActivo.id).ilike("nombre", `%${palabras[0]}%`).ilike("nombre", `%${palabras[palabras.length - 1]}%`)
      .then(({ data }) => setAntecedentes(data || []));
  }, [detenidoActivo?.id]);

  const guardar = async () => {
    if (!form.nombre || !form.delito) { setMensaje({ tipo: "error", texto: "Nombre y delito son obligatorios." }); return; }
    setGuardando(true); setMensaje(null);

    const payload = {
      ...form,
      fecha_deteccion: form.fecha_deteccion || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      hechos_fecha: form.hechos_fecha || null,
      latitud: form.latitud ? parseFloat(form.latitud) : null,
      longitud: form.longitud ? parseFloat(form.longitud) : null,
      tatuajes: form.tatuajes.split("\n").map((s) => s.trim()).filter(Boolean),
      domicilios: form.domicilios.split("\n").map((s) => s.trim()).filter(Boolean),
      autoridad_detiene: "Policía Ministerial",
      registrado_por: perfil?.nombre_completo || "",
    };

    const { data, error } = await supabase.from("detenidos").insert([payload]).select().single();
    setGuardando(false);
    if (error) {
      setMensaje({ tipo: "error", texto: "Error al guardar: " + error.message });
    } else {
      setMensaje({ tipo: "ok", texto: "✅ Detenido registrado. Ahora puedes agregar fotografías y documentos abajo." });
      setDetenidoActivo(data);
      setArchivos([]);
    }
  };

  const listaFiltrada = detenidos.filter((d) => {
    const q = busqueda.toLowerCase();
    if (!q) return true;
    return (d.nombre || "").toLowerCase().includes(q) || (d.alias || "").toLowerCase().includes(q) || (d.delito || "").toLowerCase().includes(q);
  });

  if (detenidoActivo) {
    const esFinalizadoYRolLimitado = detenidoActivo.estatus_clave === "finalizado" && perfil && ["agente", "coordinador"].includes(perfil.rol);

    if (esFinalizadoYRolLimitado && verificandoAutorizacion) {
      return <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Verificando permisos…</div>;
    }

    const esVistaRestringida = esFinalizadoYRolLimitado && !tieneAutorizacion;

    if (esVistaRestringida) {
      const fotoFrente = archivos.find((a) => a.categoria === "foto_frente");
      return <FichaBasicaRestringida detenido={{ ...detenidoActivo, _fotoFrente: fotoFrente?.url_archivo }} perfil={perfil} onVolver={() => { setDetenidoActivo(null); setForm(initialForm); setMensaje(null); }} />;
    }

    return (
      <div>
        <button onClick={() => { setDetenidoActivo(null); setForm(initialForm); setMensaje(null); }} style={{ ...btnSecondary, padding: "6px 12px", marginBottom: 14 }}>← Volver</button>

        {esFinalizadoYRolLimitado && tieneAutorizacion && (
          <div style={{ background: "#e1f5ee", border: "1px solid #22c55e44", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <span style={{ color: "#085041", fontSize: 12 }}>Edición autorizada para este expediente finalizado.</span>
          </div>
        )}

        <div style={cardStyle}>
          {(detenidoActivo.carpeta_investigacion || detenidoActivo.rnd) && (
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
              {detenidoActivo.carpeta_investigacion && (
                <div>
                  <div style={{ color: "#9ca3af", fontSize: 11, fontWeight: 600 }}>Carpeta de Investigación</div>
                  <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 700, fontFamily: "monospace", letterSpacing: 0.5 }}>{detenidoActivo.carpeta_investigacion}*</div>
                </div>
              )}
              {detenidoActivo.rnd && (
                <div>
                  <div style={{ color: "#9ca3af", fontSize: 11, fontWeight: 600 }}>R.N.D.</div>
                  <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 700, fontFamily: "monospace" }}>{detenidoActivo.rnd}</div>
                </div>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            {(() => {
              const fotoFrente = archivos.find((a) => a.categoria === "foto_frente");
              return fotoFrente ? (
                <img src={fotoFrente.url_archivo} alt={detenidoActivo.nombre} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid #c7cfe0", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 8, background: "#f9fafb", border: "1px solid #c7cfe0", display: "flex", alignItems: "center", justifyContent: "center", color: "#c7cfe0", flexShrink: 0 }}><User size={26} /></div>
              );
            })()}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: COLORS.primary, fontSize: 18, fontWeight: 800, marginTop: 2 }}>{detenidoActivo.nombre}</div>
              <div style={{ color: COLORS.gold, fontSize: 13 }}>{detenidoActivo.alias}</div>
              <div style={{ color: "#4a5268", fontSize: 12, marginTop: 4 }}>{detenidoActivo.delito} · {detenidoActivo.region}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                <SemaforoBadge detenido={detenidoActivo} />
                <BotonMapa latitud={detenidoActivo.latitud} longitud={detenidoActivo.longitud} compacto />
              </div>
            </div>
          </div>
        </div>

        <InterfazAvanzada detenido={detenidoActivo} perfil={perfil} onActualizado={async () => {
          const { data } = await supabase.from("detenidos").select("*").eq("id", detenidoActivo.id).single();
          if (data) setDetenidoActivo(data);
        }} />

        {antecedentes.length > 0 && (
          <div style={{ background: "#ffebee", border: "2px solid #ef444460", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <ShieldAlert size={22} color="#dc3545" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#b71c1c" }}>⚠ ALERTA — {antecedentes.length} registro{antecedentes.length > 1 ? "s" : ""} previo{antecedentes.length > 1 ? "s" : ""} detectado{antecedentes.length > 1 ? "s" : ""}</div>
              <div style={{ fontSize: 12, color: "#795548", marginTop: 4 }}>El sistema identificó coincidencias por nombre en otras carpetas de investigación.</div>
              {antecedentes.map(a => (
                <div key={a.id} style={{ marginTop: 8, padding: "8px 12px", background: "#ffffff", borderRadius: 8, border: "1px solid #ef444430" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#001a4d" }}>{a.nombre} {a.alias ? `(${a.alias})` : ""}</div>
                  <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{a.delito} · {a.region} · {a.fecha_deteccion || "—"}</div>
                  {a.carpeta_investigacion && <div style={{ fontSize: 11, color: "#b71c1c", fontFamily: "monospace", marginTop: 2 }}>C.I. {a.carpeta_investigacion}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {detenidoActivo.carpeta_investigacion && (
          <ExpedienteVinculado carpeta={detenidoActivo.carpeta_investigacion} />
        )}

        <Seccion titulo="Fotografías del Detenido" icon={Camera}>
          <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {FOTO_SLOTS.map((slot) => (
              <FotoSlot key={slot.key} slot={slot} detenidoId={detenidoActivo.id} perfil={perfil} archivos={archivos} onSubido={() => cargarArchivos(detenidoActivo.id)} />
            ))}
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <VerificarRostro />
            <CapturaHuellasPRO />
          </div>
        </Seccion>

        <DocumentosExpediente detenidoId={detenidoActivo.id} perfil={perfil} archivos={archivos} onSubido={() => cargarArchivos(detenidoActivo.id)} />

        <IndiciosAsegurados detenidoId={detenidoActivo.id} perfil={perfil} />

        <CoDetenidos detenido={detenidoActivo} perfil={perfil} onActualizado={async () => {
          const { data } = await supabase.from("detenidos").select("*").eq("id", detenidoActivo.id).single();
          if (data) setDetenidoActivo(data);
        }} />

        <Victimas detenido={detenidoActivo} perfil={perfil} />

        <Bitacora archivos={archivos} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        <button onClick={() => setVista("nuevo")} style={{ padding: "10px 20px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, border: vista === "nuevo" ? "2px solid #b69054" : "1px solid #e8ecf1", background: vista === "nuevo" ? "#f5ede0" : "#ffffff", color: vista === "nuevo" ? "#001a4d" : "#666666", fontSize: 14, fontWeight: 700 }}><User size={16} /> Nuevo Detenido</button>
        <button onClick={() => setVista("lista")} style={{ padding: "10px 20px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, border: vista === "lista" ? "2px solid #b69054" : "1px solid #e8ecf1", background: vista === "lista" ? "#f5ede0" : "#ffffff", color: vista === "lista" ? "#001a4d" : "#666666", fontSize: 14, fontWeight: 700 }}><ClipboardList size={16} /> Consultar Base</button>
      </div>

      {vista === "nuevo" && (
        <>
          <Seccion titulo="Datos de la Detención" icon={MapPin}>
            <Select label="Región" value={form.region} onChange={(v) => set("region", v)} options={REGIONES} />
            <Input label="Zona / Coordinación" value={form.zona} onChange={(v) => set("zona", v)} />
            <DatePicker label="Fecha de detención" value={form.fecha_deteccion} onChange={(v) => set("fecha_deteccion", v)} />
            <Input label="Delito" value={form.delito} onChange={(v) => set("delito", v)} required />
            <Select label="Tipo de detención" value={form.tipo_deteccion} onChange={(v) => set("tipo_deteccion", v)} options={TIPOS_DETENCION} required />
            <div style={{ gridColumn: "1 / -1" }}><Input label="Lugar de la detención" value={form.lugar_deteccion} onChange={(v) => set("lugar_deteccion", v)} /></div>
            <Input label="Latitud" value={form.latitud} onChange={(v) => set("latitud", v)} placeholder="Ej. 16.8531200" />
            <Input label="Longitud" value={form.longitud} onChange={(v) => set("longitud", v)} placeholder="Ej. -99.8236500" />
            <div style={{ gridColumn: "1 / -1" }}><InputCarpeta20 value={form.carpeta_investigacion} onChange={(v) => set("carpeta_investigacion", v)} /></div>
            <Input label="Oficio número" value={form.oficio_numero} onChange={(v) => set("oficio_numero", v)} placeholder="Ej. 2187" />
            <Input label="Carpeta judicial" value={form.carpeta_judicial} onChange={(v) => set("carpeta_judicial", v)} placeholder="Pendiente por anexar" />
            <Input label="R.N.D." value={form.rnd} onChange={(v) => set("rnd", v)} placeholder="Ej. GR/FC/029/13062026/0016" />
            <DatePicker label="Fecha en que ocurrieron los hechos" value={form.hechos_fecha} onChange={(v) => set("hechos_fecha", v)} />
            <Input label="Agente del MP que firma el oficio" value={form.mp_firma_nombre} onChange={(v) => set("mp_firma_nombre", v)} placeholder="Ej. Lic. Emmanuel Cupertino Pérez Maury" />
            <div style={{ gridColumn: "1 / -1" }}>
              <TextArea label="Descripción breve de los hechos ocurridos" value={form.hechos_descripcion} onChange={(v) => set("hechos_descripcion", v)} rows={2} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <TextArea label="¿Hubo más detenidos en esta misma carpeta? Escribe sus nombres (uno por línea)" value={form.codetenidos_nombres} onChange={(v) => set("codetenidos_nombres", v)} rows={2} />
              <div style={{ color: "#6b7280", fontSize: 10, marginTop: 4 }}>A cada uno se le creará su propio expediente por separado. Si ya están registrados en el sistema, podrás vincularlos desde el expediente después de guardar.</div>
            </div>
          </Seccion>

          <Seccion titulo="Datos Generales del Detenido" icon={User}>
            <div style={{ gridColumn: "1 / -1" }}><Input label="Nombre completo" value={form.nombre} onChange={(v) => set("nombre", v)} required /></div>
            <Input label="Alias / Apodo" value={form.alias} onChange={(v) => set("alias", v)} />
            <DatePicker label="Fecha de nacimiento" value={form.fecha_nacimiento} onChange={(v) => set("fecha_nacimiento", v)} />
            <Input label="Lugar de nacimiento" value={form.lugar_nacimiento} onChange={(v) => set("lugar_nacimiento", v)} />
            <Input label="Lugar de residencia" value={form.lugar_residencia} onChange={(v) => set("lugar_residencia", v)} />
            <Input label="Ocupación" value={form.ocupacion} onChange={(v) => set("ocupacion", v)} />
            <Select label="Sexo" value={form.sexo} onChange={(v) => set("sexo", v)} options={["Masculino", "Femenino"]} />
            <Input label="Estatura (m)" value={form.estatura} onChange={(v) => set("estatura", v)} placeholder="1.80" />
            <Select label="Complexión" value={form.complexion} onChange={(v) => set("complexion", v)} options={COMPLEXIONES} />
            <Select label="Color de piel" value={form.color_piel} onChange={(v) => set("color_piel", v)} options={TEZ} />
            <Select label="Estado civil" value={form.estado_civil} onChange={(v) => set("estado_civil", v)} options={ESTADOS_CIVILES} />
            <Input label="Último grado de estudios" value={form.escolaridad} onChange={(v) => set("escolaridad", v)} />
            <Input label="Padece alguna enfermedad" value={form.enfermedades} onChange={(v) => set("enfermedades", v)} placeholder="Ninguna" />
            <Input label="Alérgico a algún medicamento" value={form.alergias} onChange={(v) => set("alergias", v)} placeholder="Ninguno" />
            <Select label="Identificación" value={form.identificacion} onChange={(v) => set("identificacion", v)} options={IDENTIFICACIONES} />
          </Seccion>

          <Seccion titulo="Datos Familiares y Contacto" icon={Users}>
            <Input label="Nombre del padre" value={form.nombre_padre} onChange={(v) => set("nombre_padre", v)} />
            <Input label="Nombre de la madre" value={form.nombre_madre} onChange={(v) => set("nombre_madre", v)} />
            <Input label="Pareja sentimental" value={form.pareja_sentimental} onChange={(v) => set("pareja_sentimental", v)} />
            <Input label="Teléfono de contacto" value={form.telefono_contacto} onChange={(v) => set("telefono_contacto", v)} placeholder="No proporcionó" />
          </Seccion>

          <Seccion titulo="Descripción Física" icon={Search}>
            <div style={{ gridColumn: "1 / -1" }}><TextArea label="Vestimenta al momento de la detención" value={form.vestimenta} onChange={(v) => set("vestimenta", v)} rows={2} /></div>
            <div style={{ gridColumn: "1 / -1" }}><TextArea label="Señas particulares" value={form.senas_particulares} onChange={(v) => set("senas_particulares", v)} rows={2} /></div>
            <div style={{ gridColumn: "1 / -1" }}><TextArea label="Tatuajes (uno por línea)" value={form.tatuajes} onChange={(v) => set("tatuajes", v)} rows={3} /></div>
            <div style={{ gridColumn: "1 / -1" }}><TextArea label="Domicilios conocidos (uno por línea)" value={form.domicilios} onChange={(v) => set("domicilios", v)} rows={2} /></div>
          </Seccion>

          <Seccion titulo="Redes Sociales (si las proporciona en entrevista)" icon={UserCheck}>
            <Input label="Facebook" value={form.red_facebook} onChange={(v) => set("red_facebook", v)} placeholder="Usuario o enlace de perfil" />
            <Input label="Instagram" value={form.red_instagram} onChange={(v) => set("red_instagram", v)} placeholder="Usuario o enlace de perfil" />
            <Input label="TikTok" value={form.red_tiktok} onChange={(v) => set("red_tiktok", v)} placeholder="Usuario o enlace de perfil" />
            <Input label="X (Twitter)" value={form.red_x} onChange={(v) => set("red_x", v)} placeholder="Usuario o enlace de perfil" />
          </Seccion>

          {mensaje && (
            <div style={{ background: mensaje.tipo === "ok" ? "#e1f5ee" : "#fcebeb", border: `1px solid ${mensaje.tipo === "ok" ? "#22c55e44" : "#ef444444"}`, borderRadius: 8, padding: 12, marginBottom: 16, color: mensaje.tipo === "ok" ? "#0f6e56" : "#791f1f", fontSize: 13 }}>
              {mensaje.texto}
            </div>
          )}

          <button onClick={guardar} disabled={guardando} style={{ ...btnPrimary, width: "100%", padding: 14, letterSpacing: 1 }}>
            {guardando ? "GUARDANDO…" : "GUARDAR DETENIDO Y CONTINUAR"}
          </button>
        </>
      )}

      {vista === "lista" && (
        <div>
          <style>{`@keyframes parpadeo { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }`}</style>
          {detenidos.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {["verde", "amarillo", "naranja", "negro"].map((c) => {
                const count = detenidos.filter((d) => {
                  const s = calcularSemaforo(d);
                  return s.dot === SEMAFORO[c].dot && (c !== "negro" || s.label === "Omisión de Plazo");
                }).length;
                const etiquetas = { verde: "En Proceso", amarillo: "Por vencer (12h)", naranja: "Alerta (3h)", negro: "Omisión" };
                return (
                  <div key={c} style={{ background: SEMAFORO[c].bg, border: `1px solid ${SEMAFORO[c].border}`, borderRadius: 8, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: SEMAFORO[c].dot }} />
                    <span style={{ color: SEMAFORO[c].texto, fontSize: 11, fontWeight: 700 }}>{count}</span>
                    <span style={{ color: "#7c8494", fontSize: 10 }}>{etiquetas[c]}</span>
                  </div>
                );
              })}
            </div>
          )}
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, alias, delito…"
            style={{ ...inputStyle, marginBottom: 14 }} />
          {cargando ? (
            <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Cargando desde Supabase…</div>
          ) : listaFiltrada.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: "center", padding: 40, color: "#9ca3af" }}>No hay detenidos registrados aún.</div>
          ) : (
            listaFiltrada.map((d) => (
              <div key={d.id} onClick={() => setDetenidoActivo(d)} style={{ ...cardStyle, cursor: "pointer", marginBottom: 10, transition: "box-shadow 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"}>
                <div style={{ display: "flex", gap: 12 }}>
                  {d._fotoFrente ? (
                    <img src={d._fotoFrente} alt={d.nombre} style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8, border: "1px solid #c7cfe0", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 52, height: 52, borderRadius: 8, background: "#f9fafb", border: "1px solid #c7cfe0", display: "flex", alignItems: "center", justifyContent: "center", color: "#c7cfe0", flexShrink: 0 }}><User size={22} /></div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ color: COLORS.primary, fontSize: 15, fontWeight: 700 }}>{d.nombre}</div>
                        <div style={{ color: COLORS.gold, fontSize: 12 }}>{d.alias}</div>
                      </div>
                      <SemaforoBadge detenido={d} />
                    </div>
                    <div style={{ color: "#4a5268", fontSize: 12, marginTop: 6 }}>{d.delito} · {d.region} · {d.fecha_deteccion}</div>
                    {(d.carpeta_investigacion || d.rnd) && (
                      <div style={{ color: "#7c8494", fontSize: 10, marginTop: 4, fontFamily: "monospace" }}>
                        {d.carpeta_investigacion && <>Carpeta: {d.carpeta_investigacion}* </>}
                        {d.rnd && <>· R.N.D.: {d.rnd}</>}
                      </div>
                    )}
                  </div>
                </div>
                {d.fecha_limite_48h && (
                  <div style={{ color: "#6b7280", fontSize: 11, marginTop: 6 }}>⏱ {tiempoRestanteTexto(d.fecha_limite_48h)}</div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 6 }}>
                  {d.registrado_por && <div style={{ color: "#9ca3af", fontSize: 11 }}>Registrado por: {d.registrado_por}</div>}
                  <BotonMapa latitud={d.latitud} longitud={d.longitud} compacto />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
