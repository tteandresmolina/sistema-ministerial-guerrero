// src/pages/TrianguloProblema.jsx
// Triángulo del Problema — Análisis SARA (Fase: Analysis)
// Víctima ↔ Agresor ↔ Lugar
// Cruza datos de victimas_caso, detenidos, personas_investigadas,
// registros_911 y escenas_crimen para identificar patrones
// Fundamento: Routine Activity Theory (Cohen & Felson), Modelo Nacional UDIC

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, User, MapPin, Shield, Target, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';

const C = {
  darkBlue: '#001a4d', gold: '#b69054', lightGold: '#f5ede0',
  white: '#ffffff', bg: '#f4f6fb', gray: '#666666', lightGray: '#e8ecf1',
  green: '#28a745', red: '#dc3545', orange: '#fd7e14', purple: '#6a1b9a',
};

function contarCampo(arr, campo) {
  var conteo = {};
  arr.forEach(function(item) {
    var val = item[campo] || 'No especificado';
    conteo[val] = (conteo[val] || 0) + 1;
  });
  return Object.entries(conteo).sort(function(a, b) { return b[1] - a[1]; });
}

function BarraHorizontal({ items, maxVal, color }) {
  if (items.length === 0) return <div style={{ fontSize: 12, color: C.gray, textAlign: 'center', padding: 10 }}>Sin datos</div>;
  return items.slice(0, 7).map(function(item, i) {
    var label = item[0]; var count = item[1];
    return (
      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{ flex: 1, position: 'relative', height: 22, backgroundColor: C.bg, borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: (count / maxVal * 100) + '%', backgroundColor: i === 0 ? color : color + '80', borderRadius: 5 }} />
          <span style={{ position: 'relative', zIndex: 1, fontSize: 10, fontWeight: 600, color: C.darkBlue, padding: '0 6px', lineHeight: '22px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{label}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.darkBlue, minWidth: 24, textAlign: 'right' }}>{count}</span>
      </div>
    );
  });
}

export default function TrianguloProblema() {
  const [loading, setLoading] = useState(true);
  const [victimas, setVictimas] = useState([]);
  const [agresores, setAgresores] = useState([]);
  const [lugares, setLugares] = useState([]);
  const [expandido, setExpandido] = useState({ victima: true, agresor: true, lugar: true });

  const cargarDatos = async function() {
    setLoading(true);

    // Víctimas
    var r1 = await supabase.from('victimas_caso').select('sexo, edad, estado_salud, municipio_domicilio, es_menor_edad, es_mujer, es_indigena, es_migrante, es_discapacidad, es_adulto_mayor, es_lgbti, tipo_agravio');
    setVictimas(r1.data || []);

    // Agresores: detenidos + personas investigadas
    var r2 = await supabase.from('detenidos').select('sexo, delito, region, tipo_deteccion, lugar_deteccion');
    var r3 = await supabase.from('personas_investigadas').select('sexo, estatus, tipo_identificacion, rol_en_hechos, edad_aparente');
    var agr = [];
    (r2.data || []).forEach(function(d) { agr.push({ fuente: 'Detenido', sexo: d.sexo, delito: d.delito, zona: d.region, tipo: d.tipo_deteccion, lugar: d.lugar_deteccion }); });
    (r3.data || []).forEach(function(p) { agr.push({ fuente: 'Investigado', sexo: p.sexo === 'masculino' ? 'Masculino' : p.sexo === 'femenino' ? 'Femenino' : p.sexo, estatus: p.estatus, rol: p.rol_en_hechos, tipo_id: p.tipo_identificacion }); });
    setAgresores(agr);

    // Lugares: 911 + escenas
    var r4 = await supabase.from('registros_911').select('municipio, incidencia_tipo, hora_reporte, ubicacion_texto');
    var r5 = await supabase.from('escenas_crimen').select('municipio, tipo_escena, condiciones_climatologicas, iluminacion, preservacion_adecuada, contaminacion_detectada');
    var lug = [];
    (r4.data || []).forEach(function(r) { lug.push({ fuente: '911', municipio: r.municipio, tipo: r.incidencia_tipo, hora: r.hora_reporte, ubicacion: r.ubicacion_texto }); });
    (r5.data || []).forEach(function(e) { lug.push({ fuente: 'Escena', municipio: e.municipio, tipo: e.tipo_escena, clima: e.condiciones_climatologicas, iluminacion: e.iluminacion, preservacion: e.preservacion_adecuada, contaminacion: e.contaminacion_detectada }); });
    setLugares(lug);

    setLoading(false);
  };

  useEffect(function() { cargarDatos(); }, []);

  // Análisis de víctimas
  var vicSexo = contarCampo(victimas, 'sexo');
  var vicEstado = contarCampo(victimas, 'estado_salud');
  var vicMunicipio = contarCampo(victimas, 'municipio_domicilio');
  var vicVulnerables = 0;
  victimas.forEach(function(v) { if (v.es_menor_edad || v.es_mujer || v.es_indigena || v.es_migrante || v.es_discapacidad || v.es_adulto_mayor || v.es_lgbti) vicVulnerables++; });

  // Análisis de agresores
  var agrSexo = contarCampo(agresores, 'sexo');
  var agrDelito = contarCampo(agresores, 'delito');
  var agrTipo = contarCampo(agresores.filter(function(a) { return a.tipo; }), 'tipo');
  var agrRol = contarCampo(agresores.filter(function(a) { return a.rol; }), 'rol');
  var agrEstatus = contarCampo(agresores.filter(function(a) { return a.estatus; }), 'estatus');

  // Análisis de lugares
  var lugMunicipio = contarCampo(lugares, 'municipio');
  var lugTipo = contarCampo(lugares, 'tipo');
  var lugClima = contarCampo(lugares.filter(function(l) { return l.clima; }), 'clima');
  var lugIluminacion = contarCampo(lugares.filter(function(l) { return l.iluminacion; }), 'iluminacion');
  var escenasContaminadas = lugares.filter(function(l) { return l.contaminacion; }).length;
  var escenasNoPreservadas = lugares.filter(function(l) { return l.preservacion === false; }).length;

  var toggleExpand = function(key) { setExpandido(function(p) { var n = {}; Object.assign(n, p); n[key] = !p[key]; return n; }); };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: C.gray }}>
        <RefreshCw size={24} /><p style={{ marginTop: 8 }}>Analizando datos del triángulo del problema...</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={18} color={C.gold} />
          <span style={{ fontWeight: 700, fontSize: 16, color: C.darkBlue }}>Triángulo del Problema — Análisis Criminal</span>
        </div>
        <button onClick={cargarDatos} style={{ background: 'none', border: '1.5px solid ' + C.darkBlue, borderRadius: 7, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: C.darkBlue, fontSize: 12, fontWeight: 600 }}>
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      <p style={{ fontSize: 12, color: C.gray, marginBottom: 16 }}>
        Teoría de la Actividad Rutinaria (Cohen & Felson): un delito ocurre cuando convergen un <strong>agresor motivado</strong>, una <strong>víctima vulnerable</strong> y un <strong>lugar propicio</strong> sin vigilancia adecuada. Identificar patrones en cada vértice permite diseñar intervenciones focalizadas.
      </p>

      {/* Stats generales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
        <div style={{ background: C.white, borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center', borderTop: '4px solid ' + C.red }}>
          <User size={24} color={C.red} />
          <div style={{ fontSize: 28, fontWeight: 700, color: C.darkBlue, marginTop: 6 }}>{victimas.length}</div>
          <div style={{ fontSize: 12, color: C.gray }}>Víctimas registradas</div>
          {vicVulnerables > 0 && <div style={{ fontSize: 11, color: C.orange, fontWeight: 600, marginTop: 4 }}>⚠ {vicVulnerables} en condición vulnerable</div>}
        </div>
        <div style={{ background: C.white, borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center', borderTop: '4px solid ' + C.darkBlue }}>
          <Target size={24} color={C.darkBlue} />
          <div style={{ fontSize: 28, fontWeight: 700, color: C.darkBlue, marginTop: 6 }}>{agresores.length}</div>
          <div style={{ fontSize: 12, color: C.gray }}>Agresores identificados</div>
          <div style={{ fontSize: 11, color: C.gray, marginTop: 4 }}>{agresores.filter(function(a) { return a.fuente === 'Detenido'; }).length} detenidos · {agresores.filter(function(a) { return a.fuente === 'Investigado'; }).length} investigados</div>
        </div>
        <div style={{ background: C.white, borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center', borderTop: '4px solid ' + C.gold }}>
          <MapPin size={24} color={C.gold} />
          <div style={{ fontSize: 28, fontWeight: 700, color: C.darkBlue, marginTop: 6 }}>{lugares.length}</div>
          <div style={{ fontSize: 12, color: C.gray }}>Lugares documentados</div>
          {escenasContaminadas > 0 && <div style={{ fontSize: 11, color: C.red, fontWeight: 600, marginTop: 4 }}>⚠ {escenasContaminadas} escena{escenasContaminadas > 1 ? 's' : ''} contaminada{escenasContaminadas > 1 ? 's' : ''}</div>}
        </div>
      </div>

      {/* VÉRTICE 1: VÍCTIMA */}
      <div style={{ background: C.white, borderRadius: 10, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <button onClick={function() { toggleExpand('victima'); }} style={{ width: '100%', padding: '14px 18px', background: C.red + '10', border: 'none', borderLeft: '4px solid ' + C.red, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.red, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} /> VÉRTICE 1 — VÍCTIMA ({victimas.length})
          </span>
          {expandido.victima ? <ChevronUp size={16} color={C.red} /> : <ChevronDown size={16} color={C.red} />}
        </button>
        {expandido.victima && (
          <div style={{ padding: 18 }}>
            <p style={{ fontSize: 11, color: C.gray, marginBottom: 12 }}>¿Quiénes son las víctimas? ¿Hay un perfil recurrente? ¿Qué las hace vulnerables?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.darkBlue, marginBottom: 8 }}>Por sexo</div>
                <BarraHorizontal items={vicSexo} maxVal={vicSexo.length > 0 ? vicSexo[0][1] : 1} color={C.red} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.darkBlue, marginBottom: 8 }}>Estado de salud</div>
                <BarraHorizontal items={vicEstado} maxVal={vicEstado.length > 0 ? vicEstado[0][1] : 1} color={C.orange} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.darkBlue, marginBottom: 8 }}>Municipio de domicilio</div>
                <BarraHorizontal items={vicMunicipio} maxVal={vicMunicipio.length > 0 ? vicMunicipio[0][1] : 1} color={C.gold} />
              </div>
            </div>
            {vicVulnerables > 0 && (
              <div style={{ marginTop: 12, padding: 10, background: '#fff3e0', borderRadius: 8, fontSize: 12, color: '#e65100' }}>
                <strong>{vicVulnerables}</strong> de {victimas.length} víctimas ({victimas.length > 0 ? Math.round(vicVulnerables / victimas.length * 100) : 0}%) presentan al menos un factor de vulnerabilidad (menor de edad, mujer, indígena, migrante, discapacidad, adulto mayor, LGBTI+). Esto indica la necesidad de enfoque diferencial en las intervenciones.
              </div>
            )}
          </div>
        )}
      </div>

      {/* VÉRTICE 2: AGRESOR */}
      <div style={{ background: C.white, borderRadius: 10, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <button onClick={function() { toggleExpand('agresor'); }} style={{ width: '100%', padding: '14px 18px', background: C.darkBlue + '10', border: 'none', borderLeft: '4px solid ' + C.darkBlue, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.darkBlue, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={16} /> VÉRTICE 2 — AGRESOR ({agresores.length})
          </span>
          {expandido.agresor ? <ChevronUp size={16} color={C.darkBlue} /> : <ChevronDown size={16} color={C.darkBlue} />}
        </button>
        {expandido.agresor && (
          <div style={{ padding: 18 }}>
            <p style={{ fontSize: 11, color: C.gray, marginBottom: 12 }}>¿Quiénes cometen los delitos? ¿Hay reincidencia? ¿Qué modus operandi predomina?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.darkBlue, marginBottom: 8 }}>Por delito</div>
                <BarraHorizontal items={agrDelito} maxVal={agrDelito.length > 0 ? agrDelito[0][1] : 1} color={C.darkBlue} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.darkBlue, marginBottom: 8 }}>Tipo de detención</div>
                <BarraHorizontal items={agrTipo} maxVal={agrTipo.length > 0 ? agrTipo[0][1] : 1} color={C.purple} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.darkBlue, marginBottom: 8 }}>Rol en los hechos</div>
                <BarraHorizontal items={agrRol} maxVal={agrRol.length > 0 ? agrRol[0][1] : 1} color={C.orange} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.darkBlue, marginBottom: 8 }}>Estatus investigado</div>
                <BarraHorizontal items={agrEstatus} maxVal={agrEstatus.length > 0 ? agrEstatus[0][1] : 1} color={C.red} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VÉRTICE 3: LUGAR */}
      <div style={{ background: C.white, borderRadius: 10, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <button onClick={function() { toggleExpand('lugar'); }} style={{ width: '100%', padding: '14px 18px', background: C.gold + '10', border: 'none', borderLeft: '4px solid ' + C.gold, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.gold, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={16} /> VÉRTICE 3 — LUGAR ({lugares.length})
          </span>
          {expandido.lugar ? <ChevronUp size={16} color={C.gold} /> : <ChevronDown size={16} color={C.gold} />}
        </button>
        {expandido.lugar && (
          <div style={{ padding: 18 }}>
            <p style={{ fontSize: 11, color: C.gray, marginBottom: 12 }}>¿Dónde ocurren los hechos? ¿Qué condiciones del lugar facilitan el delito? ¿Hay vigilancia?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.darkBlue, marginBottom: 8 }}>Por municipio</div>
                <BarraHorizontal items={lugMunicipio} maxVal={lugMunicipio.length > 0 ? lugMunicipio[0][1] : 1} color={C.gold} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.darkBlue, marginBottom: 8 }}>Tipo de incidencia</div>
                <BarraHorizontal items={lugTipo} maxVal={lugTipo.length > 0 ? lugTipo[0][1] : 1} color={C.orange} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.darkBlue, marginBottom: 8 }}>Condiciones climáticas</div>
                <BarraHorizontal items={lugClima} maxVal={lugClima.length > 0 ? lugClima[0][1] : 1} color='#1565c0' />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.darkBlue, marginBottom: 8 }}>Iluminación</div>
                <BarraHorizontal items={lugIluminacion} maxVal={lugIluminacion.length > 0 ? lugIluminacion[0][1] : 1} color='#546e7a' />
              </div>
            </div>
            {(escenasContaminadas > 0 || escenasNoPreservadas > 0) && (
              <div style={{ marginTop: 12, padding: 10, background: '#ffebee', borderRadius: 8, fontSize: 12, color: '#b71c1c' }}>
                {escenasContaminadas > 0 && <div><strong>{escenasContaminadas}</strong> escena{escenasContaminadas > 1 ? 's' : ''} con contaminación detectada.</div>}
                {escenasNoPreservadas > 0 && <div><strong>{escenasNoPreservadas}</strong> escena{escenasNoPreservadas > 1 ? 's' : ''} sin preservación adecuada.</div>}
                <div style={{ marginTop: 4, fontStyle: 'italic', color: '#795548' }}>Estos factores afectan la calidad de la evidencia y deben abordarse en la fase de Response del SARA.</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resumen de convergencia */}
      <div style={{ background: C.lightGold, borderRadius: 10, padding: 16, border: '1px solid ' + C.gold + '40' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <BarChart3 size={14} /> Convergencia del Triángulo — Puntos de Intervención
        </div>
        <div style={{ fontSize: 13, color: C.darkBlue, lineHeight: 1.7 }}>
          {victimas.length > 0 && agresores.length > 0 && lugares.length > 0 ? (
            <div>
              <p>Con <strong>{victimas.length}</strong> víctimas, <strong>{agresores.length}</strong> agresores y <strong>{lugares.length}</strong> lugares documentados, el análisis sugiere:</p>
              <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                {vicVulnerables > 0 && <li><strong>Víctimas:</strong> El {Math.round(vicVulnerables / victimas.length * 100)}% tiene factores de vulnerabilidad — las intervenciones deben incluir enfoque diferencial y medidas de protección.</li>}
                {agrDelito.length > 0 && <li><strong>Agresores:</strong> El delito predominante es "{agrDelito[0][0]}" — focalizar patrullaje e investigación en este tipo delictivo.</li>}
                {lugMunicipio.length > 0 && <li><strong>Lugares:</strong> La mayor concentración está en {lugMunicipio[0][0]} — evaluar vigilancia, iluminación y presencia policial en esa zona.</li>}
                {escenasContaminadas > 0 && <li><strong>Calidad investigativa:</strong> Se detectaron {escenasContaminadas} escenas contaminadas — reforzar capacitación en preservación del lugar.</li>}
              </ul>
              <p style={{ fontStyle: 'italic', color: C.gray, marginTop: 8 }}>Utiliza esta información para diseñar la estrategia de Response del SARA: ¿qué "pinch point" (punto débil) es más factible de intervenir con los recursos disponibles?</p>
            </div>
          ) : (
            <p>Se requieren más datos en las tres dimensiones (víctimas, agresores y lugares) para generar un análisis de convergencia significativo. Conforme se capturen más registros, el triángulo se enriquecerá automáticamente.</p>
          )}
        </div>
      </div>
    </div>
  );
}
