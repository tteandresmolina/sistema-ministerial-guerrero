// src/hooks/useDetenidosDashboard.js
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient'; // ← src/supabaseClient.js

// ─── Helpers de fechas ───────────────────────────────────────
const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

function nombreMes(i) { return MESES[i]; }

function toISO(date) {
  return date.toISOString().split('T')[0];
}

function getRangoPeriodo(tipo, fecha) {
  const d = fecha ? new Date(fecha) : new Date();
  const year = d.getFullYear();
  const month = d.getMonth();

  switch (tipo) {
    case 'quincena1': {
      const inicio = new Date(year, month, 1);
      const fin    = new Date(year, month, 15, 23, 59, 59);
      return { inicio, fin, label: `1–15 ${nombreMes(month)} ${year}` };
    }
    case 'quincena2': {
      const inicio = new Date(year, month, 16);
      const fin    = new Date(year, month + 1, 0, 23, 59, 59);
      return { inicio, fin, label: `16–${fin.getDate()} ${nombreMes(month)} ${year}` };
    }
    case 'mes': {
      const inicio = new Date(year, month, 1);
      const fin    = new Date(year, month + 1, 0, 23, 59, 59);
      return { inicio, fin, label: `${nombreMes(month)} ${year}` };
    }
    case 'anio': {
      const inicio = new Date(year, 0, 1);
      const fin    = new Date(year, 11, 31, 23, 59, 59);
      return { inicio, fin, label: `Año ${year}` };
    }
    default:
      return getRangoPeriodo('mes', fecha);
  }
}

// ─── Constantes de roles ─────────────────────────────────────
export const ROLES_SUPERIORES = ['direccion_general', 'coordinador_regional'];
export const ROLES_BASICOS    = ['coordinador_zona', 'coordinador_grupo', 'agente'];

export const ROL_LABELS = {
  direccion_general:    'Dirección General',
  coordinador_regional: 'Coordinador Regional',
  coordinador_zona:     'Coordinador de Zona',
  coordinador_grupo:    'Coordinador de Grupo',
  agente:               'Agente',
};

// ─── Hook principal ──────────────────────────────────────────
export function useDetenidosDashboard() {
  // Filtros
  const [tipoPeriodo, setTipoPeriodo] = useState('mes');
  const [fechaRef, setFechaRef] = useState(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  });

  // Datos
  const [detenidos, setDetenidos]         = useState([]);
  const [catalogoEstatus, setCatalogoEstatus] = useState([]);
  const [perfil, setPerfil]               = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  // Rango calculado
  const rango = useMemo(() => {
    const partes = fechaRef.split('-');
    const año = parseInt(partes[0]);
    const mes = partes[1] ? parseInt(partes[1]) - 1 : 0;
    return getRangoPeriodo(tipoPeriodo, new Date(año, mes, 1));
  }, [tipoPeriodo, fechaRef]);

  // ── Cargar perfil ──────────────────────────────────────────
  useEffect(() => {
    async function cargarPerfil() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, rol, region, zona')
        .eq('id', user.id)
        .single();
      setPerfil(data);
    }
    cargarPerfil();
  }, []);

  // ── Cargar catálogo de estatus ─────────────────────────────
  useEffect(() => {
    async function cargarCatalogo() {
      const { data } = await supabase
        .from('catalogo_estatus')
        .select('clave, nombre, color');
      setCatalogoEstatus(data || []);
    }
    cargarCatalogo();
  }, []);

  // ── Cargar detenidos desde la VISTA ────────────────────────
  // La vista "vista_detenidos" ya aplica el enmascaramiento
  // de columnas sensibles según el rol del usuario.
  // RLS permite ver todas las filas; la vista controla QUÉ
  // columnas ven de cada fila.
  const cargarDetenidos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('vista_detenidos')   // ← VISTA, no tabla base
        .select('id, nombre, alias, delito, carpeta_investigacion, region, zona, fecha_deteccion, fecha_limite_48h, estatus_clave, creado_en, es_mi_region, es_rol_superior')
        .gte('fecha_deteccion', toISO(rango.inicio))
        .lte('fecha_deteccion', toISO(rango.fin))
        .order('fecha_deteccion', { ascending: false });

      if (err) throw err;
      setDetenidos(data || []);
    } catch (e) {
      setError(e.message);
      setDetenidos([]);
    } finally {
      setLoading(false);
    }
  }, [rango]);

  useEffect(() => {
    cargarDetenidos();
  }, [cargarDetenidos]);

  // ── Métricas calculadas ────────────────────────────────────
  const metricas = useMemo(() => {
    const total       = detenidos.length;
    const miRegion    = detenidos.filter(d => d.es_mi_region);
    const otraRegion  = detenidos.filter(d => !d.es_mi_region);

    // Por estatus
    const porEstatus = {};
    detenidos.forEach(d => {
      const clave = d.estatus_clave || 'sin_estatus';
      porEstatus[clave] = (porEstatus[clave] || 0) + 1;
    });

    // Por región
    const porRegion = {};
    detenidos.forEach(d => {
      const r = d.region || 'Sin región';
      porRegion[r] = (porRegion[r] || 0) + 1;
    });

    // Por delito (top 8)
    const porDelito = {};
    detenidos.forEach(d => {
      const del = d.delito || 'Sin especificar';
      porDelito[del] = (porDelito[del] || 0) + 1;
    });
    const topDelitos = Object.entries(porDelito)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }));

    // Serie temporal por día
    const porDia = {};
    detenidos.forEach(d => {
      const dia = d.fecha_deteccion;
      porDia[dia] = (porDia[dia] || 0) + 1;
    });
    const serieTemporal = Object.entries(porDia)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([fecha, cantidad]) => ({ fecha, cantidad }));

    // Alertas 48h (solo de MI REGIÓN, donde tengo fecha_limite_48h)
    const ahora = new Date();
    let porVencer = 0;
    let vencidos  = 0;
    miRegion.forEach(d => {
      if (!d.fecha_limite_48h) return;
      const limite = new Date(d.fecha_limite_48h);
      const horasRestantes = (limite - ahora) / (1000 * 60 * 60);
      if (horasRestantes < 0) vencidos++;
      else if (horasRestantes <= 12) porVencer++;
    });

    return {
      total,
      totalMiRegion:    miRegion.length,
      totalOtraRegion:  otraRegion.length,
      porEstatus,
      porRegion,
      topDelitos,
      serieTemporal,
      alertas: { porVencer, vencidos },
    };
  }, [detenidos]);

  // Lookup estatus → nombre/color
  const getEstatus = useCallback((clave) => {
    return catalogoEstatus.find(e => e.clave === clave) || {
      clave, nombre: clave, color: '#94a3b8',
    };
  }, [catalogoEstatus]);

  // Helper: ¿el usuario es rol superior?
  const esRolSuperior = perfil
    ? ROLES_SUPERIORES.includes(perfil.rol)
    : false;

  return {
    tipoPeriodo, setTipoPeriodo,
    fechaRef, setFechaRef,
    rango,
    detenidos,
    perfil,
    esRolSuperior,
    catalogoEstatus,
    metricas,
    getEstatus,
    loading,
    error,
    recargar: cargarDetenidos,
  };
}
