// src/pages/ChecklistCHEERS.jsx
// Checklist CHEERS — Fase Scanning del SARA
// Community, Harm, Expectation, Events, Recurring, Similar
// Adaptado al contexto policial mexicano (FGE Guerrero)
// Determina si un problema delictivo amerita intervención SARA

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Target, Users, Shield, BarChart3, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const C = {
  darkBlue: '#001a4d', gold: '#b69054', lightGold: '#f5ede0',
  white: '#ffffff', bg: '#f4f6fb', gray: '#666666', lightGray: '#e8ecf1',
  green: '#28a745', red: '#dc3545', orange: '#fd7e14',
};

const CRITERIOS = [
  {
    key: 'community',
    letra: 'C',
    titulo: 'Comunidad (Community)',
    pregunta: '¿La comunidad percibe este problema como prioritario?',
    descripcion: 'La población, medios de comunicación, autoridades municipales o grupos organizados han expresado preocupación o demanda de atención sobre este problema delictivo.',
    indicadores: [
      'Quejas recurrentes de la ciudadanía',
      'Cobertura en medios locales',
      'Solicitudes del municipio o autoridades civiles',
      'Marchas, bloqueos o protestas relacionadas',
      'Denuncias en redes sociales',
    ],
    color: '#1565c0',
  },
  {
    key: 'harm',
    letra: 'H',
    titulo: 'Daño (Harm)',
    pregunta: '¿Qué tan grave es el daño que causa este problema?',
    descripcion: 'Evalúa la severidad del impacto: pérdida de vida, lesiones graves, daño patrimonial significativo, trauma psicológico, afectación a grupos vulnerables.',
    indicadores: [
      'Homicidios o lesiones graves',
      'Víctimas menores de edad o mujeres',
      'Daño patrimonial masivo',
      'Desplazamiento forzado de familias',
      'Afectación a la economía local',
    ],
    color: '#c62828',
  },
  {
    key: 'expectation',
    letra: 'E',
    titulo: 'Expectativa (Expectation)',
    pregunta: '¿Se espera que la policía ministerial resuelva este problema?',
    descripcion: 'El problema cae dentro de las facultades de la FGE y la Policía Ministerial conforme al CNPP Art. 132, y existe la expectativa institucional o social de una intervención.',
    indicadores: [
      'El MP ha girado oficios de investigación al respecto',
      'La Dirección General ha instruido atención prioritaria',
      'Existe obligación legal de actuar (CNPP, Ley de Víctimas)',
      'Hay coordinación pendiente con otras instituciones',
      'Se han comprometido recursos o metas institucionales',
    ],
    color: '#6a1b9a',
  },
  {
    key: 'events',
    letra: 'E',
    titulo: 'Eventos (Events)',
    pregunta: '¿Cuántos eventos o incidentes se han documentado?',
    descripcion: 'El volumen de incidentes registrados en el sistema: reportes 911, escenas procesadas, detenidos vinculados, expedientes abiertos.',
    indicadores: [
      'Más de 10 reportes 911 en la zona/período',
      'Múltiples escenas procesadas del mismo tipo delictivo',
      'Varios detenidos por el mismo delito en la zona',
      'Expedientes policiales abiertos con el mismo patrón',
      'Datos del Dashboard Operativo confirman tendencia',
    ],
    color: '#e65100',
  },
  {
    key: 'recurring',
    letra: 'R',
    titulo: 'Recurrencia (Recurring)',
    pregunta: '¿El problema es persistente y recurrente?',
    descripcion: 'No es un evento aislado sino un patrón que se repite en el tiempo, en la misma zona o con el mismo modus operandi.',
    indicadores: [
      'Se repite semanalmente o con mayor frecuencia',
      'Lleva más de 30 días activo',
      'El mapa de calor muestra concentración sostenida',
      'Las detenciones previas no han frenado el problema',
      'Se detecta el mismo modus operandi repetido',
    ],
    color: '#00695c',
  },
  {
    key: 'similar',
    letra: 'S',
    titulo: 'Similitud (Similar)',
    pregunta: '¿Existen problemas similares en otras zonas que se hayan resuelto?',
    descripcion: 'Se pueden consultar estrategias de otras coordinaciones, estados o países que hayan enfrentado problemas similares con resultados documentados.',
    indicadores: [
      'Otra coordinación de zona resolvió algo parecido',
      'Hay protocolos nacionales aplicables (SESNSP)',
      'Existe evidencia internacional de intervenciones exitosas',
      'Se pueden replicar estrategias probadas',
      'Hay lecciones aprendidas documentadas',
    ],
    color: '#37474f',
  },
];

const NIVELES = [
  { valor: 0, label: 'No evaluado', color: C.lightGray },
  { valor: 1, label: 'No aplica', color: '#90a4ae' },
  { valor: 2, label: 'Bajo', color: '#ffb74d' },
  { valor: 3, label: 'Medio', color: '#ff9800' },
  { valor: 4, label: 'Alto', color: '#f44336' },
  { valor: 5, label: 'Crítico', color: '#b71c1c' },
];

function getResultado(total) {
  if (total >= 25) return { texto: 'PRIORIDAD MÁXIMA — Iniciar proyecto SARA inmediatamente', color: '#b71c1c', bg: '#ffebee', icon: AlertTriangle };
  if (total >= 20) return { texto: 'PRIORIDAD ALTA — Se recomienda fuertemente iniciar SARA', color: '#e65100', bg: '#fff3e0', icon: Target };
  if (total >= 15) return { texto: 'PRIORIDAD MEDIA — Evaluar viabilidad de intervención SARA', color: '#f59e0b', bg: '#fffde7', icon: BarChart3 };
  if (total >= 10) return { texto: 'PRIORIDAD BAJA — Monitorear y considerar acciones preventivas', color: '#2e7d32', bg: '#e8f5e9', icon: Shield };
  return { texto: 'INSUFICIENTE — No amerita intervención SARA en este momento', color: C.gray, bg: C.bg, icon: CheckCircle2 };
}

export default function ChecklistCHEERS() {
  const [scores, setScores] = useState({
    community: 0, harm: 0, expectation: 0, events: 0, recurring: 0, similar: 0,
  });
  const [problema, setProblema] = useState('');
  const [zona, setZona] = useState('');
  const [expandido, setExpandido] = useState(true);
  const [showIndicadores, setShowIndicadores] = useState({});

  var total = Object.values(scores).reduce(function(a, b) { return a + b; }, 0);
  var resultado = getResultado(total);
  var porcentaje = Math.round(total / 30 * 100);

  var toggleIndicadores = function(key) {
    setShowIndicadores(function(p) { var n = {}; Object.assign(n, p); n[key] = !p[key]; return n; });
  };

  var limpiar = function() {
    setScores({ community: 0, harm: 0, expectation: 0, events: 0, recurring: 0, similar: 0 });
    setProblema(''); setZona('');
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={function() { setExpandido(!expandido); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}>
          <Shield size={18} color={C.gold} />
          <span style={{ fontWeight: 700, fontSize: 16, color: C.darkBlue }}>Checklist CHEERS — Validación de Problema</span>
          {expandido ? <ChevronUp size={16} color={C.gray} /> : <ChevronDown size={16} color={C.gray} />}
        </button>
        {expandido && (
          <button onClick={limpiar} style={{ background: 'none', border: '1.5px solid ' + C.darkBlue, borderRadius: 7, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: C.darkBlue, fontSize: 12, fontWeight: 600 }}>
            <RefreshCw size={13} /> Limpiar
          </button>
        )}
      </div>

      {expandido && (
        <div>
          <p style={{ fontSize: 12, color: C.gray, marginBottom: 14 }}>
            Antes de crear un proyecto SARA, evalúa si el problema identificado cumple los criterios CHEERS. Cada criterio se califica de 1 (no aplica) a 5 (crítico). Un puntaje alto confirma que el problema amerita una intervención estructurada.
          </p>

          {/* Contexto del problema */}
          <div style={{ background: C.white, borderRadius: 10, padding: 14, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.darkBlue, display: 'block', marginBottom: 4 }}>Problema identificado</label>
                <input style={{ padding: '10px 12px', border: '1px solid ' + C.lightGray, borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                  placeholder="Ej: Robos a transeúnte en Col. Renacimiento entre 20:00-23:00 hrs"
                  value={problema} onChange={function(e) { setProblema(e.target.value); }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.darkBlue, display: 'block', marginBottom: 4 }}>Zona geográfica</label>
                <input style={{ padding: '10px 12px', border: '1px solid ' + C.lightGray, borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                  placeholder="Ej: Acapulco, Sector Renacimiento"
                  value={zona} onChange={function(e) { setZona(e.target.value); }} />
              </div>
            </div>
          </div>

          {/* Criterios CHEERS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {CRITERIOS.map(function(cr) {
              var score = scores[cr.key];
              var nivel = NIVELES.find(function(n) { return n.valor === score; });
              return (
                <div key={cr.key} style={{ background: C.white, borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden', borderLeft: '4px solid ' + cr.color }}>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: cr.color, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>{cr.letra}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: C.darkBlue }}>{cr.titulo}</span>
                        </div>
                        <div style={{ fontSize: 13, color: C.darkBlue, fontWeight: 500, marginBottom: 4 }}>{cr.pregunta}</div>
                        <div style={{ fontSize: 11, color: C.gray }}>{cr.descripcion}</div>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: 60 }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: nivel.color }}>{score}</div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: nivel.color }}>{nivel.label}</div>
                      </div>
                    </div>

                    {/* Selector de nivel */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                      {NIVELES.filter(function(n) { return n.valor > 0; }).map(function(n) {
                        return (
                          <button key={n.valor} onClick={function() { setScores(function(p) { var u = {}; Object.assign(u, p); u[cr.key] = n.valor; return u; }); }}
                            style={{ flex: 1, padding: '6px 4px', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700,
                              border: score === n.valor ? '2px solid ' + n.color : '1px solid ' + C.lightGray,
                              background: score === n.valor ? n.color + '20' : C.white,
                              color: score === n.valor ? n.color : C.gray }}>
                            {n.valor} — {n.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Indicadores */}
                    <button onClick={function() { toggleIndicadores(cr.key); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: C.gold, fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {showIndicadores[cr.key] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {showIndicadores[cr.key] ? 'Ocultar' : 'Ver'} indicadores de referencia
                    </button>
                    {showIndicadores[cr.key] && (
                      <div style={{ marginTop: 6, padding: 10, background: C.bg, borderRadius: 6 }}>
                        {cr.indicadores.map(function(ind, i) {
                          return <div key={i} style={{ fontSize: 11, color: C.darkBlue, padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: cr.color }}>•</span> {ind}
                          </div>;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resultado */}
          <div style={{ background: resultado.bg, borderRadius: 10, padding: 16, border: '2px solid ' + resultado.color + '40' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <resultado.icon size={22} color={resultado.color} />
                <span style={{ fontSize: 15, fontWeight: 700, color: resultado.color }}>{resultado.texto}</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: resultado.color }}>{total}<span style={{ fontSize: 16, color: C.gray }}>/30</span></div>
              </div>
            </div>

            {/* Barra de progreso */}
            <div style={{ height: 10, backgroundColor: C.lightGray, borderRadius: 5, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ height: '100%', width: porcentaje + '%', backgroundColor: resultado.color, borderRadius: 5, transition: 'width 0.3s' }} />
            </div>

            {/* Desglose */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CRITERIOS.map(function(cr) {
                var s = scores[cr.key];
                return (
                  <div key={cr.key} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: s > 0 ? cr.color + '15' : C.bg, border: '1px solid ' + (s > 0 ? cr.color + '30' : C.lightGray) }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: cr.color, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{cr.letra}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s > 0 ? cr.color : C.gray }}>{s}</span>
                  </div>
                );
              })}
            </div>

            {problema && (
              <div style={{ marginTop: 12, padding: 10, background: C.white, borderRadius: 8, fontSize: 12, color: C.darkBlue }}>
                <strong>Problema evaluado:</strong> {problema}{zona ? ' — ' + zona : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
