// src/pages/ZonasAtencion.jsx
// Panel "Zonas de atención prioritaria" del Mapa de Calor.
// Criterio operativo (coordinación regional): una zona agrupa 4 o más homicidios a no más de 1 o 2 km
// entre sí, con al menos 4 ocurridos dentro de un mismo mes (ventana de 30 días).
// Es un conteo descriptivo, no una prueba estadística.
// Algoritmo: DBSCAN con distancia haversine; después se verifica la ventana de 30 días.

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Target, MapPin, Info } from 'lucide-react';

const C = {
  navy: '#001a4d', gold: '#b69054', guinda: '#8b1e1e', white: '#ffffff',
  gray: '#5a6478', border: '#d8dde8', bg: '#f4f6fb', lightGold: '#f5ede0',
};

const MIN_CASOS = 4;
const VENTANA_DIAS = 30;
const OPCIONES_KM = [1, 2];

const distanciaM = (a, b) => {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const aFecha = (f) => {
  if (!f) return null;
  const d = new Date(String(f).slice(0, 10) + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};
const ddmm = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
const frecuente = (lista) => {
  const c = {};
  lista.filter(Boolean).forEach((x) => { c[x] = (c[x] || 0) + 1; });
  const e = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  return e ? { valor: e[0], n: e[1], conteo: c } : null;
};

// Máximo de fechas (ordenadas) que caben en una ventana de `dias` días seguidos
export function maxEnVentana(fechas, dias) {
  let mejor = 0, j = 0;
  for (let i = 0; i < fechas.length; i++) {
    while ((fechas[i] - fechas[j]) / 86400000 > dias - 1) j++;
    mejor = Math.max(mejor, i - j + 1);
  }
  return mejor;
}

// puntos: [{ lat, lng, fecha, delito, sector, municipio }]. Devuelve { focos, aislados }.
// aislados = casos que no quedaron dentro de ninguna zona prioritaria.
// ventanaDias (opcional): exige minPts casos dentro de una ventana de esos días.
export function calcularFocos(puntos, epsM, minPts, ventanaDias) {
  const n = puntos.length;
  const etiqueta = new Array(n).fill(null);
  let id = 0;
  const vecinos = (i) => {
    const r = [];
    for (let j = 0; j < n; j++) if (distanciaM(puntos[i], puntos[j]) <= epsM) r.push(j);
    return r;
  };
  for (let i = 0; i < n; i++) {
    if (etiqueta[i] !== null) continue;
    const nb = vecinos(i);
    if (nb.length < minPts) { etiqueta[i] = -1; continue; }
    id++; etiqueta[i] = id;
    const cola = nb.filter((j) => j !== i);
    while (cola.length) {
      const j = cola.pop();
      if (etiqueta[j] === -1) etiqueta[j] = id;
      if (etiqueta[j] !== null) continue;
      etiqueta[j] = id;
      const nb2 = vecinos(j);
      if (nb2.length >= minPts) nb2.forEach((k) => cola.push(k));
    }
  }

  const focos = [];
  for (let g = 1; g <= id; g++) {
    const miembros = puntos.filter((_, i) => etiqueta[i] === g);
    const fechas = miembros.map((m) => aFecha(m.fecha)).filter(Boolean).sort((a, b) => a - b);
    const enMes = ventanaDias ? maxEnVentana(fechas, ventanaDias) : miembros.length;
    if (ventanaDias && enMes < minPts) continue; // no reúne 4 casos en un mismo mes
    const centro = {
      lat: miembros.reduce((s, m) => s + m.lat, 0) / miembros.length,
      lng: miembros.reduce((s, m) => s + m.lng, 0) / miembros.length,
    };
    const radioM = Math.max(...miembros.map((m) => distanciaM(centro, m)));
    const sectores = frecuente(miembros.map((m) => m.sector || m.municipio));
    const sectoresOrdenados = sectores ? Object.entries(sectores.conteo).sort((a, b) => b[1] - a[1]) : [];
    const desde = fechas[0] || null, hasta = fechas[fechas.length - 1] || null;
    const dias = desde && hasta ? Math.max(7, Math.round((hasta - desde) / 86400000) + 1) : null;
    const delito = frecuente(miembros.map((m) => m.delito));
    focos.push({
      clave: centro.lat.toFixed(5) + ',' + centro.lng.toFixed(5),
      n: miembros.length, enMes, centro, radioM, miembros,
      sectores: sectoresOrdenados,
      desde, hasta,
      porSemana: dias ? Math.round((miembros.length / (dias / 7)) * 10) / 10 : null,
      delito,
    });
  }
  focos.sort((a, b) => b.n - a.n);
  const dentro = focos.reduce((s, f) => s + f.n, 0);
  return { focos, aislados: n - dentro };
}

const textoSectores = (f) => f.sectores.map(([s, k]) => s + ' (' + k + ')').join(', ');
const textoZona = (f) => {
  const nombres = f.sectores.map(([s]) => s);
  return nombres.length <= 1 ? (nombres[0] || 'Zona sin sector') : nombres.slice(0, -1).join(', ') + ' y ' + nombres[nombres.length - 1];
};
const textoRango = (f) => (f.desde && f.hasta ? 'del ' + ddmm(f.desde) + ' al ' + ddmm(f.hasta) : 'sin fechas');
const fechaLarga = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const km1 = (m) => (Math.round(m / 100) / 10).toFixed(1);

const btn = { borderRadius: 7, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' };

export default function ZonasAtencion({ puntos, seleccionada, onSeleccionar, onIniciarProyecto, onZonas }) {
  const [km, setKm] = useState(2);
  const [verInfo, setVerInfo] = useState(false);
  const [sinUbicar, setSinUbicar] = useState(null);

  // Casos del registro que todavía no tienen coordenadas: no entran al mapa ni a las zonas
  useEffect(() => {
    let vivo = true;
    supabase.from('incidencia_regional').select('id', { count: 'exact', head: true }).is('coordenadas_lat', null)
      .then((r) => { if (vivo && r && !r.error && typeof r.count === 'number') setSinUbicar(r.count); });
    return () => { vivo = false; };
  }, [puntos.length]);

  const { focos, aislados } = calcularFocos(puntos, km * 1000, MIN_CASOS, VENTANA_DIAS);

  // Avisa al mapa qué zonas hay para que las marque siempre (solo cuando cambian)
  const firma = km + '|' + focos.map((f) => f.clave + ':' + f.n).join(',');
  useEffect(() => {
    if (onZonas) onZonas(focos.map((f, i) => ({ clave: f.clave, numero: i + 1, n: f.n, centro: f.centro, radioM: f.radioM })));
  }, [firma]);

  const cambiarDistancia = (k) => { setKm(k); if (onSeleccionar) onSeleccionar(null); };

  const iniciar = (f) => {
    const zona = textoZona(f);
    const periodo = f.desde && f.hasta ? 'Del ' + fechaLarga(f.desde) + ' al ' + fechaLarga(f.hasta) : '';
    const patron = f.n + ' casos agrupados en un radio aproximado de ' + km1(f.radioM) + ' km.'
      + (f.delito && f.delito.n >= 2 ? ' Delito más frecuente: ' + f.delito.valor + ' (' + f.delito.n + ').' : '');
    onIniciarProyecto({
      problema: 'Homicidios dolosos — ' + zona,
      zona: zona + ', Acapulco',
      prioridad: 'media',
      categoria: 'Homicidio doloso',
      resumen: 'Zona de atención prioritaria detectada en el mapa de calor: ' + f.n + ' casos en un radio aproximado de ' + km1(f.radioM) + ' km '
        + '(criterio: ' + MIN_CASOS + ' o más homicidios en un mes a no más de ' + km + ' km entre sí' + (periodo ? '; ' + periodo.toLowerCase() : '') + '). Sectores: ' + textoSectores(f) + '.',
      extra: {
        scanning_datos_fuente: 'Registro regional de homicidios dolosos (Sistema Ministerial)',
        scanning_periodo_analisis: periodo,
        scanning_patron_identificado: patron,
        scanning_frecuencia: f.porSemana ? 'Aprox. ' + f.porSemana + ' casos por semana' : '',
        scanning_zona_concentracion: zona,
      },
    });
  };

  if (!puntos || puntos.length === 0) return null;

  return (
    <div style={{ background: C.white, borderRadius: 10, padding: 16, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 800, color: C.guinda }}>
          <Target size={19} /> Zonas de atención prioritaria
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: C.gray, fontWeight: 600 }}>Distancia:</span>
          {OPCIONES_KM.map((k) => (
            <button key={k} onClick={() => cambiarDistancia(k)}
              style={{ ...btn, padding: '8px 16px', background: km === k ? C.guinda : 'transparent', color: km === k ? C.white : C.guinda, border: '2px solid ' + C.guinda }}>
              {k} km
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, margin: '8px 0 12px', fontSize: 15, color: '#374151' }}>
        <span><strong>{MIN_CASOS} o más homicidios en un mes</strong>, a no más de {km} km entre sí</span>
        <span style={{ color: C.gray }}>· {puntos.length} casos en el mapa{sinUbicar > 0 ? ' · ' + sinUbicar + ' sin ubicar' : ''}</span>
        <button onClick={() => setVerInfo(!verInfo)} style={{ background: 'none', border: 'none', color: C.guinda, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 4px', minHeight: 36 }}>
          <Info size={15} /> {verInfo ? 'Ocultar' : '¿Cómo se calcula?'}
        </button>
      </div>

      {verInfo && (
        <ul style={{ margin: '0 0 12px', padding: '10px 14px 10px 30px', background: C.bg, borderRadius: 8, fontSize: 14, color: C.gray, lineHeight: 1.6 }}>
          <li>Una zona agrupa {MIN_CASOS} o más homicidios a no más de {km} km uno de otro.</li>
          <li>Al menos {MIN_CASOS} deben haber ocurrido dentro de un mismo mes (30 días).</li>
          <li>Es un conteo, no una prueba estadística. {aislados} casos quedaron fuera de zonas.</li>
        </ul>
      )}

      {focos.length === 0 ? (
        <div style={{ background: C.bg, border: '1.5px solid ' + C.border, borderRadius: 8, padding: 14, fontSize: 15, color: C.gray }}>
          Sin zonas prioritarias con este criterio{km === 1 ? '. Prueba con 2 km.' : '.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 12 }}>
          {focos.map((f, i) => {
            const activa = seleccionada === f.clave;
            return (
              <div key={f.clave} style={{ border: '2px solid ' + (activa ? C.guinda : C.border), background: activa ? '#fbf1f1' : C.white, borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>Zona {i + 1}</span>
                  <span style={{ background: C.guinda, color: C.white, borderRadius: 14, padding: '3px 12px', fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap' }}>{f.n} casos</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginTop: 6 }}>{textoSectores(f)}</div>
                <div style={{ fontSize: 14, color: C.gray, marginTop: 4 }}>
                  {textoRango(f)}{f.porSemana ? ' · ≈ ' + f.porSemana + ' por semana' : ''}
                </div>
                {f.delito && f.delito.n >= 2 && <div style={{ fontSize: 13, color: C.gray, marginTop: 4 }}>Más frecuente: {f.delito.valor} ({f.delito.n})</div>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  <button onClick={() => onSeleccionar && onSeleccionar(activa ? null : { clave: f.clave, centro: f.centro, radioM: f.radioM, miembros: f.miembros.map((m) => ({ lat: m.lat, lng: m.lng })) })}
                    style={{ ...btn, background: activa ? C.guinda : 'transparent', color: activa ? C.white : C.guinda, border: '2px solid ' + C.guinda }}>
                    <MapPin size={15} /> {activa ? 'Quitar del mapa' : 'Ver en el mapa'}
                  </button>
                  {onIniciarProyecto && (
                    <button onClick={() => iniciar(f)} style={{ ...btn, background: C.gold, color: C.white, border: 'none' }}>
                      Iniciar proyecto SARA para esta zona
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
