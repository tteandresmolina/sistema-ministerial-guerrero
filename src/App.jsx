import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import {
  Shield, BadgeCheck, CircleCheck, FolderKanban, ShieldAlert, Lock, FilePenLine,
} from "lucide-react";
import DashboardHistorico from './pages/DashboardHistorico';
import Registro911 from './pages/Registro911';
import PrimerRespondiente from './pages/PrimerRespondiente';
import EscenaCrimen from './pages/EscenaCrimen';
import IndiciosEvidencia from './pages/IndiciosEvidencia';
import VictimasTestigos from './pages/VictimasTestigos';
import ExpedientePolicial from './pages/ExpedientePolicial';
import DashboardOperativo from './pages/DashboardOperativo';
import AnalisisSARA from './pages/AnalisisSARA';
import OrdenesAprehension from './pages/OrdenesAprehension';
import VehiculosRobo from './pages/VehiculosRobo';
import OficialiaPartes from './pages/OficialiaPartes';
import SubcoordAdmin from './pages/SubcoordAdmin';
import BodegaIndicios from './pages/BodegaIndicios';
import ModuloDetenidos, { BusquedaOperativa, calcularSemaforo, SEMAFORO, REGIONES, Input, Select, TextArea } from './pages/Detenidos';

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const rolLabel = { agente: "Agente", coordinador: "Coordinador de Zona", regional: "Director Regional", mando: "Director General" };
const rolColor = { agente: "#001a4d", coordinador: "#f59e0b", regional: "#a78bfa", mando: "#ef4444" };

// ─── PANTALLA DE BIENVENIDA ──────────────────────────────────────────────────────
function Bienvenida({ onContinuar }) {
  return (
    <div style={{ minHeight: "100vh", background: "#001a4d", backgroundImage: "repeating-linear-gradient(45deg, rgba(182,144,84,0.05) 0px, rgba(182,144,84,0.05) 2px, transparent 2px, transparent 44px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Trebuchet MS', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
        <img src="/logo-fge.png" alt="FGE Guerrero" style={{ width: 150, height: 150, borderRadius: "50%", border: "3px solid #b69054", marginBottom: 26 }} />
        <div style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, letterSpacing: 1, lineHeight: 1.4 }}>FISCALÍA GENERAL DEL ESTADO</div>
        <div style={{ color: "#b69054", fontSize: 22, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>DE GUERRERO</div>
        <div style={{ width: 60, height: 2, background: "#b69054", margin: "0 auto 14px" }} />
        <div style={{ color: "#dce6f5", fontSize: 13, letterSpacing: 2, marginBottom: 6 }}>SISTEMA DE INFORMACIÓN CRIMINAL</div>
        <div style={{ color: "#7c8db8", fontSize: 12, letterSpacing: 1, marginBottom: 36 }}>Policía de Investigación Ministerial</div>

        <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 40, flexWrap: "wrap" }}>
          {[["LEALTAD", Shield], ["HONOR", BadgeCheck], ["INTEGRIDAD", CircleCheck]].map(([texto, Icon]) => (
            <div key={texto} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <Icon size={20} style={{ color: "#b69054" }} />
              <span style={{ color: "#dce6f5", fontSize: 10, letterSpacing: 1.5 }}>{texto}</span>
            </div>
          ))}
        </div>

        <button onClick={onContinuar} style={{ background: "#b69054", border: "none", borderRadius: 9, padding: "14px 36px", color: "#001a4d", fontSize: 14, fontWeight: 700, letterSpacing: 1, cursor: "pointer" }}>
          ACCEDER AL SISTEMA
        </button>
      </div>
    </div>
  );
}

// ─── AUTH ───────────────────────────────────────────────────────────────────────
function Auth() {
  const [mostrarBienvenida, setMostrarBienvenida] = useState(true);
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

  if (mostrarBienvenida) {
    return <Bienvenida onContinuar={() => setMostrarBienvenida(false)} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f9", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Trebuchet MS', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src="/logo-fge.png" alt="FGE Guerrero" style={{ width: 72, height: 72, marginBottom: 10, borderRadius: "50%" }} />
          <div style={{ color: "#1a1a2e", fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>FISCALÍA GENERAL DEL ESTADO</div>
          <div style={{ color: "#001a4d", fontSize: 11, letterSpacing: 3, marginTop: 4 }}>SISTEMA MINISTERIAL — GUERRERO</div>
        </div>
        <div style={{ background: "#eef1f6", border: "1px solid #c3cbd6", borderRadius: 14, padding: 26 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "#ffffff", borderRadius: 8, padding: 4 }}>
            <button onClick={() => { setModo("login"); setError(""); setExito(""); }} style={{ flex: 1, background: modo === "login" ? "#c3cbd6" : "none", border: "none", borderRadius: 6, padding: "8px", color: modo === "login" ? "#1a1a2e" : "#6b7280", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Iniciar sesión</button>
            <button disabled style={{ flex: 1, background: "none", border: "none", borderRadius: 6, padding: "8px", color: "#d1d5db", fontSize: 12, fontWeight: 700, cursor: "not-allowed" }}>Registro solo por Subcoord. Admtivo.</button>
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
          {error && <div style={{ background: "#fcebeb", border: "1px solid #ef444444", borderRadius: 8, padding: 10, marginTop: 14, color: "#791f1f", fontSize: 12 }}>{error}</div>}
          {exito && <div style={{ background: "#e1f5ee", border: "1px solid #22c55e44", borderRadius: 8, padding: 10, marginTop: 14, color: "#0f6e56", fontSize: 12 }}>{exito}</div>}
          <button onClick={modo === "login" ? iniciarSesion : registrarse} disabled={cargando}
            style={{ marginTop: 18, width: "100%", background: cargando ? "#d9dee5" : "linear-gradient(135deg,#001a4d,#001237)", border: "none", borderRadius: 8, padding: 12, color: "#ffffff", fontSize: 14, fontWeight: 700, cursor: cargando ? "default" : "pointer", letterSpacing: 1 }}>
            {cargando ? "PROCESANDO…" : modo === "login" ? "INGRESAR" : "CREAR CUENTA"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD DE MANDOS ─────────────────────────────────────────────────────
const COLORES_CHART = ["#001a4d", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa", "#ec4899", "#14b8a6"];

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
    <div style={{ background: "#faeeda", border: "1px solid #f59e0b44", borderRadius: 10, padding: 18, marginBottom: 20 }}>
      <div style={{ color: "#854f0b", fontSize: 13, fontWeight: 800, letterSpacing: 1, marginBottom: 14, paddingBottom: 8, borderBottom: "2px solid #b69054", textTransform: "uppercase" }}><FilePenLine size={15} style={{ marginRight: 6, verticalAlign: -3 }} />Solicitudes de Edición Pendientes ({solicitudes.length})</div>
      {solicitudes.map((s) => (
        <div key={s.id} style={{ background: "#ffffff", borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ color: "#1a1a2e", fontSize: 13, fontWeight: 700 }}>{s.detenido?.nombre} <span style={{ color: "#f59e0b", fontWeight: 400 }}>({s.detenido?.alias})</span></div>
              <div style={{ color: "#7c8494", fontSize: 11, marginTop: 2 }}>{s.detenido?.delito} · {s.detenido?.region}</div>
              <div style={{ color: "#4a5268", fontSize: 12, marginTop: 6 }}>Solicita: <strong>{s.solicitado_por}</strong></div>
              <div style={{ color: "#a78bfa", fontSize: 12, marginTop: 2, fontStyle: "italic" }}>"{s.justificacion}"</div>
              <div style={{ color: "#6b7280", fontSize: 10, marginTop: 4 }}>{new Date(s.creado_en).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => resolver(s.id, "autorizada")} disabled={procesando === s.id}
                style={{ background: "#0f6e56", border: "none", borderRadius: 6, padding: "6px 12px", color: "#ffffff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                ✓ Autorizar
              </button>
              <button onClick={() => resolver(s.id, "rechazada")} disabled={procesando === s.id}
                style={{ background: "#A32D2D", border: "none", borderRadius: 6, padding: "6px 12px", color: "#ffffff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
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

  if (cargando) return <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Cargando dashboard…</div>;

  const puedeRevisarSolicitudes = perfil && ["regional", "mando"].includes(perfil.rol);

  return (
    <div>
      {puedeRevisarSolicitudes && <RevisionSolicitudes perfil={perfil} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div style={{ color: "#001a4d", fontSize: 16, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>Detenidos Activos en Custodia</div>
        <div style={{ display: "flex", gap: 8 }}>
          {!esRegional && (
            <select value={filtroRegion} onChange={(e) => setFiltroRegion(e.target.value)}
              style={{ background: "#ffffff", border: "1px solid #d9dee5", borderRadius: 7, padding: "8px 11px", color: "#33394d", fontSize: 12 }}>
              <option value="Todas">Todo el estado</option>
              {REGIONES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
          <button onClick={exportarReporte} style={{ background: "#b69054", border: "none", borderRadius: 8, padding: "8px 16px", color: "#ffffff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>⬇ Descargar reporte</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 22 }}>
        {[
          { label: "Total expedientes", value: detenidosFiltrados.length, color: "#001a4d", icon: FolderKanban },
          { label: "En Proceso", value: porSemaforo.verde + porSemaforo.amarillo, color: "#22c55e", icon: CircleCheck },
          { label: "Alerta por Vencer", value: porSemaforo.naranja, color: "#f97316", icon: ShieldAlert },
          { label: "Omisión de Plazo", value: porSemaforo.negro, color: "#ef4444", icon: Lock },
          { label: "Finalizados", value: porSemaforo.finalizado, color: "#6b7280", icon: CircleCheck },
        ].map((c) => (
          <div key={c.label} style={{ background: "#ffffff", border: `1px solid ${c.color}33`, borderRadius: 10, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: 10, top: 10, opacity: 0.18, color: c.color }}><c.icon size={26} /></div>
            <div style={{ color: "#6b7280", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{c.label}</div>
            <div style={{ color: c.color, fontSize: 26, fontWeight: 900, fontFamily: "monospace", marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "#ffffff", border: "1px solid #d9dee5", borderRadius: 10, padding: 16 }}>
          <div style={{ color: "#001a4d", fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" }}>Estatus de Expedientes</div>
          {datosSemaforo.length === 0 ? <div style={{ color: "#6b7280", fontSize: 12 }}>Sin datos aún</div> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={datosSemaforo} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, value }) => `${value}`} labelLine={false} fontSize={11}>
                  {datosSemaforo.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#eef1f6", border: "1px solid #d9dee5", color: "#4a5268", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 10, color: "#7c8494" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #d9dee5", borderRadius: 10, padding: 16 }}>
          <div style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" }}>{esRegional ? "Detenidos en mi Región" : "Detenidos por Región"}</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={detPorRegion} margin={{ top: 0, right: 10, left: -20, bottom: 30 }}>
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 9 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#eef1f6", border: "1px solid #d9dee5", color: "#4a5268", fontSize: 12 }} />
              <Bar dataKey="value" fill="#001a4d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #d9dee5", borderRadius: 10, padding: 16 }}>
        <div style={{ color: "#a78bfa", fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" }}>Delitos más frecuentes</div>
        {delitosData.length === 0 ? <div style={{ color: "#6b7280", fontSize: 12 }}>Sin datos aún</div> : (
          <ResponsiveContainer width="100%" height={Math.max(140, delitosData.length * 36)}>
            <BarChart data={delitosData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#4a5268", fontSize: 11 }} width={140} />
              <Tooltip contentStyle={{ background: "#eef1f6", border: "1px solid #d9dee5", color: "#4a5268", fontSize: 12 }} />
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

  if (cargandoSesion) return <div style={{ minHeight: "100vh", background: "#f4f6f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>Cargando…</div>;
  if (!sesion) return <Auth />;

  const puedeVerDashboard = perfil && ["coordinador", "regional", "mando"].includes(perfil.rol);

  const abrirDesdeListaBusqueda = (d) => {
    setDetenidoParaAbrir(d);
    setTabApp("detenidos");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: "'Trebuchet MS', sans-serif", color: "#4a5268" }}>
      <div style={{ background: "#001a4d", borderBottom: "3px solid #b69054", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/logo-fge.png" alt="FGE Guerrero" style={{ width: 42, height: 42, borderRadius: "50%", border: "2px solid #b69054" }} />
          <div>
            <div style={{ color: "#ffffff", fontSize: 14, fontWeight: 700 }}>FGE GUERRERO — SISTEMA MINISTERIAL</div>
<div style={{ color: "#b69054", fontSize: 9, letterSpacing: 2 }}>{["registro911","primerrespondiente","escenacrimen","indicios","victimastestigos","expediente"].includes(tabApp) ? "EXPEDIENTE DE INVESTIGACIÓN POLICIAL" : ["busqueda","detenidos"].includes(tabApp) ? "INDIVIDUALIZACIÓN DE DETENIDOS" : "ANÁLISIS E INTELIGENCIA CRIMINAL"}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {perfil && (
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#ffffff", fontSize: 12, fontWeight: 600 }}>{perfil.nombre_completo}</div>
              <span style={{ background: (rolColor[perfil.rol] || "#6b7280") + "22", color: rolColor[perfil.rol] || "#6b7280", border: `1px solid ${(rolColor[perfil.rol] || "#6b7280")}55`, borderRadius: 4, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>
                {rolLabel[perfil.rol] || perfil.rol}
              </span>
            </div>
          )}
          <button onClick={cerrarSesion} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 7, padding: "6px 12px", color: "#ffffff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>SALIR</button>
        </div>
      </div>

      <div style={{ background: "#eef1f6", borderBottom: "1px solid #d9dee5", padding: "0 20px", display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            {/* ── GRUPO 1: Expediente de Investigación Policial ── */}
            <button onClick={() => setTabApp("oficialia")} style={{ background: "none", border: "none", borderBottom: tabApp === "oficialia" ? "2px solid #001a4d" : "2px solid transparent", padding: "10px 18px", fontWeight: tabApp === "oficialia" ? 700 : 500, color: tabApp === "oficialia" ? "#001a4d" : "#888", cursor: "pointer", fontSize: 15 }}>Oficialía</button>
            <button onClick={() => setTabApp("registro911")} style={{ background: "none", border: "none", borderBottom: tabApp === "registro911" ? "2px solid #001a4d" : "2px solid transparent", padding: "10px 18px", fontWeight: tabApp === "registro911" ? 700 : 500, color: tabApp === "registro911" ? "#001a4d" : "#888", cursor: "pointer", fontSize: 15 }}>Registro 911</button>
            <button onClick={() => setTabApp("primerrespondiente")} style={{ background: "none", border: "none", borderBottom: tabApp === "primerrespondiente" ? "2px solid #001a4d" : "2px solid transparent", padding: "10px 18px", fontWeight: tabApp === "primerrespondiente" ? 700 : 500, color: tabApp === "primerrespondiente" ? "#001a4d" : "#888", cursor: "pointer", fontSize: 15 }}>Primer Respondiente</button>
            <button onClick={() => setTabApp("escenacrimen")} style={{ background: "none", border: "none", borderBottom: tabApp === "escenacrimen" ? "2px solid #001a4d" : "2px solid transparent", padding: "10px 18px", fontWeight: tabApp === "escenacrimen" ? 700 : 500, color: tabApp === "escenacrimen" ? "#001a4d" : "#888", cursor: "pointer", fontSize: 15 }}>Procesamiento del Lugar</button>
            <button onClick={() => setTabApp("indicios")} style={{ background: "none", border: "none", borderBottom: tabApp === "indicios" ? "2px solid #001a4d" : "2px solid transparent", padding: "10px 18px", fontWeight: tabApp === "indicios" ? 700 : 500, color: tabApp === "indicios" ? "#001a4d" : "#888", cursor: "pointer", fontSize: 15 }}>Indicios</button>
            <button onClick={() => setTabApp("victimastestigos")} style={{ background: "none", border: "none", borderBottom: tabApp === "victimastestigos" ? "2px solid #001a4d" : "2px solid transparent", padding: "10px 18px", fontWeight: tabApp === "victimastestigos" ? 700 : 500, color: tabApp === "victimastestigos" ? "#001a4d" : "#888", cursor: "pointer", fontSize: 15 }}>Víctimas y Testigos</button>
            <button onClick={() => setTabApp("expediente")} style={{ background: "none", border: "none", borderBottom: tabApp === "expediente" ? "2px solid #001a4d" : "2px solid transparent", padding: "10px 18px", fontWeight: tabApp === "expediente" ? 700 : 500, color: tabApp === "expediente" ? "#001a4d" : "#888", cursor: "pointer", fontSize: 15 }}>Expediente Policial</button>

            <div style={{ width: 2, height: 28, backgroundColor: "#b69054", margin: "0 6px", borderRadius: 1 }} />
            <button onClick={() => setTabApp("ordenes")} style={{ background: "none", border: "none", borderBottom: tabApp === "ordenes" ? "2px solid #001a4d" : "2px solid transparent", padding: "10px 18px", fontWeight: tabApp === "ordenes" ? 700 : 500, color: tabApp === "ordenes" ? "#001a4d" : "#888", cursor: "pointer", fontSize: 15 }}>Órdenes</button>
        <button onClick={() => setTabApp("vehiculos")} style={{ background: "none", border: "none", borderBottom: tabApp === "vehiculos" ? "2px solid #001a4d" : "2px solid transparent", padding: "10px 18px", fontWeight: tabApp === "vehiculos" ? 700 : 500, color: tabApp === "vehiculos" ? "#001a4d" : "#888", cursor: "pointer", fontSize: 15 }}>Vehículos</button>
            {perfil && (['mando','regional'].includes(perfil.rol) || (perfil.coordinacion_especializada || '').toLowerCase().includes('narcomenudeo')) && (
              <button onClick={() => setTabApp("bodega")} style={{ background: "none", border: "none", borderBottom: tabApp === "bodega" ? "2px solid #001a4d" : "2px solid transparent", padding: "10px 18px", fontWeight: tabApp === "bodega" ? 700 : 500, color: tabApp === "bodega" ? "#001a4d" : "#888", cursor: "pointer", fontSize: 15 }}>Bodega</button>
            )}
            {/* ── GRUPO 2: Detenidos ── */}
            <button onClick={() => setTabApp("busqueda")} style={{ background: "none", border: "none", borderBottom: tabApp === "busqueda" ? "2px solid #001a4d" : "2px solid transparent", padding: "10px 18px", fontWeight: tabApp === "busqueda" ? 700 : 500, color: tabApp === "busqueda" ? "#001a4d" : "#888", cursor: "pointer", fontSize: 15 }}>Búsqueda</button>
            <button onClick={() => setTabApp("detenidos")} style={{ background: "none", border: "none", borderBottom: tabApp === "detenidos" ? "2px solid #001a4d" : "2px solid transparent", padding: "10px 18px", fontWeight: tabApp === "detenidos" ? 700 : 500, color: tabApp === "detenidos" ? "#001a4d" : "#888", cursor: "pointer", fontSize: 15 }}>Detenidos</button>

            <div style={{ width: 2, height: 28, backgroundColor: "#b69054", margin: "0 6px", borderRadius: 1 }} />

            {/* ── GRUPO 3: Análisis ── */}
            <button onClick={() => setTabApp("dashoperativo")} style={{ background: "none", border: "none", borderBottom: tabApp === "dashoperativo" ? "2px solid #001a4d" : "2px solid transparent", padding: "10px 18px", fontWeight: tabApp === "dashoperativo" ? 700 : 500, color: tabApp === "dashoperativo" ? "#001a4d" : "#888", cursor: "pointer", fontSize: 15 }}>Dashboard</button>
            <button onClick={() => setTabApp("sara")} style={{ background: "none", border: "none", borderBottom: tabApp === "sara" ? "2px solid #001a4d" : "2px solid transparent", padding: "10px 18px", fontWeight: tabApp === "sara" ? 700 : 500, color: tabApp === "sara" ? "#001a4d" : "#888", cursor: "pointer", fontSize: 15 }}>SARA</button>
            {puedeVerDashboard && (
              <button onClick={() => setTabApp("dashboard")} style={{ background: "none", border: "none", borderBottom: tabApp === "dashboard" ? "2px solid #001a4d" : "2px solid transparent", padding: "10px 18px", fontWeight: tabApp === "dashboard" ? 700 : 500, color: tabApp === "dashboard" ? "#001a4d" : "#888", cursor: "pointer", fontSize: 15 }}>Histórico</button>
            )}
            <button onClick={() => setTabApp("historico")} style={{ background: "none", border: "none", borderBottom: tabApp === "historico" ? "2px solid #001a4d" : "2px solid transparent", padding: "10px 18px", fontWeight: tabApp === "historico" ? 700 : 500, color: tabApp === "historico" ? "#001a4d" : "#888", cursor: "pointer", fontSize: 15 }}>Histórico Detenidos</button>
            {perfil && ['mando','subcoord_admin'].includes(perfil.rol) && (
              <button onClick={() => setTabApp("subcoord_admin")} style={{ background: "none", border: "none", borderBottom: tabApp === "subcoord_admin" ? "2px solid #001a4d" : "2px solid transparent", padding: "10px 18px", fontWeight: tabApp === "subcoord_admin" ? 700 : 500, color: tabApp === "subcoord_admin" ? "#001a4d" : "#888", cursor: "pointer", fontSize: 15 }}>Subcoord. Admtivo.</button>
            )}
          </div>
      <div style={{ padding: 20, maxWidth: tabApp === "dashboard" ? 1000 : 800, margin: "0 auto" }}>
        {tabApp === "busqueda" && <BusquedaOperativa perfil={perfil} onAbrirDetenido={abrirDesdeListaBusqueda} />}
        {tabApp === "dashboard" && puedeVerDashboard && <DashboardMandos perfil={perfil} />}
        {tabApp === "historico" && <DashboardHistorico />}
        {tabApp === "oficialia" && <OficialiaPartes perfil={perfil} />}
        {tabApp === "registro911" && <Registro911 perfil={perfil} />}
        {tabApp === "primerrespondiente" && <PrimerRespondiente perfil={perfil} />}
        {tabApp === "escenacrimen" && <EscenaCrimen perfil={perfil} />}
        {tabApp === "indicios" && <IndiciosEvidencia perfil={perfil} />}
        {tabApp === "expediente" && <ExpedientePolicial user={perfil} />}
        {tabApp === "dashoperativo" && <DashboardOperativo user={perfil} />}
        {tabApp === "sara" && <AnalisisSARA user={perfil} />}
        {tabApp === "victimastestigos" && <VictimasTestigos perfil={perfil} />}
        {tabApp === "ordenes" && <OrdenesAprehension perfil={perfil} />}
        {tabApp === "vehiculos" && <VehiculosRobo perfil={perfil} />}
        {tabApp === "subcoord_admin" && <SubcoordAdmin perfil={perfil} />}
        {tabApp === "bodega" && <BodegaIndicios perfil={perfil} />}
        {tabApp === "detenidos" && <ModuloDetenidos perfil={perfil} detenidoInicial={detenidoParaAbrir} onDetenidoInicialUsado={() => setDetenidoParaAbrir(null)} />}
      </div>
    </div>
  );
}
