import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const REGIONES = ["Región Centro","Región Montaña","Región Costa Grande","Región Costa Chica","Región Tierra Caliente","Región Acapulco","Región Norte"];
const COMPLEXIONES = ["Delgada","Regular","Robusta","Obesa"];
const TEZ = ["Blanca","Morena clara","Morena","Morena oscura","Negra"];
const ESTADOS_CIVILES = ["Soltero(a)","Casado(a)","Unión libre","Divorciado(a)","Viudo(a)"];
const IDENTIFICACIONES = ["INE","Pasaporte","Licencia","Cédula profesional","No proporcionó","Otro"];
const TIPOS_DOCUMENTO = ["Boleta de Internamiento","Oficio de Investigación","Pase de Visitas","Oficio de Solicitud a Plataforma México","Oficio de Solicitud a Otras Dependencias","Oficio de Solicitud de Cámaras C2, C4 y C5","Boleta de Libertad Bajo Reservas de Ley","Solicitud de Audiencia (Fecha y Hora Programada)","Otros"];
const TIPOLOGIAS_INDICIO = ["Balístico","Narcóticos","Tecnológico","Vehículo","Bien Inmueble","Arma","Dinero","Otro"];
const DESTINOS_MOVIMIENTO = ["Laboratorio","Bodega de Indicios","Perito","Ministerio Público","Juzgado","Otra autoridad","Devolución al lugar de origen","Otro"];
const TIPOS_DETENCION = ["Flagrancia","Mandamiento Judicial / Orden de Aprehensión","Caso Urgente","Mandamiento Ministerial"];
const tipologiaIcono = { "Balístico": "🎯", "Narcóticos": "💊", "Tecnológico": "💻", "Vehículo": "🚗", "Bien Inmueble": "🏠", "Arma": "🔫", "Dinero": "💵", "Otro": "📦" };
const tipologiaColor = { "Balístico": "#ef4444", "Narcóticos": "#a78bfa", "Tecnológico": "#4a9eff", "Vehículo": "#f59e0b", "Bien Inmueble": "#14b8a6", "Arma": "#7f1d1d", "Dinero": "#22c55e", "Otro": "#5a7a9a" };
const rolLabel = { agente: "Agente", coordinador: "Coordinador de Zona", regional: "Director Regional", mando: "Director General" };
const rolColor = { agente: "#4a9eff", coordinador: "#f59e0b", regional: "#a78bfa", mando: "#ef4444" };

// ─── SEMÁFORO DE 48 HORAS ───────────────────────────────────────────────────────
const SEMAFORO = {
  verde:   { bg: "#0f2a1a", border: "#22c55e", dot: "#22c55e", texto: "#bbf7d0", label: "En Proceso" },
  amarillo:{ bg: "#2a2410", border: "#eab308", dot: "#eab308", texto: "#fde047", label: "En Proceso" },
  naranja: { bg: "#2a1810", border: "#f97316", dot: "#f97316", texto: "#fdba74", label: "Alerta por Vencer" },
  rojo:    { bg: "#2a0f0f", border: "#ef4444", dot: "#ef4444", texto: "#fca5a5", label: "Por vencer" },
  negro:   { bg: "#1f0808", border: "#7f1d1d", dot: "#6b7280", texto: "#9ca3af", label: "Omisión de Plazo" },
};

function calcularSemaforo(detenido) {
  // Si ya tiene un estatus que no es "en_proceso", se respeta tal cual (finalizado, traslado, etc.)
  if (detenido.estatus_clave && detenido.estatus_clave !== "en_proceso") {
    if (detenido.estatus_clave === "omision_plazo") return { ...SEMAFORO.negro, label: "Omisión de Plazo" };
    if (detenido.estatus_clave === "finalizado") return { bg: "#1a1a1a", border: "#6b7280", dot: "#9ca3af", texto: "#d1d5db", label: "Finalizado" };
    return { bg: "#0c1a27", border: "#4a9eff", dot: "#4a9eff", texto: "#cfe3fa", label: detenido.estatus_clave.replace(/_/g, " ") };
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

function SemaforoBadge({ detenido }) {
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
  { key: "foto_frente", label: "Frente", icono: "🙂", multiple: false },
  { key: "foto_perfil_izq", label: "Perfil izquierdo", icono: "👤", multiple: false },
  { key: "foto_perfil_der", label: "Perfil derecho", icono: "👤", multiple: false },
  { key: "foto_tatuaje", label: "Tatuajes / señas", icono: "🔲", multiple: true },
  { key: "foto_entrega_autoridades", label: "Entrega con autoridades", icono: "🤝", multiple: true },
];

// ─── COMPONENTES BASE ───────────────────────────────────────────────────────────
function Input({ label, value, onChange, placeholder = "", type = "text", required = false }) {
  return (
    <div>
      <label style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        style={{ background: "#0c1a27", border: "1px solid #1e3a5f", borderRadius: 7, padding: "9px 12px", color: "#d0e4f4", fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}

function Select({ label, value, onChange, options, required = false }) {
  return (
    <div>
      <label style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ background: "#0c1a27", border: "1px solid #1e3a5f", borderRadius: 7, padding: "9px 12px", color: "#d0e4f4", fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box" }}>
        <option value="">— Seleccionar —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        style={{ background: "#0c1a27", border: "1px solid #1e3a5f", borderRadius: 7, padding: "9px 12px", color: "#d0e4f4", fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
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
      <label style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <button type="button" onClick={() => setAbierto((v) => !v)}
        style={{ background: "#0c1a27", border: "1px solid #1e3a5f", borderRadius: 7, padding: "9px 12px", color: value ? "#d0e4f4" : "#5a7a9a", fontSize: 13, width: "100%", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", boxSizing: "border-box" }}>
        <span>{value ? formatearFechaLegible(value) : "Seleccionar fecha"}</span>
        <span style={{ color: "#4a9eff" }}>📅</span>
      </button>

      {abierto && (
        <div style={{ position: "absolute", zIndex: 50, top: "calc(100% + 6px)", left: 0, background: "#0a1525", border: "1px solid #2a5080", borderRadius: 10, padding: 14, width: 280, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 6 }}>
            <button type="button" onClick={() => cambiarMes(-1)} style={{ background: "#1a3050", border: "none", borderRadius: 6, width: 28, height: 28, color: "#d0e4f4", cursor: "pointer", fontSize: 14 }}>‹</button>
            <select value={mesVista} onChange={(e) => setMesVista(Number(e.target.value))}
              style={{ background: "#0c1a27", border: "1px solid #1e3a5f", borderRadius: 6, padding: "4px 6px", color: "#d0e4f4", fontSize: 12, flex: 1 }}>
              {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select value={anioVista} onChange={(e) => setAnioVista(Number(e.target.value))}
              style={{ background: "#0c1a27", border: "1px solid #1e3a5f", borderRadius: 6, padding: "4px 6px", color: "#d0e4f4", fontSize: 12 }}>
              {anios.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <button type="button" onClick={() => cambiarMes(1)} style={{ background: "#1a3050", border: "none", borderRadius: 6, width: 28, height: 28, color: "#d0e4f4", cursor: "pointer", fontSize: 14 }}>›</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
            {DIAS_SEMANA.map((d, i) => (
              <div key={i} style={{ textAlign: "center", color: "#5a7a9a", fontSize: 10, fontWeight: 700, padding: "4px 0" }}>{d}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {celdas.map((dia, i) => (
              <button key={i} type="button" disabled={!dia} onClick={() => dia && seleccionarDia(dia)}
                style={{
                  background: esSeleccionado(dia) ? "#1a4fa0" : "transparent",
                  border: esHoy(dia) && !esSeleccionado(dia) ? "1px solid #4a9eff" : "1px solid transparent",
                  borderRadius: 6, height: 30, color: !dia ? "transparent" : esSeleccionado(dia) ? "#e8f4ff" : "#c8daea",
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
  // value esperado en formato "YYYY-MM-DDTHH:mm"
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
      <label style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "end" }}>
        <DatePicker label="" value={fechaParte} onChange={(v) => actualizar(v, undefined, undefined)} />
        <div>
          <select value={hh} onChange={(e) => actualizar(undefined, e.target.value, undefined)}
            style={{ background: "#0c1a27", border: "1px solid #1e3a5f", borderRadius: 7, padding: "9px 8px", color: "#d0e4f4", fontSize: 13, outline: "none" }}>
            <option value="">HH</option>
            {horas.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <select value={mm} onChange={(e) => actualizar(undefined, undefined, e.target.value)}
            style={{ background: "#0c1a27", border: "1px solid #1e3a5f", borderRadius: 7, padding: "9px 8px", color: "#d0e4f4", fontSize: 13, outline: "none" }}>
            <option value="">MM</option>
            {minutos.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      {hh && (
        <div style={{ color: "#5a7a9a", fontSize: 10, marginTop: 4 }}>
          Formato 24 horas — {hh}:{mm || "00"} {parseInt(hh) < 12 ? "(antes del mediodía)" : parseInt(hh) === 12 ? "(mediodía)" : "(después del mediodía)"}
        </div>
      )}
    </div>
  );
}

function Badge({ text, color }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 4, padding: "2px 9px", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>{text}</span>;
}

function Seccion({ titulo, color, children }) {
  return (
    <div style={{ background: "#0c1a27", borderRadius: 10, padding: 18, marginBottom: 16, border: "1px solid #1a3050" }}>
      <div style={{ color, fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>{titulo}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>
    </div>
  );
}

// ─── AUTH ───────────────────────────────────────────────────────────────────────
function Auth() {
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [region, setRegion] = useState("");
  const [zona, setZona] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const iniciarSesion = async () => {
    setCargando(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setCargando(false);
    if (error) setError("Correo o contraseña incorrectos.");
  };

  const registrarse = async () => {
    if (!email || !password || !nombreCompleto) { setError("Completa correo, contraseña y nombre."); return; }
    setCargando(true); setError(""); setExito("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setCargando(false); setError("Error al registrar: " + error.message); return; }
    if (data.user) {
      const { error: errorPerfil } = await supabase.from("perfiles").insert([{ id: data.user.id, nombre_completo: nombreCompleto, rol: "agente", region, zona }]);
      if (errorPerfil) setError("Cuenta creada, pero hubo un error guardando el perfil: " + errorPerfil.message);
      else setExito("✅ Cuenta creada correctamente.");
    }
    setCargando(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#070f1a", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Trebuchet MS', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 46, marginBottom: 10 }}>🛡️</div>
          <div style={{ color: "#e8f4ff", fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>FISCALÍA GENERAL DEL ESTADO</div>
          <div style={{ color: "#4a9eff", fontSize: 11, letterSpacing: 3, marginTop: 4 }}>SISTEMA MINISTERIAL — GUERRERO</div>
        </div>
        <div style={{ background: "#0a1525", border: "1px solid #1e3a5f", borderRadius: 14, padding: 26 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "#0c1a27", borderRadius: 8, padding: 4 }}>
            <button onClick={() => { setModo("login"); setError(""); setExito(""); }} style={{ flex: 1, background: modo === "login" ? "#1e3a5f" : "none", border: "none", borderRadius: 6, padding: "8px", color: modo === "login" ? "#e8f4ff" : "#5a7a9a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Iniciar sesión</button>
            <button onClick={() => { setModo("registro"); setError(""); setExito(""); }} style={{ flex: 1, background: modo === "registro" ? "#1e3a5f" : "none", border: "none", borderRadius: 6, padding: "8px", color: modo === "registro" ? "#e8f4ff" : "#5a7a9a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Crear cuenta</button>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {modo === "registro" && (<>
              <Input label="Nombre completo" value={nombreCompleto} onChange={setNombreCompleto} required />
              <Select label="Región" value={region} onChange={setRegion} options={REGIONES} />
              <Input label="Zona / Coordinación" value={zona} onChange={setZona} />
            </>)}
            <Input label="Correo electrónico" value={email} onChange={setEmail} type="email" required />
            <Input label="Contraseña" value={password} onChange={setPassword} type="password" required />
          </div>
          {error && <div style={{ background: "#2a0f0f", border: "1px solid #ef444444", borderRadius: 8, padding: 10, marginTop: 14, color: "#f87171", fontSize: 12 }}>{error}</div>}
          {exito && <div style={{ background: "#0f2a1a", border: "1px solid #22c55e44", borderRadius: 8, padding: 10, marginTop: 14, color: "#4ade80", fontSize: 12 }}>{exito}</div>}
          <button onClick={modo === "login" ? iniciarSesion : registrarse} disabled={cargando}
            style={{ marginTop: 18, width: "100%", background: cargando ? "#1a3050" : "linear-gradient(135deg,#1a4fa0,#0d3070)", border: "none", borderRadius: 8, padding: 12, color: "#e8f4ff", fontSize: 14, fontWeight: 700, cursor: cargando ? "default" : "pointer", letterSpacing: 1 }}>
            {cargando ? "PROCESANDO…" : modo === "login" ? "INGRESAR" : "CREAR CUENTA"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SUBIDA DE UN SLOT DE FOTO ──────────────────────────────────────────────────
// ─── RECONOCIMIENTO FACIAL BÁSICO (alerta orientativa, no oficial) ─────────────
let faceApiCargada = false;
let faceApiCargando = null;

async function cargarFaceApi() {
  if (faceApiCargada) return true;
  if (faceApiCargando) return faceApiCargando;

  faceApiCargando = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js";
    script.onload = async () => {
      try {
        const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
        await Promise.all([
          window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        faceApiCargada = true;
        resolve(true);
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = () => reject(new Error("No se pudo cargar la librería de reconocimiento facial."));
    document.head.appendChild(script);
  });

  return faceApiCargando;
}

async function calcularDescriptorDeImagen(url) {
  const img = await window.faceapi.fetchImage(url);
  const deteccion = await window.faceapi.detectSingleFace(img, new window.faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks().withFaceDescriptor();
  if (!deteccion) return null;
  return Array.from(deteccion.descriptor);
}

function distanciaEuclidiana(a, b) {
  let suma = 0;
  for (let i = 0; i < a.length; i++) suma += (a[i] - b[i]) ** 2;
  return Math.sqrt(suma);
}

function VerificarRostro({ detenido, archivos, perfil }) {
  const [estado, setEstado] = useState("inicial"); // inicial | cargando | sin_foto | resultados | error
  const [resultados, setResultados] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const fotoFrente = archivos.find((a) => a.categoria === "foto_frente");

  const verificar = async () => {
    if (!fotoFrente) { setEstado("sin_foto"); return; }
    setEstado("cargando");
    setErrorMsg("");
    try {
      await cargarFaceApi();

      const descriptorActual = await calcularDescriptorDeImagen(fotoFrente.url_archivo);
      if (!descriptorActual) {
        setEstado("error");
        setErrorMsg("No se detectó un rostro claro en la fotografía de frente. Intenta con otra foto más nítida.");
        return;
      }

      if (!detenido.huella_facial) {
        await supabase.from("detenidos").update({ huella_facial: JSON.stringify(descriptorActual) }).eq("id", detenido.id);
      }

      const { data: otrosDetenidos } = await supabase.from("detenidos")
        .select("id, nombre, alias, delito, region, fecha_deteccion, huella_facial")
        .not("huella_facial", "is", null)
        .neq("id", detenido.id);

      const comparaciones = (otrosDetenidos || []).map((d) => {
        const huellaOtro = JSON.parse(d.huella_facial);
        const distancia = distanciaEuclidiana(descriptorActual, huellaOtro);
        const porcentajeParecido = Math.max(0, Math.round((1 - distancia / 1.0) * 100));
        return { ...d, distancia, porcentajeParecido };
      }).filter((d) => d.distancia < 0.6).sort((a, b) => a.distancia - b.distancia).slice(0, 5);

      setResultados(comparaciones);
      setEstado("resultados");
    } catch (e) {
      setEstado("error");
      setErrorMsg(e.message || "Ocurrió un error al procesar el reconocimiento facial.");
    }
  };

  return (
    <div style={{ background: "#0c1a27", border: "1px solid #1a3050", borderRadius: 10, padding: 14, marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>🔍 Reconocimiento Facial Básico</div>
          <div style={{ color: "#5a7a9a", fontSize: 10, marginTop: 2 }}>Alerta orientativa, no es identificación oficial</div>
        </div>
        <button onClick={verificar} disabled={estado === "cargando"} style={{ background: "#2e1065", border: "1px solid #a78bfa44", borderRadius: 7, padding: "8px 14px", color: "#ddd6fe", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          {estado === "cargando" ? "Analizando…" : "Verificar si ya existe"}
        </button>
      </div>

      {estado === "sin_foto" && (
        <div style={{ marginTop: 10, color: "#f59e0b", fontSize: 12 }}>⚠ Primero sube la fotografía de frente del detenido.</div>
      )}

      {estado === "error" && (
        <div style={{ marginTop: 10, color: "#f87171", fontSize: 12 }}>⚠ {errorMsg}</div>
      )}

      {estado === "resultados" && (
        <div style={{ marginTop: 12 }}>
          {resultados.length === 0 ? (
            <div style={{ color: "#22c55e", fontSize: 12 }}>✓ No se encontraron coincidencias con otros detenidos registrados.</div>
          ) : (
            <>
              <div style={{ color: "#fbbf24", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>⚠ Posibles coincidencias encontradas:</div>
              {resultados.map((r) => (
                <div key={r.id} style={{ background: "#0a1525", borderRadius: 8, padding: 10, marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ color: "#e8f4ff", fontSize: 13, fontWeight: 600 }}>{r.nombre}</div>
                    <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>{r.porcentajeParecido}% parecido</span>
                  </div>
                  <div style={{ color: "#8a9ab0", fontSize: 11, marginTop: 2 }}>{r.alias} · {r.delito}</div>
                  <div style={{ color: "#5a7a9a", fontSize: 11 }}>{r.region} · {r.fecha_deteccion}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}


// ─── SUBIDA DE UN SLOT DE FOTO ──────────────────────────────────────────────────
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
    <div style={{ background: "#0c1a27", border: "1px solid #1a3050", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ color: "#c8daea", fontSize: 12, fontWeight: 700 }}>{slot.icono} {slot.label}</div>
        {existentes.length > 0 && <span style={{ color: "#22c55e", fontSize: 11 }}>✓ {existentes.length}</span>}
      </div>

      {existentes.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {existentes.map((a) => (
            <img key={a.id} src={a.url_archivo} alt={slot.label} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid #1e3a5f" }} />
          ))}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple={slot.multiple} style={{ display: "none" }}
        onChange={(e) => { Array.from(e.target.files).forEach(subirArchivo); e.target.value = ""; }} />
      <button onClick={() => inputRef.current.click()} disabled={subiendo}
        style={{ width: "100%", background: "#1a3050", border: "1px solid #2a5080", borderRadius: 7, padding: "8px", color: "#d0e4f4", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
        {subiendo ? "Subiendo…" : (slot.multiple ? "+ Agregar foto" : existentes.length > 0 ? "Reemplazar" : "📷 Tomar / Subir foto")}
      </button>
    </div>
  );
}

// ─── SUBIDA DE DOCUMENTOS DEL EXPEDIENTE ───────────────────────────────────────
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
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
      .replace(/[^a-zA-Z0-9]+/g, "_") // cualquier cosa que no sea letra/número -> guion bajo
      .replace(/_+/g, "_") // colapsa guiones bajos repetidos
      .replace(/^_|_$/g, ""); // quita guion bajo al inicio/final
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
    <div style={{ background: "#0c1a27", borderRadius: 10, padding: 18, marginBottom: 16, border: "1px solid #1a3050" }}>
      <div style={{ color: "#22c55e", fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>📄 Documentos del Expediente</div>
      <div style={{ color: "#5a7a9a", fontSize: 11, marginBottom: 14 }}>Integra los documentos conforme se generen dentro del plazo constitucional de 48 horas.</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px" }}>
          <Select label="Tipo de documento" value={tipoSeleccionado} onChange={setTipoSeleccionado} options={TIPOS_DOCUMENTO} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <input ref={inputRef} type="file" accept="image/*,.pdf" style={{ display: "none" }}
            onChange={(e) => { if (e.target.files[0]) subirDocumento(e.target.files[0]); e.target.value = ""; }} />
          <button onClick={() => tipoSeleccionado ? inputRef.current.click() : alert("Selecciona primero el tipo de documento.")} disabled={subiendo}
            style={{ background: "#14532d", border: "1px solid #22c55e44", borderRadius: 7, padding: "9px 16px", color: "#bbf7d0", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            {subiendo ? "Subiendo…" : "+ Subir documento"}
          </button>
        </div>
      </div>

      {documentos.length === 0 ? (
        <div style={{ color: "#5a7a9a", fontSize: 12, textAlign: "center", padding: 16 }}>Aún no se han integrado documentos a este expediente.</div>
      ) : (
        documentos.map((d) => (
          <a key={d.id} href={d.url_archivo} target="_blank" rel="noreferrer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a1525", borderRadius: 8, padding: "10px 12px", marginBottom: 6, textDecoration: "none" }}>
            <div>
              <div style={{ color: "#e8f4ff", fontSize: 12, fontWeight: 600 }}>{d.tipo_documento}</div>
              <div style={{ color: "#5a7a9a", fontSize: 10 }}>{d.nombre_archivo}</div>
            </div>
            <span style={{ color: "#4a9eff", fontSize: 11 }}>Ver →</span>
          </a>
        ))
      )}
    </div>
  );
}

// ─── INDICIOS ASEGURADOS ────────────────────────────────────────────────────────
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

  const color = tipologiaColor[indicio.tipologia] || "#5a7a9a";

  return (
    <div style={{ background: "#0a1525", border: `1px solid ${color}44`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }} onClick={() => setExpandido((v) => !v)}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 22 }}>{tipologiaIcono[indicio.tipologia] || "📦"}</span>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{indicio.tipologia}</span>
              {indicio.cantidad && <span style={{ color: "#8a9ab0", fontSize: 11 }}>Cant: {indicio.cantidad}</span>}
            </div>
            <div style={{ color: "#e8f4ff", fontSize: 13, marginTop: 4 }}>{indicio.descripcion}</div>
            {indicio.folio_cadena_custodia && <div style={{ color: "#5a7a9a", fontSize: 11, marginTop: 2 }}>Folio cadena de custodia: {indicio.folio_cadena_custodia}</div>}
          </div>
        </div>
        <span style={{ color: "#5a7a9a", fontSize: 14 }}>{expandido ? "▲" : "▼"}</span>
      </div>

      {expandido && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #1a3050" }}>
          {archivos.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {archivos.map((a) => (
                a.tipo_archivo === "video" ? (
                  <video key={a.id} src={a.url_archivo} controls style={{ width: 100, height: 70, borderRadius: 6, border: "1px solid #1e3a5f" }} />
                ) : (
                  <img key={a.id} src={a.url_archivo} alt="indicio" style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 6, border: "1px solid #1e3a5f" }} />
                )
              ))}
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*,video/*" style={{ display: "none" }}
            onChange={(e) => { if (e.target.files[0]) subirArchivo(e.target.files[0]); e.target.value = ""; }} />
          <button onClick={() => inputRef.current.click()} disabled={subiendo}
            style={{ background: "#1a3050", border: "1px solid #2a5080", borderRadius: 7, padding: "7px 14px", color: "#d0e4f4", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            {subiendo ? "Subiendo…" : "📷🎥 Agregar foto o video"}
          </button>

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #1a3050" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>🔗 Cadena de Custodia</div>
              <button onClick={() => setMostrarFormMov((v) => !v)} style={{ background: "#1a3050", border: "1px solid #2a5080", borderRadius: 6, padding: "5px 10px", color: "#d0e4f4", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                {mostrarFormMov ? "✕ Cancelar" : "+ Registrar movimiento"}
              </button>
            </div>

            {mostrarFormMov && (
              <div style={{ background: "#0c1a27", borderRadius: 7, padding: 10, marginBottom: 10 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <Input label="Nombre de quien recibe" value={nombreRecibe} onChange={setNombreRecibe} required />
                  <Input label="Motivo del traslado" value={motivoMov} onChange={setMotivoMov} placeholder="Ej. Análisis pericial" required />
                  <Select label="Destino" value={destinoMov} onChange={setDestinoMov} options={DESTINOS_MOVIMIENTO} required />
                </div>
                <button onClick={registrarMovimiento} disabled={guardandoMov} style={{ marginTop: 10, width: "100%", background: "#1a3050", border: "1px solid #2a5080", borderRadius: 6, padding: 8, color: "#d0e4f4", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  {guardandoMov ? "Guardando…" : "Guardar movimiento"}
                </button>
              </div>
            )}

            {movimientos.length === 0 ? (
              <div style={{ color: "#5a7a9a", fontSize: 11 }}>Sin movimientos registrados. El indicio permanece en su ubicación original.</div>
            ) : (
              movimientos.map((m) => (
                <div key={m.id} style={{ background: "#0c1a27", borderRadius: 6, padding: 8, marginBottom: 6 }}>
                  <div style={{ color: "#e8f4ff", fontSize: 11, fontWeight: 600 }}>→ {m.destino}</div>
                  <div style={{ color: "#8a9ab0", fontSize: 10, marginTop: 2 }}>Recibe: {m.nombre_recibe} · {m.motivo}</div>
                  <div style={{ color: "#5a7a9a", fontSize: 9, marginTop: 2 }}>{new Date(m.creado_en).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })} · Registró: {m.registrado_por}</div>
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
    <div style={{ background: "#0c1a27", borderRadius: 10, padding: 18, marginBottom: 16, border: "1px solid #1a3050" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ color: "#f59e0b", fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>📦 Indicios Asegurados</div>
        <button onClick={() => setMostrarForm((v) => !v)} style={{ background: "#3a2a0a", border: "1px solid #f59e0b44", borderRadius: 7, padding: "6px 12px", color: "#fde68a", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          {mostrarForm ? "✕ Cancelar" : "+ Agregar indicio"}
        </button>
      </div>

      {mostrarForm && (
        <div style={{ background: "#0a1525", borderRadius: 8, padding: 14, marginBottom: 14 }}>
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
          <button onClick={guardarIndicio} disabled={guardando} style={{ width: "100%", background: guardando ? "#3a2a0a" : "linear-gradient(135deg,#92400e,#713f12)", border: "none", borderRadius: 7, padding: 10, color: "#fde68a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {guardando ? "GUARDANDO…" : "GUARDAR INDICIO"}
          </button>
        </div>
      )}

      {cargando ? (
        <div style={{ color: "#5a7a9a", fontSize: 12, textAlign: "center", padding: 16 }}>Cargando…</div>
      ) : indicios.length === 0 ? (
        <div style={{ color: "#5a7a9a", fontSize: 12, textAlign: "center", padding: 16 }}>Aún no se han registrado indicios para este expediente.</div>
      ) : (
        indicios.map((ind) => <IndicioCard key={ind.id} indicio={ind} perfil={perfil} detenidoId={detenidoId} onActualizado={cargarIndicios} />)
      )}
    </div>
  );
}

// ─── CO-DETENIDOS DE LA MISMA CARPETA ───────────────────────────────────────────
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
    <div style={{ background: "#0c1a27", borderRadius: 10, padding: 18, marginBottom: 16, border: "1px solid #1a3050" }}>
      <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>👥 Co-detenidos de la misma carpeta</div>

      {detenido.codetenidos_nombres && (
        <div style={{ background: "#0a1525", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Nombres anotados al registrar (sin vincular aún)</div>
          {detenido.codetenidos_nombres.split("\n").filter(Boolean).map((n, i) => (
            <div key={i} style={{ color: "#c8daea", fontSize: 13 }}>• {n}</div>
          ))}
        </div>
      )}

      {!cargando && vinculados.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {vinculados.map((v) => (
            <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a1525", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
              <div>
                <div style={{ color: "#e8f4ff", fontSize: 13, fontWeight: 600 }}>{v.vinculado?.nombre}</div>
                <div style={{ color: "#8a9ab0", fontSize: 11 }}>{v.vinculado?.alias} · {v.vinculado?.delito}</div>
              </div>
              <span style={{ color: "#a78bfa", fontSize: 16 }}>🔗</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: "relative" }}>
        <input value={busqueda} onChange={(e) => buscar(e.target.value)} placeholder="Buscar detenido ya registrado por nombre…"
          style={{ background: "#0a1525", border: "1px solid #1e3a5f", borderRadius: 7, padding: "9px 12px", color: "#d0e4f4", fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box" }} />
        {busqueda.length >= 2 && (
          <div style={{ background: "#0a1525", border: "1px solid #2a5080", borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: "auto" }}>
            {buscando ? (
              <div style={{ color: "#5a7a9a", fontSize: 12, padding: 10 }}>Buscando…</div>
            ) : resultados.length === 0 ? (
              <div style={{ color: "#5a7a9a", fontSize: 12, padding: 10 }}>Sin resultados.</div>
            ) : (
              resultados.map((r) => (
                <div key={r.id} onClick={() => vincular(r)} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #1a3050" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#1a3050"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <div style={{ color: "#e8f4ff", fontSize: 13 }}>{r.nombre}</div>
                  <div style={{ color: "#8a9ab0", fontSize: 11 }}>{r.alias} · {r.delito}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── VÍCTIMAS — en quién recae el delito ────────────────────────────────────────
function Victimas({ detenido, perfil }) {
  const [victimas, setVictimas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
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
    if (!nombre) { alert("El nombre de la víctima es obligatorio."); return; }
    setGuardando(true);
    const { error } = await supabase.from("victimas").insert([{
      detenido_id: detenido.id,
      nombre, telefono_contacto: telefono, es_menor_edad: esMenor,
      registrado_por: perfil?.nombre_completo || "", registrado_por_id: perfil?.id || null,
    }]);
    setGuardando(false);
    if (error) { alert("Error al guardar: " + error.message); return; }
    setNombre(""); setTelefono(""); setEsMenor(false); setMostrarForm(false);
    cargarVictimas();
  };

  return (
    <div style={{ background: "#0c1a27", borderRadius: 10, padding: 18, marginBottom: 16, border: "1px solid #1a3050" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ color: "#ec4899", fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>🧍 Víctima(s) — en quién recae el delito</div>
        <button onClick={() => setMostrarForm((v) => !v)} style={{ background: "#3a0a1f", border: "1px solid #ec489944", borderRadius: 7, padding: "6px 12px", color: "#fbcfe8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          {mostrarForm ? "✕ Cancelar" : "+ Agregar víctima"}
        </button>
      </div>

      {mostrarForm && (
        <div style={{ background: "#0a1525", borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <Input label="Nombre completo de la víctima" value={nombre} onChange={setNombre} required />
            <Input label="Teléfono de contacto" value={telefono} onChange={setTelefono} placeholder="Opcional" />
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: esMenor ? "#3a0a1f" : "transparent", borderRadius: 7, padding: esMenor ? "8px 10px" : 0 }}>
              <input type="checkbox" checked={esMenor} onChange={(e) => setEsMenor(e.target.checked)} style={{ width: 16, height: 16 }} />
              <label style={{ color: "#ec4899", fontSize: 12, fontWeight: 700 }}>⚠ Es persona menor de edad</label>
            </div>
            {esMenor && <div style={{ color: "#fbcfe8", fontSize: 10 }}>Dato sensible: se manejará conforme a los protocolos de protección de menores vigentes.</div>}
          </div>
          <button onClick={guardarVictima} disabled={guardando} style={{ marginTop: 12, width: "100%", background: "linear-gradient(135deg,#9d174d,#831843)", border: "none", borderRadius: 7, padding: 10, color: "#fbcfe8", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {guardando ? "GUARDANDO…" : "GUARDAR VÍCTIMA"}
          </button>
        </div>
      )}

      {cargando ? (
        <div style={{ color: "#5a7a9a", fontSize: 12, textAlign: "center", padding: 16 }}>Cargando…</div>
      ) : victimas.length === 0 ? (
        <div style={{ color: "#5a7a9a", fontSize: 12, textAlign: "center", padding: 16 }}>Aún no se han registrado víctimas para este expediente.</div>
      ) : (
        victimas.map((v) => (
          <div key={v.id} style={{ background: "#0a1525", borderRadius: 8, padding: "10px 12px", marginBottom: 6, border: v.es_menor_edad ? "1px solid #ec489944" : "1px solid transparent" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "#e8f4ff", fontSize: 13, fontWeight: 600 }}>{v.nombre}</div>
              {v.es_menor_edad && <span style={{ background: "#ec489922", color: "#fbcfe8", border: "1px solid #ec489955", borderRadius: 4, padding: "2px 8px", fontSize: 9, fontWeight: 700 }}>MENOR DE EDAD</span>}
            </div>
            {v.telefono_contacto && <div style={{ color: "#8a9ab0", fontSize: 11, marginTop: 2 }}>Tel: {v.telefono_contacto}</div>}
          </div>
        ))
      )}
    </div>
  );
}

// ─── BITÁCORA / LÍNEA DE TIEMPO ─────────────────────────────────────────────────
function Bitacora({ archivos }) {
  const ordenados = [...archivos].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
  const etiqueta = { foto_frente: "Foto de frente", foto_perfil_izq: "Foto perfil izquierdo", foto_perfil_der: "Foto perfil derecho", foto_tatuaje: "Foto de tatuaje", foto_entrega_autoridades: "Foto entrega con autoridades" };

  if (ordenados.length === 0) return null;

  return (
    <div style={{ background: "#0c1a27", borderRadius: 10, padding: 18, marginBottom: 16, border: "1px solid #1a3050" }}>
      <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>🕐 Bitácora del Expediente</div>
      {ordenados.map((a) => (
        <div key={a.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #1a3050" }}>
          <div style={{ color: "#5a7a9a", fontSize: 11, whiteSpace: "nowrap" }}>{new Date(a.creado_en).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</div>
          <div style={{ color: "#c8daea", fontSize: 12 }}>
            <strong style={{ color: "#e8f4ff" }}>{a.subido_por || "Agente"}</strong> subió {a.categoria === "documento" ? a.tipo_documento : etiqueta[a.categoria]}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── FORMULARIO DE DETENIDOS ────────────────────────────────────────────────────
const initialForm = {
  region: "", zona: "", fecha_deteccion: "", delito: "", lugar_deteccion: "", tipo_deteccion: "",
  latitud: "", longitud: "", codetenidos_nombres: "",
  carpeta_investigacion: "", carpeta_judicial: "", rnd: "",
  nombre: "", alias: "", fecha_nacimiento: "", lugar_nacimiento: "", lugar_residencia: "",
  ocupacion: "", sexo: "Masculino", estatura: "", complexion: "", color_piel: "",
  estado_civil: "", escolaridad: "", enfermedades: "", alergias: "", identificacion: "",
  nombre_padre: "", nombre_madre: "", pareja_sentimental: "", telefono_contacto: "",
  vestimenta: "", senas_particulares: "", tatuajes: "", domicilios: "",
};

const SITUACIONES_MIGRATORIAS = ["No aplica", "Regular", "Irregular", "En trámite"];

// ─── INTERFAZ AVANZADA DE ROBUSTECIMIENTO (4 pestañas) ─────────────────────────
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
    { key: "datos", label: "1. Datos", icono: "🪪", ok: estado.datos },
    { key: "contacto", label: "2. Contacto", icono: "📞", ok: estado.contacto },
    { key: "disposicion", label: "3. Disposición", icono: "📋", ok: estado.disposicion },
    { key: "aprehensor", label: "4. Aprehensor", icono: "👮", ok: estado.aprehensor },
  ];

  return (
    <div style={{ background: "#0c1a27", borderRadius: 10, padding: 18, marginBottom: 16, border: "1px solid #1a3050" }}>
      <div style={{ color: "#4a9eff", fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>🗂️ Interfaz Avanzada de Robustecimiento</div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: tab === t.key ? "#1e3a5f" : "#0a1525",
            border: `1px solid ${t.ok ? "#22c55e55" : "#2a5080"}`,
            borderRadius: 8, padding: "8px 12px", color: tab === t.key ? "#e8f4ff" : "#8a9ab0",
            fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
          }}>
            <span>{t.icono}</span><span>{t.label}</span>
            {t.ok && <span style={{ color: "#22c55e" }}>✓</span>}
          </button>
        ))}
      </div>

      {tab === "datos" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="CURP" value={form.curp} onChange={(v) => set("curp", v)} required />
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
            <button type="button" onClick={() => set("aprehensorTipo", "rh")} style={{ flex: 1, background: (form.aprehensorTipo || "rh") === "rh" ? "#1e3a5f" : "#0a1525", border: "1px solid #2a5080", borderRadius: 7, padding: "8px", color: (form.aprehensorTipo || "rh") === "rh" ? "#e8f4ff" : "#8a9ab0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              👮 Personal FGE (buscar en RH)
            </button>
            <button type="button" onClick={() => set("aprehensorTipo", "externo")} style={{ flex: 1, background: form.aprehensorTipo === "externo" ? "#1e3a5f" : "#0a1525", border: "1px solid #2a5080", borderRadius: 7, padding: "8px", color: form.aprehensorTipo === "externo" ? "#e8f4ff" : "#8a9ab0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              🏛️ Otra corporación
            </button>
          </div>

          {(form.aprehensorTipo || "rh") === "rh" ? (
            <>
              <label style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Agente aprehensor (verificado contra RH) <span style={{ color: "#ef4444" }}>*</span></label>
              <select value={form.aprehensor_id} onChange={(e) => set("aprehensor_id", e.target.value)}
                style={{ background: "#0a1525", border: "1px solid #1e3a5f", borderRadius: 7, padding: "9px 12px", color: "#d0e4f4", fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box" }}>
                <option value="">— Seleccionar agente —</option>
                {agentes.map((a) => <option key={a.id} value={a.id}>{a.nombre_completo} {a.grado ? `— ${a.grado}` : ""}</option>)}
              </select>
              {agentes.length === 0 && <div style={{ color: "#5a7a9a", fontSize: 11, marginTop: 8 }}>No hay agentes registrados aún en el sistema.</div>}
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
        <div style={{ background: mensaje.tipo === "ok" ? "#0f2a1a" : "#2a0f0f", border: `1px solid ${mensaje.tipo === "ok" ? "#22c55e44" : "#ef444444"}`, borderRadius: 8, padding: 10, marginTop: 14, color: mensaje.tipo === "ok" ? "#4ade80" : "#f87171", fontSize: 12 }}>
          {mensaje.texto}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={() => guardar(true)} disabled={guardando} style={{ flex: 1, background: "#1a3050", border: "1px solid #2a5080", borderRadius: 8, padding: 11, color: "#d0e4f4", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {guardando ? "Guardando…" : "Guardar avance"}
        </button>
        <button onClick={finalizarEvento} disabled={guardando} style={{ flex: 1, background: todasCompletas ? "linear-gradient(135deg,#14532d,#166534)" : "#1a1a1a", border: `1px solid ${todasCompletas ? "#22c55e" : "#3a3a3a"}`, borderRadius: 8, padding: 11, color: todasCompletas ? "#bbf7d0" : "#6b7280", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {todasCompletas ? "✓ FINALIZAR EVENTO" : "Finalizar (faltan pestañas)"}
        </button>
      </div>
    </div>
  );
}


// ─── DASHBOARD DE MANDOS ─────────────────────────────────────────────────────
const COLORES_CHART = ["#4a9eff", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa", "#ec4899", "#14b8a6"];

// ─── REVISIÓN DE SOLICITUDES DE EDICIÓN (Regional / Mando) ─────────────────────
function RevisionSolicitudes({ perfil }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(null);

  const cargarPendientes = async () => {
    setCargando(true);
    const { data } = await supabase.from("solicitudes_edicion")
      .select("*, detenido:detenido_id(id, nombre, alias, delito, region)")
      .eq("estado", "pendiente")
      .order("creado_en", { ascending: true });
    setSolicitudes(data || []);
    setCargando(false);
  };

  useEffect(() => { cargarPendientes(); }, []);

  const resolver = async (solicitudId, nuevoEstado) => {
    setProcesando(solicitudId);
    const { error } = await supabase.from("solicitudes_edicion").update({
      estado: nuevoEstado,
      revisado_por: perfil?.nombre_completo || "",
      revisado_por_id: perfil?.id || null,
      revisado_en: new Date().toISOString(),
    }).eq("id", solicitudId);
    setProcesando(null);
    if (error) { alert("Error: " + error.message); return; }
    cargarPendientes();
  };

  if (cargando) return null;
  if (solicitudes.length === 0) return null;

  return (
    <div style={{ background: "#1a1410", border: "1px solid #f59e0b44", borderRadius: 10, padding: 18, marginBottom: 20 }}>
      <div style={{ color: "#fde68a", fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>⏳ Solicitudes de Edición Pendientes ({solicitudes.length})</div>
      {solicitudes.map((s) => (
        <div key={s.id} style={{ background: "#0c1a27", borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ color: "#e8f4ff", fontSize: 13, fontWeight: 700 }}>{s.detenido?.nombre} <span style={{ color: "#f59e0b", fontWeight: 400 }}>({s.detenido?.alias})</span></div>
              <div style={{ color: "#8a9ab0", fontSize: 11, marginTop: 2 }}>{s.detenido?.delito} · {s.detenido?.region}</div>
              <div style={{ color: "#c8daea", fontSize: 12, marginTop: 6 }}>Solicita: <strong>{s.solicitado_por}</strong></div>
              <div style={{ color: "#a78bfa", fontSize: 12, marginTop: 2, fontStyle: "italic" }}>"{s.justificacion}"</div>
              <div style={{ color: "#5a7a9a", fontSize: 10, marginTop: 4 }}>{new Date(s.creado_en).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => resolver(s.id, "autorizada")} disabled={procesando === s.id}
                style={{ background: "#14532d", border: "1px solid #22c55e55", borderRadius: 6, padding: "6px 12px", color: "#bbf7d0", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                ✓ Autorizar
              </button>
              <button onClick={() => resolver(s.id, "rechazada")} disabled={procesando === s.id}
                style={{ background: "#7f1d1d", border: "1px solid #ef444455", borderRadius: 6, padding: "6px 12px", color: "#fecaca", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                ✕ Rechazar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardMandos({ perfil }) {
  const [detenidos, setDetenidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroRegion, setFiltroRegion] = useState("Todas");

  const cargarDatos = async () => {
    setCargando(true);
    const { data } = await supabase.from("detenidos").select("*");
    setDetenidos(data || []);
    setCargando(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  const esRegional = perfil?.rol === "regional";
  const detenidosVisibles = (esRegional && perfil?.region)
    ? detenidos.filter((d) => d.region === perfil.region)
    : detenidos;

  const detenidosFiltrados = filtroRegion === "Todas" ? detenidosVisibles : detenidosVisibles.filter((d) => d.region === filtroRegion);

  const porSemaforo = { verde: 0, amarillo: 0, naranja: 0, negro: 0, finalizado: 0, otro: 0 };
  detenidosFiltrados.forEach((d) => {
    const s = calcularSemaforo(d);
    if (s.label === "Finalizado") porSemaforo.finalizado++;
    else if (s.label === "Omisión de Plazo") porSemaforo.negro++;
    else if (s.label === "Alerta por Vencer") porSemaforo.naranja++;
    else if (s.dot === SEMAFORO.amarillo.dot) porSemaforo.amarillo++;
    else if (s.dot === SEMAFORO.verde.dot) porSemaforo.verde++;
    else porSemaforo.otro++;
  });

  const datosSemaforo = [
    { name: "En Proceso", value: porSemaforo.verde, color: "#22c55e" },
    { name: "Por vencer (12h)", value: porSemaforo.amarillo, color: "#eab308" },
    { name: "Alerta (3h)", value: porSemaforo.naranja, color: "#f97316" },
    { name: "Omisión", value: porSemaforo.negro, color: "#ef4444" },
    { name: "Finalizado", value: porSemaforo.finalizado, color: "#6b7280" },
  ].filter((d) => d.value > 0);

  const regionesParaGrafica = esRegional && perfil?.region ? [perfil.region] : REGIONES;
  const detPorRegion = regionesParaGrafica.map((r) => ({ name: r.replace("Región ", ""), value: detenidosVisibles.filter((d) => d.region === r).length }));

  const delitos = {};
  detenidosFiltrados.forEach((d) => { if (d.delito) delitos[d.delito] = (delitos[d.delito] || 0) + 1; });
  const delitosData = Object.entries(delitos).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));

  const exportarReporte = () => {
    const lines = [
      `FISCALÍA GENERAL DEL ESTADO DE GUERRERO`,
      `REPORTE — DETENIDOS ACTIVOS EN CUSTODIA`,
      `Región: ${filtroRegion}`,
      `Generado: ${new Date().toLocaleString("es-MX")}`,
      `Generado por: ${perfil?.nombre_completo || ""}`,
      ``,
      `TOTAL DE EXPEDIENTES: ${detenidosFiltrados.length}`,
      ``,
      `POR ESTATUS:`,
      ...datosSemaforo.map((d) => `  ${d.name}: ${d.value}`),
      ``,
      `DELITOS MÁS FRECUENTES:`,
      ...delitosData.map((d) => `  ${d.name}: ${d.value}`),
      ``,
      `DETALLE DE EXPEDIENTES:`,
      ...detenidosFiltrados.map((d) => `  ${d.id?.slice(0, 8)} | ${d.nombre} | ${d.delito || "—"} | ${d.region || "—"} | ${calcularSemaforo(d).label}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reporte_detenidos_${filtroRegion.replace(/\s/g, "_")}_${Date.now()}.txt`;
    a.click();
  };

  if (cargando) return <div style={{ textAlign: "center", padding: 40, color: "#5a7a9a" }}>Cargando dashboard…</div>;

  const puedeRevisarSolicitudes = perfil && ["regional", "mando"].includes(perfil.rol);

  return (
    <div>
      {puedeRevisarSolicitudes && <RevisionSolicitudes perfil={perfil} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div style={{ color: "#5a7a9a", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>Detenidos Activos en Custodia</div>
        <div style={{ display: "flex", gap: 8 }}>
          {!esRegional && (
            <select value={filtroRegion} onChange={(e) => setFiltroRegion(e.target.value)}
              style={{ background: "#0c1a27", border: "1px solid #1a3050", borderRadius: 7, padding: "8px 11px", color: "#d0e4f4", fontSize: 12 }}>
              <option value="Todas">Todo el estado</option>
              {REGIONES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
          <button onClick={exportarReporte} style={{ background: "linear-gradient(135deg,#713f12,#92400e)", border: "none", borderRadius: 8, padding: "8px 16px", color: "#fde68a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>⬇ Descargar reporte</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 22 }}>
        {[
          { label: "Total expedientes", value: detenidosFiltrados.length, color: "#4a9eff", icon: "📁" },
          { label: "En Proceso", value: porSemaforo.verde + porSemaforo.amarillo, color: "#22c55e", icon: "🟢" },
          { label: "Alerta por Vencer", value: porSemaforo.naranja, color: "#f97316", icon: "🟠" },
          { label: "Omisión de Plazo", value: porSemaforo.negro, color: "#ef4444", icon: "⚫" },
          { label: "Finalizados", value: porSemaforo.finalizado, color: "#6b7280", icon: "✅" },
        ].map((c) => (
          <div key={c.label} style={{ background: "#0c1a27", border: `1px solid ${c.color}33`, borderRadius: 10, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: 10, top: 10, fontSize: 22, opacity: 0.15 }}>{c.icon}</div>
            <div style={{ color: "#5a7a9a", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{c.label}</div>
            <div style={{ color: c.color, fontSize: 26, fontWeight: 900, fontFamily: "monospace", marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "#0c1a27", border: "1px solid #1a3050", borderRadius: 10, padding: 16 }}>
          <div style={{ color: "#4a9eff", fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>Estatus de Expedientes</div>
          {datosSemaforo.length === 0 ? <div style={{ color: "#5a7a9a", fontSize: 12 }}>Sin datos aún</div> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={datosSemaforo} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, value }) => `${value}`} labelLine={false} fontSize={11}>
                  {datosSemaforo.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0a1525", border: "1px solid #1a3050", color: "#c8daea", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 10, color: "#8a9ab0" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: "#0c1a27", border: "1px solid #1a3050", borderRadius: 10, padding: 16 }}>
          <div style={{ color: "#f59e0b", fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>{esRegional ? "Detenidos en mi Región" : "Detenidos por Región"}</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={detPorRegion} margin={{ top: 0, right: 10, left: -20, bottom: 30 }}>
              <XAxis dataKey="name" tick={{ fill: "#5a7a9a", fontSize: 9 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fill: "#5a7a9a", fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0a1525", border: "1px solid #1a3050", color: "#c8daea", fontSize: 12 }} />
              <Bar dataKey="value" fill="#4a9eff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: "#0c1a27", border: "1px solid #1a3050", borderRadius: 10, padding: 16 }}>
        <div style={{ color: "#a78bfa", fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>Delitos más frecuentes</div>
        {delitosData.length === 0 ? <div style={{ color: "#5a7a9a", fontSize: 12 }}>Sin datos aún</div> : (
          <ResponsiveContainer width="100%" height={Math.max(140, delitosData.length * 36)}>
            <BarChart data={delitosData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: "#5a7a9a", fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#c8daea", fontSize: 11 }} width={140} />
              <Tooltip contentStyle={{ background: "#0a1525", border: "1px solid #1a3050", color: "#c8daea", fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {delitosData.map((_, i) => <Cell key={i} fill={COLORES_CHART[i % COLORES_CHART.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}


// ─── SECCIÓN A — BÚSQUEDA OPERATIVA RÁPIDA ─────────────────────────────────────
function BusquedaOperativa({ perfil, onAbrirDetenido }) {
  const [detenidos, setDetenidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState("");
  const [filtroDelito, setFiltroDelito] = useState("");
  const [filtroRegion, setFiltroRegion] = useState("Todas");

  const cargarDatos = async () => {
    setCargando(true);
    const { data } = await supabase.from("detenidos").select("*").order("creado_en", { ascending: false });
    setDetenidos(data || []);
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
      <div style={{ color: "#5a7a9a", fontSize: 11, letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" }}>🔍 Búsqueda Operativa Rápida</div>

      <div style={{ background: "#0c1a27", border: "1px solid #1a3050", borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre o alias…" autoFocus
            style={{ background: "#0a1525", border: "1px solid #1e3a5f", borderRadius: 8, padding: "12px 14px", color: "#e8f4ff", fontSize: 15, width: "100%", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input value={filtroDelito} onChange={(e) => setFiltroDelito(e.target.value)} placeholder="Filtrar por delito…"
            style={{ background: "#0a1525", border: "1px solid #1e3a5f", borderRadius: 7, padding: "9px 12px", color: "#d0e4f4", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          <select value={filtroRegion} onChange={(e) => setFiltroRegion(e.target.value)}
            style={{ background: "#0a1525", border: "1px solid #1e3a5f", borderRadius: 7, padding: "9px 12px", color: "#d0e4f4", fontSize: 13, outline: "none" }}>
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
        <div style={{ textAlign: "center", padding: 50, color: "#5a7a9a" }}>
          <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.4 }}>🔍</div>
          <div style={{ fontSize: 13 }}>Escribe un nombre, alias, delito o filtra por región para buscar.</div>
        </div>
      ) : cargando ? (
        <div style={{ textAlign: "center", padding: 40, color: "#5a7a9a" }}>Buscando…</div>
      ) : resultados.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#5a7a9a" }}>Sin resultados para esta búsqueda.</div>
      ) : (
        <>
          <div style={{ color: "#5a7a9a", fontSize: 11, marginBottom: 10 }}>{resultados.length} resultado(s)</div>
          {resultados.map((d) => {
            const s = calcularSemaforo(d);
            return (
              <div key={d.id} onClick={() => onAbrirDetenido(d)} style={{ background: "#0c1a27", border: "1px solid #1a3050", borderRadius: 10, padding: 14, marginBottom: 8, cursor: "pointer" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#2a5080"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#1a3050"}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ color: "#e8f4ff", fontSize: 14, fontWeight: 700 }}>{d.nombre}</div>
                    <div style={{ color: "#f59e0b", fontSize: 12 }}>{d.alias}</div>
                  </div>
                  <SemaforoBadge detenido={d} />
                </div>
                <div style={{ color: "#c8daea", fontSize: 12, marginTop: 6 }}>{d.delito || "—"} · {(d.region || "—").replace("Región ", "")}</div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}


// ─── SECCIÓN C — FICHA BÁSICA RESTRINGIDA (consulta histórica) ─────────────────
function FichaBasicaRestringida({ detenido, perfil, onVolver }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoSol, setCargandoSol] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [justificacion, setJustificacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    // Registro automático de la consulta — bitácora silenciosa
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
      <button onClick={onVolver} style={{ background: "none", border: "none", color: "#4a9eff", fontSize: 13, cursor: "pointer", marginBottom: 14, padding: 0 }}>← Volver</button>

      <div style={{ background: "#1a1410", border: "1px solid #f59e0b44", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>🔒</span>
        <span style={{ color: "#fde68a", fontSize: 12 }}>Expediente finalizado — vista de consulta histórica básica. Esta consulta ha quedado registrada.</span>
      </div>

      <div style={{ background: "#0c1a27", borderRadius: 10, padding: 18, marginBottom: 16, border: "1px solid #1a3050" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          {detenido._fotoFrente ? (
            <img src={detenido._fotoFrente} alt="frente" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #1e3a5f" }} />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: 8, background: "#0a1525", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#5a7a9a" }}>👤</div>
          )}
          <div>
            <div style={{ color: "#ef4444", fontSize: 11, fontWeight: 700 }}>{detenido.id?.slice(0, 8)}</div>
            <div style={{ color: "#e8f4ff", fontSize: 18, fontWeight: 700, marginTop: 2 }}>{detenido.nombre}</div>
            <div style={{ color: "#f59e0b", fontSize: 13 }}>{detenido.alias}</div>
            <div style={{ marginTop: 6 }}><Badge text="Finalizado" color="#6b7280" /></div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16, paddingTop: 16, borderTop: "1px solid #1a3050" }}>
          {[["Delito", detenido.delito], ["Región", detenido.region], ["Fecha de detención", detenido.fecha_deteccion], ["Tipo de detención", detenido.tipo_deteccion]].map(([k, v]) => (
            <div key={k}>
              <div style={{ color: "#5a7a9a", fontSize: 9, letterSpacing: 1, textTransform: "uppercase" }}>{k}</div>
              <div style={{ color: "#c8daea", fontSize: 13, marginTop: 2 }}>{v || "—"}</div>
            </div>
          ))}
        </div>

        {detenido.senas_particulares && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #1a3050" }}>
            <div style={{ color: "#5a7a9a", fontSize: 9, letterSpacing: 1, textTransform: "uppercase" }}>Señas particulares</div>
            <div style={{ color: "#c8daea", fontSize: 13, marginTop: 2 }}>{detenido.senas_particulares}</div>
          </div>
        )}

        {detenido.tatuajes && detenido.tatuajes.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ color: "#5a7a9a", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Tatuajes</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {detenido.tatuajes.map((t, i) => <Badge key={i} text={t} color="#a78bfa" />)}
            </div>
          </div>
        )}
      </div>

      <div style={{ background: "#0c1a27", borderRadius: 10, padding: 18, border: "1px solid #1a3050" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>📝 Solicitud de Edición Justificada</div>
          {!hayPendiente && !hayAutorizada && (
            <button onClick={() => setMostrarForm((v) => !v)} style={{ background: "#2e1065", border: "1px solid #a78bfa44", borderRadius: 7, padding: "6px 12px", color: "#ddd6fe", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {mostrarForm ? "✕ Cancelar" : "+ Solicitar edición"}
            </button>
          )}
        </div>

        {hayAutorizada && (
          <div style={{ background: "#0f2a1a", border: "1px solid #22c55e44", borderRadius: 7, padding: 10, marginBottom: 10, color: "#bbf7d0", fontSize: 12 }}>
            ✅ Tu solicitud fue autorizada. Ya puedes regresar y editar este expediente con normalidad.
          </div>
        )}
        {hayPendiente && (
          <div style={{ background: "#2a2410", border: "1px solid #eab30844", borderRadius: 7, padding: 10, marginBottom: 10, color: "#fde047", fontSize: 12 }}>
            ⏳ Hay una solicitud pendiente de autorización por un Coordinador Regional o Director General.
          </div>
        )}

        {mostrarForm && (
          <div style={{ background: "#0a1525", borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <TextArea label="Justificación de la solicitud" value={justificacion} onChange={setJustificacion} rows={3} />
            <button onClick={enviarSolicitud} disabled={enviando} style={{ marginTop: 10, width: "100%", background: "linear-gradient(135deg,#4c1d95,#5b21b6)", border: "none", borderRadius: 7, padding: 10, color: "#ddd6fe", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {enviando ? "Enviando…" : "Enviar solicitud"}
            </button>
          </div>
        )}

        {mensaje && (
          <div style={{ background: mensaje.tipo === "ok" ? "#0f2a1a" : "#2a0f0f", border: `1px solid ${mensaje.tipo === "ok" ? "#22c55e44" : "#ef444444"}`, borderRadius: 7, padding: 10, marginBottom: 10, color: mensaje.tipo === "ok" ? "#4ade80" : "#f87171", fontSize: 12 }}>
            {mensaje.texto}
          </div>
        )}

        {!cargandoSol && solicitudes.length > 0 && (
          <div>
            <div style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Historial de solicitudes</div>
            {solicitudes.map((s) => (
              <div key={s.id} style={{ background: "#0a1525", borderRadius: 6, padding: 8, marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#c8daea", fontSize: 11 }}>{s.solicitado_por}</span>
                  <Badge text={s.estado} color={estadoColor[s.estado]} />
                </div>
                <div style={{ color: "#8a9ab0", fontSize: 11, marginTop: 2 }}>{s.justificacion}</div>
                <div style={{ color: "#5a7a9a", fontSize: 9, marginTop: 2 }}>{new Date(s.creado_en).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



function ModuloDetenidos({ perfil, detenidoInicial, onDetenidoInicialUsado }) {
  const [form, setForm] = useState(initialForm);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [vista, setVista] = useState("nuevo");
  const [detenidos, setDetenidos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [detenidoActivo, setDetenidoActivo] = useState(null);
  const [archivos, setArchivos] = useState([]);

  useEffect(() => {
    if (detenidoInicial) {
      setDetenidoActivo(detenidoInicial);
      if (onDetenidoInicialUsado) onDetenidoInicialUsado();
    }
  }, [detenidoInicial]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const cargarDetenidos = async () => {
    setCargando(true);
    const { data } = await supabase.from("detenidos").select("*").order("creado_en", { ascending: false });
    setDetenidos(data || []);
    setCargando(false);
  };

  const cargarArchivos = async (detenidoId) => {
    const { data } = await supabase.from("documentos_expediente").select("*").eq("detenido_id", detenidoId).order("creado_en", { ascending: false });
    setArchivos(data || []);
  };

  useEffect(() => { if (vista === "lista") cargarDetenidos(); }, [vista]);
  useEffect(() => { if (detenidoActivo) cargarArchivos(detenidoActivo.id); }, [detenidoActivo]);

  const guardar = async () => {
    if (!form.nombre || !form.delito) { setMensaje({ tipo: "error", texto: "Nombre y delito son obligatorios." }); return; }
    setGuardando(true); setMensaje(null);

    const payload = {
      ...form,
      fecha_deteccion: form.fecha_deteccion || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
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
    const esVistaRestringida = detenidoActivo.estatus_clave === "finalizado" && perfil && ["agente", "coordinador"].includes(perfil.rol);

    if (esVistaRestringida) {
      const fotoFrente = archivos.find((a) => a.categoria === "foto_frente");
      return <FichaBasicaRestringida detenido={{ ...detenidoActivo, _fotoFrente: fotoFrente?.url_archivo }} perfil={perfil} onVolver={() => { setDetenidoActivo(null); setForm(initialForm); setMensaje(null); }} />;
    }

    return (
      <div>
        <button onClick={() => { setDetenidoActivo(null); setForm(initialForm); setMensaje(null); }} style={{ background: "none", border: "none", color: "#4a9eff", fontSize: 13, cursor: "pointer", marginBottom: 14, padding: 0 }}>← Volver</button>

        <div style={{ background: "#0c1a27", borderRadius: 10, padding: 16, marginBottom: 16, border: "1px solid #1a3050" }}>
          <div style={{ color: "#ef4444", fontSize: 11, fontWeight: 700 }}>{detenidoActivo.id?.slice(0, 8)}</div>
          <div style={{ color: "#e8f4ff", fontSize: 18, fontWeight: 700, marginTop: 2 }}>{detenidoActivo.nombre}</div>
          <div style={{ color: "#f59e0b", fontSize: 13 }}>{detenidoActivo.alias}</div>
          <div style={{ color: "#c8daea", fontSize: 12, marginTop: 4 }}>{detenidoActivo.delito} · {detenidoActivo.region}</div>
          <div style={{ marginTop: 8 }}><SemaforoBadge detenido={detenidoActivo} /></div>
        </div>

        <InterfazAvanzada detenido={detenidoActivo} perfil={perfil} onActualizado={async () => {
          const { data } = await supabase.from("detenidos").select("*").eq("id", detenidoActivo.id).single();
          if (data) setDetenidoActivo(data);
        }} />

        <Seccion titulo="📸 Fotografías del Detenido" color="#4a9eff">
          <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {FOTO_SLOTS.map((slot) => (
              <FotoSlot key={slot.key} slot={slot} detenidoId={detenidoActivo.id} perfil={perfil} archivos={archivos} onSubido={() => cargarArchivos(detenidoActivo.id)} />
            ))}
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <VerificarRostro detenido={detenidoActivo} archivos={archivos} perfil={perfil} />
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
      <div style={{ display: "flex", gap: 6, marginBottom: 18, background: "#0a1525", borderRadius: 10, padding: 6, width: "fit-content" }}>
        <button onClick={() => setVista("nuevo")} style={{ background: vista === "nuevo" ? "#1e3a5f" : "none", border: "none", borderRadius: 8, padding: "8px 16px", color: vista === "nuevo" ? "#e8f4ff" : "#5a7a9a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Nuevo Detenido</button>
        <button onClick={() => setVista("lista")} style={{ background: vista === "lista" ? "#1e3a5f" : "none", border: "none", borderRadius: 8, padding: "8px 16px", color: vista === "lista" ? "#e8f4ff" : "#5a7a9a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📋 Consultar Base</button>
      </div>

      {vista === "nuevo" && (
        <>
          <Seccion titulo="📍 Datos de la Detención" color="#ef4444">
            <Select label="Región" value={form.region} onChange={(v) => set("region", v)} options={REGIONES} />
            <Input label="Zona / Coordinación" value={form.zona} onChange={(v) => set("zona", v)} />
            <DatePicker label="Fecha de detención" value={form.fecha_deteccion} onChange={(v) => set("fecha_deteccion", v)} />
            <Input label="Delito" value={form.delito} onChange={(v) => set("delito", v)} required />
            <Select label="Tipo de detención" value={form.tipo_deteccion} onChange={(v) => set("tipo_deteccion", v)} options={TIPOS_DETENCION} required />
            <div style={{ gridColumn: "1 / -1" }}><Input label="Lugar de la detención" value={form.lugar_deteccion} onChange={(v) => set("lugar_deteccion", v)} /></div>
            <Input label="Latitud" value={form.latitud} onChange={(v) => set("latitud", v)} placeholder="Ej. 16.8531200" />
            <Input label="Longitud" value={form.longitud} onChange={(v) => set("longitud", v)} placeholder="Ej. -99.8236500" />
            <Input label="Carpeta de investigación" value={form.carpeta_investigacion} onChange={(v) => set("carpeta_investigacion", v)} placeholder="Pendiente por anexar" />
            <Input label="Carpeta judicial" value={form.carpeta_judicial} onChange={(v) => set("carpeta_judicial", v)} placeholder="Pendiente por anexar" />
            <Input label="R.N.D." value={form.rnd} onChange={(v) => set("rnd", v)} placeholder="Pendiente por anexar" />
            <div style={{ gridColumn: "1 / -1" }}>
              <TextArea label="¿Hubo más detenidos en esta misma carpeta? Escribe sus nombres (uno por línea)" value={form.codetenidos_nombres} onChange={(v) => set("codetenidos_nombres", v)} rows={2} />
              <div style={{ color: "#5a7a9a", fontSize: 10, marginTop: 4 }}>A cada uno se le creará su propio expediente por separado. Si ya están registrados en el sistema, podrás vincularlos desde el expediente después de guardar.</div>
            </div>
          </Seccion>

          <Seccion titulo="👤 Datos Generales del Detenido" color="#4a9eff">
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

          <Seccion titulo="👨‍👩‍👧 Datos Familiares y Contacto" color="#f59e0b">
            <Input label="Nombre del padre" value={form.nombre_padre} onChange={(v) => set("nombre_padre", v)} />
            <Input label="Nombre de la madre" value={form.nombre_madre} onChange={(v) => set("nombre_madre", v)} />
            <Input label="Pareja sentimental" value={form.pareja_sentimental} onChange={(v) => set("pareja_sentimental", v)} />
            <Input label="Teléfono de contacto" value={form.telefono_contacto} onChange={(v) => set("telefono_contacto", v)} placeholder="No proporcionó" />
          </Seccion>

          <Seccion titulo="🔍 Descripción Física" color="#a78bfa">
            <div style={{ gridColumn: "1 / -1" }}><TextArea label="Vestimenta al momento de la detención" value={form.vestimenta} onChange={(v) => set("vestimenta", v)} rows={2} /></div>
            <div style={{ gridColumn: "1 / -1" }}><TextArea label="Señas particulares" value={form.senas_particulares} onChange={(v) => set("senas_particulares", v)} rows={2} /></div>
            <div style={{ gridColumn: "1 / -1" }}><TextArea label="Tatuajes (uno por línea)" value={form.tatuajes} onChange={(v) => set("tatuajes", v)} rows={3} /></div>
            <div style={{ gridColumn: "1 / -1" }}><TextArea label="Domicilios conocidos (uno por línea)" value={form.domicilios} onChange={(v) => set("domicilios", v)} rows={2} /></div>
          </Seccion>

          {mensaje && (
            <div style={{ background: mensaje.tipo === "ok" ? "#0f2a1a" : "#2a0f0f", border: `1px solid ${mensaje.tipo === "ok" ? "#22c55e44" : "#ef444444"}`, borderRadius: 8, padding: 12, marginBottom: 16, color: mensaje.tipo === "ok" ? "#4ade80" : "#f87171", fontSize: 13 }}>
              {mensaje.texto}
            </div>
          )}

          <button onClick={guardar} disabled={guardando} style={{ width: "100%", background: guardando ? "#1a3050" : "linear-gradient(135deg,#1a4fa0,#0d3070)", border: "none", borderRadius: 9, padding: 14, color: "#e8f4ff", fontSize: 14, fontWeight: 700, cursor: guardando ? "default" : "pointer", letterSpacing: 1 }}>
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
                    <span style={{ color: "#8a9ab0", fontSize: 10 }}>{etiquetas[c]}</span>
                  </div>
                );
              })}
            </div>
          )}
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, alias, delito…"
            style={{ background: "#0c1a27", border: "1px solid #1e3a5f", borderRadius: 8, padding: "10px 14px", color: "#d0e4f4", fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
          {cargando ? (
            <div style={{ textAlign: "center", padding: 40, color: "#5a7a9a" }}>Cargando desde Supabase…</div>
          ) : listaFiltrada.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#5a7a9a" }}>No hay detenidos registrados aún.</div>
          ) : (
            listaFiltrada.map((d) => (
              <div key={d.id} onClick={() => setDetenidoActivo(d)} style={{ background: "#0c1a27", border: "1px solid #1a3050", borderRadius: 10, padding: 14, marginBottom: 10, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ color: "#e8f4ff", fontSize: 15, fontWeight: 700 }}>{d.nombre}</div>
                    <div style={{ color: "#f59e0b", fontSize: 12 }}>{d.alias}</div>
                  </div>
                  <SemaforoBadge detenido={d} />
                </div>
                <div style={{ color: "#c8daea", fontSize: 12, marginTop: 6 }}>{d.delito} · {d.region} · {d.fecha_deteccion}</div>
                {d.fecha_limite_48h && (
                  <div style={{ color: "#5a7a9a", fontSize: 11, marginTop: 4 }}>⏱ {tiempoRestanteTexto(d.fecha_limite_48h)}</div>
                )}
                {d.registrado_por && <div style={{ color: "#5a7a9a", fontSize: 11, marginTop: 4 }}>Registrado por: {d.registrado_por}</div>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── APP PRINCIPAL ──────────────────────────────────────────────────────────────
export default function App() {
  const [sesion, setSesion] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSesion(session); setCargandoSesion(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSesion(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (sesion?.user) {
      supabase.from("perfiles").select("*").eq("id", sesion.user.id).single().then(({ data }) => setPerfil(data));
    } else setPerfil(null);
  }, [sesion]);

  const cerrarSesion = async () => { await supabase.auth.signOut(); };
  const [tabApp, setTabApp] = useState("detenidos");
  const [detenidoParaAbrir, setDetenidoParaAbrir] = useState(null);

  if (cargandoSesion) return <div style={{ minHeight: "100vh", background: "#070f1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a7a9a" }}>Cargando…</div>;
  if (!sesion) return <Auth />;

  const puedeVerDashboard = perfil && ["coordinador", "regional", "mando"].includes(perfil.rol);

  const abrirDesdeListaBusqueda = (d) => {
    setDetenidoParaAbrir(d);
    setTabApp("detenidos");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#070f1a", fontFamily: "'Trebuchet MS', sans-serif", color: "#c8daea" }}>
      <div style={{ background: "linear-gradient(180deg,#0a1830 0%,#070f1a 100%)", borderBottom: "1px solid #1a3050", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, background: "linear-gradient(135deg,#7f1d1d,#1a4fa0)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛡️</div>
          <div>
            <div style={{ color: "#e8f4ff", fontSize: 14, fontWeight: 700 }}>FGE GUERRERO — SISTEMA MINISTERIAL</div>
            <div style={{ color: "#4a9eff", fontSize: 9, letterSpacing: 2 }}>INDIVIDUALIZACIÓN DE DETENIDOS</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {perfil && (
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#e8f4ff", fontSize: 12, fontWeight: 600 }}>{perfil.nombre_completo}</div>
              <span style={{ background: (rolColor[perfil.rol] || "#5a7a9a") + "22", color: rolColor[perfil.rol] || "#5a7a9a", border: `1px solid ${(rolColor[perfil.rol] || "#5a7a9a")}55`, borderRadius: 4, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>
                {rolLabel[perfil.rol] || perfil.rol}
              </span>
            </div>
          )}
          <button onClick={cerrarSesion} style={{ background: "#1a0a0a", border: "1px solid #ef444433", borderRadius: 7, padding: "6px 12px", color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>SALIR</button>
        </div>
      </div>

      <div style={{ background: "#08111e", borderBottom: "1px solid #1a3050", padding: "0 20px", display: "flex", gap: 4 }}>
        <button onClick={() => setTabApp("busqueda")} style={{ background: "none", border: "none", borderBottom: tabApp === "busqueda" ? "2px solid #4a9eff" : "2px solid transparent", padding: "12px 14px", color: tabApp === "busqueda" ? "#e8f4ff" : "#5a7a9a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🔍 Búsqueda</button>
        <button onClick={() => setTabApp("detenidos")} style={{ background: "none", border: "none", borderBottom: tabApp === "detenidos" ? "2px solid #4a9eff" : "2px solid transparent", padding: "12px 14px", color: tabApp === "detenidos" ? "#e8f4ff" : "#5a7a9a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🚔 Detenidos</button>
        {puedeVerDashboard && (
          <button onClick={() => setTabApp("dashboard")} style={{ background: "none", border: "none", borderBottom: tabApp === "dashboard" ? "2px solid #4a9eff" : "2px solid transparent", padding: "12px 14px", color: tabApp === "dashboard" ? "#e8f4ff" : "#5a7a9a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📊 Dashboard</button>
        )}
      </div>

      <div style={{ padding: 20, maxWidth: tabApp === "dashboard" ? 1000 : 800, margin: "0 auto" }}>
        {tabApp === "busqueda" && <BusquedaOperativa perfil={perfil} onAbrirDetenido={abrirDesdeListaBusqueda} />}
        {tabApp === "dashboard" && puedeVerDashboard && <DashboardMandos perfil={perfil} />}
        {tabApp === "detenidos" && <ModuloDetenidos perfil={perfil} detenidoInicial={detenidoParaAbrir} onDetenidoInicialUsado={() => setDetenidoParaAbrir(null)} />}
      </div>
    </div>
  );
}
