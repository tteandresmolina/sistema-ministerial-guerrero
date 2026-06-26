// src/hooks/useEscenasCrimen.js
// Hook para operaciones CRUD de Escena del Crimen
// Sistema Ministerial — FGE Guerrero — Módulo 2 Tab 3

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useEscenasCrimen(perfil) {
  const [escenas, setEscenas] = useState([]);
  const [reportes911, setReportes911] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    activas: 0,
    procesadas: 0,
    feminicidio: 0,
    alto_impacto: 0,
  });

  const fetchReportes911 = useCallback(async () => {
    if (!perfil) return;
    try {
      const { data } = await supabase
        .from('registros_911')
        .select('id, folio_911, fecha_reporte, incidencia_tipo, ubicacion_texto, catalogo_incidencias(nombre)')
        .order('creado_en', { ascending: false })
        .limit(50);
      setReportes911(data || []);
    } catch (err) {
      console.error('Error cargando reportes 911:', err);
    }
  }, [perfil]);

  const fetchEscenas = useCallback(async () => {
    if (!perfil) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('escenas_crimen')
        .select('*, registros_911(folio_911, fecha_reporte, incidencia_tipo, ubicacion_texto, catalogo_incidencias(nombre))')
        .order('creado_en', { ascending: false })
        .limit(100);

      if (err) throw err;
      const lista = data || [];
      setEscenas(lista);

      setStats({
        total: lista.length,
        activas: lista.filter(e => e.estatus_ministerial === 'en_investigacion' || e.estatus_ministerial === 'en_procesamiento').length,
        procesadas: lista.filter(e => e.estatus_ministerial === 'procesada').length,
        feminicidio: lista.filter(e => e.es_feminicidio).length,
        alto_impacto: lista.filter(e => e.es_feminicidio || e.es_violencia_genero || e.involucra_adolescente).length,
      });
    } catch (err) {
      console.error('Error cargando escenas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [perfil]);

  const crearEscena = async (formData) => {
    if (!perfil) return { success: false, error: 'Sin perfil' };
    try {
      const registro = {
        ...formData,
        region: perfil.region,
        zona: perfil.zona,
        creado_por: perfil.id,
      };
      const { data, error: err } = await supabase
        .from('escenas_crimen')
        .insert([registro])
        .select()
        .single();
      if (err) throw err;
      await fetchEscenas();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const actualizarEscena = async (id, campos) => {
    try {
      const { error: err } = await supabase
        .from('escenas_crimen')
        .update(campos)
        .eq('id', id);
      if (err) throw err;
      await fetchEscenas();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  useEffect(() => { fetchReportes911(); }, [fetchReportes911]);
  useEffect(() => { fetchEscenas(); }, [fetchEscenas]);

  return {
    escenas, reportes911, loading, error, stats,
    crearEscena, actualizarEscena, refetch: fetchEscenas,
  };
}
