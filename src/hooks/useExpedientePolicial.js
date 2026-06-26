// src/hooks/useExpedientePolicial.js
// Hook para Tab 6 — Expediente de Investigación Policial Digital
// Manages: oficios_investigacion, personas_investigadas, acciones_investigacion,
//          reasignaciones_caso, archivos_expediente, vista_expediente_completo

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useExpedientePolicial(user) {
  // === STATE ===
  const [oficios, setOficios] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [acciones, setAcciones] = useState([]);
  const [reasignaciones, setReasignaciones] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [metricas, setMetricas] = useState(null);
  const [oficiosVencidos, setOficiosVencidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // === FILTERS ===
  const [filtroCarpeta, setFiltroCarpeta] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState('todos');

  // === FETCH OFICIOS ===
  const fetchOficios = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('oficios_investigacion')
        .select('*')
        .order('created_at', { ascending: false });

      if (filtroCarpeta.trim()) {
        query = query.ilike('carpeta_investigacion', `%${filtroCarpeta.trim()}%`);
      }
      if (filtroEstatus !== 'todos') {
        query = query.eq('estatus', filtroEstatus);
      }
      if (filtroPrioridad !== 'todos') {
        query = query.eq('prioridad', filtroPrioridad);
      }

      // Role-based filtering
      if (user?.rol === 'agente') {
        query = query.eq('agente_asignado', user.id);
      } else if (user?.rol === 'coordinador_zona') {
        query = query.eq('zona', user.zona);
      } else if (user?.rol === 'coordinador_regional') {
        query = query.eq('region', user.region);
      }

      const { data, error: err } = await query.limit(100);
      if (err) throw err;
      setOficios(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user, filtroCarpeta, filtroEstatus, filtroPrioridad]);

  // === FETCH PERSONAS BY CARPETA ===
  const fetchPersonasByCarpeta = useCallback(async (carpeta) => {
    try {
      const { data, error: err } = await supabase
        .from('personas_investigadas')
        .select('*')
        .eq('carpeta_investigacion', carpeta)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setPersonas(data || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // === FETCH ACCIONES BY CARPETA ===
  const fetchAccionesByCarpeta = useCallback(async (carpeta) => {
    try {
      const { data, error: err } = await supabase
        .from('acciones_investigacion')
        .select('*')
        .eq('carpeta_investigacion', carpeta)
        .order('fecha_hora_inicio', { ascending: true });
      if (err) throw err;
      setAcciones(data || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // === FETCH REASIGNACIONES BY CARPETA ===
  const fetchReasignacionesByCarpeta = useCallback(async (carpeta) => {
    try {
      const { data, error: err } = await supabase
        .from('reasignaciones_caso')
        .select('*')
        .eq('carpeta_investigacion', carpeta)
        .order('fecha_reasignacion', { ascending: false });
      if (err) throw err;
      setReasignaciones(data || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // === FETCH ARCHIVOS BY CARPETA ===
  const fetchArchivosByCarpeta = useCallback(async (carpeta) => {
    try {
      const { data, error: err } = await supabase
        .from('archivos_expediente')
        .select('*')
        .eq('carpeta_investigacion', carpeta)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setArchivos(data || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // === FETCH TIMELINE (Vista unificada) ===
  const fetchTimeline = useCallback(async (carpeta) => {
    try {
      const { data, error: err } = await supabase
        .from('vista_expediente_completo')
        .select('*')
        .eq('carpeta_investigacion', carpeta)
        .order('fecha_evento', { ascending: true });
      if (err) throw err;
      setTimeline(data || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // === FETCH ALL DATA FOR A CARPETA ===
  const fetchExpedienteCompleto = useCallback(async (carpeta) => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPersonasByCarpeta(carpeta),
        fetchAccionesByCarpeta(carpeta),
        fetchReasignacionesByCarpeta(carpeta),
        fetchArchivosByCarpeta(carpeta),
        fetchTimeline(carpeta)
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchPersonasByCarpeta, fetchAccionesByCarpeta, fetchReasignacionesByCarpeta, fetchArchivosByCarpeta, fetchTimeline]);

  // === FETCH MÉTRICAS ===
  const fetchMetricas = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('vista_metricas_expediente')
        .select('*')
        .single();
      if (err) throw err;
      setMetricas(data);
    } catch (e) {
      console.error('Error fetching métricas:', e.message);
    }
  }, []);

  // === FETCH OFICIOS VENCIDOS ===
  const fetchOficiosVencidos = useCallback(async () => {
    try {
      let query = supabase
        .from('vista_oficios_vencidos')
        .select('*')
        .limit(20);

      if (user?.rol === 'coordinador_zona') {
        query = query.eq('zona', user.zona);
      } else if (user?.rol === 'coordinador_regional') {
        query = query.eq('region', user.region);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setOficiosVencidos(data || []);
    } catch (e) {
      console.error('Error fetching vencidos:', e.message);
    }
  }, [user]);

  // === CREATE OFICIO ===
  const crearOficio = useCallback(async (oficio) => {
    setLoading(true);
    try {
      const payload = {
        ...oficio,
        created_by: user?.id,
        region: user?.region || oficio.region,
        zona: user?.zona || oficio.zona
      };
      const { data, error: err } = await supabase
        .from('oficios_investigacion')
        .insert([payload])
        .select()
        .single();
      if (err) throw err;
      await fetchOficios();
      return data;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, fetchOficios]);

  // === UPDATE OFICIO ===
  const actualizarOficio = useCallback(async (id, cambios) => {
    try {
      const { error: err } = await supabase
        .from('oficios_investigacion')
        .update({ ...cambios, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (err) throw err;
      await fetchOficios();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }, [fetchOficios]);

  // === ASIGNAR OFICIO A AGENTE ===
  const asignarOficio = useCallback(async (oficioId, agenteId, nombreAgente) => {
    return actualizarOficio(oficioId, {
      agente_asignado: agenteId,
      nombre_agente_asignado: nombreAgente,
      fecha_asignacion: new Date().toISOString(),
      asignado_por: user?.id,
      nombre_mando_asigna: user?.nombre_completo || user?.email,
      estatus: 'asignado'
    });
  }, [user, actualizarOficio]);

  // === CREATE PERSONA INVESTIGADA ===
  const crearPersona = useCallback(async (persona) => {
    setLoading(true);
    try {
      const payload = {
        ...persona,
        agente_registro: user?.id,
        nombre_agente_registro: user?.nombre_completo || user?.email,
        region: user?.region || persona.region,
        zona: user?.zona || persona.zona
      };
      const { data, error: err } = await supabase
        .from('personas_investigadas')
        .insert([payload])
        .select()
        .single();
      if (err) throw err;
      if (persona.carpeta_investigacion) {
        await fetchPersonasByCarpeta(persona.carpeta_investigacion);
      }
      return data;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, fetchPersonasByCarpeta]);

  // === UPDATE PERSONA ===
  const actualizarPersona = useCallback(async (id, cambios, carpeta) => {
    try {
      const { error: err } = await supabase
        .from('personas_investigadas')
        .update({ ...cambios, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (err) throw err;
      if (carpeta) await fetchPersonasByCarpeta(carpeta);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }, [fetchPersonasByCarpeta]);

  // === CREATE ACCIÓN DE INVESTIGACIÓN ===
  const crearAccion = useCallback(async (accion) => {
    setLoading(true);
    try {
      const payload = {
        ...accion,
        agente_responsable: user?.id,
        nombre_agente: user?.nombre_completo || user?.email,
        region: user?.region || accion.region,
        zona: user?.zona || accion.zona
      };
      const { data, error: err } = await supabase
        .from('acciones_investigacion')
        .insert([payload])
        .select()
        .single();
      if (err) throw err;
      if (accion.carpeta_investigacion) {
        await fetchAccionesByCarpeta(accion.carpeta_investigacion);
      }
      return data;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, fetchAccionesByCarpeta]);

  // === CREATE REASIGNACIÓN ===
  const crearReasignacion = useCallback(async (reasignacion) => {
    setLoading(true);
    try {
      const payload = {
        ...reasignacion,
        autorizado_por: user?.id,
        nombre_autoriza: user?.nombre_completo || user?.email,
        cargo_autoriza: user?.rol,
        region: user?.region,
        zona: user?.zona
      };
      const { data, error: err } = await supabase
        .from('reasignaciones_caso')
        .insert([payload])
        .select()
        .single();
      if (err) throw err;
      return data;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, fetchOficios]);

  // === INITIAL LOAD ===
  useEffect(() => {
    if (user) {
      fetchOficios();
      fetchMetricas();
      fetchOficiosVencidos();
    }
  }, [user, fetchOficios, fetchMetricas, fetchOficiosVencidos]);

  // === HELPERS ===
  const getPrioridadColor = (prioridad) => {
    const colores = {
      'normal': '#6b7280',
      'urgente': '#f59e0b',
      'extraurgente': '#ef4444',
      'con_termino': '#3b82f6',
      'con_multa': '#dc2626'
    };
    return colores[prioridad] || '#6b7280';
  };

  const getEstatusColor = (estatus) => {
    const colores = {
      'recibido': '#6b7280',
      'asignado': '#3b82f6',
      'en_investigacion': '#f59e0b',
      'cumplimentado': '#10b981',
      'parcial': '#8b5cf6',
      'vencido': '#ef4444',
      'con_recordatorio': '#dc2626',
      'reasignado': '#6366f1'
    };
    return colores[estatus] || '#6b7280';
  };

  const getEstatusPersonaColor = (estatus) => {
    const colores = {
      'sospechoso': '#f59e0b',
      'identificado': '#3b82f6',
      'localizado': '#8b5cf6',
      'detenido': '#10b981',
      'profugo': '#ef4444',
      'descartado': '#6b7280',
      'fallecido': '#1f2937'
    };
    return colores[estatus] || '#6b7280';
  };

  const getTipoEventoIcon = (tipo) => {
    const iconos = {
      'oficio_mp': '📋',
      'accion_investigacion': '🔍',
      'persona_investigada': '👤',
      'reasignacion': '🔄',
      'reporte_911': '📞'
    };
    return iconos[tipo] || '📌';
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const calcularHorasRestantes = (fechaVencimiento) => {
    if (!fechaVencimiento) return null;
    const ahora = new Date();
    const vence = new Date(fechaVencimiento);
    const diff = (vence - ahora) / (1000 * 60 * 60);
    return Math.round(diff * 10) / 10;
  };

  return {
    // Data
    oficios, personas, acciones, reasignaciones, archivos, timeline,
    metricas, oficiosVencidos,
    // State
    loading, error, setError,
    // Filters
    filtroCarpeta, setFiltroCarpeta,
    filtroEstatus, setFiltroEstatus,
    filtroPrioridad, setFiltroPrioridad,
    // Fetchers
    fetchOficios, fetchExpedienteCompleto, fetchMetricas, fetchOficiosVencidos,
    fetchPersonasByCarpeta, fetchAccionesByCarpeta,
    // Mutations
    crearOficio, actualizarOficio, asignarOficio,
    crearPersona, actualizarPersona,
    crearAccion, crearReasignacion,
    // Helpers
    getPrioridadColor, getEstatusColor, getEstatusPersonaColor,
    getTipoEventoIcon, formatFecha, calcularHorasRestantes
  };
}
