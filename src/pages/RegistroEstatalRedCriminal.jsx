// src/pages/RegistroEstatalRedCriminal.jsx
// Módulo: Registro Estatal de Red Criminal — Análisis Forense
// Paso 1: directorio de contactos_estatales (lista, búsqueda, detalle, alta manual)
// Acceso exclusivo: coordinacion_especializada incluye 'analisis_forense'
// (a diferencia de Bodega de Indicios, aquí NO hay atajo automático para mando/regional)

import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Search, Plus, X, Phone, User, ShieldAlert, CheckCircle2,
  FileText, Link2, Fingerprint, Camera, Users, Briefcase,
} from "lucide-react";

const COLORS = { primary: "#001a4d", gold: "#b69054", white: "#ffffff", bg: "#f4f6fb" };
const cardStyle = { background: COLORS.white, borderRadius: 10, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", marginBottom: 18 };
const labelStyle = { display: "block", fontWeight: 700, fontSize: 15, color: COLORS.primary, marginBottom: 6 };
const inputStyle = { width: "100%", padding: "13px 14px", borderRadius: 7, border: "2px solid #c7cfe0", fontSize: 17, boxSizing: "border-box", outline: "none", fontFamily: "inherit", color: "#1a1a1a", background: COLORS.white, minHeight: 44 };
const textareaStyle = { ...inputStyle, minHeight: 72, resize: "vertical" };
const btnPrimary = { background: COLORS.gold, color: COLORS.white, border: "none", borderRadius: 7, padding: "14px 26px", fontWeight: 700, fontSize: 16, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center", minHeight: 44 };
const btnSecondary = { ...btnPrimary, background: "transparent", color: COLORS.primary, border: `2px solid ${COLORS.primary}` };
const tituloSeccion = { color: COLORS.gold, fontSize: 15, fontWeight: 800, letterSpacing: 1, marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid #b69054", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 9 };

// ============================================================================
// URLs FIRMADAS — bucket 'red-criminal-fotos' es privado desde el inicio.
// Mismo mecanismo que Detenidos.jsx: getPublicUrl() solo arma el string que
// se guarda en la base; para MOSTRAR la foto hay que canjearlo por una URL
// firmada temporal.
// ============================================================================
const BUCKET_FOTOS = "red-criminal-fotos";
const RUTA_PUBLICA_PREFIJO_FOTOS = `/storage/v1/object/public/${BUCKET_FOTOS}/`;

function rutaDesdeUrlPublicaFotos(urlPublica) {
  if (!urlPublica) return null;
  const idx = urlPublica.indexOf(RUTA_PUBLICA_PREFIJO_FOTOS);
  if (idx === -1) return null;
  return decodeURIComponent(urlPublica.slice(idx + RUTA_PUBLICA_PREFIJO_FOTOS.length));
}

async function firmarUrlsFotos(urlsPublicas, expiresIn = 3600) {
  const pares = (urlsPublicas || [])
    .map((url) => ({ url, ruta: rutaDesdeUrlPublicaFotos(url) }))
    .filter((p) => p.ruta);
  if (pares.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET_FOTOS)
    .createSignedUrls(pares.map((p) => p.ruta), expiresIn);
  if (error || !data) return {};
  const mapa = {};
  data.forEach((item, i) => { if (item.signedUrl) mapa[pares[i].url] = item.signedUrl; });
  return mapa;
}

async function firmarUrlUnicaFotos(urlPublica, expiresIn = 3600) {
  const ruta = rutaDesdeUrlPublicaFotos(urlPublica);
  if (!ruta) return null;
  const { data, error } = await supabase.storage.from(BUCKET_FOTOS).createSignedUrl(ruta, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

function Input({ label, value, onChange, placeholder = "", required = false }) {
  return (
    <div>
      <label style={labelStyle}>{label} {required && <span style={{ color: "#ef4444" }}>*</span>}</label>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3, placeholder = "" }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} rows={rows} style={textareaStyle} />
    </div>
  );
}

function formatoTelefono(t) {
  if (!t) return "";
  return t.length === 10 ? `${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6)}` : t;
}

const emptyForm = { telefono: "", nombre_principal: "", alias: "", notas: "", detenido: false, fecha_deteccion: "", spid_deteccion: "", grupo_delictivo: "", carpeta_investigacion: "" };

export default function RegistroEstatalRedCriminal({ perfil }) {
  const [contactos, setContactos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [contactoActivo, setContactoActivo] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [fotoArchivo, setFotoArchivo] = useState(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState(null);
  const [urlsFotosFirmadas, setUrlsFotosFirmadas] = useState({});

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const cargarContactos = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from("contactos_estatales")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setMensaje({ tipo: "error", texto: "No se pudo cargar el registro: " + error.message });
    } else {
      const lista = data || [];
      const mapaFirmadas = await firmarUrlsFotos(lista.map((c) => c.foto_url).filter(Boolean));
      setUrlsFotosFirmadas(mapaFirmadas);
      setContactos(lista);
    }
    setCargando(false);
  };

  useEffect(() => { cargarContactos(); }, []);

  const listaFiltrada = contactos.filter((c) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    const enAlias = (c.alias || []).some((a) => a.toLowerCase().includes(q));
    return (
      (c.telefono || "").includes(q) ||
      (c.nombre_principal || "").toLowerCase().includes(q) ||
      enAlias
    );
  });

  const totalDetenidos = contactos.filter((c) => c.detenido).length;

  const abrirNuevo = () => {
    setForm(emptyForm);
    setContactoActivo(null);
    setFotoArchivo(null);
    setFotoPreviewUrl(null);
    setMostrarForm(true);
    setMensaje(null);
  };

  const abrirEdicion = async (contacto) => {
    setForm({
      telefono: contacto.telefono || "",
      nombre_principal: contacto.nombre_principal || "",
      alias: (contacto.alias || []).join("\n"),
      notas: contacto.notas || "",
      detenido: contacto.detenido || false,
      fecha_deteccion: contacto.fecha_deteccion ? contacto.fecha_deteccion.slice(0, 10) : "",
      spid_deteccion: contacto.spid_deteccion || "",
      grupo_delictivo: contacto.grupo_delictivo || "",
      carpeta_investigacion: contacto.carpeta_investigacion || "",
    });
    setContactoActivo(contacto);
    setFotoArchivo(null);
    setFotoPreviewUrl(urlsFotosFirmadas[contacto.foto_url] || null);
    if (contacto.foto_url && !urlsFotosFirmadas[contacto.foto_url]) {
      const firmada = await firmarUrlUnicaFotos(contacto.foto_url);
      setFotoPreviewUrl(firmada);
    }
    setMostrarForm(true);
    setMensaje(null);
  };

  const subirFoto = async (contactoId, file) => {
    const ext = file.name.split(".").pop();
    const nombreUnico = `${contactoId}/foto_${Date.now()}.${ext}`;
    const { error: errorSubida } = await supabase.storage.from(BUCKET_FOTOS).upload(nombreUnico, file);
    if (errorSubida) return null;
    const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(nombreUnico);
    return data?.publicUrl || null;
  };

  const guardar = async () => {
    const telefonoLimpio = form.telefono.replace(/\D/g, "");
    if (telefonoLimpio.length < 10) {
      setMensaje({ tipo: "error", texto: "El teléfono debe tener al menos 10 dígitos." });
      return;
    }
    setGuardando(true); setMensaje(null);

    const payload = {
      telefono: telefonoLimpio,
      nombre_principal: form.nombre_principal || null,
      alias: form.alias.split("\n").map((s) => s.trim()).filter(Boolean),
      notas: form.notas || null,
      detenido: form.detenido,
      fecha_deteccion: form.detenido && form.fecha_deteccion ? form.fecha_deteccion : null,
      spid_deteccion: form.detenido ? (form.spid_deteccion || null) : null,
      grupo_delictivo: form.grupo_delictivo || null,
      carpeta_investigacion: form.carpeta_investigacion || null,
    };

    let error, idParaFoto;
    if (contactoActivo) {
      idParaFoto = contactoActivo.id;
      if (fotoArchivo) {
        const url = await subirFoto(idParaFoto, fotoArchivo);
        if (url) payload.foto_url = url;
      }
      ({ error } = await supabase.from("contactos_estatales").update(payload).eq("id", idParaFoto));
    } else {
      const { data: nuevo, error: errorInsert } = await supabase.from("contactos_estatales").insert([{
        ...payload,
        registrado_por_id: perfil?.id || null,
      }]).select().single();
      error = errorInsert;
      if (!error && nuevo) {
        idParaFoto = nuevo.id;
        if (fotoArchivo) {
          const url = await subirFoto(idParaFoto, fotoArchivo);
          if (url) await supabase.from("contactos_estatales").update({ foto_url: url }).eq("id", idParaFoto);
        }
      }
    }

    setGuardando(false);
    if (error) {
      setMensaje({ tipo: "error", texto: "Error al guardar: " + error.message });
      return;
    }
    setMostrarForm(false);
    setContactoActivo(null);
    cargarContactos();
  };

  return (
    <div>
      <h3 style={{ margin: "0 0 4px 0", color: COLORS.primary, fontSize: 20, display: "flex", alignItems: "center", gap: 10 }}>
        <Fingerprint size={22} style={{ color: COLORS.gold }} />
        Registro Estatal de Red Criminal
      </h3>
      <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 20px 0" }}>
        Directorio acumulativo de contactos identificados a través de análisis forense digital
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <div style={{ ...cardStyle, marginBottom: 0, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, background: COLORS.primary + "12", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <User size={22} style={{ color: COLORS.primary }} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.primary }}>{contactos.length}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>contactos registrados</div>
          </div>
        </div>
        <div style={{ ...cardStyle, marginBottom: 0, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, background: "#ef444412", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ShieldAlert size={22} style={{ color: "#ef4444" }} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#ef4444" }}>{totalDetenidos}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>marcados detenidos</div>
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 280px" }}>
          <Search size={17} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar número, nombre o alias…"
            style={{ ...inputStyle, paddingLeft: 40 }} />
        </div>
        <button onClick={abrirNuevo} style={btnPrimary}><Plus size={17} /> Agregar contacto</button>
      </div>

      {mensaje && !mostrarForm && (
        <div style={{ background: mensaje.tipo === "ok" ? "#e1f5ee" : "#fcebeb", border: `1px solid ${mensaje.tipo === "ok" ? "#22c55e44" : "#ef444444"}`, borderRadius: 8, padding: 12, marginBottom: 16, color: mensaje.tipo === "ok" ? "#0f6e56" : "#791f1f", fontSize: 14 }}>
          {mensaje.texto}
        </div>
      )}

      {cargando ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Cargando…</div>
      ) : listaFiltrada.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 40, color: "#9ca3af" }}>
          {busqueda ? "Sin resultados para esta búsqueda." : "Aún no hay contactos registrados."}
        </div>
      ) : (
        listaFiltrada.map((c) => (
          <div key={c.id} onClick={() => abrirEdicion(c)} style={{ ...cardStyle, cursor: "pointer", transition: "box-shadow 0.2s" }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {urlsFotosFirmadas[c.foto_url] ? (
                  <img src={urlsFotosFirmadas[c.foto_url]} alt={c.nombre_principal || c.telefono}
                    style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "1px solid #e8ecf1", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f9fafb", border: "1px solid #e8ecf1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <User size={20} style={{ color: "#9ca3af" }} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary, fontFamily: "monospace", letterSpacing: 1 }}>
                    {formatoTelefono(c.telefono)}
                  </div>
                  {c.nombre_principal && <div style={{ fontSize: 14, color: "#374151", marginTop: 2 }}>{c.nombre_principal}</div>}
                  {c.grupo_delictivo && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, color: "#791f1f", fontSize: 12, fontWeight: 700 }}>
                      <Users size={12} /> {c.grupo_delictivo}
                    </div>
                  )}
                  {c.carpeta_investigacion && (
                    <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2, fontFamily: "monospace" }}>C.I. {c.carpeta_investigacion}</div>
                  )}
                  {c.alias && c.alias.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {c.alias.map((a, i) => (
                        <span key={i} style={{ background: COLORS.gold + "1a", color: COLORS.gold, border: `1px solid ${COLORS.gold}55`, borderRadius: 4, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>{a}</span>
                      ))}
                    </div>
                  )}
                  {c.spids_relacionados && c.spids_relacionados.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, color: "#6b7280", fontSize: 12 }}>
                      <Link2 size={13} />
                      {c.spids_relacionados.join(" · ")}
                    </div>
                  )}
                </div>
              </div>
              {c.detenido && (
                <span style={{ background: "#ef444422", color: "#791f1f", border: "1px solid #ef444455", borderRadius: 4, padding: "4px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>DETENIDO</span>
              )}
            </div>
          </div>
        ))
      )}

      {mostrarForm && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,26,77,0.5)", display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 30, zIndex: 1000, overflowY: "auto" }}
          onClick={() => setMostrarForm(false)}>
          <div style={{ background: COLORS.white, borderRadius: 14, width: "100%", maxWidth: 560, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", marginBottom: 40 }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ background: "#0a2a63", color: COLORS.white, padding: "18px 24px", borderRadius: "14px 14px 0 0", boxShadow: "0 3px 10px rgba(0,0,0,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Fingerprint size={20} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>{contactoActivo ? "Editar contacto" : "Nuevo contacto"}</span>
              </div>
              <X size={20} style={{ cursor: "pointer" }} onClick={() => setMostrarForm(false)} />
            </div>

            <div style={{ padding: 24, display: "grid", gap: 14 }}>
              <div>
                <label style={labelStyle}>Fotografía</label>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {fotoArchivo ? (
                    <img src={URL.createObjectURL(fotoArchivo)} alt="Nueva foto" style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", border: `2px solid ${COLORS.gold}` }} />
                  ) : fotoPreviewUrl ? (
                    <img src={fotoPreviewUrl} alt="Foto actual" style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", border: "2px solid #c7cfe0" }} />
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: 10, background: "#f9fafb", border: "2px dashed #c7cfe0", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                      <User size={28} />
                    </div>
                  )}
                  <div>
                    <input id="foto-red-criminal" type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
                      onChange={(e) => { if (e.target.files[0]) setFotoArchivo(e.target.files[0]); }} />
                    <button type="button" onClick={() => document.getElementById("foto-red-criminal").click()}
                      style={{ ...btnSecondary, padding: "10px 16px", fontSize: 13 }}>
                      <Camera size={15} /> {fotoPreviewUrl || fotoArchivo ? "Reemplazar foto" : "Subir foto"}
                    </button>
                  </div>
                </div>
              </div>

              <Input label="Teléfono (10 dígitos)" value={form.telefono} onChange={(v) => set("telefono", v)} placeholder="7441234567" required />
              <Input label="Nombre principal" value={form.nombre_principal} onChange={(v) => set("nombre_principal", v)} placeholder="Si se conoce la identidad" />
              <TextArea label="Alias conocidos (uno por línea)" value={form.alias} onChange={(v) => set("alias", v)} rows={3} placeholder={"Jorge\nMexicano\nEl Meno"} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Input label="Grupo delictivo" value={form.grupo_delictivo} onChange={(v) => set("grupo_delictivo", v)} placeholder="Si se autodenomina o se identifica" />
                <Input label="Carpeta de investigación" value={form.carpeta_investigacion} onChange={(v) => set("carpeta_investigacion", v)} placeholder="C.I. si aplica" />
              </div>

              <TextArea label="Notas" value={form.notas} onChange={(v) => set("notas", v)} rows={2} />

              <div style={{ display: "flex", alignItems: "center", gap: 8, background: form.detenido ? "#fcebeb" : "transparent", borderRadius: 7, padding: form.detenido ? "10px" : 0 }}>
                <input type="checkbox" checked={form.detenido} onChange={(e) => set("detenido", e.target.checked)} style={{ width: 18, height: 18 }} />
                <label style={{ color: "#ef4444", fontSize: 14, fontWeight: 700 }}>Marcar como detenido</label>
              </div>

              {form.detenido && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Input label="Fecha de detección" value={form.fecha_deteccion} onChange={(v) => set("fecha_deteccion", v)} placeholder="AAAA-MM-DD" />
                  <Input label="SPID de detección" value={form.spid_deteccion} onChange={(v) => set("spid_deteccion", v)} placeholder="SPID20261012" />
                </div>
              )}

              {mensaje && (
                <div style={{ background: mensaje.tipo === "ok" ? "#e1f5ee" : "#fcebeb", border: `1px solid ${mensaje.tipo === "ok" ? "#22c55e44" : "#ef444444"}`, borderRadius: 8, padding: 10, color: mensaje.tipo === "ok" ? "#0f6e56" : "#791f1f", fontSize: 13 }}>
                  {mensaje.texto}
                </div>
              )}
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #e8ecf1", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setMostrarForm(false)} style={{ background: "transparent", color: "#6b7280", border: "1px solid #e8ecf1", borderRadius: 8, padding: "12px 20px", fontSize: 14, cursor: "pointer" }}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={{ ...btnPrimary, opacity: guardando ? 0.6 : 1 }}>
                {guardando ? "Guardando…" : (contactoActivo ? "Guardar cambios" : "Registrar contacto")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
