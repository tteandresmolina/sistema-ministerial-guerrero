// src/hooks/useAnalisisSARA.js
// Hook para Tab 8 — Análisis SARA (Scanning, Analysis, Response, Assessment)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useAnalisisSARA(user) {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtroFase, setFiltroFase] = useState('todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState('todos');

  const fetchProyectos = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('proyectos_sara')
        .select('*')
        .neq('estatus', 'archivado')
        .order('created_at', { ascending: false });

      if (filtroFase !== 'todos') query = query.eq('fase_actual', filtroFase);
      if (filtroPrioridad !== 'todos') query = query.eq('prioridad', filtroPrioridad);

      if (user?.rol === 'coordinador_zona') query = query.eq('region', user.region);
      else if (user?.rol === 'coordinador_regional') query = query.eq('region', user.region);

      const { data, error: err } = await query.limit(50);
      if (err) throw err;
      setProyectos(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user, filtroFase, filtroPrioridad]);

  const crearProyecto = useCallback(async (proyecto) => {
    setLoading(true);
    try {
      const payload = {
        ...proyecto,
        creado_por: user?.id,
        nombre_creador: user?.nombre_completo || user?.email,
        region: user?.region || proyecto.region
      };
      const { data, error: err } = await supabase
        .from('proyectos_sara')
        .insert([payload])
        .select()
        .single();
      if (err) throw err;
      await fetchProyectos();
      return data;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, fetchProyectos]);

  const actualizarProyecto = useCallback(async (id, cambios) => {
    try {
      const { error: err } = await supabase
        .from('proyectos_sara')
        .update(cambios)
        .eq('id', id);
      if (err) throw err;
      await fetchProyectos();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }, [fetchProyectos]);

  const avanzarFase = useCallback(async (proyecto) => {
    const orden = ['scanning', 'analysis', 'response', 'assessment', 'cerrado'];
    const idx = orden.indexOf(proyecto.fase_actual);
    if (idx < 0 || idx >= orden.length - 1) return false;

    const faseActual = proyecto.fase_actual;
    const siguienteFase = orden[idx + 1];

    const cambios = {
      fase_actual: siguienteFase,
      [`${faseActual}_completado`]: true,
      [`${faseActual}_fecha_completado`]: new Date().toISOString()
    };

    return actualizarProyecto(proyecto.id, cambios);
  }, [actualizarProyecto]);

  useEffect(() => {
    if (user) fetchProyectos();
  }, [user, fetchProyectos]);

  const FASES = [
    { key: 'scanning', label: 'Scanning', color: '#3b82f6', icon: '🔍', desc: 'Identificar el problema' },
    { key: 'analysis', label: 'Analysis', color: '#8b5cf6', icon: '📊', desc: 'Analizar causas raíz' },
    { key: 'response', label: 'Response', color: '#f59e0b', icon: '⚡', desc: 'Implementar respuesta' },
    { key: 'assessment', label: 'Assessment', color: '#10b981', icon: '✅', desc: 'Evaluar resultados' },
    { key: 'cerrado', label: 'Cerrado', color: '#6b7280', icon: '📁', desc: 'Proyecto finalizado' }
  ];

  const getPrioridadColor = (p) => {
    const c = { baja: '#6b7280', media: '#3b82f6', alta: '#f59e0b', critica: '#ef4444' };
    return c[p] || '#6b7280';
  };

  const getFaseInfo = (fase) => FASES.find(f => f.key === fase) || FASES[0];

  const getProgreso = (proyecto) => {
    let completadas = 0;
    if (proyecto.scanning_completado) completadas++;
    if (proyecto.analysis_completado) completadas++;
    if (proyecto.response_completado) completadas++;
    if (proyecto.assessment_completado) completadas++;
    return Math.round((completadas / 4) * 100);
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  return {
    proyectos, loading, error, setError,
    filtroFase, setFiltroFase, filtroPrioridad, setFiltroPrioridad,
    fetchProyectos, crearProyecto, actualizarProyecto, avanzarFase,
    FASES, getPrioridadColor, getFaseInfo, getProgreso, formatFecha
  };
}
