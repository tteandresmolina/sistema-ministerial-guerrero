// src/hooks/useOficialiaPartes.js
// Hook — Oficialía de Partes Virtual
// Lógica pura JavaScript. Sin JSX.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useOficialiaPartes(perfil) {
  const [documentos, setDocumentos] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroEstatus, setFiltroEstatus] = useState('todos');

  const esMando = perfil && ['coordinador', 'regional', 'mando'].includes(perfil.rol);

  // ── Cargar documentos ──────────────────────────────────────────
  const fetchDocumentos = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('oficialia_partes').select('*').order('fecha_recepcion', { ascending: false });

    // Los agentes solo ven lo asignado a ellos; los mandos ven todo
    if (perfil && !['coordinador', 'regional', 'mando'].includes(perfil.rol)) {
      query = query.eq('asignado_a', perfil.id);
    }
    if (filtroTipo !== 'todos') query = query.eq('tipo_documento', filtroTipo);
    if (filtroEstatus !== 'todos') query = query.eq('estatus', filtroEstatus);

    const { data, error: err } = await query;
    if (err) setError('Error al cargar documentos: ' + err.message);
    else setDocumentos(data || []);
    setLoading(false);
  }, [perfil, filtroTipo, filtroEstatus]);

  useEffect(() => { fetchDocumentos(); }, [fetchDocumentos]);

  // ── Cargar agentes activos para asignación ─────────────────────
  useEffect(() => {
    if (!esMando) return;
    supabase.from('perfiles').select('id, nombre_completo, grado, rol, region, zona').eq('activo', true)
      .then(({ data }) => setAgentes(data || []));
  }, [esMando]);

  // ── Crear documento (con subida de archivo opcional) ───────────
  const crearDocumento = async (form, archivo) => {
    setLoading(true);
    setError(null);
    let archivo_url = null;
    let nombre_archivo = null;

    if (archivo) {
      const ext = archivo.name.split('.').pop();
      const ruta = `oficialia/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: errUp } = await supabase.storage.from('expedientes').upload(ruta, archivo);
      if (errUp) { setError('Error al subir archivo: ' + errUp.message); setLoading(false); return null; }
      const { data: urlData } = supabase.storage.from('expedientes').getPublicUrl(ruta);
      archivo_url = urlData.publicUrl;
      nombre_archivo = archivo.name;
    }

    const agenteSel = agentes.find(a => a.id === form.asignado_a);

    const payload = {
      tipo_documento: form.tipo_documento,
      carpeta_investigacion: form.carpeta_investigacion || null,
      numero_oficio: form.numero_oficio || null,
      unidad_emisora: form.unidad_emisora || null,
      nombre_emisor: form.nombre_emisor || null,
      asunto: form.asunto || null,
      descripcion: form.descripcion || null,
      fecha_documento: form.fecha_documento || null,
      prioridad: form.prioridad || 'normal',
      plazo_horas: form.plazo_horas ? parseInt(form.plazo_horas) : null,
      archivo_url,
      nombre_archivo,
      asignado_a: form.asignado_a || null,
      nombre_asignado: agenteSel ? agenteSel.nombre_completo : null,
      asignado_por: perfil?.nombre_completo || '',
      asignado_por_id: perfil?.id || null,
      region: perfil?.region || null,
      zona: perfil?.zona || null,
      registrado_por: perfil?.nombre_completo || '',
      registrado_por_id: perfil?.id || null,
    };

    const { data, error: err } = await supabase.from('oficialia_partes').insert([payload]).select().single();
    setLoading(false);
    if (err) { setError('Error al registrar: ' + err.message); return null; }
    await fetchDocumentos();
    return data;
  };

  // ── Acuse de ENTERADO por el agente asignado ───────────────────
  const acusarEnterado = async (doc) => {
    setLoading(true);
    const { error: err } = await supabase.from('oficialia_partes').update({
      estatus: 'enterado',
      fecha_acuse: new Date().toISOString(),
      acuse_por: perfil?.nombre_completo || '',
    }).eq('id', doc.id);
    setLoading(false);
    if (err) { setError('Error en acuse: ' + err.message); return false; }
    await fetchDocumentos();
    return true;
  };

  // ── Cambiar estatus (en_tramite / concluido) ───────────────────
  const actualizarEstatus = async (doc, nuevoEstatus) => {
    setLoading(true);
    const cambios = { estatus: nuevoEstatus };
    if (nuevoEstatus === 'concluido') cambios.fecha_conclusion = new Date().toISOString();
    const { error: err } = await supabase.from('oficialia_partes').update(cambios).eq('id', doc.id);
    setLoading(false);
    if (err) { setError('Error al actualizar: ' + err.message); return false; }
    await fetchDocumentos();
    return true;
  };

  // ── Reasignar a otro agente ────────────────────────────────────
  const reasignar = async (doc, nuevoAgenteId) => {
    const agenteSel = agentes.find(a => a.id === nuevoAgenteId);
    if (!agenteSel) { setError('Agente no encontrado'); return false; }
    setLoading(true);
    const { error: err } = await supabase.from('oficialia_partes').update({
      asignado_a: nuevoAgenteId,
      nombre_asignado: agenteSel.nombre_completo,
      asignado_por: perfil?.nombre_completo || '',
      asignado_por_id: perfil?.id || null,
      estatus: 'pendiente',
      fecha_acuse: null,
      acuse_por: null,
    }).eq('id', doc.id);
    setLoading(false);
    if (err) { setError('Error al reasignar: ' + err.message); return false; }
    await fetchDocumentos();
    return true;
  };

  // ── Métricas ───────────────────────────────────────────────────
  const ahora = Date.now();
  const metricas = {
    total: documentos.length,
    pendientes: documentos.filter(d => d.estatus === 'pendiente').length,
    enterados: documentos.filter(d => d.estatus === 'enterado').length,
    en_tramite: documentos.filter(d => d.estatus === 'en_tramite').length,
    concluidos: documentos.filter(d => d.estatus === 'concluido').length,
    vencidos: documentos.filter(d => d.fecha_limite && new Date(d.fecha_limite).getTime() < ahora && d.estatus !== 'concluido').length,
    amparos_activos: documentos.filter(d => d.tipo_documento === 'amparo_judicial' && d.estatus !== 'concluido').length,
  };

  // ── Utilidades ─────────────────────────────────────────────────
  const getTipoLabel = (tipo) => ({
    oficio_investigacion: 'Oficio de Investigación',
    oficio_administrativo: 'Oficio Administrativo',
    amparo_judicial: 'Amparo / Requerimiento Judicial',
  }[tipo] || tipo);

  const getTipoColor = (tipo) => ({
    oficio_investigacion: '#001a4d',
    oficio_administrativo: '#0f6e56',
    amparo_judicial: '#dc2626',
  }[tipo] || '#6b7280');

  const getEstatusColor = (estatus) => ({
    pendiente: '#f59e0b',
    enterado: '#3b82f6',
    en_tramite: '#8b5cf6',
    concluido: '#10b981',
  }[estatus] || '#6b7280');

  const getPrioridadColor = (p) => ({
    normal: '#6b7280',
    urgente: '#f59e0b',
    extraurgente: '#dc2626',
  }[p] || '#6b7280');

  const formatFecha = (f) => {
    if (!f) return '—';
    return new Date(f).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  };

  const horasRestantes = (fechaLimite) => {
    if (!fechaLimite) return null;
    return (new Date(fechaLimite).getTime() - Date.now()) / (1000 * 60 * 60);
  };

  return {
    documentos, agentes, loading, error, setError,
    filtroTipo, setFiltroTipo, filtroEstatus, setFiltroEstatus,
    fetchDocumentos, crearDocumento, acusarEnterado, actualizarEstatus, reasignar,
    metricas, esMando,
    getTipoLabel, getTipoColor, getEstatusColor, getPrioridadColor, formatFecha, horasRestantes,
  };
}
