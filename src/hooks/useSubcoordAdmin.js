// src/hooks/useSubcoordAdmin.js
// Hook — Subcoordinación Administrativa de la Policía Investigadora Ministerial
// Lógica pura JavaScript. Sin JSX.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const CARGO_A_ROL = {
  agente: 'agente',
  coordinador_grupo: 'agente',
  coordinador: 'coordinador',
  regional: 'regional',
  mando: 'mando',
  subcoord_admin: 'subcoord_admin',
};

const GRADOS = ['Agente', 'Coordinador de Grupo', 'Coordinador de Zona', 'Coordinador Regional'];
const CARGOS = [
  { value: 'agente', label: 'Agente' },
  { value: 'coordinador_grupo', label: 'Coordinador de Grupo' },
  { value: 'coordinador', label: 'Coordinador de Zona' },
  { value: 'regional', label: 'Coordinador Regional' },
  { value: 'mando', label: 'Director General' },
  { value: 'subcoord_admin', label: 'Subcoordinación Administrativa' },
];

const TIPOS_DOCUMENTO_RH = [
  'Currículum Vitae', 'Comprobante de Domicilio', 'Acta de Nacimiento',
  'Identificación Oficial (INE)', 'CURP (documento)', 'RFC (documento)',
  'Constancia CUIP', 'Credencial Institucional',
  'Curso / Capacitación', 'Diploma / Certificación',
  'Oficio de Comisión', 'Oficio de Cambio de Adscripción',
  'Evaluación de Desempeño', 'Reconocimiento', 'Sanción',
  'Constancia de No Antecedentes', 'Examen Médico',
  'Examen Psicológico', 'Examen Toxicológico',
  'Póliza de Seguro', 'Otro',
];

const TIPO_DOC_MAP = {
  'Currículum Vitae': 'curriculum_vitae', 'Comprobante de Domicilio': 'comprobante_domicilio',
  'Acta de Nacimiento': 'acta_nacimiento', 'Identificación Oficial (INE)': 'identificacion_oficial',
  'CURP (documento)': 'curp_documento', 'RFC (documento)': 'rfc_documento',
  'Constancia CUIP': 'constancia_cuip', 'Credencial Institucional': 'credencial_institucional',
  'Curso / Capacitación': 'curso_capacitacion', 'Diploma / Certificación': 'diploma_certificacion',
  'Oficio de Comisión': 'oficio_comision', 'Oficio de Cambio de Adscripción': 'oficio_cambio_adscripcion',
  'Evaluación de Desempeño': 'evaluacion_desempeno', 'Reconocimiento': 'reconocimiento',
  'Sanción': 'sancion', 'Constancia de No Antecedentes': 'constancia_no_antecedentes',
  'Examen Médico': 'examen_medico', 'Examen Psicológico': 'examen_psicologico',
  'Examen Toxicológico': 'examen_toxicologico', 'Póliza de Seguro': 'poliza_seguro', 'Otro': 'otro',
};

export function useSubcoordAdmin(perfil) {
  const [elementos, setElementos] = useState([]);
  const [bitacora, setBitacora] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtroRegion, setFiltroRegion] = useState('todos');
  const [filtroCargo, setFiltroCargo] = useState('todos');
  const [filtroActivo, setFiltroActivo] = useState('activos');
  const [busqueda, setBusqueda] = useState('');

  const esAdmin = perfil && ['mando', 'subcoord_admin'].includes(perfil.rol);

  // ── Cargar elementos ───────────────────────────────────────────
  const fetchElementos = useCallback(async () => {
    if (!esAdmin) return;
    setLoading(true);
    let query = supabase.from('perfiles').select('*').order('nombre_completo', { ascending: true });
    if (filtroRegion !== 'todos') query = query.eq('region', filtroRegion);
    if (filtroCargo !== 'todos') query = query.eq('cargo', filtroCargo);
    if (filtroActivo === 'activos') query = query.eq('activo', true);
    else if (filtroActivo === 'inactivos') query = query.eq('activo', false);

    const { data, error: err } = await query;
    if (err) setError('Error al cargar personal: ' + err.message);
    else {
      let lista = data || [];
      if (busqueda) {
        const q = busqueda.toLowerCase();
        lista = lista.filter(e =>
          (e.nombre_completo || '').toLowerCase().includes(q) ||
          (e.numero_empleado || '').toLowerCase().includes(q) ||
          (e.cuip || '').toLowerCase().includes(q)
        );
      }
      setElementos(lista);
    }
    setLoading(false);
  }, [esAdmin, filtroRegion, filtroCargo, filtroActivo, busqueda]);

  useEffect(() => { fetchElementos(); }, [fetchElementos]);

  // ── Registrar en bitácora ──────────────────────────────────────
  const registrarBitacora = async (perfilId, nombreElemento, tipoCambio, campo, anterior, nuevo, motivo, oficio) => {
    await supabase.from('bitacora_personal').insert([{
      perfil_id: perfilId,
      nombre_elemento: nombreElemento,
      tipo_cambio: tipoCambio,
      campo_modificado: campo,
      valor_anterior: anterior,
      valor_nuevo: nuevo,
      motivo: motivo || null,
      numero_oficio_comision: oficio || null,
      autorizado_por: perfil?.nombre_completo || '',
      autorizado_por_id: perfil?.id || null,
    }]);
  };

  // ── Cambiar cargo (comisión) — actualiza también rol para RLS ──
  const cambiarCargo = async (elemento, nuevoCargo, motivo, oficio) => {
    const nuevoRol = CARGO_A_ROL[nuevoCargo] || 'agente';
    const { error: err } = await supabase.from('perfiles').update({
      cargo: nuevoCargo,
      rol: nuevoRol,
    }).eq('id', elemento.id);
    if (err) { setError('Error al cambiar cargo: ' + err.message); return false; }
    await registrarBitacora(elemento.id, elemento.nombre_completo, 'cambio_cargo', 'cargo', elemento.cargo, nuevoCargo, motivo, oficio);
    await fetchElementos();
    return true;
  };

  // ── Cambiar grado (escalafonario) ──────────────────────────────
  const cambiarGrado = async (elemento, nuevoGrado, motivo) => {
    const { error: err } = await supabase.from('perfiles').update({ grado: nuevoGrado }).eq('id', elemento.id);
    if (err) { setError('Error al cambiar grado: ' + err.message); return false; }
    await registrarBitacora(elemento.id, elemento.nombre_completo, 'cambio_grado', 'grado', elemento.grado, nuevoGrado, motivo, null);
    await fetchElementos();
    return true;
  };

  // ── Cambiar región ─────────────────────────────────────────────
  const cambiarRegion = async (elemento, nuevaRegion, motivo, oficio) => {
    const { error: err } = await supabase.from('perfiles').update({ region: nuevaRegion }).eq('id', elemento.id);
    if (err) { setError('Error: ' + err.message); return false; }
    await registrarBitacora(elemento.id, elemento.nombre_completo, 'cambio_region', 'region', elemento.region, nuevaRegion, motivo, oficio);
    await fetchElementos();
    return true;
  };

  // ── Cambiar zona ───────────────────────────────────────────────
  const cambiarZona = async (elemento, nuevaZona, motivo) => {
    const { error: err } = await supabase.from('perfiles').update({ zona: nuevaZona }).eq('id', elemento.id);
    if (err) { setError('Error: ' + err.message); return false; }
    await registrarBitacora(elemento.id, elemento.nombre_completo, 'cambio_zona', 'zona', elemento.zona, nuevaZona, motivo, null);
    await fetchElementos();
    return true;
  };

  // ── Cambiar coordinación especializada ─────────────────────────
  const cambiarEspecializada = async (elemento, nuevaEsp, motivo) => {
    const { error: err } = await supabase.from('perfiles').update({ coordinacion_especializada: nuevaEsp || null }).eq('id', elemento.id);
    if (err) { setError('Error: ' + err.message); return false; }
    await registrarBitacora(elemento.id, elemento.nombre_completo, 'cambio_especializada', 'coordinacion_especializada', elemento.coordinacion_especializada, nuevaEsp, motivo, null);
    await fetchElementos();
    return true;
  };

  // ── Dar de baja (desactivar) ───────────────────────────────────
  const darDeBaja = async (elemento, motivo) => {
    const { error: err } = await supabase.from('perfiles').update({
      activo: false,
      fecha_baja: new Date().toISOString(),
      motivo_baja: motivo,
    }).eq('id', elemento.id);
    if (err) { setError('Error al dar de baja: ' + err.message); return false; }
    await registrarBitacora(elemento.id, elemento.nombre_completo, 'baja', 'activo', 'true', 'false', motivo, null);
    await fetchElementos();
    return true;
  };

  // ── Reactivar ──────────────────────────────────────────────────
  const reactivar = async (elemento, motivo) => {
    const { error: err } = await supabase.from('perfiles').update({
      activo: true,
      fecha_baja: null,
      motivo_baja: null,
    }).eq('id', elemento.id);
    if (err) { setError('Error al reactivar: ' + err.message); return false; }
    await registrarBitacora(elemento.id, elemento.nombre_completo, 'reactivacion', 'activo', 'false', 'true', motivo, null);
    await fetchElementos();
    return true;
  };

  // ── Actualizar datos personales ────────────────────────────────
  const actualizarDatos = async (elemento, datos) => {
    const { error: err } = await supabase.from('perfiles').update(datos).eq('id', elemento.id);
    if (err) { setError('Error al actualizar: ' + err.message); return false; }
    await registrarBitacora(elemento.id, elemento.nombre_completo, 'actualizacion_datos', Object.keys(datos).join(', '), null, null, 'Actualización de datos personales', null);
    await fetchElementos();
    return true;
  };

  // ── Subir foto/credencial ──────────────────────────────────────
  const subirFotoCredencial = async (elemento, archivo) => {
    const ext = archivo.name.split('.').pop();
    const ruta = `personal/${elemento.id}_credencial_${Date.now()}.${ext}`;
    const { error: errUp } = await supabase.storage.from('expedientes').upload(ruta, archivo);
    if (errUp) { setError('Error al subir: ' + errUp.message); return false; }
    const { data: urlData } = supabase.storage.from('expedientes').getPublicUrl(ruta);
    const { error: errDb } = await supabase.from('perfiles').update({ foto_credencial_url: urlData.publicUrl }).eq('id', elemento.id);
    if (errDb) { setError('Error al guardar URL: ' + errDb.message); return false; }
    await fetchElementos();
    return true;
  };

  // ── Cargar bitácora de un elemento ─────────────────────────────
  const fetchBitacora = async (perfilId) => {
    const { data } = await supabase.from('bitacora_personal').select('*')
      .eq('perfil_id', perfilId).order('created_at', { ascending: false });
    setBitacora(data || []);
  };

  // ── Cargar documentos de un elemento ───────────────────────────
  const fetchDocumentos = async (perfilId) => {
    const { data } = await supabase.from('documentos_personal').select('*')
      .eq('perfil_id', perfilId).order('created_at', { ascending: false });
    setDocumentos(data || []);
  };

  // ── Subir documento RH ─────────────────────────────────────────
  const subirDocumento = async (elemento, tipoDocLabel, archivo, descripcion, fechaDoc, vigencia) => {
    const tipoDB = TIPO_DOC_MAP[tipoDocLabel] || 'otro';
    const ext = archivo.name.split('.').pop();
    const ruta = `personal/${elemento.id}/doc_${tipoDB}_${Date.now()}.${ext}`;
    const { error: errUp } = await supabase.storage.from('expedientes').upload(ruta, archivo);
    if (errUp) { setError('Error al subir: ' + errUp.message); return false; }
    const { data: urlData } = supabase.storage.from('expedientes').getPublicUrl(ruta);
    const { error: errDb } = await supabase.from('documentos_personal').insert([{
      perfil_id: elemento.id,
      nombre_elemento: elemento.nombre_completo,
      tipo_documento: tipoDB,
      nombre_archivo: archivo.name,
      url_archivo: urlData.publicUrl,
      descripcion: descripcion || null,
      fecha_documento: fechaDoc || null,
      vigencia_hasta: vigencia || null,
      subido_por: perfil?.nombre_completo || '',
      subido_por_id: perfil?.id || null,
    }]);
    if (errDb) { setError('Error al registrar: ' + errDb.message); return false; }
    await fetchDocumentos(elemento.id);
    return true;
  };

  // ── Crear cuenta nueva (alta de personal) ──────────────────────
  const crearElemento = async (datosForm, passwordTemporal) => {
    setLoading(true);
    setError(null);
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: datosForm.email,
      password: passwordTemporal,
    });
    if (authErr) { setError('Error al crear cuenta: ' + authErr.message); setLoading(false); return null; }
    if (!authData.user) { setError('No se pudo crear el usuario'); setLoading(false); return null; }

    const nuevoRol = CARGO_A_ROL[datosForm.cargo] || 'agente';

    // 2. Crear perfil
    const { error: perfErr } = await supabase.from('perfiles').insert([{
      id: authData.user.id,
      nombre_completo: datosForm.nombre_completo,
      rol: nuevoRol,
      cargo: datosForm.cargo,
      grado: datosForm.grado,
      region: datosForm.region,
      zona: datosForm.zona || null,
      coordinacion_especializada: datosForm.coordinacion_especializada || null,
      numero_empleado: datosForm.numero_empleado,
      cuip: datosForm.cuip || null,
      telefono_personal: datosForm.telefono_personal || null,
      activo: true,
    }]);
    if (perfErr) { setError('Cuenta creada pero error en perfil: ' + perfErr.message); setLoading(false); return null; }

    // 3. Bitácora
    await registrarBitacora(authData.user.id, datosForm.nombre_completo, 'alta', null, null, datosForm.cargo, 'Alta de personal', null);

    setLoading(false);
    await fetchElementos();
    return authData.user;
  };

  // ── Métricas ───────────────────────────────────────────────────
  const metricas = {
    total: elementos.length,
    activos: elementos.filter(e => e.activo !== false).length,
    inactivos: elementos.filter(e => e.activo === false).length,
    porRegion: {},
    porCargo: {},
  };
  elementos.filter(e => e.activo !== false).forEach(e => {
    const r = e.region || 'Sin región';
    const c = e.cargo || e.rol || 'agente';
    metricas.porRegion[r] = (metricas.porRegion[r] || 0) + 1;
    metricas.porCargo[c] = (metricas.porCargo[c] || 0) + 1;
  });

  // ── Utilidades ─────────────────────────────────────────────────
  const getCargoLabel = (cargo) => CARGOS.find(c => c.value === cargo)?.label || cargo || 'Agente';

  const formatFecha = (f) => {
    if (!f) return '—';
    return new Date(f).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  };

  return {
    elementos, bitacora, documentos, loading, error, setError,
    filtroRegion, setFiltroRegion, filtroCargo, setFiltroCargo,
    filtroActivo, setFiltroActivo, busqueda, setBusqueda,
    fetchElementos, fetchBitacora, fetchDocumentos,
    cambiarCargo, cambiarGrado, cambiarRegion, cambiarZona, cambiarEspecializada,
    darDeBaja, reactivar, actualizarDatos, subirFotoCredencial, subirDocumento,
    crearElemento, metricas, esAdmin,
    getCargoLabel, formatFecha,
    GRADOS, CARGOS, TIPOS_DOCUMENTO_RH,
  };
}
