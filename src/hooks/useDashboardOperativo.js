// src/hooks/useDashboardOperativo.js
// Hook para Tab 7 — Dashboard Operativo (Métricas SESNSP)
// Agrega métricas cross-module para mandos: Director, Regional, Zona

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useDashboardOperativo(user) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // === PERÍODO ===
  const [periodo, setPeriodo] = useState('mes_actual'); // mes_actual, mes_anterior, trimestre, anio, custom
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // === DATOS AGREGADOS ===
  const [metricasOficios, setMetricasOficios] = useState({
    total: 0, recibidos: 0, asignados: 0, en_investigacion: 0,
    cumplimentados: 0, vencidos: 0, parciales: 0, reasignados: 0
  });
  const [metricasPersonas, setMetricasPersonas] = useState({
    total: 0, sospechosos: 0, identificados: 0, localizados: 0,
    detenidos: 0, profugos: 0, descartados: 0
  });
  const [metricasAcciones, setMetricasAcciones] = useState({
    total: 0, por_tipo: [], por_agente: []
  });
  const [metricas911, setMetricas911] = useState({
    total: 0, atendidos: 0, pendientes: 0, falsa_alarma: 0
  });
  const [metricasDetenidos, setMetricasDetenidos] = useState({
    total: 0, en_proceso: 0, puestos_disposicion: 0
  });
  const [oficiosVencidos, setOficiosVencidos] = useState([]);
  const [cargaAgentes, setCargaAgentes] = useState([]);
  const [oficiosPorPrioridad, setOficiosPorPrioridad] = useState([]);
  const [accionesPorDia, setAccionesPorDia] = useState([]);
  const [delitosFrecuentes, setDelitosFrecuentes] = useState([]);

  // === CALCULAR RANGO DE FECHAS ===
  const getRangoFechas = useCallback(() => {
    const ahora = new Date();
    let inicio, fin;

    switch (periodo) {
      case 'mes_actual':
        inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        fin = ahora;
        break;
      case 'mes_anterior':
        inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
        fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
        break;
      case 'trimestre':
        inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 2, 1);
        fin = ahora;
        break;
      case 'anio':
        inicio = new Date(ahora.getFullYear(), 0, 1);
        fin = ahora;
        break;
      case 'custom':
        inicio = fechaInicio ? new Date(fechaInicio) : new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        fin = fechaFin ? new Date(fechaFin + 'T23:59:59') : ahora;
        break;
      default:
        inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        fin = ahora;
    }
    return { inicio: inicio.toISOString(), fin: fin.toISOString() };
  }, [periodo, fechaInicio, fechaFin]);

  // === APLICAR FILTRO DE ROL ===
  const aplicarFiltroRol = useCallback((query) => {
    if (user?.rol === 'agente') {
      return query.eq('agente_asignado', user.id);
    } else if (user?.rol === 'coordinador_zona') {
      return query.eq('zona', user.zona);
    } else if (user?.rol === 'coordinador_regional') {
      return query.eq('region', user.region);
    }
    return query; // director ve todo
  }, [user]);

  const aplicarFiltroRolGenerico = useCallback((query, campoRegion = 'region', campoZona = 'zona') => {
    if (user?.rol === 'coordinador_zona') {
      return query.eq(campoZona, user.zona);
    } else if (user?.rol === 'coordinador_regional') {
      return query.eq(campoRegion, user.region);
    }
    return query;
  }, [user]);

  // === FETCH MÉTRICAS DE OFICIOS ===
  const fetchMetricasOficios = useCallback(async () => {
    const { inicio, fin } = getRangoFechas();
    try {
      let query = supabase
        .from('oficios_investigacion')
        .select('estatus, prioridad, delito')
        .gte('created_at', inicio)
        .lte('created_at', fin);
      query = aplicarFiltroRol(query);

      const { data, error: err } = await query;
      if (err) throw err;

      const rows = data || [];
      setMetricasOficios({
        total: rows.length,
        recibidos: rows.filter(r => r.estatus === 'recibido').length,
        asignados: rows.filter(r => r.estatus === 'asignado').length,
        en_investigacion: rows.filter(r => r.estatus === 'en_investigacion').length,
        cumplimentados: rows.filter(r => r.estatus === 'cumplimentado').length,
        vencidos: rows.filter(r => r.estatus === 'vencido').length,
        parciales: rows.filter(r => r.estatus === 'parcial').length,
        reasignados: rows.filter(r => r.estatus === 'reasignado').length
      });

      // Prioridad breakdown
      const prioridadMap = {};
      rows.forEach(r => {
        prioridadMap[r.prioridad] = (prioridadMap[r.prioridad] || 0) + 1;
      });
      setOficiosPorPrioridad(Object.entries(prioridadMap).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })));

      // Delitos frecuentes
      const delitoMap = {};
      rows.forEach(r => {
        if (r.delito) {
          const d = r.delito.substring(0, 40);
          delitoMap[d] = (delitoMap[d] || 0) + 1;
        }
      });
      const delitosArr = Object.entries(delitoMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
      setDelitosFrecuentes(delitosArr);
    } catch (e) {
      setError(e.message);
    }
  }, [getRangoFechas, aplicarFiltroRol]);

  // === FETCH MÉTRICAS DE PERSONAS ===
  const fetchMetricasPersonas = useCallback(async () => {
    const { inicio, fin } = getRangoFechas();
    try {
      let query = supabase
        .from('personas_investigadas')
        .select('estatus')
        .gte('created_at', inicio)
        .lte('created_at', fin);
      query = aplicarFiltroRolGenerico(query);

      const { data, error: err } = await query;
      if (err) throw err;

      const rows = data || [];
      setMetricasPersonas({
        total: rows.length,
        sospechosos: rows.filter(r => r.estatus === 'sospechoso').length,
        identificados: rows.filter(r => r.estatus === 'identificado').length,
        localizados: rows.filter(r => r.estatus === 'localizado').length,
        detenidos: rows.filter(r => r.estatus === 'detenido').length,
        profugos: rows.filter(r => r.estatus === 'profugo').length,
        descartados: rows.filter(r => r.estatus === 'descartado').length
      });
    } catch (e) {
      setError(e.message);
    }
  }, [getRangoFechas, aplicarFiltroRolGenerico]);

  // === FETCH MÉTRICAS DE ACCIONES ===
  const fetchMetricasAcciones = useCallback(async () => {
    const { inicio, fin } = getRangoFechas();
    try {
      let query = supabase
        .from('acciones_investigacion')
        .select('tipo_accion, nombre_agente, fecha_hora_inicio')
        .gte('created_at', inicio)
        .lte('created_at', fin);
      query = aplicarFiltroRolGenerico(query);

      const { data, error: err } = await query;
      if (err) throw err;

      const rows = data || [];

      // Por tipo
      const tipoMap = {};
      rows.forEach(r => {
        const t = (r.tipo_accion || 'otro').replace(/_/g, ' ');
        tipoMap[t] = (tipoMap[t] || 0) + 1;
      });
      const porTipo = Object.entries(tipoMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // Por agente
      const agenteMap = {};
      rows.forEach(r => {
        const a = r.nombre_agente || 'Sin asignar';
        agenteMap[a] = (agenteMap[a] || 0) + 1;
      });
      const porAgente = Object.entries(agenteMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // Por día (últimos 30 días)
      const diaMap = {};
      rows.forEach(r => {
        if (r.fecha_hora_inicio) {
          const dia = r.fecha_hora_inicio.substring(0, 10);
          diaMap[dia] = (diaMap[dia] || 0) + 1;
        }
      });
      const porDia = Object.entries(diaMap)
        .map(([name, value]) => ({ name: name.substring(5), value }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setMetricasAcciones({ total: rows.length, por_tipo: porTipo, por_agente: porAgente });
      setAccionesPorDia(porDia);
    } catch (e) {
      setError(e.message);
    }
  }, [getRangoFechas, aplicarFiltroRolGenerico]);

  // === FETCH MÉTRICAS 911 ===
  const fetchMetricas911 = useCallback(async () => {
    const { inicio, fin } = getRangoFechas();
    try {
      let query = supabase
        .from('registros_911')
        .select('estatus')
        .gte('created_at', inicio)
        .lte('created_at', fin);
      query = aplicarFiltroRolGenerico(query);

      const { data, error: err } = await query;
      if (err) throw err;

      const rows = data || [];
      setMetricas911({
        total: rows.length,
        atendidos: rows.filter(r => r.estatus === 'atendido' || r.estatus === 'cerrado').length,
        pendientes: rows.filter(r => r.estatus === 'pendiente' || r.estatus === 'en_proceso').length,
        falsa_alarma: rows.filter(r => r.estatus === 'falsa_alarma').length
      });
    } catch (e) {
      console.error('Error 911:', e.message);
    }
  }, [getRangoFechas, aplicarFiltroRolGenerico]);

  // === FETCH MÉTRICAS DETENIDOS ===
  const fetchMetricasDetenidos = useCallback(async () => {
    const { inicio, fin } = getRangoFechas();
    try {
      let query = supabase
        .from('detenidos')
        .select('estatus')
        .gte('created_at', inicio)
        .lte('created_at', fin);

      const { data, error: err } = await query;
      if (err) throw err;

      const rows = data || [];
      setMetricasDetenidos({
        total: rows.length,
        en_proceso: rows.filter(r => r.estatus === 'en_proceso' || r.estatus === 'detenido').length,
        puestos_disposicion: rows.filter(r => r.estatus === 'puesto_disposicion' || r.estatus === 'consignado').length
      });
    } catch (e) {
      console.error('Error detenidos:', e.message);
    }
  }, [getRangoFechas]);

  // === FETCH OFICIOS VENCIDOS ===
  const fetchOficiosVencidos = useCallback(async () => {
    try {
      let query = supabase
        .from('vista_oficios_vencidos')
        .select('*')
        .limit(15);
      if (user?.rol === 'coordinador_zona') query = query.eq('zona', user.zona);
      else if (user?.rol === 'coordinador_regional') query = query.eq('region', user.region);

      const { data, error: err } = await query;
      if (err) throw err;
      setOficiosVencidos(data || []);
    } catch (e) {
      console.error('Error vencidos:', e.message);
    }
  }, [user]);

  // === FETCH CARGA AGENTES ===
  const fetchCargaAgentes = useCallback(async () => {
    try {
      let query = supabase
        .from('vista_carga_agentes')
        .select('*');
      if (user?.rol === 'coordinador_zona') query = query.eq('zona', user.zona);
      else if (user?.rol === 'coordinador_regional') query = query.eq('region', user.region);

      const { data, error: err } = await query;
      if (err) throw err;
      setCargaAgentes(data || []);
    } catch (e) {
      console.error('Error carga:', e.message);
    }
  }, [user]);

  // === FETCH ALL ===
  const fetchTodo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchMetricasOficios(),
        fetchMetricasPersonas(),
        fetchMetricasAcciones(),
        fetchMetricas911(),
        fetchMetricasDetenidos(),
        fetchOficiosVencidos(),
        fetchCargaAgentes()
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchMetricasOficios, fetchMetricasPersonas, fetchMetricasAcciones,
      fetchMetricas911, fetchMetricasDetenidos, fetchOficiosVencidos, fetchCargaAgentes]);

  // === INITIAL LOAD ===
  useEffect(() => {
    if (user) fetchTodo();
  }, [user, periodo, fechaInicio, fechaFin]);

  // === HELPERS ===
  const COLORES_CHART = ['#001a4d', '#b69054', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const tasaCumplimiento = metricasOficios.total > 0
    ? Math.round((metricasOficios.cumplimentados / metricasOficios.total) * 100)
    : 0;

  const tasaVencimiento = metricasOficios.total > 0
    ? Math.round((metricasOficios.vencidos / metricasOficios.total) * 100)
    : 0;

  return {
    loading, error, setError,
    periodo, setPeriodo, fechaInicio, setFechaInicio, fechaFin, setFechaFin,
    metricasOficios, metricasPersonas, metricasAcciones,
    metricas911, metricasDetenidos,
    oficiosVencidos, cargaAgentes,
    oficiosPorPrioridad, accionesPorDia, delitosFrecuentes,
    tasaCumplimiento, tasaVencimiento,
    fetchTodo, COLORES_CHART
  };
}
