// src/hooks/useOrdenesAprehension.js
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useOrdenesAprehension() {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, pendientes: 0, cumplidas: 0, reaprehension: 0 });

  const fetchStats = async () => {
    const { data } = await supabase.from('ordenes_aprehension').select('resolucion, mandato_judicial');
    if (!data) return;
    setStats({
      total: data.length,
      pendientes: data.filter(d => d.resolucion === 'FALTA POR CUMPLIR').length,
      cumplidas: data.filter(d => d.resolucion === 'CUMPLIDA').length,
      reaprehension: data.filter(d => d.mandato_judicial === 'REAPREHENSION').length,
    });
  };

  useEffect(() => { fetchStats(); }, []);

  const buscarPorApellidos = async (termino) => {
    if (!termino || termino.trim().length < 2) { setOrdenes([]); return; }
    setLoading(true);
    const palabras = termino.trim().split(/\s+/);
    let query = supabase.from('ordenes_aprehension').select('*');
    palabras.forEach(p => { query = query.ilike('inculpado', `%${p}%`); });
    const { data } = await query.order('inculpado', { ascending: true }).limit(100);
    setOrdenes(data || []);
    setLoading(false);
  };

  const crearOrden = async (payload) => {
    const { data, error } = await supabase.from('ordenes_aprehension').insert([payload]).select().single();
    if (error) return { success: false, error: error.message };
    fetchStats();
    return { success: true, data };
  };

  const actualizarOrden = async (id, campos) => {
    const { error } = await supabase.from('ordenes_aprehension').update(campos).eq('id', id);
    if (error) return { success: false, error: error.message };
    fetchStats();
    return { success: true };
  };

  return { ordenes, loading, stats, buscarPorApellidos, crearOrden, actualizarOrden, fetchStats };
}
