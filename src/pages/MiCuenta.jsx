// src/pages/MiCuenta.jsx
// "Mi cuenta": lo propio de cada persona en un solo lugar.
//  · Perfil: los datos oficiales se ven con candado (solo los cambia la Subcoordinación Administrativa, con bitácora);
//    cada persona cambia únicamente su teléfono.
//  · Pantalla: tamaño de letra y de todo el sistema, guardado en su cuenta.
//  · Seguridad: cambiar su contraseña, ver su último acceso y cerrar sesión en todos sus equipos.

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Lock, KeyRound, MonitorSmartphone } from 'lucide-react';
import CambiarContrasena from './CambiarContrasena';

const C = { navy: '#001a4d', gold: '#b69054', goldClaro: '#d9bd85', gray: '#5a6478', guinda: '#8b1e1e', verde: '#2e7d32', lightGold: '#f5ede0' };
const CARGO_ETIQUETA = { agente: 'Agente', coordinador_grupo: 'Coordinador de Grupo', coordinador: 'Coordinador de Zona', regional: 'Coordinador Regional', mando: 'Director General', subcoord_admin: 'Subcoordinación Administrativa' };
export const TAMANOS = [
  { clave: 'normal', texto: 'Normal', px: 16 },
  { clave: 'grande', texto: 'Grande', px: 18 },
  { clave: 'muy_grande', texto: 'Muy grande', px: 21 },
];

const tarjeta = { background: '#fff', borderRadius: 12, padding: '16px 20px', marginTop: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
const titulo = { fontSize: 19, fontWeight: 800, color: C.navy, margin: '0 0 12px' };
const etiqueta = { fontSize: 14, fontWeight: 700, color: C.gray, display: 'block', marginBottom: 2 };
const valor = { fontSize: 17, fontWeight: 600, color: '#1f2937' };
const btn = { borderRadius: 8, padding: '10px 18px', fontSize: 16, fontWeight: 700, cursor: 'pointer', minHeight: 46, display: 'inline-flex', alignItems: 'center', gap: 8 };
const btnPrimario = { ...btn, background: C.navy, border: '2px solid ' + C.navy, color: '#fff' };
const btnSecundario = { ...btn, background: '#fff', border: '2px solid ' + C.navy, color: C.navy };

function Dato({ etiqueta: e, valor: v, oficial }) {
  return (
    <div>
      <span style={etiqueta}>{e}</span>
      <div style={valor}>{v || '—'}</div>
      {oficial && <div style={{ fontSize: 13, color: C.gray, marginTop: 1 }}><Lock size={12} style={{ verticalAlign: -1 }} /> Dato oficial</div>}
    </div>
  );
}

// perfil: el perfil de quien está en sesión · tamano: 'normal' | 'grande' | 'muy_grande' · onTamano(clave) devuelve Promise<{ ok, enCuenta }>
export default function MiCuenta({ perfil, tamano, onTamano, onCerrar }) {
  const [telefono, setTelefono] = useState(perfil?.telefono_personal || '');
  const [msgTel, setMsgTel] = useState(null);
  const [guardandoTel, setGuardandoTel] = useState(false);
  const [msgTam, setMsgTam] = useState(null);
  const [email, setEmail] = useState('');
  const [ultimoAcceso, setUltimoAcceso] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [msgSeg, setMsgSeg] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data && data.user) { setEmail(data.user.email || ''); setUltimoAcceso(data.user.last_sign_in_at || ''); }
    }).catch(() => {});
  }, []);

  const guardarTelefono = async () => {
    setGuardandoTel(true); setMsgTel(null);
    const { error } = await supabase.rpc('actualizar_mi_telefono', { p_telefono: telefono });
    setGuardandoTel(false);
    if (error) {
      const falta = /could not find the function|does not exist/i.test(error.message || '');
      setMsgTel({ ok: false, t: falta ? 'Todavía no está activada esta función en la base de datos (falta aplicar mi_cuenta.sql).' : error.message });
      return;
    }
    setMsgTel({ ok: true, t: 'Teléfono guardado.' });
  };

  const elegirTamano = async (clave) => {
    setMsgTam(null);
    const r = await onTamano(clave);
    setMsgTam(r && r.enCuenta ? 'Guardado en tu cuenta: te seguirá a cualquier computadora.' : 'Guardado en este equipo.');
  };

  const cerrarEnTodos = async () => {
    if (!window.confirm('Se cerrará tu sesión en todos los equipos donde hayas entrado, incluido este. ¿Continuar?')) return;
    setMsgSeg(null);
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) setMsgSeg('No se pudo cerrar la sesión en todos los equipos: ' + error.message);
  };

  const fechaAcceso = ultimoAcceso ? new Date(ultimoAcceso).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }) : '—';
  const iniciales = String(perfil?.nombre_completo || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  return (
    <div role="dialog" aria-modal="true" aria-label="Mi cuenta" style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: '#f4f6fb', borderRadius: 14, width: '100%', maxWidth: 780, height: 'fit-content', padding: '20px 22px 24px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.navy }}>Mi cuenta</div>
          <button onClick={onCerrar} aria-label="Cerrar" style={{ ...btnSecundario, padding: '8px 14px', minHeight: 42 }}><X size={18} /> Cerrar</button>
        </div>

        {/* Perfil */}
        <div style={tarjeta}>
          <h3 style={titulo}>Mi perfil</h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: C.gold, color: '#fff', fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{iniciales}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{perfil?.nombre_completo}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: 0.5 }}>{CARGO_ETIQUETA[perfil?.cargo] || perfil?.cargo || perfil?.rol}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <Dato etiqueta="No. de empleado" valor={perfil?.numero_empleado} oficial />
            <Dato etiqueta="Región" valor={perfil?.region} oficial />
            <Dato etiqueta="Zona o coordinación" valor={perfil?.zona || 'Toda la región'} oficial />
            <Dato etiqueta="Correo de acceso" valor={email} oficial />
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={etiqueta} htmlFor="mi-telefono">Teléfono personal</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input id="mi-telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" maxLength={20}
                style={{ padding: '10px 12px', border: '2px solid #e8ecf1', borderRadius: 7, fontSize: 17, minHeight: 46, boxSizing: 'border-box', width: 240 }} />
              <button onClick={guardarTelefono} disabled={guardandoTel} style={{ ...btnPrimario, opacity: guardandoTel ? 0.6 : 1 }}>{guardandoTel ? 'Guardando…' : 'Guardar teléfono'}</button>
            </div>
            {msgTel && <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6, color: msgTel.ok ? C.verde : C.guinda }}>{msgTel.t}</div>}
          </div>
          <div style={{ fontSize: 14, color: C.gray, marginTop: 12 }}>Los datos oficiales solo los cambia la Subcoordinación Administrativa, y queda registrado en la bitácora.</div>
        </div>

        {/* Pantalla */}
        <div style={tarjeta}>
          <h3 style={titulo}>Pantalla</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {TAMANOS.map((t) => (
              <button key={t.clave} onClick={() => elegirTamano(t.clave)} aria-pressed={tamano === t.clave}
                style={{ ...btn, fontSize: t.px, background: tamano === t.clave ? C.lightGold : '#fff', border: tamano === t.clave ? '2px solid ' + C.gold : '1.5px solid #c7cfe0', color: C.navy }}>{t.texto}</button>
            ))}
          </div>
          <div style={{ fontSize: 15, color: C.gray, marginTop: 10 }}>Agranda el texto y todo el sistema. Si algo no se ve bien con un tamaño, vuelve a Normal.</div>
          {msgTam && <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6, color: C.verde }}>{msgTam}</div>}
        </div>

        {/* Seguridad */}
        <div style={tarjeta}>
          <h3 style={titulo}>Seguridad</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => setVerPass(true)} style={btnSecundario}><KeyRound size={18} /> Cambiar mi contraseña</button>
            <button onClick={cerrarEnTodos} style={btnSecundario}><MonitorSmartphone size={18} /> Cerrar sesión en todos mis equipos</button>
          </div>
          <div style={{ fontSize: 15, color: C.gray, marginTop: 10 }}>Último acceso: <strong>{fechaAcceso}</strong></div>
          {msgSeg && <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6, color: C.guinda }}>{msgSeg}</div>}
        </div>
      </div>
      {verPass && <CambiarContrasena onCerrar={() => setVerPass(false)} />}
    </div>
  );
}
