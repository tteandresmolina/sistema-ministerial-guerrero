// src/hooks/useRegistros911.js
// Hook para operaciones CRUD de Registros 911
// Sistema Ministerial — FGE Guerrero — Módulo 2

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useRegistros911(perfil) {
  const [registros, setRegistros] = useState([]);
  const [catalogoIncidencias, setCatalogoIncidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    recibidos: 0,
    verificados: 0,
    en_atencion: 0,
    hoy: 0,
  });

  // Cargar catálogo de incidencias
  const fetchCatalogo = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('catalogo_incidencias')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (err) throw err;
      setCatalogoIncidencias(data || []);
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    }
  }, []);

  // Cargar registros 911
  const fetchRegistros = useCallback(async () => {
    if (!perfil) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('registros_911')
        .select('*, catalogo_incidencias(nombre, categoria)')
        .order('creado_en', { ascending: false })
        .limit(100);

      if (err) throw err;

      const registrosData = data || [];
      setRegistros(registrosData);

      // Calcular stats
      const hoy = new Date().toISOString().split('T')[0];
      setStats({
        total: registrosData.length,
        recibidos: registrosData.filter(r => r.estatus === 'recibido').length,
        verificados: registrosData.filter(r => r.estatus === 'verificado').length,
        en_atencion: registrosData.filter(r => r.estatus === 'en_atencion').length,
        hoy: registrosData.filter(r => r.fecha_reporte === hoy).length,
      });
    } catch (err) {
      console.error('Error cargando registros:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [perfil]);

  // Crear nuevo registro 911
  const crearRegistro = async (formData) => {
    if (!perfil) return { success: false, error: 'Sin perfil de usuario' };

    try {
      const registro = {
        ...formData,
        region: perfil.region,
        zona: perfil.zona,
        creado_por: perfil.id,
      };

      const { data, error: err } = await supabase
        .from('registros_911')
        .insert([registro])
        .select()
        .single();

      if (err) throw err;

      // Recargar lista
      await fetchRegistros();
      return { success: true, data };
    } catch (err) {
      console.error('Error creando registro:', err);
      return { success: false, error: err.message };
    }
  };

  // Actualizar estatus de un registro
  const actualizarEstatus = async (id, nuevoEstatus) => {
    try {
      const { error: err } = await supabase
        .from('registros_911')
        .update({ estatus: nuevoEstatus })
        .eq('id', id);

      if (err) throw err;

      await fetchRegistros();
      return { success: true };
    } catch (err) {
      console.error('Error actualizando estatus:', err);
      return { success: false, error: err.message };
    }
  };

  // Cargar al montar
  useEffect(() => {
    fetchCatalogo();
  }, [fetchCatalogo]);

  useEffect(() => {
    fetchRegistros();
  }, [fetchRegistros]);

  return {
    registros,
    catalogoIncidencias,
    loading,
    error,
    stats,
    crearRegistro,
    actualizarEstatus,
    refetch: fetchRegistros,
  };
}
