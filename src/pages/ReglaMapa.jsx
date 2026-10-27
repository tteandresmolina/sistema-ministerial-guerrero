// src/pages/ReglaMapa.jsx
// Regla para medir la distancia en línea recta entre un punto A y un punto B del mapa.
//
// Diseñada para NO afectar las capas del mapa:
// - Dibuja solo en una capa propia (L.layerGroup) que el mapa de calor no limpia ni redibuja.
// - Guarda su estado aparte (no provoca que el mapa vuelva a dibujarse ni a encuadrarse).
// - No instala ningún plugin externo.
// - Al terminar, quita su capa, su cursor y sus eventos y deja el mapa como estaba.
// Si el punto A o B se marca cerca de un caso (a menos de 16 px), se "pega" al caso para medir con exactitud.

import { useState, useEffect, useRef } from 'react';
import { Ruler } from 'lucide-react';

const C = { navy: '#001a4d', gold: '#b69054', guinda: '#8b1e1e', gray: '#5a6478', white: '#ffffff' };
const PEGAR_PX = 16;

export function distanciaMetros(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function textoDistancia(m) {
  return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(2) + ' km';
}

// Tiempo entre la hora de conocimiento de dos casos. Con fecha y hora: días y horas. Solo con fechas: días.
// No es la hora exacta de los hechos: es la de conocimiento (aviso).
export function tiempoEntre(a, b) {
  if (!a || !b || !a.fecha || !b.fecha) return null;
  const conHora = !!(a.hora && b.hora); // si a alguno le falta la hora, se comparan solo las fechas
  const partes = (p) => {
    const f = String(p.fecha).slice(0, 10).split('-').map(Number);
    const h = conHora ? String(p.hora).slice(0, 5).split(':').map(Number) : [0, 0];
    return Date.UTC(f[0], f[1] - 1, f[2], h[0] || 0, h[1] || 0);
  };
  const ta = partes(a), tb = partes(b);
  if (isNaN(ta) || isNaN(tb)) return null;
  const ms = Math.abs(tb - ta);
  const orden = tb > ta ? 'B después de A' : tb < ta ? 'A después de B' : '';
  let texto;
  if (conHora) {
    const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), min = Math.round((ms % 3600000) / 60000);
    texto = d > 0 ? d + ' d' + (h > 0 ? ' ' + h + ' h' : '') : h > 0 ? h + ' h' + (min > 0 ? ' ' + min + ' min' : '') : min > 0 ? min + ' min' : 'mismo momento';
  } else {
    const n = Math.round(ms / 86400000);
    texto = n === 0 ? 'mismo día' : n === 1 ? '1 día' : n + ' días';
  }
  const dm = (p) => { const f = String(p.fecha).slice(0, 10).split('-'); return f[2] + '/' + f[1] + (p.hora ? ' ' + String(p.hora).slice(0, 5) : ''); };
  return { texto, orden, soloFechas: !conHora, a: dm(a), b: dm(b) };
}

const css = `
  .regla-activa { cursor: crosshair !important; }
  .regla-activa .leaflet-interactive { pointer-events: none !important; }
`;

export default function ReglaMapa({ obtenerMapa }) {
  const [activa, setActiva] = useState(false);
  const [paso, setPaso] = useState('A'); // 'A' | 'B' | 'listo'
  const [medida, setMedida] = useState(null);
  const ref = useRef({ mapa: null, capa: null, A: null, B: null, manejador: null, dbl: false });

  // Quita todo lo que la regla puso en el mapa (sin tocar el estado de React)
  const desmontarDelMapa = () => {
    const r = ref.current;
    try {
      if (r.mapa) {
        if (r.manejador) r.mapa.off('click', r.manejador);
        r.mapa.getContainer().classList.remove('regla-activa');
        if (r.capa) r.mapa.removeLayer(r.capa);
        if (r.dbl) r.mapa.doubleClickZoom.enable();
      }
    } catch (e) { /* el mapa ya no existe */ }
    ref.current = { mapa: null, capa: null, A: null, B: null, manejador: null, dbl: false };
  };

  const terminar = () => { desmontarDelMapa(); setActiva(false); setMedida(null); setPaso('A'); };

  const limpiar = () => {
    const r = ref.current;
    if (r.capa) r.capa.clearLayers();
    r.A = null; r.B = null; setMedida(null); setPaso('A');
  };

  // Si el mapa se recreó (por ejemplo al presionar Actualizar), la regla termina sola
  useEffect(() => {
    const r = ref.current;
    if (activa && r.mapa && !document.body.contains(r.mapa.getContainer())) terminar();
  });

  // Al cerrar la pantalla, limpiar
  useEffect(() => () => desmontarDelMapa(), []);

  const iniciar = () => {
    const mapa = obtenerMapa(); const L = window.L;
    if (!mapa || !L) return;
    const r = ref.current;
    r.mapa = mapa; r.capa = L.layerGroup().addTo(mapa); r.A = null; r.B = null;
    r.dbl = mapa.doubleClickZoom.enabled();
    if (r.dbl) mapa.doubleClickZoom.disable();
    mapa.closePopup();
    mapa.getContainer().classList.add('regla-activa');

    // Casos dibujados en el mapa (se excluyen las zonas, las etiquetas y la propia regla)
    const casos = () => {
      const lista = [];
      mapa.eachLayer((l) => { if (l instanceof L.CircleMarker && !(l instanceof L.Circle) && !(l.options && l.options.regla)) lista.push(l); });
      return lista;
    };
    const pegar = (latlng) => {
      const p = mapa.latLngToContainerPoint(latlng);
      let mejor = null, md = PEGAR_PX + 1;
      casos().forEach((l) => { const d = mapa.latLngToContainerPoint(l.getLatLng()).distanceTo(p); if (d < md) { md = d; mejor = l; } });
      return mejor
        ? { lat: mejor.getLatLng().lat, lng: mejor.getLatLng().lng, fecha: mejor.options.fecha || '', hora: mejor.options.hora || '', confirmada: mejor.options.confirmada, num: mejor.options.num }
        : { lat: latlng.lat, lng: latlng.lng };
    };
    const punto = (p, letra) => {
      L.circleMarker([p.lat, p.lng], { radius: 7, color: C.navy, weight: 2.5, fillColor: C.gold, fillOpacity: 1, interactive: false, regla: true }).addTo(r.capa);
      L.marker([p.lat, p.lng], { interactive: false, keyboard: false, regla: true, icon: L.divIcon({ className: '', iconSize: [0, 0], html: '<div style="transform:translate(-50%,-150%);background:#001a4d;color:#fff;font:800 15px Segoe UI,sans-serif;padding:2px 10px;border-radius:12px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.35)">' + letra + (p.num ? ' · No. ' + p.num : '') + '</div>' }) }).addTo(r.capa);
    };

    r.manejador = (e) => {
      const p = pegar(e.latlng);
      if (!r.A || r.B) { // empezar una medición nueva
        r.capa.clearLayers(); r.A = p; r.B = null; punto(p, 'A'); setMedida(null); setPaso('B');
        return;
      }
      r.B = p; punto(p, 'B');
      const m = distanciaMetros(r.A, r.B);
      L.polyline([[r.A.lat, r.A.lng], [r.B.lat, r.B.lng]], { color: C.navy, weight: 3, dashArray: '8 6', interactive: false, regla: true }).addTo(r.capa);
      const medio = [(r.A.lat + r.B.lat) / 2, (r.A.lng + r.B.lng) / 2];
      L.marker(medio, { interactive: false, keyboard: false, regla: true, icon: L.divIcon({ className: '', iconSize: [0, 0], html: '<div style="transform:translate(-50%,-50%);background:#fff;border:2px solid #001a4d;color:#001a4d;font:800 16px Segoe UI,sans-serif;padding:3px 12px;border-radius:12px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)">' + textoDistancia(m) + '</div>' }) }).addTo(r.capa);
      setMedida({ m, t: tiempoEntre(r.A, r.B), aprox: r.A.confirmada === false || r.B.confirmada === false, aNum: r.A.num, bNum: r.B.num }); setPaso('listo');
    };
    mapa.on('click', r.manejador);
    setActiva(true); setPaso('A'); setMedida(null);
  };

  const btn = { borderRadius: 8, padding: '10px 18px', fontSize: 16, fontWeight: 700, cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 8 };

  // Cada dato del resultado: etiqueta arriba, cifra grande, detalle abajo
  const Dato = ({ etiqueta, valor, detalle }) => (
    <div style={{ minWidth: 150 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.gray, letterSpacing: 0.3 }}>{etiqueta}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: C.navy, lineHeight: 1.15 }}>{valor}</div>
      {detalle && <div style={{ fontSize: 15, color: '#374151', marginTop: 2 }}>{detalle}</div>}
    </div>
  );
  const nom = (letra, num) => letra + (num ? ' · No. ' + num : '');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <style>{css}</style>
      {!activa ? (
        <button onClick={iniciar} style={{ ...btn, background: C.white, border: '2px solid ' + C.navy, color: C.navy }}>
          <Ruler size={20} /> Medir distancia
        </button>
      ) : (
        <>
          <button onClick={terminar} style={{ ...btn, background: C.navy, border: '2px solid ' + C.navy, color: C.white }}>
            <Ruler size={20} /> Terminar de medir
          </button>
          {paso === 'A' && <span style={{ fontSize: 18, color: '#374151' }}>Haz clic en el punto <strong>A</strong> (puedes elegir un caso)</span>}
          {paso === 'B' && <span style={{ fontSize: 18, color: '#374151' }}>Ahora haz clic en el punto <strong>B</strong></span>}
          {(paso === 'B' || paso === 'listo') && (
            <button onClick={limpiar} style={{ ...btn, background: 'transparent', border: '1.5px solid #c7cfe0', color: C.gray }}>Nueva medición</button>
          )}
          {paso === 'listo' && medida && (
            <div style={{ flexBasis: '100%', width: '100%', background: C.white, border: '1px solid #b6905466', borderLeft: '6px solid ' + C.navy, borderRadius: 10, padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: '14px 40px', alignItems: 'flex-start' }}>
              <Dato etiqueta="Distancia en línea recta" valor={textoDistancia(medida.m)} detalle={Math.round(medida.m).toLocaleString('es-MX') + ' metros'} />
              {medida.t && (
                <Dato etiqueta="Tiempo entre avisos" valor={medida.t.texto}
                  detalle={(medida.t.orden || '') + (medida.t.soloFechas ? (medida.t.orden ? ' · ' : '') + 'solo fechas (falta la hora en uno de los casos)' : '')} />
              )}
              <div style={{ minWidth: 200 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.gray, letterSpacing: 0.3 }}>Casos medidos</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginTop: 4 }}>{nom('A', medida.aNum)}{medida.t ? <span style={{ fontWeight: 500, color: '#374151' }}> · {medida.t.a}</span> : null}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginTop: 2 }}>{nom('B', medida.bNum)}{medida.t ? <span style={{ fontWeight: 500, color: '#374151' }}> · {medida.t.b}</span> : null}</div>
              </div>
              {medida.aprox && (
                <div style={{ flexBasis: '100%', fontSize: 16, color: C.guinda, fontWeight: 700 }}>
                  ≈ Medida aproximada: la ubicación de alguno de los casos no está confirmada y puede estar a decenas o cientos de metros del lugar real.
                </div>
              )}
              <div style={{ flexBasis: '100%', fontSize: 14, color: C.gray }}>
                El tiempo se calcula con la hora en que se tuvo conocimiento del hecho, no con la hora exacta en que ocurrió.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
