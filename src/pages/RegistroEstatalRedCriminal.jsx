// src/pages/RegistroEstatalRedCriminal.jsx
// Módulo: Registro Estatal de Red Criminal — Análisis Forense
// Paso 1: directorio de contactos_estatales (lista, búsqueda, detalle, alta manual)
// Acceso exclusivo: coordinacion_especializada incluye 'analisis_forense'
// (a diferencia de Bodega de Indicios, aquí NO hay atajo automático para mando/regional)

import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import {
  Search, Plus, X, Phone, User, ShieldAlert, CheckCircle2,
  FileText, Link2, Fingerprint, Camera, Users, Briefcase,
  Smartphone, Mail, Hash, Upload, GitMerge,
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

// ============================================================================
// URLs FIRMADAS — bucket 'fotos-objetivos' (dispositivos_intervenidos),
// mismo mecanismo, bucket distinto.
// ============================================================================
const BUCKET_FOTOS_OBJ = "fotos-objetivos";
const RUTA_PUBLICA_PREFIJO_OBJ = `/storage/v1/object/public/${BUCKET_FOTOS_OBJ}/`;

function rutaDesdeUrlPublicaObj(urlPublica) {
  if (!urlPublica) return null;
  const idx = urlPublica.indexOf(RUTA_PUBLICA_PREFIJO_OBJ);
  if (idx === -1) return null;
  return decodeURIComponent(urlPublica.slice(idx + RUTA_PUBLICA_PREFIJO_OBJ.length));
}

async function firmarUrlsObj(urlsPublicas, expiresIn = 3600) {
  const pares = (urlsPublicas || [])
    .map((url) => ({ url, ruta: rutaDesdeUrlPublicaObj(url) }))
    .filter((p) => p.ruta);
  if (pares.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET_FOTOS_OBJ)
    .createSignedUrls(pares.map((p) => p.ruta), expiresIn);
  if (error || !data) return {};
  const mapa = {};
  data.forEach((item, i) => { if (item.signedUrl) mapa[pares[i].url] = item.signedUrl; });
  return mapa;
}

async function firmarUrlUnicaObj(urlPublica, expiresIn = 3600) {
  const ruta = rutaDesdeUrlPublicaObj(urlPublica);
  if (!ruta) return null;
  const { data, error } = await supabase.storage.from(BUCKET_FOTOS_OBJ).createSignedUrl(ruta, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

// ============================================================================
// URLs FIRMADAS — bucket 'documentos-analisis-forense' (documentos_analisis)
// ============================================================================
const BUCKET_DOCS = "documentos-analisis-forense";
const RUTA_PUBLICA_PREFIJO_DOCS = `/storage/v1/object/public/${BUCKET_DOCS}/`;

function rutaDesdeUrlPublicaDocs(urlPublica) {
  if (!urlPublica) return null;
  const idx = urlPublica.indexOf(RUTA_PUBLICA_PREFIJO_DOCS);
  if (idx === -1) return null;
  return decodeURIComponent(urlPublica.slice(idx + RUTA_PUBLICA_PREFIJO_DOCS.length));
}

async function firmarUrlsDocs(urlsPublicas, expiresIn = 3600) {
  const pares = (urlsPublicas || [])
    .map((url) => ({ url, ruta: rutaDesdeUrlPublicaDocs(url) }))
    .filter((p) => p.ruta);
  if (pares.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET_DOCS)
    .createSignedUrls(pares.map((p) => p.ruta), expiresIn);
  if (error || !data) return {};
  const mapa = {};
  data.forEach((item, i) => { if (item.signedUrl) mapa[pares[i].url] = item.signedUrl; });
  return mapa;
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

const emptyFormDispositivo = {
  spid: "", solicitante: "", evento: "", marca: "", modelo: "", numero: "",
  imei: "", correo: "", titular_alias: "", detenido: false,
  carpeta_investigacion: "", grupo_delictivo: "", fecha_intervencion: "",
  telefono_id: null, telefono_vinculado_label: "",
};

export default function RegistroEstatalRedCriminal({ perfil }) {
  const [vista, setVista] = useState("contactos"); // "contactos" | "dispositivos"
  const [contactos, setContactos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [paginaContactos, setPaginaContactos] = useState(0);
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

  const TAMANO_PAGINA = 5;
  const totalPaginasContactos = Math.max(1, Math.ceil(listaFiltrada.length / TAMANO_PAGINA));
  const listaPaginaContactos = listaFiltrada.slice(paginaContactos * TAMANO_PAGINA, (paginaContactos + 1) * TAMANO_PAGINA);

  useEffect(() => { setPaginaContactos(0); }, [busqueda]);

  const totalDetenidos = contactos.filter((c) => c.detenido).length;

  const [contactoDetalle, setContactoDetalle] = useState(null);
  const [detalleAgenda, setDetalleAgenda] = useState([]);
  const [detalleDocumentos, setDetalleDocumentos] = useState([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [urlsDetalleDocs, setUrlsDetalleDocs] = useState({});

  const abrirDetalle = async (contacto) => {
    setContactoDetalle(contacto);
    setCargandoDetalle(true);

    // Cómo lo tiene guardado cada dispositivo — cruce por número en agenda_registros
    const { data: agendaData } = await supabase
      .from("agenda_registros")
      .select("alias_guardado, dispositivos_intervenidos(id, spid, titular_alias, fecha_intervencion)")
      .eq("numero", contacto.telefono);
    const entradas = (agendaData || []).filter((a) => a.dispositivos_intervenidos);
    setDetalleAgenda(entradas);

    // Dispositivos vinculados directamente (telefono_id), por si no aparecen en agenda_registros
    const { data: dispDirectos } = await supabase
      .from("dispositivos_intervenidos")
      .select("id, spid, titular_alias, fecha_intervencion")
      .eq("telefono_id", contacto.id);

    const idsAgenda = entradas.map((a) => a.dispositivos_intervenidos.id);
    const idsDirectos = (dispDirectos || []).map((d) => d.id);
    const todosIds = [...new Set([...idsAgenda, ...idsDirectos])];

    if (todosIds.length > 0) {
      const { data: docsData } = await supabase
        .from("documentos_analisis")
        .select("*")
        .in("dispositivo_id", todosIds);
      const docs = docsData || [];
      const mapaFirmadas = await firmarUrlsDocs(docs.map((d) => d.url_archivo));
      setUrlsDetalleDocs(mapaFirmadas);
      setDetalleDocumentos(docs);
    } else {
      setDetalleDocumentos([]);
    }
    setCargandoDetalle(false);
  };

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

  // ==========================================================================
  // DISPOSITIVOS INTERVENIDOS
  // ==========================================================================
  const [dispositivos, setDispositivos] = useState([]);
  const [cargandoDisp, setCargandoDisp] = useState(true);
  const [busquedaDisp, setBusquedaDisp] = useState("");
  const [paginaDisp, setPaginaDisp] = useState(0);
  const [dispositivoActivo, setDispositivoActivo] = useState(null);
  const [mostrarFormDisp, setMostrarFormDisp] = useState(false);
  const [formDisp, setFormDisp] = useState(emptyFormDispositivo);
  const [guardandoDisp, setGuardandoDisp] = useState(false);
  const [mensajeDisp, setMensajeDisp] = useState(null);
  const [fotoArchivoDisp, setFotoArchivoDisp] = useState(null);
  const [fotoPreviewUrlDisp, setFotoPreviewUrlDisp] = useState(null);
  const [urlsFotosFirmadasDisp, setUrlsFotosFirmadasDisp] = useState({});
  const [busquedaVincular, setBusquedaVincular] = useState("");
  const [resultadosVincular, setResultadosVincular] = useState([]);
  const [buscandoVincular, setBuscandoVincular] = useState(false);

  const setDisp = (k, v) => setFormDisp((p) => ({ ...p, [k]: v }));

  const cargarDispositivos = async () => {
    setCargandoDisp(true);
    const { data, error } = await supabase
      .from("dispositivos_intervenidos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setMensajeDisp({ tipo: "error", texto: "No se pudo cargar el registro: " + error.message });
    } else {
      const lista = data || [];
      const mapaFirmadas = await firmarUrlsObj(lista.map((d) => d.foto_url).filter(Boolean));
      setUrlsFotosFirmadasDisp(mapaFirmadas);
      setDispositivos(lista);
    }
    setCargandoDisp(false);
  };

  useEffect(() => { if (vista === "dispositivos" || vista === "agenda") cargarDispositivos(); }, [vista]);

  const listaFiltradaDisp = dispositivos.filter((d) => {
    const q = busquedaDisp.trim().toLowerCase();
    if (!q) return true;
    return (
      (d.spid || "").toLowerCase().includes(q) ||
      (d.numero || "").includes(q) ||
      (d.titular_alias || "").toLowerCase().includes(q) ||
      (d.marca || "").toLowerCase().includes(q) ||
      (d.modelo || "").toLowerCase().includes(q)
    );
  });

  const totalPaginasDisp = Math.max(1, Math.ceil(listaFiltradaDisp.length / TAMANO_PAGINA));
  const listaPaginaDisp = listaFiltradaDisp.slice(paginaDisp * TAMANO_PAGINA, (paginaDisp + 1) * TAMANO_PAGINA);

  useEffect(() => { setPaginaDisp(0); }, [busquedaDisp]);

  const totalDispDetenidos = dispositivos.filter((d) => d.detenido).length;

  const abrirNuevoDispositivo = () => {
    setFormDisp(emptyFormDispositivo);
    setDispositivoActivo(null);
    setFotoArchivoDisp(null);
    setFotoPreviewUrlDisp(null);
    setDocumentos([]);
    setBusquedaVincular(""); setResultadosVincular([]);
    setMostrarFormDisp(true);
    setMensajeDisp(null);
  };

  const abrirEdicionDispositivo = async (d) => {
    setFormDisp({
      spid: d.spid || "",
      solicitante: d.solicitante || "",
      evento: d.evento || "",
      marca: d.marca || "",
      modelo: d.modelo || "",
      numero: d.numero || "",
      imei: (d.imei || []).join("\n"),
      correo: d.correo || "",
      titular_alias: d.titular_alias || "",
      detenido: d.detenido || false,
      carpeta_investigacion: d.carpeta_investigacion || "",
      grupo_delictivo: d.grupo_delictivo || "",
      fecha_intervencion: d.fecha_intervencion || "",
      telefono_id: d.telefono_id || null,
      telefono_vinculado_label: d._telefono_vinculado_label || "",
    });
    setDispositivoActivo(d);
    setFotoArchivoDisp(null);
    setFotoPreviewUrlDisp(urlsFotosFirmadasDisp[d.foto_url] || null);
    if (d.foto_url && !urlsFotosFirmadasDisp[d.foto_url]) {
      const firmada = await firmarUrlUnicaObj(d.foto_url);
      setFotoPreviewUrlDisp(firmada);
    }
    cargarDocumentos(d.id);
    setBusquedaVincular(""); setResultadosVincular([]);
    setMostrarFormDisp(true);
    setMensajeDisp(null);
  };

  const buscarContactoParaVincular = async (texto) => {
    setBusquedaVincular(texto);
    if (texto.trim().length < 2) { setResultadosVincular([]); return; }
    setBuscandoVincular(true);
    const q = texto.trim();
    const { data } = await supabase
      .from("contactos_estatales")
      .select("id, telefono, nombre_principal")
      .or(`telefono.ilike.%${q}%,nombre_principal.ilike.%${q}%`)
      .limit(8);
    setResultadosVincular(data || []);
    setBuscandoVincular(false);
  };

  const vincularContacto = (contacto) => {
    setDisp("telefono_id", contacto.id);
    setDisp("telefono_vinculado_label", `${formatoTelefono(contacto.telefono)}${contacto.nombre_principal ? " · " + contacto.nombre_principal : ""}`);
    setBusquedaVincular(""); setResultadosVincular([]);
  };

  const quitarVinculo = () => {
    setDisp("telefono_id", null);
    setDisp("telefono_vinculado_label", "");
  };

  const subirFotoDisp = async (dispositivoId, file) => {
    const ext = file.name.split(".").pop();
    const nombreUnico = `${dispositivoId}/foto_${Date.now()}.${ext}`;
    const { error: errorSubida } = await supabase.storage.from(BUCKET_FOTOS_OBJ).upload(nombreUnico, file);
    if (errorSubida) return null;
    const { data } = supabase.storage.from(BUCKET_FOTOS_OBJ).getPublicUrl(nombreUnico);
    return data?.publicUrl || null;
  };

  const guardarDispositivo = async () => {
    if (!formDisp.spid.trim()) {
      setMensajeDisp({ tipo: "error", texto: "El SPID es obligatorio." });
      return;
    }
    setGuardandoDisp(true); setMensajeDisp(null);

    const payload = {
      spid: formDisp.spid.trim(),
      solicitante: formDisp.solicitante || null,
      evento: formDisp.evento || null,
      marca: formDisp.marca || null,
      modelo: formDisp.modelo || null,
      numero: formDisp.numero || null,
      imei: formDisp.imei.split("\n").map((s) => s.trim()).filter(Boolean),
      correo: formDisp.correo || null,
      titular_alias: formDisp.titular_alias || null,
      detenido: formDisp.detenido,
      carpeta_investigacion: formDisp.carpeta_investigacion || null,
      grupo_delictivo: formDisp.grupo_delictivo || null,
      fecha_intervencion: formDisp.fecha_intervencion || null,
      telefono_id: formDisp.telefono_id || null,
    };

    let error, idParaFoto;
    if (dispositivoActivo) {
      idParaFoto = dispositivoActivo.id;
      if (fotoArchivoDisp) {
        const url = await subirFotoDisp(idParaFoto, fotoArchivoDisp);
        if (url) payload.foto_url = url;
      }
      ({ error } = await supabase.from("dispositivos_intervenidos").update(payload).eq("id", idParaFoto));
    } else {
      const { data: nuevo, error: errorInsert } = await supabase.from("dispositivos_intervenidos").insert([{
        ...payload,
        registrado_por_id: perfil?.id || null,
      }]).select().single();
      error = errorInsert;
      if (!error && nuevo) {
        idParaFoto = nuevo.id;
        if (fotoArchivoDisp) {
          const url = await subirFotoDisp(idParaFoto, fotoArchivoDisp);
          if (url) await supabase.from("dispositivos_intervenidos").update({ foto_url: url }).eq("id", idParaFoto);
        }
      }
    }

    setGuardandoDisp(false);
    if (error) {
      setMensajeDisp({ tipo: "error", texto: "Error al guardar: " + error.message });
      return;
    }
    setMostrarFormDisp(false);
    setDispositivoActivo(null);
    cargarDispositivos();
  };

  // ==========================================================================
  // DOCUMENTOS DEL EXPEDIENTE (por dispositivo)
  // ==========================================================================
  const [documentos, setDocumentos] = useState([]);
  const [cargandoDocs, setCargandoDocs] = useState(false);
  const [subiendoDoc, setSubiendoDoc] = useState(false);
  const [mensajeDoc, setMensajeDoc] = useState(null);
  const [urlsDocsFirmadas, setUrlsDocsFirmadas] = useState({});

  const cargarDocumentos = async (dispositivoId) => {
    setCargandoDocs(true);
    const { data, error } = await supabase
      .from("documentos_analisis")
      .select("*")
      .eq("dispositivo_id", dispositivoId)
      .order("created_at", { ascending: false });
    if (!error) {
      const lista = data || [];
      const mapaFirmadas = await firmarUrlsDocs(lista.map((d) => d.url_archivo));
      setUrlsDocsFirmadas(mapaFirmadas);
      setDocumentos(lista);
    }
    setCargandoDocs(false);
  };

  const subirDocumento = async (file) => {
    if (!dispositivoActivo) return;
    setSubiendoDoc(true); setMensajeDoc(null);
    const ext = file.name.split(".").pop().toLowerCase();
    const nombreUnico = `${dispositivoActivo.id}/${Date.now()}_${file.name}`;

    const { error: errorSubida } = await supabase.storage.from(BUCKET_DOCS).upload(nombreUnico, file);
    if (errorSubida) {
      setSubiendoDoc(false);
      setMensajeDoc({ tipo: "error", texto: "Error al subir: " + errorSubida.message });
      return;
    }
    const { data } = supabase.storage.from(BUCKET_DOCS).getPublicUrl(nombreUnico);

    const { error: errorInsert } = await supabase.from("documentos_analisis").insert([{
      dispositivo_id: dispositivoActivo.id,
      nombre_archivo: file.name,
      tipo_archivo: ext,
      url_archivo: data?.publicUrl || null,
      registrado_por_id: perfil?.id || null,
    }]);

    setSubiendoDoc(false);
    if (errorInsert) {
      setMensajeDoc({ tipo: "error", texto: "Error al registrar: " + errorInsert.message });
      return;
    }
    cargarDocumentos(dispositivoActivo.id);
  };

  const iconoDocumento = (tipo) => {
    if (tipo === "pdf") return { icon: FileText, color: "#dc3545" };
    if (tipo === "xlsx" || tipo === "xls") return { icon: FileText, color: "#1e7a3d" };
    if (tipo === "pptx" || tipo === "ppt") return { icon: FileText, color: "#d24726" };
    return { icon: FileText, color: "#6b7280" };
  };

  // ==========================================================================
  // AGENDA — importar Excel de un dispositivo + detección de coincidencias
  // ==========================================================================
  const [dispositivoParaImportar, setDispositivoParaImportar] = useState("");
  const [archivoImportar, setArchivoImportar] = useState(null);
  const [previewImportar, setPreviewImportar] = useState(null); // [{numero, alias}]
  const [importando, setImportando] = useState(false);
  const [mensajeImport, setMensajeImport] = useState(null);

  const [coincidencias, setCoincidencias] = useState([]);
  const [cargandoCoincidencias, setCargandoCoincidencias] = useState(true);

  const procesarArchivoImport = (file) => {
    setArchivoImportar(file);
    setMensajeImport(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "binary" });
        const nombreHoja = wb.SheetNames.includes("AGENDA_DEPURADA") ? "AGENDA_DEPURADA" : wb.SheetNames[0];
        const hoja = wb.Sheets[nombreHoja];
        const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" });
        const registros = filas
          .map((f) => ({
            numero: String(f.PERIFERICO || f.NUMERO || "").replace(/\D/g, ""),
            alias: String(f.NOMBRE || "").trim(),
          }))
          .filter((r) => r.numero.length >= 10);
        setPreviewImportar(registros);
      } catch (err) {
        setMensajeImport({ tipo: "error", texto: "No se pudo leer el archivo: " + err.message });
        setPreviewImportar(null);
      }
    };
    reader.readAsBinaryString(file);
  };

  const importarAgenda = async () => {
    if (!dispositivoParaImportar) {
      setMensajeImport({ tipo: "error", texto: "Selecciona primero a qué dispositivo pertenece esta agenda." });
      return;
    }
    if (!previewImportar || previewImportar.length === 0) {
      setMensajeImport({ tipo: "error", texto: "Sube un archivo con registros válidos." });
      return;
    }
    setImportando(true); setMensajeImport(null);

    const filas = previewImportar.map((r) => ({
      dispositivo_id: dispositivoParaImportar,
      numero: r.numero,
      alias_guardado: r.alias || null,
      registrado_por_id: perfil?.id || null,
    }));

    // Se sube en lotes de 500 para no exceder el tamaño de una sola petición
    const TAMANO_LOTE = 500;
    let insertados = 0;
    for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
      const lote = filas.slice(i, i + TAMANO_LOTE);
      const { error } = await supabase.from("agenda_registros").insert(lote);
      if (error) {
        setImportando(false);
        setMensajeImport({ tipo: "error", texto: `Error en el lote ${i / TAMANO_LOTE + 1}: ${error.message}` });
        return;
      }
      insertados += lote.length;
    }

    setImportando(false);
    setMensajeImport({ tipo: "ok", texto: `✅ Se importaron ${insertados} registros de agenda.` });
    setArchivoImportar(null);
    setPreviewImportar(null);
    setDispositivoParaImportar("");
    cargarCoincidencias();
  };

  const cargarCoincidencias = async () => {
    setCargandoCoincidencias(true);
    const { data, error } = await supabase
      .from("agenda_registros")
      .select("numero, alias_guardado, dispositivo_id, dispositivos_intervenidos(spid)");
    if (error || !data) { setCoincidencias([]); setCargandoCoincidencias(false); return; }

    const mapa = {};
    data.forEach((fila) => {
      if (!mapa[fila.numero]) mapa[fila.numero] = { numero: fila.numero, alias: new Set(), spids: new Set(), dispositivos: new Set() };
      if (fila.alias_guardado) mapa[fila.numero].alias.add(fila.alias_guardado);
      if (fila.dispositivos_intervenidos?.spid) mapa[fila.numero].spids.add(fila.dispositivos_intervenidos.spid);
      mapa[fila.numero].dispositivos.add(fila.dispositivo_id);
    });

    const lista = Object.values(mapa)
      .filter((c) => c.dispositivos.size > 1)
      .map((c) => ({ numero: c.numero, alias: [...c.alias], spids: [...c.spids] }))
      .sort((a, b) => b.alias.length - a.alias.length);

    setCoincidencias(lista);
    setCargandoCoincidencias(false);
  };

  useEffect(() => { if (vista === "agenda") cargarCoincidencias(); }, [vista]);

  return (
    <div>
      <h3 style={{ margin: "0 0 4px 0", color: COLORS.primary, fontSize: 20, display: "flex", alignItems: "center", gap: 10 }}>
        <Fingerprint size={22} style={{ color: COLORS.gold }} />
        Registro Estatal de Red Criminal
      </h3>
      <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 20px 0" }}>
        Directorio acumulativo de contactos identificados a través de análisis forense digital
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        <button onClick={() => setVista("contactos")} style={{ padding: "10px 20px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, border: vista === "contactos" ? "2px solid #b69054" : "1px solid #e8ecf1", background: vista === "contactos" ? "#f5ede0" : COLORS.white, color: vista === "contactos" ? COLORS.primary : "#666", fontSize: 14, fontWeight: 700 }}>
          <User size={16} /> Contactos
        </button>
        <button onClick={() => setVista("dispositivos")} style={{ padding: "10px 20px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, border: vista === "dispositivos" ? "2px solid #b69054" : "1px solid #e8ecf1", background: vista === "dispositivos" ? "#f5ede0" : COLORS.white, color: vista === "dispositivos" ? COLORS.primary : "#666", fontSize: 14, fontWeight: 700 }}>
          <Smartphone size={16} /> Dispositivos
        </button>
        <button onClick={() => setVista("agenda")} style={{ padding: "10px 20px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, border: vista === "agenda" ? "2px solid #b69054" : "1px solid #e8ecf1", background: vista === "agenda" ? "#f5ede0" : COLORS.white, color: vista === "agenda" ? COLORS.primary : "#666", fontSize: 14, fontWeight: 700 }}>
          <GitMerge size={16} /> Agenda
        </button>
      </div>

      {vista === "contactos" && (
      <>
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

      {!contactoDetalle ? (
      <>
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
        <>
        {listaPaginaContactos.map((c) => (
          <div key={c.id} onClick={() => abrirDetalle(c)} style={{ ...cardStyle, cursor: "pointer", transition: "box-shadow 0.2s" }}
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
        ))}

        {totalPaginasContactos > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <button onClick={() => setPaginaContactos((p) => Math.max(0, p - 1))} disabled={paginaContactos === 0}
              style={{ ...btnSecondary, padding: "8px 16px", fontSize: 13, opacity: paginaContactos === 0 ? 0.4 : 1 }}>← Anterior</button>
            <span style={{ color: "#6b7280", fontSize: 13, fontWeight: 700 }}>Página {paginaContactos + 1} de {totalPaginasContactos}</span>
            <button onClick={() => setPaginaContactos((p) => Math.min(totalPaginasContactos - 1, p + 1))} disabled={paginaContactos >= totalPaginasContactos - 1}
              style={{ ...btnSecondary, padding: "8px 16px", fontSize: 13, opacity: paginaContactos >= totalPaginasContactos - 1 ? 0.4 : 1 }}>Siguiente →</button>
          </div>
        )}
        </>
      )}
      </>
      ) : (
      <>
      <button onClick={() => setContactoDetalle(null)} style={{ ...btnSecondary, padding: "8px 16px", fontSize: 13, marginBottom: 14 }}>← Volver</button>

      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          {urlsFotosFirmadas[contactoDetalle.foto_url] ? (
            <img src={urlsFotosFirmadas[contactoDetalle.foto_url]} alt={contactoDetalle.nombre_principal || contactoDetalle.telefono}
              style={{ width: 84, height: 84, borderRadius: 12, objectFit: "cover", border: "2px solid #c7cfe0", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 84, height: 84, borderRadius: 12, background: "#f9fafb", border: "2px dashed #c7cfe0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <User size={32} style={{ color: "#9ca3af" }} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: COLORS.primary, fontFamily: "monospace" }}>{formatoTelefono(contactoDetalle.telefono)}</span>
              {contactoDetalle.detenido && <span style={{ background: "#ef4444", color: COLORS.white, borderRadius: 4, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>DETENIDO</span>}
            </div>
            {contactoDetalle.nombre_principal && <div style={{ fontSize: 16, color: "#374151", marginTop: 4 }}>Identidad probable: {contactoDetalle.nombre_principal}</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {contactoDetalle.grupo_delictivo && (
                <span style={{ background: "#791f1f22", color: "#791f1f", border: "1px solid #791f1f55", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
                  <Users size={12} style={{ marginRight: 4, verticalAlign: -2 }} />Grupo delictivo: {contactoDetalle.grupo_delictivo}
                </span>
              )}
              {contactoDetalle.carpeta_investigacion && (
                <span style={{ background: "#f5ede0", color: COLORS.primary, border: `1px solid ${COLORS.gold}55`, borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, fontFamily: "monospace" }}>
                  C.I. {contactoDetalle.carpeta_investigacion}
                </span>
              )}
              {contactoDetalle.alias && contactoDetalle.alias.map((a, i) => (
                <span key={i} style={{ background: COLORS.gold + "1a", color: COLORS.gold, border: `1px solid ${COLORS.gold}55`, borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>"{a}"</span>
              ))}
            </div>
            {contactoDetalle.notas && <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>{contactoDetalle.notas}</div>}
          </div>
          <button onClick={() => { setContactoDetalle(null); abrirEdicion(contactoDetalle); }} style={{ ...btnSecondary, padding: "9px 16px", fontSize: 13, whiteSpace: "nowrap" }}>Editar</button>
        </div>
      </div>

      {cargandoDetalle ? (
        <div style={{ textAlign: "center", padding: 30, color: "#9ca3af" }}>Cargando cruce de información…</div>
      ) : (
        <>
          <div style={cardStyle}>
            <div style={tituloSeccion}><Smartphone size={16} /> Cómo lo tiene guardado cada dispositivo</div>
            {detalleAgenda.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 16 }}>
                No se ha detectado este número en ninguna agenda importada todavía.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${COLORS.gold}` }}>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 700 }}>ALIAS REGISTRADO</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 700 }}>SPID</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 700 }}>TITULAR DEL DISPOSITIVO</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 700 }}>FECHA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalleAgenda.map((a, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #e8ecf1" }}>
                        <td style={{ padding: "8px 10px", color: COLORS.primary, fontWeight: 600 }}>{a.alias_guardado || "—"}</td>
                        <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#374151" }}>{a.dispositivos_intervenidos.spid}</td>
                        <td style={{ padding: "8px 10px", color: "#374151" }}>{a.dispositivos_intervenidos.titular_alias || "—"}</td>
                        <td style={{ padding: "8px 10px", color: "#6b7280" }}>{a.dispositivos_intervenidos.fecha_intervencion || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <div style={tituloSeccion}><Briefcase size={16} /> Expedientes donde aparece</div>
            {(() => {
              const spidsUnicos = [...new Map(detalleAgenda.map((a) => [a.dispositivos_intervenidos.spid, a.dispositivos_intervenidos])).values()];
              return spidsUnicos.length === 0 ? (
                <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 16 }}>Sin expedientes relacionados todavía.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {spidsUnicos.map((d, i) => (
                    <div key={i} style={{ background: "#f9fafb", border: "1px solid #e8ecf1", borderRadius: 8, padding: 12 }}>
                      <div style={{ fontWeight: 700, color: COLORS.primary, fontFamily: "monospace", fontSize: 13 }}>{d.spid}</div>
                      {d.titular_alias && <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>{d.titular_alias}</div>}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div style={cardStyle}>
            <div style={tituloSeccion}><FileText size={16} /> Documentos del expediente</div>
            {detalleDocumentos.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 16 }}>Sin documentos adjuntos todavía.</div>
            ) : (
              detalleDocumentos.map((doc) => {
                const { icon: Icon, color } = iconoDocumento(doc.tipo_archivo);
                return (
                  <a key={doc.id} href={urlsDetalleDocs[doc.url_archivo] || doc.url_archivo} target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 8, background: "#f9fafb", borderRadius: 6, padding: "10px 12px", marginBottom: 6, textDecoration: "none", border: "1px solid #e8ecf1" }}>
                    <Icon size={16} style={{ color }} />
                    <span style={{ color: COLORS.primary, fontSize: 13, flex: 1 }}>{doc.nombre_archivo}</span>
                    <span style={{ color: COLORS.gold, fontSize: 12, fontWeight: 700 }}>Ver →</span>
                  </a>
                );
              })
            )}
          </div>
        </>
      )}
      </>
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
      </>
      )}

      {vista === "dispositivos" && (
      <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <div style={{ ...cardStyle, marginBottom: 0, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, background: COLORS.primary + "12", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Smartphone size={22} style={{ color: COLORS.primary }} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.primary }}>{dispositivos.length}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>dispositivos intervenidos</div>
          </div>
        </div>
        <div style={{ ...cardStyle, marginBottom: 0, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, background: "#ef444412", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ShieldAlert size={22} style={{ color: "#ef4444" }} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#ef4444" }}>{totalDispDetenidos}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>marcados detenidos</div>
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 280px" }}>
          <Search size={17} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input value={busquedaDisp} onChange={(e) => setBusquedaDisp(e.target.value)}
            placeholder="Buscar SPID, número, alias, marca o modelo…"
            style={{ ...inputStyle, paddingLeft: 40 }} />
        </div>
        <button onClick={abrirNuevoDispositivo} style={btnPrimary}><Plus size={17} /> Subir SPID nuevo</button>
      </div>

      {mensajeDisp && !mostrarFormDisp && (
        <div style={{ background: mensajeDisp.tipo === "ok" ? "#e1f5ee" : "#fcebeb", border: `1px solid ${mensajeDisp.tipo === "ok" ? "#22c55e44" : "#ef444444"}`, borderRadius: 8, padding: 12, marginBottom: 16, color: mensajeDisp.tipo === "ok" ? "#0f6e56" : "#791f1f", fontSize: 14 }}>
          {mensajeDisp.texto}
        </div>
      )}

      {cargandoDisp ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Cargando…</div>
      ) : listaFiltradaDisp.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 40, color: "#9ca3af" }}>
          {busquedaDisp ? "Sin resultados para esta búsqueda." : "Aún no hay dispositivos registrados."}
        </div>
      ) : (
        <>
        {listaPaginaDisp.map((d) => (
          <div key={d.id} onClick={() => abrirEdicionDispositivo(d)} style={{ ...cardStyle, cursor: "pointer", transition: "box-shadow 0.2s" }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {urlsFotosFirmadasDisp[d.foto_url] ? (
                  <img src={urlsFotosFirmadasDisp[d.foto_url]} alt={d.titular_alias || d.spid}
                    style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "1px solid #e8ecf1", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f9fafb", border: "1px solid #e8ecf1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Smartphone size={20} style={{ color: "#9ca3af" }} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, fontFamily: "monospace" }}>{d.spid}</div>
                  <div style={{ fontSize: 14, color: "#374151", marginTop: 2 }}>
                    {[d.marca, d.modelo].filter(Boolean).join(" ") || "—"}
                    {d.numero && <span style={{ fontFamily: "monospace", color: "#6b7280" }}> · {formatoTelefono(d.numero)}</span>}
                  </div>
                  {d.titular_alias && <div style={{ fontSize: 13, color: COLORS.gold, fontWeight: 700, marginTop: 2 }}>"{d.titular_alias}"</div>}
                  {d.grupo_delictivo && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, color: "#791f1f", fontSize: 12, fontWeight: 700 }}>
                      <Users size={12} /> {d.grupo_delictivo}
                    </div>
                  )}
                  {d.carpeta_investigacion && (
                    <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2, fontFamily: "monospace" }}>C.I. {d.carpeta_investigacion}</div>
                  )}
                </div>
              </div>
              {d.detenido && (
                <span style={{ background: "#ef444422", color: "#791f1f", border: "1px solid #ef444455", borderRadius: 4, padding: "4px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>DETENIDO</span>
              )}
            </div>
          </div>
        ))}

        {totalPaginasDisp > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <button onClick={() => setPaginaDisp((p) => Math.max(0, p - 1))} disabled={paginaDisp === 0}
              style={{ ...btnSecondary, padding: "8px 16px", fontSize: 13, opacity: paginaDisp === 0 ? 0.4 : 1 }}>← Anterior</button>
            <span style={{ color: "#6b7280", fontSize: 13, fontWeight: 700 }}>Página {paginaDisp + 1} de {totalPaginasDisp}</span>
            <button onClick={() => setPaginaDisp((p) => Math.min(totalPaginasDisp - 1, p + 1))} disabled={paginaDisp >= totalPaginasDisp - 1}
              style={{ ...btnSecondary, padding: "8px 16px", fontSize: 13, opacity: paginaDisp >= totalPaginasDisp - 1 ? 0.4 : 1 }}>Siguiente →</button>
          </div>
        )}
        </>
      )}

      {mostrarFormDisp && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,26,77,0.5)", display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 30, zIndex: 1000, overflowY: "auto" }}
          onClick={() => setMostrarFormDisp(false)}>
          <div style={{ background: COLORS.white, borderRadius: 14, width: "100%", maxWidth: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", marginBottom: 40 }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ background: "#0a2a63", color: COLORS.white, padding: "18px 24px", borderRadius: "14px 14px 0 0", boxShadow: "0 3px 10px rgba(0,0,0,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Smartphone size={20} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>{dispositivoActivo ? "Editar dispositivo" : "Nuevo dispositivo intervenido"}</span>
              </div>
              <X size={20} style={{ cursor: "pointer" }} onClick={() => setMostrarFormDisp(false)} />
            </div>

            <div style={{ padding: 24, display: "grid", gap: 14 }}>
              <div>
                <label style={labelStyle}>Fotografía del individuo</label>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {fotoArchivoDisp ? (
                    <img src={URL.createObjectURL(fotoArchivoDisp)} alt="Nueva foto" style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", border: `2px solid ${COLORS.gold}` }} />
                  ) : fotoPreviewUrlDisp ? (
                    <img src={fotoPreviewUrlDisp} alt="Foto actual" style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", border: "2px solid #c7cfe0" }} />
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: 10, background: "#f9fafb", border: "2px dashed #c7cfe0", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                      <User size={28} />
                    </div>
                  )}
                  <div>
                    <input id="foto-dispositivo" type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
                      onChange={(e) => { if (e.target.files[0]) setFotoArchivoDisp(e.target.files[0]); }} />
                    <button type="button" onClick={() => document.getElementById("foto-dispositivo").click()}
                      style={{ ...btnSecondary, padding: "10px 16px", fontSize: 13 }}>
                      <Camera size={15} /> {fotoPreviewUrlDisp || fotoArchivoDisp ? "Reemplazar foto" : "Subir foto"}
                    </button>
                  </div>
                </div>
              </div>

              <Input label="SPID" value={formDisp.spid} onChange={(v) => setDisp("spid", v)} placeholder="SPID20261012" required />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Input label="Solicitante" value={formDisp.solicitante} onChange={(v) => setDisp("solicitante", v)} placeholder="Ej. SSPC Investigación" />
                <Input label="Evento" value={formDisp.evento} onChange={(v) => setDisp("evento", v)} placeholder="Ej. Detención en flagrancia" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Input label="Marca" value={formDisp.marca} onChange={(v) => setDisp("marca", v)} placeholder="Apple, Samsung…" />
                <Input label="Modelo" value={formDisp.modelo} onChange={(v) => setDisp("modelo", v)} placeholder="iPhone 15" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Input label="Número del dispositivo" value={formDisp.numero} onChange={(v) => setDisp("numero", v)} placeholder="7444290091" />
                <Input label="Alias del titular" value={formDisp.titular_alias} onChange={(v) => setDisp("titular_alias", v)} placeholder='Ej. "Jorgue"' />
              </div>

              <TextArea label="IMEI (uno por línea — algunos traen 2, dual SIM)" value={formDisp.imei} onChange={(v) => setDisp("imei", v)} rows={2} placeholder={"359987254425890\n359987254358372"} />
              <Input label="Correo" value={formDisp.correo} onChange={(v) => setDisp("correo", v)} placeholder="correo@ejemplo.com" />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Input label="Grupo delictivo" value={formDisp.grupo_delictivo} onChange={(v) => setDisp("grupo_delictivo", v)} placeholder="Si se autodenomina o se identifica" />
                <Input label="Carpeta de investigación" value={formDisp.carpeta_investigacion} onChange={(v) => setDisp("carpeta_investigacion", v)} placeholder="C.I. si aplica" />
              </div>

              <Input label="Fecha de intervención" value={formDisp.fecha_intervencion} onChange={(v) => setDisp("fecha_intervencion", v)} placeholder="AAAA-MM-DD" />

              <div>
                <label style={labelStyle}>Vincular a un contacto de Red Criminal (opcional)</label>
                {formDisp.telefono_id ? (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f5ede0", border: `1px solid ${COLORS.gold}55`, borderRadius: 7, padding: "10px 14px" }}>
                    <span style={{ fontSize: 14, color: COLORS.primary, fontWeight: 600 }}>
                      <Link2 size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                      {formDisp.telefono_vinculado_label}
                    </span>
                    <button type="button" onClick={quitarVinculo} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Quitar</button>
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    <input value={busquedaVincular} onChange={(e) => buscarContactoParaVincular(e.target.value)}
                      placeholder="Buscar por teléfono o nombre en Red Criminal…" style={inputStyle} />
                    {busquedaVincular.length >= 2 && (
                      <div style={{ background: COLORS.white, border: "1.5px solid #c7cfe0", borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", position: "absolute", zIndex: 10, width: "100%" }}>
                        {buscandoVincular ? (
                          <div style={{ color: "#6b7280", fontSize: 12, padding: 10 }}>Buscando…</div>
                        ) : resultadosVincular.length === 0 ? (
                          <div style={{ color: "#6b7280", fontSize: 12, padding: 10 }}>Sin resultados.</div>
                        ) : (
                          resultadosVincular.map((r) => (
                            <div key={r.id} onClick={() => vincularContacto(r)} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #e8ecf1" }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#f5ede0"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                              <div style={{ color: COLORS.primary, fontSize: 13, fontFamily: "monospace" }}>{formatoTelefono(r.telefono)}</div>
                              {r.nombre_principal && <div style={{ color: "#7c8494", fontSize: 11 }}>{r.nombre_principal}</div>}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {dispositivoActivo && (
                <div>
                  <label style={labelStyle}>Documentos del expediente</label>
                  <div style={{ background: "#f9fafb", border: "1px solid #e8ecf1", borderRadius: 8, padding: 14 }}>
                    <input id="doc-dispositivo" type="file" accept=".pdf,.xlsx,.xls,.pptx,.ppt,.docx,.doc" style={{ display: "none" }}
                      onChange={(e) => { if (e.target.files[0]) subirDocumento(e.target.files[0]); e.target.value = ""; }} />
                    <button type="button" onClick={() => document.getElementById("doc-dispositivo").click()} disabled={subiendoDoc}
                      style={{ ...btnSecondary, padding: "9px 16px", fontSize: 13, marginBottom: documentos.length > 0 ? 10 : 0 }}>
                      <Upload size={14} /> {subiendoDoc ? "Subiendo…" : "Subir documento (PDF, Excel, PPTX)"}
                    </button>

                    {mensajeDoc && (
                      <div style={{ background: "#fcebeb", border: "1px solid #ef444444", borderRadius: 6, padding: 8, marginBottom: 8, color: "#791f1f", fontSize: 12 }}>
                        {mensajeDoc.texto}
                      </div>
                    )}

                    {cargandoDocs ? (
                      <div style={{ color: "#9ca3af", fontSize: 12 }}>Cargando…</div>
                    ) : documentos.length === 0 ? (
                      <div style={{ color: "#9ca3af", fontSize: 12 }}>Aún no hay documentos adjuntos.</div>
                    ) : (
                      documentos.map((doc) => {
                        const { icon: Icon, color } = iconoDocumento(doc.tipo_archivo);
                        return (
                          <a key={doc.id} href={urlsDocsFirmadas[doc.url_archivo] || doc.url_archivo} target="_blank" rel="noreferrer"
                            style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.white, borderRadius: 6, padding: "8px 10px", marginBottom: 6, textDecoration: "none", border: "1px solid #e8ecf1" }}>
                            <Icon size={16} style={{ color }} />
                            <span style={{ color: COLORS.primary, fontSize: 13, flex: 1, wordBreak: "break-all" }}>{doc.nombre_archivo}</span>
                            <span style={{ color: COLORS.gold, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>Ver →</span>
                          </a>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
              {!dispositivoActivo && (
                <div style={{ color: "#6b7280", fontSize: 12, fontStyle: "italic" }}>
                  Guarda el dispositivo primero para poder adjuntar documentos del expediente.
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 8, background: formDisp.detenido ? "#fcebeb" : "transparent", borderRadius: 7, padding: formDisp.detenido ? "10px" : 0 }}>
                <input type="checkbox" checked={formDisp.detenido} onChange={(e) => setDisp("detenido", e.target.checked)} style={{ width: 18, height: 18 }} />
                <label style={{ color: "#ef4444", fontSize: 14, fontWeight: 700 }}>Marcar como detenido</label>
              </div>

              {mensajeDisp && (
                <div style={{ background: mensajeDisp.tipo === "ok" ? "#e1f5ee" : "#fcebeb", border: `1px solid ${mensajeDisp.tipo === "ok" ? "#22c55e44" : "#ef444444"}`, borderRadius: 8, padding: 10, color: mensajeDisp.tipo === "ok" ? "#0f6e56" : "#791f1f", fontSize: 13 }}>
                  {mensajeDisp.texto}
                </div>
              )}
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #e8ecf1", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setMostrarFormDisp(false)} style={{ background: "transparent", color: "#6b7280", border: "1px solid #e8ecf1", borderRadius: 8, padding: "12px 20px", fontSize: 14, cursor: "pointer" }}>Cancelar</button>
              <button onClick={guardarDispositivo} disabled={guardandoDisp} style={{ ...btnPrimary, opacity: guardandoDisp ? 0.6 : 1 }}>
                {guardandoDisp ? "Guardando…" : (dispositivoActivo ? "Guardar cambios" : "Registrar dispositivo")}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {vista === "agenda" && (
      <>
      <div style={cardStyle}>
        <div style={tituloSeccion}><Upload size={16} /> Importar agenda de un dispositivo</div>
        <p style={{ color: "#6b7280", fontSize: 13, margin: "0 0 16px 0" }}>
          Sube tu archivo de contactos (Excel con columnas OBJETIVO / PERIFERICO / NOMBRE — tu formato universal de SPID) o el <code>_DEPURADO.xlsx</code> de <code>depurar_contactos.py</code>. El sistema detecta cuál es automáticamente.
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={labelStyle}>¿A qué dispositivo pertenece esta agenda?</label>
            <select value={dispositivoParaImportar} onChange={(e) => setDispositivoParaImportar(e.target.value)} style={inputStyle}>
              <option value="">— Seleccionar dispositivo —</option>
              {dispositivos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.spid} — {[d.marca, d.modelo].filter(Boolean).join(" ") || "sin marca/modelo"} {d.titular_alias ? `("${d.titular_alias}")` : ""}
                </option>
              ))}
            </select>
            {dispositivos.length === 0 && (
              <div style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}>
                Aún no hay dispositivos registrados — da de alta uno primero en la pestaña "Dispositivos".
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Archivo Excel</label>
            <input type="file" accept=".xlsx,.xls" onChange={(e) => { if (e.target.files[0]) procesarArchivoImport(e.target.files[0]); }}
              style={{ ...inputStyle, padding: 10 }} />
          </div>

          {previewImportar && (
            <div style={{ background: "#e1f5ee", border: "1px solid #22c55e44", borderRadius: 8, padding: 14, color: "#0f6e56", fontSize: 14 }}>
              Se detectaron <strong>{previewImportar.length}</strong> números válidos en "{archivoImportar?.name}". Listo para importar.
            </div>
          )}

          {mensajeImport && (
            <div style={{ background: mensajeImport.tipo === "ok" ? "#e1f5ee" : "#fcebeb", border: `1px solid ${mensajeImport.tipo === "ok" ? "#22c55e44" : "#ef444444"}`, borderRadius: 8, padding: 10, color: mensajeImport.tipo === "ok" ? "#0f6e56" : "#791f1f", fontSize: 13 }}>
              {mensajeImport.texto}
            </div>
          )}

          <button onClick={importarAgenda} disabled={importando || !previewImportar} style={{ ...btnPrimary, opacity: (importando || !previewImportar) ? 0.6 : 1 }}>
            {importando ? "Importando…" : `Importar ${previewImportar ? previewImportar.length : ""} registros`}
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={tituloSeccion}><GitMerge size={16} /> Coincidencias detectadas</div>
        <p style={{ color: "#6b7280", fontSize: 13, margin: "0 0 16px 0" }}>
          Mismo número, distinto alias entre dispositivos — señal de que puede tratarse de la misma persona bajo distintos apodos.
        </p>

        {cargandoCoincidencias ? (
          <div style={{ textAlign: "center", padding: 30, color: "#9ca3af" }}>Buscando coincidencias…</div>
        ) : coincidencias.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: "#9ca3af" }}>
            Sin coincidencias por ahora — importa agendas de al menos dos dispositivos distintos para que aparezcan aquí.
          </div>
        ) : (
          coincidencias.map((c) => (
            <div key={c.numero} style={{ background: "#f9fafb", border: "1px solid #e8ecf1", borderRadius: 8, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, fontFamily: "monospace" }}>{formatoTelefono(c.numero)}</span>
                <span style={{ background: COLORS.gold + "22", color: COLORS.gold, border: `1px solid ${COLORS.gold}55`, borderRadius: 12, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{c.alias.length} alias</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                {c.alias.map((a, i) => (
                  <span key={i} style={{ background: COLORS.white, border: "1px solid #c7cfe0", borderRadius: 4, padding: "3px 10px", fontSize: 12, color: "#374151" }}>"{a}"</span>
                ))}
              </div>
              <div style={{ color: "#6b7280", fontSize: 11, fontFamily: "monospace" }}>{c.spids.join(" · ")}</div>
            </div>
          ))
        )}
      </div>
      </>
      )}
    </div>
  );
}
