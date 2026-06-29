// src/hooks/useVehiculosRobo.js
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useVehiculosRobo() {
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, conReporte: 0, asegurados: 0, sinRecuperar: 0 });

  const fetchStats = async () => {
    const { data } = await supabase.from('vehiculos_reporte_robo').select('estatus_robo, asegurado');
    if (!data) return;
    setStats({
      total: data.length,
      conReporte: data.filter(d => d.estatus_robo === 'CON REPORTE DE ROBO').length,
      asegurados: data.filter(d => d.asegurado).length,
      sinRecuperar: data.filter(d => !d.asegurado && d.estatus_robo === 'CON REPORTE DE ROBO').length,
    });
  };

  useEffect(() => { fetchStats(); }, []);

  // Búsqueda por fragmentos de NIV (primeros 3 + últimos 5) o motor o placas
  const buscar = async ({ niv_inicio, niv_final, numero_motor, placas }) => {
    setLoading(true);
    let query = supabase.from('vehiculos_reporte_robo').select('*');

    if (niv_inicio && niv_final) {
      query = query.ilike('niv', `${niv_inicio}%`).ilike('niv', `%${niv_final}`);
    } else if (niv_inicio) {
      query = query.ilike('niv', `${niv_inicio}%`);
    } else if (niv_final) {
      query = query.ilike('niv', `%${niv_final}`);
    } else if (numero_motor) {
      query = query.ilike('numero_motor', `%${numero_motor}%`);
    } else if (placas) {
      query = query.ilike('placas', `%${placas}%`);
    }

    const { data } = await query.order('creado_en', { ascending: false }).limit(50);
    setVehiculos(data || []);
    setLoading(false);
  };

  const crearVehiculo = async (payload) => {
    const { data, error } = await supabase.from('vehiculos_reporte_robo').insert([payload]).select().single();
    if (error) return { success: false, error: error.message };
    fetchStats();
    return { success: true, data };
  };

  const actualizarVehiculo = async (id, campos) => {
    const { error } = await supabase.from('vehiculos_reporte_robo').update(campos).eq('id', id);
    if (error) return { success: false, error: error.message };
    fetchStats();
    return { success: true };
  };

  return { vehiculos, loading, stats, buscar, crearVehiculo, actualizarVehiculo, fetchStats };
}
