// src/hooks/useIndiciosEvidencia.js
// Hook para Indicios/Evidencia y Cadena de Custodia
// Sistema Ministerial — FGE Guerrero — Módulo 2 Tab 4

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useIndiciosEvidencia(perfil) {
  const [indicios, setIndicios] = useState([]);
  const [escenas, setEscenas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0, recolectados: 0, en_laboratorio: 0, en_bodega: 0, concluidos: 0,
  });

  const fetchEscenas = useCallback(async () => {
    if (!perfil) return;
    const { data } = await supabase
      .from('escenas_crimen')
      .select('id, tipo_escena, ubicacion_texto, municipio, carpeta_investigacion, registros_911(folio_911)')
      .order('creado_en', { ascending: false }).limit(50);
    setEscenas(data || []);
  }, [perfil]);

  const fetchIndicios = useCallback(async () => {
    if (!perfil) return;
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase
        .from('indicios_evidencia')
        .select('*, escenas_crimen(tipo_escena, ubicacion_texto, registros_911(folio_911))')
        .order('creado_en', { ascending: false }).limit(100);
      if (err) throw err;
      const lista = data || [];
      setIndicios(lista);
      setStats({
        total: lista.length,
        recolectados: lista.filter(i => i.estatus === 'recolectado' || i.estatus === 'embalado').length,
        en_laboratorio: lista.filter(i => i.estatus === 'en_laboratorio').length,
        en_bodega: lista.filter(i => i.estatus === 'en_bodega').length,
        concluidos: lista.filter(i => i.estatus === 'concluido' || i.estatus === 'devuelto' || i.estatus === 'destruido').length,
      });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [perfil]);

  const crearIndicio = async (formData) => {
    if (!perfil) return { success: false, error: 'Sin perfil' };
    try {
      const { data, error: err } = await supabase
        .from('indicios_evidencia')
        .insert([{ ...formData, region: perfil.region, zona: perfil.zona, creado_por: perfil.id }])
        .select().single();
      if (err) throw err;
      await fetchIndicios();
      return { success: true, data };
    } catch (err) { return { success: false, error: err.message }; }
  };

  const actualizarEstatus = async (id, estatus) => {
    const { error: err } = await supabase.from('indicios_evidencia').update({ estatus }).eq('id', id);
    if (err) return { success: false, error: err.message };
    await fetchIndicios();
    return { success: true };
  };

  // Cadena de custodia
  const fetchMovimientos = async (indicioId) => {
    const { data } = await supabase
      .from('cadena_custodia_movimientos')
      .select('*').eq('indicio_id', indicioId)
      .order('numero_movimiento', { ascending: true });
    return data || [];
  };

  const agregarMovimiento = async (indicioId, movData) => {
    // Get next movement number
    const { data: prev } = await supabase
      .from('cadena_custodia_movimientos')
      .select('numero_movimiento').eq('indicio_id', indicioId)
      .order('numero_movimiento', { ascending: false }).limit(1);
    const nextNum = (prev && prev.length > 0) ? prev[0].numero_movimiento + 1 : 1;

    const { error: err } = await supabase
      .from('cadena_custodia_movimientos')
      .insert([{
        indicio_id: indicioId,
        numero_movimiento: nextNum,
        ...movData,
        registrado_por: perfil?.nombre_completo || '',
        registrado_por_id: perfil?.id || null,
      }]);
    if (err) return { success: false, error: err.message };
    return { success: true };
  };

  useEffect(() => { fetchEscenas(); }, [fetchEscenas]);
  useEffect(() => { fetchIndicios(); }, [fetchIndicios]);

  return {
    indicios, escenas, loading, error, stats,
    crearIndicio, actualizarEstatus, fetchMovimientos, agregarMovimiento,
    refetch: fetchIndicios,
  };
}
