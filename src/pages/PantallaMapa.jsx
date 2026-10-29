// src/pages/PantallaMapa.jsx
// Piezas visuales del mapa para presentación (pantalla completa) y de las tarjetas de cifras,
// con el mismo estilo de los módulos 911 y Primer Respondiente (tarjetas blancas, ícono en recuadro, cifra y etiqueta).
// No toma datos ni toca el mapa: solo dibuja lo que MapaCalor le entrega.

import { Minimize2 } from 'lucide-react';

export const COL = { navy: '#001a4d', navySoft: '#0a2a63', gold: '#b69054', goldClaro: '#d9bd85', guinda: '#8b1e1e', gray: '#5a6478', bg: '#f4f6fb' };

// Tarjeta de cifra al estilo 911. grande = versión para proyectar
export function TarjetaResumen({ icono: Icono, color, valor, etiqueta, grande }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: grande ? '16px 20px' : 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: grande ? 54 : 42, height: grande ? 54 : 42, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icono size={grande ? 28 : 20} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: grande ? 34 : 22, fontWeight: 700, color: COL.navy, lineHeight: 1.05, wordBreak: 'break-word' }}>{valor}</div>
        <div style={{ fontSize: grande ? 17 : 14, color: COL.gray, marginTop: 3 }}>{etiqueta}</div>
      </div>
    </div>
  );
}

// Barra superior de la pantalla completa
export function BarraSuperior({ alcance, periodo, onSalir }) {
  return (
    <div style={{ background: 'linear-gradient(90deg, ' + COL.navy + ', ' + COL.navySoft + ')', borderBottom: '3px solid ' + COL.gold, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: COL.goldClaro, fontSize: 14, fontWeight: 700, letterSpacing: 1.5 }}>FGE GUERRERO · ANÁLISIS E INTELIGENCIA CRIMINAL</div>
        <div style={{ color: '#fff', fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>Homicidios dolosos · {alcance}</div>
        <div style={{ color: '#dce6f5', fontSize: 17 }}>{periodo}</div>
      </div>
      <button onClick={onSalir} aria-label="Salir de la pantalla completa"
        style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: 8, padding: '10px 18px', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 46, flexShrink: 0 }}>
        <Minimize2 size={20} /> Salir (Esc)
      </button>
    </div>
  );
}

// Capas que se dibujan encima del mapa: cifras a la izquierda, zonas a la derecha, leyenda y reproductor abajo
export function CapasPantalla({ tarjetas, niveles, distanciaKm, zonas, reproductor }) {
  return (
    <>
      <div style={{ position: 'absolute', top: 14, left: 64, zIndex: 1200, display: 'grid', gap: 12, width: 290 }}>
        {tarjetas.map((t) => <TarjetaResumen key={t.etiqueta} {...t} grande />)}
      </div>

      <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 1200, width: 300, background: 'rgba(255,255,255,0.96)', borderRadius: 10, padding: '14px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: COL.navy, marginBottom: 8 }}>Zonas de atención prioritaria</div>
        {zonas && zonas.length > 0 ? zonas.slice(0, 6).map((z) => (
          <div key={z.clave} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 18, color: '#1f2937', padding: '6px 0', borderTop: '1px solid #e8ecf1' }}>
            <span style={{ fontWeight: 700, color: COL.guinda }}>Zona {z.numero}</span>
            <span><strong>{z.n}</strong> casos</span>
          </div>
        )) : <div style={{ fontSize: 16, color: COL.gray }}>Ninguna zona cumple el criterio con este periodo.</div>}
        <div style={{ fontSize: 14, color: COL.gray, marginTop: 8 }}>4 o más homicidios en un mes, a no más de {distanciaKm} km entre sí.</div>
      </div>

      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14, zIndex: 1200, display: 'grid', gap: 10, justifyItems: 'start' }}>
        <div style={{ background: 'rgba(255,255,255,0.96)', borderRadius: 10, padding: '10px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 16, color: '#374151' }}>
          <span style={{ fontWeight: 700 }}>Concentración (casos a menos de {distanciaKm} km):</span>
          {niveles.map((n) => (
            <span key={n.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 16, borderRadius: 3, background: n.color, display: 'inline-block' }} />
              <strong>{n.label}</strong> · {n.casos}
            </span>
          ))}
        </div>
        <div style={{ width: '100%' }}>{reproductor}</div>
      </div>
    </>
  );
}
