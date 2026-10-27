// src/pages/SelectorPeriodo.jsx
// Selector de periodo para los filtros: atajos, meses con datos y rango propio.
// Reemplaza a los dos campos de fecha sueltos: se elige con un clic, sin teclear fechas.

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const C = { navy: '#001a4d', gold: '#b69054', lightGold: '#f5ede0', gray: '#5a6478' };

const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const ultimoDia = (anio, mes1a12) => new Date(anio, mes1a12, 0).getDate();

export function fechaLarga(f, conAnio) {
  const p = String(f).slice(0, 10).split('-');
  return Number(p[2]) + ' de ' + (MESES[Number(p[1]) - 1] || p[1]) + (conAnio ? ' de ' + p[0] : '');
}

export function nombreMesAnio(clave) {
  const p = String(clave).split('-');
  const n = MESES[Number(p[1]) - 1] || p[1];
  return n.charAt(0).toUpperCase() + n.slice(1) + ' ' + p[0];
}

// Texto del periodo para la línea resumen: "Septiembre 2026" si es un mes completo
export function textoPeriodo(desde, hasta) {
  if (desde && hasta) {
    const a = desde.split('-').map(Number), b = hasta.split('-').map(Number);
    if (a[0] === b[0] && a[1] === b[1] && a[2] === 1 && b[2] === ultimoDia(a[0], a[1])) return nombreMesAnio(desde.slice(0, 7));
    const otroAnio = a[0] !== b[0];
    return 'Del ' + fechaLarga(desde, otroAnio) + ' al ' + fechaLarga(hasta, otroAnio);
  }
  if (desde) return 'Desde el ' + fechaLarga(desde, true);
  if (hasta) return 'Hasta el ' + fechaLarga(hasta, true);
  return 'Todo el periodo';
}

const chip = (activo) => ({
  padding: '9px 16px', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer', minHeight: 42,
  border: activo ? '2px solid ' + C.gold : '1.5px solid #c7cfe0',
  background: activo ? C.lightGold : '#ffffff', color: activo ? C.navy : C.gray,
});
const etiqueta = { fontSize: 15, fontWeight: 700, color: C.gray, marginBottom: 6 };
const campo = { padding: '10px 12px', border: '2px solid #e8ecf1', borderRadius: 7, fontSize: 16, minHeight: 44, boxSizing: 'border-box', fontFamily: 'inherit' };

// meses: [{ clave: '2026-09', n: 20 }]  (solo los meses que tienen casos)
export default function SelectorPeriodo({ desde, hasta, onCambiar, meses }) {
  const hoy = new Date();
  const y = hoy.getFullYear(), m = hoy.getMonth();
  const hace = (n) => { const d = new Date(hoy); d.setDate(d.getDate() - n); return iso(d); };
  const atajos = [
    { t: 'Todo', d: '', h: '' },
    { t: 'Últimos 7 días', d: hace(6), h: iso(hoy) },
    { t: 'Últimos 30 días', d: hace(29), h: iso(hoy) },
    { t: 'Este mes', d: iso(new Date(y, m, 1)), h: iso(new Date(y, m + 1, 0)) },
    { t: 'Mes anterior', d: iso(new Date(y, m - 1, 1)), h: iso(new Date(y, m, 0)) },
  ];
  return (
    <div>
      <div style={etiqueta}>Periodo</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {atajos.map((a) => (
          <button key={a.t} onClick={() => onCambiar(a.d, a.h)} style={chip(desde === a.d && hasta === a.h)}>{a.t}</button>
        ))}
      </div>
      {meses && meses.length > 0 && (
        <>
          <div style={{ ...etiqueta, marginTop: 12 }}>Por mes</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {meses.map((mm) => {
              const d = mm.clave + '-01';
              const h = mm.clave + '-' + String(ultimoDia(Number(mm.clave.slice(0, 4)), Number(mm.clave.slice(5, 7)))).padStart(2, '0');
              return <button key={mm.clave} onClick={() => onCambiar(d, h)} style={chip(desde === d && hasta === h)}>{nombreMesAnio(mm.clave)} · {mm.n}</button>;
            })}
          </div>
        </>
      )}
      <div style={{ ...etiqueta, marginTop: 12 }}>O elige tus fechas</div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: 16, color: C.gray, display: 'flex', alignItems: 'center', gap: 8 }}>Desde
          <input type="date" style={campo} value={desde} onChange={(e) => onCambiar(e.target.value, hasta)} />
        </label>
        <label style={{ fontSize: 16, color: C.gray, display: 'flex', alignItems: 'center', gap: 8 }}>Hasta
          <input type="date" style={campo} value={hasta} onChange={(e) => onCambiar(desde, e.target.value)} />
        </label>
      </div>
    </div>
  );
}
