// src/pages/ReproducirMes.jsx
// Reproduce el periodo día por día: los casos van apareciendo en el mapa, con su número, y se ve cómo se forman las zonas.
// No guarda nada ni toca datos: solo le dice al mapa hasta qué día mostrar.

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { fechaLarga } from './SelectorPeriodo';

const C = { navy: '#001a4d', gold: '#b69054', gray: '#5a6478' };
const DIA = 86400000;

// Todos los días entre la primera y la última fecha (AAAA-MM-DD)
export function diasEntre(fechas) {
  const v = fechas.filter(Boolean).map((f) => String(f).slice(0, 10)).sort();
  if (v.length === 0) return [];
  const out = [];
  for (let t = Date.parse(v[0]); t <= Date.parse(v[v.length - 1]); t += DIA) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

const btn = { borderRadius: 8, padding: '10px 18px', fontSize: 16, fontWeight: 700, cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 8 };

// fechas: fechas de los casos del periodo · dia: día mostrado (null = todos) · visibles/total: casos mostrados y casos del periodo
export default function ReproducirMes({ fechas, dia, onDia, visibles, total }) {
  const dias = diasEntre(fechas);
  const [reproduciendo, setReproduciendo] = useState(false);
  const refs = useRef({ dias, i: 0, timer: null });
  refs.current.dias = dias;

  const parar = () => { if (refs.current.timer) { clearInterval(refs.current.timer); refs.current.timer = null; } setReproduciendo(false); };
  useEffect(() => () => { if (refs.current.timer) clearInterval(refs.current.timer); }, []);

  if (dias.length < 2) return null;

  const idxActual = dia ? Math.max(0, dias.indexOf(dia)) : dias.length - 1;
  const paso = Math.max(160, Math.min(600, Math.round(14000 / dias.length)));

  const iniciar = () => {
    parar();
    refs.current.i = 0; onDia(refs.current.dias[0]);
    setReproduciendo(true);
    refs.current.timer = setInterval(() => {
      const r = refs.current; const sig = r.i + 1;
      if (sig >= r.dias.length) { parar(); return; }
      r.i = sig; onDia(r.dias[sig]);
    }, paso);
  };
  const detener = () => { parar(); onDia(null); };
  const mover = (i) => { parar(); refs.current.i = i; onDia(dias[i]); };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #b6905440', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 17, fontWeight: 700, color: C.navy }}>Reproducir el periodo</span>
      {reproduciendo
        ? <button onClick={parar} style={{ ...btn, background: C.navy, border: '2px solid ' + C.navy, color: '#fff' }}><Pause size={20} /> Pausar</button>
        : <button onClick={iniciar} style={{ ...btn, background: C.navy, border: '2px solid ' + C.navy, color: '#fff' }}><Play size={20} /> Reproducir</button>}
      {dia && <button onClick={detener} style={{ ...btn, background: 'transparent', border: '1.5px solid #c7cfe0', color: C.gray }}><Square size={18} /> Ver todo</button>}
      <input type="range" min={0} max={dias.length - 1} step={1} value={idxActual} onChange={(e) => mover(Number(e.target.value))}
        aria-label="Día del periodo" style={{ flex: 1, minWidth: 200, accentColor: C.gold }} />
      <span style={{ fontSize: 17, fontWeight: 700, color: C.navy, minWidth: 260 }}>
        {dia ? 'Hasta el ' + fechaLarga(dia) + ' · ' + visibles + ' de ' + total + ' casos' : 'Todo el periodo · ' + total + ' casos'}
      </span>
    </div>
  );
}
