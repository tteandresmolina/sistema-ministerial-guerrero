import { useState, useEffect } from "react";
import {
  FileText, Phone, Siren, MapPin, Search, Users, FolderOpen, Scale, Car, Package,
  Network, Target, LayoutDashboard, History, Archive, Settings, Lock, Menu, X,
  ChevronDown, ChevronRight, ListChecks,
} from "lucide-react";

// Íconos por pestaña (siempre acompañados de su texto)
const ICONOS = {
  oficialia: FileText, registro911: Phone, primerrespondiente: Siren, escenacrimen: MapPin,
  indicios: Search, victimastestigos: Users, expediente: FolderOpen,
  ordenes: Scale, vehiculos: Car, bodega: Package, busqueda: Search, detenidos: Lock,
  dashoperativo: LayoutDashboard, sara: Target, redcriminal: Network, dashboard: ListChecks,
  historico: Archive, subcoord_admin: Settings,
};

// Colores del panel: un tono más suave que el encabezado (#001a4d) para no competir con él.
// Contrastes sobre el fondo: blanco 12:1, dorado claro 6.6:1 (cumple AA/AAA para lectura).
const PANEL = "#1a3566";
const GOLD = "#b69054";        // filete e institucional
const GOLD_CLARO = "#d9bd85";  // texto/íconos dorados legibles sobre el panel
const NAVY = "#001a4d";        // solo para el botón de menú en pantalla chica

function usePantallaChica() {
  const [chica, setChica] = useState(typeof window !== "undefined" && window.innerWidth < 900);
  useEffect(() => {
    const f = () => setChica(window.innerWidth < 900);
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  return chica;
}

// grupos: [{ titulo, items: [{ id, label }] }]  (ya filtrados por rol desde App.jsx)
export default function MenuLateral({ grupos, tabApp, setTabApp }) {
  const chica = usePantallaChica();
  const [abierto, setAbierto] = useState(false);          // cajón en pantalla chica
  const [cerrados, setCerrados] = useState({});           // grupos plegados

  const actual = grupos.flatMap((g) => g.items).find((i) => i.id === tabApp);

  const elegir = (id) => { setTabApp(id); if (chica) setAbierto(false); };

  const panel = (
    <nav aria-label="Menú principal" style={{ padding: "14px 10px 24px" }}>
      {grupos.filter((g) => g.items.length > 0).map((g) => {
        const plegado = !!cerrados[g.titulo];
        const Chev = plegado ? ChevronRight : ChevronDown;
        return (
          <div key={g.titulo} style={{ marginBottom: 14 }}>
            <button
              onClick={() => setCerrados((c) => ({ ...c, [g.titulo]: !c[g.titulo] }))}
              aria-expanded={!plegado}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", borderBottom: `1px solid ${GOLD_CLARO}66`, padding: "8px 8px", color: GOLD_CLARO, fontSize: 16, fontWeight: 800, cursor: "pointer", textAlign: "left", minHeight: 40 }}>
              <span>{g.titulo}</span>
              <Chev size={18} />
            </button>
            {!plegado && (
              <div style={{ marginTop: 6, display: "grid", gap: 3 }}>
                {g.items.map((it) => {
                  const Icono = ICONOS[it.id] || FileText;
                  const activo = it.id === tabApp;
                  return (
                    <button key={it.id} onClick={() => elegir(it.id)} aria-current={activo ? "page" : undefined}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
                        background: activo ? "rgba(217,189,133,0.20)" : "transparent",
                        border: "none", borderLeft: `5px solid ${activo ? GOLD_CLARO : "transparent"}`,
                        borderRadius: 6, padding: "10px 12px", minHeight: 48,
                        color: "#ffffff", fontSize: 17, fontWeight: activo ? 800 : 600, cursor: "pointer",
                      }}>
                      <Icono size={22} style={{ color: activo ? GOLD_CLARO : "#dce6f5", flexShrink: 0 }} />
                      <span>{it.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  // ── Pantalla chica: barra con botón "Menú" y cajón ──
  if (chica) {
    return (
      <>
        <button onClick={() => setAbierto(true)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: "#eef1f6", border: "none", borderBottom: "1px solid #d9dee5", padding: "12px 16px", color: NAVY, fontSize: 17, fontWeight: 800, cursor: "pointer", minHeight: 52 }}>
          <Menu size={22} /> <span>Menú</span>
          <span style={{ marginLeft: "auto", color: "#4a5268", fontWeight: 600, fontSize: 16 }}>{actual?.label}</span>
        </button>
        {abierto && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
            <div style={{ width: "82%", maxWidth: 320, background: PANEL, overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 10px 0" }}>
                <button onClick={() => setAbierto(false)} aria-label="Cerrar menú"
                  style={{ background: "none", border: "1.5px solid rgba(255,255,255,0.5)", borderRadius: 7, color: "#fff", padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                  <X size={18} /> Cerrar
                </button>
              </div>
              {panel}
            </div>
            <div onClick={() => setAbierto(false)} style={{ flex: 1, background: "rgba(0,0,0,0.45)" }} />
          </div>
        )}
      </>
    );
  }

  // ── Pantalla grande: panel fijo a la izquierda ──
  return (
    <aside style={{ width: 270, flexShrink: 0, background: PANEL, borderRight: `3px solid ${GOLD}`, position: "sticky", top: 0, alignSelf: "flex-start", height: "calc(100vh / var(--zoom, 1))", overflowY: "auto" }}>
      {panel}
    </aside>
  );
}
