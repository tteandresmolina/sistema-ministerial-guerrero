// src/pages/ResumenMando.jsx
// Resumen para mando: una sola pantalla, letra grande, cada bloque con una frase que dice qué muestra.
// No calcula nada: recibe todo de MapaCalor (mismas cifras que el panel de análisis).

import React from 'react';

var G = '#7b1e3a';      // guinda
var D = '#b6905a';
var GF = '#8a4455';     // guinda suave para rellenos grandes (menos intenso a la vista)      // dorado
var TXT = '#1f2430';
var SUAVE = '#4b5563';

var caja = function(fondo) {
  return { background: fondo, borderRadius: 12, borderTop: '5px solid ' + D, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
};
var tituloBloque = { fontSize: 15, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: G, marginBottom: 4 };
var explica = { fontSize: 17, color: SUAVE, lineHeight: 1.5, marginBottom: 12 };

function Cifra({ n, etiqueta, color, nota }) {
  return (
    <div style={{ flex: '1 1 150px', textAlign: 'center', padding: '6px 4px' }}>
      <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.05, color: color }}>{n}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: TXT }}>{etiqueta}</div>
      {nota && <div style={{ fontSize: 15, color: SUAVE, marginTop: 2 }}>{nota}</div>}
    </div>
  );
}

function Barras({ items, total, color }) {
  var max = Math.max.apply(null, items.map(function(x) { return x[1]; }).concat([1]));
  return (
    <div>
      {items.map(function(x) {
        return (
          <div key={x[0]} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '7px 0' }}>
            <div style={{ width: 150, fontSize: 18, fontWeight: 700, color: TXT }}>{x[0]}</div>
            <div style={{ flex: 1, background: '#ffffff99', borderRadius: 6, height: 26 }}>
              <div style={{ width: Math.max(4, Math.round(x[1] / max * 100)) + '%', background: color, height: 26, borderRadius: 6 }} />
            </div>
            <div style={{ width: 86, fontSize: 18, fontWeight: 800, color: TXT, textAlign: 'right' }}>
              {x[1]}{total ? ' · ' + Math.round(x[1] / total * 100) + '%' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ResumenMando(p) {
  var cortes = p.parcial ? 'al ' + p.dia : 'completo';
  var ritmoTxt = p.ritmo || '';
  var proy = p.proyMes;      // { nombre, lo, hi, mu, lleva, dias, tipo }
  var sig = p.siguientes || [];
  var r = p.respaldo;

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: TXT }}>
      <div style={{ background: GF, color: '#fff', borderRadius: 12, borderBottom: '5px solid ' + D, padding: '16px 22px', marginBottom: 14 }}>
        <div style={{ fontSize: 14, letterSpacing: 1, color: '#ecd9a4' }}>FISCALÍA GENERAL DEL ESTADO DE GUERRERO · REGIÓN ACAPULCO</div>
        <div style={{ fontSize: 30, fontWeight: 800 }}>Homicidios · {p.nombreMes}{p.parcial ? ' (' + cortes + ')' : ''}</div>
      </div>

      {/* 1. El mes */}
      <div style={caja('#fbf3d9')}>
        <div style={tituloBloque}>Lo que va del mes</div>
        <div style={explica}>
          <strong>Dolosos</strong>: homicidios con intención. <strong>Culposos</strong>: por accidente, casi todos de tránsito.
          <strong> No constitutivas</strong>: muertes sin delito (enfermedad, ahogamiento, otras). Solo los dolosos entran a la gráfica y a la proyección.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Cifra n={p.dolosos} etiqueta="Homicidios dolosos" color={G} />
          <Cifra n={p.culposos} etiqueta="Homicidios culposos" color="#5a4a1e" />
          <Cifra n={p.nc} etiqueta="No constitutivas" color="#6b7280" />
        </div>
        {ritmoTxt && (
          <div style={{ marginTop: 10, fontSize: 19, lineHeight: 1.5 }}>
            <strong>Ritmo:</strong> {ritmoTxt}.{' '}
            {p.promedio8 ? <span>El promedio de los últimos {p.meses8} meses es de <strong>{Math.round(p.promedio8)}</strong> al mes{p.parcial ? <span>; en estos {p.dia} días lo normal serían unos <strong>{Math.round(p.promedio8 * p.dia / p.diasMes)}</strong>.</span> : '.'}</span> : null}
          </div>
        )}
      </div>

      {/* 2. Dónde y cómo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14, marginTop: 14 }}>
        <div style={caja('#efe9d9')}>
          <div style={tituloBloque}>Dónde</div>
          <div style={explica}>Homicidios dolosos de {p.nombreMes.split(' ')[0].toLowerCase()} por sector.</div>
          {p.sectores && p.sectores.length > 0
            ? <Barras items={p.sectores} color="#9a5568" />
            : <div style={{ fontSize: 18 }}>Sin casos en el mes.</div>}
        </div>
        <div style={caja('#f6e4e8')}>
          <div style={tituloBloque}>Cómo</div>
          <div style={explica}>Con qué se cometieron los homicidios dolosos del mes.</div>
          {p.medios && p.medios.length > 0
            ? <Barras items={p.medios} total={p.dolosos} color="#9a5568" />
            : <div style={{ fontSize: 18 }}>Sin casos en el mes.</div>}
        </div>
      </div>

      {/* 3. Proyección */}
      <div style={{ ...caja('#efe9d9'), marginTop: 14 }}>
        <div style={tituloBloque}>Qué se espera</div>
        <div style={explica}>
          Barras sólidas: lo que ya ocurrió. Barras rayadas: lo estimado. La línea vertical es el rango en el que cae 8 de cada 10 veces.
        </div>
        {p.grafica}
        <div style={{ fontSize: 20, lineHeight: 1.6, marginTop: 12 }}>
          {proy && (
            <div>
              <strong>{proy.nombre}</strong> {proy.tipo === 'cierre' ? 'cerraría' : 'tendría'} entre <strong>{proy.lo}</strong> y <strong>{proy.hi}</strong> homicidios dolosos;
              {' '}lo más probable es <strong style={{ color: G }}>{proy.mu} homicidios dolosos</strong>.
              {proy.tipo === 'cierre' && <span> Lleva {proy.lleva} en {proy.dias} días.</span>}
            </div>
          )}
          {sig.map(function(s) {
            return (
              <div key={s.nombre}>
                <strong>{s.nombre}</strong>: entre <strong>{s.lo}</strong> y <strong>{s.hi}</strong>, lo más probable <strong style={{ color: G }}>{s.mu} homicidios dolosos</strong>.
              </div>
            );
          })}
        </div>
        {r && r.de > 0 && (
          <div style={{ marginTop: 12, background: '#ffffffaa', borderRadius: 8, padding: '12px 14px', fontSize: 18, lineHeight: 1.55 }}>
            <strong>Margen de error:</strong> aplicado a los últimos {r.de} meses, el rango acertó en <strong>{r.cubiertos} de {r.de}</strong> y el
            error promedio fue de <strong>unos {Math.max(1, Math.round(r.mae))} homicidios al mes</strong>.
            El método es estadístico (suavizado exponencial del ritmo diario, con rango del 80 %): es una referencia con base en los meses anteriores, no una meta.
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 15, color: '#6b7280' }}>Cifras con base en lo capturado por los sectores. Los casos con carpeta pendiente se cuentan; los que no tuvieron diligencias, no.</div>
        {p.onCorte && (
          <button onClick={p.onCorte} style={{ background: GF, border: '2px solid ' + GF, color: '#fff', borderRadius: 8, padding: '12px 24px', fontSize: 18, fontWeight: 800, cursor: 'pointer', minHeight: 48 }}>
            Hoja de una página (PDF)
          </button>
        )}
      </div>
      <div style={{ marginTop: 8, textAlign: 'right', fontSize: 12, color: '#9a9484' }}>{p.version}</div>
    </div>
  );
}
