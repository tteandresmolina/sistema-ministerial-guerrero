// src/hooks/useBodegaIndicios.js
// Hook — Bodega de Indicios (Narcomenudeo)
// Lógica pura JavaScript. Sin JSX.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const TIPOS_INDICIO = [
  { value: 'marihuana', label: 'Marihuana' },
  { value: 'cocaina', label: 'Cocaína' },
  { value: 'cristal', label: 'Cristal (Metanfetamina)' },
  { value: 'heroina', label: 'Heroína' },
  { value: 'fentanilo', label: 'Fentanilo' },
  { value: 'pastillas', label: 'Pastillas / Psicotrópicos' },
  { value: 'precursor_quimico', label: 'Precursor Químico' },
  { value: 'semilla', label: 'Semilla' },
  { value: 'planta', label: 'Planta' },
  { value: 'dinero', label: 'Dinero en efectivo' },
  { value: 'vehiculo', label: 'Vehículo' },
  { value: 'arma', label: 'Arma' },
  { value: 'telefono', label: 'Teléfono / Dispositivo' },
  { value: 'otro', label: 'Otro' },
];

const TIPOS_MOVIMIENTO = [
  { value: 'salida_peritaje', label: 'Salida a Peritaje' },
  { value: 'salida_audiencia', label: 'Salida a Audiencia' },
  { value: 'salida_traslado', label: 'Salida por Traslado' },
  { value: 'salida_destruccion', label: 'Salida para Destrucción' },
  { value: 'salida_entrega_mp', label: 'Entrega al MP' },
  { value: 'salida_otro', label: 'Otra salida' },
  { value: 'retorno', label: 'Retorno a Bodega' },
];

const UNIDADES = ['gramos', 'kilogramos', 'litros', 'mililitros', 'piezas', 'dosis', 'plantas', 'bolsas', 'paquetes'];

export function useBodegaIndicios(perfil) {
  const [indicios, setIndicios] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const esNarco = perfil && (
    ['mando', 'regional'].includes(perfil.rol) ||
    (perfil.coordinacion_especializada || '').toLowerCase().includes('narcomenudeo')
  );

  // ── Cargar indicios ────────────────────────────────────────────
  const fetchIndicios = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('bodega_indicios').select('*').order('fecha_entrada', { ascending: false });
    if (filtroEstatus !== 'todos') query = query.eq('estatus', filtroEstatus);
    if (filtroTipo !== 'todos') query = query.eq('tipo_indicio', filtroTipo);

    const { data, error: err } = await query;
    if (err) setError('Error al cargar indicios: ' + err.message);
    else {
      let lista = data || [];
      if (busqueda) {
        const q = busqueda.toLowerCase();
        lista = lista.filter(i =>
          (i.carpeta_investigacion || '').toLowerCase().includes(q) ||
          (i.descripcion || '').toLowerCase().includes(q) ||
          (i.folio_bodega || '').toLowerCase().includes(q) ||
          (i.folio_cadena_custodia || '').toLowerCase().includes(q)
        );
      }
      setIndicios(lista);
    }
    setLoading(false);
  }, [filtroEstatus, filtroTipo, busqueda]);

  useEffect(() => { if (esNarco) fetchIndicios(); }, [fetchIndicios, esNarco]);

  // ── Registrar entrada (nuevo indicio) ──────────────────────────
  const registrarEntrada = async (form, archivo) => {
    setLoading(true);
    setError(null);
    let foto_url = null;
    let nombre_foto = null;

    if (archivo) {
      const ext = archivo.name.split('.').pop();
      const ruta = `bodega/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: errUp } = await supabase.storage.from('expedientes').upload(ruta, archivo);
      if (errUp) { setError('Error al subir foto: ' + errUp.message); setLoading(false); return null; }
      const { data: urlData } = supabase.storage.from('expedientes').getPublicUrl(ruta);
      foto_url = urlData.publicUrl;
      nombre_foto = archivo.name;
    }

    const payload = {
      carpeta_investigacion: form.carpeta_investigacion,
      numero_indicio: form.numero_indicio || null,
      tipo_indicio: form.tipo_indicio,
      descripcion: form.descripcion,
      cantidad: form.cantidad || null,
      peso: form.peso || null,
      unidad_medida: form.unidad_medida || null,
      folio_cadena_custodia: form.folio_cadena_custodia || null,
      mp_ordenador: form.mp_ordenador || null,
      auxiliar_mp_entrega: form.auxiliar_mp_entrega || null,
      pim_recibe: perfil?.nombre_completo || '',
      pim_recibe_id: perfil?.id || null,
      foto_url,
      nombre_foto,
      ubicacion_bodega: form.ubicacion_bodega || null,
      observaciones_entrada: form.observaciones_entrada || null,
      region: perfil?.region || null,
      zona: perfil?.zona || null,
      registrado_por: perfil?.nombre_completo || '',
      registrado_por_id: perfil?.id || null,
    };

    const { data, error: err } = await supabase.from('bodega_indicios').insert([payload]).select().single();
    setLoading(false);
    if (err) { setError('Error al registrar: ' + err.message); return null; }
    await fetchIndicios();
    return data;
  };

  // ── Registrar movimiento (salida o retorno) ────────────────────
  const registrarMovimiento = async (indicioId, form) => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase.from('bodega_movimientos').insert([{
      indicio_id: indicioId,
      tipo_movimiento: form.tipo_movimiento,
      destino: form.destino || null,
      nombre_entrega: form.nombre_entrega || perfil?.nombre_completo || '',
      nombre_recibe: form.nombre_recibe || null,
      folio_cadena_custodia: form.folio_cadena_custodia || null,
      observaciones: form.observaciones || null,
      registrado_por: perfil?.nombre_completo || '',
      registrado_por_id: perfil?.id || null,
    }]).select().single();

    if (err) { setError('Error al registrar movimiento: ' + err.message); setLoading(false); return false; }

    // Actualizar estatus del indicio
    const estatusMap = {
      salida_peritaje: 'en_peritaje',
      salida_audiencia: 'en_audiencia',
      salida_traslado: 'en_traslado',
      salida_destruccion: 'destruido',
      salida_entrega_mp: 'entregado',
      salida_otro: 'en_traslado',
      retorno: 'resguardado',
    };
    const nuevoEstatus = estatusMap[form.tipo_movimiento] || 'resguardado';
    await supabase.from('bodega_indicios').update({ estatus: nuevoEstatus }).eq('id', indicioId);

    setLoading(false);
    await fetchIndicios();
    return true;
  };

  // ── Cargar movimientos de un indicio ───────────────────────────
  const fetchMovimientos = async (indicioId) => {
    const { data } = await supabase.from('bodega_movimientos').select('*')
      .eq('indicio_id', indicioId).order('fecha_movimiento', { ascending: false });
    setMovimientos(data || []);
  };

  // ── Métricas ───────────────────────────────────────────────────
  const metricas = {
    total: indicios.length,
    resguardados: indicios.filter(i => i.estatus === 'resguardado').length,
    en_peritaje: indicios.filter(i => i.estatus === 'en_peritaje').length,
    en_audiencia: indicios.filter(i => i.estatus === 'en_audiencia').length,
    en_traslado: indicios.filter(i => i.estatus === 'en_traslado').length,
    destruidos: indicios.filter(i => i.estatus === 'destruido').length,
    entregados: indicios.filter(i => i.estatus === 'entregado').length,
  };

  const porTipo = {};
  indicios.filter(i => i.estatus === 'resguardado').forEach(i => {
    const t = i.tipo_indicio || 'otro';
    porTipo[t] = (porTipo[t] || 0) + 1;
  });

  // ── Utilidades ─────────────────────────────────────────────────
  const getTipoLabel = (tipo) => TIPOS_INDICIO.find(t => t.value === tipo)?.label || tipo;
  const getMovLabel = (tipo) => TIPOS_MOVIMIENTO.find(t => t.value === tipo)?.label || tipo;

  const getEstatusColor = (est) => ({
    resguardado: '#10b981',
    en_peritaje: '#3b82f6',
    en_audiencia: '#8b5cf6',
    en_traslado: '#f59e0b',
    destruido: '#6b7280',
    entregado: '#6b7280',
  }[est] || '#6b7280');

  const getTipoColor = (tipo) => ({
    marihuana: '#22c55e', cocaina: '#f1f5f9', cristal: '#60a5fa',
    heroina: '#854f0b', fentanilo: '#dc2626', pastillas: '#a78bfa',
    precursor_quimico: '#f97316', semilla: '#84cc16', planta: '#15803d',
    dinero: '#eab308', vehiculo: '#475569', arma: '#7f1d1d',
    telefono: '#0891b2', otro: '#6b7280',
  }[tipo] || '#6b7280');

  const formatFecha = (f) => {
    if (!f) return '—';
    return new Date(f).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  };

  return {
    indicios, movimientos, loading, error, setError, esNarco,
    filtroEstatus, setFiltroEstatus, filtroTipo, setFiltroTipo, busqueda, setBusqueda,
    fetchIndicios, registrarEntrada, registrarMovimiento, fetchMovimientos,
    metricas, porTipo,
    getTipoLabel, getMovLabel, getEstatusColor, getTipoColor, formatFecha,
    TIPOS_INDICIO, TIPOS_MOVIMIENTO, UNIDADES,
  };
}
