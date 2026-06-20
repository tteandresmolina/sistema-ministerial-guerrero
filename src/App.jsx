import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const REGIONES = ["Región Centro","Región Montaña","Región Costa Grande","Región Costa Chica","Región Tierra Caliente","Región Acapulco","Región Norte"];
const COMPLEXIONES = ["Delgada","Regular","Robusta","Obesa"];
const TEZ = ["Blanca","Morena clara","Morena","Morena oscura","Negra"];
const ESTADOS_CIVILES = ["Soltero(a)","Casado(a)","Unión libre","Divorciado(a)","Viudo(a)"];
const IDENTIFICACIONES = ["INE","Pasaporte","Licencia","Cédula profesional","No proporcionó","Otro"];
const TIPOS_DOCUMENTO = ["Oficio de investigación","IPH","Acta de detención","Cadena de custodia","Acta de levantamiento cadavérico","Dictamen pericial","Croquis del lugar","Entrevista","Acuerdo del MP","Otro"];
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
    const nombreUnico = `${detenidoId}/doc_${tipoSeleccionado.replace(/\s/g, "_")}_${Date.now()}.${ext}`;

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
  region: "", zona: "", fecha_deteccion: "", delito: "", lugar_deteccion: "",
  carpeta_investigacion: "", carpeta_judicial: "", rnd: "",
  nombre: "", alias: "", fecha_nacimiento: "", lugar_nacimiento: "", lugar_residencia: "",
  ocupacion: "", sexo: "Masculino", estatura: "", complexion: "", color_piel: "",
  estado_civil: "", escolaridad: "", enfermedades: "", alergias: "", identificacion: "",
  nombre_padre: "", nombre_madre: "", pareja_sentimental: "", telefono_contacto: "",
  vestimenta: "", senas_particulares: "", tatuajes: "", domicilios: "",
};

function ModuloDetenidos({ perfil }) {
  const [form, setForm] = useState(initialForm);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [vista, setVista] = useState("nuevo");
  const [detenidos, setDetenidos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [detenidoActivo, setDetenidoActivo] = useState(null);
  const [archivos, setArchivos] = useState([]);

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
    return (
      <div>
        <button onClick={() => { setDetenidoActivo(null); setForm(initialForm); setMensaje(null); }} style={{ background: "none", border: "none", color: "#4a9eff", fontSize: 13, cursor: "pointer", marginBottom: 14, padding: 0 }}>← Volver</button>

        <div style={{ background: "#0c1a27", borderRadius: 10, padding: 16, marginBottom: 16, border: "1px solid #1a3050" }}>
          <div style={{ color: "#ef4444", fontSize: 11, fontWeight: 700 }}>{detenidoActivo.id?.slice(0, 8)}</div>
          <div style={{ color: "#e8f4ff", fontSize: 18, fontWeight: 700, marginTop: 2 }}>{detenidoActivo.nombre}</div>
          <div style={{ color: "#f59e0b", fontSize: 13 }}>{detenidoActivo.alias}</div>
          <div style={{ color: "#c8daea", fontSize: 12, marginTop: 4 }}>{detenidoActivo.delito} · {detenidoActivo.region}</div>
        </div>

        <Seccion titulo="📸 Fotografías del Detenido" color="#4a9eff">
          <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {FOTO_SLOTS.map((slot) => (
              <FotoSlot key={slot.key} slot={slot} detenidoId={detenidoActivo.id} perfil={perfil} archivos={archivos} onSubido={() => cargarArchivos(detenidoActivo.id)} />
            ))}
          </div>
        </Seccion>

        <DocumentosExpediente detenidoId={detenidoActivo.id} perfil={perfil} archivos={archivos} onSubido={() => cargarArchivos(detenidoActivo.id)} />

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
            <div style={{ gridColumn: "1 / -1" }}><Input label="Lugar de la detención" value={form.lugar_deteccion} onChange={(v) => set("lugar_deteccion", v)} /></div>
            <Input label="Carpeta de investigación" value={form.carpeta_investigacion} onChange={(v) => set("carpeta_investigacion", v)} placeholder="Pendiente por anexar" />
            <Input label="Carpeta judicial" value={form.carpeta_judicial} onChange={(v) => set("carpeta_judicial", v)} placeholder="Pendiente por anexar" />
            <Input label="R.N.D." value={form.rnd} onChange={(v) => set("rnd", v)} placeholder="Pendiente por anexar" />
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

  if (cargandoSesion) return <div style={{ minHeight: "100vh", background: "#070f1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a7a9a" }}>Cargando…</div>;
  if (!sesion) return <Auth />;

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
      <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
        <ModuloDetenidos perfil={perfil} />
      </div>
    </div>
  );
}
