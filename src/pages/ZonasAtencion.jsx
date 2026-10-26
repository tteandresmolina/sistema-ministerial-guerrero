// src/pages/ZonasAtencion.jsx
// Panel "Zonas de atención" del Mapa de Calor.
// Agrupa los homicidios que se ven en el mapa (respeta los filtros) en zonas donde hay varios casos cerca
// unos de otros, y los muestra como tarjetas cortas. Es un agrupamiento DESCRIPTIVO: la distancia es un
// criterio provisional y ajustable; no es una prueba de significancia estadística.
//
// Algoritmo: DBSCAN con distancia en metros (haversine) y mínimo de casos configurable (por defecto 3).

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Target, MapPin } from 'lucide-react';

const C = {
  navy: '#001a4d', gold: '#b69054', guinda: '#8b1e1e', white: '#ffffff',
  gray: '#5a6478', border: '#d8dde8', bg: '#f4f6fb', lightGold: '#f5ede0',
};

const MIN_CASOS = 3;
const OPCIONES_KM = [1, 2, 3];

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

// puntos: [{ lat, lng, fecha, delito, municipio }]. Devuelve { focos, aislados }.
export function calcularFocos(puntos, epsM, minPts) {
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
    const centro = {
      lat: miembros.reduce((s, m) => s + m.lat, 0) / miembros.length,
      lng: miembros.reduce((s, m) => s + m.lng, 0) / miembros.length,
    };
    const radioM = Math.max(...miembros.map((m) => distanciaM(centro, m)));
    const sectores = frecuente(miembros.map((m) => m.municipio));
    const sectoresOrdenados = sectores ? Object.entries(sectores.conteo).sort((a, b) => b[1] - a[1]) : [];
    const fechas = miembros.map((m) => aFecha(m.fecha)).filter(Boolean).sort((a, b) => a - b);
    const desde = fechas[0] || null, hasta = fechas[fechas.length - 1] || null;
    const dias = desde && hasta ? Math.max(7, Math.round((hasta - desde) / 86400000) + 1) : null;
    const delito = frecuente(miembros.map((m) => m.delito));
    focos.push({
      clave: centro.lat.toFixed(5) + ',' + centro.lng.toFixed(5),
      n: miembros.length, centro, radioM, miembros,
      sectores: sectoresOrdenados,
      desde, hasta,
      porSemana: dias ? Math.round((miembros.length / (dias / 7)) * 10) / 10 : null,
      delito,
    });
  }
  focos.sort((a, b) => b.n - a.n);
  return { focos, aislados: etiqueta.filter((e) => e === -1).length };
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

export default function ZonasAtencion({ puntos, seleccionada, onSeleccionar, onIniciarProyecto }) {
  const [km, setKm] = useState(2);
  const [sinUbicar, setSinUbicar] = useState(null);

  // Casos del registro que todavía no tienen coordenadas: no entran al mapa ni al agrupamiento
  useEffect(() => {
    let vivo = true;
    supabase.from('incidencia_regional').select('id', { count: 'exact', head: true }).is('coordenadas_lat', null)
      .then((r) => { if (vivo && r && !r.error && typeof r.count === 'number') setSinUbicar(r.count); });
    return () => { vivo = false; };
  }, [puntos.length]);

  const { focos, aislados } = calcularFocos(puntos, km * 1000, MIN_CASOS);

  const cambiarDistancia = (k) => { setKm(k); if (onSeleccionar) onSeleccionar(null); };

  const iniciar = (f) => {
    const zona = textoZona(f);
    const periodo = f.desde && f.hasta ? 'Del ' + fechaLarga(f.desde) + ' al ' + fechaLarga(f.hasta) : '';
    const patron = f.n + ' casos agrupados en un radio aproximado de ' + km1(f.radioM) + ' km.'
      + (f.delito ? ' Delito más frecuente: ' + f.delito.valor + ' (' + f.delito.n + ').' : '');
    onIniciarProyecto({
      problema: 'Homicidios dolosos — ' + zona,
      zona: zona + ', Acapulco',
      prioridad: 'media',
      categoria: 'Homicidio doloso',
      resumen: 'Zona de atención detectada en el mapa de calor: ' + f.n + ' casos en un radio aproximado de ' + km1(f.radioM) + ' km '
        + '(agrupamiento descriptivo con distancia provisional de ' + km + ' km' + (periodo ? '; ' + periodo.toLowerCase() : '') + '). Sectores: ' + textoSectores(f) + '.',
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: C.guinda }}>
          <Target size={18} /> Zonas de atención
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: C.gray, fontWeight: 600 }}>Distancia entre casos:</span>
          {OPCIONES_KM.map((k) => (
            <button key={k} onClick={() => cambiarDistancia(k)}
              style={{ ...btn, padding: '8px 14px', background: km === k ? C.guinda : 'transparent', color: km === k ? C.white : C.guinda, border: '2px solid ' + C.guinda }}>
              {k} km
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 13, color: C.gray, marginBottom: 12, lineHeight: 1.5 }}>
        Agrupamiento descriptivo con distancia provisional: zonas con al menos {MIN_CASOS} casos cercanos entre sí. No es una prueba de significancia estadística.
        {' '}Un caso entra a una zona si está a la distancia elegida o menos de otro caso de esa zona, por eso el radio total puede ser mayor.
        {' '}{puntos.length} casos con ubicación · {aislados} aislados
        {sinUbicar > 0 ? ' · ' + sinUbicar + ' del registro sin ubicar (no incluidos)' : ''}.
      </div>

      {focos.length === 0 ? (
        <div style={{ background: C.bg, border: '1.5px solid ' + C.border, borderRadius: 8, padding: 14, fontSize: 15, color: C.gray }}>
          Con {km} km no hay zonas con al menos {MIN_CASOS} casos juntos. Prueba con una distancia mayor.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 12 }}>
          {focos.map((f, i) => {
            const activa = seleccionada === f.clave;
            return (
              <div key={f.clave} style={{ border: '2px solid ' + (activa ? C.guinda : C.border), background: activa ? '#fbf1f1' : C.white, borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>Zona de atención {i + 1}</span>
                  <span style={{ background: C.guinda, color: C.white, borderRadius: 14, padding: '3px 12px', fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap' }}>{f.n} casos</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginTop: 6 }}>{textoSectores(f)}</div>
                <div style={{ fontSize: 14, color: C.gray, marginTop: 4 }}>
                  Radio aprox. {km1(f.radioM)} km · {textoRango(f)}{f.porSemana ? ' · ≈ ' + f.porSemana + ' por semana' : ''}
                </div>
                {f.delito && <div style={{ fontSize: 13, color: C.gray, marginTop: 4 }}>Más frecuente: {f.delito.valor} ({f.delito.n})</div>}
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
