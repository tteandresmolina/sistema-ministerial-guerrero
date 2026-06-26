// src/hooks/useVictimasTestigos.js
// Hook para Víctimas y Testigos
// Sistema Ministerial — FGE Guerrero — Módulo 2 Tab 5

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useVictimasTestigos(perfil) {
  const [victimas, setVictimas] = useState([]);
  const [testigos, setTestigos] = useState([]);
  const [escenas, setEscenas] = useState([]);
  const [reportes911, setReportes911] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalVictimas: 0, totalTestigos: 0, menores: 0, conLesiones: 0, conProteccion: 0,
  });

  const fetchEscenas = useCallback(async () => {
    if (!perfil) return;
    const { data } = await supabase.from('escenas_crimen')
      .select('id, tipo_escena, ubicacion_texto, carpeta_investigacion, registros_911(folio_911)')
      .order('creado_en', { ascending: false }).limit(50);
    setEscenas(data || []);
  }, [perfil]);

  const fetchReportes911 = useCallback(async () => {
    if (!perfil) return;
    const { data } = await supabase.from('registros_911')
      .select('id, folio_911, fecha_reporte, incidencia_tipo, ubicacion_texto, catalogo_incidencias(nombre)')
      .order('creado_en', { ascending: false }).limit(50);
    setReportes911(data || []);
  }, [perfil]);

  const fetchVictimas = useCallback(async () => {
    if (!perfil) return;
    const { data } = await supabase.from('victimas_caso')
      .select('*, escenas_crimen(ubicacion_texto, registros_911(folio_911))')
      .order('creado_en', { ascending: false }).limit(100);
    setVictimas(data || []);
    return data || [];
  }, [perfil]);

  const fetchTestigos = useCallback(async () => {
    if (!perfil) return;
    const { data } = await supabase.from('testigos_caso')
      .select('*, escenas_crimen(ubicacion_texto, registros_911(folio_911))')
      .order('creado_en', { ascending: false }).limit(100);
    setTestigos(data || []);
    return data || [];
  }, [perfil]);

  const fetchAll = useCallback(async () => {
    if (!perfil) return;
    setLoading(true); setError(null);
    try {
      const [v, t] = await Promise.all([fetchVictimas(), fetchTestigos()]);
      setStats({
        totalVictimas: (v || []).length,
        totalTestigos: (t || []).length,
        menores: (v || []).filter(x => x.es_menor_edad).length,
        conLesiones: (v || []).filter(x => x.tiene_lesiones).length,
        conProteccion: (v || []).filter(x => x.canalizada_ceav || x.canalizada_refugio).length,
      });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [perfil, fetchVictimas, fetchTestigos]);

  const crearVictima = async (formData) => {
    if (!perfil) return { success: false, error: 'Sin perfil' };
    try {
      const { data, error: err } = await supabase.from('victimas_caso')
        .insert([{ ...formData, region: perfil.region, zona: perfil.zona, registrado_por: perfil.nombre_completo, registrado_por_id: perfil.id }])
        .select().single();
      if (err) throw err;
      await fetchAll();
      return { success: true, data };
    } catch (err) { return { success: false, error: err.message }; }
  };

  const crearTestigo = async (formData) => {
    if (!perfil) return { success: false, error: 'Sin perfil' };
    try {
      const { data, error: err } = await supabase.from('testigos_caso')
        .insert([{ ...formData, region: perfil.region, zona: perfil.zona, registrado_por: perfil.nombre_completo, registrado_por_id: perfil.id }])
        .select().single();
      if (err) throw err;
      await fetchAll();
      return { success: true, data };
    } catch (err) { return { success: false, error: err.message }; }
  };

  const agregarMedida = async (victimaId, medidaData) => {
    try {
      const { error: err } = await supabase.from('medidas_proteccion')
        .insert([{ victima_id: victimaId, ...medidaData, registrado_por: perfil?.nombre_completo, registrado_por_id: perfil?.id }]);
      if (err) throw err;
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  };

  const fetchMedidas = async (victimaId) => {
    const { data } = await supabase.from('medidas_proteccion')
      .select('*').eq('victima_id', victimaId).order('creado_en', { ascending: false });
    return data || [];
  };

  useEffect(() => { fetchEscenas(); fetchReportes911(); }, [fetchEscenas, fetchReportes911]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  return {
    victimas, testigos, escenas, reportes911, loading, error, stats,
    crearVictima, crearTestigo, agregarMedida, fetchMedidas, refetch: fetchAll,
  };
}
