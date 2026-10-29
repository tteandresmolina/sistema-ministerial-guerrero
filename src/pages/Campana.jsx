// src/pages/Campana.jsx
// La campana del encabezado: avisos de cada persona, con contador de no leídos.
//  · Cada persona ve SOLO los suyos (lo garantiza la base de datos) y solo puede marcarlos como leídos.
//  · Los avisos llegan en el momento (tiempo real) y, como respaldo, se revisan cada minuto.
//  · Si la tabla de avisos todavía no existe en la base, la campana no se muestra y el encabezado queda igual que antes.

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Bell, CheckCheck } from 'lucide-react';

const C = { navy: '#001a4d', gold: '#b69054', lightGold: '#f5ede0', gray: '#5a6478', guinda: '#8b1e1e' };

export function haceCuanto(iso, ahora = new Date()) {
  const seg = Math.max(0, Math.round((ahora - new Date(iso)) / 1000));
  if (seg < 60) return 'hace un momento';
  const min = Math.round(seg / 60);
  if (min < 60) return 'hace ' + min + ' min';
  const h = Math.round(min / 60);
  if (h < 24) return 'hace ' + h + (h === 1 ? ' hora' : ' horas');
  const d = Math.round(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return 'hace ' + d + ' días';
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
}

export default function Campana({ userId }) {
  const [items, setItems] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [disponible, setDisponible] = useState(true);
  const caja = useRef(null);

  const cargar = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.from('notificaciones').select('*').order('created_at', { ascending: false }).limit(30);
    if (error) { if (/does not exist|schema cache|relation/i.test(error.message || '')) setDisponible(false); return; }
    setItems(data || []);
  }, [userId]);

  useEffect(() => {
    cargar();
    const respaldo = setInterval(cargar, 60000);
    let canal = null;
    try {
      canal = supabase.channel('avisos-' + userId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: 'user_id=eq.' + userId },
          (payload) => { if (payload && payload.new) setItems((prev) => (prev.some((x) => x.id === payload.new.id) ? prev : [payload.new, ...prev].slice(0, 30))); })
        .subscribe();
    } catch (e) { /* sin tiempo real: queda la revisión cada minuto */ }
    return () => { clearInterval(respaldo); try { if (canal) supabase.removeChannel(canal); } catch (e) { /* nada */ } };
  }, [cargar, userId]);

  // Se cierra al hacer clic fuera o con Esc
  useEffect(() => {
    if (!abierto) return;
    const fuera = (ev) => { if (caja.current && !caja.current.contains(ev.target)) setAbierto(false); };
    const tecla = (ev) => { if (ev.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    window.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fuera); window.removeEventListener('keydown', tecla); };
  }, [abierto]);

  if (!disponible) return null;

  const sinLeer = items.filter((n) => !n.leida).length;
  const ahora = new Date().toISOString();

  const marcar = async (n) => {
    if (n.leida) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true, leida_en: ahora } : x)));
    const { error } = await supabase.from('notificaciones').update({ leida: true, leida_en: ahora }).eq('id', n.id);
    if (error) cargar();
  };
  const marcarTodas = async () => {
    setItems((prev) => prev.map((x) => (x.leida ? x : { ...x, leida: true, leida_en: ahora })));
    const { error } = await supabase.from('notificaciones').update({ leida: true, leida_en: ahora }).eq('user_id', userId).eq('leida', false);
    if (error) cargar();
  };

  return (
    <div ref={caja} style={{ position: 'relative' }}>
      <button onClick={() => setAbierto(!abierto)} aria-expanded={abierto} aria-label={sinLeer ? 'Avisos: ' + sinLeer + ' sin leer' : 'Avisos: ninguno sin leer'}
        style={{ position: 'relative', background: 'transparent', border: '1.5px solid rgba(255,255,255,0.5)', borderRadius: 7, width: 46, height: 46, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
        <Bell size={22} />
        {sinLeer > 0 && (
          <span style={{ position: 'absolute', top: -7, right: -7, minWidth: 22, height: 22, borderRadius: 11, background: '#b98386', color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', border: '2px solid #001a4d' }}>
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <div role="dialog" aria-label="Avisos" style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', zIndex: 120, width: 'min(420px, 92vw)', maxHeight: '70vh', overflowY: 'auto', background: '#fff', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', border: '1px solid #e8ecf1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px', borderBottom: '1px solid #e8ecf1', position: 'sticky', top: 0, background: '#fff' }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: C.navy }}>Avisos</div>
            {sinLeer > 0 && (
              <button onClick={marcarTodas} style={{ background: 'none', border: '1.5px solid #c7cfe0', borderRadius: 7, padding: '7px 12px', color: C.navy, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CheckCheck size={16} /> Marcar todos como leídos
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 16, color: C.gray }}>No tienes avisos.</div>
          ) : items.map((n) => (
            <button key={n.id} onClick={() => marcar(n)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: n.leida ? '#fff' : C.lightGold, border: 'none', borderBottom: '1px solid #eef1f6', borderLeft: '5px solid ' + (n.leida ? 'transparent' : C.gold), padding: '12px 16px', cursor: n.leida ? 'default' : 'pointer' }}>
              <div style={{ fontSize: 16, fontWeight: n.leida ? 600 : 800, color: C.navy }}>{n.titulo}</div>
              {n.mensaje && <div style={{ fontSize: 15, color: '#374151', marginTop: 2, lineHeight: 1.4 }}>{n.mensaje}</div>}
              <div style={{ fontSize: 13, color: C.gray, marginTop: 4 }}>{haceCuanto(n.created_at)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
