// src/pages/SelectorPeriodo.jsx
// Selector de periodo para los filtros. Con dos años de historia, una lista de meses larga no se puede leer:
// aquí se elige con atajos cortos, un año y una cuadrícula de 12 meses; las fechas propias quedan en "Otro rango".

import { useState } from 'react';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ABR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const C = { guinda: '#7b1e3a', gold: '#b6905a', lightGold: '#fbf3d9', gray: '#5a6478', texto: '#374151' };

const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const ultimoDia = (anio, mes1a12) => new Date(anio, mes1a12, 0).getDate();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function fechaLarga(f, conAnio) {
  const p = String(f).slice(0, 10).split('-');
  return Number(p[2]) + ' de ' + (MESES[Number(p[1]) - 1] || p[1]) + (conAnio ? ' de ' + p[0] : '');
}

export function nombreMesAnio(clave) {
  const p = String(clave).split('-');
  const n = MESES[Number(p[1]) - 1] || p[1];
  return n.charAt(0).toUpperCase() + n.slice(1) + ' ' + p[0];
}

const dm = (f) => Number(f[2]) + ' ' + ABR[f[1] - 1];

// Texto corto del periodo para la línea resumen: "Oct 2026", "2025", "Ene–mar 2026", "3 ene – 29 oct 2026"
export function textoPeriodo(desde, hasta) {
  if (desde && hasta) {
    const a = desde.split('-').map(Number), b = hasta.split('-').map(Number);
    const inicioMes = a[2] === 1, finMes = b[2] === ultimoDia(b[0], b[1]);
    if (a[0] === b[0] && a[1] === 1 && inicioMes && b[1] === 12 && finMes) return String(a[0]);
    if (inicioMes && finMes) {
      if (a[0] === b[0] && a[1] === b[1]) return cap(ABR[a[1] - 1]) + ' ' + a[0];
      if (a[0] === b[0]) return cap(ABR[a[1] - 1]) + '–' + cap(ABR[b[1] - 1]) + ' ' + a[0];
      return cap(ABR[a[1] - 1]) + ' ' + a[0] + ' – ' + cap(ABR[b[1] - 1]) + ' ' + b[0];
    }
    if (a[0] === b[0]) return dm(a) + ' – ' + dm(b) + ' ' + a[0];
    return dm(a) + ' ' + a[0] + ' – ' + dm(b) + ' ' + b[0];
  }
  if (desde) { const a = desde.split('-').map(Number); return 'Desde ' + dm(a) + ' ' + a[0]; }
  if (hasta) { const b = hasta.split('-').map(Number); return 'Hasta ' + dm(b) + ' ' + b[0]; }
  return 'Todo el periodo';
}

const chip = (activo, chico) => ({
  padding: chico ? '6px 4px' : '8px 14px', borderRadius: 8, fontSize: chico ? 15 : 16, fontWeight: 700, cursor: 'pointer', minHeight: chico ? 46 : 42,
  border: activo ? '2px solid ' + C.gold : '1.5px solid #d9d2c3',
  background: activo ? C.lightGold : '#ffffff', color: activo ? C.guinda : C.gray,
});
const etiqueta = { fontSize: 14, fontWeight: 700, color: C.gray, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 };
const campo = { padding: '10px 12px', border: '2px solid #e8ecf1', borderRadius: 7, fontSize: 16, minHeight: 44, boxSizing: 'border-box', fontFamily: 'inherit' };

// meses: [{ clave: '2026-09', n: 20 }]  (solo los meses que tienen casos)
export default function SelectorPeriodo({ desde, hasta, onCambiar, meses }) {
  const hoy = new Date();
  const y = hoy.getFullYear(), m = hoy.getMonth();
  const hace = (n) => { const d = new Date(hoy); d.setDate(d.getDate() - n); return iso(d); };
  const lista = meses || [];
  const anios = Array.from(new Set(lista.map((x) => x.clave.slice(0, 4)))).sort();
  const porClave = {};
  lista.forEach((x) => { porClave[x.clave] = x.n; });
  const [anioSel, setAnioSel] = useState(anios.length ? anios[anios.length - 1] : String(y));
  const atajos = [
    { t: 'Todo', d: '', h: '' },
    { t: '30 días', d: hace(29), h: iso(hoy) },
    { t: 'Este mes', d: iso(new Date(y, m, 1)), h: iso(new Date(y, m + 1, 0)) },
    { t: 'Mes anterior', d: iso(new Date(y, m - 1, 1)), h: iso(new Date(y, m, 0)) },
  ].concat(anios.map((a) => ({ t: a, d: a + '-01-01', h: a + '-12-31' })));
  const coincide = atajos.some((a) => a.d === desde && a.h === hasta) ||
    lista.some((x) => desde === x.clave + '-01' && hasta === x.clave + '-' + String(ultimoDia(Number(x.clave.slice(0, 4)), Number(x.clave.slice(5, 7)))).padStart(2, '0'));
  const [otroRango, setOtroRango] = useState(false);
  const verRango = otroRango || (!coincide && (desde || hasta));
  return (
    <div>
      <div style={etiqueta}>Periodo</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {atajos.map((a) => (
          <button key={a.t} onClick={() => onCambiar(a.d, a.h)} aria-pressed={desde === a.d && hasta === a.h} style={chip(desde === a.d && hasta === a.h)}>{a.t}</button>
        ))}
      </div>
      {lista.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <span style={{ ...etiqueta, marginBottom: 0 }}>Por mes</span>
            {anios.map((a) => (
              <button key={a} onClick={() => setAnioSel(a)} aria-pressed={anioSel === a}
                style={{ padding: '4px 12px', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: 34, border: anioSel === a ? '2px solid ' + C.guinda : '1.5px solid #d9d2c3', background: anioSel === a ? C.guinda : '#fff', color: anioSel === a ? '#fff' : C.gray }}>{a}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))', gap: 6, marginTop: 8 }}>
            {ABR.map((ab, i) => {
              const clave = anioSel + '-' + String(i + 1).padStart(2, '0');
              const n = porClave[clave];
              const d = clave + '-01', h = clave + '-' + String(ultimoDia(Number(anioSel), i + 1)).padStart(2, '0');
              const activo = desde === d && hasta === h;
              return (
                <button key={clave} disabled={!n} onClick={() => onCambiar(d, h)} aria-pressed={activo} aria-label={nombreMesAnio(clave) + (n ? ': ' + n + ' casos' : ': sin casos')}
                  style={{ ...chip(activo, true), opacity: n ? 1 : 0.4, cursor: n ? 'pointer' : 'default', lineHeight: 1.15 }}>
                  {cap(ab)}<br /><span style={{ fontSize: 13, fontWeight: 500 }}>{n || '–'}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
      <div style={{ marginTop: 12 }}>
        <button onClick={() => setOtroRango(!verRango)} aria-expanded={!!verRango} style={{ background: 'none', border: 'none', color: C.guinda, fontSize: 15, fontWeight: 700, cursor: 'pointer', padding: '6px 0', minHeight: 36 }}>
          {verRango ? 'Ocultar otro rango ▲' : 'Otro rango de fechas ▼'}
        </button>
        {verRango && (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
            <label style={{ fontSize: 16, color: C.gray, display: 'flex', alignItems: 'center', gap: 8 }}>Desde
              <input type="date" style={campo} value={desde} onChange={(e) => onCambiar(e.target.value, hasta)} />
            </label>
            <label style={{ fontSize: 16, color: C.gray, display: 'flex', alignItems: 'center', gap: 8 }}>Hasta
              <input type="date" style={campo} value={hasta} onChange={(e) => onCambiar(desde, e.target.value)} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
