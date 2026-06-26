// src/hooks/usePrimerRespondiente.js
// Hook para operaciones CRUD de Primer Respondiente (IPH Digital)
// Sistema Ministerial — FGE Guerrero — Módulo 2 Tab 2

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function usePrimerRespondiente(perfil) {
  const [registros, setRegistros] = useState([]);
  const [reportes911, setReportes911] = useState([]);
  const [catalogoIncidencias, setCatalogoIncidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    con_detenidos: 0,
    con_uso_fuerza: 0,
    hora_dorada_verde: 0,
    hora_dorada_amarillo: 0,
    hora_dorada_rojo: 0,
  });

  // Calcular semáforo de hora dorada
  const calcularHoraDorada = (horaConocimiento) => {
    if (!horaConocimiento) return { color: 'gris', label: 'Sin dato', horas: null };
    const ahora = Date.now();
    const inicio = new Date(horaConocimiento).getTime();
    const horasTranscurridas = (ahora - inicio) / (1000 * 60 * 60);

    if (horasTranscurridas < 0) return { color: 'gris', label: 'Fecha futura', horas: 0 };
    if (horasTranscurridas <= 12) return { color: 'verde', label: 'Hora Dorada', horas: horasTranscurridas };
    if (horasTranscurridas <= 36) return { color: 'amarillo', label: 'Urgencia creciente', horas: horasTranscurridas };
    return { color: 'rojo', label: 'Plazo crítico', horas: horasTranscurridas };
  };

  // Cargar catálogo
  const fetchCatalogo = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('catalogo_incidencias')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true });
      setCatalogoIncidencias(data || []);
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    }
  }, []);

  // Cargar reportes 911 disponibles (para vincular)
  const fetchReportes911 = useCallback(async () => {
    if (!perfil) return;
    try {
      const { data } = await supabase
        .from('registros_911')
        .select('id, folio_911, fecha_reporte, hora_reporte, fuente, incidencia_tipo, ubicacion_texto, estatus, catalogo_incidencias(nombre)')
        .in('estatus', ['recibido', 'verificado', 'en_atencion'])
        .order('creado_en', { ascending: false })
        .limit(50);
      setReportes911(data || []);
    } catch (err) {
      console.error('Error cargando reportes 911:', err);
    }
  }, [perfil]);

  // Cargar registros de primer respondiente
  const fetchRegistros = useCallback(async () => {
    if (!perfil) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('primer_respondiente')
        .select('*, registros_911(folio_911, fecha_reporte, hora_reporte, incidencia_tipo, ubicacion_texto, catalogo_incidencias(nombre))')
        .order('creado_en', { ascending: false })
        .limit(100);

      if (err) throw err;

      const lista = data || [];
      setRegistros(lista);

      // Stats
      let verde = 0, amarillo = 0, rojo = 0;
      lista.forEach(r => {
        const hd = calcularHoraDorada(r.hora_conocimiento_hecho);
        if (hd.color === 'verde') verde++;
        else if (hd.color === 'amarillo') amarillo++;
        else if (hd.color === 'rojo') rojo++;
      });

      setStats({
        total: lista.length,
        con_detenidos: lista.filter(r => r.personas_detenidas).length,
        con_uso_fuerza: lista.filter(r => r.uso_fuerza).length,
        hora_dorada_verde: verde,
        hora_dorada_amarillo: amarillo,
        hora_dorada_rojo: rojo,
      });
    } catch (err) {
      console.error('Error cargando registros:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [perfil]);

  // Crear nuevo registro
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
        .from('primer_respondiente')
        .insert([registro])
        .select()
        .single();

      if (err) throw err;
      await fetchRegistros();
      return { success: true, data };
    } catch (err) {
      console.error('Error creando registro:', err);
      return { success: false, error: err.message };
    }
  };

  // Actualizar registro existente
  const actualizarRegistro = async (id, campos) => {
    try {
      const { error: err } = await supabase
        .from('primer_respondiente')
        .update(campos)
        .eq('id', id);

      if (err) throw err;
      await fetchRegistros();
      return { success: true };
    } catch (err) {
      console.error('Error actualizando:', err);
      return { success: false, error: err.message };
    }
  };

  useEffect(() => { fetchCatalogo(); }, [fetchCatalogo]);
  useEffect(() => { fetchReportes911(); }, [fetchReportes911]);
  useEffect(() => { fetchRegistros(); }, [fetchRegistros]);

  return {
    registros,
    reportes911,
    catalogoIncidencias,
    loading,
    error,
    stats,
    calcularHoraDorada,
    crearRegistro,
    actualizarRegistro,
    refetch: fetchRegistros,
  };
}
