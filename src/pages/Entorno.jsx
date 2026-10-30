// src/pages/Entorno.jsx
// Panel "Entorno" del Inicio: titulares de seguridad y justicia de fuentes oficiales y comunicados curados por el mando.
//  · Solo titulares con enlace: para leer la nota se abre la fuente en otra pestaña (nunca se incrusta ni se copia su contenido).
//  · Los titulares los lee una función del servidor; el navegador de nadie consulta sitios externos.
//  · Si las tablas todavía no existen en la base, el panel no se muestra y el Inicio queda igual que antes.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { ExternalLink, RefreshCw, Settings } from 'lucide-react';
import { haceCuanto } from './Campana';
import FuentesNoticias, { CATEGORIAS } from './FuentesNoticias';

const P = { tinta: '#1f2937', gris: '#5a6478', guinda: '#8b1e1e', oro: '#b6905a', borde: '#e8e2d4', marfil: '#f7f1e6' };
const ESPERA_MIN = 30;
const esEnlace = (u) => /^https?:\/\//i.test(String(u || ''));
const dominio = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };

export default function Entorno({ perfil }) {
  const [items, setItems] = useState([]);
  const [filtro, setFiltro] = useState('todas');
  const [disponible, setDisponible] = useState(true);
  const [cargado, setCargado] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [verFuentes, setVerFuentes] = useState(false);
  const esMando = perfil?.rol === 'mando';

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('noticias').select('*').order('publicada_en', { ascending: false, nullsFirst: false }).limit(40);
    if (error) { if (/does not exist|schema cache|relation/i.test(error.message || '')) setDisponible(false); setCargado(true); return; }
    setItems(data || []); setCargado(true);
  }, []);

  useEffect(() => {
    let vivo = true;
    cargar();
    // Una vez cada 30 minutos por sesión se pide al servidor que revise los canales (él mismo limita el ritmo para todos)
    try {
      const ultima = Number(sessionStorage.getItem('noticiasLeidasEn') || 0);
      if (Date.now() - ultima > ESPERA_MIN * 60000) {
        sessionStorage.setItem('noticiasLeidasEn', String(Date.now()));
        Promise.resolve(supabase.functions.invoke('leer-fuentes', { body: { accion: 'leer' } })).then((r) => {
          if (vivo && r && r.data && r.data.ok && !r.data.omitido) cargar();
        }).catch(() => {});
      }
    } catch (e) { /* sin almacenamiento o sin función: se muestra lo que ya hay */ }
    return () => { vivo = false; };
  }, [cargar]);

  if (!disponible) return null;

  const actualizarYa = async () => {
    setLeyendo(true); setMensaje('');
    const { data, error } = await supabase.functions.invoke('leer-fuentes', { body: { accion: 'leer', forzar: true } });
    setLeyendo(false);
    if (error) { setMensaje('No se pudo actualizar: la función "leer-fuentes" todavía no está instalada o falló.'); return; }
    setMensaje('Fuentes revisadas: ' + (data?.leidas ?? 0) + ' de ' + (data?.fuentes ?? 0) + ' respondieron.');
    cargar();
  };

  const presentes = Object.keys(CATEGORIAS).filter((c) => items.some((n) => n.categoria === c));
  const visibles = items.filter((n) => filtro === 'todas' || n.categoria === filtro).slice(0, 8);
  const ultimaLectura = items.reduce((m, n) => (n.creada_en && n.creada_en > m ? n.creada_en : m), '');

  const chip = (activo) => ({ border: activo ? '2px solid ' + P.oro : '1.5px solid #d8d2c2', background: activo ? P.marfil : '#fff', color: P.tinta, borderRadius: 16, padding: '4px 12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' });

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid ' + P.borde }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 19, fontWeight: 800, color: P.tinta, margin: 0 }}>Entorno</h3>
        <span style={{ fontSize: 13, color: P.gris }}>Seguridad y justicia · solo titulares</span>
      </div>

      {presentes.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 4px' }}>
          <button onClick={() => setFiltro('todas')} style={chip(filtro === 'todas')} aria-pressed={filtro === 'todas'}>Todo</button>
          {presentes.map((c) => <button key={c} onClick={() => setFiltro(c)} style={chip(filtro === c)} aria-pressed={filtro === c}>{CATEGORIAS[c].texto}</button>)}
        </div>
      )}

      <div style={{ marginTop: 6 }}>
        {!cargado ? <div style={{ fontSize: 16, color: P.gris, padding: '10px 0' }}>Cargando…</div>
          : visibles.length === 0 ? (
            <div style={{ fontSize: 16, color: P.gris, padding: '10px 0', lineHeight: 1.5 }}>
              Todavía no hay titulares. {esMando ? 'Abre "Fuentes" para probar y activar los canales.' : 'Se mostrarán aquí cuando se activen las fuentes.'}
            </div>
          ) : visibles.map((n) => {
            const cat = CATEGORIAS[n.categoria] || CATEGORIAS.seguridad;
            const cuando = n.publicada_en || n.creada_en;
            return (
              <div key={n.id} style={{ padding: '9px 0', borderTop: '1px solid ' + P.borde }}>
                {esEnlace(n.enlace)
                  ? <a href={n.enlace} target="_blank" rel="noopener noreferrer" title={dominio(n.enlace)} style={{ fontSize: 16, fontWeight: 700, color: P.tinta, textDecoration: 'none', lineHeight: 1.35 }}>{n.titulo} <ExternalLink size={14} style={{ verticalAlign: -1, color: P.gris }} /></a>
                  : <span style={{ fontSize: 16, fontWeight: 700, color: P.tinta }}>{n.titulo}</span>}
                <div style={{ fontSize: 13, color: P.gris, marginTop: 3, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ background: cat.color + '22', color: cat.color, borderRadius: 4, padding: '0 7px', fontWeight: 700 }}>{cat.texto}</span>
                  <span>{n.fuente_nombre}</span>
                  {n.origen === 'manual' && <span style={{ border: '1px solid ' + P.oro, color: '#7a5a22', borderRadius: 4, padding: '0 6px', fontWeight: 700 }}>Curado</span>}
                  {cuando && <span>· {haceCuanto(cuando)}</span>}
                </div>
              </div>
            );
          })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 8, borderTop: '1px solid ' + P.borde, paddingTop: 10 }}>
        <span style={{ fontSize: 13, color: P.gris }}>{ultimaLectura ? 'Actualizado ' + haceCuanto(ultimaLectura) : 'Sin actualizaciones todavía'}. Para leer la nota se abre la fuente.</span>
        {esMando && (
          <span style={{ display: 'inline-flex', gap: 8 }}>
            <button onClick={actualizarYa} disabled={leyendo} style={{ ...chip(false), display: 'inline-flex', alignItems: 'center', gap: 6, opacity: leyendo ? 0.6 : 1 }}><RefreshCw size={14} /> {leyendo ? 'Actualizando…' : 'Actualizar ahora'}</button>
            <button onClick={() => setVerFuentes(true)} style={{ ...chip(false), display: 'inline-flex', alignItems: 'center', gap: 6 }}><Settings size={14} /> Fuentes</button>
          </span>
        )}
      </div>
      {mensaje && <div style={{ fontSize: 14, fontWeight: 700, color: P.guinda, marginTop: 6 }}>{mensaje}</div>}
      {verFuentes && <FuentesNoticias perfil={perfil} onCerrar={() => { setVerFuentes(false); cargar(); }} />}
    </div>
  );
}
