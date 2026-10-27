// src/pages/RadioMapa.jsx
// Consulta por radio: haz clic en un caso o en cualquier punto del mapa y dice qué otras carpetas hay alrededor,
// a qué distancia y con cuánto tiempo de diferencia.
//
// Igual que la regla: dibuja solo en una capa propia, no toca las capas del mapa de calor ni instala plugins,
// y al terminar quita su capa, su cursor y sus eventos. Si el clic cae cerca de un caso (16 px), se "pega" a él.

import { useState, useEffect, useRef } from 'react';
import { Crosshair } from 'lucide-react';
import { distanciaMetros, textoDistancia, tiempoEntre } from './ReglaMapa';
import { fechaLarga } from './SelectorPeriodo';

const C = { navy: '#001a4d', gold: '#b69054', guinda: '#8b1e1e', gray: '#5a6478', white: '#ffffff' };
const PEGAR_PX = 16;
const RADIOS = [{ m: 500, t: '500 m' }, { m: 1000, t: '1 km' }, { m: 2000, t: '2 km' }];
const css = `
  .radio-activa { cursor: crosshair !important; }
  .radio-activa .leaflet-interactive { pointer-events: none !important; }
`;
const btn = { borderRadius: 8, padding: '10px 18px', fontSize: 16, fontWeight: 700, cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 8 };

// Tiempo del caso respecto al centro: "2 d 3 h después" / "5 h antes"
function relativo(centro, c) {
  if (!centro.fecha || !c.fecha) return '';
  const t = tiempoEntre(centro, c);
  if (!t) return '';
  const cuando = t.orden && t.orden.charAt(0) === 'B' ? ' después' : t.orden && t.orden.charAt(0) === 'A' ? ' antes' : '';
  return t.texto + cuando + (t.soloFechas ? ' (solo fechas)' : '');
}

export default function RadioMapa({ obtenerMapa }) {
  const [activa, setActiva] = useState(false);
  const [radio, setRadio] = useState(500);
  const [res, setRes] = useState(null);
  const ref = useRef({ mapa: null, capa: null, manejador: null, dbl: false, centro: null, radio: 500 });

  const desmontarDelMapa = () => {
    const r = ref.current;
    try {
      if (r.mapa) {
        if (r.manejador) r.mapa.off('click', r.manejador);
        r.mapa.getContainer().classList.remove('radio-activa');
        if (r.capa) r.mapa.removeLayer(r.capa);
        if (r.dbl) r.mapa.doubleClickZoom.enable();
      }
    } catch (e) { /* el mapa ya no existe */ }
    ref.current = { mapa: null, capa: null, manejador: null, dbl: false, centro: null, radio: ref.current.radio };
  };
  const terminar = () => { desmontarDelMapa(); setActiva(false); setRes(null); };

  // Solo una herramienta de clic a la vez: si se activa otra (la regla), esta se apaga
  useEffect(() => {
    const f = (e) => { if (e.detail !== 'radio' && ref.current.mapa) terminar(); };
    window.addEventListener('herramienta-mapa', f);
    return () => window.removeEventListener('herramienta-mapa', f);
  }, []);
  useEffect(() => () => desmontarDelMapa(), []);
  // Si el mapa se recreó (Actualizar), la herramienta termina sola
  useEffect(() => {
    const r = ref.current;
    if (activa && r.mapa && !document.body.contains(r.mapa.getContainer())) terminar();
  });

  const consultar = (centro, radioM) => {
    const r = ref.current, L = window.L;
    if (!r.mapa || !L) return;
    r.capa.clearLayers();
    L.circle([centro.lat, centro.lng], { radius: radioM, color: C.navy, weight: 2.5, dashArray: '8 6', fillColor: C.navy, fillOpacity: 0.07, interactive: false }).addTo(r.capa);
    L.marker([centro.lat, centro.lng], { interactive: false, keyboard: false, icon: L.divIcon({ className: '', iconSize: [0, 0], html: '<div style="transform:translate(-50%,-50%);width:16px;height:16px;border-radius:50%;background:#001a4d;border:3px solid #fff;box-shadow:0 0 0 2px #001a4d"></div>' }) }).addTo(r.capa);
    const casos = [];
    r.mapa.eachLayer((l) => {
      if (l instanceof L.CircleMarker && !(l instanceof L.Circle) && !(l.options && l.options.regla)) {
        const ll = l.getLatLng();
        const d = distanciaMetros(centro, { lat: ll.lat, lng: ll.lng });
        if (d <= radioM && !(centro.snap && d < 1)) {
          casos.push({ d, num: l.options.num, fecha: l.options.fecha || '', hora: l.options.hora || '', sector: l.options.sector || '', confirmada: l.options.confirmada });
        }
      }
    });
    casos.sort((a, b) => a.d - b.d);
    setRes({ centro, casos, radio: radioM, aprox: centro.confirmada === false || casos.some((c) => c.confirmada === false) });
  };

  const iniciar = () => {
    const mapa = obtenerMapa(); const L = window.L;
    if (!mapa || !L) return;
    window.dispatchEvent(new CustomEvent('herramienta-mapa', { detail: 'radio' }));
    const r = ref.current;
    r.mapa = mapa; r.capa = L.layerGroup().addTo(mapa); r.centro = null;
    r.dbl = mapa.doubleClickZoom.enabled();
    if (r.dbl) mapa.doubleClickZoom.disable();
    mapa.closePopup();
    mapa.getContainer().classList.add('radio-activa');

    const pegar = (latlng) => {
      const p = mapa.latLngToContainerPoint(latlng);
      let mejor = null, md = PEGAR_PX + 1;
      mapa.eachLayer((l) => {
        if (l instanceof L.CircleMarker && !(l instanceof L.Circle) && !(l.options && l.options.regla)) {
          const d = mapa.latLngToContainerPoint(l.getLatLng()).distanceTo(p);
          if (d < md) { md = d; mejor = l; }
        }
      });
      return mejor
        ? { lat: mejor.getLatLng().lat, lng: mejor.getLatLng().lng, snap: true, num: mejor.options.num, fecha: mejor.options.fecha || '', hora: mejor.options.hora || '', sector: mejor.options.sector || '', confirmada: mejor.options.confirmada }
        : { lat: latlng.lat, lng: latlng.lng, snap: false };
    };
    r.manejador = (e) => { const c = pegar(e.latlng); r.centro = c; consultar(c, r.radio); };
    mapa.on('click', r.manejador);
    setActiva(true); setRes(null);
  };

  const cambiarRadio = (m) => {
    ref.current.radio = m; setRadio(m);
    if (ref.current.centro) consultar(ref.current.centro, m);
  };

  const radioTxt = (RADIOS.find((x) => x.m === radio) || {}).t;

  return (
    <div style={{ display: 'contents' }}>
      <style>{css}</style>
      {!activa ? (
        <button onClick={iniciar} style={{ ...btn, background: C.white, border: '2px solid ' + C.navy, color: C.navy }}>
          <Crosshair size={20} /> Consultar por radio
        </button>
      ) : (
        <>
          <button onClick={terminar} style={{ ...btn, background: C.navy, border: '2px solid ' + C.navy, color: C.white }}>
            <Crosshair size={20} /> Terminar consulta
          </button>
          {RADIOS.map((x) => (
            <button key={x.m} onClick={() => cambiarRadio(x.m)} style={{ ...btn, padding: '10px 16px', background: radio === x.m ? '#f5ede0' : C.white, border: radio === x.m ? '2px solid ' + C.gold : '1.5px solid #c7cfe0', color: radio === x.m ? C.navy : C.gray }}>{x.t}</button>
          ))}
          {!res && <span style={{ fontSize: 18, color: '#374151' }}>Haz clic en un caso o en un punto del mapa</span>}
          {res && (
            <div style={{ flexBasis: '100%', width: '100%', background: C.white, border: '1px solid #b6905466', borderLeft: '6px solid ' + C.navy, borderRadius: 10, padding: '14px 20px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.gray }}>
                {res.centro.snap ? 'Alrededor del caso' + (res.centro.num ? ' No. ' + res.centro.num : '') + (res.centro.fecha ? ' · ' + fechaLarga(res.centro.fecha) + (res.centro.hora ? ' · ' + res.centro.hora + ' h' : '') : '') : 'Alrededor del punto elegido'}
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: C.navy, lineHeight: 1.2 }}>
                {res.casos.length === 0 ? 'Ninguna otra carpeta' : res.casos.length + (res.casos.length === 1 ? ' carpeta' : ' carpetas')} a menos de {radioTxt}
              </div>
              {res.casos.slice(0, 10).map((c, i) => (
                <div key={i} style={{ fontSize: 18, color: '#1f2937', padding: '7px 0', borderTop: '1px solid #e8ecf1', display: 'flex', gap: '4px 14px', flexWrap: 'wrap' }}>
                  <strong style={{ color: C.navy, minWidth: 70 }}>{c.num ? 'No. ' + c.num : 'Caso'}</strong>
                  {c.sector && <span>{c.sector}</span>}
                  <span><strong>{textoDistancia(c.d)}</strong></span>
                  {c.fecha && <span style={{ color: '#374151' }}>{fechaLarga(c.fecha)}{c.hora ? ' · ' + c.hora + ' h' : ''}</span>}
                  {relativo(res.centro, c) && <span style={{ color: C.gray }}>({relativo(res.centro, c)})</span>}
                </div>
              ))}
              {res.casos.length > 10 && <div style={{ fontSize: 16, color: C.gray, paddingTop: 6 }}>… y {res.casos.length - 10} más.</div>}
              {res.aprox && <div style={{ fontSize: 16, color: C.guinda, fontWeight: 700, marginTop: 8 }}>≈ Distancias aproximadas: alguna ubicación no está confirmada.</div>}
              <div style={{ fontSize: 14, color: C.gray, marginTop: 8 }}>Solo cuenta los casos visibles en el mapa. Haz clic en otro punto para mover el círculo.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
