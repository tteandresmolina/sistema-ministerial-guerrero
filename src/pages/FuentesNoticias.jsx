// src/pages/FuentesNoticias.jsx
// Administrador de las fuentes del panel Entorno (solo rol mando; la base de datos también lo exige).
//  · Cada fuente se PRUEBA antes de activarla: el servidor dice si responde y cuántos titulares tiene.
//  · "Buscar canal" encuentra solo la dirección del canal RSS de un sitio, sin que tengas que saberla.
//  · Los comunicados de redes sociales (X, Facebook) se agregan a mano: enlace + titular. No se usan APIs ni scripts de terceros.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { X, Plus, Trash2 } from 'lucide-react';

const P = { tinta: '#1f2937', gris: '#5a6478', guinda: '#8b1e1e', oro: '#b6905a', borde: '#e8e2d4', marfil: '#f7f1e6', verde: '#4a6b3a' };
const campo = { padding: '8px 10px', border: '2px solid #e8ecf1', borderRadius: 7, fontSize: 15, minHeight: 40, boxSizing: 'border-box', fontFamily: 'inherit', width: '100%' };
const btn = { borderRadius: 8, padding: '8px 14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: 40, display: 'inline-flex', alignItems: 'center', gap: 6 };
const primario = { ...btn, background: P.guinda, border: '2px solid ' + P.guinda, color: '#fff' };
const secundario = { ...btn, background: '#fff', border: '2px solid ' + P.guinda, color: P.guinda };

export const CATEGORIAS = {
  seguridad: { texto: 'Seguridad', color: '#9a5a5e' },
  oficial: { texto: 'Oficial', color: '#b6905a' },
  clima: { texto: 'Clima', color: '#6b7f6a' },
  analisis: { texto: 'Análisis', color: '#8a7a6a' },
};

export function fuenteDeEnlace(enlace) {
  let host = '';
  try { host = new URL(enlace).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { return ''; }
  if (host === 'x.com' || host === 'twitter.com') return 'X';
  if (host.endsWith('facebook.com') || host === 'fb.com' || host === 'fb.watch') return 'Facebook';
  if (host.endsWith('instagram.com')) return 'Instagram';
  if (host.endsWith('youtube.com') || host === 'youtu.be') return 'YouTube';
  return host;
}
const aLista = (t) => String(t || '').split(',').map((x) => x.trim()).filter(Boolean);
const estadoTexto = (f) => (f.ultimo_estado === 'ok' ? 'Responde · ' + (f.ultimos_titulares ?? 0) + ' titulares' : f.ultimo_estado === 'error' ? 'Error: ' + (f.ultimo_error || '') : f.ultimo_estado === 'sin_direccion' ? 'Sin dirección de canal' : 'Sin probar');
const estadoColor = (f) => (f.ultimo_estado === 'ok' ? P.verde : f.ultimo_estado === 'error' ? P.guinda : P.gris);

export default function FuentesNoticias({ perfil, onCerrar }) {
  const [fuentes, setFuentes] = useState([]);
  const [edicion, setEdicion] = useState({});
  const [hallados, setHallados] = useState({});
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState('');
  const [manual, setManual] = useState({ enlace: '', titulo: '', fuente: '', categoria: 'seguridad' });

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('fuentes_noticias').select('*').order('categoria', { ascending: true }).order('nombre', { ascending: true });
    if (error) { setMsg({ ok: false, t: 'No se pudieron cargar las fuentes: ' + error.message }); return; }
    setFuentes(data || []);
    setEdicion(Object.fromEntries((data || []).map((f) => [f.id, { nombre: f.nombre, url: f.url || '', sitio: f.sitio || '', categoria: f.categoria, palabras: (f.palabras_clave || []).join(', '), maximo: f.maximo, activa: f.activa }])));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const poner = (id, cambios) => setEdicion((e) => ({ ...e, [id]: { ...e[id], ...cambios } }));
  const mensajeDe = async (error) => { let m = error.message; try { const c = await error.context.json(); if (c && c.error) m = c.error; } catch (e) { /* sin detalle */ } return m; };

  const guardar = async (f) => {
    const e = edicion[f.id];
    const url = e.url.trim();
    if (url && !/^https:\/\//i.test(url)) { setMsg({ ok: false, t: 'La dirección del canal debe empezar con https://' }); return; }
    if (e.activa && !url) { setMsg({ ok: false, t: 'Para activar una fuente primero necesita la dirección de su canal.' }); return; }
    setOcupado('g' + f.id);
    const { error } = await supabase.from('fuentes_noticias').update({ nombre: e.nombre.trim() || f.nombre, url: url || null, sitio: e.sitio.trim() || null, categoria: e.categoria, palabras_clave: aLista(e.palabras), maximo: Math.min(30, Math.max(1, Number(e.maximo) || 8)), activa: !!e.activa }).eq('id', f.id);
    setOcupado('');
    if (error) { setMsg({ ok: false, t: 'No se pudo guardar: ' + error.message }); return; }
    setMsg({ ok: true, t: 'Fuente guardada.' }); cargar();
  };

  const probar = async (id) => {
    setOcupado('p' + (id || 'todas')); setMsg(null);
    const { data, error } = await supabase.functions.invoke('leer-fuentes', { body: id ? { accion: 'probar', id } : { accion: 'probar' } });
    setOcupado('');
    if (error) { setMsg({ ok: false, t: 'No se pudo probar: ' + await mensajeDe(error) + ' (¿ya instalaste la función "leer-fuentes"?)' }); return; }
    const r = data.resultados || [];
    setMsg({ ok: true, t: 'Prueba terminada: ' + r.filter((x) => x.ok).length + ' de ' + r.length + ' fuentes respondieron.' }); cargar();
  };

  const buscarCanal = async (f) => {
    const sitio = (edicion[f.id].sitio || '').trim();
    if (!sitio) { setMsg({ ok: false, t: 'Escribe primero la página principal del sitio (por ejemplo https://www.gob.mx/sspc).' }); return; }
    setOcupado('b' + f.id); setMsg(null);
    const { data, error } = await supabase.functions.invoke('leer-fuentes', { body: { accion: 'descubrir', sitio } });
    setOcupado('');
    if (error) { setMsg({ ok: false, t: 'No se pudo buscar: ' + await mensajeDe(error) }); return; }
    setHallados((h) => ({ ...h, [f.id]: data.canales || [] }));
    if (!data.canales || data.canales.length === 0) setMsg({ ok: false, t: 'No se encontró un canal RSS en ese sitio. Si publica en redes, agrega los comunicados a mano abajo.' });
  };

  const agregarFuente = async () => {
    const { error } = await supabase.from('fuentes_noticias').insert({ nombre: 'Nueva fuente', categoria: 'seguridad', activa: false });
    if (error) { setMsg({ ok: false, t: 'No se pudo agregar: ' + error.message }); return; }
    cargar();
  };
  const eliminar = async (f) => {
    if (!window.confirm('¿Eliminar la fuente "' + f.nombre + '" y sus titulares?')) return;
    const { error } = await supabase.from('fuentes_noticias').delete().eq('id', f.id);
    if (error) { setMsg({ ok: false, t: 'No se pudo eliminar: ' + error.message }); return; }
    cargar();
  };

  const agregarComunicado = async () => {
    const enlace = manual.enlace.trim(), titulo = manual.titulo.trim();
    if (!/^https?:\/\//i.test(enlace)) { setMsg({ ok: false, t: 'Pega el enlace completo de la publicación (empieza con https://).' }); return; }
    if (titulo.length < 5) { setMsg({ ok: false, t: 'Escribe el titular en una línea.' }); return; }
    const { error } = await supabase.from('noticias').insert({ origen: 'manual', fuente_nombre: manual.fuente.trim() || fuenteDeEnlace(enlace) || 'Comunicado', categoria: manual.categoria, titulo: titulo.slice(0, 300), enlace, publicada_en: new Date().toISOString(), creada_por: perfil?.id || null });
    if (error) { setMsg({ ok: false, t: /duplicate|unique/i.test(error.message) ? 'Ese enlace ya está registrado.' : 'No se pudo agregar: ' + error.message }); return; }
    setManual({ enlace: '', titulo: '', fuente: '', categoria: manual.categoria });
    setMsg({ ok: true, t: 'Comunicado agregado. Ya aparece en el Entorno.' });
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Fuentes del Entorno" style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: '#f4f6f9', borderRadius: 14, width: '100%', maxWidth: 920, height: 'fit-content', padding: '20px 22px 26px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: P.tinta }}>Fuentes del Entorno</div>
          <button onClick={onCerrar} style={secundario}><X size={18} /> Cerrar</button>
        </div>
        <div style={{ fontSize: 15, color: P.gris, margin: '6px 0 12px', lineHeight: 1.5 }}>
          Prueba cada fuente antes de activarla. Si no sabes la dirección de su canal, pon la página principal y pulsa <strong>Buscar canal</strong>. Para el Diario Oficial, elige tus filtros en{' '}
          <a href="https://dof.gob.mx/website/filtroRss.php" target="_blank" rel="noopener noreferrer" style={{ color: P.guinda, fontWeight: 700 }}>su página de filtros RSS</a>, copia la dirección del canal y pégala aquí.
        </div>

        {msg && <div role="status" style={{ background: msg.ok ? '#eef4ea' : '#fdecea', color: msg.ok ? P.verde : P.guinda, borderRadius: 8, padding: '8px 12px', fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{msg.t}</div>}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <button onClick={() => probar(null)} disabled={!!ocupado} style={primario}>{ocupado === 'ptodas' ? 'Probando…' : 'Probar todas las fuentes'}</button>
          <button onClick={agregarFuente} style={secundario}><Plus size={16} /> Agregar fuente</button>
        </div>

        {fuentes.map((f) => {
          const e = edicion[f.id] || {};
          const canales = hallados[f.id];
          return (
            <div key={f.id} style={{ background: '#fff', border: '1px solid ' + P.borde, borderLeft: '5px solid ' + (e.activa ? P.verde : '#c9c2b2'), borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                <label><span style={{ fontSize: 13, fontWeight: 700, color: P.gris }}>Nombre</span><input style={campo} value={e.nombre || ''} onChange={(ev) => poner(f.id, { nombre: ev.target.value })} /></label>
                <label><span style={{ fontSize: 13, fontWeight: 700, color: P.gris }}>Categoría</span>
                  <select style={campo} value={e.categoria || 'seguridad'} onChange={(ev) => poner(f.id, { categoria: ev.target.value })}>
                    {Object.entries(CATEGORIAS).map(([k, c]) => <option key={k} value={k}>{c.texto}</option>)}
                  </select></label>
                <label><span style={{ fontSize: 13, fontWeight: 700, color: P.gris }}>Página principal del sitio</span><input style={campo} placeholder="https://…" value={e.sitio || ''} onChange={(ev) => poner(f.id, { sitio: ev.target.value })} /></label>
              </div>
              <label style={{ display: 'block', marginTop: 8 }}><span style={{ fontSize: 13, fontWeight: 700, color: P.gris }}>Dirección del canal RSS</span><input style={campo} placeholder="https://… (se llena con Buscar canal)" value={e.url || ''} onChange={(ev) => poner(f.id, { url: ev.target.value })} /></label>
              {canales && canales.length > 0 && (
                <div style={{ background: P.marfil, borderRadius: 8, padding: '8px 10px', marginTop: 8, fontSize: 14 }}>
                  <strong>Canales encontrados:</strong>
                  {canales.map((c) => (
                    <div key={c.url} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                      <span style={{ wordBreak: 'break-all' }}>{c.url} · {c.items} titulares</span>
                      <button onClick={() => poner(f.id, { url: c.url })} style={{ ...secundario, minHeight: 34, padding: '4px 10px' }}>Usar</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 8 }}>
                <label><span style={{ fontSize: 13, fontWeight: 700, color: P.gris }}>Solo titulares que mencionen (separa con comas; vacío = todos)</span><input style={campo} value={e.palabras || ''} onChange={(ev) => poner(f.id, { palabras: ev.target.value })} /></label>
                <label><span style={{ fontSize: 13, fontWeight: 700, color: P.gris }}>Máximo de titulares</span><input type="number" min="1" max="30" style={campo} value={e.maximo || 8} onChange={(ev) => poner(f.id, { maximo: ev.target.value })} /></label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700 }}><input type="checkbox" checked={!!e.activa} onChange={(ev) => poner(f.id, { activa: ev.target.checked })} /> Activa</label>
                <button onClick={() => buscarCanal(f)} disabled={!!ocupado} style={secundario}>{ocupado === 'b' + f.id ? 'Buscando…' : 'Buscar canal'}</button>
                <button onClick={() => probar(f.id)} disabled={!!ocupado} style={secundario}>{ocupado === 'p' + f.id ? 'Probando…' : 'Probar'}</button>
                <button onClick={() => guardar(f)} disabled={!!ocupado} style={primario}>Guardar</button>
                <button onClick={() => eliminar(f)} aria-label={'Eliminar ' + f.nombre} style={{ ...btn, background: 'none', border: 'none', color: P.gris }}><Trash2 size={18} /></button>
                <span style={{ fontSize: 14, fontWeight: 700, color: estadoColor(f), marginLeft: 'auto' }}>{estadoTexto(f)}</span>
              </div>
            </div>
          );
        })}

        <div style={{ background: '#fff', border: '1px solid ' + P.borde, borderLeft: '5px solid ' + P.oro, borderRadius: 10, padding: '14px 16px', marginTop: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: P.tinta }}>Agregar un comunicado a mano</div>
          <div style={{ fontSize: 14, color: P.gris, margin: '2px 0 10px' }}>Para lo que se publica en redes (X, Facebook): pega el enlace de la publicación y escribe el titular en una línea. No se usan servicios de terceros.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
            <label><span style={{ fontSize: 13, fontWeight: 700, color: P.gris }}>Enlace de la publicación</span><input style={campo} placeholder="https://x.com/…" value={manual.enlace} onChange={(ev) => setManual({ ...manual, enlace: ev.target.value })} /></label>
            <label><span style={{ fontSize: 13, fontWeight: 700, color: P.gris }}>Titular (una línea)</span><input style={campo} value={manual.titulo} maxLength={300} onChange={(ev) => setManual({ ...manual, titulo: ev.target.value })} /></label>
            <label><span style={{ fontSize: 13, fontWeight: 700, color: P.gris }}>Fuente (se detecta sola: {fuenteDeEnlace(manual.enlace) || '—'})</span><input style={campo} placeholder="Opcional, p. ej. X · @SSPC" value={manual.fuente} onChange={(ev) => setManual({ ...manual, fuente: ev.target.value })} /></label>
            <label><span style={{ fontSize: 13, fontWeight: 700, color: P.gris }}>Categoría</span>
              <select style={campo} value={manual.categoria} onChange={(ev) => setManual({ ...manual, categoria: ev.target.value })}>
                {Object.entries(CATEGORIAS).map(([k, c]) => <option key={k} value={k}>{c.texto}</option>)}
              </select></label>
          </div>
          <button onClick={agregarComunicado} style={{ ...primario, marginTop: 10 }}>Agregar comunicado</button>
        </div>
      </div>
    </div>
  );
}
