// src/pages/CambiarContrasena.jsx
// Ventana para que cada persona cambie SU propia contraseña (botón "Mi contraseña" del encabezado).
// Así quien da de alta a otra persona con una contraseña temporal no se queda conociendo la definitiva.

import { useState } from 'react';
import { supabase } from '../supabaseClient';

const C = { navy: '#001a4d', gold: '#b69054', gray: '#5a6478', guinda: '#8b1e1e', verde: '#2e7d32' };
const campo = { width: '100%', padding: '11px 12px', border: '2px solid #e8ecf1', borderRadius: 7, fontSize: 17, minHeight: 46, boxSizing: 'border-box', fontFamily: 'inherit' };
const btn = { borderRadius: 8, padding: '11px 20px', fontSize: 16, fontWeight: 700, cursor: 'pointer', minHeight: 46 };

export default function CambiarContrasena({ onCerrar }) {
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  const guardar = async () => {
    setError('');
    if (nueva.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (nueva !== confirmar) { setError('Las dos contraseñas no coinciden.'); return; }
    setTrabajando(true);
    const { error: e } = await supabase.auth.updateUser({ password: nueva });
    setTrabajando(false);
    if (e) { setError('No se pudo cambiar la contraseña: ' + e.message); return; }
    setListo(true);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Cambiar mi contraseña"
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.navy, marginBottom: 6 }}>Cambiar mi contraseña</div>
        {listo ? (
          <>
            <div style={{ fontSize: 18, color: C.verde, fontWeight: 700, margin: '12px 0 18px' }}>Listo: tu contraseña quedó cambiada. Desde ahora solo tú la conoces.</div>
            <button onClick={onCerrar} style={{ ...btn, background: C.navy, border: '2px solid ' + C.navy, color: '#fff' }}>Cerrar</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 16, color: C.gray, lineHeight: 1.5, marginBottom: 14 }}>
              Elige una contraseña que solo tú conozcas, de al menos 8 caracteres. No la compartas con nadie.
            </div>
            <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: C.gray, marginBottom: 4 }}>Nueva contraseña</label>
            <input type="password" autoComplete="new-password" style={campo} value={nueva} onChange={(e) => setNueva(e.target.value)} />
            <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: C.gray, margin: '12px 0 4px' }}>Repite la nueva contraseña</label>
            <input type="password" autoComplete="new-password" style={campo} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
            {error && <div style={{ fontSize: 16, color: C.guinda, fontWeight: 700, marginTop: 12 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
              <button onClick={guardar} disabled={trabajando} style={{ ...btn, background: C.navy, border: '2px solid ' + C.navy, color: '#fff', opacity: trabajando ? 0.6 : 1 }}>{trabajando ? 'Guardando…' : 'Guardar contraseña'}</button>
              <button onClick={onCerrar} style={{ ...btn, background: '#fff', border: '2px solid ' + C.navy, color: C.navy }}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
