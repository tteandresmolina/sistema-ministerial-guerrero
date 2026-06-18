import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const REGIONES = ["Región Centro","Región Montaña","Región Costa Grande","Región Costa Chica","Región Tierra Caliente","Región Acapulco","Región Norte"];
const COMPLEXIONES = ["Delgada","Regular","Robusta","Obesa"];
const TEZ = ["Blanca","Morena clara","Morena","Morena oscura","Negra"];
const ESTADOS_CIVILES = ["Soltero(a)","Casado(a)","Unión libre","Divorciado(a)","Viudo(a)"];
const IDENTIFICACIONES = ["INE","Pasaporte","Licencia","Cédula profesional","No proporcionó","Otro"];
const rolLabel = { agente: "Agente", coordinador: "Coordinador de Zona", regional: "Director Regional", mando: "Director General" };
const rolColor = { agente: "#4a9eff", coordinador: "#f59e0b", regional: "#a78bfa", mando: "#ef4444" };

// ─── COMPONENTES DE FORMULARIO ─────────────────────────────────────────────────
function Input({ label, value, onChange, placeholder = "", type = "text", required = false }) {
  return (
    <div>
      <label style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: "#0c1a27", border: "1px solid #1e3a5f", borderRadius: 7, padding: "9px 12px", color: "#d0e4f4", fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required = false }) {
  return (
    <div>
      <label style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: "#0c1a27", border: "1px solid #1e3a5f", borderRadius: 7, padding: "9px 12px", color: "#d0e4f4", fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box" }}
      >
        <option value="">— Seleccionar —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder = "", rows = 3 }) {
  return (
    <div>
      <label style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label}</label>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={{ background: "#0c1a27", border: "1px solid #1e3a5f", borderRadius: 7, padding: "9px 12px", color: "#d0e4f4", fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
      />
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

// ─── PANTALLA DE LOGIN / REGISTRO ──────────────────────────────────────────────
function Auth({ onLogin }) {
  const [modo, setModo] = useState("login"); // login | registro
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [region, setRegion] = useState("");
  const [zona, setZona] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const iniciarSesion = async () => {
    setCargando(true);
    setError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setCargando(false);
    if (error) {
      setError("Correo o contraseña incorrectos.");
    } else {
      onLogin(data.user);
    }
  };

  const registrarse = async () => {
    if (!email || !password || !nombreCompleto) {
      setError("Completa correo, contraseña y nombre.");
      return;
    }
    setCargando(true);
    setError("");
    setExito("");

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setCargando(false);
      setError("Error al registrar: " + error.message);
      return;
    }

    // Crear el perfil asociado
    if (data.user) {
      const { error: errorPerfil } = await supabase.from("perfiles").insert([{
        id: data.user.id,
        nombre_completo: nombreCompleto,
        rol: "agente",
        region,
        zona,
      }]);
      if (errorPerfil) {
        setError("Cuenta creada, pero hubo un error guardando el perfil: " + errorPerfil.message);
      } else {
        setExito("✅ Cuenta creada. Si tu proyecto requiere confirmación de correo, revísalo antes de iniciar sesión.");
      }
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
            {modo === "registro" && (
              <>
                <Input label="Nombre completo" value={nombreCompleto} onChange={setNombreCompleto} required />
                <Select label="Región" value={region} onChange={setRegion} options={REGIONES} />
                <Input label="Zona / Coordinación" value={zona} onChange={setZona} placeholder="Ej. Zona Centro" />
              </>
            )}
            <Input label="Correo electrónico" value={email} onChange={setEmail} type="email" required />
            <Input label="Contraseña" value={password} onChange={setPassword} type="password" required />
          </div>

          {error && <div style={{ background: "#2a0f0f", border: "1px solid #ef444444", borderRadius: 8, padding: 10, marginTop: 14, color: "#f87171", fontSize: 12 }}>{error}</div>}
          {exito && <div style={{ background: "#0f2a1a", border: "1px solid #22c55e44", borderRadius: 8, padding: 10, marginTop: 14, color: "#4ade80", fontSize: 12 }}>{exito}</div>}

          <button
            onClick={modo === "login" ? iniciarSesion : registrarse}
            disabled={cargando}
            style={{ marginTop: 18, width: "100%", background: cargando ? "#1a3050" : "linear-gradient(135deg,#1a4fa0,#0d3070)", border: "none", borderRadius: 8, padding: 12, color: "#e8f4ff", fontSize: 14, fontWeight: 700, cursor: cargando ? "default" : "pointer", letterSpacing: 1 }}
          >
            {cargando ? "PROCESANDO…" : modo === "login" ? "INGRESAR" : "CREAR CUENTA"}
          </button>
        </div>

        <div style={{ textAlign: "center", color: "#2a4a6a", fontSize: 10, letterSpacing: 2, marginTop: 20 }}>
          CONFIDENCIAL · USO EXCLUSIVO PERSONAL AUTORIZADO
        </div>
      </div>
    </div>
  );
}

// ─── FORMULARIO DE DETENIDOS (el módulo que ya funcionaba) ─────────────────────
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

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const cargarDetenidos = async () => {
    setCargando(true);
    const { data, error } = await supabase.from("detenidos").select("*").order("creado_en", { ascending: false });
    if (!error) setDetenidos(data || []);
    setCargando(false);
  };

  useEffect(() => { if (vista === "lista") cargarDetenidos(); }, [vista]);

  const guardar = async () => {
    if (!form.nombre || !form.delito) {
      setMensaje({ tipo: "error", texto: "Nombre y delito son obligatorios." });
      return;
    }
    setGuardando(true);
    setMensaje(null);

    const payload = {
      ...form,
      fecha_deteccion: form.fecha_deteccion || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      tatuajes: form.tatuajes.split("\n").map((s) => s.trim()).filter(Boolean),
      domicilios: form.domicilios.split("\n").map((s) => s.trim()).filter(Boolean),
      autoridad_detiene: "Policía Ministerial",
      registrado_por: perfil?.nombre_completo || "",
    };

    const { error } = await supabase.from("detenidos").insert([payload]);
    setGuardando(false);
    if (error) {
      setMensaje({ tipo: "error", texto: "Error al guardar: " + error.message });
    } else {
      setMensaje({ tipo: "ok", texto: "✅ Detenido registrado correctamente en la base de datos." });
      setForm(initialForm);
    }
  };

  const listaFiltrada = detenidos.filter((d) => {
    const q = busqueda.toLowerCase();
    if (!q) return true;
    return (
      (d.nombre || "").toLowerCase().includes(q) ||
      (d.alias || "").toLowerCase().includes(q) ||
      (d.delito || "").toLowerCase().includes(q) ||
      (d.tatuajes || []).some((t) => t.toLowerCase().includes(q))
    );
  });

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
            <Input label="Zona / Coordinación" value={form.zona} onChange={(v) => set("zona", v)} placeholder="Ej. Zona Centro" />
            <Input label="Fecha de detención" type="date" value={form.fecha_deteccion} onChange={(v) => set("fecha_deteccion", v)} />
            <Input label="Delito" value={form.delito} onChange={(v) => set("delito", v)} required />
            <div style={{ gridColumn: "1 / -1" }}><Input label="Lugar de la detención" value={form.lugar_deteccion} onChange={(v) => set("lugar_deteccion", v)} /></div>
            <Input label="Carpeta de investigación" value={form.carpeta_investigacion} onChange={(v) => set("carpeta_investigacion", v)} placeholder="Pendiente por anexar" />
            <Input label="Carpeta judicial" value={form.carpeta_judicial} onChange={(v) => set("carpeta_judicial", v)} placeholder="Pendiente por anexar" />
            <Input label="R.N.D." value={form.rnd} onChange={(v) => set("rnd", v)} placeholder="Pendiente por anexar" />
          </Seccion>

          <Seccion titulo="👤 Datos Generales del Detenido" color="#4a9eff">
            <div style={{ gridColumn: "1 / -1" }}><Input label="Nombre completo" value={form.nombre} onChange={(v) => set("nombre", v)} required /></div>
            <Input label="Alias / Apodo" value={form.alias} onChange={(v) => set("alias", v)} />
            <Input label="Fecha de nacimiento" type="date" value={form.fecha_nacimiento} onChange={(v) => set("fecha_nacimiento", v)} />
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
            {guardando ? "GUARDANDO…" : "GUARDAR DETENIDO EN BASE DE DATOS"}
          </button>
        </>
      )}

      {vista === "lista" && (
        <div>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, alias, delito, tatuaje…"
            style={{ background: "#0c1a27", border: "1px solid #1e3a5f", borderRadius: 8, padding: "10px 14px", color: "#d0e4f4", fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
          {cargando ? (
            <div style={{ textAlign: "center", padding: 40, color: "#5a7a9a" }}>Cargando desde Supabase…</div>
          ) : listaFiltrada.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#5a7a9a" }}>No hay detenidos registrados aún.</div>
          ) : (
            listaFiltrada.map((d) => (
              <div key={d.id} style={{ background: "#0c1a27", border: "1px solid #1a3050", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ color: "#e8f4ff", fontSize: 15, fontWeight: 700 }}>{d.nombre}</div>
                  <div style={{ color: "#f59e0b", fontSize: 12 }}>{d.alias}</div>
                </div>
                <div style={{ color: "#c8daea", fontSize: 12, marginTop: 4 }}>{d.delito} · {d.region} · {d.fecha_deteccion}</div>
                {d.registrado_por && <div style={{ color: "#5a7a9a", fontSize: 11, marginTop: 4 }}>Registrado por: {d.registrado_por}</div>}
                {d.tatuajes && d.tatuajes.length > 0 && <div style={{ color: "#a78bfa", fontSize: 11, marginTop: 4 }}>Tatuajes: {d.tatuajes.join(", ")}</div>}
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session);
      setCargandoSesion(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (sesion?.user) {
      supabase.from("perfiles").select("*").eq("id", sesion.user.id).single()
        .then(({ data }) => setPerfil(data));
    } else {
      setPerfil(null);
    }
  }, [sesion]);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
  };

  if (cargandoSesion) {
    return <div style={{ minHeight: "100vh", background: "#070f1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a7a9a" }}>Cargando…</div>;
  }

  if (!sesion) {
    return <Auth onLogin={() => {}} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#070f1a", fontFamily: "'Trebuchet MS', sans-serif", color: "#c8daea" }}>
      <div style={{ background: "linear-gradient(180deg,#0a1830 0%,#070f1a 100%)", borderBottom: "1px solid #1a3050", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, background: "linear-gradient(135deg,#7f1d1d,#1a4fa0)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛡️</div>
          <div>
            <div style={{ color: "#e8f4ff", fontSize: 14, fontWeight: 700 }}>FGE GUERRERO — SISTEMA MINISTERIAL</div>
            <div style={{ color: "#4a9eff", fontSize: 9, letterSpacing: 2 }}>MÓDULO: INDIVIDUALIZACIÓN DE DETENIDOS</div>
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
